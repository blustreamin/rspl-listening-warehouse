
// ============================================================================
// BABY DIAPERS (LOVINGLE) RENDERERS
// Matches the warehouse visual language: Inter, rounded cards, indigo/slate
// accents, small italic verbatim chips. Exports one component per uiSpec; the
// dispatcher in ModernSectionRenderer routes baby-diapers sections here.
// ============================================================================

import React from 'react';

const arr = (v: any): any[] => Array.isArray(v) ? v : (v ? [v] : []);
const str = (v: any): string => typeof v === 'string' ? v : (v?.headline || v?.text || v?.name || '');

// --- Shared atoms -----------------------------------------------------------

const Verbatim: React.FC<{ v: any; tone?: string }> = ({ v, tone = 'indigo' }) => {
  const text = v?.quote || (typeof v === 'string' ? v : '');
  if (!text) return null;
  const tones: Record<string, string> = {
    indigo: 'text-indigo-800 bg-indigo-50 border-indigo-100',
    rose: 'text-rose-800 bg-rose-50 border-rose-100',
    amber: 'text-amber-800 bg-amber-50 border-amber-100',
    emerald: 'text-emerald-800 bg-emerald-50 border-emerald-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
  };
  return (
    <div className={`text-[10px] italic px-2.5 py-2 rounded-lg border ${tones[tone] || tones.indigo}`}>
      <div>“{text}”</div>
      {(v?.source || v?.consumer) && (
        <div className="flex gap-2 mt-1 not-italic text-[9px] opacity-80">
          {v?.source && <span className="font-bold">{v.source}</span>}
          {v?.source && v?.consumer && <span>·</span>}
          {v?.consumer && <span>{v.consumer}</span>}
        </div>
      )}
    </div>
  );
};

const VerbatimList = ({ items, tone, max = 3 }: { items: any[]; tone?: string; max?: number }) => {
  const list = arr(items).slice(0, max);
  if (!list.length) return null;
  return <div className="space-y-1.5">{list.map((v, i) => <Verbatim key={i} v={v} tone={tone} />)}</div>;
};

const Pts = ({ n }: { n?: number }) => n ? (
  <span className="text-[8px] font-mono text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap flex-shrink-0">{n} pts</span>
) : null;

const SubHeader = ({ label, color = 'slate' }: { label: string; color?: string }) => {
  const dot: Record<string, string> = { slate: 'bg-slate-500', indigo: 'bg-indigo-500', rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500' };
  return (
    <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3 mt-1">
      <span className={`w-2 h-2 rounded-full ${dot[color] || 'bg-slate-500'}`}></span>{label}
    </h5>
  );
};

const InsightCard: React.FC<{ c: any; tone?: string }> = ({ c, tone = 'indigo' }) => {
  const tones: Record<string, any> = {
    indigo: { bg: 'bg-indigo-50/40', border: 'border-indigo-100', text: 'text-indigo-900', dot: 'bg-indigo-500' },
    rose: { bg: 'bg-rose-50/40', border: 'border-rose-100', text: 'text-rose-900', dot: 'bg-rose-500' },
    amber: { bg: 'bg-amber-50/40', border: 'border-amber-100', text: 'text-amber-900', dot: 'bg-amber-500' },
    emerald: { bg: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-900', dot: 'bg-emerald-500' },
    slate: { bg: 'bg-slate-50/60', border: 'border-slate-200', text: 'text-slate-800', dot: 'bg-slate-500' },
    purple: { bg: 'bg-purple-50/40', border: 'border-purple-100', text: 'text-purple-900', dot: 'bg-purple-500' },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`${t.bg} border ${t.border} rounded-xl p-4 space-y-2.5`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div className={`w-1.5 h-1.5 rounded-full ${t.dot} mt-1.5 flex-shrink-0`}></div>
          <div>
            <div className={`text-xs font-bold ${t.text} leading-snug`}>{str(c.headline)}</div>
            {c.what_it_means && <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{c.what_it_means}</div>}
          </div>
        </div>
        <Pts n={c.data_points} />
      </div>
      {arr(c.verbatims).length > 0 && <div className="pl-3.5"><VerbatimList items={c.verbatims} tone={tone} /></div>}
    </div>
  );
};

const CardGrid = ({ items, tone }: { items: any[]; tone?: string }) => (
  <div className="grid md:grid-cols-2 gap-3">
    {arr(items).map((c, i) => <InsightCard key={i} c={c} tone={tone} />)}
  </div>
);

const Bullets = ({ items }: { items: any[] }) => {
  const list = arr(items).map(str).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className="space-y-1.5 mt-3">
      {list.map((b, i) => (
        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-2 leading-relaxed">
          <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>{b}
        </li>
      ))}
    </ul>
  );
};

// --- 1 / 5 / 6 / 7 — generic insight-card sections --------------------------

export const BabyCardsRenderer = ({ data }: { data: any }) => (
  <div className="space-y-3"><CardGrid items={data?.cards} tone="indigo" /></div>
);

export const BabyBehaviourRenderer = ({ data }: { data: any }) => (
  <div className="space-y-4">
    <SubHeader label="Occasions of Use" color="indigo" />
    <CardGrid items={data?.occasions} tone="indigo" />
    <Bullets items={data?.usage_notes} />
  </div>
);

export const BabyNeedsRenderer = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div><SubHeader label="Functional Needs" color="indigo" /><CardGrid items={data?.functional} tone="indigo" /></div>
    <div><SubHeader label="Emotional Needs" color="rose" /><CardGrid items={data?.emotional} tone="rose" /></div>
    <div><SubHeader label="Social Needs" color="amber" /><CardGrid items={data?.social} tone="amber" /></div>
  </div>
);

export const BabyDecisionRenderer = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div><SubHeader label="Buyer vs Decider" color="indigo" /><CardGrid items={data?.buyer_vs_decider} tone="indigo" /></div>
    <div><SubHeader label="Support-System Roles" color="purple" /><CardGrid items={data?.support_system_roles} tone="purple" /></div>
    <div><SubHeader label="Discovery & Trust Hierarchy" color="emerald" /><CardGrid items={data?.discovery_hierarchy} tone="emerald" /></div>
  </div>
);

// --- 2 — THE BABY'S WORLD JOURNEY (the spine) -------------------------------

const STAGE_COLORS = ['bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

export const BabyJourneyRenderer = ({ data }: { data: any }) => {
  const lanes = arr(data?.lanes);
  return (
    <div className="space-y-5">
      {/* Timeline rail */}
      <div className="hidden lg:flex items-center gap-1 px-1">
        {lanes.map((l, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center flex-1">
              <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[i % STAGE_COLORS.length]} ring-4 ring-white shadow`}></div>
              <div className="text-[9px] font-bold text-slate-500 mt-1 text-center leading-tight">{l.age_band}</div>
            </div>
            {i < lanes.length - 1 && <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-200 to-slate-200 -mt-4"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Lanes */}
      <div className="space-y-3">
        {lanes.map((l, i) => {
          const accent = STAGE_COLORS[i % STAGE_COLORS.length];
          return (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <div className={`w-2.5 h-2.5 rounded-full ${accent}`}></div>
                <div className="flex-1">
                  <span className="text-xs font-extrabold text-slate-800">{l.headline}</span>
                  <span className="text-[10px] text-slate-400 ml-2 font-mono">{l.age_band}</span>
                </div>
                {l.size_signal && <span className="text-[9px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{l.size_signal}</span>}
              </div>
              <div className="p-4 grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Needs</div>
                  <Bullets items={l.needs} />
                  {l.mindset && (
                    <div className="mt-2 text-[10px] text-slate-600 italic bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      Mindset: {l.mindset}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Switch Triggers</div>
                  <Bullets items={l.switch_triggers} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Evidence</div>
                  <VerbatimList items={l.verbatims} tone="indigo" max={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {arr(data?.spine_summary).length > 0 && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
          <SubHeader label="The Spine — What Moves Parents" color="indigo" />
          <Bullets items={data.spine_summary} />
        </div>
      )}
    </div>
  );
};

// --- Cross-tab primitive (style matrix + interaction grids) -----------------

const CrossTab = ({ t }: { t: any }) => {
  const cols = arr(t?.columns).map(str);
  const rows = arr(t?.rows);
  if (!cols.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left font-bold text-slate-500 px-3 py-2 border-b border-slate-200"></th>
            {cols.map((c, i) => <th key={i} className="text-left font-bold text-slate-700 px-3 py-2 border-b border-slate-200">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-slate-50/40' : ''}>
              <td className="font-bold text-slate-500 px-3 py-2 border-b border-slate-100 align-top">{str(r.label)}</td>
              {arr(r.cells).map((cell, ci) => <td key={ci} className="text-slate-600 px-3 py-2 border-b border-slate-100 align-top">{str(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- 3 — DIAPER STYLES & FORMAT INTERACTION (style axis) --------------------

export const BabyStylesRenderer = ({ data }: { data: any }) => (
  <div className="space-y-5">
    <SubHeader label="Style Profiles" color="indigo" />
    <div className="grid md:grid-cols-2 gap-3">
      {arr(data?.styles).map((s, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 capitalize">{str(s.style).replace(/_/g, ' ')}</span>
            <span className="text-[9px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">{s.lifestage_skew}</span>
          </div>
          <div className="text-[11px] text-slate-600"><span className="font-bold text-slate-500">Owns:</span> {s.typical_occasion}</div>
          <div className="text-[11px] text-rose-700"><span className="font-bold">Challenge:</span> {s.key_challenge}</div>
          {arr(s.switch_triggers).length > 0 && (
            <div className="text-[10px] text-slate-500"><span className="font-bold uppercase tracking-wider">Switch:</span> {arr(s.switch_triggers).map(str).join(' · ')}</div>
          )}
          <VerbatimList items={s.verbatims} tone="slate" max={1} />
        </div>
      ))}
    </div>
    <div>
      <SubHeader label="How Styles Interact in a Household" color="emerald" />
      <CrossTab t={data?.interaction_matrix} />
      <Bullets items={data?.interaction_notes} />
    </div>
  </div>
);

// --- 4 — PACK ARCHITECTURE (pack axis, distinct from style) -----------------

const PackCard: React.FC<{ p: any; tone: string }> = ({ p, tone }) => {
  const tones: Record<string, string> = { amber: 'border-amber-200 bg-amber-50/40', indigo: 'border-indigo-200 bg-indigo-50/40' };
  return (
    <div className={`border rounded-xl p-3.5 space-y-2 ${tones[tone] || tones.indigo}`}>
      <div className="text-xs font-extrabold text-slate-800 capitalize">{str(p.pack).replace(/_/g, ' ').replace('non laddi ', '₹')}</div>
      <div className="text-[10px] text-slate-600"><span className="font-bold">Who:</span> {p.who_buys}</div>
      <div className="text-[10px] text-slate-600"><span className="font-bold">Occasion:</span> {p.occasion}</div>
      <div className="text-[10px] text-slate-600"><span className="font-bold">Channel:</span> {p.channel_context}</div>
      <div className="text-[10px] text-indigo-700 italic">{p.role_in_portfolio}</div>
      <VerbatimList items={p.verbatims} tone="slate" max={1} />
    </div>
  );
};

export const BabyPackRenderer = ({ data }: { data: any }) => (
  <div className="space-y-5">
    <div className="grid md:grid-cols-2 gap-5">
      <div>
        <SubHeader label="Laddi — single / twin" color="amber" />
        <div className="space-y-3">{arr(data?.laddi).map((p, i) => <PackCard key={i} p={p} tone="amber" />)}</div>
      </div>
      <div>
        <SubHeader label="Non-Laddi — ₹99 / ₹399 / ₹999" color="indigo" />
        <div className="space-y-3">{arr(data?.non_laddi).map((p, i) => <PackCard key={i} p={p} tone="indigo" />)}</div>
      </div>
    </div>
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <SubHeader label="Value-Ladder Dynamics" color="slate" />
      <Bullets items={data?.ladder_dynamics} />
    </div>
  </div>
);

// --- 8 — PRODUCT ATTRIBUTE DRIVERS ------------------------------------------

const TIER_LABEL: Record<string, { label: string; tone: string }> = {
  must_have: { label: 'Must-have', tone: 'rose' },
  good_to_have: { label: 'Good-to-have', tone: 'amber' },
  delighter: { label: 'Delighter', tone: 'emerald' },
};

export const BabyAttributesRenderer = ({ data }: { data: any }) => {
  const groups: Record<string, any[]> = { must_have: [], good_to_have: [], delighter: [] };
  arr(data?.drivers).forEach((d: any) => { (groups[d.tier] || groups.good_to_have).push(d); });
  return (
    <div className="space-y-6">
      {(['must_have', 'good_to_have', 'delighter'] as const).map(tier => groups[tier].length > 0 && (
        <div key={tier}>
          <SubHeader label={TIER_LABEL[tier].label} color={TIER_LABEL[tier].tone} />
          <div className="grid md:grid-cols-2 gap-3">
            {groups[tier].map((d, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{d.attribute}</span>
                  <span className="text-[8px] font-mono uppercase text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{d.importance}</span>
                </div>
                {d.insight && <div className="text-[11px] text-slate-500 leading-relaxed">{d.insight}</div>}
                <VerbatimList items={d.verbatims} tone="slate" max={1} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 9 — PRICE–PACK & PREMIUMISATION SIGNALS --------------------------------

export const BabyPricePackRenderer = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div><SubHeader label="Price-per-Diaper Awareness" color="indigo" /><CardGrid items={data?.price_awareness} tone="indigo" /></div>
    <div>
      <SubHeader label="Psychological Price Ceilings by SEC" color="purple" />
      <div className="grid sm:grid-cols-3 gap-3">
        {arr(data?.price_ceilings).map((c: any, i: number) => (
          <div key={i} className="border border-purple-100 bg-purple-50/40 rounded-xl p-4">
            <div className="text-2xl font-extrabold text-purple-900">SEC {c.sec}</div>
            <div className="text-xs font-bold text-slate-700 mt-1">{c.ceiling_inr}</div>
            <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">{c.notes}</div>
          </div>
        ))}
      </div>
    </div>
    <div><SubHeader label="Premiumisation Triggers" color="emerald" /><CardGrid items={data?.premiumisation_triggers} tone="emerald" /></div>
    <div><SubHeader label="Promotional Responsiveness" color="amber" /><CardGrid items={data?.promo_response} tone="amber" /></div>
    <div><SubHeader label="Pack-Size vs Unit-Price Trade-off" color="slate" /><CardGrid items={data?.pack_vs_unit_tradeoff} tone="slate" /></div>
  </div>
);

// --- 10 — GAP ANALYSIS ------------------------------------------------------

const GapBlock = ({ block, tone }: { block: any; tone: string }) => {
  if (!block || !arr(block.bullets).length) return null;
  const tones: Record<string, string> = { rose: 'border-rose-100 bg-rose-50/30', emerald: 'border-emerald-100 bg-emerald-50/30', amber: 'border-amber-100 bg-amber-50/30' };
  return (
    <div>
      <SubHeader label={block.heading} color={tone} />
      <div className="space-y-2.5">
        {arr(block.bullets).map((b: any, i: number) => (
          <div key={i} className={`border rounded-xl p-4 space-y-2 ${tones[tone] || tones.rose}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{b.claim}</span>
              <div className="flex items-center gap-2">
                {b.severity && <span className="text-[8px] font-bold uppercase text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">{b.severity}</span>}
                <Pts n={b.data_points} />
              </div>
            </div>
            {b.explanation && <div className="text-[11px] text-slate-500 leading-relaxed">{b.explanation}</div>}
            <VerbatimList items={b.consumer_evidence} tone="slate" max={1} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const BabyGapRenderer = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <GapBlock block={data?.current_challenges} tone="rose" />
    <GapBlock block={data?.resolved_challenges} tone="emerald" />
    <GapBlock block={data?.unresolved_challenges} tone="amber" />
    {data?.need_gap && arr(data.need_gap.need_statements).length > 0 && (
      <div>
        <SubHeader label={data.need_gap.heading || 'White Space & Need Gaps'} color="indigo" />
        <div className="space-y-2.5">
          {arr(data.need_gap.need_statements).map((n: any, i: number) => (
            <div key={i} className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-900">{n.need}</span>
                <span className="text-[9px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded">{n.priority}</span>
              </div>
              {n.why_now && <div className="text-[11px] text-slate-600"><span className="font-bold">Why now:</span> {n.why_now}</div>}
              {n.who && <div className="text-[10px] text-slate-500"><span className="font-bold">Who:</span> {n.who}</div>}
              <VerbatimList items={n.consumer_evidence} tone="indigo" max={1} />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// --- 11 — LOVINGLE BRAND DIAGNOSTIC -----------------------------------------

export const BabyLovingleRenderer = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div><SubHeader label="Spontaneous Awareness & Associations" color="indigo" /><CardGrid items={data?.spontaneous_awareness} tone="indigo" /></div>
    <div className="grid md:grid-cols-2 gap-5">
      <div><SubHeader label="Consideration Drivers" color="emerald" />{arr(data?.consideration_drivers).map((c: any, i: number) => <div key={i} className="mb-3"><InsightCard c={c} tone="emerald" /></div>)}</div>
      <div><SubHeader label="Barriers — Rash / Skin-Safety Lock" color="rose" />{arr(data?.consideration_barriers).map((c: any, i: number) => <div key={i} className="mb-3"><InsightCard c={c} tone="rose" /></div>)}</div>
    </div>
    <div><SubHeader label="Aware Non-Triers" color="amber" /><CardGrid items={data?.aware_non_trier} tone="amber" /></div>
    <div><SubHeader label="What's Working Among Triers" color="emerald" /><CardGrid items={data?.trier_working} tone="emerald" /></div>
    <div>
      <SubHeader label="Switch Stories — To & From Lovingle" color="purple" />
      <div className="grid md:grid-cols-2 gap-3">
        {arr(data?.switch_stories).map((s: any, i: number) => {
          const into = s.direction === 'to_lovingle';
          return (
            <div key={i} className={`border rounded-xl p-4 space-y-2 ${into ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span>{s.from_brand}</span>
                <span className={into ? 'text-emerald-600' : 'text-rose-600'}>→</span>
                <span>{s.to_brand}</span>
                <span className={`ml-auto text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${into ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{into ? 'WIN' : 'LEAK'}</span>
              </div>
              {s.trigger && <div className="text-[11px] text-slate-500">{s.trigger}</div>}
              <VerbatimList items={s.verbatims} tone="slate" max={1} />
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// --- 12 — COMPETITIVE BRAND LANDSCAPE ---------------------------------------

const SENT: Record<string, string> = { POS: 'bg-emerald-100 text-emerald-700', MIX: 'bg-amber-100 text-amber-700', NEG: 'bg-rose-100 text-rose-700' };

export const BabyBrandRenderer = ({ data }: { data: any }) => (
  <div className="space-y-5">
    {arr(data?.market_structure).length > 0 && (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <SubHeader label="Market Structure" color="slate" />
        <Bullets items={data.market_structure} />
      </div>
    )}
    <div className="space-y-3">
      {arr(data?.brands).map((b: any, i: number) => {
        const isLovingle = (b.brand || '').toLowerCase() === 'lovingle';
        return (
          <div key={i} className={`border rounded-xl overflow-hidden ${isLovingle ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-sm font-extrabold text-slate-800">{b.brand}</span>
              {isLovingle && <span className="text-[8px] font-bold uppercase bg-indigo-500 text-white px-1.5 py-0.5 rounded">Focus</span>}
              <span className="text-[9px] uppercase text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded capitalize">{str(b.tier).replace(/_/g, ' ')}</span>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${SENT[b.overall_sentiment] || SENT.MIX}`}>{b.overall_sentiment}</span>
              <span className="ml-auto text-[10px] font-mono text-slate-500">SOV {b.share_of_voice?.share_pct ?? 0}%</span>
            </div>
            <div className="p-4 grid md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                {b.positioning_summary && <div className="text-[11px] text-slate-600 leading-relaxed">{b.positioning_summary}</div>}
                <div className="flex flex-wrap gap-1.5">
                  {arr(b.strengths).map((s: any, j: number) => <span key={j} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">+ {str(s)}</span>)}
                  {arr(b.weaknesses).map((w: any, j: number) => <span key={j} className="text-[9px] bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded">− {str(w)}</span>)}
                </div>
                <VerbatimList items={b.verbatims} tone="slate" max={1} />
              </div>
              <div className="space-y-1.5">
                {arr(b.attribute_scale).map((a: any, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-28 flex-shrink-0">{a.attribute}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (a.score_0_5 / 5) * 100)}%` }}></div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 w-6 text-right">{a.score_0_5}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
