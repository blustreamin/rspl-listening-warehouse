import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EvidenceGraph, GateAuditV1, GeoClass, IngestRequestV1, TrendMonthlyV1, UploadedFile,
} from "../../types.js";
import { babyDiapersIngestion } from "../../services/ingestion/babyDiapersIngestion.js";
import { generateAutoMapping } from "../../services/mappingService.js";
import { gateRow } from "./indiaGate.js";
import { DATASET_BUCKET } from "./supabaseAdmin.js";
import { computeBabyDiapersAnalyses } from "../../services/analyses/babyDiapersAnalyses.js";
import type { AnalysisInputRow } from "../../services/analyses/analysisTypes.js";

// ============================================================================
// SERVER-SIDE EVIDENCE ASSEMBLY — POST /api/evidence { mode: "assemble" }.
//
// Replaces the browser-side assemble+persist chain that died invisibly on
// 11-Jul (sign 200 -> direct-to-Storage PUT aborted client-side -> nothing
// persisted, nothing logged). Here every step runs inside one function
// invocation: registry read -> Storage downloads -> deterministic ingest
// (pass 1, ALL rows, reconciliation) -> India gate + date window (V-01/V-02,
// row-level) -> deterministic ingest (pass 2, kept rows only, so the
// canonical ingestion code itself computes the post-gate aggregations) ->
// events blob to Storage (verified) -> evidence_graphs row INSERTED LAST.
// Any failure throws AssembleError -> the handler returns non-200.
//
// Ingestion runs twice because the gate classifies RAW ROWS (events carry no
// sourceRef back to their row, geo.country defaults to 'IN', undated rows get
// stamped now() — see indiaGate.ts) while aggregations must describe the
// POST-GATE corpus. Two passes over ~60-150k rows are seconds of CPU and keep
// a single source of truth for both events and aggregations.
//
// Only LOSSLESS ingestions are supported (1 non-null row -> exactly 1 event):
// the reconciliation and the exact audit equation depend on it. baby-diapers
// is lossless; the femcare/adult ingestions still dedup and length-gate, so
// they are refused here and keep their legacy client-side Data Studio path.
// ============================================================================

const LOSSLESS_INGESTIONS: Record<string, (req: IngestRequestV1) => EvidenceGraph> = {
  "baby-diapers": babyDiapersIngestion,
};

const GATE_VERSION = "india_gate_v1";
const WINDOW_MONTHS = 36;
const TREND_MONTHS = 60;
const RECONCILE_TOLERANCE = 0.02;

export class AssembleError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface DatasetMeta {
  id: string;
  name?: string;
  source_tag?: string;
  columns?: string[];
  row_count?: number;
  uploaded_at?: string;
  storage_path?: string | null;
}

// Registry source_tag -> the sourceTag bucket the deterministic ingestion
// stamps on events (mirror of babyDiapersIngestion + graphAssembly.normalizeTag).
const normalizeTag = (t?: string): string => {
  const s = (t || "").toLowerCase();
  if (s.includes("amazon")) return "amazon";
  if (s.includes("flipkart")) return "flipkart";
  if (s.includes("firstcry")) return "firstcry";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("facebook")) return "facebook";
  return "social";
};

/** Union of keys across a sample of rows — row 0 alone under-reports because
 *  XLSX parsing omits keys for blank cells (same rule as graphAssembly). */
const unionColumns = (rows: any[]): string[] => {
  const cols = new Set<string>();
  for (const r of rows.slice(0, 50)) {
    if (r && typeof r === "object") for (const k of Object.keys(r)) cols.add(k);
  }
  return [...cols];
};

const monthKey = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const bump = (rec: Record<string, number>, key: string, by = 1) => {
  rec[key] = (rec[key] || 0) + by;
};

export interface AssemblyResult {
  graph: EvidenceGraph;           // post-gate graph, audit + trend attached
  audit: GateAuditV1;
  preGateCount: number;
  keptCount: number;
}

/** Pure assembly core (no Storage/DB) — also driven directly by the local
 *  repro harness at 143k scale. `fetchRows` must throw on any failure; a
 *  partial corpus is never assembled (all-or-nothing, matching the client
 *  rebuild's semantics). */
export async function runAssembly(
  projectId: string,
  datasets: DatasetMeta[],
  fetchRows: (d: DatasetMeta) => Promise<any[]>,
  nowMs: number = Date.now(),
  graphId?: string
): Promise<AssemblyResult> {
  const ingest = LOSSLESS_INGESTIONS[projectId];
  if (!ingest) {
    throw new AssembleError(400, "assemble_unsupported_project", {
      projectId, supported: Object.keys(LOSSLESS_INGESTIONS),
    });
  }
  if (datasets.length === 0) throw new AssembleError(422, "empty_registry");

  // UPLOAD ORDER, not registry order — keeps assembly deterministic across
  // rebuilds (same rule as services/graphAssembly.ts).
  const ordered = [...datasets].sort(
    (a, b) => (a.uploaded_at || "").localeCompare(b.uploaded_at || "") || a.id.localeCompare(b.id)
  );

  // --- Build the IngestRequestV1 inputs exactly as the client rebuild does:
  // deterministic generateAutoMapping from registry source_tag + columns.
  const inputs: IngestRequestV1["inputs"] = [];
  for (const d of ordered) {
    const rows = await fetchRows(d);
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AssembleError(500, "dataset_rows_empty", { datasetId: d.id, name: d.name });
    }
    const pseudoFile: UploadedFile = {
      id: d.id,
      name: d.name || d.id,
      size: 0,
      type: "application/json",
      sourceTag: (d.source_tag || "other") as UploadedFile["sourceTag"],
      uploadedAt: d.uploaded_at || new Date(nowMs).toISOString(),
      parsedPreview: {
        columns: d.columns && d.columns.length ? d.columns : unionColumns(rows),
        rowCount: rows.length,
      },
      rawContent: rows.slice(0, 100),
    };
    const mapping = generateAutoMapping(pseudoFile);
    inputs.push({
      inputId: d.id,
      sourceTag: pseudoFile.sourceTag,
      fileMeta: { fileId: d.id, fileName: pseudoFile.name, rowCount: rows.length },
      mapping: { canonicalFieldMap: mapping.fieldMap, constants: mapping.constants as any },
      rows: rows.map((row, i) => ({ rowId: `r_${i}`, raw: row })),
    });
  }

  const request: IngestRequestV1 = {
    schemaVersion: "ingest_request_v1",
    orgId: "rspl",
    projectId,
    runMeta: { trigger: "server_assemble", requestedAtISO: new Date(nowMs).toISOString() },
    inputs,
  };

  // --- PASS 1: ingest ALL rows. Proves the ingest is still lossless and
  // gives the pre-gate counts the reconciliation + audit are built on.
  const preGraph = ingest(request);
  const preGateByTag: Record<string, number> = {};
  for (const e of preGraph.events || []) bump(preGateByTag, normalizeTag(e.sourceTag));
  const preGateTotal = preGraph.events?.length ?? 0;

  // --- RECONCILIATION (a): pre-gate reconstruction vs the registry row sum,
  // total AND per normalized tag, 2% tolerance. A deficit means rows were
  // silently lost — refuse to canonicalise (the 05-Jul lesson).
  const registryByTag: Record<string, number> = {};
  for (const d of ordered) bump(registryByTag, normalizeTag(d.source_tag), d.row_count || 0);
  const registrySum = Object.values(registryByTag).reduce((s, n) => s + n, 0);
  const deltas: string[] = [];
  if (registrySum > 0 && Math.abs(registrySum - preGateTotal) > registrySum * RECONCILE_TOLERANCE) {
    deltas.push(`total ${preGateTotal}/${registrySum}`);
  }
  for (const [tag, exp] of Object.entries(registryByTag)) {
    const got = preGateByTag[tag] || 0;
    if (exp > 0 && Math.abs(exp - got) > exp * RECONCILE_TOLERANCE) deltas.push(`${tag} ${got}/${exp}`);
  }
  if (deltas.length > 0) {
    throw new AssembleError(422, "pre_gate_reconciliation_failed", {
      deltas, registryByTag, preGateByTag,
    });
  }

  // --- INDIA GATE + DATE WINDOW (row-level; same null-row predicate as the
  // ingest so gate counts and pre-gate event counts describe the same rows).
  const cutoff = new Date(nowMs);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - WINDOW_MONTHS);
  const cutoffMs = cutoff.getTime();
  // Day clamps to 1 BEFORE the month subtraction: with the assemble day still
  // set, setUTCMonth normalizes forward when the target month is shorter
  // (Jan 31 - 59mo landed on Mar 1, silently dropping the true first month
  // and appending a phantom future bucket).
  const trendStart = new Date(nowMs);
  trendStart.setUTCDate(1);
  trendStart.setUTCHours(0, 0, 0, 0);
  trendStart.setUTCMonth(trendStart.getUTCMonth() - (TREND_MONTHS - 1));
  const trendStartMs = trendStart.getTime();

  const geoKeptCounts = { IN_PLATFORM: 0, IN_GEO: 0, IN_SIGNAL: 0 };
  const geoDroppedCounts = { NON_IN: 0, UNKNOWN_GLOBAL: 0 };
  const geoByTag: Record<string, Partial<Record<GeoClass, number>>> = {};
  const dateByTag: Record<string, { droppedPreWindow: number; undatedKept: number; datedKept: number }> = {};
  let droppedPreWindow = 0, undatedKept = 0, datedKept = 0;
  const trendBuckets: Record<string, number> = {};
  const keptInputs: IngestRequestV1["inputs"] = [];
  // Per-input gate decisions for the KEPT rows, index-aligned with
  // keptInputs[k].rows — the analyses layer receives the audit's real
  // datedness instead of recomputing it.
  const keptGates: Array<Array<{ dated: boolean; dateMs: number | null; geoClass: GeoClass }>> = [];
  let countableRows = 0;
  let keptCount = 0;

  for (const input of inputs) {
    const tag = normalizeTag(input.sourceTag);
    const fieldMap = input.mapping.canonicalFieldMap;
    const keptRows: typeof input.rows = [];
    const keptRowGates: Array<{ dated: boolean; dateMs: number | null; geoClass: GeoClass }> = [];
    for (const row of input.rows) {
      const raw = row.raw;
      if (!raw || typeof raw !== "object") continue; // ingest skips these too
      countableRows++;
      const decision = gateRow(raw, fieldMap, input.sourceTag, cutoffMs);

      const tagGeo = geoByTag[tag] || (geoByTag[tag] = {});
      tagGeo[decision.geoClass] = (tagGeo[decision.geoClass] || 0) + 1;
      if (decision.geoClass === "NON_IN" || decision.geoClass === "UNKNOWN_GLOBAL") {
        geoDroppedCounts[decision.geoClass]++;
        continue;
      }
      geoKeptCounts[decision.geoClass]++;

      // Trend series (V-02 side product): geo-kept, date-UNwindowed.
      if (decision.dated && (decision.dateMs as number) >= trendStartMs && (decision.dateMs as number) <= nowMs) {
        bump(trendBuckets, monthKey(decision.dateMs as number));
      }

      const tagDate = dateByTag[tag] || (dateByTag[tag] = { droppedPreWindow: 0, undatedKept: 0, datedKept: 0 });
      if (decision.preWindow) {
        droppedPreWindow++; tagDate.droppedPreWindow++;
        continue;
      }
      if (decision.dated) { datedKept++; tagDate.datedKept++; }
      else { undatedKept++; tagDate.undatedKept++; }
      keptRows.push(row);
      keptRowGates.push({ dated: decision.dated, dateMs: decision.dateMs, geoClass: decision.geoClass });
      keptCount++;
    }
    keptInputs.push({ ...input, rows: keptRows });
    keptGates.push(keptRowGates);
  }

  // The gate and the ingest MUST describe the same row population.
  if (countableRows !== preGateTotal) {
    throw new AssembleError(500, "gate_ingest_row_mismatch", {
      countableRows, preGateTotal,
    });
  }

  // --- PASS 2: ingest ONLY the kept rows — the canonical ingestion computes
  // the post-gate aggregations (Section 20 renders these).
  const postGraph = ingest({ ...request, inputs: keptInputs });
  const postGateByTag: Record<string, number> = {};
  for (const e of postGraph.events || []) bump(postGateByTag, normalizeTag(e.sourceTag));
  const postGateTotal = postGraph.events?.length ?? 0;

  // --- EXACT audit consistency (acceptance c): postGate must equal preGate
  // minus the audited exclusions, per tag and in total. Anything else is a
  // bug and must never be canonicalised.
  const expectedPostGate = preGateTotal - geoDroppedCounts.NON_IN - geoDroppedCounts.UNKNOWN_GLOBAL - droppedPreWindow;
  if (postGateTotal !== expectedPostGate || postGateTotal !== keptCount) {
    throw new AssembleError(500, "gate_audit_inconsistent", {
      preGateTotal, postGateTotal, expectedPostGate, keptCount,
      dropped: { ...geoDroppedCounts, preWindow: droppedPreWindow },
    });
  }
  for (const tag of new Set([...Object.keys(preGateByTag), ...Object.keys(postGateByTag)])) {
    const g = geoByTag[tag] || {};
    const dW = dateByTag[tag]?.droppedPreWindow || 0;
    const expTag = (preGateByTag[tag] || 0) - (g.NON_IN || 0) - (g.UNKNOWN_GLOBAL || 0) - dW;
    if ((postGateByTag[tag] || 0) !== expTag) {
      throw new AssembleError(500, "gate_audit_inconsistent_tag", {
        tag, preGate: preGateByTag[tag] || 0, postGate: postGateByTag[tag] || 0, expected: expTag,
      });
    }
  }

  const audit: GateAuditV1 = {
    version: GATE_VERSION,
    assembledAtISO: new Date(nowMs).toISOString(),
    cutoffISO: cutoff.toISOString(),
    windowMonths: WINDOW_MONTHS,
    registry: { rowSum: registrySum, byTag: registryByTag },
    preGate: { total: preGateTotal, byTag: preGateByTag },
    reconciliation: { tolerance: RECONCILE_TOLERANCE, ok: true, deltas: [] },
    geoClass: { kept: geoKeptCounts, dropped: geoDroppedCounts, byTag: geoByTag },
    dateWindow: { droppedPreWindow, undatedKept, datedKept, byTag: dateByTag },
    postGate: { total: postGateTotal, byTag: postGateByTag },
  };

  // Zero-filled 60-month series ending the current month.
  const series: TrendMonthlyV1["series"] = [];
  const m = new Date(trendStartMs);
  for (let i = 0; i < TREND_MONTHS; i++) {
    const key = monthKey(m.getTime());
    series.push({ month: key, count: trendBuckets[key] || 0 });
    m.setUTCMonth(m.getUTCMonth() + 1);
  }

  postGraph.aggregations = {
    ...(postGraph.aggregations || {}),
    gateAudit: audit,
    trendMonthly: { basis: "geo_gated_date_unwindowed", months: TREND_MONTHS, series },
  };

  // ── ANALYSES LAYER (Agent C, N-15…N-58) ── computed over the gated +
  // windowed KEPT RAW ROWS zipped positionally with their PASS-2 events (the
  // ingest is lossless and in-order; the exact-consistency checks above are
  // what make this zip sound). Raw rows carry the fields the event drops
  // (price/variant/product/lang); the event carries the canonicalised
  // brand/platform/rating; the REAL gate decision rides along so the layer's
  // datedness is the audit's, never a recompute. evidenceHash is stamped by
  // assembleProject AFTER hashing (a bundle cannot contain its own hash).
  if (projectId === "baby-diapers") {
    const flatKept: AnalysisInputRow[] = [];
    keptInputs.forEach((inp, k) => {
      inp.rows.forEach((r, j) => {
        flatKept.push({
          raw: r.raw,
          fieldMap: inp.mapping.canonicalFieldMap,
          sourceTag: inp.sourceTag,
          event: undefined as any, // zipped below
          gate: keptGates[k][j],
        });
      });
    });
    const postEvents = postGraph.events || [];
    if (flatKept.length !== postEvents.length) {
      throw new AssembleError(500, "analyses_zip_mismatch", {
        keptRows: flatKept.length, events: postEvents.length,
      });
    }
    postEvents.forEach((e, i) => { flatKept[i].event = e; });
    postGraph.aggregations = {
      ...(postGraph.aggregations || {}),
      analyses: computeBabyDiapersAnalyses(flatKept, {
        projectId,
        graphId,
        assembledAtISO: new Date(nowMs).toISOString(),
        cutoffISO: cutoff.toISOString(),
        windowMonths: WINDOW_MONTHS,
      }),
    };
  }

  (postGraph as any).__datasetIds = ordered.map((d) => d.id);
  (postGraph as any).__provenance = "registry";

  return { graph: postGraph, audit, preGateCount: preGateTotal, keptCount: postGateTotal };
}

export interface AssembleResponse {
  ok: true;
  id: string;
  evidence_hash: string;
  event_count: number;
  pre_gate_count: number;
  dataset_count: number;
  dropped: { NON_IN: number; UNKNOWN_GLOBAL: number; pre_window: number };
  blob_bytes: number;
}

/** Full server assemble: registry read -> Storage downloads -> runAssembly ->
 *  events blob (verified) -> evidence_graphs row LAST. Throws AssembleError. */
export async function assembleProject(
  admin: SupabaseClient,
  body: { project_id?: string; dataset_ids?: unknown }
): Promise<AssembleResponse> {
  const projectId = body.project_id;
  if (!projectId) throw new AssembleError(400, "missing_project_id");

  let query = admin
    .from("datasets")
    .select("id,name,source_tag,columns,row_count,uploaded_at,storage_path")
    .eq("project_id", projectId);
  const explicitIds = Array.isArray(body.dataset_ids) && body.dataset_ids.length > 0
    ? (body.dataset_ids as string[])
    : null;
  if (explicitIds) query = query.in("id", explicitIds);
  const { data: datasets, error: dsErr } = await query;
  if (dsErr) throw new AssembleError(500, "registry_read_failed", dsErr.message);
  if (explicitIds) {
    const found = new Set((datasets || []).map((d: DatasetMeta) => d.id));
    const missing = explicitIds.filter((id) => !found.has(id));
    if (missing.length > 0) throw new AssembleError(400, "unknown_dataset_ids", { missing });
  }
  if (!datasets || datasets.length === 0) throw new AssembleError(422, "empty_registry");

  // Row id minted BEFORE assembly so the analyses bundle is versioned by the
  // exact graph row it will live on.
  const id = crypto.randomUUID();

  const { graph, audit, preGateCount, keptCount } = await runAssembly(
    projectId,
    datasets as DatasetMeta[],
    async (d) => {
      if (!d.storage_path) {
        throw new AssembleError(500, "dataset_missing_storage_path", { datasetId: d.id, name: d.name });
      }
      const { data, error } = await admin.storage.from(DATASET_BUCKET).download(d.storage_path);
      if (error || !data) {
        throw new AssembleError(500, "dataset_download_failed", {
          datasetId: d.id, name: d.name, message: error?.message,
        });
      }
      const text = await data.text();
      try {
        return JSON.parse(text);
      } catch (e: any) {
        // A bare SyntaxError would surface as a context-free 500 — name the
        // corrupt dataset so the operator can repair/re-upload it.
        throw new AssembleError(500, "dataset_blob_corrupt", {
          datasetId: d.id, name: d.name, message: e?.message,
        });
      }
    },
    Date.now(),
    id
  );

  // Hash the finished graph (40-hex like the client's computeEvidenceHash);
  // continuity across sessions comes from PINNING this stored value on load,
  // not from recomputability.
  const evidenceHash = createHash("sha256")
    .update(JSON.stringify(graph))
    .digest("hex")
    .substring(0, 40);
  // Stamp the hash into the analyses bundle AFTER hashing — a bundle cannot
  // contain its own hash. The row's aggregations (and the response) carry the
  // stamped version; the hash key itself is pinned-opaque, never recomputed.
  const analysesBundle = graph.aggregations?.analyses;
  if (analysesBundle) analysesBundle.evidenceHash = evidenceHash;

  // Bucket check on the INJECTED client (not supabaseAdmin's singleton — the
  // env-bound ensureBucket would defeat injection in the repro harness).
  const { data: bucket } = await admin.storage.getBucket(DATASET_BUCKET);
  if (!bucket) await admin.storage.createBucket(DATASET_BUCKET, { public: false });

  const path = `${projectId}/evidence/${id}.json`;
  const bytes = Buffer.from(JSON.stringify(graph.events || []), "utf-8");
  const up = await admin.storage.from(DATASET_BUCKET).upload(path, bytes, {
    contentType: "application/json", upsert: false,
  });
  if (up.error) throw new AssembleError(500, "events_blob_upload_failed", up.error.message);

  // Verify the blob actually landed at the expected size before the row makes
  // it canonical — the row insert is the single atomic commit point.
  const { data: listed, error: listErr } = await admin.storage
    .from(DATASET_BUCKET)
    .list(`${projectId}/evidence`, { search: id });
  const stored = listed?.find((o: any) => o.name === `${id}.json`);
  const storedSize = Number(stored?.metadata?.size ?? NaN);
  if (listErr || !stored || storedSize !== bytes.length) {
    await admin.storage.from(DATASET_BUCKET).remove([path]).catch(() => {});
    throw new AssembleError(500, "events_blob_verify_failed", {
      listError: listErr?.message, expectedBytes: bytes.length, storedSize,
    });
  }

  const { data: row, error: insErr } = await admin
    .from("evidence_graphs")
    .insert({
      id,
      project_id: projectId,
      dataset_ids: (graph as any).__datasetIds || [],
      evidence_hash: evidenceHash,
      event_count: keptCount,
      aggregations: graph.aggregations || {},
      storage_path: path,
    })
    .select("id")
    .maybeSingle();
  if (insErr) {
    await admin.storage.from(DATASET_BUCKET).remove([path]).catch(() => {});
    throw new AssembleError(500, "graph_row_insert_failed", insErr.message);
  }

  return {
    ok: true,
    id: row?.id || id,
    evidence_hash: evidenceHash,
    event_count: keptCount,
    pre_gate_count: preGateCount,
    dataset_count: datasets.length,
    dropped: {
      NON_IN: audit.geoClass.dropped.NON_IN,
      UNKNOWN_GLOBAL: audit.geoClass.dropped.UNKNOWN_GLOBAL,
      pre_window: audit.dateWindow.droppedPreWindow,
    },
    blob_bytes: bytes.length,
  };
}
