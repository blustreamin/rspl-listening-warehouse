
import { EvidenceGraph, TemplatePack, EvidenceEventV1 } from '../types';
import { BABY_DIAPERS_TEMPLATE } from '../templates/baby_diapers_template';
import { normalizeBabyDiapers } from '../utils/normalizers/normalizeBabyDiapers';
import { evaluateBabyDiapersQuality } from './babyDiapersQualityGate';
import { callLLM } from '../lib/llmClient';
import { verifyContentVerbatims, type VerbatimAudit } from '../utils/verbatimProvenance';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Section → keywords for targeted evidence selection (v2 registry, 02 Jul 2026)
const SECTION_KEYWORDS: Record<string, string[]> = {
  exec_summary: ["brand", "best", "price", "leak", "rash", "value", "night", "recommend"],
  parenting_rituals: ["bath", "massage", "malish", "sleep", "feed", "play", "crawl", "routine", "morning", "night", "oil", "outing"],
  family_roles_babycare: ["father", "husband", "papa", "grandmother", "grandparents", "mother in law", "nanny", "family", "help", "dadi", "nani", "saas"],
  babycare_needs: ["need", "wish", "help", "remedy", "tips", "advice", "care", "skin", "sleep", "feed", "hygiene", "worry"],
  needs_by_lifestage: ["newborn", "month", "crawl", "walk", "solids", "potty", "training", "size", "grow", "toddler", "milestone"],
  diaper_needs_fes: ["leak", "rash", "skin", "soft", "fit", "absorb", "overnight", "indicator", "guilt", "safe", "peace of mind", "overwhelm", "recommend"],
  decision_journey: ["decide", "hospital", "doctor", "paediatrician", "influencer", "search", "review", "recommend", "trust", "first time", "tried", "size"],
  usage_occasions: ["night", "overnight", "day", "travel", "daycare", "outing", "monsoon", "summer", "cloth", "langot", "tape", "pant", "avoid", "season"],
  family_roles_diapering: ["father", "husband", "papa", "grandmother", "grandparents", "mother in law", "nanny", "change", "buy", "diaper duty"],
  features_benefits: ["leak", "soft", "fit", "tab", "breathable", "overnight", "absorb", "indicator", "eco", "chemical", "odour", "wetness", "biodegradable"],
  shopper_roles: ["buy", "bought", "order", "husband", "wife", "decide", "shop", "purchase"],
  channel_dynamics: ["amazon", "flipkart", "blinkit", "zepto", "instamart", "kirana", "chemist", "pharmacy", "store", "offer", "delivery", "order", "stock", "firstcry"],
  competitive_landscape: ["pampers", "mamypoko", "huggies", "little angels", "lovingle", "best", "compare", "switch", "brand", "review"],
  lovingle_journey: ["lovingle", "tried", "switch", "rash", "skin", "safe", "trust", "kirana", "value", "available"],
  pricing_dynamics: ["price", "cost", "per piece", "cheap", "expensive", "value", "discount", "offer", "sale", "afford", "budget", "bulk"],
  regional_differences: ["delhi", "mumbai", "chennai", "kolkata", "bangalore", "kerala", "punjab", "bengal", "south", "north", "humid", "winter", "summer"],
  first_vs_second_time_moms: ["first baby", "second baby", "first time", "experience", "elder", "younger", "second child"],
  consumer_vocabulary: ["soft", "mulayam", "geela", "sukha", "raat", "rash", "leak", "hawa", "tight", "dheela", "soakh"],
  shopping_search_terms: ["search", "best diaper", "under", "price", "size", "newborn", "pant", "buy online"],
  consumer_personas: ["mom", "mother", "baby", "buy", "use", "prefer", "always", "never", "switch"],
  data_foundation: ["review", "mention", "post", "rating", "platform"],
};

// ── Load-time registry integrity check (v2) ─────────────────────────────────
// The section key from the baby_diapers_v2 registry is the ONLY identifier —
// across the prompt map, this keyword-targeting map, token budgets, job names,
// Supabase section_id and renderer routing. A key that resolves to no prompt or
// no keyword entry silently breaks that section's generation, so fail LOUDLY at
// module load.
for (const sec of BABY_DIAPERS_TEMPLATE.sections) {
  if (!BABY_DIAPERS_TEMPLATE.promptPack.sectionPrompts[sec.sectionId]) {
    console.error(
      `[BabyDiapers] REGISTRY INTEGRITY FAILURE: section "${sec.sectionId}" has no sectionPrompt — its generation WILL fail.`
    );
  }
  if (!SECTION_KEYWORDS[sec.sectionId]) {
    console.error(
      `[BabyDiapers] REGISTRY INTEGRITY FAILURE: section "${sec.sectionId}" has no keyword-targeting entry — its evidence capsule will be untargeted.`
    );
  }
}


const prepareTargetedEvidence = (graph: EvidenceGraph, sectionId: string) => {
  const events = graph.events || [];
  const kws = SECTION_KEYWORDS[sectionId] || [];

  // ── QUOTE-QUALITY FILTER ───────────────────────────────────────────────
  // The corpus contains a lot of NON-opinion text: product-listing titles,
  // affiliate URLs, YouTube SEO/hashtag blurbs, SKU enumerations, mojibake.
  // These are real records but they are NOT consumer voice, and must never be
  // offered to the model as quotable evidence. This filter keeps only text that
  // reads like a human talking about their experience.
  const looksLikeListingOrSpam = (raw: string): boolean => {
    const t = raw.trim();
    // URLs / affiliate links / share blobs
    if (/https?:\/\/|www\.|amzn\.to|\?&?tag=|\/dp\/|dl\.flipkart|bit\.ly/i.test(t)) return true;
    // Hashtag / handle SEO spam (YouTube/IG marketing)
    if ((t.match(/#/g) || []).length >= 2) return true;
    if (/subscribe|follow for more|please support|link in bio|use code|coupon/i.test(t)) return true;
    // Product-listing titles: pipe-delimited specs, "Buy ...", count/size tokens
    if (/\|/.test(t) && /\b(size|count|pcs|pack|pants|diaper)\b/i.test(t)) return true;
    if (/^buy\s/i.test(t)) return true;
    if (/\b\d+\s?(count|pcs|pieces)\b/i.test(t) && /\b(size|pack|xs|xl|xxl|medium|large)\b/i.test(t)) return true;
    // SKU enumerations: "1. Brand ... 2. Brand ... 3. Brand"
    if (/\b1\.\s.*\b2\.\s.*\b3\.\s/i.test(t)) return true;
    // Brand-list dumps (≥3 known brands strung together with no sentence)
    const brandHits = (t.match(/\b(huggies|pampers|mamypoko|mamy poko|little angel|wowper|panda|cuddle|supples)\b/gi) || []).length;
    if (brandHits >= 3 && !/\b(i|we|my|me|because|but|after|when|switched|tried|love|hate|rash)\b/i.test(t)) return true;
    // Mojibake / heavy non-Latin (corrupted encodings): too few ASCII letters
    const ascii = (t.match(/[a-z]/gi) || []).length;
    if (ascii < t.length * 0.45) return true;
    return false;
  };

  const isHumanVoice = (raw: string): boolean => {
    const t = raw.trim();
    // First/second-person or experiential markers — the signature of an opinion.
    return /\b(i|we|my|me|our|you|she|he|her|his|baby|son|daughter|mom|mother|husband|wife|tried|bought|switched|use|using|love|hate|rash|leak|comfort|smell|skin|night|recommend|worst|best|happy|disappointed)\b/i.test(t);
  };

  // Only real, substantive, human-voice text is quotable.
  const isQuotable = (e: any): boolean => {
    const t = (e.content?.text || '').trim();
    if (t.length < 40 || t.split(/\s+/).length < 8) return false;
    if (looksLikeListingOrSpam(t)) return false;
    if (!isHumanVoice(t)) return false;
    return true;
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

  // Take a GENEROUS slice so the model has real range to quote from (small
  // capsules force repetition / invention). The slice is STRATIFIED two ways:
  //   • SOURCE LAYER (sourceTag): ≤50% of the capsule from any single layer,
  //     ≥2 layers whenever the pool offers them — an all-Amazon capsule reads
  //     one shopping context as the whole category;
  //   • BRAND: round-robin WITHIN each layer so no brand dominates a layer.
  // A mono-layer pool still fills the capsule — the cap is relaxed rather than
  // starving the evidence, and the resulting mix is logged per section job.
  const TARGET = 60;
  const LAYER_CAP = Math.floor(TARGET / 2);
  const onTopic = scored.filter(x => x.score > 0).map(x => x.e);
  const layerOf = (e: any): string => (e.sourceTag || 'other').toString();

  // Brand round-robin ordering within one layer (keeps per-brand score order).
  const brandRoundRobin = (list: any[]): any[] => {
    const byBrand = new Map<string, any[]>();
    for (const e of list) {
      const b = (e.commerce?.brand || e.content?.platform || 'misc').toString();
      if (!byBrand.has(b)) byBrand.set(b, []);
      byBrand.get(b)!.push(e);
    }
    const out: any[] = [];
    let more = true;
    while (more) {
      more = false;
      for (const l of byBrand.values()) {
        const next = l.shift();
        if (next) { out.push(next); more = true; }
      }
    }
    return out;
  };

  const byLayer = new Map<string, any[]>();
  for (const e of onTopic) {
    const l = layerOf(e);
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(e);
  }
  for (const [l, list] of byLayer) byLayer.set(l, brandRoundRobin(list));

  const picked: any[] = [];
  const pickedIds = new Set<string>();
  const layerMix: Record<string, number> = {};
  const take = (e: any) => {
    picked.push(e);
    pickedIds.add(e.evidenceId);
    const l = layerOf(e);
    layerMix[l] = (layerMix[l] || 0) + 1;
  };

  // Pass 1 — layer round-robin under the 50% cap (≥2 layers whenever available).
  let added = true;
  while (added && picked.length < TARGET) {
    added = false;
    for (const [l, list] of byLayer) {
      if ((layerMix[l] || 0) >= LAYER_CAP) continue;
      const next = list.shift();
      if (next && !pickedIds.has(next.evidenceId)) {
        take(next); added = true;
        if (picked.length >= TARGET) break;
      }
    }
  }
  // Pass 2 — cap relaxed for effectively mono-layer pools: breadth is
  // preferred, but evidence volume is never sacrificed for it.
  if (picked.length < TARGET) {
    added = true;
    while (added && picked.length < TARGET) {
      added = false;
      for (const list of byLayer.values()) {
        const next = list.shift();
        if (next && !pickedIds.has(next.evidenceId)) {
          take(next); added = true;
          if (picked.length >= TARGET) break;
        }
      }
    }
  }
  // Pass 3 — top up from any quotable evidence (even off-topic) so we never
  // run thin; under-cap layers are drawn from first.
  if (picked.length < TARGET) {
    const topUp = quotable.filter(e => !pickedIds.has(e.evidenceId));
    topUp.sort((a, b) => (layerMix[layerOf(a)] || 0) - (layerMix[layerOf(b)] || 0));
    for (const e of topUp) {
      take(e);
      if (picked.length >= TARGET) break;
    }
  }
  const layerCapExceeded = Object.values(layerMix).some(n => n > LAYER_CAP);

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
    note: `Targeted REAL evidence for '${sectionId}' — ${simplified.length} distinct ingested records (Amazon / Flipkart / FirstCry / Instagram / Facebook / social listening). Every verbatim MUST be copied from a sample_evidence 'text' field; set source: to that record's platform. The 'axes' field carries detected style:/pack: tags — keep STYLE and PACK as separate axes. Represent 4+ platforms per section. There is no other permitted source of quotes.`,
  });

  return { json, count: simplified.length, layerMix, layerCapExceeded };
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
        `[BabyDiapers] provenance ${sectionId}: ${audit.corpus}/${audit.total} corpus-verified, ` +
        `${audit.unverified} fabricated (dropped)`
      );
    } catch (err: any) {
      logger?.(`[BabyDiapers] provenance check skipped: ${err?.message || err}`);
    }
    return content;
  };

  // Layer mix per section job — the stratification audit trail (≤50%/layer).
  const mixStr = Object.entries(capsule.layerMix).map(([l, n]) => `${l}:${n}`).join(' ');
  logger?.(`[BabyDiapers] ${sectionId} evidence=${capsule.count} layer_mix={${mixStr}} cap50=${capsule.layerCapExceeded ? 'relaxed' : 'ok'}`);

  const buildPrompt = (tier: string, isRepair = false) => `
${systemPrompt}

${tier}
${isRepair ? "CRITICAL: Previous output failed the quality gate. Use Search Grounding + category norms to fill gaps. Never leave arrays empty. Hold the Lovingle = rash/skin-safety objection lock and the two-axis (style ≠ pack) rule." : ""}

SECTION TASK: ${sectionPrompt}

FIELD BUDGETS (HARD CEILINGS — these override any looser field description above):
- headline: ≤9 words · body/description/what_it_means/reading: ≤35 words
- why / how_met_today / style·lifestage·day-night notes / shift notes: ≤22 words each
- pool_note: ≤55 words · synthesis: ≤110 words · notes/points per card: MAX 3
Prefer omission over compression — cut items, don't cram sentences. Exceeding a ceiling is a defect.

TERMINOLOGY — VENDOR-NEUTRAL SOURCE NAMES:
- Never name data-collection vendors or scraping tools ("Awario", "Apify") anywhere in the output — headlines, notes, sources, pool notes, synthesis.
- Cite sources by consumer platform (Amazon, Flipkart, FirstCry, Instagram, Facebook, YouTube, Quora); when a record's platform is a listening aggregate, write "Social listening".

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
    'babycare_needs', 'diaper_needs_fes', 'decision_journey', 'usage_occasions',
    'features_benefits', 'channel_dynamics', 'competitive_landscape',
    'pricing_dynamics', 'consumer_personas',
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
      if (text === null) { logger?.(`[BabyDiapers] no provider configured — pipeline writes PENDING stub`); return null; }

      const parsed = cleanAndParseJSON(text || "{}");
      if (parsed.__rawText) throw new Error("Model returned non-JSON");

      const normalized = normalizeBabyDiapers(sectionId, parsed);
      const quality = evaluateBabyDiapersQuality(sectionId, normalized);
      logger?.(`[BabyDiapers] quality=${quality.score} fails=${quality.failures.join('|')}`);

      if (!quality.ok) {
        if (attempts === 1) { logger?.(`[BabyDiapers] retry with repair prompt`); continue; }
        logger?.(`[BabyDiapers] repair failed — pipeline writes PENDING stub`);
        return normalizeBabyDiapers(sectionId, {});
      }
      return finalizeReal(normalized);
    } catch (e: any) {
      console.warn(`[BabyDiapers] attempt ${attempts} failed:`, e?.message || e);
      if (attempts >= 2) break;
      await delay(1000);
    }
  }

  logger?.(`[BabyDiapers] generation failed — pipeline writes PENDING stub`);
  return normalizeBabyDiapers(sectionId, {});
};
