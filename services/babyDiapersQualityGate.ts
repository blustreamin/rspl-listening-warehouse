
// ANALYST-GRADE QUALITY GATE (Baby Diapers / Lovingle only)

export interface QualityResult {
  ok: boolean;
  failures: string[];
  score: number;
}

const arr = (v: any): any[] => Array.isArray(v) ? v : [];

const checkArray = (a: any, min: number, name: string, failures: string[]) => {
  if (!Array.isArray(a) || a.length < min) {
    failures.push(`${name} < ${min} (found ${Array.isArray(a) ? a.length : 0})`);
    return false;
  }
  return true;
};

// Count verbatims across a list of cards
const cardsHaveVerbatims = (cards: any[], name: string, failures: string[]) => {
  const withV = arr(cards).filter(c => arr(c.verbatims).length >= 1).length;
  if (withV < Math.min(2, arr(cards).length)) {
    failures.push(`${name}: too few cards carry verbatims (${withV})`);
  }
};

export const evaluateBabyDiapersQuality = (sectionId: string, data: any): QualityResult => {
  const failures: string[] = [];
  const d = data || {};

  // v2 registry (RSPL structure rework, 02 Jul 2026). Checks are STRUCTURAL and
  // lenient by design: a hard fail after the single repair retry blanks the
  // section to its absent state, so the gate only rejects output no renderer
  // could use — coverage-honesty (thin-but-real sections) always passes.
  switch (sectionId) {
    case 'exec_summary':
      checkArray(d.insights, 3, 'exec insights', failures);
      break;
    case 'babycare_needs':
    case 'diaper_needs_fes':
      if (!d.bands || (arr(d.bands.functional).length + arr(d.bands.emotional).length + arr(d.bands.social).length) < 2) {
        failures.push('needs bands missing or near-empty');
      }
      break;
    case 'needs_by_lifestage':
      checkArray(d.stages, 3, 'lifestage stages', failures);
      break;
    case 'decision_journey':
      checkArray(d.discovery_sources, 3, 'discovery_sources', failures);
      break;
    case 'usage_occasions':
      checkArray(d.occasions, 3, 'occasions', failures);
      break;
    case 'features_benefits':
      if (!d.tiers || arr(d.tiers.must_haves).length < 2) failures.push('must_haves missing');
      break;
    case 'channel_dynamics':
      checkArray(d.channels, 3, 'channels', failures);
      break;
    case 'competitive_landscape':
      checkArray(d.brands, 3, 'brands', failures);
      if (!arr(d.brands).some((b: any) => (b.brand || '').toLowerCase() === 'lovingle')) failures.push('Lovingle missing from landscape');
      break;
    case 'lovingle_journey':
      checkArray(d.barriers, 1, 'barriers', failures);
      // brand-objection lock: barriers must read on rash/skin-safety
      {
        const txt = JSON.stringify(d.barriers || []).toLowerCase();
        if (arr(d.barriers).length && !/rash|skin|safe|gentle/.test(txt)) failures.push('Lovingle barriers missing rash/skin-safety lock');
      }
      break;
    case 'regional_differences':
      checkArray(d.regions, 3, 'regions', failures);
      break;
    case 'consumer_vocabulary':
      checkArray(d.terms, 5, 'vocabulary terms', failures);
      break;
    case 'consumer_personas':
      checkArray(d.personas, 2, 'personas', failures);
      if (arr(d.personas).length > 5) failures.push('more than 5 personas (structure-doc cap)');
      break;
    default:
      break;
  }

  const score = Math.max(0, 100 - failures.length * 15);
  return { ok: failures.length === 0, failures, score };
};
