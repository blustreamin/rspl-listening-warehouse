/* ============================================================================
   QA Harness · entry point  ·  npm run qa:report

   The automated gate that runs AFTER every synthesis and BEFORE any export.
   Reads section_outputs.content (via the app's data layer — snapshot or a
   read-only Supabase SELECT), runs the register-N-61 checks, prints a pass/fail
   table keyed to register IDs, writes qa_report_<timestamp>.json, and exits
   NON-ZERO on any FAIL so it can gate exports in CI / a pre-export hook.

     Project:   QA_PROJECT=<id>            (default baby-diapers) or argv[2]
     Source:    QA_SOURCE=supabase         (default: committed snapshot)
     Snapshot:  QA_SNAPSHOT=<file>
     Output:    QA_OUT=<dir>               (default: cwd)
     N-18 gate: QA_N18_STRICT=1            (escalate the WARN to a FAIL)
   ============================================================================ */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Finding, Status } from './registry';
import { loadSections } from './load';
import { CONTENT_CHECKS } from './checks';
import { n18_marginBox } from './n18';

const C = process.stdout.isTTY
  ? { red: (s: string) => `\x1b[31m${s}\x1b[0m`, yel: (s: string) => `\x1b[33m${s}\x1b[0m`, grn: (s: string) => `\x1b[32m${s}\x1b[0m`, dim: (s: string) => `\x1b[2m${s}\x1b[0m`, bold: (s: string) => `\x1b[1m${s}\x1b[0m` }
  : { red: (s: string) => s, yel: (s: string) => s, grn: (s: string) => s, dim: (s: string) => s, bold: (s: string) => s };

const paint = (st: Status): string => (st === 'FAIL' ? C.red('FAIL') : st === 'WARN' ? C.yel('WARN') : C.grn('PASS'));

// register id → short human title, for the console
const TITLES: Record<string, string> = {
  'N-02': '≤5 verbatims/slide', 'N-03': 'cross-section repetition', 'N-09': 'banned strings',
  'N-11': 'basis where % renders', 'N-13': 'coverage ≥75', 'N-14': 'verbatims translated/ASCII',
  'N-15': 'S02 role %s sum 100', 'N-17': '%-lists non-increasing', 'N-18': 'margin-box PDF orientation',
  'N-53': 'S18 no finding <5%', 'N-56': 'no "% of corpus voices"', 'N-59': 'S20 geo == S15 geo',
};
const registerRank = (id: string): number => parseInt(id.replace(/[^0-9]/g, ''), 10) || 0;

function table(findings: Finding[]): void {
  const rows = findings.map((f) => [f.register_id, f.section, f.status as string, f.evidence]);
  const only = (st: string) => rows.filter((r) => r[2] === st);
  const printRows = [...only('FAIL'), ...only('WARN'), ...only('PASS')];

  const wReg = Math.max(8, ...printRows.map((r) => r[0].length));
  const wSec = Math.min(30, Math.max(10, ...printRows.map((r) => r[1].length)));
  const wSt = 4;
  const evW = Math.max(20, (process.stdout.columns || 120) - wReg - wSec - wSt - 10);

  const line = (a: string, b: string, c: string, d: string) =>
    `${a.padEnd(wReg)}  ${b.padEnd(wSec).slice(0, wSec)}  ${c.padEnd(wSt)}  ${d}`;
  console.log(C.bold(line('REGISTER', 'SECTION', 'ST', 'EVIDENCE')));
  console.log(C.dim('─'.repeat(Math.min(process.stdout.columns || 120, wReg + wSec + wSt + evW + 10))));
  for (const r of printRows) {
    const ev = r[3].length > evW ? r[3].slice(0, evW - 1) + '…' : r[3];
    const rowStr = line(r[0], r[1], r[2], ev);
    console.log(r[2] === 'FAIL' ? C.red(rowStr) : r[2] === 'WARN' ? C.yel(rowStr) : C.dim(rowStr));
  }
}

async function main(): Promise<void> {
  const projectId = process.env.QA_PROJECT || process.argv[2] || 'baby-diapers';
  const startedAt = new Date();

  let sections; let source;
  try {
    ({ sections, source } = await loadSections(projectId));
  } catch (err: any) {
    console.error(C.red(`[qa] load failed: ${err?.message || err}`));
    process.exit(2);
  }

  const loaded = Object.keys(sections).length;
  console.log(C.bold(`\nRSPL Warehouse — QA Gate (register N-61)`));
  console.log(`project ${projectId} · source ${source.kind} (${source.ref})` +
    (source.evidenceHash ? ` · hash ${String(source.evidenceHash).slice(0, 12)}` : '') +
    (source.provider ? ` · provider ${source.provider}` : '') +
    ` · ${loaded} sections\n`);

  const findings: Finding[] = [];
  for (const check of CONTENT_CHECKS) {
    try { findings.push(...check(sections)); }
    catch (err: any) { findings.push({ register_id: '(harness)', section: check.name, status: 'FAIL', evidence: `check threw: ${err?.message || err}` }); }
  }
  try { findings.push(...n18_marginBox()); }
  catch (err: any) { findings.push({ register_id: 'N-18', section: 'babycare_needs', status: 'FAIL', evidence: `check threw: ${err?.message || err}` }); }

  findings.sort((a, b) => (registerRank(a.register_id) - registerRank(b.register_id)) || a.section.localeCompare(b.section));

  table(findings);

  // per-register summary
  const byReg = new Map<string, { pass: number; warn: number; fail: number }>();
  for (const f of findings) {
    const r = byReg.get(f.register_id) || byReg.set(f.register_id, { pass: 0, warn: 0, fail: 0 }).get(f.register_id)!;
    r[f.status.toLowerCase() as 'pass' | 'warn' | 'fail']++;
  }
  console.log(C.dim('\n─ per-register roll-up ─'));
  for (const id of [...byReg.keys()].sort((a, b) => registerRank(a) - registerRank(b))) {
    const r = byReg.get(id)!;
    const verdict = r.fail ? C.red('FAIL') : r.warn ? C.yel('WARN') : C.grn('PASS');
    console.log(`  ${id.padEnd(7)} ${verdict}  ${C.dim(TITLES[id] || '')}  ${C.red(String(r.fail) + 'F')} ${C.yel(String(r.warn) + 'W')} ${C.grn(String(r.pass) + 'P')}`);
  }

  const fails = findings.filter((f) => f.status === 'FAIL').length;
  const warns = findings.filter((f) => f.status === 'WARN').length;
  const passes = findings.filter((f) => f.status === 'PASS').length;
  const failingRegisters = [...byReg.entries()].filter(([, r]) => r.fail).map(([id]) => id).sort((a, b) => registerRank(a) - registerRank(b));

  // JSON artifact
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const outDir = process.env.QA_OUT ? resolve(process.env.QA_OUT) : process.cwd();
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `qa_report_${stamp}.json`);
  const artifact = {
    schema: 'qa_report_v1',
    register: 'N-61',
    project: projectId,
    generatedAt: startedAt.toISOString(),
    source: { kind: source.kind, ref: source.ref, evidenceHash: source.evidenceHash, provider: source.provider },
    sectionsLoaded: loaded,
    summary: { fail: fails, warn: warns, pass: passes, gate: fails ? 'BLOCK' : 'ALLOW', failingRegisters },
    findings: findings.map((f) => ({ register_id: f.register_id, section: f.section, status: f.status, evidence: f.evidence })),
  };
  writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n');

  console.log(`\n${C.bold('SUMMARY')}  ${C.red(fails + ' FAIL')} · ${C.yel(warns + ' WARN')} · ${C.grn(passes + ' PASS')}`);
  console.log(`gate: ${fails ? C.red('BLOCK EXPORT') : C.grn('allow export')}` + (fails ? `  (${failingRegisters.join(', ')})` : ''));
  console.log(C.dim(`artifact: ${outPath}\n`));

  process.exit(fails ? 1 : 0);
}

void main().catch((err) => { console.error(C.red(`[qa] fatal: ${err?.stack || err}`)); process.exit(2); });
