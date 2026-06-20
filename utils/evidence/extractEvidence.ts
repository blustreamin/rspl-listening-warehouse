/**
 * EVIDENCE EXTRACTION (UI-only, pure, zero dependencies)
 * ----------------------------------------------------------------------------
 * Every section's `content` jsonb has a DIFFERENT bespoke shape and nests its
 * consumer verbatims at different depths under different parent keys (usually
 * "verbatims", but sometimes "consumer_evidence" or "consumer_statements", and
 * occasionally none at all). We therefore do NOT key on the container — we key
 * on the universal object signature every verbatim shares:
 *
 *     { quote: string, source: string, consumer: string }
 *
 * Optional fields (rendered only where present, never assumed):
 *     confidence: "HIGH" | "MED" | "LOW"   (today only on category_context)
 *     data_points: number                  (~8 of 12 sections)
 *
 * `confidence` and `data_points` are frequently NOT on the verbatim itself but
 * on an ancestor (e.g. a card carries one confidence for all of its quotes), so
 * each verbatim inherits these from the nearest ancestor that has them. We also
 * capture a `groupLabel` from the nearest headline/title in the ancestry so the
 * UI can group verbatims under their parent theme.
 *
 * The walk is fully defensive: arbitrary nesting, arrays, mixed types, missing
 * fields and reference cycles are all handled without ever throwing.
 */

export type Confidence = 'HIGH' | 'MED' | 'LOW';

export interface Verbatim {
  quote: string;
  source: string;
  consumer: string;
  /** Inherited from the verbatim or its nearest ancestor that defines it. */
  confidence?: Confidence;
  /** Inherited from the verbatim or its nearest ancestor that defines it. */
  data_points?: number;
  /** Nearest headline/title in the ancestry — used to group quotes by theme. */
  groupLabel?: string;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface ConfidenceCount {
  level: Confidence;
  count: number;
}

export interface EvidenceSummary {
  total: number;
  /** Count per (platform-level) source, descending. */
  sourceMix: SourceCount[];
  /** Only levels that actually appear. Empty when no verbatim carries confidence. */
  confidenceMix: ConfidenceCount[];
  hasConfidence: boolean;
  /** Sum of data_points across verbatims that carry it. */
  totalDataPoints: number;
  /** How many verbatims carried a data_points value. */
  withDataPoints: number;
}

// Keys, in priority order, that can supply a group label for descendant quotes.
const LABEL_KEYS = [
  'headline', 'title', 'boldTitle', 'claim', 'need', 'heading', 'parameter',
  'attribute', 'pain_point', 'cluster_name', 'pathway', 'occasion', 'profile_name',
  'name', 'theme', 'label', 'brand',
];

interface InheritedContext {
  confidence?: Confidence;
  data_points?: number;
  label?: string;
}

const isObject = (val: unknown): val is Record<string, any> =>
  !!val && typeof val === 'object' && !Array.isArray(val);

/** A verbatim is any object carrying the universal { quote, source, consumer } string signature. */
const isVerbatim = (node: any): boolean =>
  isObject(node) &&
  typeof node.quote === 'string' && node.quote.trim().length > 0 &&
  typeof node.source === 'string' &&
  typeof node.consumer === 'string';

const normConfidence = (val: any): Confidence | undefined => {
  if (typeof val !== 'string') return undefined;
  const u = val.trim().toUpperCase();
  if (u === 'HIGH' || u === 'H') return 'HIGH';
  if (u === 'MED' || u === 'MEDIUM' || u === 'MID' || u === 'M') return 'MED';
  if (u === 'LOW' || u === 'L') return 'LOW';
  return undefined;
};

const normDataPoints = (val: any): number | undefined => {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return val;
  if (typeof val === 'string') {
    const n = parseInt(val.replace(/[, ]/g, ''), 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return undefined;
};

const pickLabel = (node: Record<string, any>): string | undefined => {
  for (const key of LABEL_KEYS) {
    const v = node[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
};

/**
 * Recursively collect every verbatim in arbitrary section content.
 * Never throws — returns [] for anything it cannot read.
 */
export function extractEvidence(content: any): Verbatim[] {
  const out: Verbatim[] = [];
  const seen = new WeakSet<object>();

  const walk = (node: any, inherited: InheritedContext): void => {
    if (node == null) return;

    if (Array.isArray(node)) {
      if (seen.has(node)) return;
      seen.add(node);
      for (const item of node) walk(item, inherited);
      return;
    }

    if (!isObject(node)) return;
    if (seen.has(node)) return;
    seen.add(node);

    // This node may carry confidence / data_points (own value overrides ancestor).
    const confidence = normConfidence(node.confidence) ?? inherited.confidence;
    const data_points = normDataPoints(node.data_points) ?? inherited.data_points;

    if (isVerbatim(node)) {
      out.push({
        quote: String(node.quote).trim(),
        source: typeof node.source === 'string' ? node.source.trim() : '',
        consumer: typeof node.consumer === 'string' ? node.consumer.trim() : '',
        confidence,
        data_points,
        groupLabel: inherited.label,
      });
      // A verbatim is a leaf for our purposes — do not descend into it.
      return;
    }

    // A non-verbatim object can contribute the group label for its descendants.
    const label = pickLabel(node) ?? inherited.label;
    const childContext: InheritedContext = { confidence, data_points, label };

    for (const key of Object.keys(node)) {
      walk(node[key], childContext);
    }
  };

  try {
    walk(content, {});
  } catch {
    // Fully defensive: any unexpected structure yields whatever we collected so far.
  }

  return out;
}

/** Reduce a source string to its platform prefix (text before the first "·"/"|" separator). */
export function platformOfSource(source: string): string {
  if (!source || !source.trim()) return 'Unattributed';
  const first = source.split(/[·|]/)[0].trim();
  return first || source.trim();
}

/** Build the top-of-panel "insight" layer from a set of verbatims. */
export function summarizeEvidence(verbatims: Verbatim[]): EvidenceSummary {
  const sourceCounts = new Map<string, number>();
  const confCounts: Record<Confidence, number> = { HIGH: 0, MED: 0, LOW: 0 };
  let hasConfidence = false;
  let totalDataPoints = 0;
  let withDataPoints = 0;

  for (const v of verbatims) {
    const platform = platformOfSource(v.source);
    sourceCounts.set(platform, (sourceCounts.get(platform) || 0) + 1);

    if (v.confidence) {
      confCounts[v.confidence] += 1;
      hasConfidence = true;
    }
    if (typeof v.data_points === 'number') {
      totalDataPoints += v.data_points;
      withDataPoints += 1;
    }
  }

  const sourceMix: SourceCount[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

  const confidenceMix: ConfidenceCount[] = (['HIGH', 'MED', 'LOW'] as Confidence[])
    .filter((level) => confCounts[level] > 0)
    .map((level) => ({ level, count: confCounts[level] }));

  return {
    total: verbatims.length,
    sourceMix,
    confidenceMix,
    hasConfidence,
    totalDataPoints,
    withDataPoints,
  };
}

/** Group verbatims by their groupLabel, preserving first-seen order. */
export function groupVerbatims(verbatims: Verbatim[]): Array<{ label: string; items: Verbatim[] }> {
  const groups = new Map<string, Verbatim[]>();
  const order: string[] = [];
  const UNGROUPED = 'Other evidence';

  for (const v of verbatims) {
    const key = v.groupLabel && v.groupLabel.trim() ? v.groupLabel.trim() : UNGROUPED;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(v);
  }

  return order.map((label) => ({ label, items: groups.get(label)! }));
}
