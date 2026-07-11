/* ============================================================================
   QA Harness · content checks (register N-61)

   Each check is a pure function (Sections) -> Finding[]. Findings are keyed to
   register IDs and carry concrete evidence. Checks read section_outputs.content
   only — never re-synthesise — and skip pipeline-internal keys (see registry).

   Verdict convention:
     PASS  rule satisfied
     WARN  cannot be confirmed at the data layer / borderline (does NOT gate)
     FAIL  rule violated (gates the export — non-zero exit)
   ============================================================================ */

import type { Sections, Finding, LoadedSection } from './registry';
import {
  SECTION_ORDER, BANNED_STRINGS, CORPUS_VOICES, ROMANIZED_INDIC,
  S02, S15, S18, S20, isInternalKey,
} from './registry';
import {
  walkStrings, walkObjects, extractPercents, hasPercent, extractParenCounts,
  tokens, shingles, containment, clip,
} from './text';

// Letters from Indic (and other non-Latin) scripts. Deliberately EXCLUDES
// Latin-1/typographic Unicode (smart quotes ’ … em-dashes, accents, emoji) so
// an English quote with fancy punctuation is not mistaken for another language.
const NON_LATIN_SCRIPT = /[ऀ-෿฀-࿿ᄀ-ᇿ぀-ヿ一-鿿가-힯]/;

const ok = (register_id: string, section: string, evidence = ''): Finding => ({ register_id, section, status: 'PASS', evidence });
const orderedSections = (s: Sections): LoadedSection[] =>
  SECTION_ORDER.map((id) => s[id]).filter(Boolean) as LoadedSection[];

// ── N-02 — ≤5 verbatims per slide ───────────────────────────────────────────
// A "slide" is a sibling group of cards rendered together. Every card carries at
// most one verbatim, so the crowding risk is a single card-array whose members
// each quote — that group would stack >5 quotes on one slide. We take the max
// verbatim-bearing count over any single array in the section as the worst slide.
export function n02_verbatimsPerSlide(secs: Sections): Finding[] {
  const LIMIT = 5;
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    let worstPath = '', worstN = 0;
    const scan = (node: any, path: string) => {
      if (Array.isArray(node)) {
        const withV = node.filter((el) => el && typeof el === 'object' && Array.isArray(el.verbatims) && el.verbatims.length > 0).length;
        if (withV > worstN) { worstN = withV; worstPath = path; }
        node.forEach((el, i) => scan(el, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) if (!isInternalKey(k)) scan(node[k], path ? `${path}.${k}` : k);
      }
    };
    scan(sec.content, '');
    out.push(worstN > LIMIT
      ? { register_id: 'N-02', section: sec.id, status: 'FAIL', evidence: `${worstN} verbatims stack in one group (${worstPath}) — exceeds ${LIMIT}/slide` }
      : ok('N-02', sec.id, `max ${worstN} verbatims in any single group`));
  }
  return out;
}

// ── N-14 — verbatims ASCII-English or "(translated)" ─────────────────────────
// Scope: verbatim quotes + consumer-language term/vocabulary examples. A quote
// with non-ASCII or a romanized-Indic hit (>=2 distinct tokens or >=15% rate)
// and no "(translated)" marker is flagged.
export function n14_translation(secs: Sections): Finding[] {
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    const quotes: string[] = [];
    // verbatim quotes
    for (const { obj } of walkObjects(sec.content)) {
      if (Array.isArray(obj.verbatims)) for (const v of obj.verbatims) if (v?.quote) quotes.push(String(v.quote));
    }
    // consumer-language example strings (vocabulary terms, regional vocab items,
    // signal terms) — these are literal consumer utterances too.
    if (sec.id === 'consumer_vocabulary' || sec.id === 'regional_differences' || sec.id === 'shopping_search_terms') {
      for (const h of walkStrings(sec.content)) {
        if (/term|item|signal|phrase|search/i.test(h.key)) quotes.push(h.value);
      }
    }
    const offenders: string[] = [];
    for (const q of quotes) {
      if (/\(translated\)/i.test(q)) continue;
      const toks = tokens(q);
      const romanizedHits = new Set(toks.filter((t) => ROMANIZED_INDIC.has(t)));
      const rate = toks.length ? romanizedHits.size / toks.length : 0;
      const nonLatin = NON_LATIN_SCRIPT.test(q); // real foreign script, not punctuation/emoji
      if (nonLatin || romanizedHits.size >= 2 || rate >= 0.15) {
        offenders.push(nonLatin
          ? `non-Latin script: "${clip(q, 80)}"`
          : `romanized [${[...romanizedHits].slice(0, 5).join(',')}]: "${clip(q, 80)}"`);
      }
    }
    out.push(offenders.length
      ? { register_id: 'N-14', section: sec.id, status: 'FAIL', evidence: `${offenders.length} untranslated non-English verbatim(s); e.g. ${offenders[0]}` }
      : ok('N-14', sec.id, `${quotes.length} verbatim(s) ASCII-English or translated`));
  }
  return out;
}

// ── N-17 — %-ranked lists non-increasing (ties allowed) ──────────────────────
// Structured share fields (share_pct/pct/share/percent) and persona pool %s.
// A later value that is STRICTLY GREATER than an earlier one violates the rank;
// equal consecutive values (e.g. trailing rounding-zeros) are a PASS.
export function n17_descending(secs: Sections): Finding[] {
  const PCT_FIELDS = ['share_pct', 'pct', 'percent', 'share', 'sov_pct'];
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    const lists: Array<{ path: string; label: string; vals: number[] }> = [];
    // structured %-ranked arrays
    const scan = (node: any, path: string) => {
      if (Array.isArray(node)) {
        const vals = node.map((el) => {
          if (!el || typeof el !== 'object') return NaN;
          for (const f of PCT_FIELDS) if (typeof el[f] === 'number') return el[f];
          return NaN;
        });
        if (vals.length >= 3 && vals.every((v) => Number.isFinite(v))) {
          lists.push({ path, label: 'share%', vals });
        }
        node.forEach((el, i) => scan(el, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) if (!isInternalKey(k)) scan(node[k], path ? `${path}.${k}` : k);
      }
    };
    scan(sec.content, '');
    // persona pool_estimate ("~28% of corpus voices") as an ordered %-list
    if (Array.isArray(sec.content?.personas)) {
      const vals = sec.content.personas.map((p: any) => extractPercents(String(p?.pool_estimate ?? ''))[0]);
      if (vals.length >= 3 && vals.every((v: number) => Number.isFinite(v))) lists.push({ path: 'personas[].pool_estimate', label: 'pool%', vals });
    }

    if (!lists.length) { out.push(ok('N-17', sec.id, 'no %-ranked list')); continue; }
    const bad: string[] = [];
    for (const l of lists) {
      for (let i = 1; i < l.vals.length; i++) {
        if (l.vals[i] > l.vals[i - 1]) { bad.push(`${l.path}: …${l.vals[i - 1]} then ${l.vals[i]} (increases — not non-increasing)`); break; }
      }
    }
    out.push(bad.length
      ? { register_id: 'N-17', section: sec.id, status: 'FAIL', evidence: bad.join(' | ') }
      : ok('N-17', sec.id, `${lists.length} %-ranked list(s) non-increasing (ties allowed)`));
  }
  return out;
}

// ── N-13 — coverage field present and ≥75 (75–80 warn, <75 fail) ─────────────
// Looks for a numeric coverage/evidence field. data_foundation.coverage is a
// descriptive array (methodology), NOT a score, so it does not satisfy this.
export function n13_coverage(secs: Sections): Finding[] {
  const CANDIDATES = ['coverage', 'coverage_pct', 'coveragePct', 'evidencePct', 'evidence_pct', 'evidence_coverage', 'coverage_score'];
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    let found: number | null = null; let where = '';
    for (const { path, obj } of walkObjects(sec.content)) {
      for (const c of CANDIDATES) {
        const v = obj[c];
        const n = typeof v === 'number' ? v : (typeof v === 'string' ? extractPercents(v)[0] : NaN);
        if (Number.isFinite(n)) { found = n as number; where = path ? `${path}.${c}` : c; break; }
      }
      if (found !== null) break;
    }
    if (found === null) {
      out.push({ register_id: 'N-13', section: sec.id, status: 'FAIL', evidence: 'no numeric coverage/evidencePct field in stored content' });
    } else if (found < 75) {
      out.push({ register_id: 'N-13', section: sec.id, status: 'FAIL', evidence: `coverage ${found} < 75 (${where})` });
    } else if (found < 80) {
      out.push({ register_id: 'N-13', section: sec.id, status: 'WARN', evidence: `coverage ${found} in warn band 75–80 (${where})` });
    } else {
      out.push(ok('N-13', sec.id, `coverage ${found} (${where})`));
    }
  }
  return out;
}

// ── N-09 / N-07 — banned strings absent ──────────────────────────────────────
export function n0907_banned(secs: Sections): Finding[] {
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    const hits: Record<string, { count: number; sampleKey: string; sample: string }> = {};
    for (const h of walkStrings(sec.content)) {
      const low = h.value.toLowerCase();
      for (const b of BANNED_STRINGS) {
        if (low.includes(b)) {
          const rec = hits[b] || (hits[b] = { count: 0, sampleKey: h.key, sample: h.value });
          rec.count++;
        }
      }
    }
    const banned = Object.keys(hits);
    out.push(banned.length
      ? {
          register_id: 'N-09', section: sec.id, status: 'FAIL',
          evidence: banned.map((b) => `"${b}"×${hits[b].count} (e.g. ${hits[b].sampleKey}: "${clip(hits[b].sample, 70)}")`).join(' · '),
        }
      : ok('N-09', sec.id, 'no banned strings'));
  }
  return out;
}

// ── N-56 — no "% of corpus voices" anywhere ──────────────────────────────────
export function n56_corpusVoices(secs: Sections): Finding[] {
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    const hits = walkStrings(sec.content).filter((h) => h.value.toLowerCase().includes(CORPUS_VOICES));
    out.push(hits.length
      ? { register_id: 'N-56', section: sec.id, status: 'FAIL', evidence: `"${CORPUS_VOICES}"×${hits.length} (e.g. ${hits[0].key}: "${clip(hits[0].value, 60)}")` }
      : ok('N-56', sec.id, 'clean'));
  }
  return out;
}

// ── N-15 — S02 role %s sum to 100 ±1 ─────────────────────────────────────────
export function n15_roleSum(secs: Sections): Finding[] {
  const sec = secs[S02];
  if (!sec) return [{ register_id: 'N-15', section: S02, status: 'FAIL', evidence: `${S02} missing` }];
  const roles: any[] = Array.isArray(sec.content?.roles) ? sec.content.roles : [];
  if (!roles.length) return [{ register_id: 'N-15', section: S02, status: 'FAIL', evidence: 'no roles[] present' }];
  const PCT_FIELDS = ['share_pct', 'pct', 'percent', 'share', 'role_share'];
  const pcts: number[] = [];
  for (const r of roles) {
    let p: number | undefined;
    for (const f of PCT_FIELDS) if (typeof r?.[f] === 'number') { p = r[f]; break; }
    if (p === undefined) p = extractPercents(String(r?.role_summary ?? '') + ' ' + String(r?.member ?? ''))[0];
    if (Number.isFinite(p as number)) pcts.push(p as number);
  }
  if (pcts.length < roles.length) {
    return [{ register_id: 'N-15', section: S02, status: 'WARN',
      evidence: `roles carry counts (data_points) only — ${pcts.length}/${roles.length} expose a %; sum-to-100 unverifiable at the data layer` }];
  }
  const sum = pcts.reduce((a, b) => a + b, 0);
  return [Math.abs(sum - 100) <= 1
    ? ok('N-15', S02, `role %s sum to ${sum}`)
    : { register_id: 'N-15', section: S02, status: 'FAIL', evidence: `role %s sum to ${sum} (±1 of 100 required): [${pcts.join(', ')}]` }];
}

// ── N-53 — S18 contains no finding <5% ───────────────────────────────────────
// Each search-term cluster's share = data_points / section total. Explicit %s
// in a cluster override the derived share.
export function n53_s18Findings(secs: Sections): Finding[] {
  const sec = secs[S18];
  if (!sec) return [{ register_id: 'N-53', section: S18, status: 'FAIL', evidence: `${S18} missing` }];
  const clusters: any[] = Array.isArray(sec.content?.clusters) ? sec.content.clusters : [];
  if (!clusters.length) return [{ register_id: 'N-53', section: S18, status: 'FAIL', evidence: 'no clusters[] present' }];
  const total = clusters.reduce((a, c) => a + (Number(c?.data_points) || 0), 0);
  const offenders: string[] = [];
  for (const c of clusters) {
    const explicit = extractPercents(String(c?.description ?? '') + ' ' + String(c?.share ?? ''))[0];
    const pct = Number.isFinite(explicit) ? explicit : (total > 0 ? (Number(c?.data_points) || 0) / total * 100 : NaN);
    if (Number.isFinite(pct) && pct < 5) offenders.push(`"${clip(String(c?.title ?? '?'), 44)}" = ${pct.toFixed(1)}%`);
  }
  return [offenders.length
    ? { register_id: 'N-53', section: S18, status: 'FAIL', evidence: `${offenders.length} finding(s) <5%: ${offenders.join(' · ')} (total ${total} data_points)` }
    : ok('N-53', S18, `all ${clusters.length} findings ≥5%`)];
}

// ── N-11 — footnote/basis present wherever a % renders ───────────────────────
// data_foundation IS the methodology/basis section, so it is exempt.
export function n11_basis(secs: Sections): Finding[] {
  const BASIS_FIELDS = /pool_note|pool_estimate|basis|footnote|source_note|data_source_note|methodology|\bnote\b|_verbatim_audit/i;
  const out: Finding[] = [];
  for (const sec of orderedSections(secs)) {
    if (sec.id === S20) { out.push(ok('N-11', sec.id, 'methodology section — exempt')); continue; }
    const pctStrings = walkStrings(sec.content).filter((h) => hasPercent(h.value));
    if (!pctStrings.length) { out.push(ok('N-11', sec.id, 'no % rendered')); continue; }
    // does the section carry any basis/footnote-bearing field anywhere?
    const hasBasis = [...walkObjects(sec.content), { path: '', obj: sec.content }]
      .some(({ obj }) => Object.keys(obj || {}).some((k) => BASIS_FIELDS.test(k)));
    out.push(hasBasis
      ? ok('N-11', sec.id, `${pctStrings.length} %-string(s) + basis field present`)
      : { register_id: 'N-11', section: sec.id, status: 'FAIL', evidence: `% renders (e.g. ${pctStrings[0].key}: "${clip(pctStrings[0].value, 50)}") but no basis/footnote field` });
  }
  return out;
}

// ── N-59 — S20 geo record total == S15 geo total ─────────────────────────────
export function n59_geoTotals(secs: Sections): Finding[] {
  const s15 = secs[S15]; const s20 = secs[S20];
  if (!s15 || !s20) return [{ register_id: 'N-59', section: `${S15}/${S20}`, status: 'FAIL', evidence: 'one or both geo sections missing' }];

  // S15: sum of per-region record counts (data_points / count / records).
  const regions: any[] = Array.isArray(s15.content?.regions) ? s15.content.regions : [];
  const regionCounts = regions.map((r) => Number(r?.data_points ?? r?.count ?? r?.records) || 0);
  const s15Total = regionCounts.reduce((a, b) => a + b, 0);

  // S20: parse state-level counts from the "Geographic tagging" coverage line.
  const coverage: any[] = Array.isArray(s20.content?.coverage) ? s20.content.coverage : [];
  const geoLine = coverage.find((c) => /geograph/i.test(String(c?.label ?? '')));
  const stateCounts = geoLine ? extractParenCounts(String(geoLine.detail ?? '')) : [];
  const s20Total = stateCounts.reduce((a, b) => a + b, 0);

  if (s15Total === 0 || s20Total === 0) {
    return [{ register_id: 'N-59', section: `${S15}↔${S20}`, status: 'FAIL',
      evidence: `could not extract comparable geo totals — S15=${s15Total} (regions ${regionCounts.length}), S20=${s20Total} (states ${stateCounts.length})` }];
  }
  const equal = s15Total === s20Total;
  return [equal
    ? ok('N-59', `${S15}↔${S20}`, `geo totals match at ${s15Total}`)
    : { register_id: 'N-59', section: `${S15}↔${S20}`, status: 'FAIL',
        evidence: `S15 geo total ${s15Total} (${regionCounts.join('+')}) ≠ S20 geo total ${s20Total} (${stateCounts.join('+')})` }];
}

// ── N-03 — cross-section repetition sweep ────────────────────────────────────
// Near-duplicate insight sentences across sections (3-shingle containment ≥0.7).
export function n03_repetition(secs: Sections): Finding[] {
  const INSIGHT_KEYS = /headline|what_it_means|role_summary|summary|description|insight|synthesis|takeaway|role_summary|meaning/i;
  type Sent = { sec: string; text: string; sh: Set<string> };
  const sents: Sent[] = [];
  for (const sec of orderedSections(secs)) {
    for (const h of walkStrings(sec.content)) {
      if (!INSIGHT_KEYS.test(h.key)) continue;
      const t = h.value.trim();
      if (t.length < 40) continue;
      const sh = shingles(tokens(t), 3);
      if (sh.size >= 4) sents.push({ sec: sec.id, text: t, sh });
    }
  }
  const THRESHOLD = 0.7;
  const seenPair = new Set<string>();
  const dupes: Array<{ a: Sent; b: Sent; ov: number }> = [];
  for (let i = 0; i < sents.length; i++) {
    for (let j = i + 1; j < sents.length; j++) {
      if (sents[i].sec === sents[j].sec) continue; // cross-section only
      const ov = containment(sents[i].sh, sents[j].sh);
      if (ov >= THRESHOLD) {
        const key = [sents[i].sec, sents[j].sec, clip(sents[i].text, 30)].join('|');
        if (seenPair.has(key)) continue; seenPair.add(key);
        dupes.push({ a: sents[i], b: sents[j], ov });
      }
    }
  }
  if (!dupes.length) return [ok('N-03', 'cross-section', `${sents.length} insight sentences, no near-duplicate ≥${THRESHOLD}`)];
  dupes.sort((x, y) => y.ov - x.ov);
  return dupes.slice(0, 20).map((d) => ({
    register_id: 'N-03', section: `${d.a.sec}↔${d.b.sec}`, status: 'FAIL' as const,
    evidence: `overlap ${d.ov.toFixed(2)}: "${clip(d.a.text, 60)}" ≈ "${clip(d.b.text, 60)}"`,
  }));
}

export const CONTENT_CHECKS: Array<(s: Sections) => Finding[]> = [
  n02_verbatimsPerSlide,
  n14_translation,
  n17_descending,
  n13_coverage,
  n0907_banned,
  n56_corpusVoices,
  n15_roleSum,
  n53_s18Findings,
  n11_basis,
  n59_geoTotals,
  n03_repetition,
];
