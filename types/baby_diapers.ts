
// ============================================================================
// BABY DIAPERS (LOVINGLE) — CANONICAL DTOs
// ----------------------------------------------------------------------------
// Encodes the locked principles from the RSPL Lovingle Social Listening brief:
//  1. TWO INDEPENDENT AXES — diaper STYLE (cloth/tape/pant/reusable) and
//     pack ARCHITECTURE (laddi/non-laddi) are never collapsed into one field.
//  2. LIFESTAGE is anchored to the BABY's age, never the parent's age.
//  3. FAMILY STRUCTURE (nuclear-with-support vs joint) is an explicit cut.
//  4. MOTHER TYPE (first-time vs second-time+) is an explicit cut.
//  5. BRAND-OBJECTION LOCK — Lovingle = rash / skin-safety objections.
//     (Pro-ease = leakage / trust. Never swap across categories.)
// ============================================================================

export type Confidence = "HIGH" | "MED" | "LOW";

// --- Canonical enums (the two axes, kept strictly separate) ---

export type DiaperStyle =
  | "cloth"
  | "tape_disposable"
  | "pant_disposable"
  | "reusable";

export type PackArchitecture =
  | "laddi_single"
  | "laddi_twin"
  | "non_laddi_99"
  | "non_laddi_399"
  | "non_laddi_999";

// Baby developmental journey — the spine. Anchored to baby age, NOT parent age.
export type Lifestage =
  | "expecting_3rd_tri"
  | "newborn_lt_3m"
  | "3_to_6m"
  | "7_to_11m"
  | "1_to_2y"
  | "2_to_3y";

export type FamilyStructure = "nuclear_with_support" | "joint";
export type SupportSystem = "nanny" | "grandparent" | "spouse" | "none";
export type MotherType = "first_time" | "second_time_plus";
export type Segment = "mass" | "mid_premium" | "premium";
export type Channel = "general_trade" | "modern_trade" | "online";

// --- Shared atomic shapes ---

export interface Verbatim {
  quote: string;
  // e.g. "Amazon.in · MamyPoko Extra Absorb", "Instagram", "FirstCry · Lovingle Pant L"
  source: string;
  // ALWAYS baby-age anchored: "31F, First-time mother of 8-month-old, Mumbai"
  consumer: string;
}

export interface InsightCard {
  headline: string;
  what_it_means: string;
  data_points?: number;
  confidence?: Confidence;
  verbatims: Verbatim[];
  // optional axis tags — present on any product-level insight
  style?: DiaperStyle;
  pack?: PackArchitecture;
  lifestage?: Lifestage;
}

export interface CrossTabRow {
  label: string;
  cells: string[];
}

export interface CrossTab {
  columns: string[];
  rows: CrossTabRow[];
}

// ============================================================================
// SECTION DTOs
// ============================================================================

// 1. CATEGORY CONTEXT & CULTURAL TRENDS
export interface CategoryContextDTO {
  cards: InsightCard[];
}

// 2. THE BABY'S WORLD — NEEDS ACROSS THE JOURNEY (the spine)
export interface JourneyLaneDTO {
  lifestage: Lifestage;
  age_band: string;       // "3rd trimester", "<3 months", "1–2 years"...
  size_signal: string;    // qualitative volume signal for this stage
  headline: string;
  needs: string[];        // functional + emotional needs at this stage
  mindset: string;        // the parent's dominant mindset
  dominant_style?: DiaperStyle;
  switch_triggers: string[]; // what moves the parent to the NEXT stage/style
  verbatims: Verbatim[];
}

export interface BabysWorldJourneyDTO {
  lanes: JourneyLaneDTO[];
  spine_summary: string[];
}

// 3. DIAPER STYLES & FORMAT INTERACTION (style axis)
export interface StyleProfileDTO {
  style: DiaperStyle;
  typical_occasion: string;
  lifestage_skew: string;
  key_challenge: string;
  switch_triggers: string[];
  functional_notes: string[];
  emotional_notes: string[];
  verbatims: Verbatim[];
}

export interface DiaperStylesDTO {
  styles: StyleProfileDTO[];
  interaction_matrix: CrossTab; // how styles co-exist / hand off in a household
  interaction_notes: string[];
}

// 4. PACK ARCHITECTURE — LADDI vs NON-LADDI (pack axis, distinct from style)
export interface PackProfileDTO {
  pack: PackArchitecture;
  who_buys: string;
  occasion: string;
  channel_context: string;
  role_in_portfolio: string; // trial / top-up / planned / premiumisation engine
  verbatims: Verbatim[];
}

export interface PackArchitectureDTO {
  laddi: PackProfileDTO[];
  non_laddi: PackProfileDTO[];
  ladder_dynamics: string[]; // what moves a household up / down the ₹ ladder
}

// 5. BEHAVIOUR & USAGE MAPPING
export interface BehaviourUsageDTO {
  occasions: InsightCard[]; // night / day / travel / daycare / outings / monsoon
  usage_notes: string[];
}

// 6. NEEDS, TRIGGERS & PAIN POINTS (3-layer needs model)
export interface NeedsTriggersPainsDTO {
  functional: InsightCard[];
  emotional: InsightCard[];
  social: InsightCard[];
}

// 7. DECISION-MAKING, BUYER-vs-DECIDER & INFLUENCER ROLES
export interface DecisionInfluencersDTO {
  buyer_vs_decider: InsightCard[];
  support_system_roles: InsightCard[]; // nanny (nuclear) / grandparent (joint) / father
  discovery_hierarchy: InsightCard[];  // hospital kit → paed → influencer → search → store → family
}

// 8. PRODUCT ATTRIBUTE DRIVERS
export interface AttributeDriverDTO {
  attribute: string;
  tier: "must_have" | "good_to_have" | "delighter";
  importance: Confidence;
  insight: string;
  mapped_lifestage?: Lifestage;
  mapped_style?: DiaperStyle;
  verbatims: Verbatim[];
}

export interface AttributeDriversDTO {
  drivers: AttributeDriverDTO[];
}

// 9. PRICE–PACK & PREMIUMISATION SIGNALS (the price-pack architecture input)
export interface PriceCeilingDTO {
  sec: "A" | "B" | "C";
  ceiling_inr: string;
  notes: string;
}

export interface PricePackSignalsDTO {
  price_awareness: InsightCard[];
  price_ceilings: PriceCeilingDTO[];
  premiumisation_triggers: InsightCard[];
  promo_response: InsightCard[];
  pack_vs_unit_tradeoff: InsightCard[];
}

// 10. GAP ANALYSIS (reuses the canonical gap structure)
export interface GapBullet {
  claim: string;
  explanation: string;
  consumer_evidence: Verbatim[];
  severity?: "HIGH" | "MED" | "LOW";
  data_points?: number;
  impacted_lifestages?: string[];
}

export interface NeedStatement {
  need: string;
  why_now: string;
  who: string;
  consumer_evidence: Verbatim[];
  priority: "P0" | "P1" | "P2";
}

export interface BabyGapAnalysisDTO {
  current_challenges: { heading: string; bullets: GapBullet[] };
  resolved_challenges: { heading: string; bullets: GapBullet[] };
  unresolved_challenges: { heading: string; bullets: GapBullet[] };
  need_gap: { heading: string; need_statements: NeedStatement[] };
}

// 11. LOVINGLE BRAND DIAGNOSTIC
export interface LovingleDiagnosticDTO {
  spontaneous_awareness: InsightCard[];
  consideration_drivers: InsightCard[];
  consideration_barriers: InsightCard[];   // LOCK: dominant cluster = rash / skin-safety
  aware_non_trier: InsightCard[];
  trier_working: InsightCard[];
  switch_stories: Array<{
    direction: "to_lovingle" | "from_lovingle";
    from_brand: string;
    to_brand: string;
    trigger: string;
    verbatims: Verbatim[];
  }>;
}

// 12. COMPETITIVE BRAND LANDSCAPE
export interface BabyBrandSummary {
  brand: string;
  tier: Segment;
  share_of_voice: { share_pct: number };
  overall_sentiment: "POS" | "MIX" | "NEG";
  positioning_summary: string;
  attribute_scale: Array<{ attribute: string; score_0_5: number }>;
  strengths: string[];
  weaknesses: string[];
  data_points?: number;
  verbatims: Verbatim[];
}

export interface BabyBrandLandscapeDTO {
  market_structure: string[];
  brands: BabyBrandSummary[];
}
