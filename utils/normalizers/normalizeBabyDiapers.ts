
// ============================================================================
// BABY DIAPERS NORMALIZER + SEED MERGE
// Produces render-ready DTOs for every section. When model output is thin or
// absent (no API key, low signal, failed quality gate), merges the seed pack
// so the report always renders. normalizeBabyDiapers(sectionId, {}) returns a
// fully-formed seeded section.
// ============================================================================

import { BD_SEEDS_V1 } from '../../projects/baby-diapers/bd_seed_v1';

const ensureArray = (v: any): any[] => Array.isArray(v) ? v : (v ? [v] : []);

const safeStr = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.headline || v.text || v.title || v.name || v.claim || '';
};

// Normalise a verbatim into { quote, source, consumer }
const normVerbatim = (q: any): any => {
  if (!q) return null;
  if (typeof q === 'string') {
    // strip a leading "📢 " if present
    return { quote: q.replace(/^📢\s*/, ''), source: '', consumer: '' };
  }
  return {
    quote: safeStr(q.quote || q.text || q),
    source: q.source || q.platform || '',
    consumer: q.consumer || q.descriptor || '',
  };
};

const normVerbatims = (arr: any): any[] => ensureArray(arr).map(normVerbatim).filter((x: any) => x && x.quote);

// Normalise an insight card { headline, what_it_means, data_points, verbatims }
const normCard = (c: any): any => {
  const c2 = c || {};
  return {
    headline: safeStr(c2.headline || c2.title || c2.claim) || 'Insight',
    what_it_means: c2.what_it_means || c2.explanation || c2.detail || c2.insight || c2.description || '',
    data_points: typeof c2.data_points === 'number' ? c2.data_points : undefined,
    confidence: c2.confidence,
    verbatims: normVerbatims(c2.verbatims || c2.consumer_evidence || c2.quotes || c2.evidence),
    style: c2.style,
    pack: c2.pack,
    lifestage: c2.lifestage,
  };
};

const normCards = (arr: any): any[] => ensureArray(arr).map(normCard);

// Merge: if model array is shorter than seed array, append the remaining seeds.
const mergeList = (target: any[], seed: any[]): any[] => {
  const t = ensureArray(target);
  const s = ensureArray(seed);
  if (t.length >= s.length) return t;
  return [...t, ...s.slice(t.length)];
};

const seedFor = (sectionId: string): any => BD_SEEDS_V1[sectionId] || {};

// Gap block normaliser (shared shape)
const normGapBlock = (block: any, fallback: any) => {
  const b = block || fallback || {};
  return {
    heading: b.heading || (fallback && fallback.heading) || 'Challenges',
    bullets: ensureArray(b.bullets).map((it: any) => ({
      claim: safeStr(it.claim || it.text) || 'Unspecified',
      explanation: it.explanation || it.why || it.description || '',
      consumer_evidence: normVerbatims(it.consumer_evidence || it.evidence),
      severity: it.severity || 'MED',
      data_points: it.data_points,
      impacted_lifestages: ensureArray(it.impacted_lifestages),
    })),
  };
};

const normNeedBlock = (block: any, fallback: any) => {
  const b = block || fallback || {};
  return {
    heading: b.heading || 'Need Gaps',
    need_statements: ensureArray(b.need_statements || b.needs).map((it: any) => ({
      need: safeStr(it.need) || 'Unspecified',
      why_now: it.why_now || '',
      who: it.who || '',
      consumer_evidence: normVerbatims(it.consumer_evidence || it.evidence),
      priority: it.priority || 'P1',
    })),
  };
};

const normCrossTab = (t: any, seed: any): any => {
  const src = (t && Array.isArray(t.columns) && t.columns.length) ? t : (seed || { columns: [], rows: [] });
  return {
    columns: ensureArray(src.columns).map(safeStr),
    rows: ensureArray(src.rows).map((r: any) => ({
      label: safeStr(r.label),
      cells: ensureArray(r.cells).map(safeStr),
    })),
  };
};

export const normalizeBabyDiapers = (sectionId: string, rawData: any): any => {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  const seed = seedFor(sectionId);

  switch (sectionId) {

    case 'category_context': {
      const cards = normCards(data.cards);
      return { cards: cards.length ? mergeList(cards, normCards(seed.cards)) : normCards(seed.cards) };
    }

    case 'babys_world_journey': {
      let lanes = ensureArray(data.lanes).map((l: any) => ({
        lifestage: l.lifestage || '',
        age_band: l.age_band || '',
        size_signal: l.size_signal || '',
        headline: safeStr(l.headline),
        needs: ensureArray(l.needs).map(safeStr),
        mindset: l.mindset || '',
        dominant_style: l.dominant_style,
        switch_triggers: ensureArray(l.switch_triggers).map(safeStr),
        verbatims: normVerbatims(l.verbatims),
      }));
      const seedLanes = ensureArray(seed.lanes);
      if (lanes.length < seedLanes.length) lanes = mergeList(lanes, seedLanes);
      return {
        lanes: lanes.length ? lanes : seedLanes,
        spine_summary: ensureArray(data.spine_summary).map(safeStr).length
          ? ensureArray(data.spine_summary).map(safeStr)
          : ensureArray(seed.spine_summary),
      };
    }

    case 'diaper_styles': {
      let styles = ensureArray(data.styles).map((s: any) => ({
        style: s.style || '',
        typical_occasion: s.typical_occasion || '',
        lifestage_skew: s.lifestage_skew || '',
        key_challenge: s.key_challenge || '',
        switch_triggers: ensureArray(s.switch_triggers).map(safeStr),
        functional_notes: ensureArray(s.functional_notes).map(safeStr),
        emotional_notes: ensureArray(s.emotional_notes).map(safeStr),
        verbatims: normVerbatims(s.verbatims),
      }));
      const seedStyles = ensureArray(seed.styles);
      if (styles.length < seedStyles.length) styles = mergeList(styles, seedStyles);
      return {
        styles: styles.length ? styles : seedStyles,
        interaction_matrix: normCrossTab(data.interaction_matrix, seed.interaction_matrix),
        interaction_notes: ensureArray(data.interaction_notes).map(safeStr).length
          ? ensureArray(data.interaction_notes).map(safeStr)
          : ensureArray(seed.interaction_notes),
      };
    }

    case 'pack_architecture': {
      const normPack = (p: any) => ({
        pack: p.pack || '',
        who_buys: p.who_buys || '',
        occasion: p.occasion || '',
        channel_context: p.channel_context || '',
        role_in_portfolio: p.role_in_portfolio || '',
        verbatims: normVerbatims(p.verbatims),
      });
      let laddi = ensureArray(data.laddi).map(normPack);
      let nonLaddi = ensureArray(data.non_laddi).map(normPack);
      if (laddi.length < ensureArray(seed.laddi).length) laddi = mergeList(laddi, ensureArray(seed.laddi));
      if (nonLaddi.length < ensureArray(seed.non_laddi).length) nonLaddi = mergeList(nonLaddi, ensureArray(seed.non_laddi));
      return {
        laddi: laddi.length ? laddi : ensureArray(seed.laddi),
        non_laddi: nonLaddi.length ? nonLaddi : ensureArray(seed.non_laddi),
        ladder_dynamics: ensureArray(data.ladder_dynamics).map(safeStr).length
          ? ensureArray(data.ladder_dynamics).map(safeStr)
          : ensureArray(seed.ladder_dynamics),
      };
    }

    case 'behaviour_usage': {
      const occ = normCards(data.occasions);
      return {
        occasions: occ.length ? mergeList(occ, normCards(seed.occasions)) : normCards(seed.occasions),
        usage_notes: ensureArray(data.usage_notes).map(safeStr).length
          ? ensureArray(data.usage_notes).map(safeStr)
          : ensureArray(seed.usage_notes),
      };
    }

    case 'needs_triggers_pains': {
      const pick = (k: string) => {
        const m = normCards(data[k]);
        return m.length ? mergeList(m, normCards(seed[k])) : normCards(seed[k]);
      };
      return { functional: pick('functional'), emotional: pick('emotional'), social: pick('social') };
    }

    case 'decision_influencers': {
      const pick = (k: string) => {
        const m = normCards(data[k]);
        return m.length ? mergeList(m, normCards(seed[k])) : normCards(seed[k]);
      };
      return {
        buyer_vs_decider: pick('buyer_vs_decider'),
        support_system_roles: pick('support_system_roles'),
        discovery_hierarchy: pick('discovery_hierarchy'),
      };
    }

    case 'attribute_drivers': {
      let drivers = ensureArray(data.drivers).map((d: any) => ({
        attribute: safeStr(d.attribute) || 'Attribute',
        tier: d.tier || 'good_to_have',
        importance: d.importance || 'MED',
        insight: d.insight || d.what_it_means || '',
        mapped_lifestage: d.mapped_lifestage,
        mapped_style: d.mapped_style,
        verbatims: normVerbatims(d.verbatims),
      }));
      const seedDrivers = ensureArray(seed.drivers);
      if (drivers.length < seedDrivers.length) drivers = mergeList(drivers, seedDrivers);
      return { drivers: drivers.length ? drivers : seedDrivers };
    }

    case 'price_pack_signals': {
      const pickCards = (k: string) => {
        const m = normCards(data[k]);
        return m.length ? mergeList(m, normCards(seed[k])) : normCards(seed[k]);
      };
      let ceilings = ensureArray(data.price_ceilings).map((c: any) => ({
        sec: c.sec || '', ceiling_inr: c.ceiling_inr || '', notes: c.notes || '',
      }));
      if (ceilings.length < ensureArray(seed.price_ceilings).length) ceilings = ensureArray(seed.price_ceilings);
      return {
        price_awareness: pickCards('price_awareness'),
        price_ceilings: ceilings,
        premiumisation_triggers: pickCards('premiumisation_triggers'),
        promo_response: pickCards('promo_response'),
        pack_vs_unit_tradeoff: pickCards('pack_vs_unit_tradeoff'),
      };
    }

    case 'gap_analysis': {
      const s = seed || {};
      return {
        current_challenges: normGapBlock(data.current_challenges, s.current_challenges),
        resolved_challenges: normGapBlock(data.resolved_challenges, s.resolved_challenges),
        unresolved_challenges: normGapBlock(data.unresolved_challenges, s.unresolved_challenges),
        need_gap: normNeedBlock(data.need_gap, s.need_gap),
      };
    }

    case 'lovingle_diagnostic': {
      const pick = (k: string) => {
        const m = normCards(data[k]);
        return m.length ? mergeList(m, normCards(seed[k])) : normCards(seed[k]);
      };
      let switches = ensureArray(data.switch_stories).map((s: any) => ({
        direction: s.direction || 'to_lovingle',
        from_brand: s.from_brand || '',
        to_brand: s.to_brand || '',
        trigger: s.trigger || '',
        verbatims: normVerbatims(s.verbatims),
      }));
      if (switches.length < ensureArray(seed.switch_stories).length) switches = ensureArray(seed.switch_stories);
      return {
        spontaneous_awareness: pick('spontaneous_awareness'),
        consideration_drivers: pick('consideration_drivers'),
        consideration_barriers: pick('consideration_barriers'),
        aware_non_trier: pick('aware_non_trier'),
        trier_working: pick('trier_working'),
        switch_stories: switches,
      };
    }

    case 'brand_landscape': {
      let brands = ensureArray(data.brands).map((b: any) => ({
        brand: b.brand || 'Brand',
        tier: b.tier || 'mass',
        share_of_voice: { share_pct: b.share_of_voice?.share_pct ?? b.share_pct ?? 0 },
        overall_sentiment: b.overall_sentiment || 'MIX',
        positioning_summary: b.positioning_summary || '',
        attribute_scale: ensureArray(b.attribute_scale).map((a: any) => ({
          attribute: safeStr(a.attribute), score_0_5: typeof a.score_0_5 === 'number' ? a.score_0_5 : 0,
        })),
        strengths: ensureArray(b.strengths).map(safeStr),
        weaknesses: ensureArray(b.weaknesses).map(safeStr),
        data_points: b.data_points,
        verbatims: normVerbatims(b.verbatims),
      }));
      const seedBrands = ensureArray(seed.brands);
      // Append any seed brand not present (by name) — guarantees Lovingle + competitors render
      if (brands.length < 2) {
        brands = seedBrands;
      } else {
        const names = new Set(brands.map((b: any) => (b.brand || '').toLowerCase()));
        seedBrands.forEach((sb: any) => { if (!names.has((sb.brand || '').toLowerCase())) brands.push(sb); });
      }
      return {
        market_structure: ensureArray(data.market_structure).map(safeStr).length
          ? ensureArray(data.market_structure).map(safeStr)
          : ensureArray(seed.market_structure),
        brands: brands.length ? brands : seedBrands,
      };
    }

    // F3 Gate 3 — new sections (indicative seed; shallow-merge live data when present)
    case 'exec_summary':
    case 'seasonality':
    case 'target_group':
    case 'channel_retail':
    case 'geography_regional':
    case 'influencer_community':
    case 'whitespace_recommendations':
    case 'methodology_evidence':
      return Object.keys(data).length ? { ...seed, ...data } : seed;

    default:
      // Unknown section — return seed if present, else raw
      return Object.keys(seed).length ? seed : data;
  }
};
