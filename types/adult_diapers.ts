
export type Confidence = "HIGH" | "MED" | "LOW";
export type SourceType = "amazon" | "flipkart" | "social" | "forums" | "news" | "blogs" | "other";
export type ProfileType = "overall_category" | "self_use" | "decider_for_others" | "caregiver_bedridden";
export type AttributeKey = "comfort" | "long_lasting" | "no_leakage" | "absorption" | "dryness" | "softness" | "odour_control" | "freshness" | "thinness_thickness" | "skin_safety" | "fit" | "value";

export interface EvidenceQuote {
  quote: string;
  source: SourceType;
  evidence_id: string | null;
  brand: string | null;
  meta: { rating: number | null; channel: string | null } | null;
}

export interface EvidenceBlock {
  refs: {
    evidence_ids: string[];
    source_mix: { [k: string]: number };
    total_n: number;
  };
  quotes: EvidenceQuote[];
}

export interface InsightItem {
  headline: string;
  what_it_means: string;
  so_what: string;
  evidence: EvidenceBlock;
  confidence: Confidence;
  tags: string[];
}

export interface ChallengeItem {
  challenge: string;
  who_it_affects: ProfileType[];
  severity: "P0" | "P1" | "P2";
  current_workarounds: string[];
  what_is_resolved: string[];
  what_is_unresolved: string[];
  need_gap: string;
  evidence: EvidenceBlock;
}

export interface InfoSourceTrust {
  source: string;
  trust_reason: string;
  trusted_by: ProfileType[];
  evidence: EvidenceBlock;
}

export interface ProductFormatPreference {
  format: "pant_style" | "tape_style" | "underpad" | "liner" | "reusable_absorbent_briefs" | "catheter_solution" | "other";
  when_used: string;
  preferred_by: ProfileType[];
  pros: string[];
  cons: string[];
  evidence: EvidenceBlock;
}

export interface ProfileDTO {
  definition: InsightItem[];
  incontinence_issue: InsightItem[];
  worst_moments: InsightItem[];
  life_impact: InsightItem[];
  solutions: InsightItem[];
  light_vs_heavy: InsightItem[];
  product_preferences: ProductFormatPreference[];
  day_vs_night: InsightItem[];
  satisfaction: InsightItem[];
  challenges: ChallengeItem[];
  info_sources_and_trust: InfoSourceTrust[];
}

export interface AdultDiapersIncontinenceManagementSectionDTO {
  section_id: "incontinence_management";
  profiles: {
    overall_category: ProfileDTO;
    self_use: ProfileDTO;
    decider_for_others: ProfileDTO;
    caregiver_bedridden: ProfileDTO;
  };
  section_summary: {
    boardroom_takeaways: string[];
    top_need_gaps: { need_gap: string; why: string; evidence: EvidenceBlock }[];
  };
}

export interface AdultDiapersAwarenessPerceptionSectionDTO {
  section_id: "awareness_perception";
  awareness_depth: InsightItem[];
  perceptions_and_stigma: InsightItem[];
  misconceptions: InsightItem[];
  decision_journey: InsightItem[];
  section_summary: { boardroom_takeaways: string[] };
}

export interface AttributeSentiment {
  attribute: AttributeKey;
  sentiment: "POS" | "MIX" | "NEG";
  why: string;
  evidence: EvidenceBlock;
}

export interface AdultDiapersUserNonUserProfilesSectionDTO {
  section_id: "user_non_user_profiles";
  users_trialists: {
    awareness_sources: InsightItem[];
    triggers_to_purchase: InsightItem[];
    first_use_contexts: InsightItem[];
    benefits_vs_challenges: InsightItem[];
    brand_share_wordcloud: {
      share: { brand: string; mentions: number; share_pct: number }[];
      word_cloud_terms: string[];
      evidence: EvidenceBlock;
    };
    sentiment_overall_and_by_attribute: AttributeSentiment[];
    failure_stories: { story: string; evidence: EvidenceBlock }[];
    delight_stories: { story: string; evidence: EvidenceBlock }[];
    retention_intent: InsightItem[];
    churn_reasons: InsightItem[];
  };
  non_users: {
    awareness_sources: InsightItem[];
    awareness_quality: InsightItem[];
    barriers_to_trial: InsightItem[];
    cost_availability: InsightItem[];
    worst_moments: InsightItem[];
    substitutions: InsightItem[];
  };
  section_summary: { boardroom_takeaways: string[] };
}

export interface PurchaseBehaviour {
  channels: { channel: "pharmacy"|"hospital"|"ecommerce"|"kirana"|"other"; why: string; evidence: EvidenceBlock }[];
  pack_sizes: { pack: "trial_2_4"|"small_6_10"|"medium_20_30"|"bulk_40_plus"|"unknown"; why: string; evidence: EvidenceBlock }[];
  sizing: { size: "S"|"M"|"L"|"XL"|"XXL"|"unknown"; drivers: string[]; evidence: EvidenceBlock }[];
  price_points_inr: { range_label: string; notes: string; evidence: EvidenceBlock }[];
}

export interface AdultDiapersBehaviouralProfileSectionDTO {
  section_id: "behavioural_profile";
  heaviness_of_use: InsightItem[];
  occasions_of_use: InsightItem[];
  switching_patterns: InsightItem[];
  loyalty_indicators: InsightItem[];
  purchase_behaviour: PurchaseBehaviour;
  section_summary: { boardroom_takeaways: string[] };
}

export interface BrandSummary {
  brand: string;
  share_of_voice: { mentions: number; share_pct: number };
  overall_sentiment: "POS" | "MIX" | "NEG";
  attribute_scale: { attribute: AttributeKey; score_0_5: number; rationale: string; evidence: EvidenceBlock }[];
  ratings: { channel: "amazon"|"flipkart"|"other"; avg_rating_0_5: number; review_count: number | null }[];
  sku_insights: { sku_name: string; positioning: string; key_praises: string[]; key_complaints: string[]; evidence: EvidenceBlock }[];
  word_cloud_terms: string[];
  geo_notes_india: { cut: string; insight: string; evidence: EvidenceBlock }[];
}

export interface VisualSynthesis {
  source_volume: {
    total_n: number;
    by_source: { source: SourceType; n: number; pct: number }[];
  };
  brand_word_cloud: { top_terms: string[] };
}

export interface AdultDiapersBrandLandscapeSectionDTO {
  section_id: "brand_landscape";
  market_structure: InsightItem[];
  brands: BrandSummary[];
  overall_attribute_heatmap: { attribute: AttributeKey; winner_brands: string[]; loser_brands: string[]; evidence: EvidenceBlock }[];
  geo_insights_india: InsightItem[];
  visual_synthesis: VisualSynthesis;
  section_summary: { boardroom_takeaways: string[] };
}
