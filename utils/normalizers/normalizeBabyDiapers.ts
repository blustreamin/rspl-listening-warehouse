
// ============================================================================
// BABY DIAPERS NORMALIZER — v2 registry (RSPL structure rework, 02 Jul 2026)
// Section outputs flow through as generated; the booklet renderers normalise
// defensively at the component level (LovingleSections + BookletBlocks).
//
// Seeds (BD_SEEDS_V1) are keyed to the RETIRED v1 registry and are intentionally
// NOT merged here — new sections have no seed fallback (§9 of the restructure
// brief); when a section has not been generated, the renderer wears an explicit
// "awaiting generation" state instead of indicative sample content. The seed
// pack stays in-tree (and the 245 Supabase seed rows stay in section_outputs)
// purely as rollback insurance for the old structure.
// ============================================================================

export const normalizeBabyDiapers = (sectionId: string, rawData: any): any => {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  return data;
};
