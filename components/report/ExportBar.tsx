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

  // N15 — client-side PDF via html2pdf.js (dynamic-imported so it code-splits).
  const onPdf = async () => {
    if (busy || runLocked) return;
    const reportElement = document.getElementById('lovingle-report-container');
    if (!reportElement) { window.print(); return; }
    setBusy('pdf');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      // A4 pagination (03 Jul fix): capture at 794px (A4 width @96dpi) via a
      // .pdf-export class applied in the CLONE only — never the live DOM — so
      // the raster maps 1:1 onto real A4 pages instead of viewport-wide strips.
      // Known tradeoff: uniform margins put a thin white frame around the navy
      // cover (no full bleed); the vector Print path stays the full-bleed option.
      const opt = {
        margin: [28, 24, 32, 24], // top, left, bottom, right (pt)
        filename: 'Baby_Diaper_Category_Consumer_Understanding.pdf',
        image: { type: 'jpeg', quality: 0.92 }, // jpeg — png balloons the file
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          windowWidth: 794, // A4 width @96dpi — desktop grids still apply (>768)
          onclone: (doc: Document) => {
            doc.getElementById('lovingle-report-container')?.classList.add('pdf-export');
          },
        },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: {
          mode: ['css', 'legacy'],
          before: '.lv-section-break',
        },
      };
      await html2pdf().set(opt).from(reportElement).save();
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
