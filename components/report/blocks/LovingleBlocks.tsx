/* ============================================================================
   LOVINGLE BLOCK LIBRARY  (F3 — warm-premium)
   ----------------------------------------------------------------------------
   Each block is a CONTENT CONTRACT (the typed shape it consumes) → a screen
   treatment. Screen renderers live here; the export renderers (toPptx / toDocx)
   per the F3 export contract attach to these same contracts in a later phase.
   All markup uses the `lv-` classes defined in styles/lovingle.css and must be
   mounted inside a `.lv-scope` ancestor (which carries the tokens).

   Keystone blocks implemented: ReportHeader, VerbatimChip, InsightCardGrid,
   PriceLadder, TriggerRail, BandStrip, TwoColumnCompare, SynthesisMoves,
   MethodFooter (+ shared ZoneHead / LogoLockup / Giraffe motif).
   ============================================================================ */

import React from 'react';

// ── shared types ─────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'HIGH' | 'MED' | 'LOW';

export interface VerbatimContent {
  quote: string;
  source?: string;
  consumer?: string;
  prov?: 'corpus' | 'curated' | 'unverified';
  verbatim_attribution?: VerbatimAttribution; // N12 — structured demographics
}

// ── tiny helpers ─────────────────────────────────────────────────────────────

const asArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : v ? [v] : []);

// ── L1.4 · snake_case → Title Case (table headers, attribute/field labels) ───
export const toTitleCase = (s?: string): string => {
  if (!s) return '';
  // Leave already-spaced / human strings mostly intact; only transform tokens
  // that look like db field names (contain underscores or are all-lower words).
  if (!/[_]/.test(s) && /\s/.test(s)) return s;
  return String(s)
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
};

// ── Vendor-name neutraliser ──────────────────────────────────────────────────
// Data-collection vendors (Awario, Apify) are pipeline tooling, not consumer
// platforms — a client-facing page never names them. Cached generations that
// predate the TERMINOLOGY prompt rule are sanitised here at render time.
const neutraliseVendorNames = (text: string): string => {
  return text
    .replace(/\s*[([](?:via\s+)?(?:awario|apify)[)\]]/gi, '')
    .replace(/\bawario\b/gi, 'Social listening')
    .replace(/\bapify\b/gi, 'e-commerce reviews');
};

// ── L1.5 · UTF-8 / mojibake repair applied to every rendered verbatim ────────
export const cleanVerbatimText = (text?: string): string => {
  if (!text) return '';
  return neutraliseVendorNames(String(text)
    .replace(/ÃÂ®/g, '®').replace(/Ã‚Â®/g, '®').replace(/Ã®/g, '®')
    .replace(/ÃÂ©/g, 'é').replace(/Ã©/g, 'é')
    .replace(/Ã¢â‚¬â„¢/g, '’').replace(/â€™/g, '’')
    .replace(/Ã¢â‚¬Å“/g, '“').replace(/â€œ/g, '“')
    .replace(/Ã¢â‚¬/g, '”').replace(/â€/g, '”')
    .replace(/Ã¢â‚¬â€œ/g, '–').replace(/â€“/g, '–')
    .replace(/Ã¢â‚¬â€/g, '—').replace(/â€”/g, '—')
    .replace(/Ã‚Â/g, '').replace(/Â/g, '')
    .replace(/\s+/g, ' ')
    .trim());
};

// ── N4 · consumer-terminology sanitiser ──────────────────────────────────────
// "Laddi" is an internal RSPL product-line name, not a consumer term. Scrub it
// from consumer-facing analysis text. Section 12 (Pack Architecture) is exempt:
// its tier labels are built by its own PackCard (packLabel), which does not
// route through InsightCard/VerbatimChip, so the exemption holds structurally.
export const sanitiseConsumerText = (text?: string): string => {
  if (!text) return '';
  return neutraliseVendorNames(String(text)
    .replace(/\bLaddi Single\b/gi, 'single-use sachet pack')
    .replace(/\bLaddi Twin\b/gi, 'twin sachet pack')
    .replace(/\bnon[- ]laddi\b/gi, 'standard multi-count pack')
    .replace(/\bLaddi\b/gi, 'sachet pack'));
};

const confClass = (c?: ConfidenceLevel): string =>
  c === 'HIGH' ? 'lv-conf-high' : c === 'MED' ? 'lv-conf-med' : 'lv-conf-low';

const confLabel = (c?: ConfidenceLevel): string =>
  c === 'HIGH' ? 'High' : c === 'MED' ? 'Medium' : 'Low';

// ── ZoneHead ─────────────────────────────────────────────────────────────────

export const ZoneHead: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="lv-zone-head">
    <h2>{title}</h2>
    {sub && <span className="lv-sub">{sub}</span>}
  </div>
);

// ── Logo lockup + giraffe motif (real Lovingle marks composite in later) ─────

export const LogoLockup: React.FC = () => (
  <span className="lv-logo-lockup" title="Real Lovingle logo composites into this slot">
    <span className="lv-logo-mark" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 21s-7-4.6-7-9.8A4 4 0 0 1 12 8a4 4 0 0 1 7 3.2C19 16.4 12 21 12 21Z" fill="#fff" />
      </svg>
    </span>
    <span className="lv-logo-word">Lovingle</span>
    <span className="lv-logo-tm">™</span>
  </span>
);

export const LovingleGiraffe: React.FC = () => (
  <svg className="lv-giraffe" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="#1C3C8E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M70 36c0-6 4-11 11-11s11 5 11 12c0 5-3 9-7 11" />
      <path d="M75 27c-2-4-1-9 2-11M88 28c2-4 6-5 9-3" />
      <path d="M84 48c-2 14-4 30-4 44 0 18 2 36 4 50" />
      <path d="M84 142v-12" />
      <path d="M70 60c-10 4-22 10-30 22-8 12-10 28-9 44" />
      <path d="M31 126v14M44 132v10" />
      <path d="M70 60c2 8 6 14 12 16" />
      <circle cx="80" cy="34" r="1.6" fill="#1C3C8E" />
    </g>
    <g fill="#F26F21" opacity=".9">
      <circle cx="76" cy="66" r="3" /><circle cx="80" cy="82" r="3" /><circle cx="74" cy="96" r="2.6" />
      <circle cx="50" cy="92" r="2.6" /><circle cx="42" cy="110" r="2.6" /><circle cx="60" cy="112" r="2.4" />
    </g>
  </svg>
);

// ── Block 2 · VerbatimChip ───────────────────────────────────────────────────

// N12 — structured demographic attribution, extracted by the LLM per quote.
export interface VerbatimAttribution {
  parent_age?: string;        // "28 yrs"
  baby_age?: string;          // "Mom of 3-month baby"
  parity?: string;            // "1st time mom" | "2nd time mom"
  city?: string;              // "Mumbai"
  tier?: string;              // "Tier 1" | "Tier 2" | "Metro"
  segment?: string;           // "Mass" | "Mid-Premium" | "Premium"
  brand_user?: string;        // "Pampers User" | "Lovingle User"
  platform?: string;          // "Amazon" | "Instagram" (fallback display)
}

export const formatAttribution = (attr?: VerbatimAttribution): string => {
  if (!attr) return '';
  const parts = [attr.parent_age, attr.baby_age, attr.parity, attr.city, attr.tier, attr.segment, attr.brand_user]
    .map((p) => cleanVerbatimText(p)).filter(Boolean);
  if (parts.length === 0) return attr.platform ? `— ${cleanVerbatimText(attr.platform)} review` : '';
  return `— ${parts.join(', ')}`;
};

// N6 — quotes render in FULL (no truncation, no collapse), mojibake-cleaned
// (L1.5) and terminology-sanitised (N4). Provenance flag preserved. Hierarchy
// is carried by type: quotes are smaller/italic/grey vs the card finding.
export const VerbatimChip: React.FC<{ v: VerbatimContent }> = ({ v }) => {
  const quote = sanitiseConsumerText(cleanVerbatimText(v?.quote));
  if (!quote) return null;
  // Only fabricated quotes are surfaced. Corpus-verified and curated render
  // identically (curated is intentionally silent).
  const unverified = v.prov === 'unverified';
  const attribution = formatAttribution(v.verbatim_attribution);
  const source = cleanVerbatimText(v.source);
  const consumer = cleanVerbatimText(v.consumer);
  return (
    <p className={`lv-vb${unverified ? ' lv-vb-unverified' : ''}`}>
      “{quote}”
      {unverified && (
        <span className="lv-vb-flag" title="This quote could not be matched to an ingested record. Treat as illustrative.">unverified</span>
      )}
      {attribution ? (
        <span className="lv-vb-attr">{attribution}</span>
      ) : (source || consumer) && (
        <span className="lv-src">
          {source && <b>{source}</b>}
          {source && consumer && ' · '}
          {consumer}
        </span>
      )}
    </p>
  );
};

// N6 — every verbatim the section carries renders, full-text, screen and print.
// Density is controlled at generation time (Layer 2.4: max 1/card, trimmed),
// not by the renderer. `max` is retained for call-site compatibility but is
// intentionally ignored.
export const VerbatimChipList: React.FC<{ items: any; max?: number }> = ({ items }) => {
  const list = asArray<VerbatimContent>(items).filter((v) => v?.quote);
  if (!list.length) return null;
  return (
    <div className="lv-quotes">
      {list.map((v, i) => <VerbatimChip key={i} v={v} />)}
    </div>
  );
};

// ── Block 1 · ReportHeader ───────────────────────────────────────────────────

// N7 — the client-facing report title. "Lovingle" stays in the ANALYSIS text,
// not the report chrome (headers / footers / navigation).
export const REPORT_TITLE = 'Baby Diaper — Category and Consumer Understanding';

// N8 — section eyebrows arrive as "Lovingle · X"; strip the brand from chrome.
const stripBrandFromChrome = (s: string): string => String(s || '').replace(/^\s*Lovingle\s*·\s*/i, '');

export interface ReportHeaderContent {
  eyebrow: string;
  title: string;
  titleAccent?: string;     // a word within `title` to render in accent orange
  standfirst?: React.ReactNode;
  evidenceN?: number;
  confidence?: string;      // free text e.g. "Medium-High"
  window?: string;
  metaSlot?: React.ReactNode; // e.g. the F2 EvidenceTrigger
  indicative?: boolean;     // flag sample/indicative (not-yet-corpus-wired) content
  provenance?: { corpus: number; total: number; unverified: number }; // verbatim grounding
  secNum?: string;          // N14 — zero-padded section number ("01"…"25")
}

const renderAccentTitle = (title: string, accent?: string): React.ReactNode => {
  if (!accent || !title.includes(accent)) return title;
  const idx = title.indexOf(accent);
  return (
    <>
      {title.slice(0, idx)}
      <span className="lv-accent">{accent}</span>
      {title.slice(idx + accent.length)}
    </>
  );
};

export const ReportHeader: React.FC<ReportHeaderContent> = ({
  eyebrow, title, titleAccent, standfirst, evidenceN, confidence, window, metaSlot, indicative, provenance, secNum,
}) => (
  <header className="lv-head lv-reveal" style={{ animationDelay: '.02s' }}>
    <div>
      {/* N7/N8 — report title in the chrome; no brand logo/name. */}
      <div className="lv-brandrow"><span className="lv-report-title">{REPORT_TITLE}</span></div>
      {indicative ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <span className="lv-eyebrow">{stripBrandFromChrome(eyebrow)}</span>
          <span className="lv-indicative">Indicative · sample data</span>
        </div>
      ) : (
        <span className="lv-eyebrow">{stripBrandFromChrome(eyebrow)}</span>
      )}
      <h1 className="lv-h1">
        {secNum && <span className="lv-secnum">{secNum}</span>}
        {renderAccentTitle(title, titleAccent)}
      </h1>
      {standfirst && <p className="lv-standfirst">{standfirst}</p>}
    </div>
    <div className="lv-meta">
      {typeof evidenceN === 'number' && (
        <span className="lv-pill lv-pill-ev"><span className="lv-dot" />Evidence · {evidenceN} verbatim{evidenceN === 1 ? '' : 's'}</span>
      )}
      {confidence && <span className="lv-pill lv-pill-conf">Confidence · {confidence}</span>}
      {!indicative && provenance && provenance.total > 0 && (
        provenance.unverified === 0 ? (
          <span className="lv-pill lv-pill-verified" title="Every quote in this section traces to an ingested record.">
            ✓ {provenance.corpus}/{provenance.total} corpus-verified
          </span>
        ) : (
          <span className="lv-pill lv-pill-flagged" title={`${provenance.unverified} quote(s) could not be matched to an ingested record and are flagged inline.`}>
            ⚠ {provenance.unverified} unverified
          </span>
        )
      )}
      {metaSlot}
      {window && <span className="lv-win">{window}</span>}
    </div>
  </header>
);

// ── Block 3 · InsightCardGrid ────────────────────────────────────────────────

export interface InsightCardContent {
  headline: string;
  signal?: string;                 // the "what it means" line
  verbatims?: VerbatimContent[];
  confidence?: ConfidenceLevel;
  evidenceWeight?: number;         // data_points
  metStatus?: string;              // L3.4 — MET / UNMET / PARTIALLY_MET (Section 6)
}

// L3.4 — need-status pill (renders only when the data carries met_status; a
// graceful no-op for pre-regeneration content).
const MET_META: Record<string, { label: string; cls: string }> = {
  MET: { label: 'MET', cls: 'lv-met-met' },
  UNMET: { label: 'UNMET', cls: 'lv-met-unmet' },
  PARTIALLY_MET: { label: 'PARTIALLY MET', cls: 'lv-met-partial' },
  PARTIAL: { label: 'PARTIALLY MET', cls: 'lv-met-partial' },
  PARTIALLY: { label: 'PARTIALLY MET', cls: 'lv-met-partial' },
};

// N5+N13 — evidence badge shows the card's SHARE of section evidence, not the
// raw count ("15% · High"). Tooltip carries the absolute. Falls back to the raw
// count when no section total is available.
export const evidencePct = (n?: number, totalN?: number): string | null => {
  if (typeof n !== 'number') return null;
  if (n === 0) return '—'; // zero evidence is shown as absent, never as "<1%"
  if (!totalN || totalN <= 0) return null;
  const pct = Math.round((n / totalN) * 100);
  return pct < 1 ? '<1%' : `${pct}%`;
};

// L1.1 hero variant + N5/N13 percentage evidence badge.
export const InsightCard: React.FC<{ c: InsightCardContent; hero?: boolean; totalN?: number; showVerbatims?: boolean }> =
  ({ c, hero, totalN, showVerbatims = true }) => {
  const conf = c.confidence ? confLabel(c.confidence) : '';
  const hasN = typeof c.evidenceWeight === 'number';
  const pct = evidencePct(c.evidenceWeight, totalN);
  const nDisp = pct ?? (hasN ? `n = ${c.evidenceWeight!.toLocaleString()}` : '');
  const badgeTitle = pct
    ? `${c.evidenceWeight!.toLocaleString()} data points out of ${totalN!.toLocaleString()} in this section`
    : 'Evidence weight — number of corpus records supporting this finding';
  const met = c.metStatus ? MET_META[String(c.metStatus).toUpperCase().replace(/[\s-]/g, '_')] : undefined;
  return (
    <div className={`lv-card${hero ? ' lv-hero' : ''}`}>
      <div className="lv-card-head">
        <div className="lv-card-title">{sanitiseConsumerText(c.headline)}</div>
        <div className="lv-card-badges">
          {met && <span className={`lv-met ${met.cls}`}>{met.label}</span>}
          {(nDisp || conf) && (
            <span className={`lv-evbadge ${c.confidence ? confClass(c.confidence) : ''}`} title={badgeTitle}>
              {nDisp}
              {nDisp && conf && <span className="lv-evbadge-sep"> · </span>}
              {conf}
            </span>
          )}
        </div>
      </div>
      {c.signal && <div className="lv-card-sig">{sanitiseConsumerText(c.signal)}</div>}
      {showVerbatims && <VerbatimChipList items={c.verbatims} />}
    </div>
  );
};

export const InsightCardGrid: React.FC<{ items: InsightCardContent[]; totalN?: number; showVerbatims?: boolean }> =
  ({ items, totalN, showVerbatims = true }) => {
  const list = asArray<InsightCardContent>(items);
  if (!list.length) return null;
  // N5 — section-relative share: default the total to this group's own sum;
  // multi-group sections (LabeledCardGroups) pass the cross-group total down.
  const groupTotal = totalN ?? list.reduce((s, c) => s + (typeof c.evidenceWeight === 'number' ? c.evidenceWeight : 0), 0);
  // L1.1 — the single highest-evidence card in the group gets hero treatment.
  let heroIdx = -1, heroMax = -1;
  list.forEach((c, i) => {
    const w = typeof c.evidenceWeight === 'number' ? c.evidenceWeight : -1;
    if (w > heroMax) { heroMax = w; heroIdx = i; }
  });
  const heroOn = list.length > 1 && heroMax > 0;
  return (
    <div className="lv-cardgrid">
      {list.map((c, i) => (
        <InsightCard key={i} c={c} hero={heroOn && i === heroIdx} totalN={groupTotal} showVerbatims={showVerbatims} />
      ))}
    </div>
  );
};

// ── Block 5 · PriceLadder ────────────────────────────────────────────────────

export interface PriceRung {
  price: string;                  // big numeral / range, e.g. "₹399" or "₹10–15"
  unit?: string;                  // small caption under price, e.g. "MID · CONSIDERED"
  band: string;                   // bold heading line
  who?: string;                   // sub line
  pack?: React.ReactNode;         // tertiary detail line (b-tags allowed)
  share?: number;                 // 0–100 → drives bar + pct
  shareLabel?: string;
  verbatims?: VerbatimContent[];
}

const Chevron: React.FC = () => (
  <svg className="lv-chev" width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RungBody: React.FC<{ r: PriceRung }> = ({ r }) => (
  <span className="lv-rung-body">
    <span className="lv-band">{r.band}</span>
    {r.who && <span className="lv-who">{r.who}</span>}
    {r.pack && <span className="lv-pack">{r.pack}</span>}
    {typeof r.share === 'number' && (
      <span className="lv-bar" aria-hidden="true"><span style={{ width: `${Math.max(2, Math.min(100, r.share))}%` }} /></span>
    )}
  </span>
);

const RungShare: React.FC<{ r: PriceRung; expandable: boolean }> = ({ r, expandable }) => {
  if (typeof r.share !== 'number' && !expandable) return <span />;
  return (
    <span className="lv-rung-share">
      {typeof r.share === 'number' && (
        <>
          <span className="lv-pct">{r.share}%</span>
          <span className="lv-lab">{r.shareLabel || 'indic. share'}</span>
        </>
      )}
      {expandable && <Chevron />}
    </span>
  );
};

export const PriceLadder: React.FC<{ rungs: PriceRung[] }> = ({ rungs }) => {
  const list = asArray<PriceRung>(rungs);
  if (!list.length) return null;
  return (
    <div className="lv-ladder">
      {list.map((r, i) => {
        const tier = `lv-r${Math.min(i + 1, 3)}`;
        const hasEvidence = asArray<VerbatimContent>(r.verbatims).length > 0;
        const PriceBox = (
          <span className="lv-rung-price">{r.price}{r.unit && <small>{r.unit}</small>}</span>
        );
        if (hasEvidence) {
          return (
            <details key={i} className={`lv-rung lv-clickable ${tier}`} open={i === 0}>
              <summary className="lv-rung-btn">
                {PriceBox}
                <RungBody r={r} />
                <RungShare r={r} expandable />
              </summary>
              <div className="lv-rung-ev"><div><div className="lv-rung-ev-inner">
                <p className="lv-lead">Consumer evidence</p>
                <VerbatimChipList items={r.verbatims} max={6} />
              </div></div></div>
            </details>
          );
        }
        return (
          <div key={i} className={`lv-rung ${tier}`}>
            <div className="lv-rung-btn">
              {PriceBox}
              <RungBody r={r} />
              <RungShare r={r} expandable={false} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Block 6 · TriggerRail ────────────────────────────────────────────────────

export interface TriggerContent {
  name: string;
  mechanism?: string;
  intensity?: number;     // 0–3 lit dots
  verbatim?: string;      // short italic quote
  locked?: boolean;
  lockedLabel?: string;
}

export const TriggerRail: React.FC<{ triggers: TriggerContent[] }> = ({ triggers }) => {
  const list = asArray<TriggerContent>(triggers);
  if (!list.length) return null;
  return (
    <div className="lv-triggers">
      {list.map((t, i) => {
        const lit = Math.max(0, Math.min(3, t.intensity ?? 0));
        return (
          <div key={i} className={`lv-trig${t.locked ? ' lv-locked' : ''}`}>
            <span className="lv-tname">
              {t.name}
              {t.locked && <span className="lv-tflag">{t.lockedLabel || 'Locked objection'}</span>}
            </span>
            <span className="lv-intensity" title={`lift on price tolerance: ${lit}/3`}>
              {[0, 1, 2].map((d) => <i key={d} className={d < lit ? 'lv-on' : ''} />)}
            </span>
            {t.mechanism && <span className="lv-tmech">{t.mechanism}</span>}
            {t.verbatim && <span className="lv-tvb">“{t.verbatim}”</span>}
          </div>
        );
      })}
    </div>
  );
};

// ── Block 7 · BandStrip (n bands, orange→teal→blue) ──────────────────────────

export interface BandContent {
  name: string;
  detail?: React.ReactNode;
  note?: string;
}

export const BandStrip: React.FC<{ bands: BandContent[] }> = ({ bands }) => {
  const list = asArray<BandContent>(bands);
  if (!list.length) return null;
  return (
    <div className="lv-bands">
      {list.map((b, i) => (
        <div key={i} className={`lv-sband lv-bg${i % 3}`}>
          <p className="lv-sname">{b.name}</p>
          {b.detail && <p className="lv-sdetail">{b.detail}</p>}
          {b.note && <p className="lv-snote">{b.note}</p>}
        </div>
      ))}
    </div>
  );
};

// ── Block 8 · TwoColumnCompare ───────────────────────────────────────────────

export interface CompareColumn {
  title: string;
  tag?: string;
  items: string[];
  engine?: string;     // highlighted badge line
}

export interface TwoColumnCompareContent {
  left: CompareColumn;
  right: CompareColumn;
  midLabel?: string;
}

export const TwoColumnCompare: React.FC<TwoColumnCompareContent> = ({ left, right, midLabel }) => (
  <div className="lv-pack2">
    <div className="lv-pcol lv-left">
      <h3>{left.title}</h3>
      {left.tag && <p className="lv-ptag">{left.tag}</p>}
      <ul>{asArray<string>(left.items).map((it, i) => <li key={i}>{it}</li>)}</ul>
      {left.engine && <span className="lv-engine">{left.engine}</span>}
    </div>
    <div className="lv-pmid" aria-hidden="true">
      <span className="lv-arr">→</span>
      {midLabel && <span className="lv-plab">{midLabel}</span>}
    </div>
    <div className="lv-pcol lv-right">
      <h3>{right.title}</h3>
      {right.tag && <p className="lv-ptag">{right.tag}</p>}
      <ul>{asArray<string>(right.items).map((it, i) => <li key={i}>{it}</li>)}</ul>
      {right.engine && <span className="lv-engine">{right.engine}</span>}
    </div>
  </div>
);

// ── Block 9 · SynthesisMoves ─────────────────────────────────────────────────

export interface MoveContent {
  n: number | string;
  title: string;
  rationale?: string;
}

export const SynthesisMoves: React.FC<{ moves: MoveContent[] }> = ({ moves }) => {
  const list = asArray<MoveContent>(moves);
  if (!list.length) return null;
  return (
    <div className="lv-moves">
      {list.map((m, i) => (
        <div key={i} className="lv-move">
          <span className="lv-n">{m.n}</span>
          <span>
            <span className="lv-mt">{m.title}</span>
            {m.rationale && <span className="lv-mr">{m.rationale}</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Block 10 · MethodFooter ──────────────────────────────────────────────────

export interface MethodFooterContent {
  sources: string[];
  excluded?: string[];
  window?: string;
  confidence?: string;
  disclaimer?: string;
}

export const MethodFooter: React.FC<MethodFooterContent> = ({
  sources, excluded, window, confidence, disclaimer,
}) => (
  <footer className="lv-method lv-reveal" style={{ animationDelay: '.30s' }}>
    <div>
      <p className="lv-slab">Evidence base · source layers</p>
      <div className="lv-srcs">
        {asArray<string>(sources).map((s, i) => <span key={i} className="lv-src-chip">{s}</span>)}
        {asArray<string>(excluded).map((s, i) => <span key={`x${i}`} className="lv-src-chip lv-excl">{s}</span>)}
      </div>
    </div>
    {(window || confidence) && (
      <p className="lv-mnote">
        {window}
        {window && confidence && <br />}
        {confidence && <>Section confidence: <span className="lv-confword">{confidence}</span></>}
      </p>
    )}
    {disclaimer && <p className="lv-disclaimer">{disclaimer}</p>}
  </footer>
);

// ============================================================================
//  GATE 2 BLOCKS — parity restyle of the remaining 11 sections
// ============================================================================

const conf3 = (c: any): ConfidenceLevel | undefined => {
  if (typeof c !== 'string') return undefined;
  const u = c.toUpperCase();
  return u.startsWith('H') ? 'HIGH' : u.startsWith('L') ? 'LOW' : 'MED';
};

/** Shared: normalize an insight card { headline, what_it_means, data_points, confidence, verbatims } → contract. */
export const toInsightCards = (items: any): InsightCardContent[] =>
  asArray<any>(items).map((c) => ({
    headline: c?.headline || c?.title || c?.claim || '',
    signal: c?.what_it_means || c?.explanation || c?.insight || c?.detail || '',
    verbatims: asArray(c?.verbatims),
    confidence: conf3(c?.confidence),
    evidenceWeight: typeof c?.data_points === 'number' ? c.data_points : undefined,
    metStatus: c?.met_status || c?.metStatus,
  }));

type Tone = 'orange' | 'blue' | 'teal' | 'rose';

export const SubHead: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = 'orange' }) => (
  <div className={`lv-subhead${tone !== 'orange' ? ` lv-${tone}` : ''}`}>
    <span className="lv-sdot" />{label}
  </div>
);

export const NotesList: React.FC<{ items: any }> = ({ items }) => {
  const list = asArray<string>(items).filter(Boolean);
  if (!list.length) return null;
  return <ul className="lv-notes">{list.map((n, i) => <li key={i}>{n}</li>)}</ul>;
};

export const NoteBox: React.FC<{ title?: string; tone?: Tone; items: any }> = ({ title, tone, items }) => {
  if (!asArray(items).length) return null;
  return (
    <div className="lv-notebox">
      {title && <SubHead label={title} tone={tone} />}
      <NotesList items={items} />
    </div>
  );
};

// ── L1.7 · SynthesisBlock — the section's conclusion, visually distinct from
// the insight cards (deep-blue left accent, Fraunces sub-header, full width). ──
export const SynthesisBlock: React.FC<{ title?: string; items?: any; children?: React.ReactNode }> = ({ title, items, children }) => {
  const list = asArray<string>(items).filter(Boolean);
  if (!list.length && !children) return null;
  return (
    <div className="lv-synthesis">
      {title && <div className="lv-synthesis-title">{title}</div>}
      {list.length > 0 && <ul className="lv-synthesis-list">{list.map((n, i) => <li key={i}>{n}</li>)}</ul>}
      {children}
    </div>
  );
};

// ── LabeledCardGroups (needs / decision / awareness lanes) ───────────────────

export interface CardGroup { label: string; tone?: Tone; cards: InsightCardContent[]; }

export const LabeledCardGroups: React.FC<{ groups: CardGroup[] }> = ({ groups }) => {
  const valid = asArray<CardGroup>(groups).filter((g) => g.cards && g.cards.length);
  // N5 — evidence share is computed against the whole section (all groups).
  const sectionTotal = valid.reduce(
    (s, g) => s + g.cards.reduce((t, c) => t + (typeof c.evidenceWeight === 'number' ? c.evidenceWeight : 0), 0), 0);
  return (
    <>
      {valid.map((g, i) => (
        <div key={i} className={`lv-subzone lv-sublayer-${(i % 4) + 1}`}>
          <SubHead label={g.label} tone={g.tone} />
          <InsightCardGrid items={g.cards} totalN={sectionTotal} />
        </div>
      ))}
    </>
  );
};

// ── CrossTab (interaction matrix) ────────────────────────────────────────────

export interface CrossTabContent { columns: string[]; rows: Array<{ label: string; cells: string[] }>; }

export const CrossTab: React.FC<{ matrix?: CrossTabContent }> = ({ matrix }) => {
  const cols = asArray<string>(matrix?.columns);
  const rows = asArray<any>(matrix?.rows);
  if (!cols.length) return null;
  return (
    <div className="lv-xtab">
      <table>
        <thead>
          <tr><th /> {cols.map((c, i) => <th key={i}>{toTitleCase(c)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td>{toTitleCase(r?.label)}</td>
              {asArray<string>(r?.cells).map((cell, ci) => <td key={ci}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Block 11 · JourneySpine ──────────────────────────────────────────────────

export interface JourneyLane {
  age_band?: string; headline?: string; size_signal?: string;
  needs?: string[]; mindset?: string; switch_triggers?: string[]; verbatims?: VerbatimContent[];
}

export const JourneySpine: React.FC<{ lanes: JourneyLane[]; spineSummary?: string[] }> = ({ lanes, spineSummary }) => {
  const list = asArray<JourneyLane>(lanes);
  if (!list.length) return null;
  return (
    <div>
      <div className="lv-spine">
        {list.map((l, i) => (
          <div key={i} className="lv-spine-node">
            <span className="lv-spine-dot" />
            <span className="lv-spine-lab">{l.age_band}</span>
          </div>
        ))}
      </div>
      {list.map((l, i) => (
        <div key={i} className="lv-lane">
          <div className="lv-lane-head">
            <span className="lv-ldot" />
            <span className="lv-lane-title">{l.headline}</span>
            <span className="lv-lane-age">{l.age_band}</span>
            {l.size_signal && <span className="lv-lane-sig">{l.size_signal}</span>}
          </div>
          {/* L3.3 — mindset promoted to the top as a strategic annotation. */}
          {l.mindset && <div className="lv-strat-note">Mindset · {l.mindset}</div>}
          <div className="lv-lane-grid2">
            <div>
              <div className="lv-lane-lab">Needs</div>
              <NotesList items={l.needs} />
            </div>
            <div>
              <div className="lv-lane-lab">Switch triggers</div>
              <NotesList items={l.switch_triggers} />
            </div>
          </div>
          <div className="lv-lane-evidence">
            <div className="lv-lane-lab">Evidence</div>
            <VerbatimChipList items={l.verbatims} max={5} />
          </div>
        </div>
      ))}
      <NoteBox title="The spine — what moves parents" items={spineSummary} />
    </div>
  );
};

// ── Block 13 · RankedBars (attribute drivers) ────────────────────────────────

export interface DriverContent {
  attribute: string; tier?: string; importance?: string; insight?: string; verbatims?: VerbatimContent[];
}

const TIER_META: Record<string, { label: string; tone: Tone }> = {
  must_have: { label: 'Must-have', tone: 'rose' },
  good_to_have: { label: 'Good-to-have', tone: 'orange' },
  delighter: { label: 'Delighter', tone: 'teal' },
};
const impWeight = (imp?: string): number => (imp === 'HIGH' ? 92 : imp === 'LOW' ? 34 : 62);
const impClass = (imp?: string): string => (imp === 'HIGH' ? 'lv-imp-high' : imp === 'LOW' ? 'lv-imp-low' : 'lv-imp-med');

export const RankedBars: React.FC<{ drivers: DriverContent[] }> = ({ drivers }) => {
  const list = asArray<DriverContent>(drivers);
  if (!list.length) return null;
  const order = ['must_have', 'good_to_have', 'delighter'];
  const groups = order.map((tier) => ({ tier, items: list.filter((d) => (d.tier || 'good_to_have') === tier) }))
    .filter((g) => g.items.length);
  return (
    <>
      {groups.map((g) => (
        <div key={g.tier} className="lv-tiergroup">
          <SubHead label={TIER_META[g.tier]?.label || g.tier} tone={TIER_META[g.tier]?.tone} />
          {g.items.map((d, i) => (
            <div key={i} className="lv-driver">
              <div className="lv-driver-head">
                <span className="lv-driver-name">{d.attribute}</span>
                <span className={`lv-imp ${impClass(d.importance)}`}>{d.importance || 'MED'}</span>
              </div>
              <div className="lv-weightbar"><span style={{ width: `${impWeight(d.importance)}%` }} /></div>
              {d.insight && <div className="lv-driver-insight">{d.insight}</div>}
              <VerbatimChipList items={d.verbatims} max={5} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

// ── Block 21 · GapColumns ────────────────────────────────────────────────────

export interface GapBullet { claim: string; explanation?: string; severity?: string; data_points?: number; consumer_evidence?: VerbatimContent[]; }
export interface GapBlock { heading?: string; bullets: GapBullet[]; }
export interface NeedStatement { need: string; why_now?: string; who?: string; priority?: string; consumer_evidence?: VerbatimContent[]; }

const sevClass = (s?: string): string => {
  const u = (s || '').toUpperCase();
  return u === 'HIGH' ? 'lv-sev-high' : u === 'LOW' ? 'lv-sev-low' : 'lv-sev-med';
};

const GapRows: React.FC<{ bullets: GapBullet[]; totalN?: number }> = ({ bullets, totalN }) => (
  <>
    {asArray<GapBullet>(bullets).map((b, i) => {
      const pct = evidencePct(b.data_points, totalN);
      return (
      <div key={i} className={`lv-gaprow ${sevClass(b.severity)}`}>
        <div className="lv-gaprow-head">
          <span className="lv-gap-claim">{sanitiseConsumerText(b.claim)}</span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 'none' }}>
            {b.severity && <span className="lv-sev">{b.severity}</span>}
            {typeof b.data_points === 'number' && (
              <span className="lv-evbadge"
                title={pct ? `${b.data_points.toLocaleString()} data points out of ${totalN!.toLocaleString()} in this section` : 'Evidence weight — number of corpus records supporting this finding'}>
                {pct ?? `n = ${b.data_points.toLocaleString()}`}
              </span>
            )}
          </span>
        </div>
        {b.explanation && <div className="lv-gap-exp">{sanitiseConsumerText(b.explanation)}</div>}
        <VerbatimChipList items={b.consumer_evidence} />
      </div>
      );
    })}
  </>
);

export interface GapColumnsContent {
  current?: GapBlock; resolved?: GapBlock; unresolved?: GapBlock; needGap?: { heading?: string; need_statements: NeedStatement[] };
}

export const GapColumns: React.FC<GapColumnsContent> = ({ current, resolved, unresolved, needGap }) => {
  // N5 — share-of-evidence denominator spans every bullet in the section.
  const gapTotal = [current, resolved, unresolved]
    .flatMap((blk) => asArray<GapBullet>(blk?.bullets))
    .reduce((s, b) => s + (typeof b?.data_points === 'number' ? b.data_points : 0), 0);
  return (
  <div>
    {current && asArray(current.bullets).length > 0 && (
      <div className="lv-subzone">
        <SubHead label={current.heading || 'Current challenges'} tone="rose" />
        <GapRows bullets={current.bullets} totalN={gapTotal} />
      </div>
    )}
    {((resolved && asArray(resolved.bullets).length) || (unresolved && asArray(unresolved.bullets).length)) && (
      <div className="lv-subzone lv-gapcols">
        {resolved && asArray(resolved.bullets).length > 0 && (
          <div><SubHead label={resolved.heading || 'Resolved'} tone="teal" /><GapRows bullets={resolved.bullets} totalN={gapTotal} /></div>
        )}
        {unresolved && asArray(unresolved.bullets).length > 0 && (
          <div><SubHead label={unresolved.heading || 'Unresolved'} tone="orange" /><GapRows bullets={unresolved.bullets} totalN={gapTotal} /></div>
        )}
      </div>
    )}
    {needGap && asArray(needGap.need_statements).length > 0 && (
      <div className="lv-subzone">
        <SubHead label={needGap.heading || 'White space & need gaps'} tone="blue" />
        {asArray<NeedStatement>(needGap.need_statements).map((n, i) => (
          <div key={i} className="lv-need">
            <div className="lv-need-head">
              <span className="lv-need-title">{n.need}</span>
              <span className={`lv-prio lv-${(n.priority || 'P1').toLowerCase()}`}>{({ P0: 'IMMEDIATE', P1: 'NEXT PHASE', P2: 'STRATEGIC' } as Record<string, string>)[(n.priority || 'P1').toUpperCase()] || (n.priority || 'P1')}</span>
            </div>
            {n.why_now && <div className="lv-need-meta"><b>Why now:</b> {n.why_now}</div>}
            {n.who && <div className="lv-need-meta"><b>Who:</b> {n.who}</div>}
            <VerbatimChipList items={n.consumer_evidence} />
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

// ── Block 20 · SovBars (brand landscape) ─────────────────────────────────────

export interface BrandContent {
  brand: string; tier?: string; overall_sentiment?: string;
  share_of_voice?: { share_pct?: number };
  positioning_summary?: string; strengths?: string[]; weaknesses?: string[];
  attribute_scale?: Array<{ attribute: string; score_0_5: number }>;
  verbatims?: VerbatimContent[];
}

const sentClass = (s?: string): string => {
  const u = (s || 'MIX').toUpperCase();
  return u === 'POS' ? 'lv-sent-pos' : u === 'NEG' ? 'lv-sent-neg' : 'lv-sent-mix';
};

export const SovBars: React.FC<{ marketStructure?: string[]; brands: BrandContent[]; focusBrand?: string }> = ({
  marketStructure, brands, focusBrand = 'lovingle',
}) => (
  <div>
    <NoteBox title="Market structure" items={marketStructure} />
    <div style={{ marginTop: asArray(marketStructure).length ? 14 : 0 }}>
      {asArray<BrandContent>(brands).map((b, i) => {
        const isFocus = (b.brand || '').toLowerCase() === focusBrand;
        return (
          <div key={i} className={`lv-brand${isFocus ? ' lv-focus' : ''}`}>
            <div className="lv-brand-head">
              <span className="lv-brand-name">{b.brand}</span>
              {isFocus && <span className="lv-focus-flag">Focus</span>}
              {b.tier && <span className="lv-tier">{String(b.tier).replace(/_/g, ' ')}</span>}
              {b.overall_sentiment && <span className={`lv-sent ${sentClass(b.overall_sentiment)}`}>{b.overall_sentiment}</span>}
              <span className="lv-sov">SOV {b.share_of_voice?.share_pct ?? 0}%</span>
            </div>
            <div className="lv-brand-body">
              <div>
                {b.positioning_summary && <p className="lv-pos-summary">{b.positioning_summary}</p>}
                <div className="lv-tags">
                  {asArray<string>(b.strengths).map((s, j) => <span key={j} className="lv-tagpos">+ {s}</span>)}
                  {asArray<string>(b.weaknesses).map((w, j) => <span key={j} className="lv-tagneg">− {w}</span>)}
                </div>
                <VerbatimChipList items={b.verbatims} max={5} />
              </div>
              <div>
                {asArray<any>(b.attribute_scale).map((a, j) => (
                  <div key={j} className="lv-attr">
                    <span className="lv-attr-name">{toTitleCase(a.attribute)}</span>
                    <span className="lv-attr-track"><span style={{ width: `${Math.min(100, (a.score_0_5 / 5) * 100)}%` }} /></span>
                    <span className="lv-attr-score">{a.score_0_5}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── L3.11 · CrossBrandBars — all brands on the same attribute axes ───────────

const BRAND_COLORS: Record<string, string> = {
  pampers: '#3B82F6', huggies: '#10B981', mamypoko: '#8B5CF6',
  'little angels': '#6B7280', lovingle: '#F26F21',
};
const brandColor = (name?: string): string => BRAND_COLORS[(name || '').toLowerCase().trim()] || 'var(--ink-3)';

export const CrossBrandBars: React.FC<{ brands: BrandContent[] }> = ({ brands }) => {
  const list = asArray<BrandContent>(brands).filter((b) => asArray(b.attribute_scale).length);
  if (list.length < 2) return null;
  const attrs: string[] = [];
  list.forEach((b) => asArray<any>(b.attribute_scale).forEach((a) => {
    if (a?.attribute && !attrs.includes(a.attribute)) attrs.push(a.attribute);
  }));
  if (!attrs.length) return null;
  const scoreOf = (b: BrandContent, attr: string): number | null => {
    const a = asArray<any>(b.attribute_scale).find((x) => x.attribute === attr);
    return typeof a?.score_0_5 === 'number' ? a.score_0_5 : null;
  };
  return (
    <div className="lv-xbrand">
      <div className="lv-xbrand-legend">
        {list.map((b, i) => (
          <span key={i} className="lv-xbrand-leg"><span className="lv-xbrand-sw" style={{ background: brandColor(b.brand) }} />{b.brand}</span>
        ))}
      </div>
      {attrs.map((attr, ai) => (
        <div key={ai} className="lv-xbrand-row">
          <div className="lv-xbrand-attr">{toTitleCase(attr)}</div>
          <div className="lv-xbrand-bars">
            {list.map((b, i) => {
              const s = scoreOf(b, attr);
              if (s == null) return null;
              return (
                <div key={i} className="lv-xbrand-bar" title={`${b.brand}: ${s}/5`}>
                  <span style={{ width: `${(s / 5) * 100}%`, background: brandColor(b.brand) }} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── SwitchStories (Lovingle diagnostic) ──────────────────────────────────────

export interface SwitchStory {
  direction?: string; from_brand?: string; to_brand?: string; trigger?: string;
  motivational_cluster?: string; baby_age_context?: string; channel?: string;
  signal_strength?: string; net_outcome?: string; strategic_implication?: string;
  verbatims?: VerbatimContent[];
}

const CLUSTER_LABELS: Record<string, string> = {
  price_value: 'Price / Value', rash_skin_safety: 'Rash / Skin Safety',
  availability_access: 'Availability', size_fit: 'Size / Fit',
  recommendation: 'Recommendation', brand_image: 'Brand Image',
  absorbency_leak: 'Absorbency / Leak', comfort_softness: 'Comfort / Softness',
};

const STRENGTH_DOT: Record<string, string> = { strong: '#22c55e', moderate: '#f59e0b', emerging: '#94a3b8' };

export const SwitchStories: React.FC<{ stories: SwitchStory[]; corridorSummary?: string }> = ({ stories, corridorSummary }) => {
  const list = asArray<SwitchStory>(stories);
  if (!list.length) return null;
  const wins = list.filter(s => s.direction === 'to_lovingle');
  const leaks = list.filter(s => s.direction !== 'to_lovingle');
  return (
    <div className="lv-switches-v2">
      {/* L3.12 — win:leak ratio as a headline finding. */}
      <div className="lv-switch-headline">
        <b>{wins.length} Wins : {leaks.length} Leaks</b> — Lovingle gains from value brands, loses to premium brands
      </div>
      {corridorSummary && (
        <div className="lv-corridor-summary">{corridorSummary}</div>
      )}
      <div className="lv-switch-cols">
        {[{ label: 'Wins', items: wins, cls: 'lv-win' }, { label: 'Leaks', items: leaks, cls: 'lv-leak' }].map(col => (
          <div key={col.label} className={`lv-switch-col lv-switch-col-${col.label.toLowerCase()}`}>
            <div className="lv-switch-col-head">{col.label} <span className="lv-switch-col-cnt">{col.items.length}</span></div>
            {col.items.map((s, i) => {
              const into = s.direction === 'to_lovingle';
              const dot = STRENGTH_DOT[s.signal_strength || ''] || STRENGTH_DOT.emerging;
              return (
                <div key={i} className={`lv-switch ${col.cls}`}>
                  <div className="lv-switch-head">
                    <span>{s.from_brand}</span>
                    <span className="lv-switch-arrow">→</span>
                    <span>{s.to_brand}</span>
                    <span className="lv-switch-flag">{into ? 'Win' : 'Leak'}</span>
                  </div>
                  {s.trigger && <div className="lv-switch-trigger">{s.trigger}</div>}
                  <div className="lv-switch-meta">
                    {s.motivational_cluster && (
                      <span className="lv-switch-tag">{CLUSTER_LABELS[s.motivational_cluster] || s.motivational_cluster}</span>
                    )}
                    {s.signal_strength && (
                      <span className="lv-switch-signal">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: dot, marginRight: 4 }} />
                        {s.signal_strength}
                      </span>
                    )}
                    {s.baby_age_context && <span className="lv-switch-age">{s.baby_age_context}</span>}
                  </div>
                  {s.net_outcome && <div className="lv-switch-outcome"><strong>Outcome:</strong> {s.net_outcome}</div>}
                  {s.strategic_implication && <div className="lv-switch-strat"><strong>→ RSPL action:</strong> {s.strategic_implication}</div>}
                  <VerbatimChipList items={s.verbatims} max={5} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
//  GATE 3 BLOCKS — the 8 new sections (hand-rolled SVG; scoped lv-)
// ============================================================================

const clamp = (n: any, lo = 0, hi = 100): number => {
  const v = typeof n === 'number' ? n : parseFloat(n);
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
};

// ── HeadlineStatBand ─────────────────────────────────────────────────────────

export interface StatItem { stat: string; label: string; }
export const HeadlineStatBand: React.FC<{ stats: StatItem[]; northStar?: string }> = ({ stats, northStar }) => {
  const list = asArray<StatItem>(stats);
  return (
    <div>
      {list.length > 0 && (
        <div className="lv-statband">
          {list.map((s, i) => (
            <div key={i} className="lv-stat">
              <div className="lv-stat-num">{s.stat}</div>
              <div className="lv-stat-lab">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {northStar && (
        <div className="lv-northstar">
          <span className="lv-northstar-tag">North star</span>
          <span className="lv-northstar-text">{northStar}</span>
        </div>
      )}
    </div>
  );
};

// ── WaveChart (12-month demand rhythm) — hand-rolled SVG ─────────────────────

export interface WaveSpike { month: string; label: string; verbatim?: VerbatimContent; }
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const WaveChart: React.FC<{ monthly: number[]; spikes?: WaveSpike[] }> = ({ monthly, spikes }) => {
  const data = asArray<number>(monthly).slice(0, 12).map((n) => clamp(n));
  if (data.length < 2) return null;
  const W = 760, H = 200, pad = 28;
  const stepX = (W - pad * 2) / (data.length - 1);
  const y = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  const pts = data.map((v, i) => [pad + i * stepX, y(v)] as const);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pad},${H - pad} Z`;
  return (
    <div>
      <div className="lv-wave">
        <svg viewBox={`0 0 ${W} ${H}`} className="lv-wave-svg" preserveAspectRatio="none" role="img" aria-label="12-month demand rhythm">
          <defs>
            <linearGradient id="lvWaveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F58C39" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#F58C39" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* L3.2 — seasonal spike windows behind the curve. */}
          {[
            { from: 3, to: 5, fill: 'rgba(242,179,33,0.08)', label: 'SUMMER' },
            { from: 5, to: 7, fill: 'rgba(86,194,214,0.08)', label: 'MONSOON' },
            { from: 9, to: 10, fill: 'rgba(242,111,33,0.08)', label: 'FESTIVE' },
          ].map((b, i) => {
            const x1 = pad + b.from * stepX, x2 = pad + b.to * stepX;
            return (
              <g key={`band${i}`}>
                <rect x={x1} y={pad} width={x2 - x1} height={H - pad * 2} fill={b.fill} />
                <text x={(x1 + x2) / 2} y={pad + 11} textAnchor="middle" className="lv-wave-band">{b.label}</text>
              </g>
            );
          })}
          <path d={area} fill="url(#lvWaveFill)" />
          <path d={line} fill="none" stroke="#DC5E14" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#DC5E14" />)}
          {pts.map((p, i) => (
            <text key={`t${i}`} x={p[0]} y={H - 8} textAnchor="middle" className="lv-wave-mlab">{MONTHS[i]}</text>
          ))}
        </svg>
      </div>
      {asArray<WaveSpike>(spikes).length > 0 && (
        <div className="lv-spikes">
          {asArray<WaveSpike>(spikes).map((s, i) => (
            <div key={i} className="lv-spike">
              <div className="lv-spike-head"><span className="lv-spike-month">{s.month}</span><span className="lv-spike-label">{s.label}</span></div>
              {s.verbatim && <VerbatimChip v={s.verbatim} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── SegmentCards ─────────────────────────────────────────────────────────────

export interface SegmentItem { segment: string; definition?: string; behaviours?: string[]; verbatims?: VerbatimContent[]; }
export const SegmentCards: React.FC<{ segments: SegmentItem[] }> = ({ segments }) => {
  const list = asArray<SegmentItem>(segments);
  if (!list.length) return null;
  return (
    <div className="lv-segments">
      {list.map((s, i) => (
        <div key={i} className="lv-segment">
          <div className="lv-segment-name">{s.segment}</div>
          {s.definition && <div className="lv-segment-def">{s.definition}</div>}
          {asArray<string>(s.behaviours).length > 0 && (
            <ul className="lv-notes">{asArray<string>(s.behaviours).map((b, j) => <li key={j}>{b}</li>)}</ul>
          )}
          <VerbatimChipList items={s.verbatims} max={3} />
        </div>
      ))}
    </div>
  );
};

// ── ChannelFlow (GT → MT → Online) ───────────────────────────────────────────

export interface ChannelNode { node: string; share?: number; maps_to_pack?: string; note?: string; verbatims?: VerbatimContent[]; }
const ChannelNodeCard: React.FC<{ n: ChannelNode }> = ({ n }) => (
  <div className="lv-flow-node">
    <div className="lv-flow-head">
      <span className="lv-flow-name">{n.node}</span>
      {typeof n.share === 'number' && <span className="lv-flow-share">{n.share}%</span>}
    </div>
    {typeof n.share === 'number' && <div className="lv-flow-bar"><span style={{ width: `${clamp(n.share)}%` }} /></div>}
    {n.maps_to_pack && <div className="lv-flow-pack">{sanitiseConsumerText(n.maps_to_pack)}</div>}
    {n.note && <div className="lv-flow-note">{sanitiseConsumerText(n.note)}</div>}
    <VerbatimChipList items={n.verbatims} max={1} />
  </div>
);

// L3.10 — 2-row layout (physical vs digital) fixes the funnel's viewport clipping.
const isDigitalChannel = (name?: string): boolean =>
  /amazon|flipkart|online|q.?commerce|quick.?comm|blinkit|zepto|instamart|d2c|firstcry|e-?com/i.test(name || '');

export const ChannelFlow: React.FC<{ nodes: ChannelNode[]; flowNotes?: string[] }> = ({ nodes, flowNotes }) => {
  const list = asArray<ChannelNode>(nodes);
  if (!list.length) return null;
  const digital = list.filter((n) => isDigitalChannel(n.node));
  const physical = list.filter((n) => !isDigitalChannel(n.node));
  return (
    <div>
      {physical.length > 0 && (
        <div className="lv-flow-row">
          <div className="lv-flow-rowlab">Physical channels</div>
          <div className="lv-flow-2row">{physical.map((n, i) => <ChannelNodeCard key={i} n={n} />)}</div>
        </div>
      )}
      {digital.length > 0 && (
        <div className="lv-flow-row">
          <div className="lv-flow-rowlab">Digital channels</div>
          <div className="lv-flow-2row">{digital.map((n, i) => <ChannelNodeCard key={i} n={n} />)}</div>
        </div>
      )}
      <NoteBox title="Premiumisation flows rightward" items={flowNotes} />
    </div>
  );
};

// ── RegionMap (stylised tinted intensity bars) ───────────────────────────────

export interface RegionItem { name: string; intensity?: number; note?: string; verbatims?: VerbatimContent[]; }
export const RegionMap: React.FC<{ regions: RegionItem[]; summary?: string[] }> = ({ regions, summary }) => {
  const list = asArray<RegionItem>(regions);
  if (!list.length) return null;
  const tint = (v: number) => `rgba(242,111,33,${(0.12 + (clamp(v) / 100) * 0.6).toFixed(2)})`;
  return (
    <div>
      <div className="lv-regions">
        {list.map((r, i) => (
          <div key={i} className="lv-region">
            <div className="lv-region-chip" style={{ background: tint(r.intensity ?? 0) }} aria-hidden="true">
              <span className="lv-region-pct">{typeof r.intensity === 'number' ? `${r.intensity}` : ''}</span>
            </div>
            <div className="lv-region-body">
              <div className="lv-region-name">{r.name}</div>
              {r.note && <div className="lv-region-note">{r.note}</div>}
              <VerbatimChipList items={r.verbatims} max={3} />
            </div>
          </div>
        ))}
      </div>
      <NoteBox items={summary} />
    </div>
  );
};

// ── NetworkDiagram (centre → influence nodes) — hand-rolled SVG ──────────────

export interface NetNode { name: string; role?: string; weight?: number; verbatim?: VerbatimContent; }
export const NetworkDiagram: React.FC<{ center: string; nodes: NetNode[]; excluded?: string[]; notes?: string[] }> = ({ center, nodes, excluded, notes }) => {
  const list = asArray<NetNode>(nodes);
  if (!list.length) return null;
  const W = 760, H = 300, cx = W / 2, cy = H / 2, R = 108;
  const positions = list.map((_, i) => {
    const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / list.length;
    return [cx + Math.cos(ang) * R, cy + Math.sin(ang) * R] as const;
  });
  return (
    <div>
      <div className="lv-network">
        <svg viewBox={`0 0 ${W} ${H}`} className="lv-network-svg" role="img" aria-label="Influence network">
          {positions.map((p, i) => <line key={`l${i}`} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#E0D6C4" strokeWidth={1 + (clamp(list[i].weight ?? 0) / 100) * 3} />)}
          {positions.map((p, i) => (
            <g key={`n${i}`}>
              <circle cx={p[0]} cy={p[1]} r={16 + (clamp(list[i].weight ?? 0) / 100) * 12} fill="#FFF4EB" stroke="#F58C39" strokeWidth="1.5" />
              <text x={p[0]} y={p[1] + 3} textAnchor="middle" className="lv-net-w">{typeof list[i].weight === 'number' ? list[i].weight : ''}</text>
            </g>
          ))}
          <circle cx={cx} cy={cy} r="34" fill="#1C3C8E" />
          <text x={cx} y={cy + 4} textAnchor="middle" className="lv-net-center">Parent</text>
        </svg>
      </div>
      <div className="lv-netcards">
        {list.map((n, i) => (
          <div key={i} className="lv-netcard">
            <div className="lv-netcard-head">
              <span className="lv-netcard-name">{n.name}</span>
              {typeof n.weight === 'number' && <span className="lv-netcard-w">{n.weight}</span>}
            </div>
            {n.role && <div className="lv-netcard-role">{n.role}</div>}
            {n.verbatim && <VerbatimChip v={n.verbatim} />}
          </div>
        ))}
      </div>
      {asArray<string>(excluded).length > 0 && (
        <div className="lv-excluded">
          <span className="lv-excluded-tag">Excluded</span>
          <span>{asArray<string>(excluded).join(' · ')}</span>
        </div>
      )}
      <NoteBox items={notes} />
    </div>
  );
};

// ── MatrixQuadrant (effort × impact) — hand-rolled SVG ───────────────────────

export interface QuadrantPoint { label: string; x?: number; y?: number; quadrant?: string; note?: string; }
export const MatrixQuadrant: React.FC<{ xAxis?: { low?: string; high?: string }; yAxis?: { low?: string; high?: string }; points: QuadrantPoint[] }> = ({ xAxis, yAxis, points }) => {
  const list = asArray<QuadrantPoint>(points);
  if (!list.length) return null;
  const S = 360, pad = 30, span = S - pad * 2;
  const px = (x: number) => pad + (clamp(x) / 100) * span;
  const py = (y: number) => S - pad - (clamp(y) / 100) * span;
  // L3.14 — colour dots by quadrant.
  const quadColor = (q?: string): string => {
    const u = (q || '').toLowerCase();
    if (u.includes('big') || u.includes('bet')) return '#F26F21';
    if (u.includes('quick') || u.includes('win')) return '#1F9D6B';
    if (u.includes('maintain')) return '#6B7280';
    return '#F26F21';
  };
  return (
    <div className="lv-quadwrap">
      <div className="lv-quad">
        <svg viewBox={`0 0 ${S} ${S}`} className="lv-quad-svg" role="img" aria-label="Effort by impact matrix">
          <rect x={pad} y={pad} width={span} height={span} fill="#FFFBF4" stroke="#E0D6C4" />
          <line x1={pad + span / 2} y1={pad} x2={pad + span / 2} y2={S - pad} stroke="#E0D6C4" strokeDasharray="4 4" />
          <line x1={pad} y1={pad + span / 2} x2={S - pad} y2={pad + span / 2} stroke="#E0D6C4" strokeDasharray="4 4" />
          {list.map((p, i) => (
            <g key={i}>
              <circle cx={px(p.x ?? 50)} cy={py(p.y ?? 50)} r="10" fill={quadColor(p.quadrant)} fillOpacity="0.9" stroke="#fff" strokeWidth="2" />
              <text x={px(p.x ?? 50)} y={py(p.y ?? 50) + 3.5} textAnchor="middle" className="lv-quad-plab" fill="#fff" style={{ fontSize: '11px', fontWeight: 700 }}>{i + 1}</text>
            </g>
          ))}
          <text x={S / 2} y={S - 8} textAnchor="middle" className="lv-quad-axis">{xAxis?.low || 'Low'} → {xAxis?.high || 'High'} effort</text>
          <text x={12} y={S / 2} textAnchor="middle" transform={`rotate(-90 12 ${S / 2})`} className="lv-quad-axis">{yAxis?.low || 'Low'} → {yAxis?.high || 'High'} impact</text>
        </svg>
      </div>
      <ol className="lv-quad-legend">
        {list.map((p, i) => (
          <li key={i}>
            <span className="lv-quad-n">{i + 1}</span>
            <span><b>{p.label}</b>{p.quadrant ? <span className="lv-quad-tag">{p.quadrant}</span> : null}{p.note ? <span className="lv-quad-note">{p.note}</span> : null}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};
