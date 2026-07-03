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

   DATA: every figure comes from ./data/ingest_ledger.json — computed from the
   live corpus by compute_lovingle_ingest_ledger.py (Amazon + Flipkart reviews,
   Awario social listening, Instagram, Facebook). Numbers reconcile by
   construction; do not hand-edit the JSON.
     • Refresh: re-run the script over the fresh exports to regenerate the JSON,
       then rebuild. (Same exports also re-upload to Data Studio, so they stay in
       sync.)
     • Later: move onto an /api/ingest-stats?project=baby-diapers route that runs
       the same computation server-side. The committed JSON is the exact answer
       for now.
   Pass a different ledger via the optional `data` prop to override the default.
   ============================================================================ */

import React from 'react';
import realLedger from './data/ingest_ledger.json';

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
  sources: Chip[]; brands: Brand[]; sentiment?: Sentiment[]; geo: Geo[]; footnote: string;
}

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

export default function DataIngestionAnalysis({ data = realLedger as unknown as IngestLedger }: { data?: IngestLedger }) {
  const maxBrand = Math.max(...data.brands.map(b => b.count));
  // L3.15 — the report's commercial thesis: highest rated, least reviewed.
  const rated = data.brands.filter(b => typeof b.rating === 'number');
  const topRated = rated.slice().sort((a, b) => (b.rating! - a.rating!))[0];
  const topReviewed = data.brands.slice().sort((a, b) => b.count - a.count)[0];
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

        <div className="lvig-box">
          <div className="lvig-box-h teal"><span className="lvig-tab" />DATA TYPE CLASSIFICATION</div>
          {data.types.map((d, i) => (
            <div className="lvig-drow" key={i}>
              <div className="lvig-drow-top"><span className="lvig-dname">{d.name}</span><span className="lvig-dcount">{d.count}</span></div>
              <div className="lvig-dtrack"><div className={`lvig-dfill ${d.tone}`} style={{ width: `${d.pct}%` }}><span className="lvig-dpct">{d.pct}%</span></div></div>
            </div>
          ))}
          <div className="lvig-subh">SOCIAL MENTIONS BREAKDOWN — BY SOURCE</div>
          <div className="lvig-chips">
            {data.sources.map((s, i) => (<span className="lvig-chip" key={i}>{s.name}: <b>{s.value}</b></span>))}
          </div>
        </div>
      </div>

      <div className="lvig-cols">
        <div className="lvig-box">
          <div className="lvig-box-h"><span className="lvig-tab" />BRAND MENTIONS — CATEGORY</div>
          {topRated && topReviewed && topRated.name !== topReviewed.name && typeof topReviewed.rating === 'number' && (
            <div className="lvig-brandcallout">
              <span className="lvig-bc-kicker">HIGHEST RATED, LEAST REVIEWED</span>
              <span className="lvig-bc-body">
                {topRated.name} <b>★{topRated.rating!.toFixed(2)}</b> on <b>{topRated.count.toLocaleString()}</b> reviews
                {' '}vs {topReviewed.name} ★{topReviewed.rating.toFixed(2)} on {topReviewed.count.toLocaleString()}
              </span>
            </div>
          )}
          {data.brands.map((b, i) => (
            <div className="lvig-brow" key={i}>
              <div className="lvig-bname">{b.name}</div>
              <div className="lvig-btrack"><div className="lvig-bfill" style={{ width: `${Math.round(b.count / maxBrand * 100)}%` }} /></div>
              <div className="lvig-bval"><b>{b.count.toLocaleString()}</b> ({b.pct}%)</div>
              {typeof b.rating === 'number'
                ? <div className="lvig-brate"><span className="lvig-bstar" aria-hidden="true">★</span>{b.rating.toFixed(2)}</div>
                : <div className="lvig-brate lvig-brate-na">—</div>}
            </div>
          ))}
        </div>
        <div className="lvig-box">
          <div className="lvig-box-h"><span className="lvig-tab" />GEOGRAPHIC COVERAGE — APPROXIMATE</div>
          <p className="lvig-cap">Blended from author-location tags, post locations and place references in text; geo-identifiable subset (~940 mentions).</p>
          <div className="lvig-geo">
            {data.geo.map((g, i) => (
              <span className="lvig-gpill" key={i}><span className="lvig-gn">{g.name}</span><span className="lvig-gc">{g.count}</span><span className="lvig-gp">({g.pct}%)</span></span>
            ))}
          </div>
        </div>
      </div>

      <p className="lvig-foot"><span className="lvig-ic"><Icon k="info" /></span><span>{data.footnote}</span></p>
    </section>
  );
}
