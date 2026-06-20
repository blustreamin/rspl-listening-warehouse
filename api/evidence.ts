import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAdmin, supabaseConfigured, ensureBucket, DATASET_BUCKET,
  handlePreflight, readBody,
} from "./_lib/supabaseAdmin";

// /api/evidence — persisted deterministic evidence graphs (so a refresh keeps data).
//   GET  ?project_id            -> latest graph for the project (events hydrated from Storage)
//   POST { project_id, dataset_ids, evidence_hash, graph } -> stores graph (events in Storage)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;

  if (!supabaseConfigured()) {
    if (req.method === "GET") return res.status(200).json({ graph: null, persistence: false });
    return res.status(200).json({ ok: true, persistence: false });
  }

  const admin = getAdmin();

  if (req.method === "GET") {
    const { project_id } = req.query as Record<string, string>;
    if (!project_id) return res.status(400).json({ error: "missing_project_id" });
    const { data, error } = await admin
      .from("evidence_graphs")
      .select("*")
      .eq("project_id", project_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
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
    return res.status(200).json({ graph, meta: { id: data.id, evidence_hash: data.evidence_hash }, persistence: true });
  }

  if (req.method === "POST") {
    const b = readBody(req);
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
