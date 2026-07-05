import { apiGet, apiPost, apiDelete } from "./api";
import type { EvidenceGraph, ProjectId } from "../types";
import { graphProvenance, isMockGraph } from "./graphProvenance";
import { isRegistryBacked } from "../constants/projectConfig";

// Thin, failure-tolerant persistence wrappers. Every call swallows errors so the
// app behaves identically when the backend / Supabase is absent (local `vite dev`).

/** Persist a computed evidence graph so the report survives a refresh.
 *  Two-phase: signed upload of the events blob straight to Storage, then a
 *  small register POST for the row. The legacy single-shot POST dies on the
 *  serverless body limit for large corpora (60k events ≈ 10x the cap) — that
 *  is exactly how the 05-Jul rebuild registered 30 datasets but ZERO graph
 *  rows. Falls back to the legacy POST when the sign mode isn't deployed. */
export async function persistEvidence(graph: EvidenceGraph, datasetIds: string[] = []): Promise<boolean> {
  if (!graph?.projectId) return false;
  // PERSIST VETO (mock-corpus guard): never write the demo/mock corpus to
  // evidence_graphs. The 05-Jul incident persisted an untrusted graph via the
  // run-start persist; a mock graph must never become canonical evidence.
  if (isMockGraph(graph)) {
    console.warn("[persistence] refused to persist a mock/demo evidence graph.");
    return false;
  }
  const events = graph.events || (graph as any).evidence_graph_v1?.events || [];
  const evidenceHash = (graph as any).evidenceHash || null;

  let blobUploaded = false;
  try {
    const sign = await apiPost("/api/evidence", { mode: "sign", project_id: graph.projectId });
    if (sign?.url && sign?.path) {
      // No x-upsert: the path is a fresh UUID, and Supabase bakes upsert
      // intent into the signed token — a mismatched header can reject the PUT.
      const up = await fetch(sign.url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: new Blob([JSON.stringify(events)], { type: "application/json" }),
      });
      if (up.ok) {
        blobUploaded = true;
        const reg = await apiPost("/api/evidence", {
          mode: "register",
          project_id: graph.projectId,
          id: sign.id,
          storage_path: sign.path,
          dataset_ids: datasetIds,
          evidence_hash: evidenceHash,
          event_count: events.length,
          aggregations: graph.aggregations || {},
        });
        if (reg?.ok) return true;
      }
    }
  } catch { /* fall through */ }

  if (blobUploaded) {
    // The blob is up but the row insert failed — do NOT re-upload the same
    // events via the legacy path (double blob); the next run start retries.
    console.warn("[persistence] events blob uploaded but register failed — will retry at the next run start.");
    return false;
  }

  try {
    const r = await apiPost("/api/evidence", {
      project_id: graph.projectId,
      dataset_ids: datasetIds,
      evidence_hash: evidenceHash,
      graph,
    });
    return !!r?.ok;
  } catch {
    return false; /* no backend */
  }
}

/** Persist the assembled graph iff no evidence_graphs row for this (project,
 *  evidence_hash) exists yet. Called at RUN START so an aborted run can never
 *  leave the graph unpersisted, without piling a duplicate row on every
 *  regenerate. Degrades to a plain persist when the freshness probe fails. */
export async function ensureEvidencePersisted(graph: EvidenceGraph, evidenceHash: string): Promise<boolean> {
  if (!graph?.projectId) return false;
  try {
    const r = await apiGet("/api/evidence", { project_id: graph.projectId, stats: "1" });
    const existing = r?.stats?.evidence_hash ?? r?.meta?.evidence_hash ?? null;
    if (existing && existing === evidenceHash) return true; // already persisted — no dup
  } catch { /* probe failed -> fall through and attempt the persist */ }
  return persistEvidence({ ...(graph as any), evidenceHash }, (graph as any).__datasetIds || []);
}

/** Load the latest persisted evidence graph for a project, or null. */
export async function loadEvidence(projectId: string): Promise<EvidenceGraph | null> {
  try {
    const r = await apiGet("/api/evidence", { project_id: projectId });
    if (!r?.graph) return null;
    const g = r.graph as EvidenceGraph;
    // PIN the stored hash. The reconstructed graph is not byte-identical to
    // the one that ran (generated_at comes from the DB row, jsonb reorders
    // keys) — recomputing would orphan every cached section on reload.
    if (r.meta?.evidence_hash) (g as any).evidenceHash = r.meta.evidence_hash;
    // Surface the graph's registry dataset links so a run can verify it is the
    // CURRENT registry corpus (mock-guard) before trusting it. A row with no
    // dataset links (e.g. the stale 05-Jul demo graph) stays 'unknown' and a
    // registry-backed run re-assembles instead of trusting it.
    if (Array.isArray(r.meta?.dataset_ids)) {
      g.__datasetIds = r.meta.dataset_ids;
      g.__provenance = r.meta.dataset_ids.length > 0 ? 'registry' : 'unknown';
    }
    // Never rehydrate the demo/mock corpus as real evidence.
    if (isMockGraph(g)) {
      console.warn("[persistence] loaded evidence graph flagged mock — discarding.");
      return null;
    }
    // A registry-backed project must not adopt an untrusted (no dataset links)
    // persisted graph as its corpus — e.g. the stale 05-Jul demo graph. Discard
    // it so the run re-assembles from the authoritative registry instead.
    if (isRegistryBacked(projectId as ProjectId) && graphProvenance(g) !== 'registry') {
      console.warn(`[persistence] loaded graph for registry-backed ${projectId} has no dataset links — discarding (run will re-assemble).`);
      return null;
    }
    return g;
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
