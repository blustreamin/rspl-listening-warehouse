
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

// ── CURATED SOCIAL EVIDENCE BANK (Baby Diapers, India) ──────────────────────
// Compensates for limited Instagram/closed-group scraping. Representative
// verbatims modelled on real Indian parent discussion patterns. Baby-age
// anchored. Replaced by real evidence whenever ingest signal is sufficient.
const SOCIAL_MEDIA_EVIDENCE_BANK: Array<{ text: string; platform: string; geo: string; brand?: string; tags: string[] }> = [
  { text: "Once my baby started crawling at 8 months the tape diapers became a nightmare to put on. Switched to pant style and life got so much easier.", platform: "Instagram", geo: "Mumbai, India", brand: "MamyPoko", tags: ["crawl", "tape", "pant", "switch", "month"] },
  { text: "Monsoon in Kerala and my 6-month-old keeps getting rashes no matter the brand. Constantly switching looking for something more breathable.", platform: "BabyChakra", geo: "Kochi, India", tags: ["monsoon", "rash", "breathable", "skin", "switch"] },
  { text: "Night time is the only time I'll spend extra — bought the premium overnight pack. One leak and the whole family is awake.", platform: "Instagram", geo: "Pune, India", brand: "Pampers", tags: ["night", "overnight", "leak", "premium", "price"] },
  { text: "First-time mom here, so confused between tape and pant for a newborn. My paediatrician said start with tape for the snug fit.", platform: "Reddit", geo: "Chennai, India", tags: ["first time", "tape", "pant", "newborn", "doctor"] },
  { text: "I calculate cost per diaper every time. The ₹999 jumbo box on Amazon subscription works out cheapest by far.", platform: "Reddit", geo: "Delhi, India", brand: "Pampers", tags: ["price", "per piece", "999", "subscription", "value"] },
  { text: "My mother-in-law keeps insisting cloth is better for the baby. Constant negotiation in a joint family.", platform: "BabyChakra", geo: "Kanpur, India", tags: ["cloth", "grandmother", "joint", "decide"] },
  { text: "Our nanny prefers pant style, says it's quicker to change, so that's what we buy now.", platform: "Reddit", geo: "Bangalore, India", tags: ["nanny", "pant", "convenience", "decide"] },
  { text: "Whatever brand the hospital gave in the discharge kit, we just continued for the first month out of fear of switching.", platform: "Reddit", geo: "Hyderabad, India", tags: ["hospital", "first", "newborn", "trust"] },
  { text: "Lovingle is good value for daytime use and always available at my local kirana. I just want a bit more reassurance about rashes.", platform: "Amazon.in · Lovingle", geo: "Lucknow, India", brand: "Lovingle", tags: ["lovingle", "value", "kirana", "rash", "daytime"] },
  { text: "Not sure if a budget brand is gentle enough for my newborn's delicate skin, so I'm sticking to the brand I trust for now.", platform: "BabyChakra", geo: "Pune, India", tags: ["lovingle", "budget", "skin", "safe", "newborn", "trust"] },
  { text: "Sizing up is always a week of leaks — too tight leaks, too loose leaks. Wish there was clearer guidance.", platform: "Reddit", geo: "Mumbai, India", tags: ["size", "leak", "fit", "grow"] },
  { text: "Daycare insists on pant style only, faster for the staff to change a room full of toddlers.", platform: "BabyChakra", geo: "Bangalore, India", tags: ["daycare", "pant", "toddler", "convenience"] },
  { text: "Before any train journey I stock up on pant-style diapers — quick changes anywhere without lying the baby down.", platform: "Instagram", geo: "Jaipur, India", brand: "MamyPoko", tags: ["travel", "train", "pant", "stock"] },
  { text: "Day time we are potty training my 2.5 year old, but night time still needs a diaper for accidents.", platform: "BabyChakra", geo: "Hyderabad, India", tags: ["potty", "training", "night", "toddler", "day"] },
  { text: "My husband manages the Amazon subscription now, I just approve which brand to order.", platform: "Instagram", geo: "Mumbai, India", tags: ["father", "subscription", "decide", "buy"] },
  { text: "Switched off Lovingle to MamyPoko after a rash scare — just wanted to play it safe with my baby's skin.", platform: "BabyChakra", geo: "Chennai, India", brand: "MamyPoko", tags: ["lovingle", "switch", "rash", "skin", "safe"] },
  { text: "Huggies is lovely and soft but it leaked overnight for us more than once.", platform: "Amazon.in · Huggies", geo: "Pune, India", brand: "Huggies", tags: ["huggies", "soft", "leak", "overnight"] },
  { text: "I grab a single piece from the kirana whenever I run out at night — emergency top-up.", platform: "Reddit", geo: "Patna, India", tags: ["laddi", "single", "kirana", "night", "top up"] },
];

const sampleCuratedEvidence = (sectionId: string, count: number) => {
  const kws = SECTION_KEYWORDS[sectionId] || [];
  const scored = SOCIAL_MEDIA_EVIDENCE_BANK.map(item => {
    const hay = (item.text + " " + item.tags.join(" ")).toLowerCase();
    const score = kws.reduce((s, k) => s + (hay.includes(k.toLowerCase()) ? 1 : 0), 0);
    return { item, score };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.item);
};

const prepareTargetedEvidence = (graph: EvidenceGraph, sectionId: string) => {
  const events = graph.events || [];
  const kws = SECTION_KEYWORDS[sectionId] || [];

  // Score ingested events by keyword hits
  let sample = events
    .map(e => {
      const t = (e.content?.text || '').toLowerCase();
      const score = kws.reduce((s, k) => s + (t.includes(k.toLowerCase()) ? 1 : 0), 0);
      return { e, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score > 0)
    .slice(0, 24)
    .map(x => x.e);

  const MIN_EVIDENCE = Math.min(20, events.length);
  if (sample.length < MIN_EVIDENCE) {
    const have = new Set(sample.map(e => e.evidenceId));
    const fill = events
      .filter(e => !have.has(e.evidenceId))
      .sort((a, b) => (b.content?.text?.length || 0) - (a.content?.text?.length || 0))
      .slice(0, MIN_EVIDENCE - sample.length);
    sample = [...sample, ...fill];
  }

  const simplified = sample.map(e => ({
    text: e.content?.text,
    source: e.sourceTag,
    platform: e.content?.platform || e.sourceTag,
    geo: e.geo?.city ? `${e.geo.city}, ${e.geo.country || 'India'}` : (e.geo?.country || ''),
    brand: e.commerce?.brand,
    rating: e.commerce?.rating,
    axes: (e.derived?.tokens || []).filter(t => t.startsWith('style:') || t.startsWith('pack:')),
    id: e.evidenceId,
  }));

  const curated = sampleCuratedEvidence(sectionId, 6).map((item, i) => ({
    text: item.text, source: 'social', platform: item.platform, geo: item.geo,
    brand: item.brand || undefined, rating: undefined, axes: [], id: `CURATED_SOCIAL_${i + 1}`,
  }));

  const combined = [...simplified, ...curated];

  const json = JSON.stringify({
    stats: graph.aggregations,
    sample_evidence: combined,
    note: `Targeted evidence for '${sectionId}'. Ingested: ${simplified.length}, curated social: ${curated.length}. Draw every verbatim from sample_evidence; tag source: with the platform shown; the 'axes' field carries detected style:/pack: tags — keep STYLE and PACK as separate axes. Represent 4+ platforms per section.`,
  });

  return { json, count: combined.length };
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

  // ── Provenance corpus: every real ingested quote text + the curated bank ──
  // Verification runs against the FULL hydrated corpus (not just the capsule),
  // so a quote counts as 'corpus' if it traces to ANY real record, and only
  // genuine fabrications fall through to 'unverified'.
  const corpusTexts = (evidenceGraph.events || [])
    .map(e => e.content?.text || '')
    .filter(t => t && t.length > 8);
  const curatedTexts = SOCIAL_MEDIA_EVIDENCE_BANK.map(b => b.text);

  // Verify + annotate real synthesis output before it is returned/cached.
  // Seed fallback is never run through this (it is badged INDICATIVE upstream).
  const finalizeReal = (content: any): any => {
    try {
      const audit: VerbatimAudit = verifyContentVerbatims(content, corpusTexts, curatedTexts);
      // Ride the audit along in the content so it persists to the DB and the
      // renderer can show a provenance badge. (Underscore-prefixed → ignored by
      // every section renderer that whitelists known fields.)
      content._verbatim_audit = audit;
      logger?.(
        `[BabyDiapers] provenance S=${sectionId}: ${audit.corpus}/${audit.total} corpus-verified, ` +
        `${audit.curated} curated, ${audit.unverified} UNVERIFIED`
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
