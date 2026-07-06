import { ProjectId } from '../types';

// ============================================================================
//  PER-PROJECT DATA MODE — the mock-corpus guard's source of truth.
//
//  'registry'  The project's evidence comes ONLY from its registered datasets
//              (assembled by services/graphAssembly). A registry-backed run
//              NEVER falls back to the built-in demo/mock corpus: if the
//              registry is empty/unreachable or assembly fails, the run ABORTS
//              loudly (no provider call, no persisted graph, no cached section).
//
//  'demo'      The project MAY run against the built-in RAW_MENTIONS sample
//              corpus when no real evidence is present. Reserved for the sample
//              / demo projects.
//
//  SECURE DEFAULT: a project not listed here is treated as 'registry'. Mock is
//  reachable ONLY behind an explicit 'demo' entry — never inferred from whether
//  data happens to be present. This is what prevents a real project whose
//  backend momentarily returns empty from silently synthesizing against mock.
//
//  History: on 05-Jul a baby-diapers click-Run silently synthesized a full
//  21-section report against a stale 35,254-event demo corpus (YouTube/Vimeo,
//  zero dataset links) and cached it under a real provider+hash. baby-diapers
//  is registry-backed; it can no longer reach mock by any path.
//
//  To make an existing project registry-backed, remove it from MOCK_ALLOWED
//  (or leave it out — that is already the default). To let a project use the
//  demo corpus, add it to MOCK_ALLOWED.
//
//  ⚠ PROMOTION PREREQUISITE: registry-backed projects run the reconciliation
//  guard (services/graphAssembly.ts), which requires the project's ingestion
//  to be LOSSLESS (1 registered row -> 1 event). babyDiapersIngestion is; the
//  adult-diapers and femcare ingestions still text-dedup and drop short rows,
//  so promoting one of them without first making its ingestion lossless would
//  abort every run at the guard.
// ============================================================================

export type DataMode = 'registry' | 'demo';

// Projects explicitly permitted to fall back to the built-in demo/mock corpus.
// RAW_MENTIONS is femcare/period-panties themed and disposable-period-panties
// is the default landing project, so the femcare + adult sample projects retain
// their demo behavior. baby-diapers is intentionally absent -> registry-backed.
const MOCK_ALLOWED: ReadonlySet<ProjectId> = new Set<ProjectId>([
  'disposable-period-panties',
  'reusable-period-panties',
  'sanitary-pads',
  'adult-diapers',
]);

export const getDataMode = (projectId: ProjectId): DataMode =>
  MOCK_ALLOWED.has(projectId) ? 'demo' : 'registry';

/** A registry-backed project synthesizes only from its registered datasets and
 *  aborts rather than fall back to the demo/mock corpus. */
export const isRegistryBacked = (projectId: ProjectId): boolean =>
  !MOCK_ALLOWED.has(projectId);

/** Whether the built-in demo/mock corpus may be used for this project. */
export const allowMockCorpus = (projectId: ProjectId): boolean =>
  MOCK_ALLOWED.has(projectId);
