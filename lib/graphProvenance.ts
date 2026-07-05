import type { EvidenceGraph } from '../types';

// ============================================================================
//  GRAPH PROVENANCE — how an evidence graph was produced, used by the
//  mock-corpus guard to decide whether a graph may be synthesized against,
//  persisted, or cached under a real provider/hash.
//
//    'registry'  assembled from the dataset registry (services/graphAssembly)
//                or loaded from an evidence_graphs row with dataset links.
//    'mock'      the built-in RAW_MENTIONS demo corpus (sourceTag 'mock').
//    'unknown'   provenance not established (e.g. a legacy persisted graph with
//                zero dataset links) — treated as untrusted for registry-backed
//                projects.
//
//  Producers stamp __provenance at creation time; these helpers only READ it,
//  with sourceTag as a belt-and-suspenders fallback for the demo corpus.
// ============================================================================

export type GraphProvenance = 'registry' | 'mock' | 'unknown';

export function graphProvenance(graph?: EvidenceGraph | null): GraphProvenance {
  if (!graph) return 'unknown';
  const tagged = graph.__provenance;
  if (tagged === 'mock' || tagged === 'registry' || tagged === 'unknown') return tagged;
  if (Array.isArray(graph.__datasetIds) && graph.__datasetIds.length > 0) return 'registry';
  return 'unknown';
}

/** True for the built-in demo/mock corpus. Belt-and-suspenders: also catches an
 *  untagged graph whose every event carries sourceTag 'mock'. */
export function isMockGraph(graph?: EvidenceGraph | null): boolean {
  if (!graph) return false;
  if (graphProvenance(graph) === 'mock') return true;
  const events = graph.events || graph.evidence_graph_v1?.events || [];
  return events.length > 0 && events.every((e: any) => e?.sourceTag === 'mock');
}

/** Order-independent equality of two dataset-id lists. */
export function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  return b.every(id => seen.has(id));
}
