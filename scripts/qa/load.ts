/* ============================================================================
   QA Harness · section loader (READ-ONLY)

   Reads the exact section_outputs.content jsonb the app renders. Two sources,
   in precedence order — both are the app's OWN data layer, never a re-synthesis:

     1. Supabase  (QA_SOURCE=supabase): a read-only SELECT against the
        `section_outputs` table — the same table api/cache.ts serves from. Picks
        the newest (evidence_hash, provider) pair that covers the whole template,
        mirroring scripts/export-share-snapshot.ts. Requires SUPABASE_URL +
        a service/anon key in the env; performs SELECT only, never writes.

     2. snapshot  (default): share/snapshot.<project>.json — the committed,
        credential-free serialization of those same rows, produced BY the data
        layer via export-share-snapshot.ts. This is what the read-only share
        deployment renders, so gating against it gates the real client artifact.

   Override the snapshot path with QA_SNAPSHOT=<file>.
   ============================================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Sections, SourceInfo, LoadedSection } from './registry';
import { SECTION_ORDER } from './registry';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..'); // scripts/qa -> repo root

export interface LoadResult { sections: Sections; source: SourceInfo; }

/** Resolve the snapshot file across the likely working directories. */
function resolveSnapshot(projectId: string): string {
  const candidates = [
    process.env.QA_SNAPSHOT,
    resolve(process.cwd(), `share/snapshot.${projectId}.json`),
    resolve(REPO_ROOT, `share/snapshot.${projectId}.json`),
  ].filter(Boolean) as string[];
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) {
    throw new Error(
      `[qa] no snapshot found for project '${projectId}'. Looked in:\n  ${candidates.join('\n  ')}\n` +
      `Set QA_SNAPSHOT=<path> or run scripts/export-share-snapshot.ts first.`,
    );
  }
  return hit;
}

function loadFromSnapshot(projectId: string): LoadResult {
  const file = resolveSnapshot(projectId);
  const snap = JSON.parse(readFileSync(file, 'utf8'));
  const raw = snap?.sections;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`[qa] snapshot ${file} has no 'sections' map (schema ${snap?.schemaVersion ?? '?'}).`);
  }
  const sections: Sections = {};
  for (const [id, v] of Object.entries<any>(raw)) {
    sections[id] = { id, status: v?.status ?? 'OK', content: v?.content ?? {} };
  }
  return {
    sections,
    source: {
      kind: 'snapshot',
      ref: file,
      projectId,
      evidenceHash: snap?.evidenceGraph?.evidence_hash,
    },
  };
}

/** Read-only pull straight from section_outputs. Never writes. */
async function loadFromSupabase(projectId: string): Promise<LoadResult> {
  const url = process.env.SUPABASE_URL || process.env.QA_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.QA_SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('[qa] QA_SOURCE=supabase needs SUPABASE_URL and a SUPABASE_* key in the env.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Pull every row for the project; we group + pick client-side so we never
  // need to know the current hash up front.
  const { data, error } = await db
    .from('section_outputs')
    .select('section_id, evidence_hash, provider, status, content')
    .eq('project_id', projectId);
  if (error) throw new Error(`[qa] section_outputs read failed: ${error.message}`);
  if (!data?.length) throw new Error(`[qa] section_outputs empty for project '${projectId}'.`);

  const expected = new Set(SECTION_ORDER);
  // Group by (evidence_hash|provider); choose the group with the most covered,
  // non-PENDING sections — the set the app would actually serve.
  const groups = new Map<string, any[]>();
  for (const r of data) {
    const gk = `${r.evidence_hash}||${r.provider}`;
    (groups.get(gk) ?? groups.set(gk, []).get(gk)!).push(r);
  }
  let best: { key: string; rows: any[]; covered: number } | null = null;
  for (const [gk, rows] of groups) {
    const covered = rows.filter((r) => expected.has(r.section_id) && r.content && r.status !== 'PENDING').length;
    if (!best || covered > best.covered) best = { key: gk, rows, covered };
  }
  if (!best) throw new Error('[qa] no usable section_outputs group.');
  const [evidenceHash, provider] = best.key.split('||');

  const sections: Sections = {};
  for (const r of best.rows) {
    if (!expected.has(r.section_id)) continue;
    sections[r.section_id] = { id: r.section_id, status: r.status ?? 'OK', content: r.content ?? {} } as LoadedSection;
  }
  return { sections, source: { kind: 'supabase', ref: url, projectId, evidenceHash, provider } };
}

export async function loadSections(projectId: string): Promise<LoadResult> {
  if ((process.env.QA_SOURCE || '').toLowerCase() === 'supabase') {
    return loadFromSupabase(projectId);
  }
  return loadFromSnapshot(projectId);
}
