/* ============================================================================
   BOOKLET SECTIONS — the 21-section RSPL structure (02 Jul 2026 rework).
   ----------------------------------------------------------------------------
   Each section wears LovingleSectionShell (booklet chrome) and composes the
   BookletBlocks primitives plus the carried Layer-3 renderers (WaveChart,
   ChannelFlow, CrossBrandBars, CrossTab, TwoColumnCompare — re-skinned by the
   .bk-scope token override, not rewritten).

   Every renderer handles three payload states:
     • fresh   — the new template schema
     • stale   — an old-schema cached payload (render what maps, never crash)
     • absent  — not generated yet (no seed fallback for the new registry §9;
                 the BkAbsentState makes that look intentional)

   The retired strategy renderer (LovingleWhitespace) is retained at the bottom
   of this file, unrouted, for a future strategy deliverable.
   ============================================================================ */

import React from 'react';
import { SectionOutput } from '../../types';
import { LovingleSectionShell } from './LovingleSectionShell';
import DataIngestionAnalysis from './DataIngestionAnalysis';
import {
  InsightCardGrid, LabeledCardGroups, toInsightCards, NoteBox, CrossTab,
  WaveChart, ChannelFlow, CrossBrandBars, TwoColumnCompare,
  MatrixQuadrant, SynthesisMoves, sanitiseConsumerText,
} from './blocks/LovingleBlocks';
import {
  QuoteChipGrid, FourBandMatrix, FES_BAND_COLORS, StatCardRow, InsightStrip,
  GapBlockList, PillTagCloud, IconCardGrid, RitualPanel, RegionalSplitCards,
  TierLadder, PerceptionCardGrid, SegmentLensRow, LifestageStepper,
  LifestageLensRow, RegionLensRow, PersonaCardGrid, BkZoneTitle, BkSynthesis,
  BkPoolNote, BkAbsentState, EvidenceShare, sumDp,
  type MatrixBand, type GapItem, type IconCard,
} from './blocks/BookletBlocks';

type Props = { data: any; section?: SectionOutput };
const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : v ? [v] : []);
const str = (v: any): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return v?.title || v?.name || v?.text || '';
};

// ── shared section furniture ─────────────────────────────────────────────────

const Zone: React.FC<{ span?: 5 | 6 | 7 | 12; title?: string; sub?: string; children: React.ReactNode }> =
  ({ span = 12, title, sub, children }) => (
    <section className={`lv-zone lv-col-${span}`} aria-label={title}>
      {title && <BkZoneTitle title={title} sub={sub} />}
      {children}
    </section>
  );

const PoolRow: React.FC<{ note?: string }> = ({ note }) =>
  note ? <div className="lv-col-12"><BkPoolNote note={note} /></div> : null;

const SynthRow: React.FC<{ title?: string; text?: any }> = ({ title = 'What this means', text }) =>
  text ? <div className="lv-col-12"><BkSynthesis title={title} text={text} /></div> : null;

const LensRows: React.FC<{ data: any }> = ({ data }) => (
  <>
    {arr(data?.segment_lens).length > 0 && <div className="lv-col-12"><SegmentLensRow lens={data.segment_lens} /></div>}
    {arr(data?.lifestage_lens).length > 0 && (
      <Zone span={12} title="Lifestage lens" sub="How this read shifts as the baby grows">
        <LifestageLensRow lens={data.lifestage_lens} />
      </Zone>
    )}
    {arr(data?.region_lens).length > 0 && (
      <Zone span={12} title="Region lens" sub="North · West · South · East · Central">
        <RegionLensRow lens={data.region_lens} />
      </Zone>
    )}
  </>
);

// Absent detection — a section with none of its primary payload keys renders
// the intentional "awaiting generation" state (no seed fallback, §9).
const isAbsent = (data: any, keys: string[]): boolean => {
  if (!data || typeof data !== 'object') return true;
  return !keys.some((k) => {
    const v = data[k];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === 'object') return Object.keys(v).length > 0;
    return typeof v === 'string' ? v.trim().length > 0 : !!v;
  });
};

const AbsentSection: React.FC<{ section?: SectionOutput; data: any }> = ({ section, data }) => (
  <LovingleSectionShell section={section} data={data}>
    <div className="lv-col-12"><BkAbsentState title={section?.title} /></div>
  </LovingleSectionShell>
);

// ── shared payload mappers ───────────────────────────────────────────────────

const toBandMatrix = (data: any): MatrixBand[] => {
  const bands = data?.bands && typeof data.bands === 'object' ? data.bands : data;
  const mk = (key: string, label: string): MatrixBand => ({
    label,
    color: FES_BAND_COLORS[key] || 'blue',
    subThemes: arr<any>(bands?.[key]).map((t) => ({
      title: t?.title || t?.headline || '',
      description: t?.description || t?.what_it_means || '',
      met_status: t?.met_status,
      how_met_today: t?.how_met_today,
      data_points: t?.data_points,
      verbatims: arr(t?.verbatims),
    })),
  });
  return [mk('functional', 'Functional'), mk('emotional', 'Emotional'), mk('social', 'Social')]
    .filter((b) => b.subThemes.length);
};

const toGaps = (items: any): GapItem[] =>
  arr<any>(items).map((g) => ({
    title: String(g?.title || g?.gap_title || g?.need || ''),
    description: g?.description || g?.what_it_means || g?.why_now || '',
    signal_terms: arr<string>(g?.signal_terms),
    data_points: g?.data_points,
    verbatims: arr<any>(g?.verbatims || g?.consumer_evidence),
  })).filter((g) => g.title);

const toIconCards = (items: any): IconCard[] =>
  arr<any>(items).map((c) => ({
    title: String(c?.title || c?.headline || ''),
    description: c?.description || c?.what_it_means || '',
    data_points: c?.data_points,
    verbatims: arr<any>(c?.verbatims),
  })).filter((c) => c.title);

// Family-member role cards (sections 02 + 08) — booklet stage-card treatment.
const MemberRoleCards: React.FC<{ roles: any }> = ({ roles }) => {
  const list = arr<any>(roles).filter((r) => r?.member || r?.role_summary);
  if (!list.length) return null;
  const denom = sumDp(list);
  return (
    <div className="bk-stagecards">
      {list.map((r, i) => (
        <div key={i} className="bk-stagecard">
          <div className="bk-stagecard-head">
            <span className="bk-stagecard-stage">{String(r.member || '').replace(/_/g, ' ') || 'Family member'}</span>
            <EvidenceShare n={r.data_points} totalN={denom} />
          </div>
          {r.role_summary && <p className="bk-stagecard-reading">{sanitiseConsumerText(r.role_summary)}</p>}
          {arr<string>(r.daily_tasks).length > 0 && (
            <ul className="bk-stagecard-points">
              {arr<string>(r.daily_tasks).map(str).filter(Boolean).map((t, ti) => <li key={ti}>{sanitiseConsumerText(t)}</li>)}
            </ul>
          )}
          <QuoteChipGrid items={r.verbatims} />
        </div>
      ))}
    </div>
  );
};

// ── 00 · Executive Summary ───────────────────────────────────────────────────
// N1/N2/N3 carry: ≤6 theme-tagged cards, part-ordered, zero verbatims.
// Theme enum re-mapped to the new parts; old cached themes still sort correctly.

const EXEC_ORDER: Record<string, number> = {
  parenting_category: 0, category_dynamics: 0,
  product: 1, product_preferences: 1,
  shopping: 2, shopping_behaviour: 2,
  brand: 3,
};
const EXEC_LABELS = ['Parenting & Category', 'Product', 'Shopping', 'Brand'];
const execIdx = (c: any): number => {
  const t = String(c?.theme || c?.category || '').toLowerCase().trim();
  return t in EXEC_ORDER ? EXEC_ORDER[t] : 4;
};

export const BkExecSummary: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['insights', 'stats', 'north_star'])) return <AbsentSection section={section} data={data} />;
  const insights = arr<any>(data?.insights).slice(0, 6); // N1 — max 6 cards
  // N2 — verbatims never render in the Executive Summary, whatever the payload carries.
  const noQuotes = (cards: any[]) => toInsightCards(cards).map((c) => ({ ...c, verbatims: [] }));
  const groups = EXEC_LABELS.map((label, gi) => ({
    label, tone: 'blue' as const,
    cards: noQuotes(insights.filter((c) => execIdx(c) === gi)),
  })).filter((g) => g.cards.length);
  const leftovers = noQuotes(insights.filter((c) => execIdx(c) === 4));
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>The category-and-consumer read at a glance — parenting behaviour, product, shopping and brand, in that order.</>}>
      <PoolRow note={data?.pool_note} />
      {arr(data?.stats).length > 0 && (
        <Zone span={12} title="The evidence base" sub="At a glance">
          <StatCardRow stats={arr<any>(data.stats).map((s, i) => ({ value: str(s?.stat) || str(s?.value), label: str(s?.label), tone: i === 0 ? 'deep' : 'blue' }))} />
        </Zone>
      )}
      {data?.north_star && (
        <div className="lv-col-12"><InsightStrip lead="The headline:" text={str(data.north_star)} /></div>
      )}
      {(groups.length > 0 || leftovers.length > 0) && (
        <Zone span={12} title="What the report found" sub="Parenting & category · product · shopping · brand">
          {/* N2 — synthesised findings only: no verbatims in the Executive Summary. */}
          <LabeledCardGroups groups={groups} />
          {leftovers.length > 0 && <InsightCardGrid items={leftovers} showVerbatims={false} />}
        </Zone>
      )}
      <SynthRow title="Reading this report" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 01 · Parenting Rituals & Daily Practices (Part A) ────────────────────────

export const BkParentingRituals: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['rituals'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Current rituals and practices toward the baby — bath time, massage, pre- &amp; post-sleep, feeding, play and going out.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The daily ritual map" sub="What parents actually do, occasion by occasion">
        <RitualPanel items={arr<any>(data?.rituals).map((r) => ({
          occasion: r?.occasion, ritual_name: r?.ritual_name, description: r?.description,
          data_points: r?.data_points, verbatims: arr(r?.verbatims),
        }))} />
      </Zone>
      <SynthRow title="What the rituals reveal" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 02 · Role of Family Members in Babycare (Part A) ─────────────────────────

export const BkFamilyRolesBabycare: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['roles'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Mother, father, grandparents, joint-family members and nannies — who does what in daily babycare.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="Roles in daily babycare">
        <MemberRoleCards roles={data?.roles} />
      </Zone>
      <SynthRow title="What the role split means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 03 · Babycare Needs — F/E/S (Part A) ─────────────────────────────────────

export const BkBabycareNeeds: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['bands', 'functional', 'unmet_gaps'])) return <AbsentSection section={section} data={data} />;
  const gaps = toGaps(data?.unmet_gaps);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Functional, emotional and social needs across babycare — met vs unmet, and the current repertoire that meets them: products, services, hacks, home remedies, cultural practices.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The need stack" sub="Functional · Emotional · Social — with met/unmet status">
        <FourBandMatrix bands={toBandMatrix(data)} />
      </Zone>
      {gaps.length > 0 && (
        <Zone span={12} title="Where needs go unmet" sub="The gaps parents talk around">
          <GapBlockList gaps={gaps} />
        </Zone>
      )}
      <SynthRow title="What the need stack means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 04 · How Needs Evolve as Baby Grows (Part A) ─────────────────────────────

export const BkNeedsByLifestage: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['stages', 'lanes'])) return <AbsentSection section={section} data={data} />;
  // stale tolerance: an old journey payload carries `lanes` — map what fits.
  const stages = arr<any>(data?.stages).length
    ? arr<any>(data.stages)
    : arr<any>(data?.lanes).map((l) => ({
        lifestage: l?.lifestage || '', age_band: l?.age_band, headline: l?.headline,
        points: arr<string>(l?.needs), data_points: l?.data_points, verbatims: arr(l?.verbatims),
      }));
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Needs reset at every milestone — newborn → infant → crawler → toddler/potty-training.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="Needs evolution by lifestage">
        <LifestageStepper stages={stages} />
      </Zone>
      <SynthRow title="What moves parents between stages" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 05 · Needs from Baby Diapers — F/E/S (Part B) ────────────────────────────

export const BkDiaperNeedsFes: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['bands', 'functional', 'unmet_gaps'])) return <AbsentSection section={section} data={data} />;
  const gaps = toGaps(data?.unmet_gaps);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>What parents need from the diaper itself — leakage by time of day, skin health, fit, overnight absorbency; peace of mind, guilt, pride, overwhelm; peer validation, brand as signal, expert recos as social currency.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The diaper need stack" sub="Functional · Emotional · Social — met vs unmet, with current solutions">
        <FourBandMatrix bands={toBandMatrix(data)} />
      </Zone>
      {gaps.length > 0 && (
        <Zone span={12} title="Unmet needs" sub="Where the category still falls short">
          <GapBlockList gaps={gaps} />
        </Zone>
      )}
      <LensRows data={data} />
      <SynthRow title="What the diaper need stack means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 06 · Decision-Making Journey (Part C) ────────────────────────────────────

const TRUST_META: Array<{ key: string; label: string; color: 'blue' | 'orange' | 'red' }> = [
  { key: 'HIGH', label: 'Commands trust', color: 'blue' },
  { key: 'MED', label: 'Mixed trust', color: 'orange' },
  { key: 'LOW', label: 'Low trust', color: 'red' },
];

export const BkDecisionJourney: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['discovery_sources', 'triggers', 'journey_factors'])) return <AbsentSection section={section} data={data} />;
  const sources = arr<any>(data?.discovery_sources);
  const trustBands: MatrixBand[] = TRUST_META.map((m) => ({
    label: m.label, color: m.color,
    subThemes: sources
      .filter((s) => String(s?.trust || 'MED').toUpperCase().startsWith(m.key[0]))
      .map((s) => ({
        title: str(s?.source), description: s?.why_trusted || '',
        data_points: s?.data_points, verbatims: arr<any>(s?.verbatims),
      })),
  })).filter((b) => b.subThemes.length);
  const sizes = arr<any>(data?.size_selection);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Where the first brand comes from, which sources command trust, who decides, and what triggers disposable use — and how all of it shifts by segment and as the baby grows.</>}>
      <PoolRow note={data?.pool_note} />
      {trustBands.length > 0 && (
        <Zone span={12} title="Discovery sources & the trust they command" sub="Hospital kit · doctor · influencers · social · search · in-store · family & friends">
          <FourBandMatrix bands={trustBands} />
        </Zone>
      )}
      {data?.decision_maker && (
        <div className="lv-col-12"><InsightStrip lead="The decision-maker:" text={str(data.decision_maker)} /></div>
      )}
      {(toIconCards(data?.triggers).length > 0 || toIconCards(data?.journey_factors).length > 0) && (
        <Zone span={12} title="What triggers and shapes the journey">
          <IconCardGrid columns={[
            { kicker: 'Triggers to disposable use', tone: 'blue', icon: 'trigger', cards: toIconCards(data?.triggers) },
            { kicker: 'What shapes the journey', tone: 'green', icon: 'positive', cards: toIconCards(data?.journey_factors) },
          ]} />
        </Zone>
      )}
      {sizes.length > 0 && (
        <Zone span={12} title="Size selection by lifestage" sub="NB / XS / S / M / L and beyond">
          <div className="lv-xtab">
            <table className="lv-flat-table">
              <thead><tr><th>Size</th><th>When it's chosen</th></tr></thead>
              <tbody>
                {sizes.map((s, i) => (
                  <tr key={i}><td><b>{str(s?.size)}</b></td><td>{sanitiseConsumerText(s?.lifestage_note || '')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Zone>
      )}
      <LensRows data={data} />
      <SynthRow title="What the journey means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 07 · Usage Occasions & Patterns (Part C) ─────────────────────────────────

export const BkUsageOccasions: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['occasions', 'format_patterns', 'avoided_situations', 'seasonality'])) return <AbsentSection section={section} data={data} />;
  const seasonal = data?.seasonality || {};
  const monthly = arr<number>(seasonal?.monthly);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>When diapers are worn — night, daytime at home, travel, daycare, outings — which formats own which moment, the seasonal rhythm, and the situations where diapers are avoided.</>}>
      <PoolRow note={data?.pool_note} />
      {arr(data?.occasions).length > 0 && (
        <Zone span={12} title="Occasions of use" sub="Night · day at home · travel · daycare · outings">
          <RitualPanel items={arr<any>(data.occasions).map((o) => ({
            occasion: o?.ritual_name || String(o?.occasion || '').replace(/_/g, ' '),
            description: o?.description, data_points: o?.data_points, verbatims: arr(o?.verbatims),
          }))} />
        </Zone>
      )}
      {(toIconCards(data?.format_patterns).length > 0 || toIconCards(data?.avoided_situations).length > 0) && (
        <Zone span={12} title="Formats & avoidance" sub="Cloth · reusables · disposables · tape vs pant — and where diapers are skipped">
          <IconCardGrid columns={[
            { kicker: 'What & when — formats', tone: 'blue', icon: 'trigger', cards: toIconCards(data?.format_patterns) },
            { kicker: 'Where diapers are avoided', tone: 'red', icon: 'barrier', cards: toIconCards(data?.avoided_situations) },
          ]} />
        </Zone>
      )}
      {(seasonal?.narrative || monthly.length >= 2) && (
        <Zone span={12} title="Seasonality" sub="The 12-month conversation rhythm">
          {monthly.length >= 2 && <WaveChart monthly={monthly} />}
          {seasonal?.narrative && <p className="bk-stagecard-reading" style={{ marginTop: 10 }}>{sanitiseConsumerText(str(seasonal.narrative))}</p>}
          {/* N9 — social listening ≠ retail sales; the data-source note carries. */}
          <BkPoolNote note={str(seasonal?.data_source_note)
            || 'Data source: social listening corpus (consumer conversations, reviews and social posts). Conversation volume reflects online posting patterns, which may differ from retail sales patterns.'} />
        </Zone>
      )}
      <LensRows data={data} />
      <SynthRow title="What usage patterns reveal" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 08 · Family Roles in Diaper Use & Purchase (Part C) ──────────────────────

export const BkFamilyRolesDiapering: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['roles', 'tensions', 'alignments'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>The father's growing role, co-parenting, and where the extended family — grandparents, other family, nannies — creates tension vs alignment around diapers.</>}>
      <PoolRow note={data?.pool_note} />
      {arr(data?.roles).length > 0 && (
        <Zone span={12} title="Who does what — diaper use & purchase">
          <MemberRoleCards roles={data?.roles} />
        </Zone>
      )}
      {(toIconCards(data?.tensions).length > 0 || toIconCards(data?.alignments).length > 0) && (
        <Zone span={12} title="Extended family — tension vs alignment">
          <IconCardGrid columns={[
            { kicker: 'Where family creates tension', tone: 'red', icon: 'barrier', cards: toIconCards(data?.tensions) },
            { kicker: 'Where family aligns', tone: 'green', icon: 'positive', cards: toIconCards(data?.alignments) },
          ]} />
        </Zone>
      )}
      <SynthRow title="What the family dynamic means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 09 · Product Features & Expected Benefits (Part D) ───────────────────────

export const BkFeaturesBenefits: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['tiers', 'drivers'])) return <AbsentSection section={section} data={data} />;
  // stale tolerance: an old attribute_drivers payload carries `drivers` with tier tags.
  const tiers = data?.tiers && typeof data.tiers === 'object' ? data.tiers : {
    must_haves: arr<any>(data?.drivers).filter((d) => d?.tier === 'must_have').map((d) => ({ feature: d?.attribute, why: d?.insight, data_points: d?.data_points, verbatims: arr(d?.verbatims) })),
    good_to_haves: arr<any>(data?.drivers).filter((d) => (d?.tier || 'good_to_have') === 'good_to_have').map((d) => ({ feature: d?.attribute, why: d?.insight, data_points: d?.data_points, verbatims: arr(d?.verbatims) })),
    delighters: arr<any>(data?.drivers).filter((d) => d?.tier === 'delighter').map((d) => ({ feature: d?.attribute, why: d?.insight, data_points: d?.data_points, verbatims: arr(d?.verbatims) })),
  };
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>The feature hierarchy — must-haves, good-to-haves and delighters — with tape-vs-pant, lifestage and day-vs-night specificity.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The feature ladder" sub="Must-Have → Good-to-Have → Delighter">
        <TierLadder tiers={tiers} />
      </Zone>
      <LensRows data={data} />
      <SynthRow title="What the feature hierarchy means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 10 · Who Buys (Part E) ───────────────────────────────────────────────────

export const BkShopperRoles: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['cards', 'headline_read'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Buyer vs decision-maker — same person? How mother and father roles divide at the point of purchase.</>}>
      <PoolRow note={data?.pool_note} />
      {data?.headline_read && (
        <div className="lv-col-12"><InsightStrip lead="The short answer:" text={str(data.headline_read)} /></div>
      )}
      {arr(data?.cards).length > 0 && (
        <Zone span={12} title="How buying roles divide">
          <InsightCardGrid items={toInsightCards(data.cards)} />
        </Zone>
      )}
      <SynthRow title="What the buyer split means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 11 · Purchase Channels & Choice Drivers (Part E) ─────────────────────────

export const BkChannelDynamics: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['channels', 'choice_drivers', 'nodes'])) return <AbsentSection section={section} data={data} />;
  // Carried 2-row physical/digital channel renderer, mapped to the new schema
  // (stale `nodes` payloads pass straight through).
  const nodes = arr<any>(data?.channels).length
    ? arr<any>(data.channels).map((c) => ({
        node: str(c?.channel), share: typeof c?.share === 'number' ? c.share : undefined,
        maps_to_pack: c?.frequency_note,
        note: [c?.role, c?.urgency_vs_planned].map(str).filter(Boolean).join(' · '),
        verbatims: arr(c?.verbatims),
      }))
    : arr<any>(data?.nodes);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>E-commerce vs quick-commerce vs pharmacy vs modern trade vs kirana vs D2C — what decides where a parent buys, and how the choice shifts by segment and baby age.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The channel map" sub="Urgency vs planned · what each channel is for">
        <ChannelFlow nodes={nodes} flowNotes={arr(data?.flow_notes)} />
      </Zone>
      {toIconCards(data?.choice_drivers).length > 0 && (
        <Zone span={12} title="Channel choice drivers" sub="Speed · price · pack size · availability · trust · loyalty offers · occasion">
          <IconCardGrid columns={[
            { kicker: 'What decides where to buy', tone: 'blue', icon: 'trigger', cards: toIconCards(data?.choice_drivers) },
          ]} />
        </Zone>
      )}
      {arr(data?.shifts).length > 0 && (
        <Zone span={12} title="Preference shifts" sub="By segment, channel, baby age and occasion">
          <NoteBox items={arr<any>(data.shifts).map((s) => [str(s?.title), str(s?.description)].filter(Boolean).join(' — '))} />
        </Zone>
      )}
      <LensRows data={data} />
      <SynthRow title="What channel behaviour means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 12 · Brand Landscape — Competition Understanding (Part F) ────────────────

// Trial/repeat/switching items — arrays pass through; legacy "·"-joined cell
// strings split into items. Keep the FIRST 3 per stack: item-level omission,
// never mid-sentence truncation (N6 governs verbatims, not analytical fragments).
const toDriverItems = (v: any): string[] => {
  const list = Array.isArray(v) ? v : String(v ?? '').split(/\s*(?:·|\||;)\s*/);
  return list.map((x) => str(x).trim()).filter(Boolean).slice(0, 3);
};

const DRIVER_STACKS: Array<{ label: string; pick: (b: any) => any }> = [
  { label: 'Drives trial', pick: (b) => b?.trial_drivers },
  { label: 'Drives repeat', pick: (b) => b?.repeat_drivers },
  { label: 'Switching', pick: (b) => b?.switching ?? b?.switch_read },
];

const BrandDriverCards: React.FC<{ brands: any[] }> = ({ brands }) => {
  const cards = brands.map((b) => ({
    brand: str(b?.brand),
    stacks: DRIVER_STACKS
      .map((s, si) => ({ label: s.label, si, items: toDriverItems(s.pick(b)) }))
      .filter((s) => s.items.length),
  })).filter((c) => c.brand && c.stacks.length);
  if (!cards.length) return null;
  return (
    <div className="bk-drivercards">
      {cards.map((c, i) => (
        <div key={i} className="bk-drivercard">
          <div className="bk-drivercard-brand">{c.brand}</div>
          {c.stacks.map((s) => (
            <div key={s.si} className={`bk-driverstack bk-driverstack-${s.si}`}>
              <div className="bk-driverstack-label">{s.label}</div>
              <ul>{s.items.map((it, ii) => <li key={ii}>{sanitiseConsumerText(it)}</li>)}</ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const BkCompetitiveLandscape: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['brands', 'sov'])) return <AbsentSection section={section} data={data} />;
  const brands = arr<any>(data?.brands);
  const sov = arr<any>(data?.sov).length
    ? arr<any>(data.sov)
    : brands.map((b) => ({ brand: b?.brand, share_pct: b?.share_of_voice?.share_pct })).filter((s) => typeof s.share_pct === 'number');
  const lovingleSov = sov.find((s) => String(s?.brand || '').toLowerCase() === 'lovingle');
  const crossBrands = brands.map((b) => ({
    brand: b?.brand,
    attribute_scale: arr<any>(b?.rating_on_drivers).length
      ? arr<any>(b.rating_on_drivers).map((r) => ({ attribute: str(r?.driver), score_0_5: r?.score_0_5 }))
      : arr<any>(b?.attribute_scale),
  }));
  const hasDrivers = brands.some((b) => DRIVER_STACKS.some((s) => toDriverItems(s.pick(b)).length));
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Share of voice, brand perception and the visual &amp; verbal cues of mass vs premium — plus what drives trial, repeat and switching across the set.</>}>
      <PoolRow note={data?.pool_note} />
      {(sov.length > 0 || lovingleSov) && (
        <Zone span={12} title="Share of voice" sub="Who owns the conversation">
          {lovingleSov && typeof lovingleSov.share_pct === 'number' && (
            <div className="lv-sovcallout" style={{ marginBottom: 12 }}>
              <span className="lv-sovcallout-big">{lovingleSov.share_pct < 1 ? '<1%' : `${lovingleSov.share_pct}%`}</span>
              <span className="lv-sovcallout-body">Lovingle's share of the category conversation — the size of the visibility gap the rest of this section explains.</span>
            </div>
          )}
          <div>
            {sov.slice().sort((a, b) => (b?.share_pct || 0) - (a?.share_pct || 0)).map((s, i) => {
              const pct = typeof s?.share_pct === 'number' ? s.share_pct : 0;
              const mentions = typeof s?.mentions === 'number' ? s.mentions : undefined;
              const subOnePercent = pct < 1 && (mentions ?? 0) > 0;
              const label = typeof s?.share_pct === 'number' ? (subOnePercent ? '<1%' : `${pct}%`) : '';
              const title = mentions != null ? `${mentions} mention${mentions === 1 ? '' : 's'}` : undefined;
              return (
                <div key={i} className="lv-attr" title={title}>
                  <span className="lv-attr-name">{str(s?.brand)}</span>
                  <span className="lv-attr-track"><span style={{ width: `${Math.min(100, Math.max(1, pct))}%` }} /></span>
                  <span className="lv-attr-score">{label}</span>
                </div>
              );
            })}
          </div>
        </Zone>
      )}
      {data?.selection_read && (
        <div className="lv-col-12"><InsightStrip lead="How brand selection happens:" text={str(data.selection_read)} /></div>
      )}
      {brands.length > 0 && (
        <Zone span={12} title="Brand perception" sub="Associations, and the cues that signal mass vs premium">
          <PerceptionCardGrid brands={brands.map((b) => ({
            brand: b?.brand, perception: b?.perception || b?.positioning_summary, cues: b?.cues,
            data_points: b?.data_points, verbatims: arr(b?.verbatims),
          }))} />
        </Zone>
      )}
      {crossBrands.filter((b) => arr(b.attribute_scale).length).length >= 2 && (
        <Zone span={12} title="Brand rating on key category drivers" sub="0–5, cross-brand">
          <CrossBrandBars brands={crossBrands} />
        </Zone>
      )}
      {hasDrivers && (
        <Zone span={12} title="Trial · repeat · switching" sub="What moves parents toward, back to, and away from each brand">
          <BrandDriverCards brands={brands} />
        </Zone>
      )}
      <SynthRow title="What the landscape means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 13 · The Lovingle Journey (Part F) ───────────────────────────────────────
// "Lovingle" belongs in this section's CONTENT — N8 strips it from chrome only.

export const BkLovingleJourney: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['triggers', 'barriers', 'working'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>What triggered Lovingle usage, what holds back aware non-triers — the rash / skin-safety reassurance cluster — and what is working among triers.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The Lovingle funnel in consumer voice">
        <IconCardGrid columns={[
          { kicker: 'What triggered usage', tone: 'blue', icon: 'trigger', cards: toIconCards(data?.triggers) },
          { kicker: 'Barriers — aware non-triers', tone: 'red', icon: 'barrier', cards: toIconCards(data?.barriers) },
          { kicker: "What's working among triers", tone: 'green', icon: 'positive', cards: toIconCards(data?.working) },
        ]} />
      </Zone>
      <SynthRow title="What the Lovingle journey means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 14 · Pricing (Part G) ────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = { mass: 'Mass', mid_premium: 'Mid-Premium', premium: 'Premium' };

export const BkPricingDynamics: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['price_awareness', 'ceilings', 'promotions', 'premiumisation_triggers'])) return <AbsentSection section={section} data={data} />;
  const ceilings = arr<any>(data?.ceilings);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Is price-per-diaper math present? How discounts and promotions work on this buyer, where the psychological ceilings sit by segment and baby age, and what unlocks a step up.</>}>
      <PoolRow note={data?.pool_note} />
      {arr(data?.price_awareness).length > 0 && (
        <Zone span={12} title="Price-per-diaper awareness" sub="How buyers do the math — and how much it decides">
          <InsightCardGrid items={toInsightCards(data.price_awareness)} />
        </Zone>
      )}
      {ceilings.length > 0 && (
        <Zone span={12} title="Psychological price ceilings" sub="By segment and baby age">
          <StatCardRow stats={ceilings.map((c) => ({
            value: str(c?.ceiling_inr) || '—',
            label: SEGMENT_LABELS[String(c?.segment || '').toLowerCase()] || str(c?.segment) || 'Segment',
            tone: 'deep' as const,
          }))} />
          {ceilings.map((c, i) => (
            <div key={i} style={{ marginTop: 10 }}>
              {(c?.baby_age_note || c?.notes) && (
                <InsightStrip lead={`${SEGMENT_LABELS[String(c?.segment || '').toLowerCase()] || str(c?.segment)}:`}
                  text={[str(c?.baby_age_note), str(c?.notes)].filter(Boolean).join(' ')} />
              )}
              <QuoteChipGrid items={c?.verbatims} cols={2} />
            </div>
          ))}
        </Zone>
      )}
      {(toIconCards(data?.promotions).length > 0 || toIconCards(data?.premiumisation_triggers).length > 0) && (
        <Zone span={12} title="Promotions & premiumisation">
          <IconCardGrid columns={[
            { kicker: 'Promo types expected', tone: 'blue', icon: 'trigger', cards: toIconCards(data?.promotions) },
            { kicker: 'Premiumisation triggers', tone: 'green', icon: 'positive', cards: toIconCards(data?.premiumisation_triggers) },
          ]} />
        </Zone>
      )}
      <LensRows data={data} />
      <SynthRow title="What pricing behaviour means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 15 · Differences by Region (Part H) ──────────────────────────────────────

export const BkRegionalDifferences: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['regions'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>North, West, South, East and Central India — vocabulary, drivers, trust, signals and climate, region by region.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The five-region read">
        <RegionalSplitCards regions={arr<any>(data?.regions).map((r) => ({
          region: str(r?.region) || str(r?.name), summary: r?.summary || r?.note,
          groups: arr<any>(r?.groups), data_points: r?.data_points, verbatims: arr(r?.verbatims),
        }))} />
      </Zone>
      <SynthRow title="What geography changes" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 16 · First-Time vs Second-Time Moms (Part H) ─────────────────────────────

export const BkFirstVsSecondTimeMoms: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['first_time', 'second_time', 'compare'])) return <AbsentSection section={section} data={data} />;
  const ft = data?.first_time || {};
  const st = data?.second_time || {};
  const compare = arr<any>(data?.compare);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Diaper usage, drivers and brands — first-time vs second-time mothers, compared.</>}>
      <PoolRow note={data?.pool_note} />
      {(arr(ft?.points).length > 0 || arr(st?.points).length > 0) && (
        <Zone span={12} title="Two different buyers">
          <TwoColumnCompare
            left={{ title: 'First-time moms', tag: str(ft?.headline), items: arr<string>(ft?.points).map(str).filter(Boolean) }}
            right={{ title: 'Second-time moms', tag: str(st?.headline), items: arr<string>(st?.points).map(str).filter(Boolean) }}
            midLabel="vs"
          />
          <QuoteChipGrid items={[...arr(ft?.verbatims), ...arr(st?.verbatims)]} cols={2} />
        </Zone>
      )}
      {compare.length > 0 && (
        <Zone span={12} title="Side-by-side" sub="Usage · drivers · brands">
          <CrossTab matrix={{
            columns: ['First-time', 'Second-time'],
            rows: compare.map((c) => ({ label: str(c?.dimension), cells: [str(c?.first_time), str(c?.second_time)] })),
          }} />
        </Zone>
      )}
      <SynthRow title="What parity changes" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 17 · Consumer Vocabulary (Part H) ────────────────────────────────────────
// Canonical fields by construction: emotional_meaning + pack_implication.
// §8.2 carve-out: TERM cells render unsanitised (the word is the object of
// analysis); every other cell stays sanitised.

export const BkConsumerVocabulary: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['terms', 'clusters', 'trade_terms'])) return <AbsentSection section={section} data={data} />;
  const terms = arr<any>(data?.terms).slice()
    .sort((a, b) => (b?.corpus_frequency || 0) - (a?.corpus_frequency || 0));
  const trade = arr<any>(data?.trade_terms);
  const termQuotes = terms.flatMap((t) => arr<any>(t?.verbatims)).slice(0, 8);
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>The exact language consumers use for the category, formats, benefits and packs — ranked by how often it actually appears in the corpus.</>}>
      <PoolRow note={data?.pool_note} />
      {terms.length > 0 && (
        <Zone span={12} title="The vocabulary map" sub="Ranked by corpus frequency, most-used first">
          <div className="lv-xtab">
            <table className="lv-flat-table">
              <thead><tr><th>Term</th><th>Language</th><th>Functional meaning</th><th>Emotional meaning</th><th>Pack implication</th><th>Freq</th></tr></thead>
              <tbody>
                {terms.map((t, i) => (
                  <tr key={i}>
                    {/* carve-out: the term itself renders as written */}
                    <td><b>{str(t?.term)}</b></td>
                    <td>{str(t?.language)}</td>
                    <td>{sanitiseConsumerText(str(t?.functional_meaning))}</td>
                    <td>{sanitiseConsumerText(str(t?.emotional_meaning))}</td>
                    <td>{sanitiseConsumerText(str(t?.pack_implication))}</td>
                    <td>{typeof t?.corpus_frequency === 'number' ? t.corpus_frequency.toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Zone>
      )}
      {arr(data?.clusters).length > 0 && (
        <Zone span={12} title="Vocabulary clusters">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {arr<any>(data.clusters).map((c, i) => (
              <PillTagCloud key={i} title={str(c?.label)} items={arr(c?.terms)} />
            ))}
          </div>
        </Zone>
      )}
      {trade.length > 0 && (
        <Zone span={12} title="Trade vocabulary — framed analysis" sub="Retail/trade terms analysed as words, not used as consumer voice (N4)">
          <div className="lv-xtab">
            <table className="lv-flat-table">
              <thead><tr><th>Term</th><th>Who uses it</th><th>Frequency in consumer voice</th><th>What consumers say instead</th></tr></thead>
              <tbody>
                {trade.map((t, i) => (
                  <tr key={i}>
                    {/* carve-out: the trade term is the object of analysis */}
                    <td><b>{str(t?.term)}</b></td>
                    <td>{str(t?.who_uses)}</td>
                    <td>{str(t?.consumer_frequency_note)}</td>
                    <td>{sanitiseConsumerText(str(t?.consumer_alternative))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Zone>
      )}
      {termQuotes.length > 0 && (
        <Zone span={12} title="The words in the wild">
          <QuoteChipGrid items={termQuotes} cols={2} />
        </Zone>
      )}
      <SynthRow title="What the language means" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 18 · Key Search Words on Shopping Apps & Websites (Part H) ───────────────

export const BkShoppingSearchTerms: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['clusters'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>Search keyword clusters as observed on shopping platforms — the literal strings parents type.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="Search clusters" sub="The italic lines are literal shopping-platform search terms">
        <GapBlockList gaps={toGaps(data?.clusters)} />
      </Zone>
      <SynthRow title="What search language reveals" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 19 · Consumer Personas (Part H) ──────────────────────────────────────────

export const BkConsumerPersonas: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['personas'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}
      standfirst={<>At most five living portraits — each sized against the conversation pool, with channel, segment, SKU, behaviour and locus of control.</>}>
      <PoolRow note={data?.pool_note} />
      <Zone span={12} title="The persona set" sub="Max 5 · sized · locus-of-control tagged · one full-text quote each">
        <PersonaCardGrid personas={arr<any>(data?.personas)} />
      </Zone>
      <LensRows data={data} />
      <SynthRow title="What the personas anchor" text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ── 20 · Data Foundation & Methodology (Appendix) ────────────────────────────
// The DataIngestionAnalysis evidence ledger, LIVE-DERIVED from the ingestion
// registry + the latest evidence graph (05 Jul rebuild — no static snapshot),
// re-chromed inside the booklet shell. Retained as an appendix beyond the
// structure doc (§10.2 — Venkat decision); it answers N9's data-source-clarity
// concern and carries report credibility.

export const BkDataFoundation: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}>
    <div className="lv-col-12"><DataIngestionAnalysis /></div>
  </LovingleSectionShell>
);

// ── Generic fallback — any unrouted section id renders safely ────────────────

export const BkGenericSection: React.FC<Props> = ({ data, section }) => {
  if (isAbsent(data, ['cards', 'insights'])) return <AbsentSection section={section} data={data} />;
  return (
    <LovingleSectionShell section={section} data={data}>
      <Zone span={12}>
        <InsightCardGrid items={toInsightCards(data?.cards || data?.insights)} />
      </Zone>
      <SynthRow text={data?.synthesis} />
    </LovingleSectionShell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// RETIRED — strategy layer (absent from the RSPL structure doc §8.3).
// Kept in-tree, UNROUTED, for a future strategy deliverable. Do not delete.
// ═════════════════════════════════════════════════════════════════════════════

export const LovingleWhitespace: React.FC<Props> = ({ data, section }) => (
  <LovingleSectionShell section={section} data={data}
    standfirst={<>The decision-ready payoff: white-space opportunities plotted by <b>effort × impact</b>, and the moves that ladder back to price–pack architecture.</>}>
    <Zone span={12} title="Opportunity Map" sub="Effort × impact">
      <MatrixQuadrant xAxis={data?.xAxis} yAxis={data?.yAxis} points={arr(data?.points)} />
    </Zone>
    <Zone span={12} title="Recommended Moves" sub="Portfolio · price-mix · communication">
      <SynthesisMoves moves={arr(data?.moves)} />
    </Zone>
  </LovingleSectionShell>
);
