import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdmin, supabaseConfigured, handlePreflight, readBody } from "./_lib/supabaseAdmin";

// /api/cache — the section-output cache.
//   GET  ?project_id&section_id&evidence_hash&provider  -> { hit, row }
//   POST { project_id, section_id, template_id, evidence_hash, provider, model, status, content, logs }
//        -> upserts on (project_id, section_id, evidence_hash, provider)
// When Supabase isn't configured the route degrades to "miss"/no-op so the app
// still works without persistence.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;

  if (!supabaseConfigured()) {
    if (req.method === "GET") return res.status(200).json({ hit: false, persistence: false });
    return res.status(200).json({ ok: true, persistence: false });
  }

  const admin = getAdmin();

  if (req.method === "GET") {
    const { project_id, section_id, evidence_hash, provider } = req.query as Record<string, string>;
    if (!project_id || !section_id) return res.status(400).json({ error: "missing_keys" });
    const { data, error } = await admin
      .from("section_outputs")
      .select("*")
      .eq("project_id", project_id)
      .eq("section_id", section_id)
      .eq("evidence_hash", evidence_hash || "seed")
      .eq("provider", provider || "seed")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ hit: !!data, row: data, persistence: true });
  }

  if (req.method === "POST") {
    const b = readBody(req);
    if (!b.project_id || !b.section_id || b.content === undefined) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const row = {
      project_id: b.project_id,
      section_id: b.section_id,
      template_id: b.template_id || null,
      evidence_hash: b.evidence_hash || "seed",
      provider: b.provider || "seed",
      model: b.model || null,
      status: b.status || "OK",
      content: b.content,
      logs: b.logs || null,
    };
    const { data, error } = await admin
      .from("section_outputs")
      .upsert(row, { onConflict: "project_id,section_id,evidence_hash,provider" })
      .select("id")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, id: data?.id, persistence: true });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
