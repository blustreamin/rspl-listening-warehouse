// html2pdf.js ships no TypeScript types; minimal ambient declaration for the
// dynamic import in ExportBar (N15 Download PDF).
declare module 'html2pdf.js' {
  interface Html2PdfWorker {
    set(opt: Record<string, unknown>): Html2PdfWorker;
    from(el: Element | string): Html2PdfWorker;
    save(): Promise<void>;
  }
  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
