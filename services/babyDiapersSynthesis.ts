
import { EvidenceGraph, TemplatePack, EvidenceEventV1 } from '../types';
import { normalizeBabyDiapers } from '../utils/normalizers/normalizeBabyDiapers';
import { evaluateBabyDiapersQuality } from './babyDiapersQualityGate';
import { callLLM } from '../lib/llmClient';
import { verifyContentVerbatims, type VerbatimAudit } from '../utils/verbatimProvenance';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Section → keywords for targeted evidence selection
const SECTION_KEYWORDS: Record<string, string[]> = {
  category_context: ["brand", "choice", "best", "research", "monsoon", "festival", "doctor", "paediatrician", "influencer", "premium", "value", "options"],
  babys_world_journey: ["newborn", "month", "crawl", "walk", "solids", "night", "sleep", "daycare", "potty", "training", "size", "grow", "expecting", "pregnan", "toddler"],
  diaper_styles: ["tape", "pant", "cloth", "reusable", "fit", "wriggle", "laundry", "drying", "pull up", "switch", "style"],
  pack_architecture: ["laddi", "pack", "single", "twin", "99", "399", "999", "jumbo", "bulk", "value", "per piece", "subscription", "monthly"],
  behaviour_usage: ["night", "overnight", "day", "travel", "daycare", "outing", "monsoon", "change", "frequency", "stock"],
  needs_triggers_pains: ["leak", "rash", "skin", "soft", "fit", "absorb", "guilt", "safe", "peace of mind", "overwhelm", "recommend"],
  decision_influencers: ["decide", "husband", "father", "nanny", "grandmother", "mother in law", "hospital", "doctor", "influencer", "search", "review", "buy"],
  attribute_drivers: ["leak", "soft", "fit", "tab", "breathable", "overnight", "absorb", "indicator", "eco", "chemical", "odour"],
  price_pack_signals: ["price", "cost", "per piece", "cheap", "expensive", "value", "discount", "offer", "subscription", "bulk", "afford", "budget"],
  gap_analysis: ["leak", "rash", "size", "overwhelm", "wish", "want", "better", "afford", "breathable", "overnight", "should", "why"],
  lovingle_diagnostic: ["lovingle", "value", "available", "kirana", "rash", "skin", "safe", "trust", "switch", "tried", "daytime"],
  brand_landscape: ["pampers", "mamypoko", "huggies", "little angels", "lovingle", "leak", "soft", "overnight", "value", "best", "review"],
};


const prepareTargetedEvidence = (graph: EvidenceGraph, sectionId: string) => {
  const events = graph.events || [];
  const kws = SECTION_KEYWORDS[sectionId] || [];

  // Only real, substantive text is quotable. One-word ratings ("Good", "Nice")
  // can't carry a verbatim, so require a floor of length and word count.
  const isQuotable = (e: any): boolean => {
    const t = (e.content?.text || '').trim();
    return t.length >= 40 && t.split(/\s+/).length >= 8;
  };

  // De-dup on normalized text so the same review scraped twice (or near-dupes)
  // can't recycle into the capsule — a major cause of "same quote everywhere".
  const seenText = new Set<string>();
  const dedupe = (list: any[]): any[] => {
    const out: any[] = [];
    for (const e of list) {
      const key = (e.content?.text || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!key || seenText.has(key)) continue;
      seenText.add(key);
      out.push(e);
    }
    return out;
  };

  const quotable = dedupe(events.filter(isQuotable));

  // Keyword-score the quotable pool for this section.
  const scored = quotable
    .map(e => {
      const t = (e.content?.text || '').toLowerCase();
      const score = kws.reduce((s, k) => s + (t.includes(k.toLowerCase()) ? 1 : 0), 0);
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);

  // Take a GENEROUS, BRAND-DIVERSE slice so the model has real range to quote
  // from (small capsules force repetition / invention). Round-robin across
  // brands among the on-topic hits, then top up with the best remaining.
  const TARGET = 60;
  const onTopic = scored.filter(x => x.score > 0).map(x => x.e);
  const byBrand = new Map<string, any[]>();
  for (const e of onTopic) {
    const b = (e.commerce?.brand || e.content?.platform || 'misc').toString();
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b)!.push(e);
  }
  const picked: any[] = [];
  const pickedIds = new Set<string>();
  let added = true;
  while (added && picked.length < TARGET) {
    added = false;
    for (const list of byBrand.values()) {
      const next = list.shift();
      if (next && !pickedIds.has(next.evidenceId)) {
        picked.push(next); pickedIds.add(next.evidenceId); added = true;
        if (picked.length >= TARGET) break;
      }
    }
  }
  // Top up from any quotable evidence (even off-topic) so we never run thin.
  if (picked.length < TARGET) {
    for (const e of quotable) {
      if (pickedIds.has(e.evidenceId)) continue;
      picked.push(e); pickedIds.add(e.evidenceId);
      if (picked.length >= TARGET) break;
    }
  }

  const simplified = picked.map(e => ({
    text: e.content?.text,
    source: e.sourceTag,
    platform: e.content?.platform || e.sourceTag,
    geo: e.geo?.city ? `${e.geo.city}, ${e.geo.country || 'India'}` : (e.geo?.country || ''),
    brand: e.commerce?.brand,
    rating: e.commerce?.rating,
    axes: (e.derived?.tokens || []).filter((t: string) => t.startsWith('style:') || t.startsWith('pack:')),
    id: e.evidenceId,
  }));

  const json = JSON.stringify({
    stats: graph.aggregations,
    sample_evidence: simplified,
    note: `Targeted REAL evidence for '${sectionId}' — ${simplified.length} distinct ingested records (Amazon / Flipkart / Instagram / Facebook / Awario). Every verbatim MUST be copied from a sample_evidence 'text' field; set source: to that record's platform. The 'axes' field carries detected style:/pack: tags — keep STYLE and PACK as separate axes. Represent 4+ platforms per section. There is no other permitted source of quotes.`,
  });

  return { json, count: simplified.length };
};

const calculateBrandSOV = (graph: EvidenceGraph) => {
  const counts = graph.aggregations?.brandCounts || [];
  const total = counts.reduce((s, b) => s + b.count, 0);
  return counts.map(b => ({
    brand: b.brand, mentions: b.count,
    share_pct: total > 0 ? Math.round((b.count / total) * 100) : 0,
  })).sort((a, b) => b.mentions - a.mentions);
};

const cleanAndParseJSON = (text: string): any => {
  let c = (text || '').trim();
  if (c.startsWith('```')) c = c.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
  try { return JSON.parse(c); } catch {}
  try {
    const s = c.indexOf('{'); const e = c.lastIndexOf('}');
    if (s !== -1 && e !== -1) return JSON.parse(c.substring(s, e + 1));
  } catch {}
  return { __rawText: text };
};

export const synthesizeBabyDiapersSection = async (
  sectionId: string,
  evidenceGraph: EvidenceGraph,
  template: TemplatePack,
  logger?: (msg: string) => void
): Promise<any> => {
  const systemPrompt = template.promptPack.systemPrompt;
  const sectionPrompt = template.promptPack.sectionPrompts[sectionId];

  const capsule = prepareTargetedEvidence(evidenceGraph, sectionId);
  const brandSov = calculateBrandSOV(evidenceGraph);

  // ── Provenance corpus: ONLY real ingested quote text. The curated bank has
  // been removed from the capsule entirely, so no quote should match it; any
  // quote that does not trace to a real record is a fabrication and is dropped.
  const corpusTexts = (evidenceGraph.events || [])
    .map(e => e.content?.text || '')
    .filter(t => t && t.length > 8);
  const curatedTexts: string[] = []; // intentionally empty — real-data-only policy

  // Verify + annotate real synthesis output before it is returned/cached.
  // Seed fallback is never run through this (it is badged INDICATIVE upstream).
  const finalizeReal = (content: any): any => {
    try {
      // prune=true → fabricated quotes are removed, not just flagged, so the
      // report shows only verbatims grounded in the real corpus.
      const audit: VerbatimAudit = verifyContentVerbatims(content, corpusTexts, curatedTexts, true);
      content._verbatim_audit = audit;
      logger?.(
        `[BabyDiapers] provenance S=${sectionId}: ${audit.corpus}/${audit.total} corpus-verified, ` +
        `${audit.unverified} fabricated (dropped)`
      );
    } catch (err: any) {
      logger?.(`[BabyDiapers] provenance check skipped: ${err?.message || err}`);
    }
    return content;
  };

  logger?.(`[BabyDiapers] S=${sectionId} evidence=${capsule.count}`);

  const buildPrompt = (tier: string, isRepair = false) => `
${systemPrompt}

${tier}
${isRepair ? "CRITICAL: Previous output failed the quality gate. Use Search Grounding + category norms to fill gaps. Never leave arrays empty. Hold the Lovingle = rash/skin-safety objection lock and the two-axis (style ≠ pack) rule." : ""}

SECTION TASK: ${sectionPrompt}

CONTEXT DATA:
BRAND_SOV_STATS: ${JSON.stringify(brandSov)}
EVIDENCE_CAPSULE: ${capsule.json}

OUTPUT JSON RULES:
1. STRICT JSON, no markdown wrappers.
2. No empty arrays; no placeholders ("N/A", "Derived", "Inferred").
3. Every verbatim = {quote, source, consumer}; consumer is baby-age anchored.
4. INDIA only, INR pricing. No TikTok, no WhatsApp.

VERBATIM SOURCING — NON-NEGOTIABLE (provenance is audited downstream):
- Every "quote" MUST be copied from a 'text' field inside EVIDENCE_CAPSULE.sample_evidence. Quote it word-for-word; you may trim to the relevant span but you may NOT paraphrase, merge two records, or invent.
- Set "source" to that record's 'platform' value and "consumer" to a baby-age-anchored descriptor consistent with that record's geo/brand.
- If the capsule lacks enough on-point material for a sub-point, write fewer verbatims rather than fabricating one. A short, real set beats a padded, invented one.
- Quotes that cannot be traced back to a real ingested record are flagged "unverified" in the published report and logged for audit — do not manufacture quotes to hit a count.
`;

  // Output budget: the deep sections (long arrays of cards/stories, each with
  // 5+ verbatims) can exceed 8k output tokens; truncation → invalid JSON → seed.
  // Give those headroom; keep the lighter sections lean.
  const HEAVY_SECTIONS = new Set([
    'lovingle_diagnostic', 'babys_world_journey', 'pack_architecture',
    'brand_landscape', 'decision_journey_stages', 'consumer_personas',
    'needs_triggers_pains', 'gap_analysis',
  ]);
  const outputTokens = HEAVY_SECTIONS.has(sectionId) ? 16384 : 8192;

  // Returns model text, or null if no provider is configured (-> seed upstream).
  const callModelText = (tier: string, isRepair: boolean, budget: number) =>
    callLLM({
      prompt: buildPrompt(tier, isRepair),
      jsonMode: true,
      maxTokens: outputTokens,
      gemini: { grounding: true, thinkingBudget: budget },
    });

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const budget = attempts === 1 ? 24576 : 32768;
      logger?.(`[BabyDiapers] Tier1 attempt ${attempts} (budget ${budget})`);
      const text = await callModelText(
        `MODE: STRATEGIC SYNTHESIS (Attempt ${attempts})`,
        attempts > 1,
        budget
      );
      if (text === null) { logger?.(`[BabyDiapers] no provider configured — seeding`); return null; }

      const parsed = cleanAndParseJSON(text || "{}");
      if (parsed.__rawText) throw new Error("Model returned non-JSON");

      const normalized = normalizeBabyDiapers(sectionId, parsed);
      const quality = evaluateBabyDiapersQuality(sectionId, normalized);
      logger?.(`[BabyDiapers] quality=${quality.score} fails=${quality.failures.join('|')}`);

      if (!quality.ok) {
        if (attempts === 1) { logger?.(`[BabyDiapers] retry with repair prompt`); continue; }
        logger?.(`[BabyDiapers] repair failed — seed override`);
        return normalizeBabyDiapers(sectionId, {});
      }
      return finalizeReal(normalized);
    } catch (e: any) {
      console.warn(`[BabyDiapers] attempt ${attempts} failed:`, e?.message || e);
      if (attempts >= 2) break;
      await delay(1000);
    }
  }

  logger?.(`[BabyDiapers] generation failed — seeded fallback`);
  return normalizeBabyDiapers(sectionId, {});
};
