
import { IngestRequestV1, EvidenceGraph, EvidenceEventV1 } from '../../types';

// Stable hash for dedup across files
const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
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

// Deterministic ingestion for Baby Diapers — processes all rows, dedups by text.
export const babyDiapersIngestion = (request: IngestRequestV1): EvidenceGraph => {
  const events: EvidenceEventV1[] = [];
  const brandCounts: Record<string, number> = {};
  const ratings: number[] = [];
  const seenTextHashes = new Set<number>();

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

      // TEXT
      let text = getField(raw, fieldMap.text);
      if (!text || text.length < 5) {
        for (const fb of ['Post Snippet', 'reviewDescription', 'review_text', 'text', 'caption', 'content', 'comment']) {
          const val = raw[fb];
          if (val && String(val).trim().length >= 5) { text = String(val).trim(); break; }
        }
      }
      if (!text || text.length < 5) return;

      const cleanText = text.trim().toLowerCase();
      const textHash = cyrb53(cleanText);
      if (seenTextHashes.has(textHash)) return;
      seenTextHashes.add(textHash);
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

      // DATE
      const dateStr = getField(raw, fieldMap.createdAtISO);
      let createdAt = new Date().toISOString();
      if (dateStr) {
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            createdAt = d.toISOString();
            // Only genuinely dated records feed the collection-period line —
            // the ingest-time default above would pollute the max.
            datedCount++;
            if (!dateMin || createdAt < dateMin) dateMin = createdAt;
            if (!dateMax || createdAt > dateMax) dateMax = createdAt;
          }
        } catch { /* default */ }
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
