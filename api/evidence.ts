import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAdmin, supabaseConfigured, ensureBucket, DATASET_BUCKET,
  handlePreflight, readBody,
} from "./_lib/supabaseAdmin.js";

// /api/evidence — persisted deterministic evidence graphs (so a refresh keeps data).
//   GET  ?project_id            -> latest graph for the project (events hydrated from Storage)
//   GET  ?project_id&stats=1    -> lightweight row metadata + aggregations (no event blob)
//   POST { project_id, dataset_ids, evidence_hash, graph } -> stores graph (events in Storage)
//        LEGACY single-shot path — fails on large corpora (the serverless body
//        limit is ~4.5MB; a 60k-event blob is ~10x that, which is exactly how
//        the 05-Jul rebuild registered 30 datasets but zero graph rows).
//   POST { mode: "sign", project_id } -> { id, path, url } signed UPLOAD URL:
//        the client PUTs the events blob straight to Storage (no size limit),
//   POST { mode: "register", project_id, id, storage_path, evidence_hash,
//          event_count, aggregations, dataset_ids } -> inserts the graph row
//        without the blob. sign + register = the large-corpus-safe persist.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;

  if (!supabaseConfigured()) {
    if (req.method === "GET") return res.status(200).json({ graph: null, persistence: false });
    return res.status(200).json({ ok: true, persistence: false });
  }

  const admin = getAdmin();

  if (req.method === "GET") {
    const { project_id, stats } = req.query as Record<string, string>;
    if (!project_id) return res.status(400).json({ error: "missing_project_id" });
    const { data, error } = await admin
      .from("evidence_graphs")
      .select("*")
      .eq("project_id", project_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    // Light mode (?stats=1) — registry metadata + aggregations only, no event
    // blob download. The Data Foundation ingestion panel reads THIS; it never
    // pulls the full corpus just to show counts.
    if (stats) {
      if (!data) return res.status(200).json({ stats: null, persistence: true });
      return res.status(200).json({
        stats: {
          event_count: data.event_count ?? 0,
          generated_at: data.generated_at,
          evidence_hash: data.evidence_hash,
          aggregations: data.aggregations || {},
        },
        persistence: true,
      });
    }

    if (!data) return res.status(200).json({ graph: null, persistence: true });

    let events: any[] = [];
    if (data.storage_path) {
      const dl = await admin.storage.from(DATASET_BUCKET).download(data.storage_path);
      if (dl.data) {
        try { events = JSON.parse(await dl.data.text()); } catch { events = []; }
      }
    }
    const graph = {
      schemaVersion: "evidence_graph_v1",
      projectId: project_id,
      generatedAtISO: data.generated_at,
      events,
      aggregations: data.aggregations || {},
    };
    // dataset_ids is additive here: the client mock-corpus guard uses it to
    // confirm a loaded graph reflects the CURRENT dataset registry before
    // trusting it as a run corpus. (No change to read auth/keys/storage.)
    return res.status(200).json({
      graph,
      meta: { id: data.id, evidence_hash: data.evidence_hash, dataset_ids: data.dataset_ids || [] },
      persistence: true,
    });
  }

  if (req.method === "POST") {
    const b = readBody(req);

    // Phase 1 — hand the client a signed upload URL for the events blob.
    if (b.mode === "sign") {
      if (!b.project_id) return res.status(400).json({ error: "missing_project_id" });
      await ensureBucket();
      const id = crypto.randomUUID();
      const path = `${b.project_id}/evidence/${id}.json`;
      const { data, error } = await admin.storage
        .from(DATASET_BUCKET).createSignedUploadUrl(path);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ id, path, url: data.signedUrl, persistence: true });
    }

    // Phase 2 — register the graph row against the already-uploaded blob.
    if (b.mode === "register") {
      if (!b.project_id || !b.storage_path) return res.status(400).json({ error: "missing_fields" });
      const { data, error } = await admin
        .from("evidence_graphs")
        .insert({
          id: b.id || crypto.randomUUID(),
          project_id: b.project_id,
          dataset_ids: Array.isArray(b.dataset_ids) ? b.dataset_ids : [],
          evidence_hash: b.evidence_hash || null,
          event_count: typeof b.event_count === "number" ? b.event_count : 0,
          aggregations: b.aggregations || {},
          storage_path: b.storage_path,
        })
        .select("id")
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, id: data?.id, persistence: true });
    }

    if (!b.project_id || !b.graph) return res.status(400).json({ error: "missing_fields" });
    await ensureBucket();

    const id = crypto.randomUUID();
    const events = Array.isArray(b.graph.events) ? b.graph.events : [];
    const path = `${b.project_id}/evidence/${id}.json`;
    const bytes = Buffer.from(JSON.stringify(events), "utf-8");
    const up = await admin.storage.from(DATASET_BUCKET).upload(path, bytes, {
      contentType: "application/json", upsert: true,
    });
    if (up.error) return res.status(500).json({ error: up.error.message });

    const { data, error } = await admin
      .from("evidence_graphs")
      .insert({
        id,
        project_id: b.project_id,
        dataset_ids: Array.isArray(b.dataset_ids) ? b.dataset_ids : [],
        evidence_hash: b.evidence_hash || null,
        event_count: events.length,
        aggregations: b.graph.aggregations || {},
        storage_path: path,
      })
      .select("id")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, id: data?.id, persistence: true });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
