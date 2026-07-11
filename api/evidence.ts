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
//   POST { mode: "assemble", project_id, dataset_ids? } -> SERVER-SIDE
//        assembly (11-Jul fix): registry -> Storage downloads -> deterministic
//        ingest -> India gate + date window (V-01/V-02) -> events blob ->
//        row insert LAST. Hard failure returns non-200 — the sign/PUT/register
//        chain above died invisibly in the browser at 81k events (aborted PUT,
//        every recovery path client-side, nothing server-side to log).
//        Implementation is dynamically imported so a defect in it can never
//        cold-start-crash this module and take down the GET the live report
//        depends on.
// Mirror of MOCK_ALLOWED in constants/projectConfig.ts — deliberately inlined
// (NOT imported): this module must have zero cross-directory static imports so
// no tracing/bundling defect can ever cold-start-crash the GET the live report
// reads. Same secure default: a project not listed here is registry-backed.
const DEMO_PROJECTS = new Set([
  "disposable-period-panties", "reusable-period-panties", "sanitary-pads", "adult-diapers",
]);
const registryBacked = (projectId: string) => !DEMO_PROJECTS.has(projectId);

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
          // V-03 — the assembled graph's CANONICAL dataset-set size (the rows it
          // was actually built from), so the S20 footnote can cite it instead of
          // the raw ingestion registry ("80 files · 143,372"). Read-only/additive.
          dataset_count: Array.isArray(data.dataset_ids) ? data.dataset_ids.length : 0,
          generated_at: data.generated_at,
          evidence_hash: data.evidence_hash,
          aggregations: data.aggregations || {},
        },
        persistence: true,
      });
    }

    if (!data) return res.status(200).json({ graph: null, persistence: true });

    // Events travel via a short-lived signed download URL, NOT inline: the
    // inline payload exceeded Vercel's ~4.5MB function-response cap from
    // ~15k events, so cross-session evidence loads silently failed and every
    // fresh session re-assembled under a new hash, orphaning the section
    // cache. Mirrors /api/datasets ?download=1 (same bucket, sign call, 600s).
    let eventsUrl: string | null = null;
    if (data.storage_path) {
      const { data: signed, error: signErr } = await admin.storage
        .from(DATASET_BUCKET).createSignedUrl(data.storage_path, 600);
      if (signErr) return res.status(500).json({ error: signErr.message });
      eventsUrl = signed.signedUrl;
    }
    const graph = {
      schemaVersion: "evidence_graph_v1",
      projectId: project_id,
      generatedAtISO: data.generated_at,
      events: [] as any[],
      aggregations: data.aggregations || {},
    };
    // dataset_ids is additive here: the client mock-corpus guard uses it to
    // confirm a loaded graph reflects the CURRENT dataset registry before
    // trusting it as a run corpus. (No change to read auth/keys/storage.)
    return res.status(200).json({
      graph,
      events_url: eventsUrl,
      meta: { id: data.id, evidence_hash: data.evidence_hash, dataset_ids: data.dataset_ids || [] },
      persistence: true,
    });
  }

  if (req.method === "POST") {
    const b = readBody(req);

    // Server-side assembly (11-Jul fix) — see header comment.
    if (b.mode === "assemble") {
      try {
        const { assembleProject } = await import("./_lib/assemble.js");
        const result = await assembleProject(admin, b);
        return res.status(200).json({ ...result, persistence: true });
      } catch (err: any) {
        const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
        console.error(`[evidence.assemble] ${status} ${err?.message}`, err?.details ?? "", err?.stack ?? "");
        // 4xx details are our own structured validation objects (safe, and the
        // UI needs them); 5xx details can carry raw driver/Postgres messages —
        // those stay in the server log only (the endpoint is unauthenticated).
        return res.status(status).json({
          error: err?.message || "assemble_failed",
          details: status < 500 ? err?.details : undefined,
        });
      }
    }

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
      // SERVER-SIDE structural veto (11-Jul): a registry-backed project's
      // canonical graph must carry its dataset links. The client-side veto in
      // lib/persistence.ts cannot protect this endpoint from older bundles or
      // direct calls — and a linkless row becoming LATEST is exactly how a
      // 1,409-event increment displaced the canonical corpus in Section 20.
      if (registryBacked(b.project_id) && !(Array.isArray(b.dataset_ids) && b.dataset_ids.length > 0)) {
        return res.status(422).json({ error: "linkless_graph_refused", persistence: true });
      }
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
    // Same structural veto as mode:"register" (see comment there).
    if (registryBacked(b.project_id) && !(Array.isArray(b.dataset_ids) && b.dataset_ids.length > 0)) {
      return res.status(422).json({ error: "linkless_graph_refused", persistence: true });
    }
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
