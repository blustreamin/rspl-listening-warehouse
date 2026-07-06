/* ============================================================================
   Share-mode snapshot registry.
   The share build (VITE_SHARE_MODE=1) feeds the whole report from a committed
   JSON export instead of the network. ShareApp registers the parsed snapshot
   here at module scope; ReportView and DataIngestionAnalysis consult
   getShareSnapshot() and short-circuit every fetch when it is present.
   In the normal app nothing ever calls setShareSnapshot, the getter stays
   null, and every code path behaves exactly as before.
   This module must NOT import the snapshot JSON itself — only the share-mode
   lazy chunk (ShareApp) does, which keeps the export out of the main bundle.
   ============================================================================ */

import { ProjectId, SectionOutput } from '../types';

export interface ShareDatasetMeta {
  name?: string;
  source_tag?: string;
  row_count?: number;
  uploaded_at?: string;
}

export interface ShareSnapshot {
  schemaVersion: string;
  exportedAt: string;
  projectId: ProjectId;
  /** evidence_graphs row minus storage_path — raw events are never exported. */
  evidenceGraph: {
    project_id: string;
    evidence_hash: string;
    event_count: number;
    dataset_ids: string[];
    aggregations: Record<string, any>;
    generated_at: string;
  };
  /** datasets registry metadata (no storage_path) — feeds the §20 ledger. */
  datasets: ShareDatasetMeta[];
  sections: Record<string, { status: SectionOutput['status']; content: any }>;
}

let snapshot: ShareSnapshot | null = null;

export const setShareSnapshot = (s: ShareSnapshot): void => { snapshot = s; };
export const getShareSnapshot = (): ShareSnapshot | null => snapshot;
