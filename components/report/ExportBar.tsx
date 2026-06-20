/* ============================================================================
   ExportBar — Lovingle report export controls (F3 Gate 4a + 4b)
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
  const [busy, setBusy] = useState<null | 'pptx' | 'docx'>(null);
  const ready = sections.length > 0;

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
    if (!ready || busy) return;
    setBusy('pptx');
    try {
      const [{ buildPptx }, Pptx] = await Promise.all([
        import('../../utils/export/toPptx'),
        import('pptxgenjs'),
      ]);
      const blob = await buildPptx((Pptx as any).default, sections);
      downloadBlob(blob, 'Lovingle-Baby-Diapers.pptx');
    } catch (err) {
      console.error('[ExportBar] PPTX export failed', err);
      alert('PPTX export failed — see console for details.');
    } finally { setBusy(null); }
  };

  const onDocx = async () => {
    if (!ready || busy) return;
    setBusy('docx');
    try {
      const [{ buildDocx }, docx] = await Promise.all([
        import('../../utils/export/toDocx'),
        import('docx'),
      ]);
      const blob = await buildDocx(docx, sections);
      downloadBlob(blob, 'Lovingle-Baby-Diapers.docx');
    } catch (err) {
      console.error('[ExportBar] DOCX export failed', err);
      alert('DOCX export failed — see console for details.');
    } finally { setBusy(null); }
  };

  return (
    <div className="lv-scope lv-no-print lv-exportbar">
      <button type="button" className="lv-btn lv-btn-pdf" onClick={() => window.print()} title="Download as PDF (print)">
        <PdfIcon /> Download PDF
      </button>
      <button type="button" className="lv-btn lv-btn-pptx" onClick={onPptx} disabled={!ready || !!busy} title="Download an editable PowerPoint deck">
        {busy === 'pptx' ? 'Building…' : 'Download PPTX'}
      </button>
      <button type="button" className="lv-btn lv-btn-docx" onClick={onDocx} disabled={!ready || !!busy} title="Download an editable Word document">
        {busy === 'docx' ? 'Building…' : 'Download DOCX'}
      </button>
    </div>
  );
};

export default ExportBar;
