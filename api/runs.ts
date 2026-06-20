import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdmin, supabaseConfigured, handlePreflight, readBody } from "./_lib/supabaseAdmin.js";

// /api/runs — lightweight run history for the report inspector.
//   GET  ?project_id     -> recent runs
//   POST { ...run }      -> insert a run record
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;

  if (!supabaseConfigured()) {
    if (req.method === "GET") return res.status(200).json({ runs: [], persistence: false });
    return res.status(200).json({ ok: true, persistence: false });
  }

  const admin = getAdmin();

  if (req.method === "GET") {
    const { project_id } = req.query as Record<string, string>;
    let q = admin.from("runs").select("*").order("started_at", { ascending: false }).limit(25);
    if (project_id) q = q.eq("project_id", project_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ runs: data || [], persistence: true });
  }

  if (req.method === "POST") {
    const b = readBody(req);
    if (!b.project_id) return res.status(400).json({ error: "missing_project_id" });
    const { data, error } = await admin
      .from("runs")
      .insert({
        project_id: b.project_id,
        provider: b.provider || null,
        model: b.model || null,
        evidence_hash: b.evidence_hash || null,
        sections_total: b.sections_total || 0,
        sections_ok: b.sections_ok || 0,
        sections_seeded: b.sections_seeded || 0,
        status: b.status || "done",
        logs: b.logs || null,
        finished_at: b.finished_at || new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, id: data?.id, persistence: true });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
