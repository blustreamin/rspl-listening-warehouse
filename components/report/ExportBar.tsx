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

  // N15 — client-side PDF via per-SECTION html2canvas captures + jsPDF
  // (dynamic-imported so they code-split).
  //
  // WHY per-section (06 Jul fix): the previous single html2pdf capture of the
  // whole booklet rendered ONE master canvas of the entire container — at
  // 794px/scale 2 the full 21-section report is ~199,000 device px tall,
  // 3x Chrome's 65,535px canvas ceiling. Past that limit the browser yields a
  // blank canvas with NO error, so every sliced page came out pure white and
  // the PDF still "saved" — the all-blank-pages bug. Capturing one section at
  // a time keeps every canvas far under the limit, kills the blank leading
  // page (break-before applied to the cover itself), and replaces html2pdf's
  // drifting spacer pagination with exact px->pt page math.
  const A4 = { w: 595.28, h: 841.89 };                    // pt
  const MARGIN = { top: 28, left: 24, bottom: 32, right: 24 }; // pt
  const PRINT_W = A4.w - MARGIN.left - MARGIN.right;      // 547.28pt
  const PRINT_H = A4.h - MARGIN.top - MARGIN.bottom;      // 781.89pt
  const CAPTURE_W = 794;                                  // A4 width @96dpi — desktop grids still apply (>768)
  // Blocks the booklet CSS marks break-inside:avoid — page cuts snap to their
  // bottoms so the raster never slices a card mid-body (booklet.css §pdf-export).
  const AVOID_SELECTORS = '.bk-quote,.bk-callout,.bk-callout-row,.bk-persona,.bk-tier-item,.bk-tier,.bk-iconcard,.bk-ritual,.bk-region,.bk-stagecard,.bk-perception,.bk-gap,.bk-drivercard,.bk-subtheme,.bk-stat,.bk-strip,.bk-synthesis,.bk-segrow,.lv-card,.bk-foot-wrap';

  const onPdf = async () => {
    if (busy || runLocked) return;
    const reportElement = document.getElementById('lovingle-report-container');
    if (!reportElement) { window.print(); return; }
    // Top-level booklet units: cover, TOC, then one element per section.
    const units = (Array.from(reportElement.querySelectorAll('.lv-section-break')) as HTMLElement[])
      .filter((el) => !el.parentElement?.closest('.lv-section-break'));
    if (units.length === 0) { window.print(); return; }
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

      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      let firstPage = true;

      for (let idx = 0; idx < units.length; idx++) {
        const el = units[idx];
        el.dataset.pdfCapture = '1';
        let cutsCss: number[] = [];
        let canvas: HTMLCanvasElement;
        try {
          const capture = (scale: number) => html2canvas(el, {
            scale,
            useCORS: true,
            scrollY: 0,
            windowWidth: CAPTURE_W,
            backgroundColor: '#ffffff',
            onclone: (doc: Document) => {
              // .pdf-export in the CLONE only — never the live DOM.
              doc.getElementById('lovingle-report-container')?.classList.add('pdf-export');
              // Measure card bottoms in the clone (already laid out at 794px)
              // as page-cut candidates, relative to this section's top.
              const section = doc.querySelector('[data-pdf-capture="1"]');
              if (!section) return;
              const top = section.getBoundingClientRect().top;
              const ys = new Set<number>();
              section.querySelectorAll(AVOID_SELECTORS).forEach((n) => {
                const r = n.getBoundingClientRect();
                if (r.height > 0) ys.add(Math.round(r.bottom - top) + 2);
              });
              cutsCss = [...ys].sort((a, b) => a - b);
            },
          });
          canvas = await capture(2);
          // Pathologically tall single section: recapture below the browser's
          // silent ~65,535px canvas ceiling rather than emit blank pages.
          if (canvas.height > 64000 || canvas.height === 0) {
            const cssH = canvas.height / 2 || el.scrollHeight;
            canvas = await capture(Math.max(0.5, Math.min(2, 60000 / cssH)));
          }
        } finally {
          delete el.dataset.pdfCapture;
        }

        const pxPerCss = canvas.width / CAPTURE_W;       // device px per clone css px
        const pxPerPt = canvas.width / PRINT_W;          // device px per output pt
        const pagePx = PRINT_H * pxPerPt;                // page window in device px
        const cuts = cutsCss.map((c) => c * pxPerCss);

        let y = 0;
        while (y < canvas.height - 1) {
          const remaining = canvas.height - y;
          let sliceH = Math.min(pagePx, remaining);
          if (remaining > pagePx) {
            // Snap to the deepest card bottom inside this page window; never
            // shrink a page below 55% or gaps balloon the page count.
            const limit = y + pagePx;
            const floor = y + pagePx * 0.55;
            for (let c = cuts.length - 1; c >= 0; c--) {
              if (cuts[c] > floor && cuts[c] <= limit) { sliceH = cuts[c] - y; break; }
            }
          }
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = Math.ceil(sliceH);
          const ctx = slice.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          if (!firstPage) pdf.addPage();
          firstPage = false;
          pdf.addImage(
            slice.toDataURL('image/jpeg', 0.92), // jpeg — png balloons the file
            'JPEG', MARGIN.left, MARGIN.top, PRINT_W, sliceH / pxPerPt
          );
          y += sliceH;
        }
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
