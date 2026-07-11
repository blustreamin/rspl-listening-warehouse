/* ============================================================================
   QA Harness · text-walking + parsing helpers shared across checks.
   ============================================================================ */

import { isInternalKey } from './registry';

export interface StringHit { path: string; key: string; value: string; }

/** Depth-first collect every string VALUE in a content tree, skipping
 *  pipeline-internal keys (prov, _*) so checks only see client-facing copy. */
export function walkStrings(node: any, path = '', key = '', out: StringHit[] = []): StringHit[] {
  if (typeof node === 'string') { out.push({ path, key, value: node }); return out; }
  if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, key, out)); return out; }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (isInternalKey(k)) continue;
      walkStrings(node[k], path ? `${path}.${k}` : k, k, out);
    }
  }
  return out;
}

/** Every object encountered during a walk, with its path — for structure checks. */
export function walkObjects(node: any, path = '', out: Array<{ path: string; obj: any }> = []): Array<{ path: string; obj: any }> {
  if (Array.isArray(node)) { node.forEach((v, i) => walkObjects(v, `${path}[${i}]`, out)); return out; }
  if (node && typeof node === 'object') {
    out.push({ path, obj: node });
    for (const k of Object.keys(node)) {
      if (isInternalKey(k)) continue;
      walkObjects(node[k], path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

/** Percent tokens found in free text: "40%", "26 %", "~28%", "under 1%". */
export function extractPercents(s: string): number[] {
  const out: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s?%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(parseFloat(m[1]));
  return out;
}

export const hasPercent = (s: string): boolean => /\d+(?:\.\d+)?\s?%/.test(s);

/** All integer counts in parenthesised or bare form, e.g. "Maharashtra (564)". */
export function extractParenCounts(s: string): number[] {
  const out: number[] = [];
  const re = /\(([\d,]{2,})\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are',
  'as', 'at', 'by', 'with', 'that', 'this', 'it', 'its', 'their', 'they', 'not', 'but', 'be',
  'from', 'into', 'than', 'then', 'so', 'no', 'more', 'most', 'across', 'per']);

/** Normalise a sentence to lowercase alnum word tokens (stopwords dropped). */
export function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
}

/** Word-level k-shingles as a Set of joined strings. */
export function shingles(toks: string[], k = 3): Set<string> {
  const set = new Set<string>();
  if (toks.length < k) { if (toks.length) set.add(toks.join(' ')); return set; }
  for (let i = 0; i + k <= toks.length; i++) set.add(toks.slice(i, i + k).join(' '));
  return set;
}

/** Containment overlap |A∩B| / min(|A|,|B|). */
export function containment(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (big.has(x)) inter++;
  return inter / small.size;
}

export const ascii = (s: string): boolean => /^[\x00-\x7F]*$/.test(s);
export const clip = (s: string, n = 140): string => (s.length > n ? s.slice(0, n - 1) + '…' : s).replace(/\s+/g, ' ').trim();
