
import { TemplatePack } from '../types';
import { BD_SEEDS_V1 } from '../projects/baby-diapers/bd_seed_v1';

// ============================================================================
// BABY DIAPERS (LOVINGLE) — TEMPLATE PACK
// 12 sections mapping the RSPL Lovingle Social Listening & Cultural
// Intelligence brief. Encodes the locked principles:
//   • Two independent axes (style ≠ pack), never collapsed.
//   • Lifestage anchored to the baby's age, not the parent's.
//   • Family structure + mother type as explicit cuts.
//   • Brand-objection lock: Lovingle = rash / skin-safety (never leakage/trust).
//   • Vendor names genericised; WhatsApp explicitly excluded.
//   • Minimum 36-month listening window.
// ============================================================================

const BABY_DIAPERS_SYSTEM_PROMPT = `
ROLE: Lead Strategy Consultant (India Market) — Baby Care / Baby Diapers. Senior Partner level.
CLIENT: RSPL Limited. FOCUS BRAND: Lovingle. OBJECTIVE: Synthesize raw social-listening
evidence into a board-level cultural & behavioural intelligence report (McKinsey/BCG depth)
that feeds RSPL's PRICE–PACK ARCHITECTURE decision.

DEPTH: Every section must read like 3 analysts worked it for two weeks. No surface observations.

GLOBAL NON-NEGOTIABLES:
1. CONSULTING-GRADE STRUCTURE: Every insight follows Headline → Signal → Evidence (min 2 verbatims) → Strategic Implication.
2. INDIA CONTEXT ONLY: Pricing in INR (₹). Channels: General Trade (kirana/chemist), Modern Trade, Online (Amazon.in, Flipkart, FirstCry, Meesho, Blinkit, Zepto). Geography: Metro / TC1 / TC2, North/South/East/West/Central. NO US/UK/EU references. NO TikTok.
3. LIFESTAGE IS THE BABY'S AGE — NOT THE PARENT'S. Use these stages only:
   Expecting (3rd trimester) · Newborn (<3m) · 3–6m · 7–11m · 1–2y · 2–3y.
   Consumer descriptors are baby-age anchored, e.g. "31F, First-time mother of 8-month-old, Mumbai",
   "28F, Mother of 2 (3m + 4y), Tier 2 Kanpur". NEVER segment by parent age.
4. TWO INDEPENDENT AXES — DO NOT COLLAPSE:
   • STYLE axis: cloth / tape-style disposable / pant-style disposable / reusable.
   • PACK axis: laddi (single, twin) vs non-laddi (₹99 / ₹399 / ₹999).
   Every product-level insight must specify BOTH where relevant. A "non-laddi pant-style night" finding
   must carry style=pant AND pack=non_laddi — never just "non-laddi".
5. BRAND-OBJECTION LOCK (CRITICAL): For LOVINGLE, the dominant aware-non-trier barrier cluster is
   RASH / SKIN-SAFETY reassurance. Do NOT import leakage/trust framing from other RSPL categories.
   (Lovingle = rash/safety. Pro-ease = leakage/trust. NEVER swap.)
6. FAMILY STRUCTURE + MOTHER TYPE are explicit cuts: nuclear (incl. nanny/support system) vs joint
   (incl. grandparents); first-time vs second-time+ mothers. Fathers are increasingly co-deciders.
7. VERBATIM FORMAT (MANDATORY): every quote is an object
   { "quote": "...", "source": "Amazon.in · MamyPoko Extra Absorb | Flipkart · ... | FirstCry · Lovingle Pant L | Instagram | YouTube | Reddit | Quora | BabyChakra", "consumer": "[Age][Gender], [role + baby age], [city/tier]" }.
   For Amazon/Flipkart/FirstCry quotes the source MUST include the brand + variant being reviewed.
   No two verbatims across the whole output may share the same text. Min 2 verbatims per sub-insight.
8. VENDOR HYGIENE: refer to "enterprise social listening" and "e-commerce review harvest" — never name
   the underlying tools. WhatsApp groups are NOT part of the deliverable (closed/E2E-encrypted); never
   cite WhatsApp. Closed Facebook groups are best-effort/manual only.
9. LISTENING WINDOW: a minimum 36-month (three-year) historical window — enough to observe a baby's full
   diaper journey end-to-end. Calibrate data_points to the actual ingested evidence pool; differentiate
   counts across insights (never repeat the same number for adjacent insights; never below 25).
10. NO PLACEHOLDERS: no "N/A", "Derived", "Inferred", "Insight". Every field substantive.

OUTPUT: strict JSON, no markdown wrappers, maximum density.
`;

const validateCards = (d: any) => !!d && Array.isArray(d.cards) && d.cards.length >= 1;
const validateJourney = (d: any) => !!d && Array.isArray(d.lanes) && d.lanes.length >= 3;
const validateStyles = (d: any) => !!d && Array.isArray(d.styles) && d.styles.length >= 2;
const validatePack = (d: any) => !!d && (Array.isArray(d.laddi) || Array.isArray(d.non_laddi));
const validateNeeds = (d: any) => !!d && (Array.isArray(d.functional) || Array.isArray(d.emotional));
const validateGap = (d: any) => !!d && (d.current_challenges || d.need_gap);
const validateLovingle = (d: any) => !!d && (Array.isArray(d.consideration_barriers) || Array.isArray(d.spontaneous_awareness));
const validateBrands = (d: any) => !!d && Array.isArray(d.brands) && d.brands.length >= 2;

export const BABY_DIAPERS_TEMPLATE: TemplatePack = {
  templateId: "baby_diapers_v1",
  versionPolicy: { locked: true, version: "1.0.0" },
  // CANONICAL 20-SECTION ORDER (F3 Gate 3). ★ = new in Gate 3 (indicative seed).
  sections: [
    { sectionId: "exec_summary",            title: "Executive Summary",                                   uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "category_context",        title: "Category Context & Cultural Trends",                 uiSpec: "cards",        schema: {} },
    { sectionId: "seasonality",             title: "Seasonality & Demand Rhythm",                         uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "target_group",            title: "Target Group & Segments",                             uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "babys_world_journey",     title: "The Baby's World — Needs Across the Journey",         uiSpec: "baby-journey", schema: {} },
    { sectionId: "needs_triggers_pains",    title: "Needs, Triggers & Pain Points",                       uiSpec: "needs",        schema: {} },
    { sectionId: "behaviour_usage",         title: "Behaviour & Usage Mapping",                           uiSpec: "cards",        schema: {} },
    { sectionId: "diaper_styles",           title: "Diaper Styles & Format Interaction",                  uiSpec: "style-matrix", schema: {} },
    { sectionId: "pack_architecture",       title: "Pack Architecture — Laddi vs Non-Laddi",             uiSpec: "pack-axis",    schema: {} },
    { sectionId: "channel_retail",          title: "Channel & Retail Architecture",                       uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "geography_regional",      title: "Geography & Regional Patterns",                       uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "decision_influencers",    title: "Decision-Making, Buyer-vs-Decider & Influencer Roles", uiSpec: "cards",      schema: {} },
    { sectionId: "influencer_community",    title: "Influencer & Community Ecosystem",                    uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "attribute_drivers",       title: "Product Attribute Drivers",                           uiSpec: "attributes",   schema: {} },
    { sectionId: "price_pack_signals",      title: "Price–Pack & Premiumisation Signals",                 uiSpec: "price-pack",   schema: {} },
    { sectionId: "brand_landscape",         title: "Competitive Brand Landscape",                         uiSpec: "baby-brand",   schema: {} },
    { sectionId: "lovingle_diagnostic",     title: "Lovingle Brand Diagnostic",                           uiSpec: "lovingle",     schema: {} },
    { sectionId: "gap_analysis",            title: "Gap Analysis: Challenges & Need Gaps",                uiSpec: "baby-gap",     schema: {} },
    { sectionId: "whitespace_recommendations", title: "White Space & Recommendations",                    uiSpec: "cards",        schema: {} }, // ★
    { sectionId: "methodology_evidence",    title: "Methodology & Evidence Base",                         uiSpec: "cards",        schema: {} }, // ★
  ],
  promptPack: {
    systemPrompt: BABY_DIAPERS_SYSTEM_PROMPT,
    sectionPrompts: {

      category_context: `
SECTION: CATEGORY CONTEXT & CULTURAL TRENDS (INDIA, BABY DIAPERS)
Output: { "cards": Array<{headline, what_it_means, data_points:N, confidence:"HIGH"|"MED", verbatims:[{quote,source,consumer}]}> } (min 6 cards)
DIRECTIVE — cover three layers:
1. Macro shift: the category's move from PENETRATION-and-awareness to CHOICE-DIFFERENTIATION (brand/style/pack/price/channel). Premiumisation in metro/online vs value-seeking in TC1/TC2.
2. Cultural/behavioural: seasonality (monsoon rash, summer, festive/travel), the role of paediatricians, mommy-influencers and peer communities in setting "good parenting" norms (hygiene, convenience).
3. Structural complexity: how a wide spectrum of brands, formats, packs and price points co-exist in the same household, sometimes the same week.
Each card = strategic headline + min 2 baby-age-anchored verbatims.`,

      babys_world_journey: `
SECTION: THE BABY'S WORLD — NEEDS ACROSS THE JOURNEY (the spine of the study)
Output: {
  "lanes": Array<{ lifestage, age_band, size_signal, headline, needs:string[], mindset, dominant_style, switch_triggers:string[], verbatims:[{quote,source,consumer}] }>,
  "spine_summary": string[]
}
DIRECTIVE: produce EXACTLY 6 lanes in order — expecting_3rd_tri, newborn_lt_3m, 3_to_6m, 7_to_11m, 1_to_2y, 2_to_3y.
For each lane, read how the category NEED and the SOLUTION that meets it change, and the parent's mindset:
- Expecting (3rd tri): research, anticipation, first brand shortlisting, the newborn kit.
- Newborn (<3m): on mother's milk/formula; frequent changes, delicate skin, fit anxiety.
- 3–6m: routines settle; night-sleep emerges as a distinct need.
- 7–11m: starting solids changes stool; crawling begins; tape→pant pressure rises.
- 1–2y: walking toddler; pant-style relevance peaks; daycare; child resists changes.
- 2–3y: pre-school; potty training; daytime vs night-time divergence.
'dominant_style' from {cloth, tape_disposable, pant_disposable, reusable}. 'switch_triggers' = what moves the parent to the NEXT stage/style/brand. spine_summary = 3 cross-cutting truths about what actually moves parents (esp. the tape→pant handoff and the night-sleep / daycare triggers).`,

      diaper_styles: `
SECTION: DIAPER STYLES & FORMAT INTERACTION (the STYLE axis — distinct from pack)
Output: {
  "styles": Array<{ style, typical_occasion, lifestage_skew, key_challenge, switch_triggers:string[], functional_notes:string[], emotional_notes:string[], verbatims:[{quote,source,consumer}] }>,
  "interaction_matrix": { columns:string[], rows:Array<{label, cells:string[]}> },
  "interaction_notes": string[]
}
DIRECTIVE: one entry per style — cloth, tape_disposable, pant_disposable, reusable. For each: the occasion it owns, its lifestage skew, the key challenge parents cite (cloth=laundry; tape=fit on wriggler/tape redness; pant=cost per use/removal when soiled; reusable=drying time/hygiene anxiety/upfront cost), and the triggers to switch FROM it.
interaction_matrix columns = the 4 styles; rows = "Owns occasion", "Lifestage skew", "Key challenge", "Switch trigger".
interaction_notes: how the SAME household mixes styles by occasion (cloth home + disposable outings; tape newborn → pant mobile). Style switching is driven by mobility/occasion, NOT brand dissatisfaction. Do NOT mention pack/price here — that is the next section.`,

      pack_architecture: `
SECTION: PACK ARCHITECTURE — LADDI vs NON-LADDI (the PACK axis — distinct from style)
Output: {
  "laddi": Array<{ pack, who_buys, occasion, channel_context, role_in_portfolio, verbatims:[{quote,source,consumer}] }>,
  "non_laddi": Array<{ pack, who_buys, occasion, channel_context, role_in_portfolio, verbatims:[{quote,source,consumer}] }>,
  "ladder_dynamics": string[]
}
DIRECTIVE: 'pack' values — laddi: laddi_single, laddi_twin; non_laddi: non_laddi_99, non_laddi_399, non_laddi_999.
LADDI: small-count, low-ticket, impulse/availability-led, kirana/general-trade. Functions as trial + top-up.
NON-LADDI (₹99/₹399/₹999+): larger counts, planned purchase, higher ticket, modern-trade/online-led, the premiumisation engine.
ladder_dynamics: what moves a household UP (planned purchase, online access, per-piece value at larger counts) and DOWN (cash flow, emergencies, kirana convenience) the price-and-count ladder — and how laddi/non-laddi co-exist within one household across the month. Pack architecture is an OCCASION question, not a loyalty question. This is a primary input to RSPL's price–pack design.`,

      behaviour_usage: `
SECTION: BEHAVIOUR & USAGE MAPPING
Output: { "occasions": Array<{headline, what_it_means, data_points:N, verbatims:[{quote,source,consumer}]}>, "usage_notes": string[] } (min 6 occasions)
DIRECTIVE: map usage by occasion — overnight/sleep, daytime at home, travel, daycare, outings, monsoon/rash season. For each: the dominant need, the styles/packs chosen, and the moments where disposables are avoided (cloth chosen). Note purchase frequency by SKU where signal allows. Overnight is the highest-stakes occasion and the strongest premiumisation trigger.`,

      needs_triggers_pains: `
SECTION: NEEDS, TRIGGERS & PAIN POINTS (three need layers)
Output: { "functional": [InsightCard], "emotional": [InsightCard], "social": [InsightCard] } where InsightCard = {headline, what_it_means, data_points:N, verbatims:[{quote,source,consumer}]}. Min 3 per layer.
FUNCTIONAL: leakage protection by time of day, skin health/rash, fit across sizes, overnight absorbency, wetness indicators, ease of use, topsheet.
EMOTIONAL: peace of mind on baby safety, parental guilt (rashes, plastic waste), pride in "choosing the best", overwhelm at brand choice, need for expert validation.
SOCIAL: peer validation in mom groups, brand as social signal (premium vs value), influencer/doctor recommendation as social currency.
Decode the exact words parents use for benefits ("soft", "dry", "rash-free", "leak-proof", "overnight") and what they mean emotionally + functionally — the wording that should appear on pack and in comms.`,

      decision_influencers: `
SECTION: DECISION-MAKING, BUYER-vs-DECIDER & INFLUENCER ROLES
Output: { "buyer_vs_decider": [InsightCard], "support_system_roles": [InsightCard], "discovery_hierarchy": [InsightCard] }, InsightCard = {headline, what_it_means, data_points:N, verbatims:[{quote,source,consumer}]}.
buyer_vs_decider: who decides the brand vs who executes the purchase; the rising role of fathers/co-parenting.
support_system_roles: nanny in nuclear families vs grandparents in joint families — how each shapes choice and cost.
discovery_hierarchy: hospital kit → paediatrician → influencer → search → in-store → family; trust-led vs aspiration-led influence by platform.`,

      attribute_drivers: `
SECTION: PRODUCT ATTRIBUTE DRIVERS
Output: { "drivers": Array<{ attribute, tier:"must_have"|"good_to_have"|"delighter", importance:"HIGH"|"MED"|"LOW", insight, mapped_lifestage, mapped_style, verbatims:[{quote,source,consumer}] }> } (min 7)
DIRECTIVE: classify each attribute by tier and map it to lifestage/style/occasion + emotional payoff:
MUST-HAVE: leakage protection, soft/irritation-free inner layer, secure fit & adjustable tabs, size options, no harsh chemicals/odour.
GOOD-TO-HAVE: breathable cover, extended overnight absorption, dermatological certification, disposable tape.
DELIGHTER: biodegradable/eco materials, wetness/change indicator, design.`,

      price_pack_signals: `
SECTION: PRICE–PACK & PREMIUMISATION SIGNALS (the explicit price–pack architecture input)
Output: {
  "price_awareness": [InsightCard],
  "price_ceilings": Array<{ sec:"A"|"B"|"C", ceiling_inr, notes }>,
  "premiumisation_triggers": [InsightCard],
  "promo_response": [InsightCard],
  "pack_vs_unit_tradeoff": [InsightCard]
} where InsightCard = {headline, what_it_means, data_points:N, verbatims:[{quote,source,consumer}]}.
DIRECTIVE: read straight from how parents talk about money, counts and value across styles and packs —
price-per-diaper awareness, psychological price ceilings by SEC (A/B/C), premiumisation triggers (what justifies a step up — overnight, skin-safety), promotional responsiveness (subscribe-and-save, festive bulk), and the pack-size-vs-unit-price trade-off. This section directly feeds RSPL's price–pack design.`,

      gap_analysis: `
SECTION: GAP ANALYSIS (BABY DIAPERS, INDIA)
Output: {
  "current_challenges": { heading, bullets:Array<{claim, explanation, consumer_evidence:[{quote,source,consumer}], severity:"HIGH"|"MED"|"LOW", data_points:N, impacted_lifestages:string[]}> },
  "resolved_challenges": { heading, bullets:[...] },
  "unresolved_challenges": { heading, bullets:[...] },
  "need_gap": { heading, need_statements:Array<{need, why_now, who, consumer_evidence:[{quote,source,consumer}], priority:"P0"|"P1"|"P2"}> }
}
DIRECTIVE: current = persistent pains (overnight leakage, humid-climate rash, size-transition gaps, decision overwhelm). resolved = what the category has solved (e.g. daytime convenience via pant-style). unresolved = what persists (affordable all-night dryness, genuinely breathable rash-free in humidity). need_gap = white space Lovingle could own. Min 4 current, min 2 unresolved, min 2 need statements.`,

      lovingle_diagnostic: `
SECTION: LOVINGLE BRAND DIAGNOSTIC
Output: {
  "spontaneous_awareness": [InsightCard],
  "consideration_drivers": [InsightCard],
  "consideration_barriers": [InsightCard],
  "aware_non_trier": [InsightCard],
  "trier_working": [InsightCard],
  "switch_stories": Array<{ direction:"to_lovingle"|"from_lovingle", from_brand, to_brand, trigger, verbatims:[{quote,source,consumer}] }>
} where InsightCard = {headline, what_it_means, data_points:N, verbatims:[{quote,source,consumer}]}.
DIRECTIVE: a focused read on Lovingle — spontaneous awareness & associations; consideration drivers (price, kirana availability) and barriers; what holds back aware non-triers; what is working among triers; switch stories to and from Lovingle.
BRAND-OBJECTION LOCK (CRITICAL): the DOMINANT consideration_barriers / aware_non_trier cluster for Lovingle is RASH / SKIN-SAFETY reassurance — NOT leakage/trust. Do not import Pro-ease's leakage/trust framing. Read Lovingle against the competitor brand drivers so its position is understood relative to the set.`,

      brand_landscape: `
SECTION: COMPETITIVE BRAND LANDSCAPE (BABY DIAPERS, INDIA)
Output: { "market_structure": string[] (min 5), "brands": Array<{ brand, tier:"mass"|"mid_premium"|"premium", share_of_voice:{share_pct:N}, overall_sentiment:"POS"|"MIX"|"NEG", positioning_summary, attribute_scale:Array<{attribute, score_0_5:N}>, strengths:string[], weaknesses:string[], data_points:N, verbatims:[{quote,source,consumer}] }> }
DIRECTIVE: cover the competitive set from the brief mapped to tier:
- Mass: Pampers Happy Skin/Happy Sleep · MamyPoko Standard · MamyPoko All Night Absorb
- Mid-premium: MamyPoko Extra Absorb · Pampers All-Round Protection/Complete Comfort
- Premium: Pampers Premium Care
- Also tracked: Huggies · Little Angels (across variants/pack sizes)
- Focus: Lovingle (and its sub-brands, across laddi and non-laddi)
attribute_scale (0–5): leak protection, skin comfort, overnight, value, availability. Source priority: Amazon.in + Flipkart + FirstCry verified reviews; brand+variant in every commerce verbatim source. Differentiate scores and data_points across brands.`,

      // ── F3 GATE 3: NEW SECTIONS (live-gen prompts; indicative seed until corpus-wired) ──
      exec_summary: `
SECTION: EXECUTIVE SUMMARY (board-level lead/cover for the Lovingle report)
Output: { "stats": Array<{stat, label}> (exactly 3 hero stats), "north_star": string, "insights": Array<{headline, what_it_means, verbatims:[{quote,source,consumer}]}> (5–7), "moves": Array<{n, title, rationale}> (3–4) }
DIRECTIVE: lead with the PRICE–PACK / PREMIUMISATION headline (the commercial payoff). Three hero stats quantify the opportunity (e.g. listening window, evidence pool, premiumisation headroom). Each insight is a cross-report truth that ladders to a recommendation. north_star = the single strategic thesis. moves = the decision-ready north-star moves.`,

      seasonality: `
SECTION: SEASONALITY & DEMAND RHYTHM (India, baby diapers)
Output: { "monthly": number[12] (relative demand index Jan→Dec, 0–100), "spikes": Array<{month, label, verbatim:{quote,source,consumer}}> (3), "occasions": Array<{headline, what_it_means, data_points:N, verbatims:[{quote,source,consumer}]}> (3) }
DIRECTIVE: three spikes — monsoon rash-anxiety, summer heat, festive-&-travel stock-up. For each: the mechanism and which packs/triggers peak when. Tie demand rhythm to pack architecture (festive→non-laddi bulk; monsoon→breathable premium trial).`,

      target_group: `
SECTION: TARGET GROUP & SEGMENTS
Output: { "segments": Array<{segment, definition, behaviours:string[] (2), verbatims:[{quote,source,consumer}]}> (3) }
DIRECTIVE: three segments — parents of 0–3y (baby-age anchored, parent-age-agnostic), third-trimester expecting mothers, family-structure cuts (nuclear+nanny vs joint+grandparents). Each: a crisp definition + 2 behaviour notes + an indicative verbatim.`,

      channel_retail: `
SECTION: CHANNEL & RETAIL ARCHITECTURE
Output: { "nodes": Array<{node, share, maps_to_pack, note, verbatims:[{quote,source,consumer}]}> (GT/kirana, Modern Trade, Online), "flow_notes": string[] }
DIRECTIVE: GT/kirana → MT → Online with indicative share and the pack architecture each carries (Laddi→GT; Non-Laddi→MT/online), premiumisation flowing rightward. Ladders directly to the pack_architecture section.`,

      geography_regional: `
SECTION: GEOGRAPHY & REGIONAL PATTERNS
Output: { "regions": Array<{name, intensity:0–100, note, verbatims:[{quote,source,consumer}]}> (metro, tier_2_3, + 3–4 regional callouts), "summary": string[] }
DIRECTIVE: metro vs Tier 2/3 premiumisation intensity + North/South/East/West behavioural & vernacular differences (e.g. humid South = breathability; festive North = bulk).`,

      influencer_community: `
SECTION: INFLUENCER & COMMUNITY ECOSYSTEM
Output: { "center": string, "nodes": Array<{name, role, weight:0–100, verbatim:{quote,source,consumer}}> (paediatricians, mommy-influencers, mothers'-group communities [UNBRANDED], review communities), "excluded": string[], "notes": string[] }
DIRECTIVE: parent at centre; each node carries an influence-weight + verbatim. WhatsApp groups are EXPLICITLY EXCLUDED (closed/E2E-encrypted) — state it in 'excluded'. Communities are unbranded.`,

      whitespace_recommendations: `
SECTION: WHITE SPACE & RECOMMENDATIONS (decision-ready payoff)
Output: { "xAxis": {low,high}, "yAxis": {low,high}, "points": Array<{label, x:0–100, y:0–100, quadrant, note}> (white-space opportunities), "moves": Array<{n, title, rationale}> (3–4) }
DIRECTIVE: effort (x) × impact (y) quadrant with white-space opportunities as points. moves = concrete recommendations across portfolio / price-mix / communication, each laddering to the price–pack architecture (esp. affordable all-night protection + skin-safety claim).`,

      methodology_evidence: `
SECTION: METHODOLOGY & EVIDENCE BASE (credibility appendix)
Output: { "sources": string[], "excluded": string[], "window": string, "coverage": Array<{label, detail}>, "confidence": string, "disclaimer": string }
DIRECTIVE: source layers (social, e-commerce reviews, content communities, influencer ecosystem, vernacular & search), a minimum 36-month listening window, an explicit "WhatsApp groups excluded" note, and a coverage + confidence summary. Vendor-genericised.`,
    },
  },
  validators: {
    category_context: validateCards,
    babys_world_journey: validateJourney,
    diaper_styles: validateStyles,
    pack_architecture: validatePack,
    behaviour_usage: validateCards,
    needs_triggers_pains: validateNeeds,
    decision_influencers: validateCards,
    attribute_drivers: (d: any) => !!d && Array.isArray(d.drivers) && d.drivers.length >= 1,
    price_pack_signals: (d: any) => !!d && (Array.isArray(d.price_awareness) || Array.isArray(d.price_ceilings)),
    gap_analysis: validateGap,
    lovingle_diagnostic: validateLovingle,
    brand_landscape: validateBrands,
    // F3 Gate 3 — new sections (lenient; indicative seed always satisfies)
    exec_summary: (d: any) => !!d && (Array.isArray(d.insights) || Array.isArray(d.stats)),
    seasonality: (d: any) => !!d && (Array.isArray(d.monthly) || Array.isArray(d.occasions)),
    target_group: (d: any) => !!d && Array.isArray(d.segments),
    channel_retail: (d: any) => !!d && Array.isArray(d.nodes),
    geography_regional: (d: any) => !!d && Array.isArray(d.regions),
    influencer_community: (d: any) => !!d && Array.isArray(d.nodes),
    whitespace_recommendations: (d: any) => !!d && (Array.isArray(d.points) || Array.isArray(d.moves)),
    methodology_evidence: (d: any) => !!d && (Array.isArray(d.sources) || Array.isArray(d.coverage)),
  },
  fallbacks: BD_SEEDS_V1,
};
