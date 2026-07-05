/* ============================================================================
   graphAssembly — rebuild the evidence graph FROM EXISTING REGISTRATIONS.
   ----------------------------------------------------------------------------
   The datasets table + Storage already hold every uploaded file's raw rows
   (30 files / 60,744 records after the 05-Jul rebuild). When the persisted
   evidence graph is missing — persistence lost, table wiped, fresh session —
   this module reassembles it without a single re-upload:

     list registrations → signed-URL download of each rows blob →
     reconstruct the IngestRequestV1 exactly as Data Studio builds it
     (auto-mapping per source_tag) → run the project's deterministic
     ingestion → return the graph (caller persists it).

   Mappings are the deterministic generateAutoMapping output for each file's
   source_tag + columns — the same defaults Data Studio seeds its MappingModal
   with, reproducible from the registry alone.
   ============================================================================ */

import { EvidenceGraph, IngestRequestV1, ProjectId, UploadedFile, FileSourceTag } from '../types';
import { generateAutoMapping } from './mappingService';
import { ingestRawData } from './gemini';
import { apiGet } from '../lib/api';

interface DatasetRow {
  id: string;
  name?: string;
  source_tag?: string;
  columns?: string[];
  row_count?: number;
  uploaded_at?: string;
}

/** Union of keys across a sample of rows — row 0 alone under-reports because
 *  XLSX parsing omits keys for blank cells. */
const unionColumns = (rows: any[]): string[] => {
  const cols = new Set<string>();
  for (const r of rows.slice(0, 50)) {
    if (r && typeof r === 'object') for (const k of Object.keys(r)) cols.add(k);
  }
  return [...cols];
};

/** Download one dataset's rows blob via a signed URL. Throws on any failure. */
const fetchDatasetRows = async (d: DatasetRow): Promise<any[]> => {
  const dl = await apiGet('/api/datasets', { id: d.id, download: '1' });
  if (!dl?.url) throw new Error('no signed URL (API deploy pending?)');
  const resp = await fetch(dl.url);
  if (!resp.ok) throw new Error(`blob fetch ${resp.status}`);
  const rows = await resp.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty blob');
  return rows;
};

/** Assemble the project's evidence graph from its registered datasets.
 *  Returns null when the registry is empty or nothing could be fetched.
 *  The returned graph carries __datasetIds so the persist can link the row. */
export async function assembleGraphFromRegistry(
  projectId: ProjectId,
  log?: (msg: string) => void
): Promise<EvidenceGraph | null> {
  let datasets: DatasetRow[] = [];
  try {
    const r = await apiGet('/api/datasets', { project_id: projectId });
    datasets = Array.isArray(r?.datasets) ? r.datasets : [];
  } catch {
    return null;
  }
  if (datasets.length === 0) return null;

  // UPLOAD ORDER, not registry order: the list endpoint returns uploaded_at
  // DESC, but text-dedup in the deterministic ingestions is first-wins — the
  // rebuild must iterate files in the same order Data Studio ingested them or
  // cross-file duplicate texts flip their attribution. Stable id tiebreak.
  datasets.sort((a, b) =>
    (a.uploaded_at || '').localeCompare(b.uploaded_at || '') || a.id.localeCompare(b.id)
  );

  log?.(`Assembling evidence graph from ${datasets.length} registered datasets — no re-upload.`);

  const inputs: IngestRequestV1['inputs'] = [];
  const usedIds: string[] = [];
  for (const d of datasets) {
    let rows: any[] | null = null;
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2 && !rows; attempt++) {
      try {
        rows = await fetchDatasetRows(d);
      } catch (err: any) {
        lastErr = err;
        if (attempt === 1) log?.(`retrying ${d.name || d.id}: ${err?.message || err}`);
      }
    }
    if (!rows) { log?.(`FAILED ${d.name || d.id}: ${lastErr?.message || lastErr}`); continue; }

    // Reconstruct the shape generateAutoMapping reads (sourceTag + columns).
    // rawContent only feeds coverage sampling (first 100 rows) — don't hold
    // a second full copy of 60k rows in memory.
    const pseudoFile: UploadedFile = {
      id: d.id,
      name: d.name || d.id,
      size: 0,
      type: 'application/json',
      sourceTag: (d.source_tag || 'other') as FileSourceTag,
      uploadedAt: d.uploaded_at || new Date().toISOString(),
      parsedPreview: {
        columns: (d.columns && d.columns.length ? d.columns : unionColumns(rows)),
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
    usedIds.push(d.id);
    log?.(`fetched ${pseudoFile.name}: ${rows.length} rows (${pseudoFile.sourceTag})`);
  }

  // ALL OR NOTHING: a partial corpus persisted under a fresh hash would become
  // THE canonical evidence with no self-heal path (the rebuild only fires when
  // no graph exists). Fail loudly instead; a re-click retries transient errors.
  if (inputs.length !== datasets.length) {
    log?.(`ABORT: only ${inputs.length}/${datasets.length} datasets fetched — refusing to canonicalise a partial corpus.`);
    return null;
  }

  const request: IngestRequestV1 = {
    schemaVersion: 'ingest_request_v1',
    orgId: 'rspl',
    projectId,
    runMeta: { trigger: 'registry_rebuild', requestedAtISO: new Date().toISOString() },
    inputs,
  };

  const graph = await ingestRawData(request);
  if (!graph) return null;
  (graph as any).__datasetIds = usedIds;
  const total = graph.events?.length ?? 0;
  log?.(`Graph assembled: ${total.toLocaleString('en-US')} deduplicated events from ${inputs.length}/${datasets.length} datasets.`);
  return graph;
}
