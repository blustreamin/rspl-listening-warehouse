/* ============================================================================
   BOOKLET CHROME — cover, TOC, section header bar, footer, logo slots.
   Face Care booklet presentation layer (see styles/booklet.css for tokens).
   N8 discipline: the focus-brand name never appears in this file — chrome
   carries RSPL + Blustream branding only; the brand lives in analysis content.
   ============================================================================ */

import React from 'react';
import { BABY_DIAPERS_TEMPLATE, REPORT_DIVISION } from '../../../templates/baby_diapers_template';

export const BOOKLET_TITLE = 'BABY DIAPER';
export const BOOKLET_SUBTITLE = 'CATEGORY AND CONSUMER UNDERSTANDING';

// The structure doc's 7 numbered main headings, exactly (normalized numbering;
// its duplicate "5" made sequential, the "BEHVAIOUR" typo corrected). The five
// standalone headings carry no part and render as their own top-level entries;
// Executive Summary is the Preface, Data Foundation the Appendix.
export const PART_TITLES: Record<string, string> = {
  '1': 'Overarching Parenting Behaviour',
  '2': 'Baby Diaper Category Context',
  '3': 'Baby Diaper Usage & Behaviour',
  '4': 'Product Features & Expected Benefits',
  '5': 'Shopping Behaviour',
  '6': 'Brand Landscape',
  '7': 'Pricing',
};

// N14 — zero-padded number from the canonical registry order, 00-based
// (00 = Executive Summary … 20 = Data Foundation).
export const bookletSectionNumber = (sectionId?: string): string | undefined => {
  if (!sectionId) return undefined;
  const idx = BABY_DIAPERS_TEMPLATE.sections.findIndex((s) => s.sectionId === sectionId);
  return idx >= 0 ? String(idx).padStart(2, '0') : undefined;
};

// Accent routing: numbered parts get their hue; standalone headings, the
// Preface and the Appendix use the neutral navy accent.
export const sectionPart = (sectionId?: string): string => {
  const sec: any = BABY_DIAPERS_TEMPLATE.sections.find((s) => s.sectionId === sectionId);
  return sec?.part || 'neutral';
};

// ── Logo slots ───────────────────────────────────────────────────────────────
// Assets in /public/brand/ — all background-isolated (transparent):
//   blustream-logo.png / rspl-logo.png             — color, for LIGHT surfaces
//   blustream-logo-white.png / rspl-logo-white.png — white monotone, for DARK surfaces
// Dark surfaces (cover / back cover) use the -white variants straight on the
// navy — no backing plates. The images are never recolored or tinted in CSS.
// If an image 404s, a clean text-mark renders in its place (currentColor, so
// it reads white on navy and blue on white).

const useImgFallback = (): [boolean, () => void] => {
  const [failed, setFailed] = React.useState(false);
  return [failed, () => setFailed(true)];
};

type LogoVariant = 'color' | 'white';

export const BlustreamLogo: React.FC<{ variant?: LogoVariant }> = ({ variant = 'color' }) => {
  const [failed, onError] = useImgFallback();
  return (
    <span className={`bk-logo bk-logo-blustream bk-logo-${variant}`}>
      {failed
        ? <span className="bk-logo-fallback">blustream</span>
        : <img src={`/brand/blustream-logo${variant === 'white' ? '-white' : ''}.png`} alt="Blustream" onError={onError} />}
    </span>
  );
};

export const RsplLogo: React.FC<{ variant?: LogoVariant }> = ({ variant = 'color' }) => {
  const [failed, onError] = useImgFallback();
  return (
    <span className={`bk-logo bk-logo-rsplmark bk-logo-${variant}`}>
      {failed
        ? <span className="bk-logo-fallback bk-logo-rspl">RSPL</span>
        : <img src={`/brand/rspl-logo${variant === 'white' ? '-white' : ''}.png`} alt="RSPL" onError={onError} />}
    </span>
  );
};

// ── BookletCover ─────────────────────────────────────────────────────────────

export const BookletCover: React.FC = () => (
  <div className="lv-section-break bk-cover-page">
    <div className="bk-cover">
      <span className="bk-cover-accent" aria-hidden="true" />
      <div className="bk-cover-top">
        <BlustreamLogo variant="white" />
        <span className="bk-cover-kicker">Social Listening &amp; Cultural Intelligence</span>
      </div>
      <div className="bk-cover-mid">
        <h1 className="bk-cover-title">{BOOKLET_TITLE}</h1>
        <span className="bk-cover-rule" aria-hidden="true" />
        <p className="bk-cover-sub">{BOOKLET_SUBTITLE}</p>
      </div>
      <div className="bk-cover-bottom">
        <RsplLogo variant="white" />
        <span className="bk-cover-pill">Presented by Blustream.in</span>
      </div>
    </div>
  </div>
);

// ── BabyDiaperDivider (N-20) ─────────────────────────────────────────────────
// Full-bleed navy section-divider slide announcing the shift from general
// parenting behaviour (Part 1) to the diaper category itself. Rendered as its
// OWN top-level `.lv-section-break` leaf (no id → single-page contain) so it
// paginates as its own A4 page in the PDF, immediately before §05.
export const BabyDiaperDivider: React.FC = () => (
  <div className="lv-section-break bk-divider-page">
    <div className="bk-divider">
      <span className="bk-divider-accent" aria-hidden="true" />
      <span className="bk-divider-kicker">The category in focus</span>
      <h2 className="bk-divider-title">Baby Diapers</h2>
      <span className="bk-divider-rule" aria-hidden="true" />
      <p className="bk-divider-sub">
        From parenting behaviour to the diaper itself — needs, journey, usage,
        features, shopping, brand and price.
      </p>
    </div>
  </div>
);

// ── BookletTOC ───────────────────────────────────────────────────────────────
// Single-column, strict reading-order contents (booklet convention). Each main
// heading is a full-width navy band (number block left, heading in white caps);
// its sections follow as indented anchor rows. The five standalone headings get
// a slim dash glyph instead of a number; Preface (00) and Appendix (20) render
// as quiet rows. Web rows are whole-row anchors with hover/focus states; the
// print/PDF variant drops chevrons and hover.

const TocChevron: React.FC = () => (
  <svg className="bk-toc-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface TocRow { num: string; title: string; id: string; }
interface TocBlock { kind: 'preface' | 'appendix' | 'band'; bandNum?: string; label?: string; rows: TocRow[]; }

export const BookletTOC: React.FC = () => {
  const blocks: TocBlock[] = [];
  BABY_DIAPERS_TEMPLATE.sections.forEach((s: any, idx) => {
    const row: TocRow = { num: String(idx).padStart(2, '0'), title: s.title, id: s.sectionId };
    if (s.sectionId === 'exec_summary') { blocks.push({ kind: 'preface', rows: [row] }); return; }
    if (s.sectionId === 'data_foundation') { blocks.push({ kind: 'appendix', rows: [row] }); return; }
    const last = blocks[blocks.length - 1];
    if (s.part && last && last.kind === 'band' && last.bandNum === s.part) { last.rows.push(row); return; }
    blocks.push({
      kind: 'band',
      bandNum: s.part || undefined,
      label: s.part ? (PART_TITLES[s.part] || `Part ${s.part}`) : s.title,
      rows: [row],
    });
  });

  const SectionRow: React.FC<{ r: TocRow }> = ({ r }) => (
    <a className="bk-toc-row" href={`#section-${r.id}`}>
      <span className="bk-toc-num">{r.num}</span>
      <span className="bk-toc-rowtitle">{r.title}</span>
      <TocChevron />
    </a>
  );

  return (
    <div className="lv-section-break bk-toc-page">
      <nav className="bk-toc" aria-label="Contents">
        <h2 className="bk-toc-head">Contents</h2>
        <p className="bk-toc-sub">Baby Diaper — Category and Consumer Understanding</p>
        <div className="bk-toc-flow">
          {blocks.map((b, i) => {
            if (b.kind === 'preface' || b.kind === 'appendix') {
              return (
                <div key={i} className="bk-toc-quiet">
                  <span className="bk-toc-quietlabel">{b.kind === 'preface' ? 'Preface' : 'Appendix'}</span>
                  <SectionRow r={b.rows[0]} />
                </div>
              );
            }
            return (
              <div key={i} className="bk-toc-block">
                <div className="bk-toc-band">
                  <span className="bk-toc-bandnum">{b.bandNum || '—'}</span>
                  <span className="bk-toc-bandlabel">{b.label}</span>
                </div>
                <div className="bk-toc-rows">
                  {b.rows.map((r) => <SectionRow key={r.id} r={r} />)}
                </div>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

// ── SectionHeaderBar ─────────────────────────────────────────────────────────
// Replaces the warm section header: uppercase blue title, zero-padded number
// (N14 carries), gradient accent strip in the part's hue, Blustream logo slot.

export const SectionHeaderBar: React.FC<{ secNum?: string; title: string; part?: string }> = ({
  secNum, title, part = 'X',
}) => (
  <div className="bk-headbar">
    {secNum && <span className="bk-headbar-num">{secNum}</span>}
    <h1 className="bk-headbar-title">{title}</h1>
    <span className={`bk-headbar-strip bk-part-${part}`} aria-hidden="true" />
    <span className="bk-headbar-logo"><BlustreamLogo /></span>
  </div>
);

// ── BookletFooter ────────────────────────────────────────────────────────────
// Booklet treatment: the color RSPL mark sits ABOVE the footer rule, bottom-
// right (~34px tall, legible); below the rule runs the text-only line —
// division · report title · Confidential · zero-padded section number (the
// reliable half of N14; true @page counters stay out of v1).

export const BookletFooter: React.FC<{ secNum?: string }> = ({ secNum }) => {
  const total = BABY_DIAPERS_TEMPLATE.sections.length;
  return (
    <footer className="bk-foot-wrap">
      <div className="bk-foot-logorow"><RsplLogo /></div>
      <div className="bk-foot">
        <span className="bk-foot-left">
          <span>RSPL {REPORT_DIVISION}</span>
          <span className="bk-foot-sep">·</span>
          <span>Blustream Baby Diaper — Category &amp; Consumer Understanding</span>
          <span className="bk-foot-sep">·</span>
          <span>Confidential</span>
        </span>
        {secNum && <span className="bk-foot-page">{secNum} / {String(total - 1).padStart(2, '0')}</span>}
      </div>
    </footer>
  );
};
