/* ============================================================================
   BOOKLET BLOCK LIBRARY — Face Care booklet primitives (peer of LovingleBlocks)
   ----------------------------------------------------------------------------
   Each primitive maps to a booklet reference page (see §4 of the 02 Jul 2026
   restructure brief). Verbatims render FULL-TEXT (N6), attribution content is
   the N12 demographic chain, evidence badges carry the N5/N13 percentage line
   with the `n=0 → —` fix. All classes are `bk-` prefixed (styles/booklet.css);
   blocks mount inside the `.lv-scope.bk-scope` shell.
   ============================================================================ */

import React from 'react';
import {
  VerbatimContent, cleanVerbatimText, sanitiseConsumerText, formatAttribution, evidencePct,
} from './LovingleBlocks';

const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : v ? [v] : []);
const str = (v: any): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return v.title || v.name || v.label || v.text || v.headline || '';
};

// ── EvidenceShare — N5/N13 percentage line, booklet variant ──────────────────
// `15% · High` style share of the section pool; tooltip carries absolutes;
// `<1%` floor for tiny-but-present pools; `n = X` fallback when no total;
// n=0 renders `—`, never `<1%`.

export const EvidenceShare: React.FC<{ n?: number; totalN?: number; confidence?: string }> = ({ n, totalN, confidence }) => {
  if (typeof n !== 'number') return null;
  if (n === 0) return <div className="bk-evshare" title="No evidence records behind this item">—</div>;
  const pct = evidencePct(n, totalN);
  const label = pct ?? `n = ${n.toLocaleString()}`;
  const title = pct && totalN
    ? `${n.toLocaleString()} data points out of ${totalN.toLocaleString()} in this section`
    : 'Evidence weight — number of corpus records supporting this item';
  return (
    <div className="bk-evshare" title={title}>
      {label}{confidence ? <span className="bk-evshare-conf"> · {confidence}</span> : null}
    </div>
  );
};

/** Sum data_points across a list — the section-share denominator. */
export const sumDp = (items: any): number =>
  arr<any>(items).reduce((s, x) => s + (typeof x?.data_points === 'number' ? x.data_points : 0), 0);

// ── QuoteChip / QuoteChipGrid — booklet pp.6–17 ─────────────────────────────
// Light blue chip spanning 100% of the parent card, quote glyph, bold blue
// quote text (Hinglish preserved verbatim, FULL text — N6), grey italic
// attribution (N12 content). The evidence share NEVER renders on a verbatim —
// it annotates the parent card's header row (global QA rule).

export const QuoteChip: React.FC<{ v: VerbatimContent }> = ({ v }) => {
  const quote = sanitiseConsumerText(cleanVerbatimText(v?.quote));
  if (!quote) return null;
  const attribution = formatAttribution(v.verbatim_attribution);
  const source = cleanVerbatimText(v.source);
  const consumer = cleanVerbatimText(v.consumer);
  const attrLine = attribution || [consumer, source].filter(Boolean).join(' · ');
  const unverified = v.prov === 'unverified';
  return (
    <figure className="bk-quote">
      <span className="bk-quote-glyph" aria-hidden="true">“</span>
      <blockquote className="bk-quote-text">{quote}</blockquote>
      {unverified && (
        <span className="bk-quote-flag" title="This quote could not be matched to an ingested record. Treat as illustrative.">unverified</span>
      )}
      {attrLine && (
        <figcaption className="bk-quote-foot">
          <span className="bk-quote-attr">{attrLine.replace(/^—\s*/, '— ')}</span>
        </figcaption>
      )}
    </figure>
  );
};

// N6 — every verbatim renders, full text; no max, no truncation, no "+N more".
// Inside occasion/theme cards chips stack single-column full-width (cols=1,
// the default); pooled grids outside cards use two equal columns (cols=2).
export const QuoteChipGrid: React.FC<{ items: any; cols?: 1 | 2 }> = ({ items, cols = 1 }) => {
  const list = arr<VerbatimContent>(items).filter((v) => v?.quote);
  if (!list.length) return null;
  return (
    <div className={`bk-quotegrid bk-quotegrid-${cols}`}>
      {list.map((v, i) => <QuoteChip key={i} v={v} />)}
    </div>
  );
};

// ── FourBandMatrix — booklet pp.6–9 (THE workhorse) ─────────────────────────
// Vertical rotated band labels down the left; each band carries sub-themes:
// bold colored title + description + quotes on the right.

export type BandColor = 'blue' | 'green' | 'orange' | 'red' | 'red-deep';

export interface BandSubTheme {
  title: string;
  description?: string;
  met_status?: string;          // MET / UNMET / PARTIALLY_MET (needs sections)
  how_met_today?: string;
  data_points?: number;
  verbatims?: VerbatimContent[];
}

export interface MatrixBand {
  label: string;
  color: BandColor;
  subThemes: BandSubTheme[];
}

const MET_LABEL: Record<string, { label: string; cls: string }> = {
  MET: { label: 'MET', cls: 'bk-met-met' },
  UNMET: { label: 'UNMET', cls: 'bk-met-unmet' },
  PARTIALLY_MET: { label: 'PARTIALLY MET', cls: 'bk-met-partial' },
  PARTIAL: { label: 'PARTIALLY MET', cls: 'bk-met-partial' },
};

export const FourBandMatrix: React.FC<{ bands: MatrixBand[]; totalN?: number }> = ({ bands, totalN }) => {
  const list = arr<MatrixBand>(bands).filter((b) => arr(b.subThemes).length);
  if (!list.length) return null;
  const denom = typeof totalN === 'number'
    ? totalN
    : list.reduce((s, b) => s + sumDp(b.subThemes), 0);
  return (
    <div className="bk-matrix">
      {list.map((band, bi) => (
        <div key={bi} className={`bk-band bk-band-${band.color}`}>
          <div className="bk-band-label"><span>{band.label}</span></div>
          <div className="bk-band-body">
            {arr<BandSubTheme>(band.subThemes).map((t, ti) => {
              const met = t.met_status ? MET_LABEL[String(t.met_status).toUpperCase().replace(/[\s-]/g, '_')] : undefined;
              return (
                <div key={ti} className="bk-subtheme">
                  <div className="bk-subtheme-head">
                    <span className="bk-subtheme-title">{sanitiseConsumerText(str(t.title))}</span>
                    {met && <span className={`bk-met ${met.cls}`}>{met.label}</span>}
                    <EvidenceShare n={t.data_points} totalN={denom} />
                  </div>
                  {t.description && <p className="bk-subtheme-desc">{sanitiseConsumerText(t.description)}</p>}
                  {t.how_met_today && (
                    <p className="bk-subtheme-how"><b>How it's met today:</b> {sanitiseConsumerText(t.how_met_today)}</p>
                  )}
                  <QuoteChipGrid items={t.verbatims} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// Band presets from the brief: F/E/S needs and problem/aspiration/trigger/barrier.
export const FES_BAND_COLORS: Record<string, BandColor> = {
  functional: 'blue', emotional: 'green', social: 'orange',
};
export const JOURNEY_BAND_COLORS: Record<string, BandColor> = {
  problems: 'red', aspirations: 'green', triggers: 'orange', barriers: 'red-deep',
};

// ── StatCardRow — booklet p.4 KPI cards ─────────────────────────────────────

export interface StatCard { value: string; label: string; tone?: 'blue' | 'green' | 'deep'; }

export const StatCardRow: React.FC<{ stats: StatCard[] }> = ({ stats }) => {
  const list = arr<StatCard>(stats).filter((s) => s?.value);
  if (!list.length) return null;
  return (
    <div className="bk-stats">
      {list.map((s, i) => (
        <div key={i} className={`bk-stat bk-stat-${s.tone || 'blue'}`}>
          <div className="bk-stat-value">{s.value}</div>
          <div className="bk-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
};

// ── InsightStrip — booklet p.4 arrow strips ─────────────────────────────────

export const InsightStrip: React.FC<{ lead?: string; text?: string; children?: React.ReactNode }> = ({ lead, text, children }) => {
  if (!lead && !text && !children) return null;
  return (
    <div className="bk-strip">
      <span className="bk-strip-arrow" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="bk-strip-text">
        {lead && <b>{sanitiseConsumerText(lead)} </b>}
        {text && sanitiseConsumerText(text)}
        {children}
      </p>
    </div>
  );
};

// ── OpportunityRiskPair — booklet p.4 ───────────────────────────────────────

export const OpportunityRiskPair: React.FC<{ opportunity?: string; risk?: string }> = ({ opportunity, risk }) => {
  if (!opportunity && !risk) return null;
  return (
    <div className="bk-oppRisk">
      {opportunity && (
        <div className="bk-callout bk-callout-opp">
          <div className="bk-callout-kicker">Primary Opportunity</div>
          <p>{sanitiseConsumerText(opportunity)}</p>
        </div>
      )}
      {risk && (
        <div className="bk-callout bk-callout-risk">
          <div className="bk-callout-kicker">Risk Flag</div>
          <p>{sanitiseConsumerText(risk)}</p>
        </div>
      )}
    </div>
  );
};

// ── GapBlock — booklet p.10 ─────────────────────────────────────────────────
// Red arrow icon + bold gap title + description + italic signal-keyword line
// (`term | term | term`) + quotes. Section 18 uses literal search terms.

export interface GapItem {
  title: string;
  description?: string;
  signal_terms?: string[];
  data_points?: number;
  verbatims?: VerbatimContent[];
}

export const GapBlock: React.FC<{ gap: GapItem; totalN?: number }> = ({ gap, totalN }) => {
  if (!gap?.title) return null;
  const terms = arr<string>(gap.signal_terms).map(str).filter(Boolean);
  return (
    <div className="bk-gap">
      <div className="bk-gap-head">
        <span className="bk-gap-arrow" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="bk-gap-title">{sanitiseConsumerText(str(gap.title))}</span>
        <EvidenceShare n={gap.data_points} totalN={totalN} />
      </div>
      {gap.description && <p className="bk-gap-desc">{sanitiseConsumerText(gap.description)}</p>}
      {terms.length > 0 && <p className="bk-gap-signals">{terms.join('  |  ')}</p>}
      <QuoteChipGrid items={gap.verbatims} cols={2} />
    </div>
  );
};

export const GapBlockList: React.FC<{ gaps: GapItem[] }> = ({ gaps }) => {
  const list = arr<GapItem>(gaps).filter((g) => g?.title);
  if (!list.length) return null;
  const total = sumDp(list);
  return <div className="bk-gaplist">{list.map((g, i) => <GapBlock key={i} gap={g} totalN={total} />)}</div>;
};

// ── PillTagCloud — booklet p.3 ──────────────────────────────────────────────

export const PillTagCloud: React.FC<{ title?: string; items: any }> = ({ title, items }) => {
  const list = arr<any>(items).map(str).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="bk-pillcloud">
      {title && <div className="bk-pillcloud-title">{title}</div>}
      <div className="bk-pillcloud-pills">
        {list.map((t, i) => <span key={i} className="bk-pill">{sanitiseConsumerText(t)}</span>)}
      </div>
    </div>
  );
};

// ── IconCardGrid — booklet p.11 (trigger blue / barrier red) ────────────────

export interface IconCard {
  title: string;
  description?: string;
  data_points?: number;
  verbatims?: VerbatimContent[];
}

const BoltIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const FlagIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M5 21V4m0 0h12l-2.5 4L17 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="m4.5 12.5 5 5 10-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_FOR: Record<string, React.ReactNode> = {
  trigger: <BoltIcon />, barrier: <FlagIcon />, positive: <CheckIcon />,
};

export const IconCardGrid: React.FC<{
  columns: Array<{ kicker: string; tone: 'blue' | 'red' | 'green'; icon?: 'trigger' | 'barrier' | 'positive'; cards: IconCard[] }>;
}> = ({ columns }) => {
  const cols = arr<any>(columns).filter((c) => arr(c.cards).length);
  if (!cols.length) return null;
  const denom = cols.reduce((s, c) => s + sumDp(c.cards), 0);
  return (
    <div className="bk-iconcols" style={{ gridTemplateColumns: `repeat(${Math.min(cols.length, 2)}, minmax(0, 1fr))` }}>
      {cols.map((col, ci) => (
        <div key={ci} className={`bk-iconcol bk-iconcol-${col.tone}`}>
          <div className="bk-iconcol-kicker">{col.kicker}</div>
          {arr<IconCard>(col.cards).map((c, i) => (
            <div key={i} className="bk-iconcard">
              <div className="bk-iconcard-head">
                <span className="bk-iconcard-icon" aria-hidden="true">{ICON_FOR[col.icon || (col.tone === 'red' ? 'barrier' : 'trigger')]}</span>
                <span className="bk-iconcard-title">{sanitiseConsumerText(str(c.title))}</span>
                <EvidenceShare n={c.data_points} totalN={denom} />
              </div>
              {c.description && <p className="bk-iconcard-desc">{sanitiseConsumerText(c.description)}</p>}
              <QuoteChipGrid items={c.verbatims} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// ── RitualPanel — booklet pp.12–13 (occasion / time-of-day panels) ──────────

export interface RitualItem {
  occasion?: string;             // "Morning" / "Night & sleep" / "Travel"…
  ritual_name?: string;
  description?: string;
  data_points?: number;
  verbatims?: VerbatimContent[];
}

// Monoline SVG occasion icons — 20px, currentColor stroke (--bk-blue-primary
// via the illo tile). Emoji is retired from the client booklet.
const ico = { fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IcoMoon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><path d="M20 13A8 8 0 1 1 11 4a6.5 6.5 0 0 0 9 9Z" /></svg>
);
const IcoSun: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="4" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" /></svg>
);
const IcoSunrise: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><path d="M3.5 18.5h17M7 18.5a5 5 0 0 1 10 0M12 4.5v4M5.6 8.6l1.7 1.7M18.4 8.6l-1.7 1.7" /></svg>
);
const IcoSuitcase: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><rect x="4" y="8" width="16" height="11" rx="2" /><path d="M9.5 8V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v2M9 12v3.5M15 12v3.5" /></svg>
);
const IcoHome: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><path d="m4 11.4 8-6.4 8 6.4M6.2 10v9h11.6v-9M10.2 19v-4.6h3.6V19" /></svg>
);
const IcoBottle: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><path d="M10 3.5h4M12 3.5v3M9.5 10a2.5 2.5 0 0 1 5 0v7.5a2.5 2.5 0 0 1-5 0ZM9.5 13.5h5" /></svg>
);
const IcoPlay: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="8" /><path d="M4.6 9.5c2.3 1.6 12.5 1.6 14.8 0M4.6 14.5c2.3-1.6 12.5-1.6 14.8 0" /></svg>
);
const IcoHands: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><path d="M12 5.5 13 8.5 16 9.5 13 10.5 12 13.5 11 10.5 8 9.5 11 8.5Z" /><path d="M5 16.5c4.5 2.6 9.5 2.6 14 0" /></svg>
);
const IcoBaby: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="8" /><path d="M9.5 10.5v.1M14.5 10.5v.1M9.5 14.5c1.6 1.2 3.4 1.2 5 0M12 4c-1 .8-1 2 0 2.8" /></svg>
);

const OCCASION_ICONS: Array<{ re: RegExp; icon: React.ReactNode }> = [
  { re: /night|sleep/i, icon: <IcoMoon /> },
  { re: /morning|bath/i, icon: <IcoSunrise /> },
  { re: /day/i, icon: <IcoSun /> },
  { re: /travel|outing|out/i, icon: <IcoSuitcase /> },
  { re: /daycare/i, icon: <IcoHome /> },
  { re: /feed/i, icon: <IcoBottle /> },
  { re: /play|crawl/i, icon: <IcoPlay /> },
  { re: /massage|malish/i, icon: <IcoHands /> },
];
const occasionIcon = (label: string): React.ReactNode =>
  OCCASION_ICONS.find((g) => g.re.test(label))?.icon || <IcoBaby />;

export const RitualPanel: React.FC<{ items: RitualItem[] }> = ({ items }) => {
  const list = arr<RitualItem>(items).filter((r) => r?.occasion || r?.ritual_name);
  if (!list.length) return null;
  const denom = sumDp(list);
  return (
    <div className="bk-rituals">
      {list.map((r, i) => {
        const label = str(r.occasion) || str(r.ritual_name);
        return (
          <div key={i} className="bk-ritual">
            <div className="bk-ritual-illo" aria-hidden="true">{occasionIcon(label)}</div>
            <div className="bk-ritual-body">
              {/* share annotates the card header, beside the occasion label */}
              <div className="bk-ritual-headrow">
                <div className="bk-ritual-occasion">{label}</div>
                <EvidenceShare n={r.data_points} totalN={denom} />
              </div>
              {r.ritual_name && str(r.ritual_name) !== label && (
                <div className="bk-ritual-name">{sanitiseConsumerText(str(r.ritual_name))}</div>
              )}
              {r.description && <p className="bk-ritual-desc">{sanitiseConsumerText(r.description)}</p>}
              <QuoteChipGrid items={r.verbatims} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── RegionalSplitCards — booklet p.14, extended to the 5-card N/W/S/E/C variant

export interface RegionCard {
  region: string;                                    // North / West / South / East / Central
  groups?: Array<{ label: string; items: string[] }>; // Vocabulary / Drivers / Trust / Signals / Climate
  summary?: string;
  data_points?: number;
  verbatims?: VerbatimContent[];
}

const REGION_ORDER = ['north', 'west', 'south', 'east', 'central'];
const regionIdx = (r: string): number => {
  const i = REGION_ORDER.indexOf(String(r || '').toLowerCase().trim());
  return i === -1 ? 99 : i;
};

export const RegionalSplitCards: React.FC<{ regions: RegionCard[] }> = ({ regions }) => {
  const list = arr<RegionCard>(regions).filter((r) => r?.region)
    .slice().sort((a, b) => regionIdx(a.region) - regionIdx(b.region));
  if (!list.length) return null;
  const denom = sumDp(list);
  return (
    <div className="bk-regions">
      {list.map((r, i) => (
        <div key={i} className="bk-region">
          <div className="bk-region-headrow">
            <div className="bk-region-name">{str(r.region)}</div>
            <EvidenceShare n={r.data_points} totalN={denom} />
          </div>
          {r.summary && <p className="bk-region-summary">{sanitiseConsumerText(r.summary)}</p>}
          {arr<any>(r.groups).map((g, gi) => (
            <div key={gi} className="bk-region-group">
              <div className="bk-region-glabel">{str(g.label)}</div>
              <ul>{arr<string>(g.items).map(str).filter(Boolean).map((it, ii) => <li key={ii}>{sanitiseConsumerText(it)}</li>)}</ul>
            </div>
          ))}
          <QuoteChipGrid items={r.verbatims} />
        </div>
      ))}
    </div>
  );
};

// ── TierLadder — booklet p.19 (Must-Have / Good-to-Have / Delighter) ────────

export interface TierFeature {
  feature: string;
  why?: string;
  style_note?: string;           // tape vs pant specificity
  lifestage_note?: string;
  daynight_note?: string;
  headline?: boolean;            // dark-blue stat-card callout treatment
  data_points?: number;
  verbatims?: VerbatimContent[];
}

const TIER_META: Array<{ key: string; label: string; cls: string }> = [
  { key: 'must_haves', label: 'Must-Haves', cls: 'bk-tier-must' },
  { key: 'good_to_haves', label: 'Good-to-Haves', cls: 'bk-tier-good' },
  { key: 'delighters', label: 'Delighters', cls: 'bk-tier-delight' },
];

export const TierLadder: React.FC<{ tiers: Record<string, TierFeature[]> }> = ({ tiers }) => {
  const groups = TIER_META
    .map((m) => ({ ...m, items: arr<TierFeature>(tiers?.[m.key]).filter((f) => f?.feature) }))
    .filter((g) => g.items.length);
  if (!groups.length) return null;
  const denom = groups.reduce((s, g) => s + sumDp(g.items), 0);
  return (
    <div className="bk-tiers">
      {groups.map((g) => (
        <div key={g.key} className={`bk-tier ${g.cls}`}>
          <div className="bk-tier-label"><span>{g.label}</span></div>
          <div className="bk-tier-items">
            {g.items.map((f, i) => (
              <div key={i} className={`bk-tier-item${f.headline ? ' bk-tier-hero' : ''}`}>
                <div className="bk-tier-headrow">
                  <div className="bk-tier-feature">{sanitiseConsumerText(str(f.feature))}</div>
                  <EvidenceShare n={f.data_points} totalN={denom} />
                </div>
                {f.why && <p className="bk-tier-why">{sanitiseConsumerText(f.why)}</p>}
                <div className="bk-tier-notes">
                  {f.style_note && <span className="bk-tier-note">{sanitiseConsumerText(f.style_note)}</span>}
                  {f.lifestage_note && <span className="bk-tier-note">{sanitiseConsumerText(f.lifestage_note)}</span>}
                  {f.daynight_note && <span className="bk-tier-note">{sanitiseConsumerText(f.daynight_note)}</span>}
                </div>
                <QuoteChipGrid items={f.verbatims} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── PerceptionCardGrid — booklet p.20 (brand cards, text-mark fallback) ─────

export interface PerceptionCard {
  brand: string;
  perception?: string;
  cues?: string;                 // visual & verbal cues, mass vs premium
  data_points?: number;
  verbatims?: VerbatimContent[];
}

export const PerceptionCardGrid: React.FC<{ brands: PerceptionCard[] }> = ({ brands }) => {
  const list = arr<PerceptionCard>(brands).filter((b) => b?.brand);
  if (!list.length) return null;
  const denom = sumDp(list);
  return (
    <div className="bk-perceptions">
      {list.map((b, i) => (
        <div key={i} className="bk-perception">
          <div className="bk-perception-logo" aria-hidden="true">{str(b.brand)}</div>
          <div className="bk-perception-headrow">
            <div className="bk-perception-brand">{str(b.brand)}</div>
            <EvidenceShare n={b.data_points} totalN={denom} />
          </div>
          {b.perception && <p className="bk-perception-line">{sanitiseConsumerText(b.perception)}</p>}
          {b.cues && <p className="bk-perception-cues">{sanitiseConsumerText(b.cues)}</p>}
          <QuoteChipGrid items={b.verbatims} />
        </div>
      ))}
    </div>
  );
};

// ── SegmentLensRow — Mass / Mid-Premium / Premium comparative row ────────────
// Renders wherever a section payload carries `segment_lens` (§6.3).

export interface SegmentLensItem { segment: string; reading: string; }

const SEGMENT_META: Array<{ key: string; label: string; cls: string }> = [
  { key: 'mass', label: 'Mass', cls: 'bk-seg-mass' },
  { key: 'mid_premium', label: 'Mid-Premium', cls: 'bk-seg-mid' },
  { key: 'premium', label: 'Premium', cls: 'bk-seg-premium' },
];

// Three stacked rows — segment label left (fixed-width tinted chip), reading
// right. Obeys the global two-column-max grid rule and reads in order.
export const SegmentLensRow: React.FC<{ lens: any }> = ({ lens }) => {
  const list = arr<SegmentLensItem>(lens).filter((l) => l?.reading);
  if (!list.length) return null;
  // EXACT key equality only. A substring/includes match (the prior bug) has
  // 'mid_premium' matching the 'premium' key too — Array.find then returns
  // whichever of the two appears first in the payload, silently rendering the
  // mid-premium reading in the premium slot on roughly half of all sections.
  const readingFor = (key: string): string | undefined =>
    list.find((l) => String(l.segment || '').toLowerCase().replace(/[\s-]/g, '_') === key)?.reading;
  const resolved = SEGMENT_META.map((m) => readingFor(m.key));
  if (process.env.NODE_ENV !== 'production') {
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        if (resolved[i] && resolved[i] === resolved[j]) {
          console.error(
            `[SegmentLensRow] "${SEGMENT_META[i].key}" and "${SEGMENT_META[j].key}" resolved to the IDENTICAL reading — a tier is misattributed or the payload has a duplicate/missing segment.`
          );
        }
      }
    }
  }
  return (
    <div className="bk-seglens">
      <div className="bk-seglens-kicker">Segment lens</div>
      <div className="bk-seglens-stack">
        {SEGMENT_META.map((m, i) => {
          const reading = resolved[i];
          return (
            <div key={m.key} className={`bk-segrow ${m.cls}`}>
              <span className="bk-segrow-label">{m.label}</span>
              <p className="bk-segrow-reading">{reading ? sanitiseConsumerText(reading) : '—'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── LifestageStepper — Newborn → Infant → Crawler → Toddler/Potty-training ──

export interface LifestageStage {
  lifestage: string;
  age_band?: string;
  headline?: string;
  reading?: string;
  points?: string[];
  data_points?: number;
  verbatims?: VerbatimContent[];
}

const STAGE_ORDER = ['newborn', 'infant', 'crawler', 'toddler'];
const STAGE_LABELS: Record<string, string> = {
  newborn: 'Newborn', infant: 'Infant', crawler: 'Crawler', toddler: 'Toddler · Potty-training',
};
const stageKey = (s: string): string => {
  const t = String(s || '').toLowerCase();
  return STAGE_ORDER.find((k) => t.includes(k)) || (/(potty|train|2-3|walk)/.test(t) ? 'toddler' : t);
};
const stageIdx = (s: string): number => {
  const i = STAGE_ORDER.indexOf(stageKey(s));
  return i === -1 ? 99 : i;
};

export const LifestageStepper: React.FC<{ stages: LifestageStage[] }> = ({ stages }) => {
  const list = arr<LifestageStage>(stages).filter((s) => s?.lifestage)
    .slice().sort((a, b) => stageIdx(a.lifestage) - stageIdx(b.lifestage));
  if (!list.length) return null;
  const denom = sumDp(list);
  return (
    <div>
      <div className="bk-stepper" aria-hidden="true">
        {list.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="bk-stepper-arrow">→</span>}
            <span className="bk-stepper-node">{STAGE_LABELS[stageKey(s.lifestage)] || str(s.lifestage)}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="bk-stagecards">
        {list.map((s, i) => (
          <div key={i} className="bk-stagecard">
            <div className="bk-stagecard-head">
              <span className="bk-stagecard-stage">{STAGE_LABELS[stageKey(s.lifestage)] || str(s.lifestage)}</span>
              {s.age_band && <span className="bk-stagecard-age">{s.age_band}</span>}
              <EvidenceShare n={s.data_points} totalN={denom} />
            </div>
            {s.headline && <div className="bk-stagecard-headline">{sanitiseConsumerText(str(s.headline))}</div>}
            {(s.reading || '') && <p className="bk-stagecard-reading">{sanitiseConsumerText(s.reading!)}</p>}
            {arr<string>(s.points).map(str).filter(Boolean).length > 0 && (
              <ul className="bk-stagecard-points">
                {arr<string>(s.points).map(str).filter(Boolean).map((p, pi) => <li key={pi}>{sanitiseConsumerText(p)}</li>)}
              </ul>
            )}
            <QuoteChipGrid items={s.verbatims} />
          </div>
        ))}
      </div>
    </div>
  );
};

// LifestageLensRow — inline variant for sections where the lifestage lens fires
// alongside other content (06, 09).
export const LifestageLensRow: React.FC<{ lens: any }> = ({ lens }) => {
  const list = arr<any>(lens).filter((l) => l?.reading);
  if (!list.length) return null;
  return (
    <LifestageStepper stages={list.map((l) => ({ lifestage: l.lifestage || '', reading: l.reading }))} />
  );
};

// RegionLensRow — inline mini-strip for region-lensed sections (07).
export const RegionLensRow: React.FC<{ lens: any }> = ({ lens }) => {
  const list = arr<any>(lens).filter((l) => l?.reading);
  if (!list.length) return null;
  return (
    <RegionalSplitCards regions={list.map((l) => ({ region: l.region || '', summary: l.reading }))} />
  );
};

// ── PersonaCard — booklet-styled, MAX 5 enforced at the grid ────────────────

export interface PersonaContent {
  name?: string;
  persona_name?: string;
  pool_estimate?: string;        // size of persona (existing Layer-2 machinery)
  description?: string;
  purchase_channel?: string;
  segment?: string;
  sku?: string;
  triggers?: string[];
  drivers?: string[];
  unmet_needs?: string[];
  locus_of_control?: string;     // 'internal' | 'external' — new field
  data_points?: number;
  verbatims?: VerbatimContent[];
}

export const PersonaCard: React.FC<{ p: PersonaContent; totalN?: number }> = ({ p, totalN }) => {
  const name = str(p.name || p.persona_name);
  if (!name) return null;
  const locus = String(p.locus_of_control || '').toLowerCase();
  const miniList = (label: string, items?: string[], tone = '') => {
    const list = arr<string>(items).map(str).filter(Boolean);
    if (!list.length) return null;
    return (
      <div className={`bk-persona-mini ${tone}`}>
        <div className="bk-persona-minilabel">{label}</div>
        <ul>{list.map((it, i) => <li key={i}>{sanitiseConsumerText(it)}</li>)}</ul>
      </div>
    );
  };
  // N6-consistent: ≤1 verbatim per persona, full text when shown.
  const quote = arr<VerbatimContent>(p.verbatims).filter((v) => v?.quote).slice(0, 1);
  return (
    <div className="bk-persona">
      <div className="bk-persona-head">
        <span className="bk-persona-name">{name}</span>
        {p.pool_estimate && <span className="bk-persona-size" title="Estimated size of this persona in the category pool">{str(p.pool_estimate)}</span>}
        <EvidenceShare n={p.data_points} totalN={totalN} />
      </div>
      {p.description && <p className="bk-persona-desc">{sanitiseConsumerText(p.description)}</p>}
      {(() => {
        // pill treatment only for short values (≤~32 chars); longer strings
        // render as labeled attribute rows that wrap instead of overflowing
        const meta = [
          { label: 'Channel', value: sanitiseConsumerText(str(p.purchase_channel)) },
          { label: 'Segment', value: str(p.segment).replace(/_/g, ' ') },
          { label: 'Pack', value: sanitiseConsumerText(str(p.sku)) },
        ].filter((m) => m.value);
        const pills = meta.filter((m) => m.value.length <= 32);
        const rows = meta.filter((m) => m.value.length > 32);
        return (
          <>
            {(pills.length > 0 || locus) && (
              <div className="bk-persona-chips">
                {pills.map((m, i) => <span key={i} className="bk-pill" title={m.label}>{m.value}</span>)}
                {locus && (
                  <span className={`bk-locus bk-locus-${locus.includes('intern') ? 'internal' : 'external'}`}
                    title="Locus of control — whether this persona sees outcomes as driven by their own choices (internal) or by circumstances, family and experts (external)">
                    {locus.includes('intern') ? 'Internal locus' : 'External locus'}
                  </span>
                )}
              </div>
            )}
            {rows.length > 0 && (
              <div className="bk-attrrows">
                {rows.map((m, i) => (
                  <div key={i} className="bk-attrrow">
                    <span className="bk-attrrow-label">{m.label}:</span>
                    <span className="bk-attrrow-value">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}
      {miniList('Triggers', p.triggers, 'bk-persona-mini-blue')}
      {miniList('Drivers', p.drivers, 'bk-persona-mini-green')}
      {miniList('Unmet needs', p.unmet_needs, 'bk-persona-mini-red')}
      <QuoteChipGrid items={quote} />
    </div>
  );
};

export const PersonaCardGrid: React.FC<{ personas: PersonaContent[] }> = ({ personas }) => {
  // Hard cap: max 5 personas render (structure-doc mandate).
  const list = arr<PersonaContent>(personas).filter((p) => p?.name || p?.persona_name).slice(0, 5);
  if (!list.length) return null;
  const denom = sumDp(list);
  return <div className="bk-personas">{list.map((p, i) => <PersonaCard key={i} p={p} totalN={denom} />)}</div>;
};

// ── Section furniture ────────────────────────────────────────────────────────

export const BkZoneTitle: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="bk-zonetitle">
    <h2>{title}</h2>
    {sub && <span className="bk-zonetitle-sub">{sub}</span>}
  </div>
);

// Closing synthesis — every section ends on one (Layer 2.3 carries).
export const BkSynthesis: React.FC<{ title?: string; text?: any }> = ({ title, text }) => {
  const items = arr<string>(text).map(str).filter(Boolean);
  const single = typeof text === 'string' ? text : '';
  if (!items.length && !single) return null;
  return (
    <div className="bk-synthesis">
      {title && <div className="bk-synthesis-title">{title}</div>}
      {single
        ? <p>{sanitiseConsumerText(single)}</p>
        : <ul>{items.map((t, i) => <li key={i}>{sanitiseConsumerText(t)}</li>)}</ul>}
    </div>
  );
};

// Coverage-honesty note — sections state their evidence-pool size and thin
// coverage explicitly (system-prompt mandate; Part A especially).
export const BkPoolNote: React.FC<{ note?: string }> = ({ note }) => {
  if (!note) return null;
  return <p className="bk-poolnote">{sanitiseConsumerText(note)}</p>;
};

// Absent state — new sections have no seed fallback (§9); when a section has
// not been generated yet this state must look intentional, not broken.
export const BkAbsentState: React.FC<{ title?: string }> = ({ title }) => (
  <div className="bk-absent">
    <div className="bk-absent-badge">Awaiting generation</div>
    <p>
      {title ? <b>{title} </b> : null}
      has not been generated against the live corpus yet. Run the report with a
      configured provider to populate this section — there is no indicative
      sample for the new structure.
    </p>
    <div className="bk-absent-skeleton" aria-hidden="true">
      <span /><span /><span />
    </div>
  </div>
);
