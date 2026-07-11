// ============================================================================
//  Canonical register of the New Analyses layer (Agent C brief, verbatim intent).
//  The single source of truth for which N-IDs exist, what each measures, its
//  required splits, and its structural feasibility on the current schema.
//  Consumed by docs/UI and asserted against the keys computeBabyDiapersAnalyses
//  emits (see scripts/analyses-smoke.ts).
// ============================================================================

export type Feasibility = 'STRONG' | 'MODERATE' | 'THIN' | 'BLOCKED';

export interface RegisterEntry {
  id: string;
  title: string;
  basis: string;
  splits: string[];
  feasibility: Feasibility;
  /** which report section (baby_diapers_v2) this feeds. */
  feedsSection?: string;
  notes?: string;
}

export const ANALYSES_REGISTER: RegisterEntry[] = [
  { id: 'N-15', title: 'Caregiver-role share (to 100%, incl. long tail)', basis: 'text role cues', splits: [], feasibility: 'THIN', feedsSection: 'family_roles_babycare', notes: 'long tail (maalish wali, fellow moms, daycare) sparse → tail cells often insufficient' },
  { id: 'N-16', title: 'Caregiver-role long tail', basis: 'text role cues', splits: [], feasibility: 'THIN', feedsSection: 'family_roles_diapering' },
  { id: 'N-19', title: 'Lifestage classifier → six bands', basis: 'age/milestone cues', splits: [], feasibility: 'MODERATE', feedsSection: 'needs_by_lifestage', notes: 'feeds every lifestage split below' },
  { id: 'N-25', title: 'Occasions', basis: 'occasion cues', splits: ['segment', 'lifestage'], feasibility: 'MODERATE', feedsSection: 'usage_occasions' },
  { id: 'N-26', title: 'Formats + avoidance', basis: 'style: tokens + text', splits: ['segment', 'lifestage'], feasibility: 'MODERATE', feedsSection: 'usage_occasions' },
  { id: 'N-27', title: 'Seasonality — 3-yr monthly series', basis: 'dated raw rows (region lens)', splits: ['region'], feasibility: 'STRONG', feedsSection: 'regional_differences', notes: 'from dated rows only; feeds N-28 audit' },
  { id: 'N-31', title: 'Channel share + rank', basis: 'platform (strong) / channel text (thin)', splits: [], feasibility: 'STRONG', feedsSection: 'channel_dynamics' },
  { id: 'N-33', title: 'Urgency vs planned per channel', basis: 'lexical proxy', splits: ['channel'], feasibility: 'THIN', feedsSection: 'channel_dynamics' },
  { id: 'N-34', title: 'Channel preference by segment/lifestage/SKU/occasion', basis: 'channel text', splits: ['segment', 'lifestage', 'occasion'], feasibility: 'THIN', feedsSection: 'channel_dynamics', notes: 'channel×SKU blocked (no SKU key)' },
  { id: 'N-35', title: 'Purchase frequency by SKU', basis: 'commerce.sku/variant', splits: [], feasibility: 'BLOCKED', feedsSection: 'shopping_search_terms', notes: 'no SKU key on events (B-2)' },
  { id: 'N-36', title: 'SKU preference by segment/lifestage/occasion', basis: 'commerce.sku/variant', splits: ['segment', 'lifestage', 'occasion'], feasibility: 'BLOCKED', notes: 'no SKU key (B-2)' },
  { id: 'N-37', title: 'SKU interaction / laddering (99→399→single)', basis: 'pack-size extraction', splits: [], feasibility: 'BLOCKED', feedsSection: 'pricing_dynamics', notes: 'FEASIBILITY-GATED on measured hit-rate; true laddering needs per-user SKU sequences' },
  { id: 'N-39', title: 'Organic brand scan + SOV', basis: 'untracked brand text scan', splits: [], feasibility: 'MODERATE', feedsSection: 'competitive_landscape', notes: 'Babyhug already tracked' },
  { id: 'N-41', title: 'Brand-selection journey by lifestage', basis: 'journey cues', splits: ['lifestage'], feasibility: 'THIN', feedsSection: 'decision_journey' },
  { id: 'N-43', title: 'Category drivers → brand scores (R&R)', basis: 'driver lexicon × brand × rating', splits: ['driver'], feasibility: 'STRONG', feedsSection: 'features_benefits', notes: 'cite Amazon/Flipkart/FirstCry' },
  { id: 'N-44', title: 'Driver scores at variant level (top-10 variants)', basis: 'variant key', splits: ['variant'], feasibility: 'BLOCKED', notes: 'no variant key (B-2)' },
  { id: 'N-45', title: 'Trial/repeat/switch %', basis: 'lexical frames', splits: [], feasibility: 'THIN', feedsSection: 'competitive_landscape' },
  { id: 'N-46', title: 'Top brand→brand switches (variant, reasons)', basis: 'switch frames', splits: [], feasibility: 'MODERATE', feedsSection: 'competitive_landscape', notes: 'variant-level blocked (B-2)' },
  { id: 'N-47', title: 'Price ceilings — tape vs pant', basis: 'raw price + ₹ text', splits: ['format'], feasibility: 'BLOCKED', feedsSection: 'pricing_dynamics', notes: 'structured price off events (B-2)' },
  { id: 'N-48', title: 'Price ceilings by lifestage', basis: 'raw price + ₹ text', splits: ['lifestage'], feasibility: 'BLOCKED', feedsSection: 'pricing_dynamics' },
  { id: 'N-49', title: 'Price ceilings by pack size', basis: 'raw price + ₹ text', splits: ['pack'], feasibility: 'BLOCKED', feedsSection: 'pricing_dynamics' },
  { id: 'N-58', title: 'S20 coverage stats', basis: 'coverage diagnostics', splits: ['lifestage', 'first_vs_second_mom', 'geography', 'sku'], feasibility: 'MODERATE', feedsSection: 'data_foundation', notes: 'first-vs-second-mom text-derived (lang field unusable); SKU coverage blocked' },
];

/** Every primary N-ID computeBabyDiapersAnalyses is expected to emit a key for. */
export const EXPECTED_ANALYSIS_IDS = ANALYSES_REGISTER.map((e) => e.id);
