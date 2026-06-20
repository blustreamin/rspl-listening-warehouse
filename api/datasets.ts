import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAdmin, supabaseConfigured, ensureBucket, DATASET_BUCKET,
  handlePreflight, readBody,
} from "./_lib/supabaseAdmin";

// /api/datasets — uploaded social-listening files.
//   GET    ?project_id           -> { datasets: [...metadata] }
//   POST   { project_id, name, source_tag, columns, rows[] }
//          -> stores rows JSON in Storage, inserts metadata row
//   DELETE ?id                    -> removes metadata row + Storage object
// Raw rows live in the private `warehouse-datasets` bucket; the table holds
// only metadata + the storage path.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;

  if (!supabaseConfigured()) {
    if (req.method === "GET") return res.status(200).json({ datasets: [], persistence: false });
    return res.status(200).json({ ok: true, persistence: false });
  }

  const admin = getAdmin();

  if (req.method === "GET") {
    const { project_id } = req.query as Record<string, string>;
    let q = admin.from("datasets").select("*").order("uploaded_at", { ascending: false });
    if (project_id) q = q.eq("project_id", project_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ datasets: data || [], persistence: true });
  }

  if (req.method === "POST") {
    const b = readBody(req);
    if (!b.project_id || !b.name || !Array.isArray(b.rows)) {
      return res.status(400).json({ error: "missing_fields" });
    }
    await ensureBucket();

    const id = crypto.randomUUID();
    const path = `${b.project_id}/${id}.json`;
    const payload = JSON.stringify(b.rows);
    const bytes = Buffer.from(payload, "utf-8");

    const up = await admin.storage.from(DATASET_BUCKET).upload(path, bytes, {
      contentType: "application/json",
      upsert: true,
    });
    if (up.error) return res.status(500).json({ error: up.error.message });

    const { data, error } = await admin
      .from("datasets")
      .insert({
        id,
        project_id: b.project_id,
        name: b.name,
        source_tag: b.source_tag || "other",
        row_count: b.rows.length,
        columns: Array.isArray(b.columns) ? b.columns : [],
        storage_path: path,
        byte_size: bytes.length,
      })
      .select("*")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, dataset: data, persistence: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.query as Record<string, string>;
    if (!id) return res.status(400).json({ error: "missing_id" });
    const { data: row } = await admin.from("datasets").select("storage_path").eq("id", id).maybeSingle();
    if (row?.storage_path) {
      await admin.storage.from(DATASET_BUCKET).remove([row.storage_path]);
    }
    const { error } = await admin.from("datasets").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, persistence: true });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
