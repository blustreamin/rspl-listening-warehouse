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
  const CAPTURE_VIEWPORT = 1024;                  // clone viewport -> 976px booklet content, as on screen

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

      for (let i = 0; i < leaves.length; i++) {
        const el = leaves[i];
        // Adaptive raster density: target ~3x pixels AT THE SIZE the leaf is
        // DRAWN. Fit-to-page shrinks tall leaves, so a flat scale 3 would
        // capture pixels the page can never show and balloon the file several
        // times past the old 39MB. Clamp >=1 so extreme leaves stay legible
        // on zoom; short leaves land near scale 3 (crisp text).
        const rect = el.getBoundingClientRect();
        const estFit = Math.min(BOX_W / Math.max(1, rect.width), BOX_H / Math.max(1, rect.height));
        const scale = Math.min(3, Math.max(1, 3 * estFit));

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

        // CONTAIN the whole leaf inside the printable box — nothing is cut.
        const fit = Math.min(BOX_W / canvas.width, BOX_H / canvas.height);
        const drawW = canvas.width * fit;
        const drawH = canvas.height * fit;
        const x = MARGIN_PT + (BOX_W - drawW) / 2;  // centre horizontally
        const y = MARGIN_PT;                        // top-align

        // Leaves shrunk below half of normal (width-fit) size read small —
        // surface them as the densify / split-into-two-pages candidates.
        const shrink = Math.min(1, (BOX_H / canvas.height) / (BOX_W / canvas.width));
        if (shrink < 0.5) {
          console.warn(`[pdf] leaf ${i + 1}/${leaves.length} shrunk to ${(shrink * 100).toFixed(0)}% (${Math.round(rect.width)}x${Math.round(rect.height)}css) — small text; densify or split.`);
        }

        if (i > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.92), // jpeg — png balloons the file
          'JPEG', x, y, drawW, drawH, undefined, 'FAST'
        );
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`${i + 1} / ${leaves.length}`, A4.w - MARGIN_PT, A4.h - MARGIN_PT / 2, { align: 'right' });
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
