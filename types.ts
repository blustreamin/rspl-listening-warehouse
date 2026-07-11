
export type ProjectId = 'disposable-period-panties' | 'reusable-period-panties' | 'sanitary-pads' | 'adult-diapers' | 'baby-diapers';

export interface Quote {
  quoteId: string;
  text: string;
  sourceType: 'social' | 'review' | 'search';
  brand?: string;
  language: string;
  location: string;
  timestamp: string;
}

export interface Metric {
  label?: string;
  value: number;
  pct?: number;
  denominator?: number;
}

export interface InsightBullet {
  text: string;
  quoteIds: string[];
  stats?: {
    mentionCount?: number;
    sharePct?: number;
    confidenceScore?: number;
  };
  isSeeded?: boolean;
}

export interface SectionOutput {
  /** PENDING = awaiting-generation stub (baby-diapers v2 registry — no seeds). */
  status: 'OK' | 'PARTIAL' | 'SEEDED' | 'FAILED' | 'PENDING';
  title: string;
  content: any; // Flexible schema based on section type
  fallbacksUsed: boolean;
  evidenceRef?: Quote[];
  templateId?: string; // STRICT ROUTING KEY
  sectionId?: string;  // STRICT ROUTING KEY
  projectId?: string;  // STRICT ISOLATION KEY
}

export interface RunInspectorData {
  templateId: string;
  promptVersion: string;
  schemaVersion: string;
  evidenceHash: string;
  perSectionStatus: Record<string, 'OK' | 'PARTIAL' | 'SEEDED' | 'FAILED' | 'PENDING'>;
  validatorFailures: string[];
  retryLog: string[];
}

// --- REPORT DTOs (FemCare V3) ---

export interface Section1DTO {
  cards: Array<{
    boldTitle: string;
    bullets: string[];
    confidence?: string;
    evidence_ids?: string[];
    metrics?: Metric[];
  }>;
}

export interface Section2DTO {
  trigger_clusters?: Array<{ title: string; explanation: string; evidence_ids?: string[] }>;
  barrier_groups?: Record<string, string[]>;
  switching_dynamics?: Array<{ pathway: string; logic_bullets: string[]; evidence_ids?: string[] }>;
}

export interface Section3DTO {
  formats?: Array<{
    format: string;
    role_in_lifecycle: string;
    functional_resolution: string[];
    emotional_resolution: string[];
  }>;
  tradeoff_matrix?: Array<{
    attribute: string;
    pads: string;
    disposable_panties: string;
    reusable_panties: string;
    winner: string;
  }>;
}

// --- ENHANCED SEGMENTATION DTOs ---

export interface EvidenceQuoteDTO {
  quote: string;
  source: string;
}

export interface LifestageSegmentDTO {
  segment_name: string;
  size_signal: string;
  adoption_drivers: string[];
  core_tension: string;
  functional_expectations: string[];
  emotional_drivers: string[];
  barriers: string[];
  switching_triggers: string[];
  brand_signals: string[];
  price_sensitivity: "High" | "Medium" | "Low";
  consumer_evidence: EvidenceQuoteDTO[];
  commercial_implication: string;
  confidence: "High" | "Medium" | "Low";
}

export interface GeographySegmentDTO {
  region_type: string;
  behavioral_pattern: string;
  adoption_triggers: string[];
  infrastructure_factor: string;
  affordability_dynamic: string;
  brand_exposure_pathway: string[];
  barriers: string[];
  consumer_evidence: EvidenceQuoteDTO[];
  commercial_implication: string;
  confidence: "High" | "Medium" | "Low";
}

export interface SegmentationEnhancedDTO {
  by_lifestage: LifestageSegmentDTO[];
  by_geography: GeographySegmentDTO[];
  // Legacy compatibility
  lifestage?: any[];
  geography?: any[];
}

export interface DeepDiveDTO {
  role_summary?: { boldTitle: string; bullets: string[]; confidence?: string };
  users?: {
    discovery_sources?: string[];
    triggers?: string[];
    experience_parameters?: Array<{
      parameter: string;
      insight: string;
      sentiment: 'POS' | 'NEG' | 'MIX';
      evidence_ids?: string[];
    }>;
    brands?: Array<{
      brand: string;
      sentiment: string;
      share: { count: number; pct: number };
      evidence_ids?: string[];
    }>;
  };
  non_users?: {
    barriers_to_try?: Array<{ title: string; bullets: string[] }>;
  };
  segmentation?: SegmentationEnhancedDTO;
}

export interface VisualsDTO {
  sources_chart?: { data: Array<{ source: string; count: number; pct: number }> };
  word_cloud_themes?: { tokens: Array<{ term: string; weight: number }> };
  word_cloud_sizes_brands?: { tokens: Array<{ term: string; weight: number }> };
}

// --- ADULT DIAPERS DTOs (NEW) ---

export interface IncontinenceProfileDTO {
  definition: { triggers: string[]; severity: string; emotional: string; language: string[] };
  moments_suffering: string[];
  impact: { psychological: string[]; physical: string[]; social: string[]; sleep: string; financial: string; caregiver_stress?: string };
  solutions: { improvised: string[]; hacks: string[]; layering: string[]; products: string[]; medical: string[] };
  light_vs_heavy: { leak_freq: string; volume: string; products: string[] };
  product_preference: string[];
  day_vs_night: { absorption: string; leakage_fear: string; fit: string; mobility: string };
  satisfaction: { positive_pct: number; negative_pct: number; mixed_pct: number; pain_points: string[] };
  challenges: string[];
  resolutions: Array<{ challenge: string; response: string }>;
  unresolved: string[];
  info_sources: string[];
}

export interface AdultDiaperSection1DTO {
  management_profiles: {
    overall: IncontinenceProfileDTO;
    self_use: IncontinenceProfileDTO;
    decider: IncontinenceProfileDTO;
    caregiver: IncontinenceProfileDTO;
  };
}

export interface AdultDiaperSection2DTO {
  awareness_perception: {
    unaided: string[];
    aided: string[];
    understanding: string;
    misconceptions: string[];
    stigma: string;
    dignity: string;
    positioning: string;
  };
}

export interface AdultDiaperSection3DTO {
  user_profiles: {
    users: {
      awareness_source: string[];
      trigger_purchase: string[];
      first_usage: string;
      experience: string;
      trade_off: string;
      brand_share: Array<{ brand: string; pct: number }>;
      brand_sentiment: Array<{ brand: string; sentiment: string }>;
      stories: { failure: string[]; delight: string[] };
      retention: string;
      discontinuation_reasons: string[];
    };
    non_users: {
      awareness_source: string[];
      awareness_quality: string;
      barriers: string[];
      cost_sensitivity: string;
      availability: string;
      stigma: string;
      suffering_occasions: string[];
      substitution: string[];
    };
  };
}

export interface AdultDiaperSection4DTO {
  behavioral_profile: {
    heaviness: string;
    occasions: string[];
    switching: string[];
    trial: string;
    loyalty: string;
    channel_split: Array<{ channel: string; pct: number }>;
    size_preference: string[];
    sku_patterns: string[];
  };
}

export interface AdultDiaperSection5DTO {
  brand_landscape: Array<{
    brand: string;
    attributes: Record<string, number>; // 1-10 scale
    rating: number;
    sov: number; // Share of Voice %
    portfolio: string[];
    geo_insights: string;
    tier_diff: string;
    word_cloud: Array<{ term: string; weight: number }>;
  }>;
}

// --- GAP ANALYSIS DTO (New) ---

export interface GapBulletDTO {
  claim: string;
  explanation: string;
  consumer_evidence: Array<{ quote: string; source: string }>;
  evidence_ids?: string[];
  sources?: string[];
  severity?: "HIGH" | "MED" | "LOW";
  impacted_occasions?: string[];
}

export interface NeedStatementDTO {
  need: string;
  why_now: string;
  who: string;
  measurable_proxy?: string;
  consumer_evidence: Array<{ quote: string; source: string }>;
  evidence_ids?: string[];
  sources?: string[];
  priority: "P0" | "P1" | "P2";
}

export interface GapAnalysisSectionDTO {
  current_challenges: { heading: string; bullets: GapBulletDTO[] };
  resolved_challenges: { heading: string; bullets: GapBulletDTO[] };
  unresolved_challenges: { heading: string; bullets: GapBulletDTO[] };
  need_gap: { heading: string; need_statements: NeedStatementDTO[] };
}

// Architecture Schema Types
export interface TemplateSection {
  sectionId: string;
  title: string;
  uiSpec: 'cards' | 'matrix' | 'funnel' | 'text-list' | 'gap-analysis' | 'adult-profile' | 'adult-brand' | 'adult-gap' | 'baby-journey' | 'style-matrix' | 'pack-axis' | 'needs' | 'attributes' | 'price-pack' | 'baby-gap' | 'lovingle' | 'baby-brand';
  schema: any;
  /** Booklet part grouping for TOC + accent routing (baby-diapers): the doc's
   *  numbered main headings "1"–"7"; standalone headings carry no part. */
  part?: string;
}

export interface TemplatePack {
  templateId: string;
  sections: TemplateSection[];
  promptPack: {
    systemPrompt: string;
    sectionPrompts: Record<string, string>;
  };
  validators: Record<string, (data: any) => boolean>;
  fallbacks: Record<string, any>;
  versionPolicy: {
    locked: boolean;
    version: string;
  };
}

// --- NEW CANONICAL SCHEMA V1 ---

// India-gate classification (V-01). Only the first three classes survive the
// gate; NON_IN and UNKNOWN_GLOBAL rows are excluded from the assembled graph
// and accounted for in GateAuditV1.
export type GeoClass = 'IN_PLATFORM' | 'IN_GEO' | 'IN_SIGNAL' | 'NON_IN' | 'UNKNOWN_GLOBAL';

// Per-assembly gate audit (V-01/V-02) — every exclusion is counted here, per
// normalized source tag, so Section 20 can render the gate transparently.
// Invariant (enforced at assembly): postGate.total ===
//   preGate.total - dropped.NON_IN - dropped.UNKNOWN_GLOBAL - dateWindow.droppedPreWindow
export interface GateAuditV1 {
  version: string;
  assembledAtISO: string;
  cutoffISO: string;          // events dated before this are excluded (V-02)
  windowMonths: number;       // 36
  registry: { rowSum: number; byTag: Record<string, number> };
  preGate: { total: number; byTag: Record<string, number> };
  reconciliation: { tolerance: number; ok: boolean; deltas: string[] };
  geoClass: {
    kept: { IN_PLATFORM: number; IN_GEO: number; IN_SIGNAL: number };
    dropped: { NON_IN: number; UNKNOWN_GLOBAL: number };
    byTag: Record<string, Partial<Record<GeoClass, number>>>;
  };
  dateWindow: {
    droppedPreWindow: number;
    undatedKept: number;      // rows with no parseable date are KEPT (documented)
    datedKept: number;
    byTag: Record<string, { droppedPreWindow: number; undatedKept: number; datedKept: number }>;
  };
  postGate: { total: number; byTag: Record<string, number> };
}

// Raw monthly mention series (V-02 side product) — geo-gated but NOT
// date-windowed, for the seasonality trend chart only. Never feeds synthesis.
export interface TrendMonthlyV1 {
  basis: 'geo_gated_date_unwindowed';
  months: number;             // 60
  series: Array<{ month: string; count: number }>; // 'YYYY-MM', zero-filled
}

export interface EvidenceEventV1 {
  evidenceId: string;
  eventType: 'SOCIAL_MENTION' | 'COMMERCE_REVIEW' | 'SEARCH_INTENT_SIGNAL';
  sourceTag: string;
  sourceRef?: {
    fileId: string;
    inputId: string;
    rowId: string;
    url?: string;
  };
  author?: {
    name?: string;
  };
  geo?: {
    country?: string;
    state?: string;
    city?: string;
  };
  lang?: string;
  time?: {
    createdAtISO?: string;
  };
  commerce?: {
    platform?: string;
    brand?: string;
    product?: string;
    variant?: string;
    sku?: string;
    price?: number;
    currency?: string;
    rating?: number;
  };
  content: {
    title?: string;
    text: string;
    platform?: string;
  };
  derived?: {
    tokens?: string[];
    mentionsBrands?: string[];
  };
  // Legacy compatibility fields for UI
  evidence_id?: string; 
  text?: { raw: string };
  timestamp_iso?: string;
  source?: string;
}

export interface EvidenceGraph {
  schemaVersion?: string;
  projectId?: string;
  runId?: string;
  evidenceHash?: string;
  generatedAtISO?: string;
  qualityReport?: {
    status: 'ok' | 'partial' | 'failed';
    rowCounts: {
      received: number;
      accepted: number;
      dropped: number;
    };
    warnings: Array<{
      code: string;
      message: string;
      affectedInputs?: string[];
    }>;
    fieldCoverage?: Record<string, number>;
  };
  events?: EvidenceEventV1[];
  aggregations?: {
    brandCounts?: Array<{ brand: string; count: number }>;
    ratingSummary?: {
      count: number;
      avg: number;
      p50: number;
      p90: number;
    };
    languageCounts?: Array<{ lang: string; count: number }>;
    // Ingestion-panel stats (05 Jul rebuild) — emitted at graph-assembly time
    // so the Data Foundation panel never recomputes corpus stats client-side.
    platformCounts?: Array<{ platform: string; count: number }>;
    eventTypeCounts?: { commerce: number; social: number };
    socialSourceCounts?: Array<{ source: string; count: number }>;
    brandRatings?: Array<{ brand: string; count: number; avg: number }>;
    verbatimCount?: number;
    dateRange?: { min: string | null; max: string | null; datedCount: number };
    stateCounts?: Array<{ state: string; count: number }>;
    // India-gate audit + seasonality series (V-01/V-02) — emitted only by the
    // server-side assemble (api/_lib/assemble.ts).
    gateAudit?: GateAuditV1;
    trendMonthly?: TrendMonthlyV1;
    // Deterministic assemble-time analyses (N-15…N-58, Agent C layer),
    // versioned by graph id + evidence hash. Inline import() keeps types.ts
    // import-statement-free (its full compile-time erasure is load-bearing
    // for the api/_lib server bundle).
    analyses?: import('./services/analyses/analysisTypes').AnalysesBundleV1;
  };
  // Fallback for legacy pipeline compatibility
  evidence_graph_v1?: { events: any[] };
  nodes?: any[];
  edges?: any[];
  stats?: Record<string, any>;
  // Provenance markers (mock-corpus guard). __provenance labels how the graph
  // was produced; __datasetIds are the registry dataset ids it was assembled
  // from. A registry-backed run only trusts a graph whose __datasetIds match
  // the current registry; the built-in demo corpus is tagged 'mock' and is
  // refused by the persist/cache/synthesis paths. See lib/graphProvenance.ts.
  __provenance?: 'mock' | 'registry' | 'unknown';
  __datasetIds?: string[];
}

// --- FILE UPLOAD & INGESTION TYPES ---

export type FileSourceTag = 'awario' | 'amazon' | 'amazon_apify' | 'flipkart' | 'flipkart_apify' | 'facebook_apify' | 'facebook_comments_apify' | 'instagram_apify' | 'other';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  lastModified?: number;
  type: string;
  sourceTag: FileSourceTag;
  uploadedAt: string;
  parsedPreview?: {
    columns: string[];
    rowCount: number;
  };
  rawContent: any[]; // Parsed JSON content
}

export interface ProjectDataBundle {
  projectId: ProjectId;
  files: UploadedFile[];
  lastIngestedAt?: string;
  lastRunId?: string;
}

// --- MAPPING & INGEST REQUEST ---

export interface CanonicalFieldMap {
  text?: string;
  title?: string;
  rating?: string;
  createdAtISO?: string;
  url?: string;
  author?: string;
  platform?: string;
  brand?: string;
  product?: string;
  variant?: string;
  sku?: string;
  price?: string;
  language?: string;
  location?: string;
  city?: string;
  state?: string;
}

export interface InputMapping {
  fileId: string;
  sourceTag: FileSourceTag;
  fieldMap: CanonicalFieldMap;
  constants: {
    country: string;
    currency: string;
    platform?: string;
  };
  status: 'ready' | 'needs_fix' | 'blocked';
  coverage: {
    text: number;
    rating: number;
    date: number;
  };
}

export interface IngestRequestV1 {
  schemaVersion: "ingest_request_v1";
  orgId: string;
  projectId: string;
  runMeta: {
    trigger: string;
    requestedAtISO: string;
  };
  inputs: Array<{
    inputId: string;
    sourceTag: string;
    fileMeta: {
      fileId: string;
      fileName: string;
      rowCount: number;
    };
    mapping: {
      canonicalFieldMap: CanonicalFieldMap;
      constants: Record<string, string>;
    };
    rows: Array<{
      rowId: string;
      raw: any;
    }>;
  }>;
}
