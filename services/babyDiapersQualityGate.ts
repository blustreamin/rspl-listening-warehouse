
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

  switch (sectionId) {
    case 'category_context':
      checkArray(d.cards, 4, 'category cards', failures);
      cardsHaveVerbatims(d.cards, 'category', failures);
      break;
    case 'babys_world_journey':
      checkArray(d.lanes, 5, 'journey lanes', failures);
      if (arr(d.lanes).some((l: any) => arr(l.needs).length < 1)) failures.push('a journey lane has no needs');
      break;
    case 'diaper_styles':
      checkArray(d.styles, 3, 'styles', failures);
      if (!d.interaction_matrix || !arr(d.interaction_matrix.columns).length) failures.push('missing interaction_matrix');
      break;
    case 'pack_architecture':
      if (arr(d.laddi).length + arr(d.non_laddi).length < 3) failures.push('too few pack profiles');
      checkArray(d.ladder_dynamics, 2, 'ladder_dynamics', failures);
      break;
    case 'behaviour_usage':
      checkArray(d.occasions, 5, 'occasions', failures);
      break;
    case 'needs_triggers_pains':
      checkArray(d.functional, 2, 'functional needs', failures);
      checkArray(d.emotional, 2, 'emotional needs', failures);
      checkArray(d.social, 1, 'social needs', failures);
      break;
    case 'decision_influencers':
      checkArray(d.buyer_vs_decider, 1, 'buyer_vs_decider', failures);
      checkArray(d.discovery_hierarchy, 1, 'discovery_hierarchy', failures);
      break;
    case 'attribute_drivers':
      checkArray(d.drivers, 6, 'attribute drivers', failures);
      break;
    case 'price_pack_signals':
      checkArray(d.price_ceilings, 3, 'price_ceilings', failures);
      checkArray(d.premiumisation_triggers, 1, 'premiumisation_triggers', failures);
      break;
    case 'gap_analysis':
      checkArray(d.current_challenges?.bullets, 3, 'current challenges', failures);
      checkArray(d.need_gap?.need_statements, 2, 'need statements', failures);
      break;
    case 'lovingle_diagnostic':
      checkArray(d.consideration_barriers, 1, 'consideration_barriers', failures);
      // brand-objection lock: barriers must read on rash/skin-safety
      {
        const txt = JSON.stringify(d.consideration_barriers || []).toLowerCase();
        if (!/rash|skin|safe|gentle/.test(txt)) failures.push('Lovingle barriers missing rash/skin-safety lock');
      }
      break;
    case 'brand_landscape':
      checkArray(d.brands, 4, 'brands', failures);
      if (!arr(d.brands).some((b: any) => (b.brand || '').toLowerCase() === 'lovingle')) failures.push('Lovingle missing from landscape');
      break;
    default:
      break;
  }

  const score = Math.max(0, 100 - failures.length * 15);
  return { ok: failures.length === 0, failures, score };
};
