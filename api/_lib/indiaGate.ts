import type { CanonicalFieldMap, GeoClass } from "../../types.js";
import { parseRowDate, resolveRowText } from "../../services/ingestion/babyDiapersIngestion.js";

// ============================================================================
// INDIA GATE (V-01) + DATE WINDOW (V-02) — row-level classification for the
// server-side assemble (api/_lib/assemble.ts).
//
// The gate classifies RAW ROWS, not events, because the deterministic
// ingestion output cannot carry the needed signals: events have no sourceRef
// (no way back to the row), geo.country DEFAULTS to 'IN' when no location is
// mapped (babyDiapersIngestion.ts — unusable as an India signal), undated rows
// are stamped with assembly-time now() (indistinguishable from "dated today"),
// and source_query / url never reach the event at all.
//
// Classification precedence (deterministic; first match wins):
//   1. Reddit row whose source_query matches a SEA community  -> NON_IN
//   2. India-scoped platform (amazon.in/flipkart/firstcry marketplaces,
//      parentune/indusladies/indiaparenting forums)            -> IN_PLATFORM
//   3. Explicit geo present: India match -> IN_GEO, else       -> NON_IN
//      (a known non-India place name vetoes homonym matches:
//       "Hyderabad, Pakistan" / "Lahore, Punjab" are NON_IN)
//   4. India signal (author-location IN, .in links, India place/state
//      references, Indic-script content, Indic lang code)      -> IN_SIGNAL
//      A non-India author location is NOT a terminal NON_IN — it is merely
//      not-a-signal; the remaining signal checks still run (spec lists
//      author-location only as an IN signal).
//   5. Otherwise                                               -> UNKNOWN_GLOBAL
// Kept: IN_PLATFORM, IN_GEO, IN_SIGNAL. Dropped: NON_IN, UNKNOWN_GLOBAL.
//
// Date window (V-02): rows whose parsed date (same parseRowDate as the ingest)
// is older than the cutoff are excluded; UNDATED rows are KEPT (documented).
// The window is applied only to geo-kept rows, so the audit equation
//   postGate = preGate - NON_IN - UNKNOWN_GLOBAL - droppedPreWindow
// holds exactly.
// ============================================================================

export interface GateDecision {
  geoClass: GeoClass;
  kept: boolean;            // geo-kept AND inside the date window
  preWindow: boolean;       // geo-kept but dated before the cutoff -> dropped
  dated: boolean;           // had a parseable date
  dateMs: number | null;    // parsed date (ms) when dated, for the trend series
}

// --- India-scoped platforms (owner list V-01, verbatim — owner-confirmed
// 11-Jul). 'babychakra' is deliberately NOT here: owner call, verified against
// the canonical corpus (zero BabyChakra rows exist; any future ones classify
// via IN_SIGNAL/IN_GEO on their own India signals, or conservatively drop).
const IN_PLATFORM_TOKENS = [
  "amazon.in", "flipkart", "firstcry", "parentune", "indusladies",
  "indiaparenting",
];

// Registry source tags that are India-scoped marketplaces for this warehouse
// (the project's amazon/flipkart/firstcry exports are all .in storefronts).
const IN_MARKETPLACE_TAG = /amazon|flipkart|firstcry/;

// --- SEA community rule (owner list, verbatim; substring match on the
// lowercased source_query covers the * wildcard forms). 'indonesia' is an
// ADDITION pending owner confirmation: the owner list's 'ondonesia' matches
// no real community name ('indonesia'.includes('ondonesia') is false) and is
// presumed a typo — both tokens are kept so the verbatim list stays intact.
const SEA_COMMUNITY_TOKENS = [
  "nanay", "adviceph", "askph", "shopeeph", "phmoney", "saversph", "dealsph",
  "tanonglang", "bolehland", "malaysia", "manamurah", "nepal", "singapore",
  "brunei", "thaigl", "ondonesia", "indonesia",
];

// --- India gazetteer (states/UTs + distinctive major cities). Word-boundary
// matched. Deliberately excludes bare 'indian' for LOCATION fields (a location
// says "India", text says "indian"); text signals use the wider pattern below.
const IN_STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "goa", "gujarat", "haryana", "himachal", "jharkhand", "karnataka", "kerala",
  "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
  "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim",
  "tamil nadu", "tamilnadu", "telangana", "tripura", "uttar pradesh",
  "uttarakhand", "west bengal", "jammu", "kashmir", "ladakh", "puducherry",
  "pondicherry", "andaman", "lakshadweep",
];
const IN_CITIES = [
  "delhi", "mumbai", "bombay", "bengaluru", "bangalore", "chennai", "madras",
  "kolkata", "calcutta", "hyderabad", "pune", "ahmedabad", "jaipur", "surat",
  "lucknow", "kanpur", "nagpur", "indore", "bhopal", "patna", "vadodara",
  "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot", "varanasi",
  "srinagar", "amritsar", "allahabad", "prayagraj", "ranchi", "coimbatore",
  "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai", "raipur",
  "kochi", "cochin", "chandigarh", "guwahati", "thiruvananthapuram",
  "trivandrum", "mysuru", "mysore", "gurgaon", "gurugram", "noida",
  "ghaziabad", "navi mumbai", "thane",
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordListRe = (words: string[]) =>
  new RegExp(`\\b(?:${words.map(escapeRe).join("|")})\\b`, "i");

// LOCATION fields: \bindia\b (not 'indian' — 'Indian Trail, NC' must not pass).
const LOCATION_INDIA_RE = new RegExp(
  `\\b(?:india|bharat)\\b|${wordListRe(IN_STATES).source}|${wordListRe(IN_CITIES).source}`,
  "i"
);
// TEXT signal: adds 'indian', ₹ / INR / "Rs 499"-style currency mentions.
const TEXT_INDIA_RE = new RegExp(
  `\\b(?:india|indian|bharat)\\b|\\binr\\b|₹|\\brs\\.?\\s*\\d|${wordListRe(IN_STATES).source}|${wordListRe(IN_CITIES).source}`,
  "i"
);

// Location values that are noise, not an explicit geo claim.
const JUNK_GEO = new Set([
  "n/a", "na", "-", "--", "unknown", "none", "null", "global", "worldwide",
  "internet", "online", "earth", "everywhere", "world",
]);

// Non-India geography veto — checked BEFORE the India match on explicit geo
// values so cross-border homonyms resolve correctly: 'Hyderabad, Pakistan',
// 'Lahore, Punjab' and 'Azad Kashmir' must be NON_IN even though 'hyderabad'
// / 'punjab' / 'kashmir' appear in the India gazetteer. Applied to explicit
// geo/author-location VALUES only, never to free text (text is too noisy —
// "cheaper than in Pakistan" beside "Mumbai" is still an India mention).
const NON_IN_GEO_RE = /\b(?:pakistan|pakistani|sindh|lahore|karachi|islamabad|rawalpindi|azad kashmir|bangladesh|dhaka|sri lanka|colombo|afghanistan|kabul|united states|usa|u\.s\.a?\.?|uk|united kingdom|england|scotland|wales|ireland|australia|canada|philippines|indonesia|malaysia|singapore|thailand|vietnam|uae|dubai|abu dhabi|saudi|qatar|kuwait|oman|bahrain|nigeria|kenya|south africa|germany|france|italy|spain|brazil|mexico|japan|china|nepal|bhutan|myanmar)\b/i;
const isIndiaGeoValue = (v: string): boolean =>
  !NON_IN_GEO_RE.test(v) && (v === "in" || LOCATION_INDIA_RE.test(v));

// Indic scripts: Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil,
// Telugu, Kannada, Malayalam. Require 3+ chars so a stray glyph can't flip
// a row. (Arabic-range scripts are excluded — ambiguous across languages.)
const INDIC_RE = /[ऀ-ൿ]{3,}/;
const INDIC_LANG_CODES = new Set([
  "hi", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "mr", "ur",
  "hindi", "bengali", "tamil", "telugu", "kannada", "malayalam", "gujarati",
  "punjabi", "odia", "oriya", "marathi", "urdu",
]);

// A URL is an India signal only when its HOSTNAME ends in .in
// ('linkedin.com' must not match). Applied to the url field and to any
// http(s) URLs embedded in the text. Trailing sentence punctuation is
// stripped first — WHATWG URL keeps "amazon.in," as a hostname otherwise,
// defeating the endsWith('.in') check.
const inHost = (u: string): boolean => {
  try {
    return new URL(u.replace(/[.,;:!?)\]]+$/, "")).hostname.toLowerCase().endsWith(".in");
  } catch {
    return false;
  }
};
const URL_IN_TEXT_RE = /https?:\/\/[^\s"'<>)\]]+/g;

// Raw-row keys probed for an author location when the canonical location
// field is unmapped (Awario/Apify exports vary).
const AUTHOR_LOCATION_KEYS = [
  "author_location", "authorLocation", "user_location", "userLocation",
  "Author Location", "location", "Location",
];

const getField = (raw: any, fieldName: string | undefined): string => {
  if (!fieldName || !raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const val = raw[fieldName];
  if (val === null || val === undefined) return "";
  return String(val).trim();
};

const geoValueOf = (v: string): string => {
  const s = v.trim().toLowerCase();
  return s.length < 2 || JUNK_GEO.has(s) ? "" : s;
};

export const classifyRowGeo = (
  raw: any,
  fieldMap: CanonicalFieldMap,
  sourceTag: string
): GeoClass => {
  const tag = (sourceTag || "").toLowerCase();
  const platform = getField(raw, fieldMap.platform).toLowerCase();

  // 1. SEA-community Reddit rows are explicitly non-India regardless of
  //    any other signal (owner rule).
  const isReddit = platform.includes("reddit");
  if (isReddit) {
    const q = String(raw?.source_query ?? raw?.sourceQuery ?? raw?.query ?? "")
      .toLowerCase();
    if (q && SEA_COMMUNITY_TOKENS.some((t) => q.includes(t))) return "NON_IN";
  }

  // 2. India-scoped platform.
  if (IN_MARKETPLACE_TAG.test(tag)) return "IN_PLATFORM";
  if (platform && IN_PLATFORM_TOKENS.some((t) => platform.includes(t))) return "IN_PLATFORM";

  // 3. Explicit geo, if any non-junk value exists. A known non-India place
  //    name anywhere in the values vetoes homonym matches (see NON_IN_GEO_RE).
  //    AUTHOR-LOCATION EXCLUSION: the 'other'-route auto-mapper binds columns
  //    like 'author_location' into fieldMap.location by substring match — but
  //    where the AUTHOR lives is a step-4 SIGNAL per the spec, not the
  //    mention's explicit geography. An author-ish location column is
  //    therefore consulted in step 4(a) instead of here.
  const locCol = fieldMap.location || "";
  const locIsAuthorish = /author|user/i.test(locCol);
  const geoValues = [
    locIsAuthorish ? "" : geoValueOf(getField(raw, fieldMap.location)),
    geoValueOf(getField(raw, fieldMap.state)),
    geoValueOf(getField(raw, fieldMap.city)),
  ].filter(Boolean);
  if (geoValues.length > 0) {
    if (geoValues.some((v) => NON_IN_GEO_RE.test(v))) return "NON_IN";
    return geoValues.some(isIndiaGeoValue) ? "IN_GEO" : "NON_IN";
  }

  // 4. India signals on otherwise-global rows.
  //    (a) author location — the mapped-but-author-ish location column plus
  //        the unmapped raw keys. A non-India value is NOT a terminal NON_IN
  //        (spec: author location is only an IN signal) — it just ends the
  //        probe; signals (b)-(d) still run.
  const authorLocationValues: string[] = [];
  if (locIsAuthorish) {
    const v = geoValueOf(getField(raw, fieldMap.location));
    if (v) authorLocationValues.push(v);
  }
  for (const k of AUTHOR_LOCATION_KEYS) {
    const v = geoValueOf(String(raw?.[k] ?? ""));
    if (v) { authorLocationValues.push(v); break; }
  }
  if (authorLocationValues.some(isIndiaGeoValue)) return "IN_SIGNAL";
  //    (b) .in link in the url field or embedded in text. Signal text uses
  //        the ingest's OWN rescue chain (resolveRowText) — the gate must see
  //        the same text the event will carry, or rows whose content lives in
  //        an unmapped fallback column would drop as UNKNOWN_GLOBAL while
  //        their events hold India signals.
  const url = getField(raw, fieldMap.url);
  if (url && inHost(url)) return "IN_SIGNAL";
  const text = `${getField(raw, fieldMap.title)} ${resolveRowText(raw, fieldMap.text)}`;
  const embedded = text.match(URL_IN_TEXT_RE);
  if (embedded && embedded.some(inHost)) return "IN_SIGNAL";
  //    (c) Indic language code
  const lang = getField(raw, fieldMap.language).toLowerCase();
  if (lang && INDIC_LANG_CODES.has(lang)) return "IN_SIGNAL";
  //    (d) India place/state references or Indic script in the content
  if (TEXT_INDIA_RE.test(text) || INDIC_RE.test(text)) return "IN_SIGNAL";

  // 5. Global content with no India signal.
  return "UNKNOWN_GLOBAL";
};

/** Full gate decision for one row: geo class + date window (V-02). */
export const gateRow = (
  raw: any,
  fieldMap: CanonicalFieldMap,
  sourceTag: string,
  cutoffMs: number
): GateDecision => {
  const geoClass = classifyRowGeo(raw, fieldMap, sourceTag);
  const geoKept =
    geoClass === "IN_PLATFORM" || geoClass === "IN_GEO" || geoClass === "IN_SIGNAL";

  let dated = false;
  let dateMs: number | null = null;
  const dateStr = getField(raw, fieldMap.createdAtISO);
  if (dateStr) {
    const d = parseRowDate(dateStr);
    if (d) {
      dated = true;
      dateMs = d.getTime();
    }
  }

  // Undated rows are KEPT (documented V-02 decision); only a parseable date
  // older than the cutoff excludes a geo-kept row.
  const preWindow = geoKept && dated && (dateMs as number) < cutoffMs;
  return { geoClass, kept: geoKept && !preWindow, preWindow, dated, dateMs };
};
