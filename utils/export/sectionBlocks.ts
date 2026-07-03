/* ============================================================================
   sectionBlocks — turns each Lovingle section's NORMALIZED DTO into a neutral,
   format-agnostic block-descriptor list. This is the single source of truth the
   PPTX and DOCX builders both walk (block.type → mapper). It mirrors exactly what
   LovingleSections renders on screen, reading the SAME normalized fields — so the
   export carries every insight, every verbatim {quote,source,consumer}, every
   data point. Adding Gate-3 blocks = add a descriptor + a mapper entry in each builder.
   ============================================================================ */

import { SectionOutput } from '../../types';
import { normalizeBabyDiapers } from '../normalizers/normalizeBabyDiapers';
import { extractEvidence } from '../evidence/extractEvidence';

const arr = <T = any>(v: any): T[] => (Array.isArray(v) ? v : v ? [v] : []);

// ── neutral descriptor shapes ────────────────────────────────────────────────

export interface VerbatimX { quote: string; source: string; consumer: string; }
export interface CardX { headline: string; signal: string; verbatims: VerbatimX[]; confidence?: 'HIGH' | 'MED' | 'LOW'; weight?: number; }
export interface RungX { price: string; unit: string; band: string; who: string; ceiling: string; }
export interface TriggerX { name: string; mechanism: string; intensity: number; intensityLabel: string; verbatim: string; locked: boolean; }
export interface DriverX { attribute: string; tierLabel: string; importance: string; weightPct: number; insight: string; verbatim?: VerbatimX; }
export interface GapBulletX { claim: string; explanation: string; severity: string; weight?: number; verbatims: VerbatimX[]; }
export interface GapGroupX { heading: string; bullets: GapBulletX[]; }
export interface NeedX { need: string; whyNow: string; who: string; priority: string; verbatims: VerbatimX[]; }
export interface BrandX { brand: string; tier: string; sentiment: string; sov: number; positioning: string; strengths: string[]; weaknesses: string[]; attributes: Array<{ attribute: string; score: number }>; verbatims: VerbatimX[]; isLovingle: boolean; }
export interface SwitchX { from: string; to: string; trigger: string; into: boolean; verbatims: VerbatimX[]; }
export interface StyleX { style: string; lifestageSkew: string; owns: string; challenge: string; switchTriggers: string[]; notes: string[]; verbatims: VerbatimX[]; }
export interface PackX { pack: string; who: string; occasion: string; channel: string; role: string; verbatims: VerbatimX[]; }
export interface GroupX { label: string; cards: CardX[]; }
export interface JourneyLaneX { ageBand: string; headline: string; sizeSignal: string; needs: string[]; mindset: string; switchTriggers: string[]; verbatims: VerbatimX[]; }
export interface CrossTabX { columns: string[]; rows: Array<{ label: string; cells: string[] }>; }

export type ExportBlock =
  | { type: 'cards'; title: string; cards: CardX[] }
  | { type: 'groups'; title: string; groups: GroupX[] }
  | { type: 'ladder'; title: string; rungs: RungX[] }
  | { type: 'triggers'; title: string; triggers: TriggerX[] }
  | { type: 'journey'; title: string; lanes: JourneyLaneX[]; spineSummary: string[] }
  | { type: 'ranked'; title: string; drivers: DriverX[] }
  | { type: 'gap'; title: string; current?: GapGroupX; resolved?: GapGroupX; unresolved?: GapGroupX; needGap?: { heading: string; needs: NeedX[] } }
  | { type: 'sov'; title: string; marketStructure: string[]; brands: BrandX[] }
  | { type: 'switches'; title: string; stories: SwitchX[] }
  | { type: 'styleCards'; title: string; styles: StyleX[] }
  | { type: 'packColumns'; title: string; laddi: PackX[]; nonLaddi: PackX[]; ladderDynamics: string[] }
  | { type: 'crosstab'; title: string; matrix: CrossTabX; notes: string[] }
  | { type: 'notes'; title: string; items: string[] }
  // F3 Gate 3 blocks
  | { type: 'statband'; title: string; stats: Array<{ stat: string; label: string }>; northStar: string }
  | { type: 'moves'; title: string; moves: Array<{ n: number | string; title: string; rationale: string }> }
  | { type: 'wave'; title: string; monthly: number[]; spikes: Array<{ month: string; label: string; verbatim?: VerbatimX }> }
  | { type: 'segments'; title: string; segments: Array<{ segment: string; definition: string; behaviours: string[]; verbatims: VerbatimX[] }> }
  | { type: 'channelflow'; title: string; nodes: Array<{ node: string; share?: number; mapsToPack: string; note: string; verbatims: VerbatimX[] }>; flowNotes: string[] }
  | { type: 'regionmap'; title: string; regions: Array<{ name: string; intensity?: number; note: string; verbatims: VerbatimX[] }>; summary: string[] }
  | { type: 'network'; title: string; center: string; nodes: Array<{ name: string; role: string; weight?: number; verbatim?: VerbatimX }>; excluded: string[]; notes: string[] }
  | { type: 'quadrant'; title: string; xAxis: { low: string; high: string }; yAxis: { low: string; high: string }; points: Array<{ label: string; x: number; y: number; quadrant: string; note: string }> };

export interface SectionExport {
  sectionId: string;
  title: string;
  eyebrow: string;
  standfirst: string;
  evidenceN: number;
  dataPoints: number;
  confidence: string;
  indicative: boolean;
  blocks: ExportBlock[];
}

export const INDICATIVE_SECTIONS = new Set([
  'exec_summary', 'seasonality', 'target_group', 'channel_retail',
  'geography_regional', 'influencer_community', 'whitespace_recommendations', 'methodology_evidence',
]);
export interface ReportExport {
  title: string;
  subtitle: string;
  dateLabel: string;
  totalEvidence: number;
  totalDataPoints: number;
  confidence: string;
  sources: string[];
  sections: SectionExport[];
}

// ── field mappers (read the SAME normalized fields LovingleSections reads) ────

const verbX = (v: any): VerbatimX => ({ quote: v?.quote || '', source: v?.source || '', consumer: v?.consumer || '' });
const verbsX = (a: any): VerbatimX[] => arr(a).map(verbX).filter((v) => v.quote);
const conf3 = (c: any): 'HIGH' | 'MED' | 'LOW' | undefined => {
  if (typeof c !== 'string') return undefined;
  const u = c.toUpperCase();
  return u.startsWith('H') ? 'HIGH' : u.startsWith('L') ? 'LOW' : 'MED';
};
const toCardsX = (items: any): CardX[] => arr(items).map((c) => ({
  headline: c?.headline || c?.title || c?.claim || '',
  signal: c?.what_it_means || c?.explanation || c?.insight || c?.detail || '',
  verbatims: verbsX(c?.verbatims),
  confidence: conf3(c?.confidence),
  weight: typeof c?.data_points === 'number' ? c.data_points : undefined,
}));

const SEC_ORDER = ['C', 'B', 'A'];
const toLadderX = (ceilings: any): RungX[] => arr(ceilings).slice()
  .sort((a, b) => SEC_ORDER.indexOf(String(a?.sec)) - SEC_ORDER.indexOf(String(b?.sec)))
  .map((c) => {
    const raw = String(c?.ceiling_inr || '');
    const m = raw.match(/₹[\d–—\-.,\s]+/);
    return {
      price: (m ? m[0] : raw).trim() || `SEC ${c?.sec || ''}`,
      unit: /piece/i.test(raw) ? 'per piece' : '',
      band: `SEC ${c?.sec || ''}`,
      who: c?.notes || '',
      ceiling: raw,
    };
  });

const toTriggersX = (items: any): TriggerX[] => arr(items).map((t) => {
  const dp = typeof t?.data_points === 'number' ? t.data_points : 0;
  const intensity = dp >= 300 ? 3 : dp >= 150 ? 2 : 1;
  return {
    name: t?.headline || '', mechanism: t?.what_it_means || '',
    intensity, intensityLabel: intensity === 3 ? 'High' : intensity === 2 ? 'Medium' : 'Low',
    verbatim: verbsX(t?.verbatims)[0]?.quote || '', locked: false,
  };
});

const TIER_LABEL: Record<string, string> = { must_have: 'Must-have', good_to_have: 'Good-to-have', delighter: 'Delighter' };
const toDriversX = (drivers: any): DriverX[] => {
  const list = arr(drivers);
  const order = ['must_have', 'good_to_have', 'delighter'];
  return order.flatMap((tier) => list.filter((d) => (d.tier || 'good_to_have') === tier).map((d) => ({
    attribute: d.attribute || '', tierLabel: TIER_LABEL[tier] || tier,
    importance: d.importance || 'MED',
    weightPct: d.importance === 'HIGH' ? 92 : d.importance === 'LOW' ? 34 : 62,
    insight: d.insight || d.what_it_means || '',
    verbatim: verbsX(d.verbatims)[0],
  })));
};

const toGapGroupX = (b: any): GapGroupX | undefined => {
  if (!b || !arr(b.bullets).length) return undefined;
  return {
    heading: b.heading || '',
    bullets: arr(b.bullets).map((x: any) => ({
      claim: x.claim || '', explanation: x.explanation || '', severity: x.severity || 'MED',
      weight: typeof x.data_points === 'number' ? x.data_points : undefined,
      verbatims: verbsX(x.consumer_evidence),
    })),
  };
};

const toBrandsX = (brands: any): BrandX[] => arr(brands).map((b) => ({
  brand: b.brand || '', tier: String(b.tier || '').replace(/_/g, ' '),
  sentiment: b.overall_sentiment || 'MIX', sov: b.share_of_voice?.share_pct ?? 0,
  positioning: b.positioning_summary || '',
  strengths: arr<string>(b.strengths), weaknesses: arr<string>(b.weaknesses),
  attributes: arr(b.attribute_scale).map((a: any) => ({ attribute: a.attribute || '', score: typeof a.score_0_5 === 'number' ? a.score_0_5 : 0 })),
  verbatims: verbsX(b.verbatims), isLovingle: (b.brand || '').toLowerCase() === 'lovingle',
}));

const toStylesX = (styles: any): StyleX[] => arr(styles).map((s) => ({
  style: String(s.style || '').replace(/_/g, ' '), lifestageSkew: s.lifestage_skew || '',
  owns: s.typical_occasion || '', challenge: s.key_challenge || '',
  switchTriggers: arr<string>(s.switch_triggers),
  notes: [...arr<string>(s.functional_notes), ...arr<string>(s.emotional_notes)],
  verbatims: verbsX(s.verbatims),
}));

const packLabel = (p: string): string => String(p || '').replace(/_/g, ' ').replace('non laddi ', '₹');
const toPacksX = (packs: any): PackX[] => arr(packs).map((p) => ({
  pack: packLabel(p.pack), who: p.who_buys || '', occasion: p.occasion || '',
  channel: p.channel_context || '', role: p.role_in_portfolio || '', verbatims: verbsX(p.verbatims),
}));

const toGroupsX = (pairs: Array<[string, any]>): GroupX[] =>
  pairs.map(([label, items]) => ({ label, cards: toCardsX(items) })).filter((g) => g.cards.length);

// ── per-section composition (mirrors LovingleSections) ────────────────────────

const EY = (s: string) => `Lovingle · ${s}`;

const sectionToBlocks = (sectionId: string, d: any): { eyebrow: string; standfirst: string; blocks: ExportBlock[] } => {
  switch (sectionId) {
    case 'category_context':
      return { eyebrow: EY('Category Context'), standfirst: 'How the baby-diaper category has matured from penetration to choice-differentiation — the cultural backdrop every later cut sits on.',
        blocks: [{ type: 'cards', title: 'Category & Cultural Signals', cards: toCardsX(d.cards) }] };
    case 'babys_world_journey':
      return { eyebrow: EY("The Baby's World"), standfirst: 'Needs reset at every milestone — and it is those resets that move a parent between styles, packs and brands.',
        blocks: [{ type: 'journey', title: 'The Journey Spine', lanes: arr(d.lanes).map((l: any) => ({ ageBand: l.age_band || '', headline: l.headline || '', sizeSignal: l.size_signal || '', needs: arr<string>(l.needs), mindset: l.mindset || '', switchTriggers: arr<string>(l.switch_triggers), verbatims: verbsX(l.verbatims) })), spineSummary: arr<string>(d.spine_summary) }] };
    case 'diaper_styles':
      return { eyebrow: EY('Diaper Styles'), standfirst: 'The same household mixes styles by occasion; switching is driven by the baby’s mobility, not brand dissatisfaction.',
        blocks: [
          { type: 'styleCards', title: 'Style Profiles', styles: toStylesX(d.styles) },
          { type: 'crosstab', title: 'How Styles Interact in a Household', matrix: { columns: arr<string>(d.interaction_matrix?.columns), rows: arr(d.interaction_matrix?.rows).map((r: any) => ({ label: r.label || '', cells: arr<string>(r.cells) })) }, notes: arr<string>(d.interaction_notes) },
        ] };
    case 'pack_architecture':
      return { eyebrow: EY('Pack Architecture'), standfirst: 'Laddi and non-laddi co-exist within the same household across the month — pack is an occasion question, not a loyalty one.',
        blocks: [{ type: 'packColumns', title: 'Pack Architecture', laddi: toPacksX(d.laddi), nonLaddi: toPacksX(d.non_laddi), ladderDynamics: arr<string>(d.ladder_dynamics) }] };
    case 'behaviour_usage':
      return { eyebrow: EY('Behaviour & Usage'), standfirst: 'Usage is occasion-driven — a single household runs different formats for night, day, travel and daycare.',
        blocks: [
          { type: 'cards', title: 'Occasions of Use', cards: toCardsX(d.occasions) },
          ...(arr(d.usage_notes).length ? [{ type: 'notes', title: 'Usage Notes', items: arr<string>(d.usage_notes) } as ExportBlock] : []),
        ] };
    case 'needs_triggers_pains':
      return { eyebrow: EY('Needs, Triggers & Pains'), standfirst: 'The three-layer need stack — functional, emotional and social — that governs choice and switching.',
        blocks: [{ type: 'groups', title: 'The Need Stack', groups: toGroupsX([['Functional Needs', d.functional], ['Emotional Needs', d.emotional], ['Social Needs', d.social]]) }] };
    case 'decision_influencers':
      return { eyebrow: EY('Decision & Influence'), standfirst: 'Who decides vs who buys, the support-system roles around them, and the trust hierarchy that sets the first brand.',
        blocks: [{ type: 'groups', title: 'Decision & Influence Map', groups: toGroupsX([['Buyer vs Decider', d.buyer_vs_decider], ['Support-System Roles', d.support_system_roles], ['Discovery & Trust Hierarchy', d.discovery_hierarchy]]) }] };
    case 'attribute_drivers':
      return { eyebrow: EY('Attribute Drivers'), standfirst: 'What parents weight most — from must-haves to delighters — and how hard each attribute pulls.',
        blocks: [{ type: 'ranked', title: 'Attribute Drivers · by tier', drivers: toDriversX(d.drivers) }] };
    case 'price_pack_signals':
      return { eyebrow: 'Decision & Perception · Keystone Section', standfirst: 'How Indian baby-diaper buyers read price-per-piece, what unlocks each step up the ladder, and where each SEC caps its spend — the commercial bridge into pack architecture.',
        blocks: [
          { type: 'ladder', title: 'Price-Ceiling Ladder · by SEC', rungs: toLadderX(d.price_ceilings) },
          { type: 'triggers', title: 'Premiumisation Triggers', triggers: toTriggersX(d.premiumisation_triggers) },
          { type: 'cards', title: 'Price-per-Diaper Awareness', cards: toCardsX(d.price_awareness) },
          { type: 'cards', title: 'Promotional Responsiveness', cards: toCardsX(d.promo_response) },
          { type: 'cards', title: 'Pack-Size vs Unit-Price Trade-off', cards: toCardsX(d.pack_vs_unit_tradeoff) },
        ] };
    case 'gap_analysis':
      return { eyebrow: EY('Gap Analysis'), standfirst: 'What the category has solved, what remains unresolved, and the white space Lovingle can own.',
        blocks: [{ type: 'gap', title: 'Challenges, Resolution & Need Gaps', current: toGapGroupX(d.current_challenges), resolved: toGapGroupX(d.resolved_challenges), unresolved: toGapGroupX(d.unresolved_challenges), needGap: { heading: d.need_gap?.heading || 'White space & need gaps', needs: arr(d.need_gap?.need_statements).map((n: any) => ({ need: n.need || '', whyNow: n.why_now || '', who: n.who || '', priority: n.priority || 'P1', verbatims: verbsX(n.consumer_evidence) })) } }] };
    case 'lovingle_diagnostic':
      return { eyebrow: EY('Brand Diagnostic'), standfirst: 'Lovingle’s funnel in its own words — awareness, the rash / skin-safety objection lock, and the stories of switching in and out.',
        blocks: [
          { type: 'groups', title: 'Awareness & Consideration', groups: toGroupsX([['Spontaneous Awareness & Associations', d.spontaneous_awareness], ['Consideration Drivers', d.consideration_drivers], ['Barriers · Rash / Skin-Safety Lock', d.consideration_barriers], ['Aware Non-Triers', d.aware_non_trier], ["What's Working Among Triers", d.trier_working]]) },
          { type: 'switches', title: 'Switch Stories · to & from Lovingle', stories: arr(d.switch_stories).map((s: any) => ({ from: s.from_brand || '', to: s.to_brand || '', trigger: s.trigger || '', into: s.direction === 'to_lovingle', verbatims: verbsX(s.verbatims) })) },
        ] };
    case 'brand_landscape':
      return { eyebrow: EY('Competitive Landscape'), standfirst: 'Where the brands sit on share of voice, attributes and sentiment — and the credible position open to Lovingle.',
        blocks: [{ type: 'sov', title: 'Brand Landscape', marketStructure: arr<string>(d.market_structure), brands: toBrandsX(d.brands) }] };

    // ── F3 Gate 3 — new sections ──
    case 'exec_summary':
      return { eyebrow: EY('Executive Summary'), standfirst: "The commercial payoff up front: where premiumisation unlocks, the locked objection to break, and the north-star moves that ladder to RSPL's price–pack architecture.",
        blocks: [
          { type: 'statband', title: 'The Opportunity', stats: arr(d.stats).map((s: any) => ({ stat: s?.stat || '', label: s?.label || '' })), northStar: d.north_star || '' },
          { type: 'cards', title: 'What the Report Found', cards: toCardsX(d.insights) },
          { type: 'moves', title: 'North-Star Moves', moves: arr(d.moves).map((m: any) => ({ n: m?.n ?? '', title: m?.title || '', rationale: m?.rationale || '' })) },
        ] };
    case 'seasonality':
      return { eyebrow: EY('Seasonality'), standfirst: 'The category breathes on a 12-month rhythm — monsoon rash-anxiety, summer heat and festive-&-travel stock-up each peak different packs and triggers.',
        blocks: [
          { type: 'wave', title: 'Demand Rhythm · 12 months', monthly: arr<number>(d.monthly), spikes: arr(d.spikes).map((s: any) => ({ month: s?.month || '', label: s?.label || '', verbatim: s?.verbatim ? verbX(s.verbatim) : undefined })) },
          { type: 'cards', title: 'Seasonal Occasions', cards: toCardsX(d.occasions) },
        ] };
    case 'target_group':
      return { eyebrow: EY('Target Group'), standfirst: "Three buyer cuts — anchored to the baby's age, never the parent's — plus the family-structure split that shapes who decides.",
        blocks: [{ type: 'segments', title: 'Core Segments', segments: arr(d.segments).map((s: any) => ({ segment: s?.segment || '', definition: s?.definition || '', behaviours: arr<string>(s?.behaviours), verbatims: verbsX(s?.verbatims) })) }] };
    case 'channel_retail':
      return { eyebrow: EY('Channel & Retail'), standfirst: 'Channel maps cleanly onto pack — kirana = laddi, online = jumbo — and premiumisation flows left to right into the price–pack architecture.',
        blocks: [{ type: 'channelflow', title: 'The Channel Funnel', nodes: arr(d.nodes).map((n: any) => ({ node: n?.node || '', share: typeof n?.share === 'number' ? n.share : undefined, mapsToPack: n?.maps_to_pack || '', note: n?.note || '', verbatims: verbsX(n?.verbatims) })), flowNotes: arr<string>(d.flow_notes) }] };
    case 'geography_regional':
      return { eyebrow: EY('Geography'), standfirst: 'Metro premiumisation vs Tier 2/3 value-seeking is the sharpest split — with climate and festive culture shaping the rest.',
        blocks: [{ type: 'regionmap', title: 'Regional Intensity', regions: arr(d.regions).map((r: any) => ({ name: r?.name || '', intensity: typeof r?.intensity === 'number' ? r.intensity : undefined, note: r?.note || '', verbatims: verbsX(r?.verbatims) })), summary: arr<string>(d.summary) }] };
    case 'influencer_community':
      return { eyebrow: EY('Influence & Community'), standfirst: 'Trust descends doctor → influencer → peer community → reviews → family. WhatsApp groups are explicitly excluded.',
        blocks: [{ type: 'network', title: 'The Influence Network', center: d.center || 'Parent', nodes: arr(d.nodes).map((n: any) => ({ name: n?.name || '', role: n?.role || '', weight: typeof n?.weight === 'number' ? n.weight : undefined, verbatim: n?.verbatim ? verbX(n.verbatim) : undefined })), excluded: arr<string>(d.excluded), notes: arr<string>(d.notes) }] };
    case 'whitespace_recommendations':
      return { eyebrow: EY('White Space & Recommendations'), standfirst: 'The decision-ready payoff: white-space opportunities plotted by effort × impact, and the moves that ladder back to price–pack architecture.',
        blocks: [
          { type: 'quadrant', title: 'Opportunity Map', xAxis: { low: d.xAxis?.low || 'Low effort', high: d.xAxis?.high || 'High effort' }, yAxis: { low: d.yAxis?.low || 'Low impact', high: d.yAxis?.high || 'High impact' }, points: arr(d.points).map((p: any) => ({ label: p?.label || '', x: typeof p?.x === 'number' ? p.x : 50, y: typeof p?.y === 'number' ? p.y : 50, quadrant: p?.quadrant || '', note: p?.note || '' })) },
          { type: 'moves', title: 'Recommended Moves', moves: arr(d.moves).map((m: any) => ({ n: m?.n ?? '', title: m?.title || '', rationale: m?.rationale || '' })) },
        ] };
    case 'methodology_evidence':
      return { eyebrow: EY('Methodology'), standfirst: "The credibility appendix — source layers, a 36-month+ listening window, what's excluded, and the coverage behind every cut.",
        blocks: [
          { type: 'notes', title: 'Evidence Source Layers', items: arr<string>(d.sources) },
          { type: 'notes', title: 'Excluded', items: arr<string>(d.excluded) },
          { type: 'notes', title: 'Listening Window & Confidence', items: [d.window, d.confidence, d.disclaimer].filter(Boolean) },
          { type: 'cards', title: 'Coverage', cards: arr(d.coverage).map((c: any) => ({ headline: c?.label || '', signal: c?.detail || '', verbatims: [] as VerbatimX[] })) },
        ] };

    // ✦ Stream C — new sections (rendered as cards in DOCX/PPTX exports)
    case 'consumer_personas':
      return { eyebrow: EY('Consumer Personas'), standfirst: '7-8 living portraits of who Lovingle is for — spanning the journey, family structure and first-vs-second-time motherhood.',
        blocks: [{
          type: 'cards', title: 'Persona Set',
          cards: arr(d.personas).map((p: any) => ({
            headline: p?.name || '',
            signal: [p?.demographic, p?.channel_posture && `Channel: ${p.channel_posture}`, p?.price_posture && `Price: ${p.price_posture}`, p?.style_preference && `Style: ${String(p.style_preference).replace(/_/g, ' ')}`].filter(Boolean).join(' · '),
            explanation: [
              arr<string>(p?.triggers).length ? `TRIGGERS: ${arr<string>(p.triggers).join('; ')}` : '',
              arr<string>(p?.pain_points).length ? `PAINS: ${arr<string>(p.pain_points).join('; ')}` : '',
              arr<string>(p?.unmet_needs).length ? `UNMET NEEDS: ${arr<string>(p.unmet_needs).join('; ')}` : '',
              p?.barrier_to_lovingle ? `BARRIER TO LOVINGLE: ${p.barrier_to_lovingle}` : '',
            ].filter(Boolean).join('  •  '),
            data_points: typeof p?.data_points === 'number' ? p.data_points : undefined,
            verbatims: arr(p?.verbatims).map(verbX),
          })),
        }] };

    case 'style_switch_journey':
      return { eyebrow: EY('Style Switch Journey'), standfirst: 'How parents move across cloth, tape, pant and reusable as the baby grows — proposal §9.1 dedicated deep-dive.',
        blocks: [
          { type: 'cards', title: 'The Switch Arcs',
            cards: arr(d.switches).map((s: any) => ({
              headline: `${String(s?.from_style || '').replace(/_/g, ' ')} → ${String(s?.to_style || '').replace(/_/g, ' ')}`,
              signal: `${s?.lifestage ? String(s.lifestage).replace(/_/g, ' ') + ' · ' : ''}TRIGGER: ${s?.trigger || ''}`,
              explanation: [
                arr<string>(s?.friction).length ? `FRICTION: ${arr<string>(s.friction).join('; ')}` : '',
                arr<string>(s?.enabler).length ? `ENABLER: ${arr<string>(s.enabler).join('; ')}` : '',
              ].filter(Boolean).join('  •  '),
              data_points: typeof s?.data_points === 'number' ? s.data_points : undefined,
              verbatims: arr(s?.verbatims).map(verbX),
            })),
          },
          ...(arr<string>(d.interaction_notes).length ? [{ type: 'notes' as const, title: 'Cross-Switch Patterns', items: arr<string>(d.interaction_notes) }] : []),
        ] };

    case 'decision_journey_stages':
      return { eyebrow: EY('Decision Journey by Lifestage'), standfirst: 'Who buys, who decides, who influences — at each baby-age lifestage. The brief\'s explicit stage-by-stage decision modelling.',
        blocks: [
          { type: 'cards', title: 'Stage-by-Stage Decision Map',
            cards: arr(d.stages).map((s: any) => ({
              headline: `${String(s?.lifestage || '').replace(/_/g, ' ')}${s?.age_band ? ' · ' + s.age_band : ''}`,
              signal: [s?.who_buys && `BUYS: ${s.who_buys}`, s?.who_decides && `DECIDES: ${s.who_decides}`, s?.top_influencer && `INFLUENCER: ${s.top_influencer}`].filter(Boolean).join('  •  '),
              explanation: [
                s?.support_system_role ? `SUPPORT SYSTEM: ${s.support_system_role}` : '',
                arr<string>(s?.trust_hierarchy).length ? `TRUST: ${arr<string>(s.trust_hierarchy).join(' > ')}` : '',
              ].filter(Boolean).join('  •  '),
              data_points: typeof s?.data_points === 'number' ? s.data_points : undefined,
              verbatims: arr(s?.verbatims).map(verbX),
            })),
          },
          ...(arr<string>(d.cross_stage_notes).length ? [{ type: 'notes' as const, title: 'Cross-Stage Patterns', items: arr<string>(d.cross_stage_notes) }] : []),
        ] };

    case 'diaper_avoidance':
      return { eyebrow: EY('When Diapers Are Avoided'), standfirst: 'The moments parents choose cloth, bare-bottom or nothing instead of a disposable — and what those moments reveal about category boundaries.',
        blocks: [
          { type: 'cards', title: 'Avoidance Moments',
            cards: arr(d.moments).map((m: any) => ({
              headline: m?.moment || '',
              signal: [m?.alternative_chosen && `INSTEAD: ${m.alternative_chosen}`, m?.lifestage && `Lifestage: ${String(m.lifestage).replace(/_/g, ' ')}`].filter(Boolean).join(' · '),
              explanation: [m?.why_avoided && `WHY: ${m.why_avoided}`, m?.typical_segment && `STRONGEST IN: ${m.typical_segment}`].filter(Boolean).join('  •  '),
              data_points: typeof m?.data_points === 'number' ? m.data_points : undefined,
              verbatims: arr(m?.verbatims).map(verbX),
            })),
          },
          ...(arr<string>(d.summary).length ? [{ type: 'notes' as const, title: 'What Avoidance Reveals', items: arr<string>(d.summary) }] : []),
        ] };

    case 'consumer_language':
      return { eyebrow: EY('Consumer Language'), standfirst: 'The exact words parents use — in English, Hindi and Hinglish — for soft, dry, rash-free, leak-proof, overnight, value. The wording that should appear on pack and in comms.',
        blocks: [{
          type: 'cards', title: 'The Words That Matter',
          cards: arr(d.terms).map((t: any) => ({
            headline: `${t?.term || ''}${arr<string>(t?.vernacular_variants).length ? '  ·  ' + arr<string>(t.vernacular_variants).join(' · ') : ''}`,
            signal: [t?.emotional_meaning && `EMOTIONAL: ${t.emotional_meaning}`, t?.functional_meaning && `FUNCTIONAL: ${t.functional_meaning}`].filter(Boolean).join('  •  '),
            explanation: [t?.pack_implication && `PACK: ${t.pack_implication}`, t?.comms_implication && `COMMS: ${t.comms_implication}`].filter(Boolean).join('  •  '),
            verbatims: arr(t?.verbatims).map(verbX),
          })),
        }] };

    default:
      // v2 registry sections reach here (office-export composition for the new
      // structure is a future task). N8 — no brand name in export chrome.
      return { eyebrow: 'Baby Diaper · Category & Consumer Understanding', standfirst: '', blocks: [] };
  }
};

const sumDataPoints = (node: any, seen: WeakSet<object> = new WeakSet()): number => {
  if (!node || typeof node !== 'object' || seen.has(node)) return 0;
  seen.add(node);
  let t = 0;
  if (!Array.isArray(node) && typeof node.data_points === 'number') t += node.data_points;
  for (const v of (Array.isArray(node) ? node : Object.values(node))) t += sumDataPoints(v, seen);
  return t;
};
const confidenceBand = (dp: number): string => dp >= 1500 ? 'High' : dp >= 600 ? 'Medium-High' : dp >= 200 ? 'Medium' : 'Indicative';
const platform = (s: string): string => (s && s.trim() ? s.split(/[·|]/)[0].trim() : '');

/** Walk the ordered SectionOutput[] → the full report export model (DTO-driven, no DOM). */
export const reportToBlocks = (sections: SectionOutput[]): ReportExport => {
  const sourceSet = new Set<string>();
  let totalEvidence = 0, totalDataPoints = 0;

  const out: SectionExport[] = arr(sections).map((s) => {
    const content = s.content;
    const data = normalizeBabyDiapers(s.sectionId || '', content);
    const verbs = extractEvidence(content);
    verbs.forEach((v) => { const p = platform(v.source); if (p) sourceSet.add(p); });
    const dp = sumDataPoints(content);
    totalEvidence += verbs.length;
    totalDataPoints += dp;
    const { eyebrow, standfirst, blocks } = sectionToBlocks(s.sectionId || '', data);
    return { sectionId: s.sectionId || '', title: s.title || '', eyebrow, standfirst, evidenceN: verbs.length, dataPoints: dp, confidence: confidenceBand(dp), indicative: INDICATIVE_SECTIONS.has(s.sectionId || ''), blocks };
  });

  return {
    // N8 — no brand name in export chrome.
    title: 'Baby Diaper — Category and Consumer Understanding',
    subtitle: 'Consumer Listening Report — India',
    dateLabel: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
    totalEvidence, totalDataPoints, confidence: confidenceBand(totalDataPoints),
    sources: Array.from(sourceSet),
    sections: out,
  };
};
