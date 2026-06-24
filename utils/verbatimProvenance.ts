// ============================================================================
//  VERBATIM PROVENANCE — grounds every generated quote in the real corpus.
//
//  The synthesis model is GIVEN real evidence and told to draw verbatims from
//  it, but nothing forces it to. This module verifies, after the fact, whether
//  each quote the model returned can actually be traced to an ingested record.
//
//  Classification (per quote):
//    'corpus'     — provably matches a real ingested event (a distinctive word
//                   run from the quote appears in real data)
//    'curated'    — matches the hand-written social bank (intentional, silent)
//    'unverified' — matches neither → likely model-fabricated → flagged + logged
//
//  Matching is fuzzy by design: the model lightly edits/truncates source text,
//  so we look for any surviving n-gram (5-word shingle) shared with the corpus.
// ============================================================================

import type { EvidenceEventV1 } from '../types';

export type Provenance = 'corpus' | 'curated' | 'unverified';

export interface VerbatimAudit {
  total: number;
  corpus: number;
  curated: number;
  unverified: number;
  unverified_samples: Array<{ quote: string; source?: string; consumer?: string }>;
}

// Normalize text for matching: lowercase, drop punctuation, collapse whitespace.
const norm = (s: string): string =>
  (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const SHINGLE_N = 5;

const shingles = (text: string, n = SHINGLE_N): string[] => {
  const w = norm(text).split(' ').filter(Boolean);
  if (w.length === 0) return [];
  if (w.length < n) return [w.join(' ')];
  const out: string[] = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  return out;
};

/**
 * Build a fast, reusable matcher over a body of source texts. The texts are
 * joined into one normalized blob (separated so n-grams can't bridge two
 * records); membership is a native substring test, which is fast even at ~35k
 * records / a few MB.
 */
export function buildCorpusMatcher(texts: string[]) {
  const blob = ' ||| ' + texts.map(norm).join(' ||| ') + ' ||| ';
  return (quote: string): boolean => {
    const sh = shingles(quote);
    if (sh.length === 0) return false;
    // Grounded if ANY distinctive 5-word run survives into the corpus.
    for (const s of sh) {
      if (s.length >= 12 && blob.includes(' ' + s + ' ')) return true;
    }
    // Short quotes (<5 words) — fall back to whole-quote substring.
    if (sh.length === 1) {
      const q = norm(quote);
      if (q.length >= 12 && blob.includes(q)) return true;
    }
    return false;
  };
}

/**
 * Classify one quote against the real corpus and the curated bank.
 */
export function classifyQuote(
  quote: string,
  inCorpus: (q: string) => boolean,
  inCurated: (q: string) => boolean
): Provenance {
  if (!quote || norm(quote).length < 8) return 'unverified';
  if (inCorpus(quote)) return 'corpus';
  if (inCurated(quote)) return 'curated';
  return 'unverified';
}

/**
 * Walk a normalized section-content tree, classify every {quote,...} object,
 * annotate it in place with `prov`, and return an aggregate audit.
 *
 * When `prune` is true, fabricated quotes (neither corpus nor curated) are
 * REMOVED from any array they sit in — so the published report shows only
 * grounded verbatims. The audit still records how many were dropped.
 */
export function verifyContentVerbatims(
  content: any,
  corpusTexts: string[],
  curatedTexts: string[],
  prune: boolean = false
): VerbatimAudit {
  const inCorpus = buildCorpusMatcher(corpusTexts);
  const inCurated = curatedTexts.length ? buildCorpusMatcher(curatedTexts) : () => false;

  const audit: VerbatimAudit = {
    total: 0, corpus: 0, curated: 0, unverified: 0, unverified_samples: [],
  };

  const classify = (node: any): Provenance | null => {
    if (typeof node?.quote !== 'string' || node.quote.trim().length === 0) return null;
    const prov = classifyQuote(node.quote, inCorpus, inCurated);
    node.prov = prov;
    audit.total++;
    if (prov === 'corpus') audit.corpus++;
    else if (prov === 'curated') audit.curated++;
    else {
      audit.unverified++;
      if (audit.unverified_samples.length < 20) {
        audit.unverified_samples.push({
          quote: node.quote, source: node.source, consumer: node.consumer,
        });
      }
    }
    return prov;
  };

  const visit = (node: any): void => {
    if (Array.isArray(node)) {
      // Classify children first so we know which to drop.
      for (const item of node) {
        if (item && typeof item === 'object') classify(item);
      }
      if (prune) {
        // Remove fabricated verbatims in place. Only prune objects that ARE
        // verbatims (have a quote); never touch non-verbatim array members.
        for (let i = node.length - 1; i >= 0; i--) {
          const item = node[i];
          if (item && typeof item === 'object' && typeof item.quote === 'string' && item.prov === 'unverified') {
            node.splice(i, 1);
          }
        }
      }
      // Recurse into whatever survives.
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== 'object') return;
    // A standalone verbatim object not inside an array (rare) — classify only.
    if (typeof node.quote === 'string' && typeof node.prov === 'undefined') classify(node);
    for (const v of Object.values(node)) visit(v);
  };

  visit(content);
  return audit;
}
