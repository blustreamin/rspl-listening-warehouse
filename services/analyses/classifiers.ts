// ============================================================================
//  Pure text/field classifiers for the New Analyses layer.
//
//  Every function is deterministic and side-effect-free so it is unit-testable
//  without a corpus (see scripts/analyses-smoke.ts). They classify the RESOLVED
//  text (event.content.text) plus raw fields the event drops (price/product/
//  variant/language). A classifier returns null / [] when it finds no signal —
//  the caller counts that as "unclassified" and never back-fills it.
//
//  Lexicons are intentionally India-baby-diaper specific (Hinglish included).
//  They are additive: adding a cue only widens recall, never invents a value.
// ============================================================================

import type { CanonicalFieldMap } from '../../types';
import type { AnalysisInputRow } from './analysisTypes';
// .js suffix (not extensionless): this module is in the api/_lib/assemble.ts
// server import chain, where emitted value imports must resolve under Node
// ESM. tsx/vite resolve .js -> .ts identically (repo api convention).
import { parseRowDate } from '../ingestion/babyDiapersIngestion.js';

const lc = (s: string): string => (s || '').toLowerCase();
const has = (t: string, ...subs: string[]): boolean => subs.some((s) => t.includes(s));
const wordRe = (words: string[]): RegExp =>
  new RegExp(`\\b(?:${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');

/** Read a raw field via the canonical map, coping with unmapped exports. */
export const rawField = (raw: any, fieldMap: CanonicalFieldMap, key: keyof CanonicalFieldMap): string => {
  const name = fieldMap?.[key];
  if (!name || !raw || typeof raw !== 'object') return '';
  const v = raw[name];
  return v === null || v === undefined ? '' : String(v).trim();
};

/** The text the classifiers read — the event's resolved content, which the
 *  ingestion already best-effort-populated from title/snippet fallbacks. */
export const resolveText = (row: AnalysisInputRow): string =>
  (row.event?.content?.text || '').trim();

/** Datedness on the frozen basis: trust the gate decision when supplied, else
 *  recompute from raw + fieldMap with the SAME parseRowDate the gate/ingest use
 *  — so undated rows (stamped now() on the event) never pollute the seasonality
 *  census, with or without decision-plumbing from the assemble. */
export const datednessOf = (row: AnalysisInputRow): { dated: boolean; dateMs: number | null } => {
  if (row.gate) return { dated: row.gate.dated, dateMs: row.gate.dateMs };
  const ds = rawField(row.raw, row.fieldMap, 'createdAtISO');
  const d = ds ? parseRowDate(ds) : null;
  return d ? { dated: true, dateMs: d.getTime() } : { dated: false, dateMs: null };
};

// ── N-15/16 · Caregiver / babycare roles (incl. long tail) ──────────────────
// Ordered: first match wins so a specific tail role (maalish wali) is not
// swallowed by a generic one (mother). A record with no role cue → null.
const ROLE_LEXICON: Array<[string, RegExp]> = [
  ['Maalish wali / masseuse', wordRe(['maalish', 'malish', 'champi', 'masseuse', 'malishwali', 'maalishwali'])],
  ['Daycare / creche', wordRe(['daycare', 'day care', 'creche', 'crèche', 'playschool', 'play school'])],
  ['Nanny / maid / help', wordRe(['nanny', 'aya', 'ayah', 'maid', 'bai', 'didi', 'house help', 'helper', 'governess'])],
  ['Grandmother (dadi/nani)', wordRe(['grandmother', 'grandma', 'granny', 'dadi', 'nani', 'naani', 'daadi'])],
  ['Grandfather (dada/nana)', wordRe(['grandfather', 'grandpa', 'dada', 'nana', 'daada'])],
  ['Mother-in-law (saas)', wordRe(['mother in law', 'mother-in-law', 'saas', 'sasu', 'mil'])],
  ['Father / husband', wordRe(['father', 'husband', 'papa', 'dad', 'daddy', 'hubby', 'my man', 'baby daddy'])],
  ['Sibling / elder child', wordRe(['brother', 'sister', 'sibling', 'elder one', 'bhaiya', 'didi'])],
  ['Fellow moms / friends', wordRe(['fellow mom', 'other moms', 'mom friends', 'friends', 'neighbour mom', 'mommy group'])],
  ['Neighbour / relatives', wordRe(['neighbour', 'neighbor', 'relatives', 'cousin', 'aunt', 'chachi', 'bua', 'mami'])],
  ['Mother / self', wordRe(['mother', 'mom', 'mummy', 'mumma', 'maa', 'i change', 'my baby', 'as a mom'])],
];
export const classifyCaregiverRole = (text: string): string | null => {
  const t = lc(text);
  for (const [role, re] of ROLE_LEXICON) if (re.test(t)) return role;
  return null;
};

// ── N-19 · Lifestage classifier → standard six bands ────────────────────────
export const LIFESTAGE_BANDS = [
  'Newborn (0-3m)', 'Infant (3-6m)', 'Crawler (6-12m)',
  'Early Toddler (12-18m)', 'Toddler (18-24m)', 'Late Toddler (24-36m)',
] as const;
export type Lifestage = (typeof LIFESTAGE_BANDS)[number];

const bandForMonths = (m: number): Lifestage | null => {
  if (m < 0 || m > 60) return null;
  if (m < 3) return 'Newborn (0-3m)';
  if (m < 6) return 'Infant (3-6m)';
  if (m < 12) return 'Crawler (6-12m)';
  if (m < 18) return 'Early Toddler (12-18m)';
  if (m < 24) return 'Toddler (18-24m)';
  if (m <= 36) return 'Late Toddler (24-36m)';
  return null; // 3y+ is out of the six-band scope; not forced into a band
};

/** Extract an explicit age in months from text, if stated. */
const monthsFromText = (t: string): number | null => {
  // "3 months", "3 month old", "3mo", "3 m old"
  const mMonth = t.match(/(\d{1,2})\s*(?:months?|month old|mo\b|m\.o|-month)/);
  if (mMonth) return parseInt(mMonth[1], 10);
  // "1 year", "2 yrs", "2 year old"
  const mYear = t.match(/(\d)\s*(?:years?|yrs?|yr old|year old)/);
  if (mYear) return parseInt(mYear[1], 10) * 12;
  // "X week old" newborns
  const mWeek = t.match(/(\d{1,2})\s*(?:weeks?|week old)/);
  if (mWeek) return Math.round((parseInt(mWeek[1], 10) * 7) / 30);
  return null;
};

export const classifyLifestage = (text: string): Lifestage | null => {
  const t = lc(text);
  const m = monthsFromText(t);
  if (m !== null) { const b = bandForMonths(m); if (b) return b; }
  // Milestone cues (only when no explicit age was found).
  if (wordRe(['newborn', 'just born', 'few days old', 'nicu']).test(t)) return 'Newborn (0-3m)';
  if (wordRe(['walking', 'runs around', 'potty training', 'potty train', 'toilet training']).test(t)) return 'Late Toddler (24-36m)';
  if (wordRe(['crawling', 'crawler', 'sitting up', 'started solids', 'teething']).test(t)) return 'Crawler (6-12m)';
  if (wordRe(['toddler']).test(t)) return 'Toddler (18-24m)';
  return null;
};

// ── N-25 · Usage occasions ──────────────────────────────────────────────────
const OCCASION_LEXICON: Array<[string, RegExp]> = [
  ['Night / overnight', wordRe(['night', 'overnight', 'raat', 'sleep', 'bedtime', '12 hour', '12-hour'])],
  ['Travel / outing', wordRe(['travel', 'travelling', 'outing', 'trip', 'journey', 'flight', 'car ride', 'vacation'])],
  ['Daycare', wordRe(['daycare', 'day care', 'creche', 'playschool'])],
  ['Monsoon / rainy', wordRe(['monsoon', 'rainy', 'rains', 'humid', 'humidity'])],
  ['Summer / heat', wordRe(['summer', 'heat', 'hot weather', 'garmi'])],
  ['Winter', wordRe(['winter', 'cold weather', 'sardi'])],
  ['Festival / occasion', wordRe(['festival', 'wedding', 'function', 'diwali', 'party'])],
  ['Daytime / home', wordRe(['daytime', 'at home', 'during the day', 'home use'])],
];
export const classifyOccasions = (text: string): string[] => {
  const t = lc(text);
  return OCCASION_LEXICON.filter(([, re]) => re.test(t)).map(([o]) => o);
};

// ── N-26 · Format + avoidance ───────────────────────────────────────────────
export type DiaperFormat = 'Tape' | 'Pant / pull-up' | 'Cloth / langot' | 'Reusable';
/** Prefer the ingestion's style: token when present, else mine the text. */
export const classifyFormat = (row: AnalysisInputRow): DiaperFormat | null => {
  const tokens = row.event?.derived?.tokens || [];
  const styleTok = tokens.find((x) => x.startsWith('style:'));
  if (styleTok) {
    const s = styleTok.slice('style:'.length);
    if (s === 'pant_disposable') return 'Pant / pull-up';
    if (s === 'tape_disposable') return 'Tape';
    if (s === 'cloth') return 'Cloth / langot';
    if (s === 'reusable') return 'Reusable';
  }
  const t = lc(resolveText(row));
  if (has(t, 'pant', 'pull up', 'pull-up', 'pullup')) return 'Pant / pull-up';
  if (has(t, 'tape', 'taped', 'stick tab')) return 'Tape';
  if (has(t, 'reusable', 'washable')) return 'Reusable';
  if (has(t, 'cloth', 'langot', 'nappy', 'nappa')) return 'Cloth / langot';
  return null;
};
const AVOIDANCE_LEXICON: Array<[string, RegExp]> = [
  ['Rash / skin reaction', wordRe(['rash', 'rashes', 'allergy', 'skin reaction', 'redness', 'irritation'])],
  ['Cost / too expensive', wordRe(['expensive', 'costly', 'cant afford', "can't afford", 'too pricey', 'save money'])],
  ['Prefer cloth at home', wordRe(['prefer cloth', 'use cloth', 'langot at home', 'cloth at home'])],
  ['Night-only / limited use', wordRe(['only at night', 'night only', 'only when travel', 'only for outing'])],
  ['Environmental concern', wordRe(['chemical', 'environment', 'landfill', 'eco', 'plastic'])],
];
export const classifyAvoidance = (text: string): string | null => {
  const t = lc(text);
  if (!has(t, 'avoid', 'not use', "don't use", 'dont use', 'stopped using', 'without diaper', 'no diaper')) {
    // avoidance is only counted when an avoidance frame is present
    for (const [reason, re] of AVOIDANCE_LEXICON) if (re.test(t) && has(t, 'avoid', 'stop', 'prefer', 'instead')) return reason;
    return null;
  }
  for (const [reason, re] of AVOIDANCE_LEXICON) if (re.test(t)) return reason;
  return 'Avoidance (reason unclear)';
};

// ── Price segment (mass / mid-premium / premium) ────────────────────────────
// Brand tier is the reliable proxy (per-piece ₹ is sparse and noisy). Unmapped
// brands → null (unclassified), never forced into a tier.
const BRAND_SEGMENT: Record<string, 'mass' | 'mid-premium' | 'premium'> = {
  Pampers: 'premium', Huggies: 'premium',
  MamyPoko: 'mid-premium', 'Little Angels': 'mid-premium', LuvLap: 'mid-premium', Himalaya: 'mid-premium',
  Bumtum: 'mass', Supples: 'mass', 'Mee Mee': 'mass', 'Teddyy Baby': 'mass', Snuggy: 'mass',
  Babyhug: 'mass', Lovingle: 'mass',
};
export type PriceSegment = 'mass' | 'mid-premium' | 'premium';
export const priceSegmentForBrand = (brand?: string): PriceSegment | null =>
  (brand && BRAND_SEGMENT[brand]) || null;

// ── N-31/33/34 · Channel + urgency ──────────────────────────────────────────
// Source platform (where the record was scraped) vs purchase channel (where the
// consumer says they bought). Keep them separate — the brief's channel share is
// about purchase channel; platform is a strong but different signal.
export const sourcePlatform = (row: AnalysisInputRow): string =>
  row.event?.content?.platform || row.event?.commerce?.platform || 'Social listening';

const CHANNEL_LEXICON: Array<[string, RegExp]> = [
  ['Quick-commerce', wordRe(['blinkit', 'zepto', 'instamart', 'dunzo', 'swiggy instamart', '10 minute', '10-minute'])],
  ['Online marketplace', wordRe(['amazon', 'flipkart', 'firstcry', 'first cry', 'meesho', 'jiomart', 'online', 'ordered online'])],
  ['Pharmacy / chemist', wordRe(['pharmacy', 'chemist', 'medical store', 'apollo', 'medplus'])],
  ['Kirana / local store', wordRe(['kirana', 'local store', 'general store', 'nearby shop', 'baniya', 'corner shop'])],
  ['Supermarket / modern trade', wordRe(['dmart', 'd-mart', 'reliance', 'big bazaar', 'supermarket', 'more store'])],
  ['Brand D2C site', wordRe(['brand website', 'official site', 'their website', 'd2c'])],
];
export const classifyChannel = (text: string): string | null => {
  const t = lc(text);
  for (const [ch, re] of CHANNEL_LEXICON) if (re.test(t)) return ch;
  return null;
};
export const classifyUrgency = (text: string): 'Urgent' | 'Planned' | null => {
  const t = lc(text);
  const urgent = wordRe(['ran out', 'urgent', 'urgently', 'emergency', 'last minute', 'immediately', 'right away', 'asap', 'need now', 'out of stock at home']).test(t);
  const planned = wordRe(['stock up', 'stocked up', 'monthly', 'every month', 'bulk', 'subscribe', 'in advance', 'planned', 'always keep']).test(t);
  if (urgent && !planned) return 'Urgent';
  if (planned && !urgent) return 'Planned';
  return null;
};

// ── N-43/44 · Category drivers ──────────────────────────────────────────────
export const DRIVERS: Array<[string, RegExp]> = [
  ['Rash / skin safety', wordRe(['rash', 'rashes', 'skin', 'irritation', 'redness', 'allergy', 'gentle'])],
  ['Absorption', wordRe(['absorb', 'absorption', 'absorbent', 'soak', 'soakage', 'capacity', 'holds'])],
  ['Fit', wordRe(['fit', 'fitting', 'size', 'snug', 'tight', 'loose', 'waist', 'legs'])],
  ['Softness', wordRe(['soft', 'softness', 'mulayam', 'comfortable', 'comfy', 'cotton'])],
  ['Price-value', wordRe(['price', 'value', 'worth', 'cheap', 'affordable', 'expensive', 'per piece', 'budget'])],
  ['Wetness indicator', wordRe(['wetness indicator', 'wet indicator', 'indicator line', 'colour change', 'color change'])],
  ['Leakage', wordRe(['leak', 'leakage', 'leaked', 'leaking', 'no leak'])],
  ['Overnight / long-lasting', wordRe(['overnight', 'all night', 'long lasting', '12 hour', 'dry all night'])],
  ['Breathability', wordRe(['breathable', 'breathability', 'air', 'ventilation', 'hawa'])],
  ['Fragrance / odour', wordRe(['fragrance', 'smell', 'odour', 'odor', 'perfume', 'scent'])],
];
export const classifyDrivers = (text: string): string[] => {
  const t = lc(text);
  return DRIVERS.filter(([, re]) => re.test(t)).map(([d]) => d);
};

// ── N-45/46 · Switch detection ──────────────────────────────────────────────
// "switched from X to Y", "moved to", "went back to". Returns {from,to,reason?}
// only when a directional switch frame is present; otherwise null.
export const detectSwitch = (
  text: string,
  brandsPresent: string[],
): { from?: string; to?: string; reason?: string } | null => {
  const t = lc(text);
  if (!wordRe(['switch', 'switched', 'shifted', 'moved to', 'changed to', 'went back to', 'moved from', 'earlier used', 'used to use']).test(t)) return null;
  // brandsPresent are canonical brands the ingestion/scan detected in this text.
  const uniq = Array.from(new Set(brandsPresent.filter(Boolean)));
  const out: { from?: string; to?: string; reason?: string } = {};
  // Heuristic: "from A to B"
  const m = t.match(/from\s+([a-z][a-z &]{2,20})\s+to\s+([a-z][a-z &]{2,20})/);
  if (m) { out.from = m[1].trim(); out.to = m[2].trim(); }
  if (!out.to && uniq.length) out.to = uniq[0];
  const reasonHit = classifyDrivers(t)[0];
  if (reasonHit) out.reason = reasonHit;
  return out.from || out.to ? out : null;
};

// ── N-58 · First-vs-second-time mom (language-signal; precision limited) ─────
export type MomStage = 'First-time' | 'Second-plus' | null;
export const classifyMomStage = (text: string): MomStage => {
  const t = lc(text);
  const first = wordRe(['first baby', 'first time mom', 'first-time mom', 'new mom', 'ftm', 'first child', 'pehla bacha', 'became a mom']).test(t);
  const second = wordRe(['second baby', '2nd baby', 'my elder', 'elder one', 'older one', 'younger one', 'second child', 'again pregnant', 'both my kids', 'my kids']).test(t);
  if (second) return 'Second-plus'; // "second" outranks "first" (mentions of both usually mean experienced)
  if (first) return 'First-time';
  return null;
};

// ── N-37 · Pack-size extraction (feasibility-gated) ─────────────────────────
export interface PackSignal {
  packBand?: 'laddi' | '99' | '399' | '999' | null;
  pieces?: number | null;    // count on the pack, if stated
  priceInr?: number | null;  // ₹ mentioned
  hit: boolean;              // any pack signal at all
}
const PACK_TOKEN_RE = /\b(laddi|single piece|twin pack|jumbo|monthly box|bulk)\b/i;
export const extractPackSize = (row: AnalysisInputRow): PackSignal => {
  const product = rawField(row.raw, row.fieldMap, 'product');
  const variant = rawField(row.raw, row.fieldMap, 'variant');
  const t = lc([product, variant, resolveText(row)].filter(Boolean).join(' '));
  const out: PackSignal = { hit: false, packBand: null, pieces: null, priceInr: null };
  // Piece count: "72 pcs", "36 count", "pack of 40"
  const pc = t.match(/(\d{2,3})\s*(?:pcs|pc|pieces|count|nos|diapers|pants)\b/) || t.match(/pack of\s*(\d{2,3})/);
  if (pc) { out.pieces = parseInt(pc[1], 10); out.hit = true; }
  // ₹ price: "₹399", "rs 499", "499/-"
  const pr = t.match(/(?:₹|rs\.?\s*|inr\s*)(\d{2,4})/) || t.match(/(\d{2,4})\s*(?:\/-|rupees)/);
  if (pr) { out.priceInr = parseInt(pr[1], 10); out.hit = true; }
  // Coarse price-band tokens (also mirrors tagPack)
  if (/\b999\b/.test(t) || /jumbo|monthly box|bulk/.test(t)) { out.packBand = '999'; out.hit = true; }
  else if (/\b399\b/.test(t)) { out.packBand = '399'; out.hit = true; }
  else if (/\b99\b/.test(t)) { out.packBand = '99'; out.hit = true; }
  else if (PACK_TOKEN_RE.test(t)) { out.packBand = 'laddi'; out.hit = true; }
  return out;
};

// ── N-47/48/49 · Price extraction ───────────────────────────────────────────
/** Numeric price: prefer the raw structured price field; else a ₹ mention in
 *  text. Returns null when neither is present (never a guess). */
export const extractPriceInr = (row: AnalysisInputRow): number | null => {
  const raw = rawField(row.raw, row.fieldMap, 'price');
  if (raw) {
    const n = parseFloat(raw.replace(/[₹,\s]/g, '').replace(/rs\.?/i, ''));
    if (!isNaN(n) && n >= 10 && n <= 5000) return n;
  }
  const t = lc(resolveText(row));
  const m = t.match(/(?:₹|rs\.?\s*|inr\s*)(\d{2,4})/) || t.match(/(\d{2,4})\s*(?:\/-|rupees)/);
  if (m) { const n = parseInt(m[1], 10); if (n >= 10 && n <= 5000) return n; }
  return null;
};

// ── N-39 · Organic brand scan (untracked brands beyond the perception grid) ─
// Conservative: a small candidate list of India baby-diaper brands NOT in the
// ingestion's tracked set, plus a generic "<Brand> diaper(s)/pants" catcher.
export const UNTRACKED_BRAND_CANDIDATES = [
  'Wowper', 'Panda', 'Cuddles', 'Nappico', 'Kids Diapers', 'Millennium Baby',
  'Bey Bee', 'Baby Forest', 'Tinytots', 'Termeric', 'MyMy', 'Chinmay',
];
export const organicBrandScan = (text: string, trackedLower: Set<string>): string[] => {
  const t = lc(text);
  const found: string[] = [];
  for (const b of UNTRACKED_BRAND_CANDIDATES) {
    if (trackedLower.has(b.toLowerCase())) continue;
    if (t.includes(b.toLowerCase())) found.push(b);
  }
  return found;
};

/** 'YYYY-MM' month key from ms, in UTC (matches trendMonthly semantics). */
export const monthKey = (ms: number): string => {
  const d = new Date(ms);
  const m = d.getUTCMonth() + 1;
  return `${d.getUTCFullYear()}-${m < 10 ? '0' : ''}${m}`;
};
