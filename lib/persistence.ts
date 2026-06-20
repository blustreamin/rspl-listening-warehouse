import { apiGet, apiPost, apiDelete } from "./api";
import type { EvidenceGraph } from "../types";

// Thin, failure-tolerant persistence wrappers. Every call swallows errors so the
// app behaves identically when the backend / Supabase is absent (local `vite dev`).

/** Persist a computed evidence graph so the report survives a refresh. */
export async function persistEvidence(graph: EvidenceGraph, datasetIds: string[] = []): Promise<void> {
  if (!graph?.projectId) return;
  try {
    await apiPost("/api/evidence", {
      project_id: graph.projectId,
      dataset_ids: datasetIds,
      evidence_hash: (graph as any).evidenceHash || null,
      graph,
    });
  } catch { /* no backend -> skip */ }
}

/** Load the latest persisted evidence graph for a project, or null. */
export async function loadEvidence(projectId: string): Promise<EvidenceGraph | null> {
  try {
    const r = await apiGet("/api/evidence", { project_id: projectId });
    return (r?.graph as EvidenceGraph) || null;
  } catch {
    return null;
  }
}

/** Persist an uploaded dataset (rows -> Storage, metadata -> table). Returns the new id or null. */
export async function persistDataset(args: {
  projectId: string; name: string; sourceTag: string; columns: string[]; rows: any[];
}): Promise<string | null> {
  try {
    const r = await apiPost("/api/datasets", {
      project_id: args.projectId,
      name: args.name,
      source_tag: args.sourceTag,
      columns: args.columns,
      rows: args.rows,
    });
    return r?.dataset?.id || null;
  } catch {
    return null;
  }
}

export async function deleteDataset(id: string): Promise<void> {
  try { await apiDelete("/api/datasets", { id }); } catch { /* skip */ }
}

export async function listDatasets(projectId: string): Promise<any[]> {
  try {
    const r = await apiGet("/api/datasets", { project_id: projectId });
    return r?.datasets || [];
  } catch {
    return [];
  }
}
