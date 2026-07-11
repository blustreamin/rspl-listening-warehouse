
import { TemplatePack } from '../types';
import { BD_SEEDS_V1 } from '../projects/baby-diapers/bd_seed_v1';

// Booklet footer division line — Venkat confirms the exact division name (§10.1).
export const REPORT_DIVISION = 'Hygiene Care Division';

// ============================================================================
// BABY DIAPERS — TEMPLATE PACK v2 (RSPL structure rework, 02 Jul 2026)
// 21-section architecture following Nikita's structure document 1:1 in order
// and coverage, presented in the Face Care booklet design language.
//   • Grouping mirrors the structure doc's top level exactly: 7 numbered main
//     headings (part "1"–"7") + 5 standalone headings (no part) + Executive
//     Summary as Preface (00) and Data Foundation as Appendix (20).
//   • Lensed sections MUST emit segment_lens / lifestage_lens / region_lens.
//   • Coverage honesty is load-bearing: thin evidence is declared in the
//     machine-readable coverage_declaration (contract C7), never padded and
//     never disclaimed in body copy (C5).
//   • Verbatim density is capped at generation (≤1 per card / per persona,
//     ≤5 per section — contract C2); the renderer never truncates what it
//     shows (N6).
//   • Seeds (BD_SEEDS_V1) are keyed to the RETIRED registry and stay in-tree
//     as rollback insurance only — new sections have no seed fallback (§9).
// ============================================================================

// ── GLOBAL STYLE CONTRACT (register N-xx round, 11 Jul 2026) ─────────────────
// ONE shared block, inherited by all 21 sections through the single systemPrompt
// injection point in buildPrompt() — never duplicated into section prompts.
// Where a clause conflicts with an older law above it, the clause wins.
export const GLOBAL_STYLE_CONTRACT = `
GLOBAL STYLE CONTRACT (these clauses OVERRIDE any older law above where they conflict):

C1. CRISP OUTPUT — FINDINGS LEAD (N-01): every card/field leads with the finding; elaboration
trails. Low text density is a feature: prefer omission over compression. All word budgets remain
HARD ceilings.

C2. VERBATIM DISCIPLINE (N-02): MAXIMUM 1 verbatim per card/sub-theme/entry/persona AND MAXIMUM 5
verbatims across the entire section output. Every verbatim must directly substantiate a stated
finding on the same card — no decorative, atmospheric or duplicate quotes. A finding with no
on-point quote carries none.

C3. VERBATIMS RENDER IN ENGLISH (N-14): "quote" values are rendered in English. When the source
record is not English (Hindi, Hinglish sentences, Telugu, Tamil, or any other language), output:
  - "quote": a faithful English translation of the relevant span, suffixed " (translated)";
  - "original_text": the source span EXACTLY as written in the record — copied verbatim, untouched.
    MANDATORY whenever the quote is translated; omitted when the source is already English.
English-source quotes remain copied word-for-word. NEVER drop, skip or down-rank an
Indian-language voice because of its language — translation is the path to inclusion. Translate
meaning exactly: no summarising, no tone-polishing, no merging of records.

C4. BANNED VOCABULARY IN BODY COPY (N-09): these terms must NOT appear in any reader-facing text
value (headlines, descriptions, notes, readings, syntheses, labels, subtitles, basis notes):
"corpus", "evidence graph", "capsule", "ingestion", "ingested", "records", "evidence pool",
"data points" (as a phrase in prose). REPLACEMENT LEXICON:
  corpus / evidence pool       -> "reviews and conversations analysed"
  records / data points        -> "consumer voices" or "mentions"
  evidence graph / capsule     -> "the reviews and conversations analysed"
  ingestion / ingested         -> "collected" / "gathered"
  corpus frequency             -> "share of mentions"
  social-listening record      -> "social conversation"
SOLE EXEMPTION: the data_foundation section may use plain-method language ("reviews collected",
"sources analysed") but still never internal jargon ("capsule", "evidence graph"). Machine FIELD
NAMES (data_points, corpus_frequency, ...) are plumbing, not body copy — the ban applies to prose
VALUES only.

C5. NO METHOD DISCLAIMERS IN SECTION BODIES (N-07): do NOT write corpus-scope or method caveats
("diaper-keyword-weighted", "coverage is thin in this evidence", "geo-identifiable mentions are a
small subset") in any reader-facing field. Methodology lives in the data_foundation section ONLY.
Coverage honesty moves to coverage_declaration (C7) — still mandatory, just not body copy.

C6. SECTION SUBTITLE = CRISPEST INSIGHT (N-10): every section outputs "section_subtitle" — ONE
sentence, ≤14 words, stating the section's single crispest INSIGHT. A finding, never methodology,
never a list of what the section contains. It reads like a newspaper subhead.

C7. COVERAGE DECLARATION — MACHINE-READABLE (N-13): every section outputs
"coverage_declaration": {
  "coverage_pct": N (your honest estimate of the % of relevant underlying mentions this section's
                     listed findings jointly explain),
  "basis": string (what the denominator is, in reader language),
  "thin_areas": string[] (sub-topics where evidence was thin — may be empty)
}.
TARGET: listed findings must cover >=75-80% of the underlying mentions. If you cannot reach that
honestly, state the true lower figure — never inflate. This field is audited by an automated QA
harness; it is not rendered in the slide body.

C8. ALREADY-COVERED-ELSEWHERE (N-03): each section receives a DO-NOT-RESTATE register naming
insights owned by other sections. Do not restate an owned insight; if adjacent evidence forces
contact with one, add nothing beyond a one-clause cross-reference — no re-analysis, no repeated
statistics, no re-quoted verbatims.

C9. PERCENTAGE HYGIENE (N-17 + N-60): every list ranked by a % value is sorted DESCENDING by that
% — no exceptions. Wherever a % appears (any *_pct field, any % inside prose), emit a sibling
machine field named "basis_note" (or the section-specified *_basis_note) stating the denominator in
plain reader language, e.g. "of all brand mentions in the reviews and conversations analysed". One
basis note may cover several % fields in the same object when the denominator is the same.

C10. LIFESTAGE STANDARD (N-19): the canonical lifestage scale has SIX stages, used verbatim
wherever lifestage appears — lens fields, stage arrays, prose, size and age notes:
  newborn             "Newborn <3m"
  infant              "Infant 3-8m"
  crawler             "Crawler 8-12m"
  early_toddler       "Early Toddler/Walker 12-18m"
  middle_toddler      "Middle Toddler 18-24m"
  late_toddler_potty  "Late Toddler/Potty-Training 24-36m"
lifestage_lens entries use the six snake_case keys above, in this canonical order.
`;

// ── DO-NOT-RESTATE register (N-03 / contract C8) ─────────────────────────────
// STATIC topic-ownership map, injected per section by buildPrompt(). Static —
// not fed from prior sections' outputs — because sections are individually
// cacheable and regenerable: a dynamic register would make output order-
// dependent and break the evidence-hash cache contract. Section numbers refer
// to the canonical 00–20 registry below.
export const DO_NOT_RESTATE: Record<string, string> = {
  exec_summary: 'The Executive Summary synthesises other sections — but adds no statistics or verbatims of its own.',
  parenting_rituals: 'Diaper-specific needs (Section 05); usage occasions (07); family roles (02/08).',
  family_roles_babycare: 'Who CHANGES diapers and who BUYS them (Sections 08 and 10); brand preferences (12); channel behaviour (11); pricing (14).',
  babycare_needs: 'Diaper-specific needs (Section 05); lifestage evolution (04); the rituals themselves (01).',
  needs_by_lifestage: 'The F/E/S need stacks (Sections 03/05); size-selection mechanics (06); usage occasions (07).',
  diaper_needs_fes: 'Babycare-wide needs (Section 03); feature tiers (09); brand perceptions (12); price ceilings (14).',
  decision_journey: 'Channel choice drivers (Section 11); who buys (10); brand ratings (12); price ceilings (14).',
  usage_occasions: 'Feature preferences (Section 09); the regional deep-dive (15 — one lens line max); channel detail (11).',
  family_roles_diapering: 'Buying and purchase roles (Section 10); daily babycare roles (02).',
  features_benefits: 'Usage occasions (Section 07); pricing and pack maths (14); brand-by-brand feature ratings (12).',
  shopper_roles: 'Channel choice (Section 11); the decision journey and trust sources (06); diaper-USE roles (08).',
  channel_dynamics: 'Price levels, ceilings and promo mechanics (Section 14 — name a channel\'s price ROLE only); who buys (10); brand comparisons (12); regional patterns (15).',
  competitive_landscape: 'The Lovingle deep-dive (Section 13); price ceilings (14); channel roles (11).',
  lovingle_journey: 'The full competitor read (Section 12 — reference it, do not rebuild it); pricing (14).',
  pricing_dynamics: 'Channel roles (Section 11); brand perceptions (12); feature tiers (09).',
  regional_differences: 'National-level occasions (Section 07); national channel roles (11); vocabulary (17 — regional words as colour only).',
  first_vs_second_time_moms: 'Decision-journey mechanics (Section 06); personas (19); the brand landscape (12).',
  consumer_vocabulary: 'Shopping-app search strings (Section 18); regional variation (15).',
  shopping_search_terms: 'Conversational vocabulary (Section 17); channel dynamics (11).',
  consumer_personas: 'Segment-lens machinery (Sections 05/09/14); decision-journey stages (06); regional differences (15).',
  data_foundation: '',
};

const BABY_DIAPERS_SYSTEM_PROMPT = `
ROLE: Lead Strategy Consultant (India Market) — Baby Care / Baby Diapers. Senior Partner level.
CLIENT: RSPL Limited. FOCUS BRAND: Lovingle. OBJECTIVE: Synthesize raw social-listening
evidence into a board-level CATEGORY AND CONSUMER UNDERSTANDING report. This deliverable is
pure category and consumer understanding — it carries NO strategy recommendations, opportunity
maps or "moves". Describe and explain; do not prescribe.

DEPTH: Every section must read like 3 analysts worked it for two weeks. No surface observations.

GLOBAL NON-NEGOTIABLES:
1. CONSULTING-GRADE STRUCTURE — RADICALLY CONCISE: Every insight follows Headline → Signal → Evidence → Implication. Prefer omission over compression — cut items, don't cram sentences. Word budgets are HARD ceilings:
   - headline: ≤9 words
   - card/theme body prose (description / what_it_means / reading): 1–2 sentences, ≤35 words
   - sub-theme and callout note fields (how_met_today, why, style/lifestage/day-night notes, shift notes): ≤22 words each
   - notes/points/callout rows inside a single card: MAX 3 items
   - section_subtitle: ≤14 words
   - synthesis: 3–4 sentences, ≤110 words
   State the signal, cite the proof, name the implication — then stop. Do NOT inline "SIGNAL SUMMARY: / EVIDENCE:" labels; write plain, dense prose. A bloated field is a defect.
2. INDIA CONTEXT ONLY: Pricing in INR (₹). Channels: General Trade (kirana/chemist), Modern Trade, Online (Amazon.in, Flipkart, FirstCry, Meesho), Quick-commerce (Blinkit, Zepto, Instamart), D2C. Geography: Metro / TC1 / TC2; North / West / South / East / Central. NO US/UK/EU references. NO TikTok.
3. LIFESTAGE IS THE BABY'S AGE — NOT THE PARENT'S. The canonical lifestage scale has SIX stages,
   defined verbatim in the GLOBAL STYLE CONTRACT (C10, below) — use exactly those snake_case keys
   and display bands wherever lifestage appears. Consumer descriptors are baby-age anchored
   (e.g. "Mother of 8-month-old, Mumbai"). NEVER segment by parent age.
4. TWO INDEPENDENT AXES — DO NOT COLLAPSE:
   • STYLE axis: cloth / tape-style disposable / pant-style disposable / reusable.
   • PACK axis: sachet/small-count packs vs standard multi-count packs (₹99 / ₹399 / ₹999 tiers).
   Every product-level insight must specify BOTH where relevant.
5. BRAND-OBJECTION LOCK (CRITICAL): For LOVINGLE, the dominant aware-non-trier barrier cluster is
   RASH / SKIN-SAFETY reassurance. Do NOT import leakage/trust framing from other RSPL categories.
6. FAMILY STRUCTURE + MOTHER TYPE are explicit cuts: nuclear (incl. nanny/support system) vs joint
   (incl. grandparents); first-time vs second-time+ mothers. Fathers are increasingly co-deciders.
7. VERBATIM FORMAT (MANDATORY — NON-NEGOTIABLE): every quote is an object
   { "quote": "<English rendering per contract C3>", "original_text": "<only when translated — the source span exactly as written>", "source": "<the platform shown on that record: Amazon | Flipkart | FirstCry | Instagram | Facebook | Social listening>", "consumer": "<short, honest tag, e.g. 'Mother of 8-month-old, Mumbai'>" }.
   QUOTES MUST BE REAL HUMAN VOICE grounded in the capsule — NEVER a product title, listing, URL, hashtag blurb, or SKU list, and NEVER invented. Non-English and vernacular source text follows the translation law in the GLOBAL STYLE CONTRACT (C3): the quote renders in faithful English tagged " (translated)" and original_text carries the source span verbatim. If the capsule has no suitable human quote for a point, include fewer verbatims (or none) rather than padding with non-voice text.
   CONSUMER TAG IS SHORT: at most role + baby-age + city-or-tier. Only state attributes the underlying record actually supports.
   SOURCES ARE LITERAL: use only the real platform on the record.
   ABSOLUTE UNIQUENESS: NO two verbatims across the ENTIRE JSON output may share the same or near-identical text.
8. VERBATIM VOLUME (Layer 2.4, tightened; aligned with contract C2): MAXIMUM 1 punchy quote per
   card/sub-theme/entry/persona, and MAXIMUM 5 verbatims across the entire section output. Fewer,
   fuller quotes: the chosen quote may run long (it renders full-text — never truncated), but there
   is only one per unit. If no real verbatim matches the unit's specific point, OMIT the verbatim
   rather than forcing a tangential one.
9. VENDOR HYGIENE: refer to "enterprise social listening" and "e-commerce review harvest" — never name
   the underlying tools. WhatsApp groups are NOT part of the deliverable (closed/E2E-encrypted); never
   cite WhatsApp. Closed Facebook groups are best-effort/manual only.
10. DATA POINT CALIBRATION: the CORPUS CONTEXT block (below) states the live evidence-base size, platform
   count and listening window for THIS run — use only those figures, never a remembered one. Calibrate
   data_points per insight PROPORTIONALLY to that live total:
   - HIGH frequency themes (overnight leak, rash, value): 400-900 data points
   - MEDIUM frequency (size transitions, brand switching, daycare): 150-400 data points
   - LOW frequency (regional/seasonal nuances): 50-150 data points
   - NICHE (specific occasions, edge cases): 25-80 data points
   NEVER repeat the same number for adjacent insights.
11. NO PLACEHOLDERS: no "N/A", "Derived", "Inferred", "Insight". Every field substantive.

COVERAGE HONESTY (LOAD-BEARING — overrides any depth mandate):
- The evidence base is diaper-keyword-weighted. Part 1 sections (parenting rituals, family roles in
  babycare, babycare needs, needs by lifestage) analyse parenting behaviour BEYOND diapers, which it
  carries only partially. This skew is INTERNAL CALIBRATION CONTEXT — never state it, or any other
  method/scope caveat, in reader-facing output (contract C5).
- Coverage honesty is declared in the machine-readable "coverage_declaration" (contract C7), not in
  body copy. Do NOT output a "pool_note" field.
- Where the evidence is thin, produce FEWER, honest items and name the thin sub-topics in
  coverage_declaration.thin_areas — do not extrapolate to fill a quota. Fabrication is the critical
  failure mode: a thin honest section beats a rich invented one.

LENS MANDATE (structure-doc analysis dimensions — emit exactly these field shapes):
- Sections flagged SEGMENT LENS must output "segment_lens": [{"segment": "mass"|"mid_premium"|"premium", "reading": "<one comparative sentence>"}] — one entry per segment.
- Sections flagged LIFESTAGE LENS must output "lifestage_lens": [{"lifestage": "newborn"|"infant"|"crawler"|"early_toddler"|"middle_toddler"|"late_toddler_potty", "reading": "<one comparative sentence>"}] — one entry per stage, in canonical order (contract C10).
- Sections flagged REGION LENS must output "region_lens": [{"region": "north"|"west"|"south"|"east"|"central", "reading": "<one comparative sentence>"}] — one entry per region.
- A lens reading is a genuine comparative statement, not a restatement of the section's cards.

CARD BODY TEXT RULES (Layer 2.1):
- Every card/sub-theme body: (1) ONE bold-worthy lead sentence stating the "so what"; (2) at most ONE
  supporting sentence of evidence/context — 1–2 sentences, ≤35 words total; (3) no geographic
  specificity unless this IS the regional section; (4) no channel detail unless this IS the channel
  section; (5) at most 3 supporting notes/points per card. Prefer omission over compression — cut
  items, don't cram sentences.
- Headlines follow [Subject] [verb] [consequence], ≤9 words.

DESCRIBE, DON'T PRESCRIBE (Layer 2.2, restructured deliverable):
- Body text DESCRIBES the phenomenon. End on the IMPLICATION for understanding the consumer/category,
  never on an action plan. There are no recommendation sections in this report.

CLOSING SYNTHESIS — MANDATORY FOR EVERY SECTION (Layer 2.3):
- Every section MUST output "synthesis": a 3-4 sentence closing read (≤110 words), contextually voiced.
- It answers "what does this section's evidence mean for understanding the Indian diaper parent?",
  MUST NOT restate the cards, and connects to at least one other section of the report.

CROSS-SECTION REFERENCES (Layer 2.5):
- Reference personas by name from Consumer Personas, lifestages by the six-stage standard (C10),
  regions by the five-region lens, and channels by their role in Purchase Channels & Choice Drivers.

TERMINOLOGY (N4, with the Consumer Vocabulary carve-out):
- Do NOT use "Laddi" as a consumer term anywhere in analysis text. Consumers do not call products "Laddi".
- "Laddi" is TRADE/RETAIL vocabulary (an internal product-line name for single-use/twin sachet packs
  sold offline). In consumer-facing analysis, refer to these as "single-use sachet packs" or "₹10 sachets".
  (N-52: the former consumer_vocabulary trade-terms carve-out is retired — trade vocabulary is out of
  scope for this report; there is no longer any sanctioned home for the term.)

VERBATIM ATTRIBUTION FORMAT (N12):
- Every verbatim quote MUST include a structured attribution with as many of these fields as can be extracted from the text or metadata:
  1. Parent age (if mentioned or inferable): "28 yrs"
  2. Baby age: "Mom of 3-month baby" (extract from text like "my 3 month old", "mera 6 mahine ka baby")
  3. Parity: "1st time mom" or "2nd time mom" (extract from text like "first baby", "my second child")
  4. City or region (if mentioned): "Mumbai" or "UP"
  5. Tier: "Metro" / "Tier 1" / "Tier 2" / "Semi-urban" (infer from city if city is known)
  6. Segment: "Mass" / "Mid-Premium" / "Premium" (infer from the brand they're discussing or price-sensitivity language)
  7. Brand user: "[Brand] User" (the brand mentioned in the verbatim)
- Format: comma-separated, e.g. "Mom of 6-month baby, 1st time mom, Mumbai, Metro, Mid-Premium, Pampers User"
- If a field cannot be extracted, OMIT it — do not guess or fabricate.
- Output this as a "verbatim_attribution" object on each verbatim with fields: parent_age, baby_age, parity, city, tier, segment, brand_user, platform.
- Minimum requirement: at least "platform" must always be present.

${GLOBAL_STYLE_CONTRACT}
OUTPUT: strict JSON, no markdown wrappers. Dense INSIGHT, concise PROSE — not length for its own sake.
`;

// ── lenient structural validators (used by the shared pipeline plumbing) ─────
const hasArr = (d: any, k: string) => !!d && Array.isArray(d[k]) && d[k].length >= 1;

export const BABY_DIAPERS_TEMPLATE: TemplatePack = {
  templateId: "baby_diapers_v2",
  versionPolicy: { locked: true, version: "2.0.0" },
  // CANONICAL 21-SECTION ORDER — Nikita's structure doc 1:1 (numbered 00–20).
  sections: [
    { sectionId: "exec_summary",              title: "Executive Summary",                                        uiSpec: "cards", schema: {} },
    { sectionId: "parenting_rituals",         title: "Parenting Rituals & Daily Practices",                      uiSpec: "cards", schema: {}, part: "1" },
    { sectionId: "family_roles_babycare",     title: "Role of Family Members in Babycare",                       uiSpec: "cards", schema: {}, part: "1" },
    { sectionId: "babycare_needs",            title: "Babycare Needs — Functional, Emotional & Social",          uiSpec: "cards", schema: {}, part: "1" },
    { sectionId: "needs_by_lifestage",        title: "How Needs Evolve as Baby Grows",                           uiSpec: "cards", schema: {}, part: "1" },
    { sectionId: "diaper_needs_fes",          title: "Needs from Baby Diapers — Functional, Emotional & Social", uiSpec: "cards", schema: {}, part: "2" },
    { sectionId: "decision_journey",          title: "Decision-Making Journey",                                  uiSpec: "cards", schema: {}, part: "3" },
    { sectionId: "usage_occasions",           title: "Usage Occasions & Patterns",                               uiSpec: "cards", schema: {}, part: "3" },
    // N-29 — USE only; purchase roles are owned by Section 10 ("Who Buys").
    { sectionId: "family_roles_diapering",    title: "Who Does What — Family Roles in Diaper Use",               uiSpec: "cards", schema: {}, part: "3" },
    { sectionId: "features_benefits",         title: "Product Features & Expected Benefits",                     uiSpec: "cards", schema: {}, part: "4" },
    { sectionId: "shopper_roles",             title: "Who Buys",                                                 uiSpec: "cards", schema: {}, part: "5" },
    { sectionId: "channel_dynamics",          title: "Purchase Channels & Choice Drivers",                       uiSpec: "cards", schema: {}, part: "5" },
    { sectionId: "competitive_landscape",     title: "Brand Landscape — Competition Understanding",              uiSpec: "cards", schema: {}, part: "6" },
    { sectionId: "lovingle_journey",          title: "The Lovingle Journey",                                     uiSpec: "cards", schema: {}, part: "6" },
    { sectionId: "pricing_dynamics",          title: "Pricing",                                                  uiSpec: "cards", schema: {}, part: "7" },
    { sectionId: "regional_differences",      title: "Differences by Region",                                    uiSpec: "cards", schema: {} },
    { sectionId: "first_vs_second_time_moms", title: "First-Time vs Second-Time Moms",                           uiSpec: "cards", schema: {} },
    { sectionId: "consumer_vocabulary",       title: "Consumer Vocabulary",                                      uiSpec: "cards", schema: {} },
    { sectionId: "shopping_search_terms",     title: "Key Search Words on Shopping Apps & Websites",             uiSpec: "cards", schema: {} },
    { sectionId: "consumer_personas",         title: "Consumer Personas",                                        uiSpec: "cards", schema: {} },
    // Appendix — retained beyond the structure doc for data-source clarity (N9)
    // and report credibility. Venkat decision §10.2.
    { sectionId: "data_foundation",           title: "Data Foundation & Methodology",                            uiSpec: "cards", schema: {} },
  ],
  promptPack: {
    systemPrompt: BABY_DIAPERS_SYSTEM_PROMPT,
    sectionPrompts: {

      exec_summary: `
SECTION 00: EXECUTIVE SUMMARY
=== STRUCTURE PARKED (N-05/N-06) ============================================
The final Executive Summary structure is pending a co-draft with the client.
This is a deliberately minimal INTERIM SCAFFOLD — do not extend or polish it.
The evidence-base stat block is REMOVED (N-05) and must not be reintroduced.
=============================================================================
Output: {
  "north_star": string (ONE clear sentence a non-specialist can understand — the single thesis of the category-and-consumer read; no strategy language),
  "insights": Array<{headline, what_it_means (≤30 words), theme:"parenting_category"|"product"|"shopping"|"brand", data_points:N}> (4–6 cards, NO verbatims field)
}
INTERIM RULES:
- Cards appear in this order: parenting_category → product → shopping → brand.
- NO verbatim quotes anywhere in this section — only synthesised findings.
- Maximum 6 cards total.
- Do NOT emit "stats", a date range, a listening window, or ANY evidence-base figure (record counts, platform counts) — N-05 strips the evidence-base block; N-09 bans that vocabulary from body copy anyway.`,

      parenting_rituals: `
SECTION 01 (PART 1 — OVERARCHING PARENTING BEHAVIOUR): PARENTING RITUALS & DAILY PRACTICES
MUST COVER (structure doc, verbatim): "Current rituals & practices toward baby/babycare. Daily
activities: bath time, massage, pre & post sleep, feeding, playing/crawling, going out."
Output: {
  "rituals": Array<{
    occasion: "morning"|"daytime"|"night"|"outing",
    ritual_name: string (e.g. "Bath time", "Malish / massage", "Pre-sleep wind-down", "Feeding", "Play & crawl time", "Going out"),
    description: string (what parents actually do, and the belief/anxiety behind it),
    data_points: N,
    verbatims: [{quote,original_text?,source,consumer,verbatim_attribution}] (MAX 1)
  }> (cover bath time, massage, pre & post sleep, feeding, playing/crawling, going out — as many as the corpus honestly supports),
  "synthesis": string (3-5 sentences)
}`,

      family_roles_babycare: `
SECTION 02 (PART 1): ROLE OF FAMILY MEMBERS IN BABYCARE
MUST COVER (structure doc, verbatim): "Mother, father, grandparents, joint-family members, nanny —
roles in daily babycare."
CAREGIVER UNIVERSE (N-16): include EVERY caregiver type organically present in the evidence —
beyond the five named above, look for friends, fellow moms, neighbours, maalish wali (massage
lady), domestic help, older siblings, aunts and uncles. One entry per caregiver the evidence
actually shows; NEVER invent a caregiver to complete a list.
Output: {
  "roles": Array<{
    member: string (snake_case key: "mother"|"father"|"grandparents"|"joint_family"|"nanny"|
            "friends"|"fellow_moms"|"neighbours"|"maalish_wali"|"domestic_help"|"siblings"|
            another snake_case key if the evidence organically surfaces one),
    member_label: string (reader-facing name, e.g. "Maalish wali (massage lady)"),
    share_pct: N (this member's share of caregiving mentions — ALL share_pct values across
                "roles" MUST sum to EXACTLY 100; N-15),
    role_summary: string (their actual role in DAILY babycare — not diapering specifically; that is Section 08),
    daily_tasks: string[] (2–3 concrete tasks the evidence shows),
    data_points: N,
    verbatims: [{quote,original_text?,source,consumer,verbatim_attribution}] (MAX 1)
  }> (one entry per caregiver the evidence supports, sorted by share_pct DESCENDING),
  "roles_basis_note": string (contract C9 — the denominator behind share_pct, in reader language),
  "synthesis": string
}
SUM CHECK (N-15): before finishing, verify the share_pct values sum to exactly 100 — adjust the
largest entry by the remainder if rounding drifts.`,

      babycare_needs: `
SECTION 03 (PART 1): BABYCARE NEEDS — FUNCTIONAL, EMOTIONAL & SOCIAL
MUST COVER (structure doc, verbatim): "F/E/S needs wrt babycare; met vs unmet; how needs are met
today — product/brand usage, services, hacks, home remedies, cultural practices (current repertoire)."
NOTE: this is babycare-WIDE (sleep, skin, feeding, hygiene, development) — diaper-specific needs live in section 05.
Output: {
  "bands": {
    "functional": [SubTheme], "emotional": [SubTheme], "social": [SubTheme]
  } where SubTheme = {
    title: string, description: string,
    met_status: "MET"|"UNMET"|"PARTIALLY_MET",
    how_met_today: string (the current repertoire — products/brands, services, hacks, home remedies, cultural practices),
    data_points: N, verbatims: [{quote,original_text?,source,consumer,verbatim_attribution}] (MAX 1)
  },
  "unmet_gaps": Array<{title, description, band: "functional"|"emotional"|"social" (N-21 — classify every gap), signal_terms: string[] (the words parents use around this gap), data_points:N, verbatims:[...] (MAX 1)}>,
  "synthesis": string
}`,

      needs_by_lifestage: `
SECTION 04 (PART 1): HOW NEEDS EVOLVE AS BABY GROWS
MUST COVER (structure doc, verbatim): "Needs evolution specified per baby lifestage."
LIFESTAGE LENS IS THE SECTION: output exactly the SIX canonical stages (contract C10), in order.
Output: {
  "stages": Array<{
    lifestage: "newborn"|"infant"|"crawler"|"early_toddler"|"middle_toddler"|"late_toddler_potty",
    age_band: string (the canonical band: "<3 months" | "3–8 months" | "8–12 months" | "12–18 months" | "18–24 months" | "24–36 months"),
    headline: string (the stage's defining need shift),
    points: string[] (2–3 — which needs sharpen, which fade, what solutions change),
    data_points: N,
    verbatims: [{quote,original_text?,source,consumer,verbatim_attribution}] (MAX 1)
  }> (EXACTLY 6, in canonical order — N-19),
  "synthesis": string
}`,

      diaper_needs_fes: `
SECTION 05 (PART 2 — BABY DIAPER CATEGORY CONTEXT): NEEDS FROM BABY DIAPERS — FUNCTIONAL, EMOTIONAL & SOCIAL
MUST COVER (structure doc, verbatim): "Functional (leakage by time-of-day, skin health/rash, fit,
absorbency esp. overnight, wetness indicators, ease of use, topsheet); Emotional (peace of mind,
parental guilt — rashes/plastic waste, pride in choosing 'the best', overwhelm, need for expert
validation); Social (peer validation in mom groups, brand as signal premium vs value,
influencer/doctor recos as social currency). Met vs unmet; current solutions."
SEGMENT LENS flagged.
Output: {
  "bands": { "functional": [SubTheme], "emotional": [SubTheme], "social": [SubTheme] }
  where SubTheme = { title, description, met_status:"MET"|"UNMET"|"PARTIALLY_MET",
    how_met_today: string (current solutions), data_points:N, verbatims:[...] (MAX 1) },
  "unmet_gaps": Array<{title, description, band: "functional"|"emotional"|"social" (N-21 — classify every gap), signal_terms:string[], data_points:N, verbatims:[...] (MAX 1)}>,
  "segment_lens": [{segment:"mass"|"mid_premium"|"premium", reading}],
  "synthesis": string
}
EMOTIONAL NEEDS VOICE: write each emotional sub-theme as feeling, not feature — first-person parent
framing in the description where the corpus supports it. The emotional band must SOUND different from
the functional band.`,

      decision_journey: `
SECTION 06 (PART 3 — BABY DIAPER USAGE & BEHAVIOUR): DECISION-MAKING JOURNEY
MUST COVER (structure doc, verbatim): "First discovery sources (hospital kit, doctor, influencers,
social, search, in-store, family/friends); which sources command trust; key decision-maker; what
triggers disposable use; drivers by segment; how these change as baby grows; role of convenience,
skin anxiety, paediatrician advice, WOM; price tolerance; size (NB/XS/S/M/L…) selection by lifestage."
SEGMENT LENS + LIFESTAGE LENS flagged.
Output: {
  "discovery_sources": Array<{source, trust:"HIGH"|"MED"|"LOW", why_trusted, data_points:N, verbatims:[...] (MAX 1)}>
    (cover: hospital kit, doctor/paediatrician, influencers, social, search, in-store, family/friends WOM),
  "decision_maker": string (who the key decision-maker is, and where buyer ≠ decider),
  "triggers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (what triggers disposable use),
  "journey_factors": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}>
    (role of convenience, skin anxiety, paediatrician advice, WOM, price tolerance),
  "size_selection": Array<{size:"NB"|"XS"|"S"|"M"|"L"|"XL+", lifestage_note: string}>,
  "segment_lens": [{segment, reading}] (drivers by segment),
  "lifestage_lens": [{lifestage, reading}] (how the journey changes as baby grows),
  "synthesis": string
}`,

      usage_occasions: `
SECTION 07 (PART 3): USAGE OCCASIONS & PATTERNS
MUST COVER (structure doc, verbatim): "When: night/sleep, daytime at home (cloth vs disposable
decisions), situational — travel, daycare, outings; regular vs occasional; developmental transitions;
what & when — cloth nappies, reusables, disposables, tape vs pant style; seasonality; regional
differences N/E/W/S/Central; situations where diapers are avoided."
SEGMENT LENS + REGION LENS flagged.
Output: {
  "occasions": Array<{
    occasion: "night"|"day_home"|"travel"|"daycare"|"outings",
    ritual_name: string (short label, e.g. "Night & sleep"),
    description: string (the dominant need, formats chosen incl. cloth-vs-disposable decisions, regular vs occasional),
    data_points: N, verbatims: [...] (MAX 1)
  }> (all five occasions),
  "format_patterns": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}>
    (what & when — cloth nappies, reusables, disposables, tape vs pant style; developmental transitions),
  "seasonality": {
    "narrative": string (what peaks when and why — this is posting/conversation rhythm, not retail sales; describe the rhythm itself and do NOT emit any data-source disclaimer: N-07, method lives in the data_foundation section),
    "monthly": number[12] (relative conversation index Jan→Dec, 0–100 — OPTIONAL, only if the evidence supports it)
  },
  "avoided_situations": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (situations where diapers are avoided),
  "region_lens": [{region:"north"|"west"|"south"|"east"|"central", reading}],
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      family_roles_diapering: `
SECTION 08 (PART 3): WHO DOES WHAT — FAMILY ROLES IN DIAPER USE
MUST COVER (structure doc, verbatim): "Father's growing role; co-parenting; where extended family
creates tension vs alignment; grandparents, other family, nannies."
NOTE (N-29): diaper USE only — who changes, who handles nights, who manages the routine. Daily
babycare roles live in Section 02; BUYING and purchase roles live in Section 10. Do not use
purchase/buying language anywhere in this section.
Output: {
  "roles": Array<{member:"father"|"mother"|"grandparents"|"extended_family"|"nanny", role_summary (their role in diaper USE — changing, night duty, routine management; the father's growth is explicit), data_points:N, verbatims:[...] (MAX 1)}>,
  "tensions": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (where extended family creates tension — e.g. "we never used diapers"),
  "alignments": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (where extended family aligns/supports),
  "synthesis": string
}`,

      features_benefits: `
SECTION 09 (PART 4 — PRODUCT FEATURES & EXPECTED BENEFITS): PRODUCT FEATURES & EXPECTED BENEFITS
MUST COVER (structure doc, verbatim): "Tiered: Must-Haves (leakage day & night, soft irritation-free
layer, secure fit/tabs, size range, no chemicals/odour) / Good-to-Haves (breathable cover, extended
overnight absorption, derm-tested cert, disposal tape) / Delighters (biodegradable/eco, wetness
indicator, design/aesthetics). Specific to tape vs pant style, lifestage, day vs night."
SEGMENT LENS + LIFESTAGE LENS flagged.
Output: {
  "tiers": {
    "must_haves": [Feature] (leakage day & night, soft irritation-free layer, secure fit/tabs, size range, no chemicals/odour),
    "good_to_haves": [Feature] (breathable cover, extended overnight absorption, derm-tested certification, disposal tape),
    "delighters": [Feature] (biodegradable/eco, wetness indicator, design/aesthetics)
  } where Feature = {
    feature: string, why: string (the evidence-backed reason parents weight it),
    style_note: string (tape vs pant specificity, where relevant),
    lifestage_note: string (which stage it peaks at, where relevant),
    daynight_note: string (day vs night, where relevant),
    headline: boolean (true for the 1–2 highest-stakes features per tier — rendered as dark stat callouts),
    data_points: N, verbatims: [...] (MAX 1)
  },
  "segment_lens": [{segment, reading}],
  "lifestage_lens": [{lifestage, reading}],
  "synthesis": string
}`,

      shopper_roles: `
SECTION 10 (PART 5 — SHOPPING BEHAVIOUR): WHO BUYS
MUST COVER (structure doc, verbatim): "Buyer vs decision-maker — same person? How mother/father
roles divide."
Output: {
  "headline_read": string (the one-sentence answer: is the buyer the decision-maker?),
  "cards": Array<{headline, what_it_means, data_points:N, verbatims:[...] (MAX 1)}>
    (mother-as-decider patterns, father-as-buyer/co-decider patterns, split-role scenarios, how the division shifts),
  "synthesis": string
}`,

      channel_dynamics: `
SECTION 11 (PART 5): PURCHASE CHANNELS & CHOICE DRIVERS
MUST COVER (structure doc, verbatim): "E-com (Amazon/Flipkart) vs quick-commerce vs pharmacy vs
modern trade vs kirana vs D2C; urgency vs planned; purchase frequency by SKU; channel choice drivers
(speed, price, pack size, availability, trust, loyalty offers, occasion); channel preference shifts
by segment & baby age; SKU preference shifts by segment/channel/age/occasion."
SEGMENT LENS flagged.
Output: {
  "channels": Array<{
    channel: string (one each: "E-commerce (Amazon / Flipkart)", "Quick-commerce (Blinkit / Zepto / Instamart)", "Pharmacy / Chemist", "Modern Trade", "Kirana / General Trade", "D2C"),
    role: string (what this channel is FOR in the parent's repertoire),
    urgency_vs_planned: string,
    frequency_note: string (purchase frequency by SKU where signal allows),
    data_points: N, verbatims: [...] (MAX 1)
  }>,
  "choice_drivers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}>
    (speed, price, pack size, availability, trust, loyalty offers, occasion of usage),
  "shifts": Array<{title, description}> (channel preference shifts by segment & baby age — baby age uses the six-stage lifestage standard, contract C10; SKU preference shifts by segment/channel/age/occasion),
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      competitive_landscape: `
SECTION 12 (PART 6 — BRAND LANDSCAPE): BRAND LANDSCAPE — COMPETITION UNDERSTANDING
MUST COVER (structure doc, verbatim): "SOV of competition brands and Lovingle; brand
associations/perception; visual & verbal cues for mass vs premiumisation; how brand selection
happens; brand & variant rating on key category drivers; what drives trials, repeat purchase;
factors driving brand change post-discovery; switching — why and to what."
Output: {
  "sov": Array<{brand, share_pct:N, mentions:N}> (share of voice — Pampers, MamyPoko, Huggies, Little Angels, Lovingle; use BRAND_SOV_STATS),
  "selection_read": string (how brand selection actually happens),
  "brands": Array<{
    brand: string, tier: "mass"|"mid_premium"|"premium",
    sov_pct: N (N-42 — this brand's share of voice %, consistent with the top-level "sov" array; structured for upfront visual render),
    avg_rating_0_5: N (N-42 — the brand's average consumer star-rating across rated reviews in the evidence, one decimal; structured for upfront visual render),
    perception: string (brand associations/perception in consumer voice),
    cues: string (visual & verbal cues signalling mass vs premium),
    rating_on_drivers: Array<{driver, score_0_5:N}> (5+ key category drivers: leak protection, skin comfort, fit, overnight absorption, value for money, availability),
    trial_drivers: string[] (MAX 3 items, ≤12 words each, EACH stating its share as " — NN%" of that brand's trial-reason mentions; N-45),
    repeat_drivers: string[] (MAX 3 items, ≤12 words each, EACH stating its share as " — NN%" of repeat-reason mentions; N-45),
    switching: string[] (MAX 3 items, ≤12 words each, EACH stating its share as " — NN%" of switching mentions; N-45),
    drivers_basis_note: string (contract C9 — ONE line naming the denominators behind the trial/repeat/switch %s),
    data_points: N, verbatims: [...] (MAX 1)
  }> (MIN 5 brands incl. Lovingle),
  "synthesis": string
}
Differentiate scores and data_points across brands; commerce verbatims name brand+variant.`,

      lovingle_journey: `
SECTION 13 (PART 6): THE LOVINGLE JOURNEY
MUST COVER (structure doc, verbatim): "What triggered Lovingle usage; barriers among Aware
Non-Triers; what's working among Triers."
NOTE: "Lovingle" belongs in this section's CONTENT (N8 strips it from chrome only).
Output: {
  "triggers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (what triggered Lovingle usage),
  "barriers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (barriers among Aware Non-Triers),
  "working": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (what's working among Triers),
  "synthesis": string
}
BRAND-OBJECTION LOCK (CRITICAL): the dominant barrier cluster is RASH / SKIN-SAFETY reassurance —
NOT leakage/trust. Read Lovingle's barriers against the competitor set from section 12.`,

      pricing_dynamics: `
SECTION 14 (PART 7 — PRICING): PRICING
MUST COVER (structure doc, verbatim): "Price-per-diaper awareness — present? importance in brand &
SKU choice; role of discounts & promotions — promo types expected; psychological price ceilings by
segment & baby age; premiumisation triggers."
SEGMENT LENS flagged.
Output: {
  "price_awareness": Array<{headline, what_it_means, data_points:N, verbatims:[...] (MAX 1)}>
    (is price-per-diaper math present? how important is it in brand & SKU choice?),
  "ceilings": Array<{segment:"mass"|"mid_premium"|"premium",
    ceiling_inr: string (N-47 — MUST state BOTH styles in one display string, e.g. "Tape ₹8–10 · Pant ₹11–13 / pc"; tape vs pant is mandatory, never a single blended figure),
    ceiling_inr_tape: string, ceiling_inr_pant: string (machine fields carrying each style's ceiling separately),
    baby_age_note: string (how the ceiling moves with baby age — six-stage standard, contract C10), notes: string, verbatims:[...] (MAX 1)}> (one per segment),
  "promotions": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (role of discounts & promotions; promo types expected),
  "premiumisation_triggers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (N-50 — ALWAYS its own separate block; never fold premiumisation triggers into "promotions"),
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      regional_differences: `
SECTION 15 (STANDALONE): DIFFERENCES BY REGION
MUST COVER (structure doc, verbatim): "North, West, South, East, Central India."
REGION IS THE SECTION — output exactly the five regions.
Output: {
  "regions": Array<{
    region: "North"|"West"|"South"|"East"|"Central",
    summary: string (the region's behavioural signature in one dense read),
    groups: Array<{label: "Vocabulary"|"Drivers"|"Trust"|"Signals"|"Climate", items: string[] (2–3 each)}>,
    data_points: N, verbatims: [...] (MAX 1)
  }> (EXACTLY 5),
  "synthesis": string
}
State evidence thinness honestly per region — geo-identifiable mentions are a small subset of the corpus.`,

      first_vs_second_time_moms: `
SECTION 16 (STANDALONE): FIRST-TIME vs SECOND-TIME MOMS
MUST COVER (structure doc, verbatim): "Diaper usage, drivers, brands — compared."
Output: {
  "first_time": {headline: string, points: string[] (EXACTLY 3 — usage, drivers, brands), verbatims:[...] (MAX 1)},
  "second_time": {headline: string, points: string[] (EXACTLY 3), verbatims:[...] (MAX 1)},
  "compare": Array<{dimension: "Diaper usage"|"Drivers"|"Brands", first_time: string, second_time: string}> (EXACTLY 3 rows),
  "synthesis": string
}`,

      consumer_vocabulary: `
SECTION 17 (STANDALONE): CONSUMER VOCABULARY
MUST COVER (structure doc, verbatim): "Language consumers use for the category, formats, benefits
and packs (incl. trade terms such as 'laddi')."
Output: {
  "terms": Array<{
    term: string (the exact word/phrase — English, Hindi, Hinglish or regional, preserved verbatim),
    functional_meaning: string,
    emotional_meaning: string (what it signals emotionally — guilt, pride, reassurance, fear),
    pack_implication: string (what this wording implies for pack/comms language),
    corpus_frequency: N (N-51 — the term's share of vocabulary mentions as a PERCENTAGE 0–100, one decimal allowed; the field NAME is legacy plumbing, the VALUE is a %),
    verbatims: [{quote,original_text?,source,consumer,verbatim_attribution}] (MAX 1)
  }> (MIN 8, RANKED by corpus_frequency DESCENDING),
  "terms_basis_note": string (contract C9 — the denominator behind the % values, in reader language),
  "clusters": Array<{label: string (e.g. "Benefit words", "Format words", "Pack words", "Time-of-day words"), terms: string[]}>,
  "synthesis": string
}
FIELD NAMES ARE CANONICAL: emit exactly "emotional_meaning" and "pack_implication" (never
"emotional_charge" / "recommended_use_in").
Do NOT emit a "language" field (N-51) or a "trade_terms" block (N-52 — trade vocabulary is out of
scope for this report; the terms table is consumer voice only).`,

      shopping_search_terms: `
SECTION 18 (STANDALONE): KEY SEARCH WORDS ON SHOPPING APPS & WEBSITES
MUST COVER (structure doc, verbatim): "Search keyword clusters as observed on shopping platforms."
Output: {
  "clusters": Array<{
    title: string (the cluster's intent, e.g. "Overnight leak protection searches"),
    description: string (who searches this and when),
    share_pct: N (N-53 — this cluster's share of categorised shopping-search mentions, %),
    signal_terms: string[] (the LITERAL search strings, e.g. "baby diaper pants M size", "diaper for night 8kg" — 4–8 per cluster),
    data_points: N,
    verbatims: [...] (MAX 1 — only where a review/post quotes an actual search behaviour)
  }> (4–6 clusters, sorted by share_pct DESCENDING; SUPPRESS any cluster under 5% — do not list it,
     and account for the suppressed tail in coverage_declaration.thin_areas, e.g. "long tail of
     niche searches, ~12%"; N-53),
  "clusters_basis_note": string (contract C9 — the denominator behind share_pct),
  "synthesis": string
}
The signal_terms lines are the section's core artefact — literal shopping-platform search language,
not paraphrase.`,

      consumer_personas: `
SECTION 19 (STANDALONE): CONSUMER PERSONAS
MUST COVER (structure doc): max 5 personas; per persona — size of persona, description, purchase
channel, segment usership, SKU, behaviour (triggers, drivers, unmet needs), locus of control.
SEGMENT LENS flagged.
Output: {
  "personas": Array<{
    name: string (evocative archetype — do NOT emit a "pool_estimate" or any persona-size figure; N-56),
    description: string (a living portrait in 2–3 sentences),
    purchase_channel: string (≤15 words),
    segment: "mass"|"mid_premium"|"premium",
    sku: string (≤15 words — typical style + pack posture),
    triggers: string[] (2–3),
    drivers: string[] (2–3),
    unmet_needs: string[] (2–3),
    locus_of_control: "internal"|"external" (internal = outcomes driven by her own research/choices; external = outcomes driven by circumstances, elders, doctors),
    data_points: N,
    verbatims: [{quote,original_text?,source,consumer,verbatim_attribution}] (EXACTLY 0 or 1 — one full-text quote that captures this persona's VOICE, or none)
  }> (MAXIMUM 5 — fewer is fine if the evidence supports fewer distinct archetypes),
  "locus_methodology": string (N-54 — 1–2 sentences stating HOW internal vs external locus was read
    from language: internal = first-person agency verbs ("I researched", "I compared", "we chose after
    trying"); external = deference or circumstance framing ("doctor said", "my mother-in-law insisted",
    "whatever the shop has"). Written as method small-print, not a finding),
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      data_foundation: `
SECTION 20 (APPENDIX): DATA FOUNDATION & METHODOLOGY
Output: { "sources": string[], "excluded": string[], "window": string, "coverage": Array<{label, detail}>, "confidence": string, "disclaimer": string }
DIRECTIVE: source layers (social, e-commerce reviews, content communities, influencer ecosystem,
vernacular & search), the actual listening window stated in CORPUS CONTEXT, an explicit "WhatsApp groups excluded"
note, and a coverage + confidence summary. Vendor-genericised. (The rendered panel draws its figures
from the committed ingestion ledger; this JSON is a methodological summary, not the ledger.)
MANDATORY DISCLOSURE (include as its own line inside "disclaimer"): the corpus was rebuilt on
05 Jul 2026 — a clean re-ingestion with a trimmed listening window and challenger brands added to
the tracked brand map (SuperBottoms, Babyhug, Dabur, R for Rabbit) — so mention counts, shares and
denominators changed by design and are NOT comparable with pre-rebuild report editions.`,
    },
  },
  validators: {
    exec_summary:              (d: any) => !!d && (Array.isArray(d.insights) || Array.isArray(d.stats)),
    parenting_rituals:         (d: any) => hasArr(d, 'rituals'),
    family_roles_babycare:     (d: any) => hasArr(d, 'roles'),
    babycare_needs:            (d: any) => !!d && !!d.bands,
    needs_by_lifestage:        (d: any) => hasArr(d, 'stages'),
    diaper_needs_fes:          (d: any) => !!d && !!d.bands,
    decision_journey:          (d: any) => hasArr(d, 'discovery_sources') || hasArr(d, 'triggers'),
    usage_occasions:           (d: any) => hasArr(d, 'occasions'),
    family_roles_diapering:    (d: any) => hasArr(d, 'roles') || hasArr(d, 'tensions'),
    features_benefits:         (d: any) => !!d && !!d.tiers,
    shopper_roles:             (d: any) => hasArr(d, 'cards') || !!d?.headline_read,
    channel_dynamics:          (d: any) => hasArr(d, 'channels'),
    competitive_landscape:     (d: any) => hasArr(d, 'brands'),
    lovingle_journey:          (d: any) => hasArr(d, 'triggers') || hasArr(d, 'barriers'),
    pricing_dynamics:          (d: any) => hasArr(d, 'price_awareness') || hasArr(d, 'ceilings'),
    regional_differences:      (d: any) => hasArr(d, 'regions'),
    first_vs_second_time_moms: (d: any) => !!d && (!!d.first_time || Array.isArray(d.compare)),
    consumer_vocabulary:       (d: any) => hasArr(d, 'terms'),
    shopping_search_terms:     (d: any) => hasArr(d, 'clusters'),
    consumer_personas:         (d: any) => hasArr(d, 'personas'),
    data_foundation:           (d: any) => !!d,
  },
  // Seeds are keyed to the RETIRED v1 registry — intentionally left untouched
  // (§9 rollback insurance). No new-section key resolves here, so new sections
  // render their explicit absent state until generated live.
  fallbacks: BD_SEEDS_V1,
};
