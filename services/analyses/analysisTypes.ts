// ============================================================================
//  New Analyses Layer (N-15 … N-58) — output contract + versioned bundle.
//
//  ACCEPTANCE LAW (brief): every analysis emits { value(s), n, basis,
//  confidence, source_ids }. Where a cell is thin, it emits the literal
//  INSUFFICIENT_SIGNAL sentinel — NEVER an invented number. The
//  fabricated-evidence law is absolute; this module makes fabrication
//  structurally impossible (a below-threshold cell cannot carry a value).
//
//  The bundle is VERSIONED BY GRAPH ID so every downstream citation is stamped
//  with the exact assemble it came from. It is produced at assemble time over
//  the India-gated + windowed RAW ROWS (see ANALYSES-PHASE-A-REPORT.md §2-3 for
//  why raw rows and not the lossy events).
// ============================================================================

import type { CanonicalFieldMap, EvidenceEventV1 } from '../../types';

/** The sentinel a thin/empty cell carries in place of a number. */
export const INSUFFICIENT_SIGNAL = 'insufficient signal' as const;
export type InsufficientSignal = typeof INSUFFICIENT_SIGNAL;

export type ConfidenceTier = 'STRONG' | 'MODERATE' | 'THIN' | 'INSUFFICIENT';

/** A measured number, or the insufficient-signal sentinel. Never a guess. */
export type MeasuredValue = number | InsufficientSignal;

/** One row/cell of an analysis (a brand, a role, a band, a segment, …).
 *  `kind` decides whether the insufficient-signal law applies:
 *   - 'estimate' (default): a share/percentage/mean — masked to INSUFFICIENT_SIGNAL
 *     below MIN_CELL_N, because a small-n estimate is misleading.
 *   - 'count': a census count (a month's mention volume, a coverage total) — the
 *     count IS the measurement, so it is always reported (a low count is a true
 *     low count, not a fabrication); only its `confidence` tier reflects thinness. */
export interface AnalysisCell {
  label: string;
  kind?: 'estimate' | 'count';
  /** count or pct — or INSUFFICIENT_SIGNAL when an estimate cell is below MIN_CELL_N. */
  value: MeasuredValue;
  /** share within the cell's group, present only when the cell is measurable. */
  pct?: number;
  /** records backing THIS cell (always reported, even when value is masked). */
  n: number;
  confidence: ConfidenceTier;
  /** capped sample of contributing evidenceIds for audit/traceability. */
  source_ids: string[];
  note?: string;
}

/** A single analysis output. A scalar analysis has one cell; a share analysis
 *  has many; a split analysis nests further outputs under `splits`. */
export interface AnalysisOutput {
  id: string;            // register id, e.g. 'N-15'
  label: string;         // human title
  basis: string;         // denominator + method, one line
  n: number;             // total records backing this analysis
  confidence: ConfidenceTier;
  values: AnalysisCell[];
  source_ids: string[];  // capped sample across the analysis
  /** nested splits: split-name -> (cell-label -> sub-output). e.g.
   *  splits.by_segment.premium, splits.by_lifestage['Newborn (0-3m)']. */
  splits?: Record<string, Record<string, AnalysisOutput>>;
  note?: string;
}

export interface AnalysesThresholds {
  /** a cell needs this many records to carry a value (else INSUFFICIENT). */
  MIN_CELL_N: number;
  /** analysis-level tiers by backing n. */
  MODERATE_N: number;
  STRONG_N: number;
  /** N-37: minimum pack-size extraction hit-rate before a ladder may be drawn. */
  PACK_HITRATE_MIN: number;
  /** cap on source_ids retained per cell/analysis. */
  SOURCE_ID_CAP: number;
}

export const DEFAULT_THRESHOLDS: AnalysesThresholds = {
  MIN_CELL_N: 30,
  MODERATE_N: 60,
  STRONG_N: 200,
  PACK_HITRATE_MIN: 0.25,
  SOURCE_ID_CAP: 25,
};

/** One row handed to the layer at assemble time. Carries BOTH the raw row (for
 *  price/product/variant/lang the event drops) AND the assembled event (for the
 *  canonicalised brand/platform/rating/geo/date/tokens) AND the gate decision
 *  (for dated/dateMs on the frozen basis). */
export interface AnalysisInputRow {
  raw: Record<string, any>;
  fieldMap: CanonicalFieldMap;
  sourceTag: string;
  event: EvidenceEventV1;
  /** The gate decision, when the assemble retains it. OPTIONAL: when omitted the
   *  layer recomputes datedness from raw + fieldMap using the SAME parseRowDate
   *  the gate uses, so docking needs no decision-plumbing — just a positional
   *  zip of (kept rows) × (postGraph.events). */
  gate?: { dated: boolean; dateMs: number | null; geoClass?: string };
}

export interface AnalysesContext {
  projectId: string;
  graphId?: string;
  evidenceHash?: string;
  assembledAtISO: string;
  cutoffISO?: string;
  windowMonths?: number;
  thresholds?: Partial<AnalysesThresholds>;
}

/** The versioned block written to `aggregations.analyses`. */
export interface AnalysesBundleV1 {
  version: 'analyses_v1';
  projectId: string;
  graphId?: string;
  evidenceHash?: string;
  assembledAtISO: string;
  cutoffISO?: string;
  windowMonths?: number;
  /** the exact basis every n sits on — reconciles to the gate audit. */
  basis: string;
  /** kept rows analysed (should equal gateAudit.postGate.total). */
  corpusN: number;
  analyses: Record<string, AnalysisOutput>;
  meta: {
    thresholds: AnalysesThresholds;
    generatedBy: 'computeBabyDiapersAnalyses';
    warnings: string[];
  };
}
