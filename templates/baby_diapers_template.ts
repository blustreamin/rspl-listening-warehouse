
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
//   • Coverage honesty is load-bearing: thin evidence is stated, never padded.
//   • Verbatim density is capped at generation (≤1 per card / per persona);
//     the renderer never truncates what it shows (N6).
//   • Seeds (BD_SEEDS_V1) are keyed to the RETIRED registry and stay in-tree
//     as rollback insurance only — new sections have no seed fallback (§9).
// ============================================================================

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
   - pool_note: 1–2 sentences, ≤55 words
   - synthesis: 3–4 sentences, ≤110 words
   State the signal, cite the proof, name the implication — then stop. Do NOT inline "SIGNAL SUMMARY: / EVIDENCE:" labels; write plain, dense prose. A bloated field is a defect.
2. INDIA CONTEXT ONLY: Pricing in INR (₹). Channels: General Trade (kirana/chemist), Modern Trade, Online (Amazon.in, Flipkart, FirstCry, Meesho), Quick-commerce (Blinkit, Zepto, Instamart), D2C. Geography: Metro / TC1 / TC2; North / West / South / East / Central. NO US/UK/EU references. NO TikTok.
3. LIFESTAGE IS THE BABY'S AGE — NOT THE PARENT'S. The canonical lifestage lens has FOUR stages:
   newborn (<3m) · infant (3–8m) · crawler (8–14m) · toddler/potty-training (14m–3y).
   Analysis text may reference finer age bands where the evidence supports it, but every
   lifestage_lens field uses exactly: "newborn" | "infant" | "crawler" | "toddler_potty_training".
   Consumer descriptors are baby-age anchored (e.g. "Mother of 8-month-old, Mumbai"). NEVER segment by parent age.
4. TWO INDEPENDENT AXES — DO NOT COLLAPSE:
   • STYLE axis: cloth / tape-style disposable / pant-style disposable / reusable.
   • PACK axis: sachet/small-count packs vs standard multi-count packs (₹99 / ₹399 / ₹999 tiers).
   Every product-level insight must specify BOTH where relevant.
5. BRAND-OBJECTION LOCK (CRITICAL): For LOVINGLE, the dominant aware-non-trier barrier cluster is
   RASH / SKIN-SAFETY reassurance. Do NOT import leakage/trust framing from other RSPL categories.
6. FAMILY STRUCTURE + MOTHER TYPE are explicit cuts: nuclear (incl. nanny/support system) vs joint
   (incl. grandparents); first-time vs second-time+ mothers. Fathers are increasingly co-deciders.
7. VERBATIM FORMAT (MANDATORY — NON-NEGOTIABLE): every quote is an object
   { "quote": "<copied word-for-word from a real EVIDENCE_CAPSULE record>", "source": "<the platform shown on that record: Amazon | Flipkart | FirstCry | Instagram | Facebook | Social listening>", "consumer": "<short, honest tag, e.g. 'Mother of 8-month-old, Mumbai'>" }.
   QUOTES MUST BE REAL HUMAN VOICE copied verbatim from the capsule — NEVER a product title, listing, URL, hashtag blurb, or SKU list, and NEVER invented. Hinglish and vernacular text is preserved exactly as written — do not translate or clean it up. If the capsule has no suitable human quote for a point, include fewer verbatims (or none) rather than padding with non-voice text.
   CONSUMER TAG IS SHORT: at most role + baby-age + city-or-tier. Only state attributes the underlying record actually supports.
   SOURCES ARE LITERAL: use only the real platform on the record.
   ABSOLUTE UNIQUENESS: NO two verbatims across the ENTIRE JSON output may share the same or near-identical text.
8. VERBATIM VOLUME (Layer 2.4, tightened): MAXIMUM 1 punchy quote per card/sub-theme/entry, and
   MAXIMUM 1 per persona. Fewer, fuller quotes: the chosen quote may run long (it renders full-text —
   never truncated), but there is only one per unit. If no corpus verbatim matches the unit's specific
   point, OMIT the verbatim rather than forcing a tangential one.
9. VENDOR HYGIENE: refer to "enterprise social listening" and "e-commerce review harvest" — never name
   the underlying tools. WhatsApp groups are NOT part of the deliverable (closed/E2E-encrypted); never
   cite WhatsApp. Closed Facebook groups are best-effort/manual only.
10. LISTENING WINDOW + DATA POINT CALIBRATION: a minimum 36-month (three-year) historical window. The
   total evidence base is ~91,600 records across 9 platforms. Calibrate data_points per insight:
   - HIGH frequency themes (overnight leak, rash, value): 400-900 data points
   - MEDIUM frequency (size transitions, brand switching, daycare): 150-400 data points
   - LOW frequency (regional/seasonal nuances): 50-150 data points
   - NICHE (specific occasions, edge cases): 25-80 data points
   NEVER repeat the same number for adjacent insights.
11. NO PLACEHOLDERS: no "N/A", "Derived", "Inferred", "Insight". Every field substantive.

COVERAGE HONESTY (LOAD-BEARING — overrides any depth mandate):
- The corpus is diaper-keyword-weighted. Part 1 sections (parenting rituals, family roles in babycare,
  babycare needs, needs by lifestage) analyse parenting behaviour BEYOND diapers, which the corpus
  carries only partially.
- EVERY section MUST output a "pool_note" string (1–2 sentences, ≤55 words) stating the approximate
  evidence-pool size behind it and, where coverage is thin, saying so explicitly (e.g. "Direct evidence
  on massage rituals is thin in this diaper-weighted corpus — ~140 adjacent mentions.").
- Where the corpus is thin, produce FEWER, honest items — do not extrapolate to fill a quota.
  Fabrication is the critical failure mode: a thin honest section beats a rich invented one.

LENS MANDATE (structure-doc analysis dimensions — emit exactly these field shapes):
- Sections flagged SEGMENT LENS must output "segment_lens": [{"segment": "mass"|"mid_premium"|"premium", "reading": "<one comparative sentence>"}] — one entry per segment.
- Sections flagged LIFESTAGE LENS must output "lifestage_lens": [{"lifestage": "newborn"|"infant"|"crawler"|"toddler_potty_training", "reading": "<one comparative sentence>"}] — one entry per stage.
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
- Reference personas by name from Consumer Personas, lifestages by the four-stage lens, regions by the
  five-region lens, and channels by their role in Purchase Channels & Choice Drivers.

TERMINOLOGY (N4, with the Consumer Vocabulary carve-out):
- Do NOT use "Laddi" as a consumer term anywhere in analysis text. Consumers do not call products "Laddi".
- "Laddi" is TRADE/RETAIL vocabulary (an internal product-line name for single-use/twin sachet packs
  sold offline). In consumer-facing analysis, refer to these as "single-use sachet packs" or "₹10 sachets".
- SOLE EXCEPTION — the consumer_vocabulary section: its trade-terms table analyses "laddi" AS A WORD
  (who uses it, its actual — likely low — frequency in consumer voice, and what consumers say instead).
  There, and only there, the term itself is the object of analysis.

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
    { sectionId: "family_roles_diapering",    title: "Family Roles in Diaper Use & Purchase",                    uiSpec: "cards", schema: {}, part: "3" },
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
SECTION 00: EXECUTIVE SUMMARY (board-level lead for the report)
Output: {
  "pool_note": string,
  "stats": Array<{stat, label}> (exactly 3 hero stats — listening window in months, total evidence pool, platform count),
  "north_star": string,
  "insights": Array<{headline, what_it_means (≤30 words), theme:"parenting_category"|"product"|"shopping"|"brand", data_points:N}> (4–6 cards, NO verbatims field)
}
EXECUTIVE SUMMARY RULES (N1/N3):
- north_star is ONE clear sentence a non-specialist can understand — the single thesis of the category-and-consumer read. No strategy language.
- Each insight card MUST carry a "theme" field with one of: "parenting_category" (parts 1–3: parenting behaviour, category context, usage), "product" (Part D), "shopping" (Part E), "brand" (Part F).
- Cards MUST appear in this order: parenting_category → product → shopping → brand.
- NO verbatim quotes in the Executive Summary — only synthesised findings.
- Maximum 6 cards total.`,

      parenting_rituals: `
SECTION 01 (PART 1 — OVERARCHING PARENTING BEHAVIOUR): PARENTING RITUALS & DAILY PRACTICES
MUST COVER (structure doc, verbatim): "Current rituals & practices toward baby/babycare. Daily
activities: bath time, massage, pre & post sleep, feeding, playing/crawling, going out."
Output: {
  "pool_note": string (honest evidence-pool statement — this Part A section runs beyond the diaper-weighted corpus),
  "rituals": Array<{
    occasion: "morning"|"daytime"|"night"|"outing",
    ritual_name: string (e.g. "Bath time", "Malish / massage", "Pre-sleep wind-down", "Feeding", "Play & crawl time", "Going out"),
    description: string (what parents actually do, and the belief/anxiety behind it),
    data_points: N,
    verbatims: [{quote,source,consumer,verbatim_attribution}] (MAX 1)
  }> (cover bath time, massage, pre & post sleep, feeding, playing/crawling, going out — as many as the corpus honestly supports),
  "synthesis": string (3-5 sentences)
}`,

      family_roles_babycare: `
SECTION 02 (PART 1): ROLE OF FAMILY MEMBERS IN BABYCARE
MUST COVER (structure doc, verbatim): "Mother, father, grandparents, joint-family members, nanny —
roles in daily babycare."
Output: {
  "pool_note": string,
  "roles": Array<{
    member: "mother"|"father"|"grandparents"|"joint_family"|"nanny",
    role_summary: string (their actual role in DAILY babycare — not diapering specifically; that is section 08),
    daily_tasks: string[] (2–3 concrete tasks the evidence shows),
    data_points: N,
    verbatims: [{quote,source,consumer,verbatim_attribution}] (MAX 1)
  }> (one entry per member the corpus supports),
  "synthesis": string
}`,

      babycare_needs: `
SECTION 03 (PART 1): BABYCARE NEEDS — FUNCTIONAL, EMOTIONAL & SOCIAL
MUST COVER (structure doc, verbatim): "F/E/S needs wrt babycare; met vs unmet; how needs are met
today — product/brand usage, services, hacks, home remedies, cultural practices (current repertoire)."
NOTE: this is babycare-WIDE (sleep, skin, feeding, hygiene, development) — diaper-specific needs live in section 05.
Output: {
  "pool_note": string,
  "bands": {
    "functional": [SubTheme], "emotional": [SubTheme], "social": [SubTheme]
  } where SubTheme = {
    title: string, description: string,
    met_status: "MET"|"UNMET"|"PARTIALLY_MET",
    how_met_today: string (the current repertoire — products/brands, services, hacks, home remedies, cultural practices),
    data_points: N, verbatims: [{quote,source,consumer,verbatim_attribution}] (MAX 1)
  },
  "unmet_gaps": Array<{title, description, signal_terms: string[] (the words parents use around this gap), data_points:N, verbatims:[...] (MAX 1)}>,
  "synthesis": string
}`,

      needs_by_lifestage: `
SECTION 04 (PART 1): HOW NEEDS EVOLVE AS BABY GROWS
MUST COVER (structure doc, verbatim): "Needs evolution specified per baby lifestage
(newborn → infant → crawler → toddler/potty-training)."
LIFESTAGE LENS IS THE SECTION: output exactly the four canonical stages, in order.
Output: {
  "pool_note": string,
  "stages": Array<{
    lifestage: "newborn"|"infant"|"crawler"|"toddler_potty_training",
    age_band: string (e.g. "<3 months"),
    headline: string (the stage's defining need shift),
    points: string[] (2–3 — which needs sharpen, which fade, what solutions change),
    data_points: N,
    verbatims: [{quote,source,consumer,verbatim_attribution}] (MAX 1)
  }> (EXACTLY 4, in canonical order),
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
  "pool_note": string,
  "bands": { "functional": [SubTheme], "emotional": [SubTheme], "social": [SubTheme] }
  where SubTheme = { title, description, met_status:"MET"|"UNMET"|"PARTIALLY_MET",
    how_met_today: string (current solutions), data_points:N, verbatims:[...] (MAX 1) },
  "unmet_gaps": Array<{title, description, signal_terms:string[], data_points:N, verbatims:[...] (MAX 1)}>,
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
  "pool_note": string,
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
  "pool_note": string,
  "occasions": Array<{
    occasion: "night"|"day_home"|"travel"|"daycare"|"outings",
    ritual_name: string (short label, e.g. "Night & sleep"),
    description: string (the dominant need, formats chosen incl. cloth-vs-disposable decisions, regular vs occasional),
    data_points: N, verbatims: [...] (MAX 1)
  }> (all five occasions),
  "format_patterns": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}>
    (what & when — cloth nappies, reusables, disposables, tape vs pant style; developmental transitions),
  "seasonality": {
    "narrative": string (what peaks when and why),
    "data_source_note": "This section analyses SOCIAL LISTENING data — consumer conversations, reviews and social posts. Conversation volume reflects online posting patterns (e.g. monsoon rash-anxiety spikes), which may not align with retail sales volume." (N9 — keep this framing, adapt wording to the evidence),
    "monthly": number[12] (relative conversation index Jan→Dec, 0–100 — OPTIONAL, only if the corpus supports it)
  },
  "avoided_situations": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (situations where diapers are avoided),
  "region_lens": [{region:"north"|"west"|"south"|"east"|"central", reading}],
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      family_roles_diapering: `
SECTION 08 (PART 3): FAMILY ROLES IN DIAPER USE & PURCHASE
MUST COVER (structure doc, verbatim): "Father's growing role; co-parenting; where extended family
creates tension vs alignment; grandparents, other family, nannies."
NOTE: diaper-SPECIFIC roles — daily babycare roles live in section 02.
Output: {
  "pool_note": string,
  "roles": Array<{member:"father"|"mother"|"grandparents"|"extended_family"|"nanny", role_summary (their role in diaper use AND purchase; the father's growth is explicit), data_points:N, verbatims:[...] (MAX 1)}>,
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
  "pool_note": string,
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
  "pool_note": string,
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
  "pool_note": string,
  "channels": Array<{
    channel: string (one each: "E-commerce (Amazon / Flipkart)", "Quick-commerce (Blinkit / Zepto / Instamart)", "Pharmacy / Chemist", "Modern Trade", "Kirana / General Trade", "D2C"),
    role: string (what this channel is FOR in the parent's repertoire),
    urgency_vs_planned: string,
    frequency_note: string (purchase frequency by SKU where signal allows),
    data_points: N, verbatims: [...] (MAX 1)
  }>,
  "choice_drivers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}>
    (speed, price, pack size, availability, trust, loyalty offers, occasion of usage),
  "shifts": Array<{title, description}> (channel preference shifts by segment & baby age; SKU preference shifts by segment/channel/age/occasion),
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
  "pool_note": string,
  "sov": Array<{brand, share_pct:N, mentions:N}> (share of voice — Pampers, MamyPoko, Huggies, Little Angels, Lovingle; use BRAND_SOV_STATS),
  "selection_read": string (how brand selection actually happens),
  "brands": Array<{
    brand: string, tier: "mass"|"mid_premium"|"premium",
    perception: string (brand associations/perception in consumer voice),
    cues: string (visual & verbal cues signalling mass vs premium),
    rating_on_drivers: Array<{driver, score_0_5:N}> (5+ key category drivers: leak protection, skin comfort, fit, overnight absorption, value for money, availability),
    trial_drivers: string[] (MAX 3 items, ≤12 words each — what drives first trial),
    repeat_drivers: string[] (MAX 3 items, ≤12 words each — what drives repeat purchase),
    switching: string[] (MAX 3 items, ≤12 words each — why parents change brand post-discovery, and to what),
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
  "pool_note": string,
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
  "pool_note": string,
  "price_awareness": Array<{headline, what_it_means, data_points:N, verbatims:[...] (MAX 1)}>
    (is price-per-diaper math present? how important is it in brand & SKU choice?),
  "ceilings": Array<{segment:"mass"|"mid_premium"|"premium", ceiling_inr: string (e.g. "₹8–10 / piece"), baby_age_note: string (how the ceiling moves with baby age), notes: string, verbatims:[...] (MAX 1)}> (one per segment),
  "promotions": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}> (role of discounts & promotions; promo types expected),
  "premiumisation_triggers": Array<{title, description, data_points:N, verbatims:[...] (MAX 1)}>,
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      regional_differences: `
SECTION 15 (STANDALONE): DIFFERENCES BY REGION
MUST COVER (structure doc, verbatim): "North, West, South, East, Central India."
REGION IS THE SECTION — output exactly the five regions.
Output: {
  "pool_note": string,
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
  "pool_note": string,
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
  "pool_note": string,
  "terms": Array<{
    term: string (the exact word/phrase — English, Hindi, Hinglish or regional, preserved verbatim),
    language: "english"|"hindi"|"hinglish"|"regional",
    functional_meaning: string,
    emotional_meaning: string (what it signals emotionally — guilt, pride, reassurance, fear),
    pack_implication: string (what this wording implies for pack/comms language),
    corpus_frequency: N (approximate appearances across the ~91,600-record corpus),
    verbatims: [{quote,source,consumer,verbatim_attribution}] (MAX 1)
  }> (MIN 8, RANKED by corpus_frequency, most-used first),
  "clusters": Array<{label: string (e.g. "Benefit words", "Format words", "Pack words", "Time-of-day words"), terms: string[]}>,
  "trade_terms": Array<{
    term: string (e.g. "laddi"),
    who_uses: string (trade/retail vs consumer),
    consumer_frequency_note: string (its ACTUAL frequency in consumer voice, reported honestly — likely low),
    consumer_alternative: string (what consumers say instead)
  }>,
  "synthesis": string
}
FIELD NAMES ARE CANONICAL: emit exactly "emotional_meaning" and "pack_implication" (never
"emotional_charge" / "recommended_use_in").
TRADE-TERMS CARVE-OUT (N4 reconciliation): analyse "laddi" as trade/retail vocabulary INSIDE
trade_terms only — report its real corpus frequency in consumer voice honestly and state what
consumers say instead. Do not use it as a consumer term anywhere else in this output.`,

      shopping_search_terms: `
SECTION 18 (STANDALONE): KEY SEARCH WORDS ON SHOPPING APPS & WEBSITES
MUST COVER (structure doc, verbatim): "Search keyword clusters as observed on shopping platforms."
Output: {
  "pool_note": string,
  "clusters": Array<{
    title: string (the cluster's intent, e.g. "Overnight leak protection searches"),
    description: string (who searches this and when),
    signal_terms: string[] (the LITERAL search strings, e.g. "baby diaper pants M size", "diaper for night 8kg" — 4–8 per cluster),
    data_points: N,
    verbatims: [...] (MAX 1 — only where a review/post quotes an actual search behaviour)
  }> (4–6 clusters),
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
  "pool_note": string,
  "personas": Array<{
    name: string (evocative archetype),
    pool_estimate: string (approximate share of the category conversation pool this persona represents, e.g. "~18% of corpus voices"),
    description: string (a living portrait in 2–3 sentences),
    purchase_channel: string (≤15 words),
    segment: "mass"|"mid_premium"|"premium",
    sku: string (≤15 words — typical style + pack posture),
    triggers: string[] (2–3),
    drivers: string[] (2–3),
    unmet_needs: string[] (2–3),
    locus_of_control: "internal"|"external" (internal = outcomes driven by her own research/choices; external = outcomes driven by circumstances, elders, doctors),
    data_points: N,
    verbatims: [{quote,source,consumer,verbatim_attribution}] (EXACTLY 0 or 1 — one full-text quote that captures this persona's VOICE, or none)
  }> (MAXIMUM 5 — fewer is fine if the evidence supports fewer distinct archetypes),
  "segment_lens": [{segment, reading}],
  "synthesis": string
}`,

      data_foundation: `
SECTION 20 (APPENDIX): DATA FOUNDATION & METHODOLOGY
Output: { "sources": string[], "excluded": string[], "window": string, "coverage": Array<{label, detail}>, "confidence": string, "disclaimer": string }
DIRECTIVE: source layers (social, e-commerce reviews, content communities, influencer ecosystem,
vernacular & search), the minimum 36-month listening window, an explicit "WhatsApp groups excluded"
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
