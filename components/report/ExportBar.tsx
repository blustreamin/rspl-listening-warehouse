/* ============================================================================
   ExportBar — baby-diaper report export controls (F3 Gate 4a + 4b)
   ----------------------------------------------------------------------------
   • PDF  : zero-dependency window.print() against the warm render (lovingle-print.css).
   • PPTX : editable deck — pptxgenjs, DYNAMIC-imported here so it code-splits.
   • DOCX : editable doc — docx, DYNAMIC-imported here so it code-splits.
   Both office builders read the section DTOs (utils/export), never the DOM.
   The bar carries `lv-no-print`, so it never appears in any export. PPTX/DOCX
   buttons are disabled until the report's sections have loaded.
   ============================================================================ */

import React, { useEffect, useState } from 'react';
import { SectionOutput } from '../../types';
import { useRunState } from '../../lib/runState';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const PdfIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3v10m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ExportBar: React.FC<{ sections?: SectionOutput[] }> = ({ sections = [] }) => {
  const [busy, setBusy] = useState<null | 'pdf' | 'pptx' | 'docx'>(null);
  const run = useRunState();
  // RUN-STATE LOCK: ALL exports (PDF, Print, PPTX, DOCX) freeze while a run is
  // live — a half-generated PDF is the single worst artifact this app can emit.
  const runLocked = run.phase === 'running';
  const lockTip = runLocked ? `Synthesis in progress — ${run.done}/${run.total} sections` : undefined;
  const ready = sections.length > 0;

  // N15 — client-side PDF via per-LEAF html2canvas captures + jsPDF
  // (dynamic-imported so they code-split).
  //
  // WHY per-leaf capture (06 Jul): a whole-report capture renders ONE master
  // canvas (~199,000 device px tall for 21 sections) — 3x Chrome's 65,535px
  // canvas ceiling, past which the browser yields a blank canvas with NO
  // error: the all-blank-pages bug. NEVER reintroduce whole-report capture.
  //
  // Pagination (06 Jul v2): ONE .lv-section-break leaf -> exactly ONE A4 page,
  // scaled to CONTAIN inside the printable box — no slicing, nothing cut.
  // Captured at the booklet's true on-screen width (viewport 1024 -> the
  // #lovingle-page max-w-5xl layout, 976px content), NOT the old 794px mobile
  // reflow that sprawled 21 sections across 86 fragmented pages. Final page
  // count == on-screen leaf count (cover + TOC + sections).
  const A4 = { w: 595.28, h: 841.89 };            // pt
  const MARGIN_PT = 12 * (72 / 25.4);             // 12mm uniform ≈ 34pt
  const BOX_W = A4.w - MARGIN_PT * 2;             // printable width ≈ 527.2pt
  const BOX_H = A4.h - MARGIN_PT * 2;             // printable height ≈ 773.9pt
  // Clone viewport width. The clone holds the WHOLE app — the 256px sidebar
  // included — so this must be sidebar + booklet: at 1440 the main pane is
  // 1184px, #lovingle-page caps at max-w-5xl (1024) and the booklet content
  // renders 976px — IDENTICAL to the on-screen layout, which keeps live-DOM
  // cut measurements exact on the canvas. (At 1024 the booklet reflowed to
  // 720px and proportional cut mapping bisected cards.)
  const CAPTURE_VIEWPORT = 1440;

  // 2-PAGE SPILL whitelist (tune-able): tall sections that read too small on a
  // single contained page spread across UP TO TWO pages, split ONLY in the gap
  // between whole direct child blocks (never bisecting a card). Note: at pure
  // width-fill these sections are 3.3-4.6 pages tall, so the spill scale is
  // contain-in-two-pages — the boundary nearest half-height sets the scale
  // (fit2 = BOX_H / max(part1, part2)) and both pages fill. Leaves are matched
  // by the section wrapper's id="section-<sectionId>" (LovingleSectionShell);
  // cover/TOC have no id and can never match.
  const TWO_PAGE_SECTIONS = new Set([
    'competitive_landscape', 'diaper_needs_fes', 'usage_occasions', 'decision_journey',
    'features_benefits',
  ]);
  // Atomic booklet blocks a page cut must never bisect (the booklet's
  // break-inside:avoid card set) — spill cuts are validated against these.
  const ATOM_SELECTORS = '.bk-quote,.bk-callout,.bk-callout-row,.bk-persona,.bk-tier-item,.bk-tier,.bk-iconcard,.bk-ritual,.bk-region,.bk-stagecard,.bk-perception,.bk-gap,.bk-drivercard,.bk-subtheme,.bk-stat,.bk-strip,.bk-synthesis,.bk-segrow,.lv-card,.bk-foot-wrap';

  const onPdf = async () => {
    if (busy || runLocked) return;
    const reportElement = document.getElementById('lovingle-report-container');
    if (!reportElement) { window.print(); return; }
    // Top-level booklet leaves: cover, TOC, then one element per section.
    const leaves = (Array.from(reportElement.querySelectorAll('.lv-section-break')) as HTMLElement[])
      .filter((el) => !el.parentElement?.closest('.lv-section-break'));
    if (leaves.length === 0) { window.print(); return; }
    setBusy('pdf');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      // Charts/logos and webfonts must be settled or they raster as gaps.
      await document.fonts?.ready?.catch?.(() => {});
      await Promise.allSettled(
        (Array.from(reportElement.querySelectorAll('img')) as HTMLImageElement[]).map((i) => i.decode?.())
      );

      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });

      // Region of a leaf canvas -> JPEG page image (white-backed).
      const regionJpeg = (src: HTMLCanvasElement, y0: number, h: number): string => {
        if (y0 === 0 && h === src.height) return src.toDataURL('image/jpeg', 0.92);
        const c = document.createElement('canvas');
        c.width = src.width;
        c.height = Math.ceil(h);
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(src, 0, y0, src.width, h, 0, 0, src.width, h);
        return c.toDataURL('image/jpeg', 0.92); // jpeg — png balloons the file
      };

      // Pages are collected first so numbers can read "n / TRUE total"
      // (2-page spills make the total exceed the leaf count).
      const pages: Array<{ data: string; wPt: number; hPt: number }> = [];

      for (let i = 0; i < leaves.length; i++) {
        const el = leaves[i];
        const sectionId = (el.id || '').replace(/^section-/, '');
        const twoPage = TWO_PAGE_SECTIONS.has(sectionId);

        // Adaptive raster density: target ~3x pixels AT THE SIZE the leaf is
        // DRAWN (a 2-page spill draws ~2x larger than a single contained
        // page). Flat scale 3 would capture pixels the page can never show
        // and balloon the file. Clamp >=1 so extreme leaves stay legible on
        // zoom; short leaves land near scale 3 (crisp text).
        const rect = el.getBoundingClientRect();
        const cssW = Math.max(1, rect.width);
        const cssH = Math.max(1, rect.height);
        const estFit = twoPage
          ? Math.min(BOX_W / cssW, (2 * BOX_H) / cssH)
          : Math.min(BOX_W / cssW, BOX_H / cssH);
        const scale = Math.min(3, Math.max(1, 3 * estFit));

        // For spill leaves, measure the cut candidates on the LIVE element
        // BEFORE capture — NOT in onclone: the cloned iframe has not completed
        // layout when that hook fires, so clone-side rects read 0 and the
        // split silently never triggers. The .pdf-export class is applied to
        // the LIVE container for the measurement instant so live geometry is
        // IDENTICAL to the clone's (its sheet-padding delta once shifted the
        // mapped cut into a card). A candidate cut is any vertical position
        // between sibling blocks (any depth into dominant children, plus each
        // atomic card's bottom edge) that intersects NO atomic card rect — so
        // by construction the chosen cut never bisects a card; two-column
        // rows with unequal heights are handled by the rect filter, not by
        // sibling order.
        let gapsCss: number[] = [];
        let cssHRef = cssH;
        if (twoPage) {
          reportElement.classList.add('pdf-export');
          try {
            const rectPdf = el.getBoundingClientRect();
            cssHRef = Math.max(1, rectPdf.height);
            const top = rectPdf.top;
            const cands = new Set<number>();
            const collect = (node: HTMLElement, depth: number) => {
              const kids = (Array.from(node.children) as HTMLElement[]).filter((k) => k.offsetHeight > 0);
              for (let j = 0; j < kids.length - 1; j++) {
                const a = kids[j].getBoundingClientRect();
                const b = kids[j + 1].getBoundingClientRect();
                if (b.top >= a.bottom - 2) cands.add(Math.round((a.bottom + b.top) / 2 - top));
              }
              if (depth <= 0) return;
              for (const k of kids) {
                if (k.offsetHeight > cssHRef * 0.4) collect(k, depth - 1);
              }
            };
            collect(el, 4);
            // Atomic blocks = anything VISUALLY boxed (background / border /
            // shadow) that fits on a width-fit page. Class-agnostic on purpose
            // — the class-list approach missed newer card types and let a cut
            // bisect a §12 quote chip. Taller boxed containers (zones, rail
            // groups) are exempt: a cut inside them is unavoidable and reads
            // as list continuation.
            const cap = BOX_H / (BOX_W / Math.max(1, rectPdf.width)); // css px per width-fit page
            const atomRects: Array<readonly [number, number]> = [];
            const markAtom = (r: DOMRect) => atomRects.push([r.top - top + 3, r.bottom - top - 3] as const);
            (Array.from(el.querySelectorAll('*')) as HTMLElement[]).forEach((n) => {
              const r = n.getBoundingClientRect();
              if (r.height <= 0 || r.height > cap) return;
              if (n.matches(ATOM_SELECTORS)) { markAtom(r); return; }
              const cs = getComputedStyle(n);
              const bg = cs.backgroundColor;
              if ((bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)')
                || parseFloat(cs.borderTopWidth) > 0
                || (cs.boxShadow && cs.boxShadow !== 'none')) markAtom(r);
            });
            for (const [, bottom] of atomRects) cands.add(Math.round(bottom + 7));
            gapsCss = [...cands].filter((y) =>
              y > 0 && y < cssHRef && atomRects.every(([t, b]) => y <= t || y >= b)
            );
          } finally {
            reportElement.classList.remove('pdf-export');
          }
        }
        const canvas = await html2canvas(el, {
          scale,
          useCORS: true,
          logging: false,
          scrollY: 0,
          windowWidth: CAPTURE_VIEWPORT,
          backgroundColor: '#ffffff',
          onclone: (doc: Document) => {
            // .pdf-export in the CLONE only — never the live DOM.
            doc.getElementById('lovingle-report-container')?.classList.add('pdf-export');
          },
        });

        const W = canvas.width;
        const H = canvas.height;
        const fit1 = Math.min(BOX_W / W, BOX_H / H); // single-page contain

        // 2-PAGE SPILL: cut at the child gap nearest half-height; the larger
        // part sets the scale so BOTH pages fit. Only worth it when the leaf
        // renders >=15% larger than single-page contain — else fall back.
        if (twoPage && gapsCss.length > 0) {
          // Map the pdf-export-geometry gap positions onto the canvas by
          // height ratio (identical layouts, so this is exact up to rounding).
          const cuts = gapsCss.map((g) => (g / cssHRef) * H).filter((g) => g > 0 && g < H);
          if (cuts.length > 0) {
            const cut = cuts.reduce((best, c) =>
              Math.max(c, H - c) < Math.max(best, H - best) ? c : best, cuts[0]);
            const fit2 = Math.min(BOX_W / W, BOX_H / Math.max(cut, H - cut));
            if (fit2 > fit1 * 1.15) {
              console.info(`[pdf] ${sectionId}: split across 2 pages at a block gap — ${(fit2 / fit1).toFixed(2)}x larger than single-page.`);
              pages.push({ data: regionJpeg(canvas, 0, cut), wPt: W * fit2, hPt: cut * fit2 });
              pages.push({ data: regionJpeg(canvas, cut, H - cut), wPt: W * fit2, hPt: (H - cut) * fit2 });
              continue;
            }
          }
        }

        // Default: CONTAIN the whole leaf on one page — nothing is cut.
        // Leaves shrunk below half of normal (width-fit) size read small —
        // surface them as the densify / whitelist candidates.
        const shrink = Math.min(1, (BOX_H / H) / (BOX_W / W));
        if (shrink < 0.5) {
          console.warn(`[pdf] leaf ${i + 1}/${leaves.length} shrunk to ${(shrink * 100).toFixed(0)}% (${Math.round(cssW)}x${Math.round(cssH)}css) — small text; densify or split.`);
        }
        pages.push({ data: regionJpeg(canvas, 0, H), wPt: W * fit1, hPt: H * fit1 });
      }

      for (let p = 0; p < pages.length; p++) {
        if (p > 0) pdf.addPage();
        const pg = pages[p];
        pdf.addImage(
          pg.data, 'JPEG',
          MARGIN_PT + (BOX_W - pg.wPt) / 2,  // centre horizontally
          MARGIN_PT,                          // top-align
          pg.wPt, pg.hPt, undefined, 'FAST'
        );
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`${p + 1} / ${pages.length}`, A4.w - MARGIN_PT, A4.h - MARGIN_PT / 2, { align: 'right' });
      }
      pdf.save('Baby_Diaper_Category_Consumer_Understanding.pdf');
    } catch (err) {
      console.error('[ExportBar] PDF export failed', err);
      alert('PDF export failed — see console for details.');
    } finally { setBusy(null); }
  };

  // Force every collapsed <details> open for the print, then restore exactly.
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll('details:not([open])')) as HTMLDetailsElement[];
      opened.forEach((d) => { d.open = true; });
    };
    const after = () => { opened.forEach((d) => { d.open = false; }); opened = []; };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const onPptx = async () => {
    if (!ready || busy || runLocked) return;
    setBusy('pptx');
    try {
      const [{ buildPptx }, Pptx] = await Promise.all([
        import('../../utils/export/toPptx'),
        import('pptxgenjs'),
      ]);
      const blob = await buildPptx((Pptx as any).default, sections);
      downloadBlob(blob, 'Baby_Diaper_Category_Consumer_Understanding.pptx');
    } catch (err) {
      console.error('[ExportBar] PPTX export failed', err);
      alert('PPTX export failed — see console for details.');
    } finally { setBusy(null); }
  };

  const onDocx = async () => {
    if (!ready || busy || runLocked) return;
    setBusy('docx');
    try {
      const [{ buildDocx }, docx] = await Promise.all([
        import('../../utils/export/toDocx'),
        import('docx'),
      ]);
      const blob = await buildDocx(docx, sections);
      downloadBlob(blob, 'Baby_Diaper_Category_Consumer_Understanding.docx');
    } catch (err) {
      console.error('[ExportBar] DOCX export failed', err);
      alert('DOCX export failed — see console for details.');
    } finally { setBusy(null); }
  };

  return (
    <div className="lv-scope lv-no-print lv-exportbar">
      <button type="button" className="lv-btn lv-btn-pdf" onClick={onPdf} disabled={!!busy || runLocked}
        title={lockTip ?? 'Download the report as an A4 PDF'}>
        <PdfIcon /> {busy === 'pdf' ? 'Building…' : 'Download PDF'}
      </button>
      <button type="button" className="lv-btn lv-btn-print" onClick={() => { if (!runLocked) window.print(); }} disabled={runLocked}
        title={lockTip ?? 'Print via the system dialog (vector-quality PDF)'}>
        Print
      </button>
      <button type="button" className="lv-btn lv-btn-pptx" onClick={onPptx} disabled={!ready || !!busy || runLocked}
        title={lockTip ?? 'Download an editable PowerPoint deck'}>
        {busy === 'pptx' ? 'Building…' : 'Download PPTX'}
      </button>
      <button type="button" className="lv-btn lv-btn-docx" onClick={onDocx} disabled={!ready || !!busy || runLocked}
        title={lockTip ?? 'Download an editable Word document'}>
        {busy === 'docx' ? 'Building…' : 'Download DOCX'}
      </button>
    </div>
  );
};

export default ExportBar;
