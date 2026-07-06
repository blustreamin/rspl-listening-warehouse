/* ============================================================================
   ShareApp — snapshot-fed, read-only, single-project share deployment shell.
   Mounted by index.tsx ONLY when the build ran with VITE_SHARE_MODE=1; the
   normal app never imports this module, so the bundled snapshot JSON stays
   out of the main bundle. No sidebar, no project switcher, no Data Studio,
   no run controls — the report view is all there is, fed entirely from
   share/snapshot.baby-diapers.json. The share path never calls /api/* and
   no Supabase credential exists anywhere in the client bundle, so projects
   other than the snapshot's are physically unreachable, not merely hidden.
   ============================================================================ */

import React from 'react';
import { ReportView } from '../ReportView';
import { TEMPLATE_REGISTRY } from '../../constants/templates';
import { setShareSnapshot, ShareSnapshot } from '../../lib/shareSnapshot';
import snapshotJson from '../../share/snapshot.baby-diapers.json';

const SNAPSHOT = snapshotJson as unknown as ShareSnapshot;
// The deployment declares which project it is allowed to serve; a snapshot
// for any other project renders a config error rather than another report.
const SHARE_PROJECT: string =
  (((import.meta as any).env?.VITE_SHARE_PROJECT as string) || 'baby-diapers');

// Template drift guard: every section the template expects must be in the
// snapshot, or the client-facing report would silently ship Awaiting stubs.
const MISSING_SECTIONS = (TEMPLATE_REGISTRY[SNAPSHOT.projectId]?.sections || [])
  .map(s => s.sectionId)
  .filter(id => !SNAPSHOT.sections?.[id]?.content);

const CONFIG_ERROR: string =
  SNAPSHOT.projectId !== SHARE_PROJECT
    ? `the bundled snapshot is “${SNAPSHOT.projectId}” but this deployment only serves “${SHARE_PROJECT}”`
    : MISSING_SECTIONS.length > 0
      ? `the bundled snapshot is missing ${MISSING_SECTIONS.length} template section(s): ${MISSING_SECTIONS.join(', ')} — re-run scripts/export-share-snapshot.ts and rebuild`
      : '';

// Registered at module scope so ReportView and the §20 ingestion ledger see
// it synchronously on their very first render.
if (!CONFIG_ERROR) setShareSnapshot(SNAPSHOT);

const ShareApp: React.FC = () => {
  if (CONFIG_ERROR) {
    return (
      <div className="p-8 font-mono text-sm text-red-600">
        Share build misconfigured: {CONFIG_ERROR}.
      </div>
    );
  }
  return (
    <div className="lv-app-root flex h-screen bg-slate-50 overflow-hidden">
      <main className="lv-report-scroll flex-1 overflow-y-auto h-full scroll-smooth">
        <ReportView projectId={SNAPSHOT.projectId} />
      </main>
    </div>
  );
};

export default ShareApp;
