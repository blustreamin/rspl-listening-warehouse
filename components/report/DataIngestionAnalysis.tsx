/* ============================================================================
   DataIngestionAnalysis — report section 20 (`data_foundation`) appendix panel.
   Self-chrome warm-premium "evidence base" ledger for the Lovingle baby-diaper
   report. Block order matches the approved mockup:
     [header + EVIDENCE BASE badge] → [4 KPIs] → [period banner + 2 definitions]
     → [Platform Breakdown | Data Type Classification]
     → [Brand Mentions (with avg rating) | Geographic Coverage] → [footnote].

   Skin: Lovingle tokens (canvas #FFFDF9, accent #F26F21, structure #1C3C8E,
   secondary #56C2D6, ink #2A2A33; Fraunces display + Inter body). All classes
   are prefixed `lvig-` and scoped under `.lvig-panel` in styles/lovingle.css so
   nothing collides with the `.lv-scope` chrome.

   DATA (05 Jul rebuild): every figure is LIVE-DERIVED at render time —
     • GET /api/datasets?project_id     → file count, uploaded row totals,
       source-tag families, upload window;
     • GET /api/evidence?stats=1        → latest evidence_graphs row:
       event_count (the deduplicated Total Data Points) + the aggregations
       jsonb emitted by graph assembly (platform breakdown, data-type split,
       verbatims, ratings, geo, collection period).
   No static snapshot exists any more — the panel cannot go stale. Corpus
   stats are computed ONCE at graph-assembly time (babyDiapersIngestion);
   this component only formats them. When no graph exists yet, the panel
   shows registry stats with an "assembled on first report run" note.
   Pass a `data` prop to override (used nowhere in production routing).
   ============================================================================ */

import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { getShareSnapshot } from '../../lib/shareSnapshot';

type Tone = 'orange' | 'teal' | 'blue' | 'cream';
type IconKey = 'dish' | 'bars' | 'chat' | 'link' | 'star' | 'cal' | 'doc' | 'quote' | 'info' | 'glass';

interface Kpi { icon: IconKey; tone: Tone; value: string; label: string; }
interface Platform { name: string; pct: number; count: string; }
interface DataType { name: string; pct: number; count: string; tone: 'orange' | 'teal'; }
interface Chip { name: string; value: string; }
interface Brand { name: string; count: number; pct: number; rating?: number; }
interface Sentiment { name: string; count: number; pct: number; }
interface Geo { name: string; count: number; pct: number; }
interface Def { icon: IconKey; term: string; body: string; }

export interface IngestLedger {
  title: string; badge: string; sub: string; period: string; flag?: string;
  defs: Def[]; kpis: Kpi[]; platforms: Platform[]; types: DataType[];
  sources: Chip[]; brands: Brand[]; sentiment?: Sentiment[]; geo: Geo[];
  geoNote?: string; footnote: string;
}

// ── live derivation ──────────────────────────────────────────────────────────

interface DatasetMeta { name?: string; source_tag?: string; row_count?: number; uploaded_at?: string; }
interface GraphStats { event_count: number; dataset_count?: number; generated_at?: string; aggregations: Record<string, any>; }

const fmt = (n: number): string => n.toLocaleString('en-US');
const pct1 = (part: number, total: number): number => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);
const fmtDay = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const TAG_FAMILIES: Array<[string, string]> = [
  ['amazon', 'Amazon'], ['flipkart', 'Flipkart'], ['firstcry', 'FirstCry'],
  ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['awario', 'Social listening'],
];
const tagFamily = (tag?: string): string => {
  const t = (tag || '').toLowerCase();
  for (const [k, v] of TAG_FAMILIES) if (t.includes(k)) return v;
  return 'Other';
};
const COMMERCE_FAMILIES = new Set(['Amazon', 'Flipkart', 'FirstCry']);

const DEFS: Def[] = [
  { icon: 'doc', term: 'Total Data Points:', body: ' Unique records ingested across all sources (e-commerce reviews + social listening) after cross-file and cross-alert deduplication.' },
  { icon: 'quote', term: 'Usable Verbatims:', body: ' Records carrying meaningful consumer text (≥10 characters) usable as evidence quotes. Excludes empty / non-textual rows.' },
];

const registryBits = (datasets: DatasetMeta[]) => {
  const files = datasets.length;
  const rawRows = datasets.reduce((s, d) => s + (d.row_count || 0), 0);
  const familyRows: Record<string, number> = {};
  datasets.forEach(d => {
    const f = tagFamily(d.source_tag);
    familyRows[f] = (familyRows[f] || 0) + (d.row_count || 0);
  });
  const uploads = datasets.map(d => d.uploaded_at || '').filter(Boolean).sort();
  const uploadLine = uploads.length
    ? (fmtDay(uploads[0]) === fmtDay(uploads[uploads.length - 1])
        ? `corpus uploaded ${fmtDay(uploads[0])}`
        : `corpus uploaded ${fmtDay(uploads[0])} – ${fmtDay(uploads[uploads.length - 1])}`)
    : 'no uploads registered';
  return { files, rawRows, familyRows, uploadLine };
};

/** Registry-only ledger — no evidence graph assembled yet. Raw counts, said so. */
const buildRegistryLedger = (datasets: DatasetMeta[]): IngestLedger => {
  const { files, rawRows, familyRows, uploadLine } = registryBits(datasets);
  const fams = Object.entries(familyRows).sort((a, b) => b[1] - a[1]);
  const commerceRows = fams.filter(([f]) => COMMERCE_FAMILIES.has(f)).reduce((s, [, n]) => s + n, 0);
  return {
    title: 'Data Ingestion Analysis',
    badge: 'EVIDENCE BASE',
    sub: 'How the Lovingle baby-diaper evidence base is assembled — every figure below derives live from the ingestion registry.',
    period: `Data Collection Period pending graph assembly; ${uploadLine}.`,
    flag: files === 0
      ? 'Ingestion registry unreachable or empty — no datasets are registered for this project yet.'
      : 'Evidence graph not yet assembled — figures below are raw upload counts. The deduplicated graph is assembled on the first report run after ingestion.',
    defs: DEFS,
    kpis: [
      { icon: 'bars', tone: 'orange', value: fmt(rawRows), label: 'RECORDS UPLOADED (RAW)' },
      { icon: 'doc', tone: 'teal', value: String(files), label: 'SOURCE FILES' },
      { icon: 'link', tone: 'blue', value: String(fams.length), label: 'SOURCE FAMILIES' },
      { icon: 'star', tone: 'cream', value: '—', label: 'AVG RATING' },
    ],
    platforms: fams.map(([name, count]) => ({ name, count: fmt(count), pct: pct1(count, rawRows) })),
    types: [
      { name: 'Product Reviews (raw)', count: fmt(commerceRows), pct: pct1(commerceRows, rawRows), tone: 'orange' },
      { name: 'Social Mentions (raw)', count: fmt(rawRows - commerceRows), pct: pct1(rawRows - commerceRows, rawRows), tone: 'teal' },
    ],
    sources: fams.filter(([f]) => !COMMERCE_FAMILIES.has(f)).map(([name, count]) => ({ name, value: fmt(count) })),
    brands: [],
    geo: [],
    footnote: `Computed live from the ingestion registry (${files} files · ${fmt(rawRows)} records). Deduplicated totals, platform-level splits, verbatim and rating figures appear here once the evidence graph is assembled on the first report run.`,
  };
};

/** Full ledger — datasets registry + the latest evidence graph's aggregations. */
const buildLiveLedger = (datasets: DatasetMeta[], stats: GraphStats): IngestLedger => {
  // V-03 — the footnote no longer cites the raw ingestion registry (files /
  // uploaded rows — the "80 files · 143,372" leak). It cites the ASSEMBLED
  // graph's canonical dataset set + deduplicated events. `uploadLine` (the
  // upload window, not a count) still drives the neutral period banner.
  const { uploadLine } = registryBits(datasets);
  const agg = stats.aggregations || {};
  const total = stats.event_count || 0;
  const canonicalDatasets = typeof stats.dataset_count === 'number' && stats.dataset_count > 0
    ? stats.dataset_count : undefined;

  // Top 8 platforms + a bucketed tail — the ingestion fallback can mint
  // long-tail platform names, which must not flood the breakdown box.
  const pcAll = (agg.platformCounts || []).slice().sort((a: any, b: any) => b.count - a.count);
  const pcTail = pcAll.slice(8);
  const pcTailSum = pcTail.reduce((s: number, p: any) => s + p.count, 0);
  const platforms: Platform[] = pcAll.slice(0, 8)
    .map((p: any) => ({ name: p.platform, count: fmt(p.count), pct: pct1(p.count, total) }));
  if (pcTailSum > 0) {
    platforms.push({ name: `Other (${pcTail.length} platforms)`, count: fmt(pcTailSum), pct: pct1(pcTailSum, total) });
  }

  const et = agg.eventTypeCounts;
  const types: DataType[] = et ? [
    { name: 'Product Reviews', count: fmt(et.commerce), pct: pct1(et.commerce, total), tone: 'orange' },
    { name: 'Social Mentions', count: fmt(et.social), pct: pct1(et.social, total), tone: 'teal' },
  ] : [];

  const sources: Chip[] = (agg.socialSourceCounts || [])
    .slice().sort((a: any, b: any) => b.count - a.count).slice(0, 7)
    .map((s: any) => ({ name: s.source, value: fmt(s.count) }));

  const ratingByBrand = new Map<string, number>(
    (agg.brandRatings || []).map((r: any) => [r.brand, r.avg] as [string, number])
  );
  const brandRows = (agg.brandCounts || [])
    .filter((b: any) => b.brand && b.brand !== 'Generic/Other' && b.brand !== 'Unknown');
  const brandTotal = brandRows.reduce((s: number, b: any) => s + b.count, 0);
  const brands: Brand[] = brandRows
    .slice().sort((a: any, b: any) => b.count - a.count).slice(0, 6)
    .map((b: any) => ({
      name: b.brand, count: b.count, pct: pct1(b.count, brandTotal),
      rating: ratingByBrand.get(b.brand),
    }));

  const geoRows = (agg.stateCounts || []).slice().sort((a: any, b: any) => b.count - a.count);
  const geoTotal = geoRows.reduce((s: number, g: any) => s + g.count, 0);
  const geo: Geo[] = geoRows.slice(0, 12)
    .map((g: any) => ({ name: g.state, count: g.count, pct: pct1(g.count, geoTotal) }));

  const rs = agg.ratingSummary;
  const dr = agg.dateRange;
  const spanLine = dr?.min && dr?.max
    ? `Records span ${new Date(dr.min).getFullYear()}–${new Date(dr.max).getFullYear()}`
    : 'Record dates vary by source';
  const tsLine = dr && total > 0
    ? ` A timestamp is present on ${pct1(dr.datedCount, total)}% of records; depth varies by source.`
    : '';

  return {
    title: 'Data Ingestion Analysis',
    badge: 'EVIDENCE BASE',
    sub: 'How the Lovingle baby-diaper evidence base was assembled — every figure below derives live from the ingestion registry and the deduplicated evidence graph.',
    period: `${spanLine}; ${uploadLine}.${tsLine}`,
    defs: DEFS,
    kpis: [
      { icon: 'bars', tone: 'orange', value: fmt(total), label: 'TOTAL DATA POINTS' },
      { icon: 'chat', tone: 'teal', value: typeof agg.verbatimCount === 'number' ? fmt(agg.verbatimCount) : '—', label: 'USABLE VERBATIMS' },
      // '—' when the graph predates platformCounts — never substitute the
      // coarser registry family count under a graph-derived label.
      { icon: 'link', tone: 'blue', value: pcAll.length ? String(pcAll.length) : '—', label: 'PLATFORMS' },
      {
        icon: 'star', tone: 'cream',
        value: rs?.count ? (Math.round(rs.avg * 10) / 10).toFixed(1) : '—',
        label: rs?.count ? `AVG RATING (${fmt(rs.count)})` : 'AVG RATING',
      },
    ],
    platforms,
    types,
    sources,
    brands,
    geo,
    geoNote: geo.length
      ? `Blended from author-location tags, post locations and place references in text; geo-identifiable subset (${fmt(geoTotal)} mentions).`
      : undefined,
    footnote: `Computed live from the assembled evidence graph — ${canonicalDatasets ? `${fmt(canonicalDatasets)} dataset${canonicalDatasets === 1 ? '' : 's'} · ` : ''}${fmt(total)} deduplicated data points${stats.generated_at ? `, assembled ${fmtDay(stats.generated_at)}` : ''}. Social listening reflects brand/category chatter; the India consumer voice is carried by the e-commerce reviews and owned social. Geographic coverage is approximate — rolled up to state level over the geo-identifiable subset.`,
  };
};

/** Fetch both live surfaces once per mount; never recompute corpus stats client-side. */
const useLiveIngestLedger = (enabled: boolean, projectId = 'baby-diapers'): IngestLedger | null => {
  const [ledger, setLedger] = useState<IngestLedger | null>(null);
  useEffect(() => {
    if (!enabled) return;
    // SHARE MODE: the bundled snapshot carries the registry metadata and the
    // graph's aggregations — the exact same inputs the two fetches below
    // return — so the ledger renders identically with zero network.
    const share = getShareSnapshot();
    if (share) {
      const sg = share.evidenceGraph as any;
      setLedger(buildLiveLedger(share.datasets, {
        event_count: share.evidenceGraph.event_count,
        // V-03 — canonical dataset set from the snapshot graph (falls back to
        // the snapshot's bundled dataset list, which IS that canonical set).
        dataset_count: Array.isArray(sg.dataset_ids) ? sg.dataset_ids.length : share.datasets.length,
        generated_at: share.evidenceGraph.generated_at,
        aggregations: share.evidenceGraph.aggregations || {},
      }));
      return;
    }
    let alive = true;
    (async () => {
      let datasets: DatasetMeta[] = [];
      try {
        const d = await apiGet('/api/datasets', { project_id: projectId });
        datasets = Array.isArray(d?.datasets) ? d.datasets : [];
      } catch { /* registry unreachable — graph stats may still resolve */ }

      let stats: GraphStats | null = null;
      try {
        const r = await apiGet('/api/evidence', { project_id: projectId, stats: '1' });
        if (r?.stats) {
          stats = r.stats as GraphStats;
        } else if (r?.graph && Array.isArray(r.graph.events) && r.graph.events.length > 0) {
          // Deployed API predates ?stats=1 — same figures off the full payload;
          // canonical dataset count comes from the graph row meta (V-03).
          stats = {
            event_count: r.graph.events.length,
            dataset_count: Array.isArray(r?.meta?.dataset_ids) ? r.meta.dataset_ids.length : undefined,
            generated_at: r.graph.generatedAtISO,
            aggregations: r.graph.aggregations || {},
          };
        }
      } catch { /* no graph surface — registry-only ledger below */ }

      if (!alive) return;
      setLedger(stats && stats.event_count > 0 ? buildLiveLedger(datasets, stats) : buildRegistryLedger(datasets));
    })();
    return () => { alive = false; };
  }, [enabled, projectId]);
  return ledger;
};

// ── presentation (approved mockup chrome — unchanged) ────────────────────────

const ICONS: Record<IconKey, React.ReactNode> = {
  dish: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 16a8 8 0 0 1 8-8" /><path d="M4 16a4 4 0 0 1 4-4" /><circle cx="4.5" cy="15.5" r="1.4" fill="currentColor" stroke="none" /><path d="M14 4l6 6" /><path d="M11 13l3-3 4 4-3 3z" fill="currentColor" fillOpacity={0.12} /></svg>),
  bars: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 20V11M12 20V5M18 20v-6" /></svg>),
  chat: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5.2A8 8 0 1 1 21 12z" /></svg>),
  link: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M15 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>),
  star: (<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinejoin="round"><path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.6l5.9-.8z" fillOpacity={0.15} /></svg>),
  cal: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" /></svg>),
  doc: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 16.5h4" /></svg>),
  quote: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5.2A8 8 0 1 1 21 12z" /></svg>),
  info: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.1" /></svg>),
  glass: (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round"><circle cx="10.5" cy="10.5" r="7.5" /><path d="M16 16l5.5 5.5" /></svg>),
};
const Icon = ({ k }: { k: IconKey }) => <>{ICONS[k]}</>;

export default function DataIngestionAnalysis({ data: dataProp }: { data?: IngestLedger }) {
  const live = useLiveIngestLedger(!dataProp);
  const data = dataProp ?? live;

  if (!data) {
    return (
      <section className="lvig-panel" aria-label="Data ingestion analysis">
        <header className="lvig-head">
          <div className="lvig-head-l">
            <span className="lvig-dish"><Icon k="dish" /></span>
            <div>
              <h2 className="lvig-title">Data Ingestion Analysis</h2>
              <p className="lvig-sub">Assembling the live evidence ledger…</p>
            </div>
          </div>
          <span className="lvig-badge">EVIDENCE BASE</span>
        </header>
      </section>
    );
  }

  const maxBrand = data.brands.length ? Math.max(...data.brands.map(b => b.count)) : 0;
  // L3.15 — the report's commercial thesis: highest rated, least reviewed.
  // The 'LEAST REVIEWED' half of the kicker only renders when it is actually
  // true of the displayed rows — the label must never contradict its numbers.
  const rated = data.brands.filter(b => typeof b.rating === 'number');
  const topRated = rated.slice().sort((a, b) => (b.rating! - a.rating!))[0];
  const topReviewed = data.brands.slice().sort((a, b) => b.count - a.count)[0];
  const leastReviewed = data.brands.slice().sort((a, b) => a.count - b.count)[0];
  return (
    // page break comes from the wrapping section shell (data_foundation)
    <section className="lvig-panel" aria-label="Data ingestion analysis">
      <div className="lvig-motif" aria-hidden="true"><Icon k="glass" /></div>

      <header className="lvig-head">
        <div className="lvig-head-l">
          <span className="lvig-dish"><Icon k="dish" /></span>
          <div>
            <h2 className="lvig-title">{data.title}</h2>
            <p className="lvig-sub">{data.sub}</p>
            {data.flag && (
              <span className="lvig-flag"><Icon k="info" />{data.flag}</span>
            )}
          </div>
        </div>
        <span className="lvig-badge">{data.badge}</span>
      </header>

      <div className="lvig-kpis">
        {data.kpis.map((k, i) => (
          <div className={`lvig-kpi ${k.tone}`} key={i}>
            <span className="lvig-ic"><Icon k={k.icon} /></span>
            <div className="lvig-num">{k.value}</div>
            <div className="lvig-lab">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="lvig-banner">
        <div className="lvig-period"><span className="lvig-ic"><Icon k="cal" /></span>
          <span><b>Data Collection Period:</b> {data.period}</span></div>
        <div className="lvig-defs">
          {data.defs.map((d, i) => (
            <p className="lvig-def" key={i}><span className="lvig-ic"><Icon k={d.icon} /></span>
              <span><b>{d.term}</b>{d.body}</span></p>
          ))}
        </div>
      </div>

      <div className="lvig-cols">
        {data.platforms.length > 0 && (
        <div className="lvig-box">
          <div className="lvig-box-h"><span className="lvig-tab" />PLATFORM BREAKDOWN</div>
          {data.platforms.map((p, i) => (
            <div className="lvig-prow" key={i}>
              <div className="lvig-pname"><span className="lvig-pd" />{p.name}</div>
              <div className="lvig-ptrack">
                <div className="lvig-pfill" style={{ width: `${Math.max(p.pct, 1.5)}%` }}>
                  {p.pct >= 8
                    ? <span className="lvig-ppct">{p.pct}%</span>
                    : <span className="lvig-ppct out">{p.pct}%</span>}
                </div>
              </div>
              <div className="lvig-pcount">{p.count}</div>
            </div>
          ))}
        </div>
        )}

        {data.types.length > 0 && (
        <div className="lvig-box">
          <div className="lvig-box-h teal"><span className="lvig-tab" />DATA TYPE CLASSIFICATION</div>
          {data.types.map((d, i) => (
            <div className="lvig-drow" key={i}>
              <div className="lvig-drow-top"><span className="lvig-dname">{d.name}</span><span className="lvig-dcount">{d.count}</span></div>
              <div className="lvig-dtrack"><div className={`lvig-dfill ${d.tone}`} style={{ width: `${d.pct}%` }}><span className="lvig-dpct">{d.pct}%</span></div></div>
            </div>
          ))}
          {data.sources.length > 0 && (
            <>
              <div className="lvig-subh">SOCIAL MENTIONS BREAKDOWN — BY SOURCE</div>
              <div className="lvig-chips">
                {data.sources.map((s, i) => (<span className="lvig-chip" key={i}>{s.name}: <b>{s.value}</b></span>))}
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {(data.brands.length > 0 || data.geo.length > 0) && (
      <div className="lvig-cols">
        {data.brands.length > 0 && (
        <div className="lvig-box">
          <div className="lvig-box-h"><span className="lvig-tab" />BRAND MENTIONS — CATEGORY</div>
          {topRated && topReviewed && topRated.name !== topReviewed.name && typeof topReviewed.rating === 'number' && (
            <div className="lvig-brandcallout">
              <span className="lvig-bc-kicker">
                {leastReviewed && topRated.name === leastReviewed.name ? 'HIGHEST RATED, LEAST REVIEWED' : 'HIGHEST RATED'}
              </span>
              <span className="lvig-bc-body">
                {topRated.name} <b>★{topRated.rating!.toFixed(2)}</b> on <b>{topRated.count.toLocaleString()}</b> reviews
                {' '}vs {topReviewed.name} ★{topReviewed.rating.toFixed(2)} on {topReviewed.count.toLocaleString()}
              </span>
            </div>
          )}
          {data.brands.map((b, i) => (
            <div className="lvig-brow" key={i}>
              <div className="lvig-bname">{b.name}</div>
              <div className="lvig-btrack"><div className="lvig-bfill" style={{ width: `${maxBrand ? Math.round(b.count / maxBrand * 100) : 0}%` }} /></div>
              <div className="lvig-bval"><b>{b.count.toLocaleString()}</b> ({b.pct}%)</div>
              {typeof b.rating === 'number'
                ? <div className="lvig-brate"><span className="lvig-bstar" aria-hidden="true">★</span>{b.rating.toFixed(2)}</div>
                : <div className="lvig-brate lvig-brate-na">—</div>}
            </div>
          ))}
        </div>
        )}
        {data.geo.length > 0 && (
        <div className="lvig-box">
          <div className="lvig-box-h"><span className="lvig-tab" />GEOGRAPHIC COVERAGE — APPROXIMATE</div>
          {data.geoNote && <p className="lvig-cap">{data.geoNote}</p>}
          <div className="lvig-geo">
            {data.geo.map((g, i) => (
              <span className="lvig-gpill" key={i}><span className="lvig-gn">{g.name}</span><span className="lvig-gc">{g.count}</span><span className="lvig-gp">({g.pct}%)</span></span>
            ))}
          </div>
        </div>
        )}
      </div>
      )}

      <p className="lvig-foot"><span className="lvig-ic"><Icon k="info" /></span><span>{data.footnote}</span></p>
    </section>
  );
}
