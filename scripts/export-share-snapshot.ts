/* ============================================================================
   One-time dev-machine export → share/snapshot.baby-diapers.json

   Builds the committed, credential-free snapshot for the read-only share
   deployment (VITE_SHARE_MODE=1) by reading the deployed app's OWN public
   read-only API routes — the exact surfaces the browser already calls:

     GET /api/evidence?project_id&stats=1  → event_count, evidence_hash,
                                             generated_at, aggregations
     GET /api/evidence?project_id          → meta.dataset_ids (events_url ignored)
     GET /api/datasets?project_id          → registry metadata (storage_path stripped)
     GET /api/cache?…&provider=…           → per-section status + content

   No Supabase credential is used or needed, the raw events blob is never
   downloaded, and every storage_path is stripped. The latest evidence row
   must match the expected hash prefix (e0ad3ca0 by default) or the export
   aborts — a snapshot is only ever cut from the verified corpus.

   Usage (from the repo root):  npx tsx scripts/export-share-snapshot.ts
   Override the source app with SHARE_EXPORT_BASE, the hash gate with
   SHARE_HASH_PREFIX. Vercel never runs this script.
   ============================================================================ */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BABY_DIAPERS_TEMPLATE } from '../templates/baby_diapers_template';

const PROJECT_ID = 'baby-diapers';
const HASH_PREFIX = process.env.SHARE_HASH_PREFIX || 'e0ad3ca0';
const BASE = (process.env.SHARE_EXPORT_BASE || 'https://rspl-listening-warehouse.vercel.app').replace(/\/$/, '');
const OUT_PATH = resolve(process.cwd(), 'share/snapshot.baby-diapers.json');
// The engine whose cached sections the report serves in production.
const PROVIDERS = ['anthropic', 'gemini', 'openai', 'seed'];

async function getJson(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`GET ${path}?${qs} → HTTP ${res.status}`);
  return res.json();
}

async function main(): Promise<void> {
  // 1 — evidence-graph metadata. stats mode carries no storage_path and no
  // events; full mode is read ONLY for meta.dataset_ids (events_url ignored).
  const stats = (await getJson('/api/evidence', { project_id: PROJECT_ID, stats: '1' }))?.stats;
  if (!stats || !stats.evidence_hash || !(stats.event_count > 0)) {
    console.error('[export] /api/evidence?stats=1 returned no usable graph row.');
    process.exit(1);
  }
  if (!String(stats.evidence_hash).startsWith(HASH_PREFIX)) {
    console.error(`[export] latest evidence row hash ${stats.evidence_hash} does not start with ${HASH_PREFIX} — refusing to snapshot an unexpected corpus.`);
    process.exit(1);
  }
  const meta = (await getJson('/api/evidence', { project_id: PROJECT_ID }))?.meta;
  const datasetIds: string[] = Array.isArray(meta?.dataset_ids) ? meta.dataset_ids : [];

  // 2 — section outputs under exactly that hash: the snapshot takes the one
  // provider that covers the full template, never a mixed or partial set.
  const expected: string[] = BABY_DIAPERS_TEMPLATE.sections.map(s => s.sectionId);
  let sections: Record<string, { status: string; content: any }> | null = null;
  let chosenProvider = '';
  for (const provider of PROVIDERS) {
    const rows = await Promise.all(expected.map(id =>
      getJson('/api/cache', {
        project_id: PROJECT_ID, section_id: id,
        evidence_hash: String(stats.evidence_hash), provider,
      })
    ));
    const usable = rows.map(r => r?.row).filter(r => r && r.content && r.status !== 'PENDING');
    console.log(`[export] provider ${provider}: ${usable.length}/${expected.length} sections cached`);
    if (usable.length === expected.length) {
      sections = {};
      rows.forEach((r, i) => { sections![expected[i]] = { status: r.row.status, content: r.row.content }; });
      chosenProvider = provider;
      break;
    }
  }
  if (!sections) {
    console.error(`[export] no provider covers all ${expected.length} sections under hash ${stats.evidence_hash} — refusing a partial snapshot.`);
    process.exit(1);
  }

  // 3 — dataset registry metadata (feeds the §20 ledger). storage_path, ids
  // and column lists are stripped: name, tag, row count, upload date are all
  // the panel reads.
  const reg = await getJson('/api/datasets', { project_id: PROJECT_ID });
  const datasets = (Array.isArray(reg?.datasets) ? reg.datasets : []).map((d: any) => ({
    name: d.name, source_tag: d.source_tag, row_count: d.row_count, uploaded_at: d.uploaded_at,
  }));
  if (datasets.length === 0) {
    console.error('[export] dataset registry read returned 0 rows — §20 would render an empty ledger; aborting.');
    process.exit(1);
  }

  const rowSum = datasets.reduce((s: number, d: any) => s + (d.row_count || 0), 0);
  console.log(`[export] graph ${stats.evidence_hash} · ${stats.event_count} events · ${datasetIds.length} dataset links`);
  console.log(`[export] registry ${datasets.length} files · ${rowSum} rows (lossless ⇒ equals event_count)`);
  console.log(`[export] sections from provider '${chosenProvider}': ${expected.length}/${expected.length}`);

  const snapshot = {
    schemaVersion: 'share_snapshot_v1',
    exportedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    evidenceGraph: {
      project_id: PROJECT_ID,
      evidence_hash: String(stats.evidence_hash),
      event_count: stats.event_count as number,
      dataset_ids: datasetIds,
      aggregations: stats.aggregations || {},
      generated_at: String(stats.generated_at || ''),
    },
    datasets,
    sections,
  };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 1) + '\n');
  console.log(`[export] wrote ${OUT_PATH}`);
}

void main().catch((err) => { console.error('[export] failed:', err); process.exit(1); });
