// ============================================================================
//  PUBLISHED REPORTS — static, client-viewable report bundles.
//
//  These are frozen, pre-built HTML deliverables that live under
//  public/reports/<id>/ and are served as plain static files. There is NO SPA
//  rewrite in vercel.json intercepting /reports/*, so /reports/<id>/index.html
//  resolves to the real file (verified). This is intentionally distinct from
//  the dynamic synthesis "Report View": nothing here fetches, synthesises, or
//  reads the DB — it's a manifest of finished artefacts opened in a new tab.
//
//  To publish a new report: run scripts/prepare-report.py to emit the bundle
//  into public/reports/<id>/, then add an entry below.
// ============================================================================

export interface PublishedReport {
  /** Stable slug; also the folder name under public/reports/. */
  id: string;
  title: string;
  /** One-line description shown on the card. */
  subtitle?: string;
  /** Category framing shown as the card kicker. */
  category: string;
  /** Section count (excludes the cover). */
  sections: number;
  /** Absolute site path to the cover; opened in a new browser tab. */
  path: string;
  /** Publication tag, YYYY-MM. */
  published: string;
}

export const PUBLISHED_REPORTS: PublishedReport[] = [
  {
    id: 'baby-diapers',
    title: 'Baby Diapers — Category Report',
    subtitle:
      'A category-level read of the Indian baby-diaper market, synthesised from ' +
      '31,600 consumer conversations across 13 platforms.',
    category: 'Consumer Intelligence · India',
    sections: 21,
    path: '/reports/baby-diapers/index.html',
    published: '2026-07',
  },
];
