/* ============================================================================
   LOVINGLE SECTIONS (F3 warm-premium) — all 12 baby-diaper sections.
   PARITY FIRST: every field of each existing normalized DTO is rendered through
   the block library; nothing is dropped (a few previously-hidden fields, e.g.
   diaper-style functional/emotional notes, are now surfaced too). Each section
   wears the shared LovingleSectionShell (header + evidence + method footer).
   ============================================================================ */

import React from 'react';
import { SectionOutput } from '../../types';
import { LovingleSectionShell } from './LovingleSectionShell';
import {
  ZoneHead, SubHead, NoteBox, InsightCardGrid, LabeledCardGroups, CrossTab,
  PriceLadder, TriggerRail, JourneySpine, RankedBars, GapColumns, SovBars, SwitchStories,
  VerbatimChipList, toInsightCards,
  HeadlineStatBand, WaveChart, SegmentCards, ChannelFlow, RegionMap, NetworkDiagram,
  MatrixQuadrant, SynthesisMoves,
  type PriceRung, type TriggerContent,
} from './blocks/LovingleBlocks';

type Props = { data: any; section?: SectionOutput };
const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : v ? [v] : []);

// ── shared mappers (price ladder + triggers) ─────────────────────────────────

const SEC_ORDER = ['C', 'B', 'A'];
const toLadder = (ceilings: any): PriceRung[] =>
  arr<any>(ceilings).slice()
    .sort((a, b) => SEC_ORDER.indexOf(String(a?.sec)) - SEC_ORDER.indexOf(String(b?.sec)))
    .map((c) => {
      const raw = String(c?.ceiling_inr || '');
      const m = raw.match(/₹[\d–—\-.,\s]+/);
      return {
        price: (m ? m[0] : raw).trim() || `SEC ${c?.sec || ''}`,
        unit: /piece/i.test(raw) ? 'PER PIECE' : undefined,
        band: `SEC ${c?.sec || ''}`,
        who: c?.notes || '',
        pack: raw ? <>Ceiling · <b>{raw}</b></> : undefined,
      };
    });

const toTriggers = (items: any): TriggerContent[] =>
  arr<any>(items).map((t) => {
    const dp = typeof t?.data_points === 'number' ? t.data_points : 0;
    return {
      name: t?.headline || '',
      mechanism: t?.what_it_means || '',
      intensity: dp >= 300 ? 3 : dp >= 150 ? 2 : 1,
      verbatim: arr<any>(t?.verbatims)[0]?.quote,
    };
  });

const Zone: React.FC<{ span?: 5 | 6 | 7 | 12; title: string; sub?: string; delay?: string; children: React.ReactNode }> =
  ({ span = 12, title, sub, delay = '.1s', children }) => (
    <section className={`lv-zone lv-col-${span} lv-reveal`} style={{ animationDelay: delay }} aria-label={title}>
      <ZoneHead title={title} sub={sub} />
      {children}
    </section>
  );

// ── 1 · Category Context ─────────────────────────────────────────────────────

export const LovingleCategoryContext: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Category Context"
    standfirst={<>How the baby-diaper category has matured from <b>penetration</b> to <b>choice-differentiation</b> — the cultural backdrop every later cut sits on.</>}>
    <Zone span={12} title="Category & Cultural Signals" sub="What is shaping the conversation now" delay=".08s">
      <InsightCardGrid items={toInsightCards(data?.cards)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 2 · Baby's World — Journey ───────────────────────────────────────────────

export const LovingleJourney: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · The Baby's World"
    standfirst={<>Needs reset at every milestone — and it is those resets that move a parent between <b>styles, packs and brands</b>.</>}>
    <Zone span={12} title="The Journey Spine" sub="Needs across the lifestage" delay=".08s">
      <JourneySpine lanes={arr(data?.lanes)} spineSummary={arr(data?.spine_summary)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 3 · Diaper Styles & Format Interaction ───────────────────────────────────

const StyleCard: React.FC<{ s: any }> = ({ s }) => {
  const notes = [...arr<string>(s?.functional_notes), ...arr<string>(s?.emotional_notes)];
  return (
    <div className="lv-card">
      <div className="lv-card-head">
        <div className="lv-card-title" style={{ textTransform: 'capitalize' }}>{String(s?.style || '').replace(/_/g, ' ')}</div>
        {s?.lifestage_skew && <span className="lv-card-pts">{s.lifestage_skew}</span>}
      </div>
      {s?.typical_occasion && <div className="lv-card-sig"><b>Owns:</b> {s.typical_occasion}</div>}
      {s?.key_challenge && <div className="lv-card-sig"><b>Challenge:</b> {s.key_challenge}</div>}
      {arr(s?.switch_triggers).length > 0 && <div className="lv-card-sig"><b>Switch:</b> {arr<string>(s.switch_triggers).join(' · ')}</div>}
      {notes.length > 0 && <NoteBox items={notes} />}
      <VerbatimChipList items={s?.verbatims} max={1} />
    </div>
  );
};

export const LovingleStyles: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Diaper Styles"
    standfirst={<>The same household mixes <b>styles by occasion</b>; switching is driven by the baby's mobility, not brand dissatisfaction.</>}>
    <Zone span={12} title="Style Profiles" sub="What each format owns" delay=".08s">
      <div className="lv-cardgrid">{arr<any>(data?.styles).map((s, i) => <StyleCard key={i} s={s} />)}</div>
    </Zone>
    <Zone span={12} title="How Styles Interact in a Household" delay=".16s">
      <CrossTab matrix={data?.interaction_matrix} />
      <NoteBox items={data?.interaction_notes} />
    </Zone>
  </LovingleSectionShell>
);

// ── 4 · Pack Architecture ────────────────────────────────────────────────────

const packLabel = (p: string): string => String(p || '').replace(/_/g, ' ').replace('non laddi ', '₹');
const PackCard: React.FC<{ p: any }> = ({ p }) => (
  <div className="lv-card">
    <div className="lv-card-title" style={{ textTransform: 'capitalize' }}>{packLabel(p?.pack)}</div>
    {p?.who_buys && <div className="lv-card-sig"><b>Who:</b> {p.who_buys}</div>}
    {p?.occasion && <div className="lv-card-sig"><b>Occasion:</b> {p.occasion}</div>}
    {p?.channel_context && <div className="lv-card-sig"><b>Channel:</b> {p.channel_context}</div>}
    {p?.role_in_portfolio && <div className="lv-card-sig" style={{ color: 'var(--o-700)', fontStyle: 'italic' }}>{p.role_in_portfolio}</div>}
    <VerbatimChipList items={p?.verbatims} max={1} />
  </div>
);

export const LovinglePack: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Pack Architecture"
    standfirst={<>Laddi and non-laddi <b>co-exist within the same household</b> across the month — pack is an occasion question, not a loyalty one.</>}>
    <Zone span={6} title="Laddi · single / twin" sub="Trial & defence" delay=".08s">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{arr<any>(data?.laddi).map((p, i) => <PackCard key={i} p={p} />)}</div>
    </Zone>
    <Zone span={6} title="Non-Laddi · ₹99 / ₹399 / ₹999" sub="The premiumisation engine" delay=".14s">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{arr<any>(data?.non_laddi).map((p, i) => <PackCard key={i} p={p} />)}</div>
    </Zone>
    <Zone span={12} title="Value-Ladder Dynamics" delay=".2s">
      <NoteBox items={data?.ladder_dynamics} />
    </Zone>
  </LovingleSectionShell>
);

// ── 5 · Behaviour & Usage ────────────────────────────────────────────────────

export const LovingleBehaviour: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Behaviour & Usage"
    standfirst={<>Usage is <b>occasion-driven</b> — a single household runs different formats for night, day, travel and daycare.</>}>
    <Zone span={12} title="Occasions of Use" sub="Where and when, ranked by stakes" delay=".08s">
      <InsightCardGrid items={toInsightCards(data?.occasions)} />
    </Zone>
    {arr(data?.usage_notes).length > 0 && (
      <Zone span={12} title="Usage Notes" delay=".16s"><NoteBox items={data?.usage_notes} /></Zone>
    )}
  </LovingleSectionShell>
);

// ── 6 · Needs, Triggers & Pain Points ────────────────────────────────────────

export const LovingleNeeds: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Needs, Triggers & Pains"
    standfirst={<>The three-layer need stack — <b>functional</b>, <b>emotional</b> and <b>social</b> — that governs choice and switching.</>}>
    <Zone span={12} title="The Need Stack" sub="Functional · Emotional · Social" delay=".08s">
      <LabeledCardGroups groups={[
        { label: 'Functional Needs', tone: 'blue', cards: toInsightCards(data?.functional) },
        { label: 'Emotional Needs', tone: 'rose', cards: toInsightCards(data?.emotional) },
        { label: 'Social Needs', tone: 'teal', cards: toInsightCards(data?.social) },
      ]} />
    </Zone>
  </LovingleSectionShell>
);

// ── 7 · Decision-Making & Influencer Roles ───────────────────────────────────

export const LovingleDecision: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Decision & Influence"
    standfirst={<>Who <b>decides</b> vs who <b>buys</b>, the support-system roles around them, and the trust hierarchy that sets the first brand.</>}>
    <Zone span={12} title="Decision & Influence Map" sub="Buyer vs decider · roles · discovery" delay=".08s">
      <LabeledCardGroups groups={[
        { label: 'Buyer vs Decider', tone: 'orange', cards: toInsightCards(data?.buyer_vs_decider) },
        { label: 'Support-System Roles', tone: 'blue', cards: toInsightCards(data?.support_system_roles) },
        { label: 'Discovery & Trust Hierarchy', tone: 'teal', cards: toInsightCards(data?.discovery_hierarchy) },
      ]} />
    </Zone>
  </LovingleSectionShell>
);

// ── 8 · Product Attribute Drivers ────────────────────────────────────────────

export const LovingleAttributes: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Attribute Drivers"
    standfirst={<>What parents weight most — from <b>must-haves</b> to <b>delighters</b> — and how hard each attribute pulls.</>}>
    <Zone span={12} title="Attribute Drivers · by tier" sub="Must-have → good-to-have → delighter" delay=".08s">
      <RankedBars drivers={arr(data?.drivers)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 9 · Price–Pack & Premiumisation Signals (keystone) ───────────────────────

export const LovinglePricePackSection: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} showGiraffe
    eyebrow="Decision & Perception · Keystone Section"
    titleAccent="Premiumisation"
    standfirst={<>How Indian baby-diaper buyers read <b>price-per-piece</b>, what unlocks each step up the ladder, and where each SEC caps its spend — the commercial bridge into <b>pack architecture</b>.</>}>
    {toLadder(data?.price_ceilings).length > 0 && (
      <Zone span={7} title="Price-Ceiling Ladder · by SEC" sub="How far each segment will stretch" delay=".08s">
        <PriceLadder rungs={toLadder(data?.price_ceilings)} />
      </Zone>
    )}
    {toTriggers(data?.premiumisation_triggers).length > 0 && (
      <Zone span={5} title="Premiumisation Triggers" sub="What lifts price tolerance" delay=".14s">
        <TriggerRail triggers={toTriggers(data?.premiumisation_triggers)} />
      </Zone>
    )}
    {arr(data?.price_awareness).length > 0 && (
      <Zone span={12} title="Price-per-Diaper Awareness" sub="How buyers do the math" delay=".18s">
        <InsightCardGrid items={toInsightCards(data?.price_awareness)} />
      </Zone>
    )}
    {arr(data?.promo_response).length > 0 && (
      <Zone span={6} title="Promotional Responsiveness" sub="What converts trial to repeat" delay=".22s">
        <InsightCardGrid items={toInsightCards(data?.promo_response)} />
      </Zone>
    )}
    {arr(data?.pack_vs_unit_tradeoff).length > 0 && (
      <Zone span={6} title="Pack-Size vs Unit-Price Trade-off" sub="Cash outlay vs per-piece value" delay=".26s">
        <InsightCardGrid items={toInsightCards(data?.pack_vs_unit_tradeoff)} />
      </Zone>
    )}
  </LovingleSectionShell>
);

// ── 10 · Gap Analysis ────────────────────────────────────────────────────────

export const LovingleGap: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Gap Analysis"
    standfirst={<>What the category has <b>solved</b>, what remains <b>unresolved</b>, and the <b>white space</b> Lovingle can own.</>}>
    <Zone span={12} title="Challenges, Resolution & Need Gaps" sub="Severity-ranked" delay=".08s">
      <GapColumns
        current={data?.current_challenges}
        resolved={data?.resolved_challenges}
        unresolved={data?.unresolved_challenges}
        needGap={data?.need_gap}
      />
    </Zone>
  </LovingleSectionShell>
);

// ── 11 · Lovingle Brand Diagnostic ───────────────────────────────────────────

export const LovingleDiagnostic: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Brand Diagnostic"
    standfirst={<>Lovingle's funnel in its own words — awareness, the <b>rash / skin-safety</b> objection lock, and the stories of switching in and out.</>}>
    <Zone span={12} title="Awareness & Consideration" sub="Drivers vs the locked objection" delay=".08s">
      <LabeledCardGroups groups={[
        { label: 'Spontaneous Awareness & Associations', tone: 'blue', cards: toInsightCards(data?.spontaneous_awareness) },
        { label: 'Consideration Drivers', tone: 'teal', cards: toInsightCards(data?.consideration_drivers) },
        { label: 'Barriers · Rash / Skin-Safety Lock', tone: 'rose', cards: toInsightCards(data?.consideration_barriers) },
        { label: 'Aware Non-Triers', tone: 'orange', cards: toInsightCards(data?.aware_non_trier) },
        { label: "What's Working Among Triers", tone: 'teal', cards: toInsightCards(data?.trier_working) },
      ]} />
    </Zone>
    {arr(data?.switch_stories).length > 0 && (
      <Zone span={12} title="Switch Stories · to & from Lovingle" sub="Wins and leaks" delay=".18s">
        <SwitchStories stories={arr(data?.switch_stories)} />
      </Zone>
    )}
  </LovingleSectionShell>
);

// ── 12 · Competitive Brand Landscape ─────────────────────────────────────────

export const LovingleBrand: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Competitive Landscape"
    standfirst={<>Where the brands sit on share of voice, attributes and sentiment — and the <b>credible position</b> open to Lovingle.</>}>
    <Zone span={12} title="Brand Landscape" sub="Share of voice · attributes · sentiment" delay=".08s">
      <SovBars marketStructure={arr(data?.market_structure)} brands={arr(data?.brands)} />
    </Zone>
  </LovingleSectionShell>
);

// ════════════════════════════════════════════════════════════════════════════
//  GATE 3 — the 8 new sections (indicative seed; reuse the warm shell + blocks)
// ════════════════════════════════════════════════════════════════════════════

// ── 1 · Executive Summary (lead / cover) ─────────────────────────────────────

export const LovingleExecSummary: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative showGiraffe
    eyebrow="Lovingle · Executive Summary"
    standfirst={<>The commercial payoff up front: where premiumisation unlocks, the locked objection to break, and the <b>north-star moves</b> that ladder to RSPL's price–pack architecture.</>}>
    <Zone span={12} title="The Opportunity" sub="At a glance" delay=".08s">
      <HeadlineStatBand stats={arr(data?.stats)} northStar={data?.north_star} />
    </Zone>
    <Zone span={12} title="What the Report Found" sub="Cross-cutting insights, each laddering to a move" delay=".16s">
      <InsightCardGrid items={toInsightCards(data?.insights)} />
    </Zone>
    <Zone span={12} title="North-Star Moves" sub="Decision-ready" delay=".22s">
      <SynthesisMoves moves={arr(data?.moves)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 3 · Seasonality & Demand Rhythm ──────────────────────────────────────────

export const LovingleSeasonality: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative
    eyebrow="Lovingle · Seasonality"
    standfirst={<>The category breathes on a <b>12-month rhythm</b> — monsoon rash-anxiety, summer heat and festive-&-travel stock-up each peak different packs and triggers.</>}>
    <Zone span={12} title="Demand Rhythm · 12 months" sub="Relative demand index · three spikes" delay=".08s">
      <WaveChart monthly={arr(data?.monthly)} spikes={arr(data?.spikes)} />
    </Zone>
    <Zone span={12} title="Seasonal Occasions" sub="What peaks when — and which pack benefits" delay=".16s">
      <InsightCardGrid items={toInsightCards(data?.occasions)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 4 · Target Group & Segments ──────────────────────────────────────────────

export const LovingleTargetGroup: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative
    eyebrow="Lovingle · Target Group"
    standfirst={<>Three buyer cuts — anchored to the <b>baby's age</b>, never the parent's — plus the family-structure split that shapes who decides.</>}>
    <Zone span={12} title="Core Segments" sub="Definition · behaviours · voice" delay=".08s">
      <SegmentCards segments={arr(data?.segments)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 10 · Channel & Retail Architecture ───────────────────────────────────────

export const LovingleChannel: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative
    eyebrow="Lovingle · Channel & Retail"
    standfirst={<>Channel maps cleanly onto pack — <b>kirana = laddi</b>, <b>online = jumbo</b> — and premiumisation flows left to right into the price–pack architecture.</>}>
    <Zone span={12} title="The Channel Funnel" sub="General Trade → Modern Trade → Online" delay=".08s">
      <ChannelFlow nodes={arr(data?.nodes)} flowNotes={arr(data?.flow_notes)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 11 · Geography & Regional Patterns ───────────────────────────────────────

export const LovingleGeography: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative
    eyebrow="Lovingle · Geography"
    standfirst={<>Metro premiumisation vs <b>Tier 2/3 value-seeking</b> is the sharpest split — with climate (humid South) and festive culture (North/West) shaping the rest.</>}>
    <Zone span={12} title="Regional Intensity" sub="Premiumisation by geography" delay=".08s">
      <RegionMap regions={arr(data?.regions)} summary={arr(data?.summary)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 13 · Influencer & Community Ecosystem ────────────────────────────────────

export const LovingleInfluencer: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative
    eyebrow="Lovingle · Influence & Community"
    standfirst={<>Trust descends <b>doctor → influencer → peer community → reviews → family</b>. WhatsApp groups are explicitly excluded.</>}>
    <Zone span={12} title="The Influence Network" sub="Who shapes the choice, and how strongly" delay=".08s">
      <NetworkDiagram center={data?.center || 'Parent'} nodes={arr(data?.nodes)} excluded={arr(data?.excluded)} notes={arr(data?.notes)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 19 · White Space & Recommendations ───────────────────────────────────────

export const LovingleWhitespace: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data} indicative
    eyebrow="Lovingle · White Space & Recommendations"
    standfirst={<>The decision-ready payoff: white-space opportunities plotted by <b>effort × impact</b>, and the moves that ladder back to price–pack architecture.</>}>
    <Zone span={12} title="Opportunity Map" sub="Effort × impact" delay=".08s">
      <MatrixQuadrant xAxis={data?.xAxis} yAxis={data?.yAxis} points={arr(data?.points)} />
    </Zone>
    <Zone span={12} title="Recommended Moves" sub="Portfolio · price-mix · communication" delay=".16s">
      <SynthesisMoves moves={arr(data?.moves)} />
    </Zone>
  </LovingleSectionShell>
);

// ── 20 · Methodology & Evidence Base ─────────────────────────────────────────

export const LovingleMethodology: React.FC<Props> = ({ data, section }) => {
  const sources = arr<string>(data?.sources);
  const excluded = arr<string>(data?.excluded);
  const coverage = arr<any>(data?.coverage).map((c) => ({ headline: c?.label || '', signal: c?.detail || '', verbatims: [] }));
  return (
    <LovingleSectionShell section={section} data={data} indicative
      eyebrow="Lovingle · Methodology"
      standfirst={<>The credibility appendix — source layers, a <b>36-month+</b> listening window, what's excluded, and the coverage behind every cut.</>}>
      <Zone span={7} title="Evidence Source Layers" sub="Triangulated" delay=".08s">
        <div className="lv-srcs">
          {sources.map((s, i) => <span key={i} className="lv-src-chip">{s}</span>)}
          {excluded.map((s, i) => <span key={`x${i}`} className="lv-src-chip lv-excl">{s}</span>)}
        </div>
        {data?.window && <div className="lv-excluded" style={{ marginTop: 14 }}><span className="lv-excluded-tag">Window</span><span>{data.window}</span></div>}
      </Zone>
      <Zone span={5} title="Confidence" sub="Calibration" delay=".14s">
        <NoteBox items={[data?.confidence, data?.disclaimer].filter(Boolean)} />
      </Zone>
      {coverage.length > 0 && (
        <Zone span={12} title="Coverage" sub="Geography · lifestage · channels · hygiene" delay=".2s">
          <InsightCardGrid items={coverage} />
        </Zone>
      )}
    </LovingleSectionShell>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STREAM C — NEW SECTIONS (Consumer Personas, Style Switch Journey, Decision
// Journey by Lifestage, Diaper Avoidance, Consumer Language)
// ═══════════════════════════════════════════════════════════════════════════

// ── ✦ Consumer Personas ──────────────────────────────────────────────────────

const PersonaCard: React.FC<{ p: any }> = ({ p }) => {
  const tierColor: Record<string, string> = {
    premium: 'var(--o-700)', mid_premium: 'var(--o-600)', mass: 'var(--ink-3)',
  };
  return (
    <div className="lv-card" style={{ borderTop: `4px solid ${tierColor[p?.segment] || 'var(--ink-3)'}` }}>
      <div className="lv-card-title" style={{ fontSize: '1.05em' }}>{p?.name || ''}</div>
      {p?.demographic && <div className="lv-card-sig" style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>{p.demographic}</div>}
      <div className="lv-card-sig" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
        {p?.lifestage && <span style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 999, fontSize: '0.75em' }}>{String(p.lifestage).replace(/_/g, ' ')}</span>}
        {p?.family_structure && <span style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 999, fontSize: '0.75em' }}>{p.family_structure}</span>}
        {p?.mother_type && <span style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 999, fontSize: '0.75em' }}>{String(p.mother_type).replace(/_/g, ' ')}</span>}
        {p?.segment && <span style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 999, fontSize: '0.75em' }}>{String(p.segment).replace(/_/g, ' ')}</span>}
      </div>
      {p?.channel_posture && <div className="lv-card-sig"><b>Channel:</b> {p.channel_posture}</div>}
      {p?.price_posture && <div className="lv-card-sig"><b>Price posture:</b> {p.price_posture}</div>}
      {p?.style_preference && <div className="lv-card-sig"><b>Style:</b> {String(p.style_preference).replace(/_/g, ' ')}</div>}
      {arr<string>(p?.triggers).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: '0.78em', fontWeight: 700, color: 'var(--o-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Triggers</div>
          <ul className="lv-notes" style={{ marginTop: 2 }}>{arr<string>(p.triggers).map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {arr<string>(p?.pain_points).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: '0.78em', fontWeight: 700, color: 'var(--rose-dk)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pain points</div>
          <ul className="lv-notes" style={{ marginTop: 2 }}>{arr<string>(p.pain_points).map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {arr<string>(p?.unmet_needs).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: '0.78em', fontWeight: 700, color: 'var(--teal-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unmet needs</div>
          <ul className="lv-notes" style={{ marginTop: 2 }}>{arr<string>(p.unmet_needs).map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {p?.barrier_to_lovingle && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(242, 111, 33, 0.08)', borderLeft: '3px solid var(--o-700)', borderRadius: 4 }}>
          <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--o-700)', textTransform: 'uppercase' }}>Barrier to Lovingle</div>
          <div style={{ fontSize: '0.88em', color: 'var(--ink)' }}>{p.barrier_to_lovingle}</div>
        </div>
      )}
      <VerbatimChipList items={p?.verbatims} max={5} />
      {typeof p?.data_points === 'number' && (
        <div style={{ marginTop: 6, fontSize: '0.72em', color: 'var(--ink-3)' }}>n = {p.data_points} evidence points</div>
      )}
    </div>
  );
};

export const LovinglePersonas: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Consumer Personas"
    standfirst={<>Seven to eight <b>living portraits</b> of who Lovingle is for — spanning the baby's journey, family structure, and first-vs-second-time motherhood.</>}>
    <Zone span={12} title="Persona Set" sub="Each persona is a Kantar-grade consumer deep-dive — read these as the audience anchor for everything that follows" delay=".08s">
      <div className="lv-cardgrid">{arr<any>(data?.personas).map((p, i) => <PersonaCard key={i} p={p} />)}</div>
    </Zone>
  </LovingleSectionShell>
);

// ── ✦ Style Switch Journey ───────────────────────────────────────────────────

const StyleSwitchCard: React.FC<{ s: any }> = ({ s }) => (
  <div className="lv-card">
    <div className="lv-card-title" style={{ fontSize: '0.95em' }}>
      <span style={{ textTransform: 'capitalize' }}>{String(s?.from_style || '').replace(/_/g, ' ')}</span>
      <span style={{ color: 'var(--o-700)', margin: '0 8px' }}>→</span>
      <span style={{ textTransform: 'capitalize' }}>{String(s?.to_style || '').replace(/_/g, ' ')}</span>
    </div>
    {s?.lifestage && <div className="lv-card-sig" style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{String(s.lifestage).replace(/_/g, ' ')}</div>}
    {s?.trigger && (
      <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(242, 111, 33, 0.06)', borderLeft: '3px solid var(--o-600)', borderRadius: 4 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--o-700)', textTransform: 'uppercase' }}>Trigger</div>
        <div style={{ fontSize: '0.9em' }}>{s.trigger}</div>
      </div>
    )}
    {arr<string>(s?.friction).length > 0 && (
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--rose-dk)', textTransform: 'uppercase' }}>Friction</div>
        <ul className="lv-notes">{arr<string>(s.friction).map((f, i) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    {arr<string>(s?.enabler).length > 0 && (
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--teal-700)', textTransform: 'uppercase' }}>Enabler</div>
        <ul className="lv-notes">{arr<string>(s.enabler).map((f, i) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    <VerbatimChipList items={s?.verbatims} max={5} />
    {typeof s?.data_points === 'number' && (
      <div style={{ marginTop: 6, fontSize: '0.72em', color: 'var(--ink-3)' }}>n = {s.data_points} evidence points</div>
    )}
  </div>
);

export const LovingleStyleSwitchJourney: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Style Switch Journey"
    standfirst={<>How parents move across <b>cloth, tape, pant and reusable</b> as the baby grows — proposal §9.1 deep-dive.</>}>
    <Zone span={12} title="The Switch Arcs" sub="What triggers each style transition; what makes it hard; what eases it" delay=".08s">
      <div className="lv-cardgrid">{arr<any>(data?.switches).map((s, i) => <StyleSwitchCard key={i} s={s} />)}</div>
    </Zone>
    {arr<string>(data?.interaction_notes).length > 0 && (
      <Zone span={12} title="Cross-Switch Patterns" delay=".16s">
        <NoteBox items={data.interaction_notes} />
      </Zone>
    )}
  </LovingleSectionShell>
);

// ── ✦ Decision Journey by Lifestage ──────────────────────────────────────────

const DecisionStageCard: React.FC<{ s: any }> = ({ s }) => (
  <div className="lv-card">
    <div className="lv-card-title" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ textTransform: 'capitalize' }}>{String(s?.lifestage || '').replace(/_/g, ' ')}</span>
      {s?.age_band && <span style={{ fontSize: '0.78em', color: 'var(--ink-3)', fontWeight: 400 }}>· {s.age_band}</span>}
    </div>
    {s?.who_buys && <div className="lv-card-sig"><b>Who buys:</b> {s.who_buys}</div>}
    {s?.who_decides && <div className="lv-card-sig"><b>Who decides:</b> {s.who_decides}</div>}
    {s?.support_system_role && <div className="lv-card-sig"><b>Support system:</b> {s.support_system_role}</div>}
    {s?.top_influencer && <div className="lv-card-sig" style={{ color: 'var(--o-700)' }}><b>Top influencer:</b> {s.top_influencer}</div>}
    {arr<string>(s?.trust_hierarchy).length > 0 && (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trust hierarchy (high → low)</div>
        <ol style={{ marginTop: 4, paddingLeft: 18, fontSize: '0.85em', color: 'var(--ink)' }}>
          {arr<string>(s.trust_hierarchy).map((t, i) => <li key={i} style={{ marginBottom: 2 }}>{t}</li>)}
        </ol>
      </div>
    )}
    <VerbatimChipList items={s?.verbatims} max={5} />
    {typeof s?.data_points === 'number' && (
      <div style={{ marginTop: 6, fontSize: '0.72em', color: 'var(--ink-3)' }}>n = {s.data_points} evidence points</div>
    )}
  </div>
);

export const LovingleDecisionJourney: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Decision Journey by Lifestage"
    standfirst={<>Who buys, who decides, and who influences <b>at each lifestage</b> — the brief's explicit demand for stage-by-stage decision modelling.</>}>
    <Zone span={12} title="Stage-by-Stage Decision Map" sub="The buyer ≠ the decider; the influencer shifts at every milestone" delay=".08s">
      <div className="lv-cardgrid">{arr<any>(data?.stages).map((s, i) => <DecisionStageCard key={i} s={s} />)}</div>
    </Zone>
    {arr<string>(data?.cross_stage_notes).length > 0 && (
      <Zone span={12} title="Cross-Stage Patterns" delay=".16s">
        <NoteBox items={data.cross_stage_notes} />
      </Zone>
    )}
  </LovingleSectionShell>
);

// ── ✦ Diaper Avoidance ───────────────────────────────────────────────────────

const AvoidanceCard: React.FC<{ a: any }> = ({ a }) => (
  <div className="lv-card">
    <div className="lv-card-title" style={{ fontSize: '0.95em' }}>{a?.moment || ''}</div>
    {a?.alternative_chosen && (
      <div style={{ marginTop: 4, padding: '4px 10px', background: 'rgba(86, 194, 214, 0.1)', borderLeft: '3px solid var(--teal-600)', borderRadius: 4, fontSize: '0.85em' }}>
        <b style={{ color: 'var(--teal-700)' }}>Instead:</b> {a.alternative_chosen}
      </div>
    )}
    {a?.why_avoided && <div className="lv-card-sig" style={{ marginTop: 6 }}><b>Why:</b> {a.why_avoided}</div>}
    {a?.lifestage && <div className="lv-card-sig" style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>{String(a.lifestage).replace(/_/g, ' ')}</div>}
    {a?.typical_segment && <div className="lv-card-sig" style={{ color: 'var(--ink-3)' }}>Strongest in: {a.typical_segment}</div>}
    <VerbatimChipList items={a?.verbatims} max={3} />
    {typeof a?.data_points === 'number' && (
      <div style={{ marginTop: 6, fontSize: '0.72em', color: 'var(--ink-3)' }}>n = {a.data_points} evidence points</div>
    )}
  </div>
);

export const LovingleDiaperAvoidance: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · When Diapers Are Avoided"
    standfirst={<>The moments parents choose <b>cloth, bare-bottom or nothing</b> instead of a disposable — and what those moments reveal about category boundaries and opportunity.</>}>
    <Zone span={12} title="Avoidance Moments" sub="Not rejection — contextual non-use, often within the same household that buys disposables" delay=".08s">
      <div className="lv-cardgrid">{arr<any>(data?.moments).map((a, i) => <AvoidanceCard key={i} a={a} />)}</div>
    </Zone>
    {arr<string>(data?.summary).length > 0 && (
      <Zone span={12} title="What Avoidance Reveals" delay=".16s">
        <NoteBox items={data.summary} />
      </Zone>
    )}
  </LovingleSectionShell>
);

// ── ✦ Consumer Language ──────────────────────────────────────────────────────

const LanguageCard: React.FC<{ t: any }> = ({ t }) => (
  <div className="lv-card">
    <div className="lv-card-title" style={{ fontSize: '1.0em', color: 'var(--ink)' }}>{t?.term || ''}</div>
    {arr<string>(t?.vernacular_variants).length > 0 && (
      <div style={{ marginTop: 4, fontSize: '0.82em', color: 'var(--ink-2)', fontStyle: 'italic' }}>
        {arr<string>(t.vernacular_variants).join(' · ')}
      </div>
    )}
    {t?.emotional_meaning && (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--rose-dk)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emotional meaning</div>
        <div style={{ fontSize: '0.88em', color: 'var(--ink)' }}>{t.emotional_meaning}</div>
      </div>
    )}
    {t?.functional_meaning && (
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--teal-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Functional meaning</div>
        <div style={{ fontSize: '0.88em', color: 'var(--ink)' }}>{t.functional_meaning}</div>
      </div>
    )}
    {t?.pack_implication && (
      <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(242, 111, 33, 0.06)', borderLeft: '3px solid var(--o-600)', borderRadius: 4 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--o-700)', textTransform: 'uppercase' }}>Pack implication</div>
        <div style={{ fontSize: '0.85em' }}>{t.pack_implication}</div>
      </div>
    )}
    {t?.comms_implication && (
      <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(28, 60, 142, 0.06)', borderLeft: '3px solid var(--ink)', borderRadius: 4 }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase' }}>Comms implication</div>
        <div style={{ fontSize: '0.85em' }}>{t.comms_implication}</div>
      </div>
    )}
    <VerbatimChipList items={t?.verbatims} max={4} />
  </div>
);

export const LovingleConsumerLanguage: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    eyebrow="Lovingle · Consumer Language"
    standfirst={<>The exact words parents use — in English, Hindi and Hinglish — for <b>soft, dry, rash-free, leak-proof, overnight, value</b>. The wording that should appear on pack and in communications.</>}>
    <Zone span={12} title="The Words That Matter" sub="Each term — its emotional weight, functional meaning, and pack/comms implication" delay=".08s">
      <div className="lv-cardgrid">{arr<any>(data?.terms).map((t, i) => <LanguageCard key={i} t={t} />)}</div>
    </Zone>
  </LovingleSectionShell>
);
