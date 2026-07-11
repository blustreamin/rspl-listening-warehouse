
import { IngestRequestV1, EvidenceGraph, EvidenceEventV1 } from '../../types';

// Excel serial date (days since 1899-12-30, fraction = time of day). The
// stored Apify/Awario blobs carry most dates this way (e.g. 43405.0001,
// 46202.667); new Date(String(serial)) is Invalid, which is how 58k of 60k
// rows silently lost their dates (datedCount 2,287, "2012 floor" = the oldest
// parseable "Jan, 2013"-style string). Serials are accepted only in a
// plausible mention-date window; anything else falls through to Date parsing.
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
// Exported so the India-gate date window (api/_lib/indiaGate.ts) applies the
// EXACT same datedness semantics as the ingest — if the two ever diverged, the
// gate audit could not reconcile against the graph's dateRange.datedCount.
export const parseRowDate = (v: string): Date | null => {
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) {
    const n = parseFloat(v);
    if (n >= 20000 && n <= 80000) {
      return new Date(EXCEL_EPOCH_MS + Math.round(n * 86400000));
    }
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// INDIA BABY DIAPER BRAND LIST — hardcoded; new entrants require a code change.
// Majors stay first: extractBrandFromText is first-match, so list order decides
// who claims a multi-brand text. Challengers (05 Jul corpus rebuild) append.
const INDIA_BABY_DIAPER_BRANDS = [
  "Lovingle", "Pampers", "MamyPoko", "Huggies", "Little Angels",
  "Bumtum", "Supples", "Mee Mee", "Himalaya", "LuvLap", "Teddyy Baby",
  "Nobel Hygiene", "Snuggy", "Bey Bee",
  "SuperBottoms", "Babyhug", "Dabur", "R for Rabbit",
];

// Variant hints that should still resolve to a parent brand.
// NOTE: consumers write "Little Angel" (singular — the pack says Little Angel)
// and hashtags join words (#littleangel, #superbottoms, RforRabbit); the map
// previously carried plural/spaced forms only, which is why Little Angels
// attributed ZERO events in the 02-Jul corpus despite being tracked.
const BRAND_HINTS: Array<[string, string]> = [
  ["lovingle", "Lovingle"],
  ["pampers", "Pampers"],
  ["mamypoko", "MamyPoko"], ["mamy poko", "MamyPoko"],
  ["huggies", "Huggies"],
  ["little angel", "Little Angels"], ["littleangel", "Little Angels"],
  ["bumtum", "Bumtum"],
  ["supples", "Supples"],
  ["mee mee", "Mee Mee"], ["meemee", "Mee Mee"],
  ["himalaya", "Himalaya"],
  ["luvlap", "LuvLap"], ["luv lap", "LuvLap"],
  ["teddyy", "Teddyy Baby"],
  ["superbottoms", "SuperBottoms"], ["super bottoms", "SuperBottoms"],
  ["babyhug", "Babyhug"], ["baby hug", "Babyhug"],
  ["dabur", "Dabur"],
  ["r for rabbit", "R for Rabbit"], ["rforrabbit", "R for Rabbit"],
];

const extractBrandFromText = (text: string): string => {
  const lower = text.toLowerCase();
  for (const b of INDIA_BABY_DIAPER_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return "Generic/Other";
};

const getField = (raw: any, fieldName: string | undefined): string => {
  if (!fieldName) return '';
  if (Array.isArray(raw)) return '';
  const val = raw[fieldName];
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

// TEXT resolution — mapped field first, then the raw-key rescue chain.
// 'Title' fallbacks matter: Awario X-post exports put the tweet text in Title
// with an empty Post Snippet (883 X rows in one file alone were silently
// vanishing here on 05-Jul). Exported (like parseRowDate) so the India gate
// (api/_lib/indiaGate.ts) sees the SAME text the event will carry — a gate
// that misses rescued text would drop rows whose events hold India signals.
export const resolveRowText = (raw: any, textField?: string): string => {
  let text = getField(raw, textField);
  if (!text || text.length < 5) {
    for (const fb of ['Post Snippet', 'reviewDescription', 'review_text', 'text', 'caption', 'content', 'comment', 'Title', 'title']) {
      const val = raw[fb];
      if (val && String(val).trim().length >= 5) { text = String(val).trim(); break; }
    }
  }
  return text || '';
};

// Tag diaper STYLE from text (style axis)
const tagStyle = (t: string): string | undefined => {
  const s = t.toLowerCase();
  if (s.includes('pant') || s.includes('pull up') || s.includes('pull-up')) return 'pant_disposable';
  if (s.includes('tape')) return 'tape_disposable';
  if (s.includes('reusable') || s.includes('washable')) return 'reusable';
  if (s.includes('cloth') || s.includes('langot') || s.includes('nappy')) return 'cloth';
  return undefined;
};

// Tag PACK architecture from text (pack axis — independent of style)
const tagPack = (t: string): string | undefined => {
  const s = t.toLowerCase();
  if (s.includes('laddi') || s.includes('single piece') || s.includes('twin pack')) return 'laddi';
  if (s.includes('999') || s.includes('jumbo') || s.includes('monthly box') || s.includes('bulk')) return 'non_laddi_999';
  if (s.includes('399')) return 'non_laddi_399';
  if (s.includes('99') ) return 'non_laddi_99';
  return undefined;
};

// Deterministic ingestion for Baby Diapers — LOSSLESS: every registered row
// becomes exactly one event. No text-dedup and no length gate: "Value for
// money" × hundreds are DISTINCT reviews (dropping them cost Flipkart 61% of
// its rows on 05-Jul), and a 4-char "Good" still carries brand/rating/platform
// volume. The registry row_count sum is therefore the reconciliation basis the
// assembly guard checks against (services/graphAssembly.ts).
export const babyDiapersIngestion = (request: IngestRequestV1): EvidenceGraph => {
  const events: EvidenceEventV1[] = [];
  const brandCounts: Record<string, number> = {};
  const ratings: number[] = [];

  // Ingestion-panel aggregations (05 Jul rebuild) — computed here, once, at
  // graph-assembly time. The Data Foundation panel reads these; it never
  // recomputes corpus stats client-side.
  const platformCounts: Record<string, number> = {};
  const socialSourceCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};
  const brandRatingAcc: Record<string, { sum: number; count: number }> = {};
  let commerceCount = 0;
  let socialCount = 0;
  let verbatimCount = 0;
  let datedCount = 0;
  let dateMin: string | null = null;
  let dateMax: string | null = null;

  request.inputs.forEach(input => {
    const sourceTag = input.sourceTag.toLowerCase();
    const fieldMap = input.mapping.canonicalFieldMap;

    input.rows.forEach(row => {
      const raw = row.raw;
      // A null/primitive raw has no fields at all — skipping it beats a
      // TypeError mid-assembly; the reconciliation guard catches mass loss.
      if (!raw || typeof raw !== 'object') return;

      // TEXT — resolve the best available content but NEVER drop the row
      // (shared with the India gate via resolveRowText above).
      const text = resolveRowText(raw, fieldMap.text);

      const cleanText = text.trim().toLowerCase();
      if (text.trim().length >= 10) verbatimCount++; // panel's usable-verbatim floor

      // BRAND
      let brand = getField(raw, fieldMap.brand) || "Generic/Other";
      if (brand === "Generic/Other") {
        const product = getField(raw, fieldMap.product);
        if (product) {
          const ex = extractBrandFromText(product);
          if (ex !== "Generic/Other") brand = ex;
        }
      }
      if (brand === "Generic/Other") brand = extractBrandFromText(cleanText);
      // Canonicalise the brand/product FIELD values only ("Mamy Poko", a
      // "Little Angel" alert name → canonical map entries). The review text is
      // deliberately NOT probed here — a Huggies review saying "better than
      // Pampers" must never flip to Pampers by hint order (that misattributes
      // the mention AND its star rating).
      const fieldProbe = (getField(raw, fieldMap.brand) + " " + getField(raw, fieldMap.product)).toLowerCase();
      for (const [hint, canonical] of BRAND_HINTS) {
        if (fieldProbe.includes(hint)) { brand = canonical; break; }
      }
      // Text-level RESCUE only when no field resolved a brand: catches variant
      // spellings the canonical list can't ("mamy poko", "#littleangel").
      if (brand === "Generic/Other") {
        for (const [hint, canonical] of BRAND_HINTS) {
          if (cleanText.includes(hint)) { brand = canonical; break; }
        }
      }
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;

      // RATING
      let rating = 0;
      const rv = getField(raw, fieldMap.rating);
      if (rv) {
        const p = parseFloat(rv);
        if (!isNaN(p) && p >= 1 && p <= 5) { rating = p; ratings.push(rating); }
      }
      if (rating > 0 && brand !== 'Generic/Other') {
        const acc = brandRatingAcc[brand] || (brandRatingAcc[brand] = { sum: 0, count: 0 });
        acc.sum += rating; acc.count++;
      }

      // GEO
      let country = getField(raw, fieldMap.location) || 'IN';
      let city = getField(raw, fieldMap.city) || '';
      let state = getField(raw, fieldMap.state) || '';
      if (country === 'India' || country === 'in') country = 'IN';
      if (city && city.length < 2) city = '';
      if (state && state.length < 2) state = '';
      if (state) stateCounts[state] = (stateCounts[state] || 0) + 1;

      // PLATFORM
      const isCommerce = sourceTag.includes('amazon') || sourceTag.includes('flipkart') || sourceTag.includes('firstcry');
      let platformName = '';
      if (sourceTag.includes('amazon')) platformName = 'Amazon';
      else if (sourceTag.includes('flipkart')) platformName = 'Flipkart';
      else if (sourceTag.includes('firstcry')) platformName = 'FirstCry';
      else if (sourceTag.includes('instagram')) platformName = 'Instagram';
      else if (sourceTag.includes('facebook')) platformName = 'Facebook';
      else {
        const src = (getField(raw, fieldMap.platform) || '').toLowerCase();
        if (src.includes('youtube')) platformName = 'YouTube';
        else if (src.includes('vimeo')) platformName = 'Vimeo';
        else if (src.includes('reddit')) platformName = 'Reddit';
        else if (src.includes('twitter') || src === 'x') platformName = 'Twitter/X';
        else if (src.includes('instagram')) platformName = 'Instagram';
        else if (src.includes('facebook')) platformName = 'Facebook';
        else if (src.includes('quora')) platformName = 'Quora';
        else if (src.includes('babychakra')) platformName = 'BabyChakra';
        else if (src.includes('news') || src.includes('blog')) platformName = 'News & Blogs';
        else if (src.includes('web')) platformName = 'Web';
        else platformName = (getField(raw, fieldMap.platform)) || 'Social Listening';
      }
      platformCounts[platformName] = (platformCounts[platformName] || 0) + 1;
      if (isCommerce) commerceCount++;
      else {
        socialCount++;
        socialSourceCounts[platformName] = (socialSourceCounts[platformName] || 0) + 1;
      }

      // DATE — Excel-serial-aware (see parseRowDate above).
      const dateStr = getField(raw, fieldMap.createdAtISO);
      let createdAt = new Date().toISOString();
      if (dateStr) {
        const d = parseRowDate(dateStr);
        if (d) {
          createdAt = d.toISOString();
          // Only genuinely dated records feed the collection-period line —
          // the ingest-time default above would pollute the max.
          datedCount++;
          if (!dateMin || createdAt < dateMin) dateMin = createdAt;
          if (!dateMax || createdAt > dateMax) dateMax = createdAt;
        }
      }

      // STYLE + PACK tags (stashed in derived.tokens; kept as two independent axes)
      const tokens: string[] = [];
      const st = tagStyle(text); if (st) tokens.push(`style:${st}`);
      const pk = tagPack(text); if (pk) tokens.push(`pack:${pk}`);

      events.push({
        evidenceId: `bd_${events.length}_${Date.now().toString(36)}`,
        eventType: isCommerce ? 'COMMERCE_REVIEW' : 'SOCIAL_MENTION',
        sourceTag: sourceTag.includes('amazon') ? 'amazon'
          : sourceTag.includes('flipkart') ? 'flipkart'
          : sourceTag.includes('firstcry') ? 'firstcry'
          : sourceTag.includes('instagram') ? 'instagram'
          : sourceTag.includes('facebook') ? 'facebook'
          : 'social',
        content: { text: text.trim(), platform: platformName },
        commerce: { brand, platform: platformName, rating, currency: 'INR' },
        geo: { country: country || 'IN', city: city || undefined, state: state || undefined },
        time: { createdAtISO: createdAt },
        derived: tokens.length ? { tokens } : undefined,
      });
    });
  });

  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const cityCounts: Record<string, number> = {};
  events.forEach(e => { if (e.geo?.city) cityCounts[e.geo.city] = (cityCounts[e.geo.city] || 0) + 1; });

  console.log(`[babyDiapersIngestion] ${events.length} events, ${Object.keys(brandCounts).length} brands, ${Object.keys(cityCounts).length} cities`);

  return {
    schemaVersion: "evidence_graph_v1",
    projectId: request.projectId,
    generatedAtISO: new Date().toISOString(),
    events,
    aggregations: {
      brandCounts: Object.entries(brandCounts).map(([k, v]) => ({ brand: k, count: v })),
      ratingSummary: { count: ratings.length, avg: avgRating, p50: 0, p90: 0 },
      languageCounts: [{ lang: 'en', count: events.length }],
      platformCounts: Object.entries(platformCounts).map(([platform, count]) => ({ platform, count })),
      eventTypeCounts: { commerce: commerceCount, social: socialCount },
      socialSourceCounts: Object.entries(socialSourceCounts).map(([source, count]) => ({ source, count })),
      brandRatings: Object.entries(brandRatingAcc).map(([brand, a]) => ({
        brand, count: a.count, avg: Math.round((a.sum / a.count) * 100) / 100,
      })),
      verbatimCount,
      dateRange: { min: dateMin, max: dateMax, datedCount },
      stateCounts: Object.entries(stateCounts).map(([state, count]) => ({ state, count })),
    },
  };
};
