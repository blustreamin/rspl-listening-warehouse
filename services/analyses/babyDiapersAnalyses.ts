// ============================================================================
//  computeBabyDiapersAnalyses — the New Analyses layer (N-15 … N-58).
//
//  Runs at assemble time over the India-gated + windowed RAW ROWS (see
//  ANALYSES-PHASE-A-REPORT.md). Deterministic, pure, Node-safe. Produces a
//  versioned AnalysesBundleV1 for aggregations.analyses. It NEVER invents a
//  number: any cell below MIN_CELL_N carries INSUFFICIENT_SIGNAL, and any
//  analysis whose backing field is absent (SKU/variant) is emitted as
//  insufficient with an honest basis rather than a fabricated figure.
//
//  This module does not touch the DB, the network, or any LLM. Call it; store
//  its return on aggregations.analyses. It is not run against production here.
// ============================================================================

import type {
  AnalysesBundleV1, AnalysesContext, AnalysesThresholds,
  AnalysisCell, AnalysisOutput, ConfidenceTier, AnalysisInputRow, MeasuredValue,
} from './analysisTypes';
// .js suffixes: server import chain (see classifiers.ts note).
import { DEFAULT_THRESHOLDS, INSUFFICIENT_SIGNAL } from './analysisTypes.js';
import * as C from './classifiers.js';

// ── small utilities ─────────────────────────────────────────────────────────
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

const tierFor = (n: number, th: AnalysesThresholds): ConfidenceTier =>
  n >= th.STRONG_N ? 'STRONG' : n >= th.MODERATE_N ? 'MODERATE' : n >= th.MIN_CELL_N ? 'THIN' : 'INSUFFICIENT';

/** A tally: label -> { n, ids (capped) }. */
class Tally {
  private m = new Map<string, { n: number; ids: string[] }>();
  constructor(private cap: number) {}
  add(label: string, id?: string) {
    if (!label) return;
    const e = this.m.get(label) || { n: 0, ids: [] };
    e.n++;
    if (id && e.ids.length < this.cap) e.ids.push(id);
    this.m.set(label, e);
  }
  entries() { return [...this.m.entries()]; }
  total() { return [...this.m.values()].reduce((s, e) => s + e.n, 0); }
  size() { return this.m.size; }
}

const capIds = (ids: string[], cap: number) => ids.slice(0, cap);

/** Build a share AnalysisOutput from a tally. Cells below MIN_CELL_N are masked
 *  to INSUFFICIENT_SIGNAL but still report their n. */
const shareOutput = (
  id: string, label: string, basis: string, tally: Tally, th: AnalysesThresholds,
  denominatorOverride?: number,
): AnalysisOutput => {
  const total = denominatorOverride ?? tally.total();
  const cells: AnalysisCell[] = tally.entries()
    .sort((a, b) => b[1].n - a[1].n)
    .map(([labelName, e]) => {
      const measurable = e.n >= th.MIN_CELL_N && total > 0;
      const pct = total > 0 ? round1((e.n / total) * 100) : 0;
      const value: MeasuredValue = measurable ? pct : INSUFFICIENT_SIGNAL;
      return {
        label: labelName,
        kind: 'estimate' as const,
        value,
        pct: measurable ? pct : undefined,
        n: e.n,
        confidence: tierFor(e.n, th),
        source_ids: e.ids,
        note: measurable ? undefined : `below MIN_CELL_N (${th.MIN_CELL_N})`,
      };
    });
  const allIds = cells.flatMap((c) => c.source_ids);
  return {
    id, label, basis, n: total, confidence: tierFor(total, th),
    values: cells, source_ids: capIds(allIds, th.SOURCE_ID_CAP),
  };
};

/** A scalar/insufficient output — used when a field is absent or a gate fails. */
const insufficientOutput = (id: string, label: string, basis: string, note: string): AnalysisOutput => ({
  id, label, basis, n: 0, confidence: 'INSUFFICIENT',
  values: [{ label: 'value', value: INSUFFICIENT_SIGNAL, n: 0, confidence: 'INSUFFICIENT', source_ids: [], note }],
  source_ids: [], note,
});

/** Month-count cells for a series (kind:'count' — a census count is never
 *  masked; only its confidence tier reflects thinness). Sorted by month key. */
const monthCountCells = (monthTally: Tally, th: AnalysesThresholds): AnalysisCell[] =>
  monthTally.entries()
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, e]) => ({
      label: m, kind: 'count' as const, value: e.n, n: e.n,
      confidence: tierFor(e.n, th), source_ids: e.ids,
    }));

const percentile = (sorted: number[], p: number): number | null => {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

// ── the per-row derived record ──────────────────────────────────────────────
interface Derived {
  id: string;
  brand?: string;
  platform: string;
  rating: number;
  isCommerce: boolean;
  state?: string;
  dated: boolean;
  dateMs: number | null;
  text: string;
  role: string | null;
  lifestage: string | null;
  occasions: string[];
  format: string | null;
  avoidance: string | null;
  segment: string | null;
  channel: string | null;
  urgency: string | null;
  drivers: string[];
  momStage: string | null;
  pack: C.PackSignal;
  price: number | null;
  organic: string[];
}

const TRACKED_LOWER = new Set(
  ['Lovingle', 'Pampers', 'MamyPoko', 'Huggies', 'Little Angels', 'Bumtum', 'Supples',
    'Mee Mee', 'Himalaya', 'LuvLap', 'Teddyy Baby', 'Snuggy', 'Bey Bee', 'SuperBottoms',
    'Babyhug', 'Dabur', 'R for Rabbit'].map((b) => b.toLowerCase()),
);

const derive = (row: AnalysisInputRow): Derived => {
  const text = C.resolveText(row);
  const brand = row.event?.commerce?.brand;
  const rating = Number(row.event?.commerce?.rating) || 0;
  const dd = C.datednessOf(row);
  return {
    id: row.event?.evidenceId || '',
    brand: brand && brand !== 'Generic/Other' ? brand : undefined,
    platform: C.sourcePlatform(row),
    rating,
    isCommerce: row.event?.eventType === 'COMMERCE_REVIEW',
    state: row.event?.geo?.state,
    dated: dd.dated,
    dateMs: dd.dateMs,
    text,
    role: C.classifyCaregiverRole(text),
    lifestage: C.classifyLifestage(text),
    occasions: C.classifyOccasions(text),
    format: C.classifyFormat(row),
    avoidance: C.classifyAvoidance(text),
    segment: C.priceSegmentForBrand(brand),
    channel: C.classifyChannel(text),
    urgency: C.classifyUrgency(text),
    drivers: C.classifyDrivers(text),
    momStage: C.classifyMomStage(text),
    pack: C.extractPackSize(row),
    price: C.extractPriceInr(row),
    organic: C.organicBrandScan(text, TRACKED_LOWER),
  };
};

/** Generic split: build one share output per value of a split key. */
const splitShare = (
  baseId: string, baseLabel: string, basis: string,
  records: Derived[], splitKey: (d: Derived) => string | null,
  cellKey: (d: Derived) => string[] | string | null,
  th: AnalysesThresholds,
): Record<string, AnalysisOutput> => {
  const groups = new Map<string, Tally>();
  for (const d of records) {
    const sk = splitKey(d);
    if (!sk) continue;
    const ck = cellKey(d);
    const cells = Array.isArray(ck) ? ck : ck ? [ck] : [];
    if (!cells.length) continue;
    const tally = groups.get(sk) || new Tally(th.SOURCE_ID_CAP);
    for (const c of cells) tally.add(c, d.id);
    groups.set(sk, tally);
  }
  const out: Record<string, AnalysisOutput> = {};
  for (const [sk, tally] of groups) {
    out[sk] = shareOutput(`${baseId}:${sk}`, `${baseLabel} — ${sk}`, basis, tally, th);
  }
  return out;
};

// ============================================================================
export function computeBabyDiapersAnalyses(
  rows: AnalysisInputRow[],
  ctx: AnalysesContext,
): AnalysesBundleV1 {
  const th: AnalysesThresholds = { ...DEFAULT_THRESHOLDS, ...(ctx.thresholds || {}) };
  const warnings: string[] = [];
  const records = rows.map(derive);
  const N = records.length;
  const analyses: Record<string, AnalysisOutput> = {};

  const commerce = records.filter((r) => r.isCommerce && r.rating >= 1);

  // ── N-15/16 · Caregiver-role share (incl. long tail) ─────────────────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.role) t.add(r.role, r.id);
    const out = shareOutput('N-15', 'Caregiver-role share (share of records stating a role)',
      'records with a detected caregiver-role cue in text; shares sum to 100% over that base', t, th);
    out.note = `role stated in ${t.total()} of ${N} records; the remainder carry no role cue and are not back-filled`;
    analyses['N-15'] = out;
    analyses['N-16'] = { ...out, id: 'N-16', label: 'Caregiver-role long tail (same base, tail cells)' };
  }

  // ── N-19 · Lifestage classifier → six bands ──────────────────────────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    let classified = 0;
    for (const r of records) if (r.lifestage) { t.add(r.lifestage, r.id); classified++; }
    const out = shareOutput('N-19', 'Lifestage distribution (six bands)',
      'records with an explicit age cue or milestone; unclassified records reported, never back-filled', t, th);
    out.note = `${classified}/${N} records classified into a band; ${N - classified} unclassified`;
    analyses['N-19'] = out;
  }

  // ── N-25 · Occasions, split by segment × lifestage ───────────────────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    let base = 0;
    for (const r of records) if (r.occasions.length) { base++; for (const o of r.occasions) t.add(o, r.id); }
    const out = shareOutput('N-25', 'Usage occasions',
      'records mentioning ≥1 occasion (multi-count); split by price segment and lifestage', t, th, base);
    out.splits = {
      by_segment: splitShare('N-25', 'Occasions', 'occasion share within segment', records, (d) => d.segment, (d) => d.occasions, th),
      by_lifestage: splitShare('N-25', 'Occasions', 'occasion share within lifestage', records, (d) => d.lifestage, (d) => d.occasions, th),
    };
    analyses['N-25'] = out;
  }

  // ── N-26 · Formats + avoidance, split by segment × lifestage ─────────────
  {
    const tf = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.format) tf.add(r.format, r.id);
    const fmt = shareOutput('N-26', 'Diaper format share',
      'records with a detected format (style: token or text); split by segment and lifestage', tf, th);
    fmt.splits = {
      by_segment: splitShare('N-26', 'Format', 'format share within segment', records, (d) => d.segment, (d) => d.format, th),
      by_lifestage: splitShare('N-26', 'Format', 'format share within lifestage', records, (d) => d.lifestage, (d) => d.format, th),
    };
    analyses['N-26'] = fmt;
    const ta = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.avoidance) ta.add(r.avoidance, r.id);
    analyses['N-26b'] = shareOutput('N-26b', 'Diaper avoidance reasons',
      'records with an avoidance frame + reason', ta, th);
  }

  // ── N-27 · Seasonality — 3-year monthly series, region lens ──────────────
  {
    const dated = records.filter((r) => r.dated && r.dateMs !== null);
    if (dated.length < th.MIN_CELL_N) {
      analyses['N-27'] = insufficientOutput('N-27', 'Seasonality (monthly series)',
        'dated records only (undated rows excluded to avoid the assembly-now() spike)',
        `only ${dated.length} dated records`);
    } else {
      const maxMs = Math.max(...dated.map((r) => r.dateMs as number));
      const cutoffMs = ctx.cutoffISO ? new Date(ctx.cutoffISO).getTime()
        : maxMs - (ctx.windowMonths || 36) * 30 * 86400000;
      const monthT = new Tally(th.SOURCE_ID_CAP);
      for (const r of dated) if ((r.dateMs as number) >= cutoffMs) monthT.add(C.monthKey(r.dateMs as number), r.id);
      // zero-fill the window into an ordered month series
      const series: AnalysisCell[] = [];
      const start = new Date(cutoffMs); const end = new Date(maxMs);
      const counts = new Map(monthT.entries().map(([m, e]) => [m, e]));
      for (let y = start.getUTCFullYear(), mo = start.getUTCMonth();
        y < end.getUTCFullYear() || (y === end.getUTCFullYear() && mo <= end.getUTCMonth());) {
        const key = `${y}-${mo + 1 < 10 ? '0' : ''}${mo + 1}`;
        const e = counts.get(key);
        series.push({ label: key, kind: 'count', value: e ? e.n : 0, n: e ? e.n : 0,
          confidence: e ? tierFor(e.n, th) : 'THIN', source_ids: e ? e.ids : [] });
        mo++; if (mo > 11) { mo = 0; y++; }
      }
      const out: AnalysisOutput = {
        id: 'N-27', label: 'Seasonality — monthly mention series',
        basis: `dated + India-gated records within the ${ctx.windowMonths || 36}-month window; zero-filled`,
        n: monthT.total(), confidence: tierFor(monthT.total(), th), values: series,
        source_ids: capIds(series.flatMap((s) => s.source_ids), th.SOURCE_ID_CAP),
        note: 'region lens in splits.by_region (top states only where n clears threshold)',
      };
      // region lens
      const byRegion: Record<string, AnalysisOutput> = {};
      const stateTally = new Tally(1e9);
      for (const r of dated) if (r.state) stateTally.add(r.state, r.id);
      const topStates = stateTally.entries().sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(([s]) => s);
      for (const st of topStates) {
        const mt = new Tally(th.SOURCE_ID_CAP);
        for (const r of dated) if (r.state === st && (r.dateMs as number) >= cutoffMs) mt.add(C.monthKey(r.dateMs as number), r.id);
        if (mt.total() >= th.MIN_CELL_N) byRegion[st] = {
          id: `N-27:${st}`, label: `Seasonality — ${st}`, basis: 'dated records for the state (monthly counts)',
          n: mt.total(), confidence: tierFor(mt.total(), th), values: monthCountCells(mt, th),
          source_ids: capIds(mt.entries().flatMap(([, e]) => e.ids), th.SOURCE_ID_CAP),
        };
      }
      out.splits = { by_region: byRegion };
      analyses['N-27'] = out;
    }
  }

  // ── N-31 · Channel share + rank (source-platform STRONG; purchase-channel THIN) ─
  {
    const platT = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) platT.add(r.platform, r.id);
    const platform = shareOutput('N-31', 'Source-platform share + rank',
      'every record by scrape platform (STRONG signal; NOT purchase channel)', platT, th);
    const chanT = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.channel) chanT.add(r.channel, r.id);
    const channel = shareOutput('N-31b', 'Purchase-channel share + rank',
      'records naming a purchase channel in text (THIN — text-mined)', chanT, th);
    analyses['N-31'] = platform;
    analyses['N-31b'] = channel;
  }

  // ── N-33 · Urgency vs planned, per channel ───────────────────────────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.urgency) t.add(r.urgency, r.id);
    const out = shareOutput('N-33', 'Urgency vs planned purchase',
      'records with an urgency/planned cue (THIN — lexical proxy); split by channel', t, th);
    out.splits = { by_channel: splitShare('N-33', 'Urgency', 'urgency split within channel', records, (d) => d.channel, (d) => d.urgency, th) };
    analyses['N-33'] = out;
  }

  // ── N-34 · Channel preference by segment / lifestage / occasion ──────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.channel) t.add(r.channel, r.id);
    const out = shareOutput('N-34', 'Channel preference',
      'purchase-channel records; split by segment, lifestage, occasion', t, th);
    out.splits = {
      by_segment: splitShare('N-34', 'Channel', 'channel within segment', records, (d) => d.segment, (d) => d.channel, th),
      by_lifestage: splitShare('N-34', 'Channel', 'channel within lifestage', records, (d) => d.lifestage, (d) => d.channel, th),
      by_occasion: splitShare('N-34', 'Channel', 'channel within occasion', records,
        (d) => d.occasions[0] || null, (d) => d.channel, th),
    };
    analyses['N-34'] = out;
  }

  // ── N-35/36 · SKU frequency + preference — BLOCKED (no SKU/variant on events) ─
  analyses['N-35'] = insufficientOutput('N-35', 'Purchase frequency by SKU',
    'requires commerce.sku/variant; events drop it and raw sku/variant fill is unknown (BLOCKED-DECISIONS B-2)',
    'no SKU key available on the current schema');
  analyses['N-36'] = insufficientOutput('N-36', 'SKU preference by segment/lifestage/occasion',
    'requires commerce.sku/variant (BLOCKED-DECISIONS B-2)', 'no SKU key available on the current schema');

  // ── N-37 · SKU laddering — FEASIBILITY FIRST ─────────────────────────────
  {
    const hits = records.filter((r) => r.pack.hit).length;
    const hitRate = N > 0 ? round2(hits / N) : 0;
    if (hitRate < th.PACK_HITRATE_MIN) {
      const out = insufficientOutput('N-37', 'SKU interaction / pack-size laddering',
        `pack-size extraction hit-rate ${hitRate} < PACK_HITRATE_MIN ${th.PACK_HITRATE_MIN}; true laddering needs per-user SKU sequences (absent)`,
        `pack signal in only ${hits}/${N} records`);
      out.values[0].note = `hit_rate=${hitRate}; feasibility gate not cleared`;
      analyses['N-37'] = out;
    } else {
      const bandT = new Tally(th.SOURCE_ID_CAP);
      for (const r of records) if (r.pack.packBand) bandT.add(r.pack.packBand, r.id);
      const out = shareOutput('N-37', 'Pack-band distribution (laddering proxy)',
        `pack-band tokens on ${hits}/${N} records (hit-rate ${hitRate}); coarse price-band proxy, NOT true SKU sequences`, bandT, th);
      out.note = 'true 99→399→single laddering needs per-user SKU sequences, which the corpus does not carry';
      analyses['N-37'] = out;
    }
    warnings.push(`N-37 pack-size hit-rate = ${hitRate} (gate ${th.PACK_HITRATE_MIN})`);
  }

  // ── N-39 · Organic brand scan + SOV ──────────────────────────────────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) for (const b of r.organic) t.add(b, r.id);
    const out = shareOutput('N-39', 'Organic (untracked) brand scan + SOV',
      'untracked brand tokens found in text, share vs full corpus N', t, th, N);
    out.note = 'Babyhug is already tracked in the perception grid; this scan targets brands NOT in the grid';
    analyses['N-39'] = out;
  }

  // ── N-41 · Brand-selection journey by lifestage ──────────────────────────
  {
    const journeyCue = (d: Derived): string | null => {
      const t = d.text.toLowerCase();
      if (/recommend|doctor|paediatrician|pediatrician|hospital/.test(t)) return 'Expert/HCP-led';
      if (/influencer|instagram|youtube|reel|blog/.test(t)) return 'Influencer/social-led';
      if (/friend|family|mother in law|saas|mom group/.test(t)) return 'Word-of-mouth';
      if (/review|rating|amazon|flipkart|compared/.test(t)) return 'Review/marketplace-led';
      if (/tried|sample|trial|first tried/.test(t)) return 'Trial-led';
      return null;
    };
    const t = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) { const c = journeyCue(r); if (c) t.add(c, r.id); }
    const out = shareOutput('N-41', 'Brand-selection journey mode',
      'records with a journey cue (THIN); split by lifestage', t, th);
    out.splits = { by_lifestage: splitShare('N-41', 'Journey', 'journey mode within lifestage', records, (d) => d.lifestage, (d) => journeyCue(d), th) };
    analyses['N-41'] = out;
  }

  // ── N-43/44 · Category drivers → brand scores (R&R) ──────────────────────
  {
    // driver -> brand -> {ratingSum, n, ids}
    const acc = new Map<string, Map<string, { sum: number; n: number; ids: string[] }>>();
    for (const r of commerce) {
      if (!r.brand || !r.drivers.length) continue;
      for (const d of r.drivers) {
        const byBrand = acc.get(d) || new Map();
        const cell = byBrand.get(r.brand) || { sum: 0, n: 0, ids: [] };
        cell.sum += r.rating; cell.n++; if (cell.ids.length < th.SOURCE_ID_CAP) cell.ids.push(r.id);
        byBrand.set(r.brand, cell); acc.set(d, byBrand);
      }
    }
    const byDriver: Record<string, AnalysisOutput> = {};
    let grand = 0;
    for (const [driver, byBrand] of acc) {
      const cells: AnalysisCell[] = [...byBrand.entries()]
        .sort((a, b) => b[1].n - a[1].n)
        .map(([brand, c]) => {
          grand += c.n;
          const measurable = c.n >= th.MIN_CELL_N;
          return {
            label: brand,
            value: measurable ? round2(c.sum / c.n) : INSUFFICIENT_SIGNAL,
            n: c.n, confidence: tierFor(c.n, th), source_ids: c.ids,
            note: measurable ? 'mean R&R rating (1-5) among reviews mentioning this driver' : `below MIN_CELL_N (${th.MIN_CELL_N})`,
          };
        });
      byDriver[driver] = {
        id: `N-43:${driver}`, label: `Driver score by brand — ${driver}`,
        basis: 'mean commerce R&R rating among reviews mentioning the driver (cite Amazon/Flipkart/FirstCry)',
        n: cells.reduce((s, c) => s + c.n, 0), confidence: tierFor(cells.reduce((s, c) => s + c.n, 0), th),
        values: cells, source_ids: capIds(cells.flatMap((c) => c.source_ids), th.SOURCE_ID_CAP),
      };
    }
    analyses['N-43'] = {
      id: 'N-43', label: 'Category drivers → brand scores (R&R)',
      basis: 'drivers established from data; brand score = mean rating among driver-mentioning reviews',
      n: grand, confidence: tierFor(grand, th),
      values: Object.keys(byDriver).map((d) => ({ label: d, kind: 'count' as const, value: byDriver[d].n, n: byDriver[d].n, confidence: byDriver[d].confidence, source_ids: [] })),
      source_ids: [], splits: { by_driver: byDriver },
    };
    analyses['N-44'] = insufficientOutput('N-44', 'Driver scores at VARIANT level (top-10 variants)',
      'requires a variant key on events; absent (BLOCKED-DECISIONS B-2). Brand-level scores are in N-43',
      'no variant key available on the current schema');
  }

  // ── N-45/46 · Trial / repeat / switch ────────────────────────────────────
  {
    const t = new Tally(th.SOURCE_ID_CAP);
    const switchT = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) {
      const tl = r.text.toLowerCase();
      if (/first tried|trial|tried .* diaper|sample/.test(tl)) t.add('Trial', r.id);
      if (/repeat|repurchase|buy again|reorder|always buy|loyal|stick to/.test(tl)) t.add('Repeat', r.id);
      const sw = C.detectSwitch(r.text, r.brand ? [r.brand] : []);
      if (sw) {
        t.add('Switch', r.id);
        const key = `${sw.from || '?'} → ${sw.to || '?'}${sw.reason ? ` (${sw.reason})` : ''}`;
        switchT.add(key, r.id);
      }
    }
    analyses['N-45'] = shareOutput('N-45', 'Trial / repeat / switch mix',
      'records with a trial/repeat/switch frame (THIN — lexical); shares over that base', t, th);
    const switches = shareOutput('N-46', 'Top brand→brand switches with reasons',
      'records with a directional switch frame; brand-level only', switchT, th);
    switches.note = 'variant-level switches are INSUFFICIENT (no variant key — BLOCKED-DECISIONS B-2)';
    analyses['N-46'] = switches;
  }

  // ── N-47/48/49 · Price ceilings (tape vs pant; by lifestage; by pack size) ─
  {
    const priced = records.filter((r) => r.price !== null);
    const fill = N > 0 ? round2(priced.length / N) : 0;
    warnings.push(`price fill-rate = ${fill} (${priced.length}/${N})`);
    const ceilingCells = (subset: Derived[], label: string): AnalysisCell => {
      const vals = subset.map((r) => r.price as number).sort((a, b) => a - b);
      if (vals.length < th.MIN_CELL_N) {
        return { label, value: INSUFFICIENT_SIGNAL, n: vals.length, confidence: 'INSUFFICIENT', source_ids: capIds(subset.map((s) => s.id), th.SOURCE_ID_CAP), note: `below MIN_CELL_N (${th.MIN_CELL_N})` };
      }
      const p90 = percentile(vals, 90);
      return { label: `${label} · ceiling(p90)=₹${p90}`, value: p90 as number, pct: undefined, n: vals.length, confidence: tierFor(vals.length, th), source_ids: capIds(subset.map((s) => s.id), th.SOURCE_ID_CAP), note: `p50=₹${percentile(vals, 50)} p75=₹${percentile(vals, 75)}` };
    };
    if (priced.length < th.MIN_CELL_N) {
      analyses['N-47'] = insufficientOutput('N-47', 'Price ceilings — tape vs pant',
        `structured price is off events; raw+text fill only ${fill} (BLOCKED-DECISIONS B-2)`, `only ${priced.length} priced records`);
    } else {
      const tape = priced.filter((r) => r.format === 'Tape');
      const pant = priced.filter((r) => r.format === 'Pant / pull-up');
      analyses['N-47'] = {
        id: 'N-47', label: 'Price ceilings — tape vs pant',
        basis: `₹ from raw price field or text mention (fill ${fill}); ceiling = p90 of observed prices`,
        n: priced.length, confidence: tierFor(priced.length, th),
        values: [ceilingCells(tape, 'Tape'), ceilingCells(pant, 'Pant / pull-up')],
        source_ids: capIds(priced.map((r) => r.id), th.SOURCE_ID_CAP),
      };
    }
    // N-48 by lifestage, N-49 by pack size
    const byLifestage: Record<string, AnalysisOutput> = {};
    for (const band of C.LIFESTAGE_BANDS) {
      const sub = priced.filter((r) => r.lifestage === band);
      byLifestage[band] = { id: `N-48:${band}`, label: `Price ceiling — ${band}`, basis: 'priced records in band', n: sub.length, confidence: tierFor(sub.length, th), values: [ceilingCells(sub, band)], source_ids: capIds(sub.map((s) => s.id), th.SOURCE_ID_CAP) };
    }
    analyses['N-48'] = { id: 'N-48', label: 'Price ceilings by lifestage', basis: 'priced records split by lifestage band', n: priced.length, confidence: tierFor(priced.length, th), values: [], source_ids: [], splits: { by_lifestage: byLifestage } };
    const byPack: Record<string, AnalysisOutput> = {};
    for (const band of ['99', '399', '999', 'laddi']) {
      const sub = priced.filter((r) => r.pack.packBand === band);
      byPack[band] = { id: `N-49:${band}`, label: `Price ceiling — pack ${band}`, basis: 'priced records in pack band', n: sub.length, confidence: tierFor(sub.length, th), values: [ceilingCells(sub, `pack ${band}`)], source_ids: capIds(sub.map((s) => s.id), th.SOURCE_ID_CAP) };
    }
    analyses['N-49'] = { id: 'N-49', label: 'Price ceilings by pack size', basis: 'priced records split by pack band (feasibility-linked to N-37)', n: priced.length, confidence: tierFor(priced.length, th), values: [], source_ids: [], splits: { by_pack: byPack } };
  }

  // ── N-58 · S20 coverage stats ────────────────────────────────────────────
  {
    // lifestage distribution (reuse N-19), first-vs-second mom, geography, SKU coverage
    const momT = new Tally(th.SOURCE_ID_CAP);
    for (const r of records) if (r.momStage) momT.add(r.momStage, r.id);
    const geoT = new Tally(th.SOURCE_ID_CAP);
    let geoIdentified = 0;
    for (const r of records) if (r.state) { geoT.add(r.state, r.id); geoIdentified++; }
    const skuCoverage = 0; // no SKU key
    const coverage: AnalysisOutput = {
      id: 'N-58', label: 'S20 coverage stats',
      basis: 'coverage diagnostics over the India-gated corpus',
      n: N, confidence: tierFor(N, th),
      values: [
        { label: 'records', kind: 'count', value: N, n: N, confidence: tierFor(N, th), source_ids: [] },
        { label: 'lifestage-classified', kind: 'count', value: records.filter((r) => r.lifestage).length, n: records.filter((r) => r.lifestage).length, confidence: 'MODERATE', source_ids: [] },
        { label: 'geo-identified (state)', kind: 'count', value: geoIdentified, n: geoIdentified, confidence: tierFor(geoIdentified, th), source_ids: [] },
        { label: 'SKU-covered', kind: 'count', value: INSUFFICIENT_SIGNAL, n: skuCoverage, confidence: 'INSUFFICIENT', source_ids: [], note: 'no SKU key on the current schema' },
      ],
      source_ids: [],
      splits: {
        first_vs_second_mom: { all: shareOutput('N-58:mom', 'First-vs-second-time mom', 'language-signal classifier over text (precision limited — report honestly)', momT, th) },
        by_geography: { all: shareOutput('N-58:geo', 'Geography (post-gate, state level)', 'records with a resolved state', geoT, th) },
        by_lifestage: { all: analyses['N-19'] },
      },
      note: 'first-vs-second-mom precision is limited; the `lang` field is unusable (hardcoded en at ingestion) so the signal is text-derived only',
    };
    analyses['N-58'] = coverage;
  }

  return {
    version: 'analyses_v1',
    projectId: ctx.projectId,
    graphId: ctx.graphId,
    evidenceHash: ctx.evidenceHash,
    assembledAtISO: ctx.assembledAtISO,
    cutoffISO: ctx.cutoffISO,
    windowMonths: ctx.windowMonths,
    basis: `India-gated (V-01) + ${ctx.windowMonths || 36}-month window (V-02), raw-row pass; every n reconciles to gateAudit.postGate.total`,
    corpusN: N,
    analyses,
    meta: { thresholds: th, generatedBy: 'computeBabyDiapersAnalyses', warnings },
  };
}
