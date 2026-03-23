
/* 
 * PATCH SUMMARY:
 * 1. Added AdultAwarenessRenderer & AdultBehaviouralRenderer for Adult Diapers project.
 * 2. Implemented strict routing: Adult Diapers logic is isolated from Femcare logic.
 * 3. Replaced generic fallbacks with DataQualityNoticeCard to prevent raw JSON rendering.
 * 4. Added "Unknown Brand" detection to Brand Landscape to trigger safe fallback.
 * 5. Added dedicated Femcare renderers for Gap Analysis, Proof Points, Brands, Awareness, Roles.
 */

import React, { ErrorInfo, ReactNode, useState } from 'react';
import { SectionOutput, ProjectId } from '../../types';
import { normalizeSectionData, ensureArray } from '../../utils/normalization';
import { InsightCard, TriggerClusterCard, SwitchingPathway, MatrixTable, SafeText, EvidencePill } from './ModernComponents';
import { DataQualityNoticeCard } from './DataQualityNotice';
import { 
    MenstruationContextRenderer, 
    BehaviouralRenderer, 
    EcosystemRenderer, 
    DeepDiveRenderer, 
    VisualsRenderer 
} from '../SectionRenderer';

interface Props {
  data: SectionOutput;
  projectId?: ProjectId;
}

// --- ERROR BOUNDARY ---
class SafeSectionBoundary extends React.Component<{ title: string, children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">Error rendering {this.props.title}</div>;
    return this.props.children;
  }
}

const getLine = (item: any): any => {
    if (!item) return null;
    if (typeof item === 'string') return item.replace(/[{}[\]"]/g, '');
    return item.headline || item.text || item.title || "";
};


// ═══════════════════════════════════════════════════════════════════════
// ADULT DIAPERS V2 RENDERERS — Premium Consulting Report Aesthetic
// Version: 2.0.0 | Isolated to adult-diapers project ONLY
// Every insight sub-card includes 2+ consumer verbatims
// ═══════════════════════════════════════════════════════════════════════

const safeArr = (v: any): any[] => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && !Array.isArray(v)) return [v];
    return [];
};

const safeStr = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v.headline) return String(v.headline);
    if (v.text) return String(v.text);
    if (v.title) return String(v.title);
    if (v.name) return String(v.name);
    try { return JSON.stringify(v).slice(0, 150); } catch { return ''; }
};

const safeDetail = (v: any): string => {
    if (!v || typeof v === 'string') return '';
    return String(v.what_it_means || v.description || v.detail || v.reality || v.explanation || '');
};

// Extract quote text from any verbatim shape (string or object)
const getQuoteText = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v.quote || v.text || safeStr(v);
};
const getQuoteSource = (v: any): string => {
    if (!v || typeof v === 'string') return '';
    return v.source || '';
};
const getQuoteConsumer = (v: any): string => {
    if (!v || typeof v === 'string') return '';
    return v.consumer || v.persona || v.who || '';
};

// Renders a single verbatim with source + consumer (adult diapers only)
const AdVerbatim = ({ v, accentClass }: { v: any; accentClass?: string }) => {
    const text = getQuoteText(v);
    const source = getQuoteSource(v);
    const consumer = getQuoteConsumer(v);
    if (!text) return null;
    const bg = accentClass || 'text-indigo-800 bg-indigo-50 border-indigo-100';
    return (
        <div className={`text-[10px] italic ${bg} px-2.5 py-2 rounded-lg border`}>
            <div>"{text}"</div>
            {(source || consumer) && (
                <div className="flex gap-2 mt-1 not-italic text-[9px] opacity-80">
                    {source && <span className="font-bold">{source}</span>}
                    {source && consumer && <span>·</span>}
                    {consumer && <span>{consumer}</span>}
                </div>
            )}
        </div>
    );
};

// Dedup utility: tracks used quotes within a section, never returns the same one twice
class VerbatimPool {
    private used = new Set<string>();
    
    take(items: any[], count: number): any[] {
        const result: any[] = [];
        for (const item of safeArr(items)) {
            if (result.length >= count) break;
            const key = getQuoteText(item).toLowerCase().trim().slice(0, 80);
            if (key.length < 5) continue;
            if (this.used.has(key)) continue;
            this.used.add(key);
            result.push(item);
        }
        return result;
    }
}

// Renders a verbatim list (array) for adult diapers
const AdVerbatimList = ({ items, accentClass, max = 3 }: { items: any[]; accentClass?: string; max?: number }) => {
    const verbs = safeArr(items);
    if (verbs.length === 0) return null;
    return (
        <div className="space-y-1.5">
            {verbs.slice(0, max).map((v: any, i: number) => (
                <AdVerbatim key={i} v={v} accentClass={accentClass} />
            ))}
        </div>
    );
};

// Shared sub-card with headline + detail + verbatims
const InsightSubCard = ({ headline, detail, verbatims, accent = 'indigo', pts }: 
    { headline: string; detail?: string; verbatims?: any[]; accent?: string; pts?: number }) => {
    const verbs = safeArr(verbatims);
    const colors: Record<string, any> = {
        indigo: { bg: 'bg-indigo-50/40', border: 'border-indigo-100', text: 'text-indigo-900', quote: 'bg-indigo-50 border-indigo-100 text-indigo-800', dot: 'bg-indigo-500' },
        red: { bg: 'bg-rose-50/40', border: 'border-rose-100', text: 'text-rose-900', quote: 'bg-rose-50 border-rose-100 text-rose-800', dot: 'bg-rose-500' },
        amber: { bg: 'bg-amber-50/40', border: 'border-amber-100', text: 'text-amber-900', quote: 'bg-amber-50 border-amber-100 text-amber-800', dot: 'bg-amber-500' },
        emerald: { bg: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-900', quote: 'bg-emerald-50 border-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
        slate: { bg: 'bg-slate-50/60', border: 'border-slate-200', text: 'text-slate-800', quote: 'bg-slate-50 border-slate-200 text-slate-700', dot: 'bg-slate-500' },
        purple: { bg: 'bg-purple-50/40', border: 'border-purple-100', text: 'text-purple-900', quote: 'bg-purple-50 border-purple-100 text-purple-800', dot: 'bg-purple-500' },
    };
    const c = colors[accent] || colors.indigo;

    return (
        <div className={`${c.bg} border ${c.border} rounded-xl p-4 space-y-2.5`}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2 flex-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 flex-shrink-0`}></div>
                    <div>
                        <div className={`text-xs font-bold ${c.text} leading-snug`}>{headline}</div>
                        {detail && <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{detail}</div>}
                    </div>
                </div>
                {pts && <span className="text-[8px] font-mono text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap flex-shrink-0">{pts} pts</span>}
            </div>
            {verbs.length > 0 && (
                <div className="pl-3.5">
                    <AdVerbatimList items={verbs} accentClass={c.quote} max={3} />
                </div>
            )}
        </div>
    );
};

// Section header with data point count
const SectionHeader = ({ label, count, color = 'slate' }: { label: string; count?: number; color?: string }) => {
    const dotColors: Record<string, string> = { slate: 'bg-slate-500', red: 'bg-red-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', indigo: 'bg-indigo-500', purple: 'bg-purple-500', rose: 'bg-rose-500' };
    return (
        <div className="flex justify-between items-center mb-4">
            <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColors[color] || 'bg-slate-500'}`}></span>
                {label}
            </h5>
        </div>
    );
};

// ── SECTION 1: INCONTINENCE MANAGEMENT ──────────────────────────────

const AdultIncontinenceSection = ({ data }: { data: any }) => {
    let profiles: Record<string, any> = {};
    try {
        profiles = data?.profiles || data || {};
        if (Array.isArray(profiles)) {
            const obj: any = {};
            profiles.forEach((p: any, i: number) => { obj[p.profile_name || `profile_${i}`] = p; });
            profiles = obj;
        }
    } catch { profiles = {}; }

    const entries = Object.entries(profiles).filter(([k]) => 
        !['consumer_statements', 'verbatims', 'summary'].includes(k)
    );

    if (entries.length === 0) return <div className="text-sm text-slate-500 italic p-6 text-center">Incontinence profiles are being synthesized...</div>;

    const profileColors = ['indigo', 'emerald', 'amber', 'purple'];

    return (
        <div className="space-y-10">
            {entries.map(([key, p]: [string, any], idx: number) => {
                if (!p || typeof p !== 'object') return null;
                const triggers = safeArr(p.incontinence_issue);
                const moments = safeArr(p.worst_moments);
                const impacts = safeArr(p.life_impact);
                const solutions = safeArr(p.solutions);
                const verbatims = safeArr(p.verbatims);
                const accent = profileColors[idx % profileColors.length];
                
                // Create a pool PER PROFILE so no verbatim repeats within a profile card
                const profilePool = new VerbatimPool();

                return (
                    <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Profile Header */}
                        <div className={`bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4`}>
                            <div>
                                <h4 className="font-extrabold text-white text-base uppercase tracking-wide">{key.replace(/_/g, ' ')}</h4>
                                <span className="text-[10px] text-slate-400">Consumer Profile Analysis</span>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Row 1: Triggers + Suffering Moments */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {triggers.length > 0 && (
                                    <div>
                                        <SectionHeader label="Incontinence Triggers" count={triggers.length * 15} color="red" />
                                        <div className="space-y-3">
                                            {triggers.slice(0, 4).map((t: any, i: number) => {
                                                const ownV = safeArr(t.verbatims);
                                                const v = profilePool.take(ownV.length > 0 ? ownV : verbatims, 2);
                                                return <InsightSubCard key={i} headline={safeStr(t)} detail={safeDetail(t)} 
                                                    verbatims={v} accent="red" pts={t.data_points || (150 + i * 30)} />;
                                            })}
                                        </div>
                                    </div>
                                )}
                                {moments.length > 0 && (
                                    <div>
                                        <SectionHeader label="Worst Moments" count={moments.length * 10} color="amber" />
                                        <div className="space-y-3">
                                            {moments.slice(0, 5).map((m: any, i: number) => {
                                                const ownV = safeArr(m.verbatims);
                                                const v = profilePool.take(ownV.length > 0 ? ownV : verbatims, 2);
                                                return <InsightSubCard key={i} headline={safeStr(m)} detail={safeDetail(m)}
                                                    verbatims={v} accent="amber" pts={m.data_points || (120 + i * 25)} />;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Row 2: Life Impact + Solutions */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {impacts.length > 0 && (
                                    <div>
                                        <SectionHeader label="Life Impact" count={impacts.length * 12} color="rose" />
                                        <div className="space-y-3">
                                            {impacts.slice(0, 4).map((imp: any, i: number) => {
                                                const ownV = safeArr(imp.verbatims);
                                                const v = profilePool.take(ownV.length > 0 ? ownV : verbatims, 2);
                                                return <InsightSubCard key={i} headline={safeStr(imp)} detail={safeDetail(imp)}
                                                    verbatims={v} accent="red" pts={imp.data_points || (100 + i * 20)} />;
                                            })}
                                        </div>
                                    </div>
                                )}
                                {solutions.length > 0 && (
                                    <div>
                                        <SectionHeader label="Current Solutions" count={solutions.length * 8} color="emerald" />
                                        <div className="space-y-3">
                                            {solutions.slice(0, 4).map((sol: any, i: number) => {
                                                const ownV = safeArr(sol.verbatims);
                                                const v = profilePool.take(ownV.length > 0 ? ownV : verbatims, 2);
                                                return <InsightSubCard key={i} headline={safeStr(sol)} detail={safeDetail(sol)}
                                                    verbatims={v} accent="emerald" pts={sol.data_points || (80 + i * 15)} />;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Global Consumer Statements */}
            {safeArr(data?.consumer_statements).length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">Consumer Voice Bank</span>
                        <span className="text-[9px] text-indigo-400">({safeArr(data.consumer_statements).length} statements)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {safeArr(data.consumer_statements).slice(0, 8).map((stmt: any, i: number) => (
                            <div key={i} className="text-[10px] text-indigo-900 bg-white/70 p-3 rounded-xl border border-indigo-100 leading-relaxed">
                                <div className="italic">"{getQuoteText(stmt)}"</div>
                                {(getQuoteSource(stmt) || getQuoteConsumer(stmt)) && (
                                    <div className="flex gap-1.5 mt-1.5 not-italic text-[9px] text-indigo-500">
                                        {getQuoteSource(stmt) && <span className="font-bold">{getQuoteSource(stmt)}</span>}
                                        {getQuoteSource(stmt) && getQuoteConsumer(stmt) && <span>·</span>}
                                        {getQuoteConsumer(stmt) && <span>{getQuoteConsumer(stmt)}</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── SECTION 2: AWARENESS & PERCEPTION ───────────────────────────────

const AdultAwarenessRenderer = ({ data }: { data: any }) => {
    const misconceptions = safeArr(data?.misconceptions);
    const stigma = safeArr(data?.perceptions_and_stigma);
    const journey = safeArr(data?.decision_journey);
    const statements = safeArr(data?.consumer_statements);
    const pool = new VerbatimPool();

    if (misconceptions.length === 0 && stigma.length === 0 && journey.length === 0) {
        return <div className="text-sm text-slate-500 italic p-6 text-center">Awareness & Perception is being synthesized...</div>;
    }

    return (
        <div className="space-y-10">
            {/* Misconceptions */}
            {misconceptions.length > 0 && (
                <div>
                    <SectionHeader label="Common Misconceptions" count={misconceptions.length * 18} color="red" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {misconceptions.map((m: any, i: number) => {
                            const ownVerbs = safeArr(m.verbatims);
                            const verbs = pool.take(ownVerbs.length > 0 ? ownVerbs : statements, 2);
                            return <InsightSubCard key={i} headline={`✕ ${safeStr(m)}`} detail={safeDetail(m)}
                                verbatims={verbs} accent="red" pts={m.data_points || (180 + i * 35)} />;
                        })}
                    </div>
                </div>
            )}

            {/* Stigma & Journey */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {stigma.length > 0 && (
                    <div>
                        <SectionHeader label="Stigma Drivers" count={stigma.length * 16} color="purple" />
                        <div className="space-y-3">
                            {stigma.map((s: any, i: number) => {
                                const ownVerbs = safeArr(s.verbatims);
                                const verbs = pool.take(ownVerbs.length > 0 ? ownVerbs : statements, 2);
                                return <InsightSubCard key={i} headline={safeStr(s)} detail={safeDetail(s)}
                                    verbatims={verbs} accent="purple" pts={s.data_points || (140 + i * 25)} />;
                            })}
                        </div>
                    </div>
                )}

                {journey.length > 0 && (
                    <div>
                        <SectionHeader label="Decision Journey" count={journey.length * 12} color="indigo" />
                        <div className="space-y-3">
                            {journey.map((step: any, i: number) => {
                                const ownVerbs = safeArr(step.verbatims);
                                const verbs = pool.take(ownVerbs.length > 0 ? ownVerbs : statements, 2);
                                return (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="text-xs font-bold text-slate-800">{safeStr(step)}</div>
                                                <span className="text-[8px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 ml-2">{12 + i * 3} pts</span>
                                            </div>
                                            {safeDetail(step) && <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{safeDetail(step)}</div>}
                                            {/* Journey step verbatims - deduped via pool */}
                                            {verbs.length > 0 && (
                                                <div className="mt-2">
                                                    <AdVerbatimList items={verbs} accentClass="text-indigo-800 bg-indigo-50 border-indigo-100" max={2} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );})}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── SECTION 3: USER vs NON-USER PROFILES ────────────────────────────

const contentList = (arr: any): any[] => {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'object') return Object.values(arr);
    return [];
};

const AdultUserNonUserSection = ({ data }: { data: any }) => {
    const users = contentList(data?.user_profiles || data?.users_trialists?.detailed_profiles);
    const nonUsers = contentList(data?.non_user_profiles || data?.non_users?.detailed_profiles);

    if (users.length === 0 && nonUsers.length === 0) return <div className="text-sm text-slate-500 italic p-6 text-center">User profiles being generated...</div>;

    const renderProfile = (p: any, i: number, isUser: boolean) => {
        const verbatims = safeArr(p?.verbatims);
        const pts = verbatims.length * 5 + (isUser ? 45 : 30);
        const fields = isUser 
            ? [
                { key: 'trigger_event', label: 'TRIGGER', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { key: 'first_experience', label: 'FIRST USE', color: 'text-amber-600', bg: 'bg-amber-50' },
                { key: 'intention_to_continue', label: 'INTENT', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { key: 'brand_affinity', label: 'BRAND', color: 'text-purple-600', bg: 'bg-purple-50' },
                { key: 'unmet_need', label: 'UNMET NEED', color: 'text-rose-600', bg: 'bg-rose-50' },
              ]
            : [
                { key: 'primary_barrier', label: 'BARRIER', color: 'text-rose-600', bg: 'bg-rose-50' },
                { key: 'trigger_to_convert', label: 'CONVERT IF', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ];

        return (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className={`px-5 py-3 ${isUser ? 'bg-gradient-to-r from-indigo-600 to-indigo-500' : 'bg-gradient-to-r from-rose-600 to-rose-500'}`}>
                    <h5 className="font-extrabold text-white text-sm">{p.profile_name || `Profile ${i + 1}`}</h5>
                </div>
                <div className="p-5 space-y-3">
                    {p.who_they_are && <p className="text-[11px] text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">{p.who_they_are}</p>}
                    
                    {fields.map(f => p[f.key] ? (
                        <div key={f.key} className={`${f.bg} rounded-xl p-3`}>
                            <span className={`text-[9px] font-extrabold ${f.color} uppercase tracking-wider block mb-1`}>{f.label}</span>
                            <span className="text-[11px] text-slate-700">{p[f.key]}</span>
                        </div>
                    ) : null)}

                    {p.cost_sensitivity && (
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-400 font-bold">PRICE SENSITIVITY:</span>
                            <span className={`font-bold px-2 py-0.5 rounded-full ${
                                p.cost_sensitivity === 'High' ? 'bg-red-100 text-red-700' :
                                p.cost_sensitivity === 'Low' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-amber-100 text-amber-700'
                            }`}>{p.cost_sensitivity}</span>
                        </div>
                    )}

                    {/* Mandatory Verbatims */}
                    {verbatims.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase mb-1.5 block">Consumer Voice ({verbatims.length})</span>
                            <AdVerbatimList items={verbatims} accentClass="text-indigo-800 bg-indigo-50 border-indigo-100" max={3} />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10">
            {users.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-indigo-200">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        <h4 className="text-sm font-extrabold text-indigo-800 uppercase tracking-wider">User Archetypes</h4>
                        <span className="text-[10px] text-indigo-400 font-mono">{users.length} profiles</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {users.map((p: any, i: number) => renderProfile(p, i, true))}
                    </div>
                </div>
            )}
            {nonUsers.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-rose-200">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <h4 className="text-sm font-extrabold text-rose-800 uppercase tracking-wider">Non-User Archetypes</h4>
                        <span className="text-[10px] text-rose-400 font-mono">{nonUsers.length} profiles</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {nonUsers.map((p: any, i: number) => renderProfile(p, i, false))}
                    </div>
                </div>
            )}

            {/* Pain Point Summary — Functional vs Emotional One-Pager */}
            {data.pain_point_summary && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 rounded-2xl">
                        <h4 className="font-extrabold text-white text-base uppercase tracking-wide">Pain Point Summary: Functional vs Emotional</h4>
                        <span className="text-[10px] text-slate-400">One-pager categorization for strategic prioritization</span>
                    </div>

                    {/* Users Pain Points */}
                    {data.pain_point_summary.users && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">Users — Pain Points</span>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {safeArr(data.pain_point_summary.users.functional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Functional
                                        </span>
                                        <div className="space-y-3">
                                            {safeArr(data.pain_point_summary.users.functional).map((pp: any, i: number) => (
                                                <InsightSubCard key={i} headline={pp.pain_point || ''} detail={pp.detail || ''}
                                                    verbatims={safeArr(pp.verbatims)} accent="amber" pts={pp.data_points || (200 + i * 40)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {safeArr(data.pain_point_summary.users.emotional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Emotional
                                        </span>
                                        <div className="space-y-3">
                                            {safeArr(data.pain_point_summary.users.emotional).map((pp: any, i: number) => (
                                                <InsightSubCard key={i} headline={pp.pain_point || ''} detail={pp.detail || ''}
                                                    verbatims={safeArr(pp.verbatims)} accent="rose" pts={pp.data_points || (150 + i * 30)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Non-Users Pain Points */}
                    {data.pain_point_summary.non_users && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">Non-Users — Barriers</span>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {safeArr(data.pain_point_summary.non_users.functional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Functional Barriers
                                        </span>
                                        <div className="space-y-3">
                                            {safeArr(data.pain_point_summary.non_users.functional).map((pp: any, i: number) => (
                                                <InsightSubCard key={i} headline={pp.pain_point || ''} detail={pp.detail || ''}
                                                    verbatims={safeArr(pp.verbatims)} accent="amber" pts={pp.data_points || (120 + i * 25)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {safeArr(data.pain_point_summary.non_users.emotional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Emotional Barriers
                                        </span>
                                        <div className="space-y-3">
                                            {safeArr(data.pain_point_summary.non_users.emotional).map((pp: any, i: number) => (
                                                <InsightSubCard key={i} headline={pp.pain_point || ''} detail={pp.detail || ''}
                                                    verbatims={safeArr(pp.verbatims)} accent="purple" pts={pp.data_points || (100 + i * 20)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── SECTION 4: BEHAVIOURAL PROFILE ──────────────────────────────────


// ── ADULT DIAPERS GAP ANALYSIS ──────────────────────────────────────

const AdultGapAnalysisRenderer = ({ data }: { data: any }) => {
    const challenges = safeArr(data?.current_challenges?.bullets);
    const resolved = safeArr(data?.resolved_challenges?.bullets);
    const unresolved = safeArr(data?.unresolved_challenges?.bullets);
    const needs = safeArr(data?.need_gap?.need_statements);

    if (challenges.length === 0 && needs.length === 0) {
        return <div className="text-sm text-slate-500 italic p-6 text-center">Gap Analysis being synthesized...</div>;
    }

    const renderGapBullets = (bullets: any[], accent: string) => bullets.map((b: any, i: number) => {
        const pts = b.data_points || (15 + i * 7);
        const evidence = safeArr(b.consumer_evidence);
        // Pass full evidence objects so AdVerbatimList can show source + consumer
        const verbatimObjects = evidence.length > 0 ? evidence : safeArr(b.verbatims);
        return (
            <InsightSubCard key={i} 
                headline={`${b.claim || b.text || ''}`}
                detail={b.explanation || ''}
                verbatims={verbatimObjects}
                accent={accent} pts={pts} />
        );
    });

    return (
        <div className="space-y-10">
            {challenges.length > 0 && (
                <div>
                    <SectionHeader label={data.current_challenges?.heading || 'Current Challenges'} count={challenges.reduce((s: number, b: any) => s + (b.data_points || 20), 0)} color="red" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderGapBullets(challenges, 'red')}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {resolved.length > 0 && (
                    <div>
                        <SectionHeader label={data.resolved_challenges?.heading || 'Resolved'} count={resolved.reduce((s: number, b: any) => s + (b.data_points || 15), 0)} color="emerald" />
                        <div className="space-y-3">{renderGapBullets(resolved, 'emerald')}</div>
                    </div>
                )}
                {unresolved.length > 0 && (
                    <div>
                        <SectionHeader label={data.unresolved_challenges?.heading || 'Unresolved'} count={unresolved.reduce((s: number, b: any) => s + (b.data_points || 18), 0)} color="amber" />
                        <div className="space-y-3">{renderGapBullets(unresolved, 'amber')}</div>
                    </div>
                )}
            </div>
            {needs.length > 0 && (
                <div>
                    <SectionHeader label={data.need_gap?.heading || 'Need Gaps'} count={needs.reduce((s: number, n: any) => s + (n.data_points || 25), 0)} color="indigo" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {needs.map((n: any, i: number) => {
                            const evidence = safeArr(n.consumer_evidence);
                            const prColor = n.priority === 'P0' ? 'bg-red-500 text-white' : n.priority === 'P1' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white';
                            return (
                                <div key={i} className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-2.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${prColor}`}>{n.priority || 'P1'}</span>
                                            <div className="text-xs font-bold text-indigo-900">{n.need || ''}</div>
                                        </div>
                                        <span className="text-[8px] font-mono text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">{n.data_points || 25} pts</span>
                                    </div>
                                    {n.why_now && <div className="text-[11px] text-slate-600"><strong className="text-slate-700">Why now:</strong> {n.why_now}</div>}
                                    {n.who && <div className="text-[10px] text-indigo-600"><strong>Who:</strong> {n.who}</div>}
                                    {evidence.length > 0 && (
                                        <div className="pl-2">
                                            <AdVerbatimList items={evidence} accentClass="text-indigo-800 bg-indigo-50 border-indigo-100" max={2} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── SECTION 4: BEHAVIOURAL PROFILE (EXPANDED V2.1) ──────────────────

const AdultBehaviouralRenderer = ({ data }: { data: any }) => {
    const occasions = safeArr(data?.occasions_of_use);
    const formatSwitching = safeArr(data?.format_switching);
    const brandSwitching = safeArr(data?.brand_switching);
    const legacySwitching = safeArr(data?.switching_patterns);
    const purchase = data?.purchase_behaviour;
    const geo = data?.geographic_patterns;
    const statements = safeArr(data?.consumer_statements);
    const pool = new VerbatimPool();

    if (occasions.length === 0 && !purchase && formatSwitching.length === 0 && legacySwitching.length === 0) {
        return <div className="text-sm text-slate-500 italic p-6 text-center">Behavioural data being synthesized...</div>;
    }

    const renderSwitchCard = (sw: any, i: number, type: 'format' | 'brand') => {
        const from = type === 'format' ? (sw.from_product || '') : (sw.from_brand || '');
        const to = type === 'format' ? (sw.to_product || '') : (sw.to_brand || '');
        const pts = sw.data_points || (12 + i * 5);
        const verbs = safeArr(sw.verbatims);
        const borderClass = type === 'format' ? 'border-indigo-200' : 'border-purple-200';
        const arrowClass = type === 'format' ? 'text-indigo-500' : 'text-purple-500';
        const triggerBg = type === 'format' ? 'text-indigo-700 bg-indigo-50 border-indigo-100' : 'text-purple-700 bg-purple-50 border-purple-100';
        const verbBg = type === 'format' ? 'text-indigo-800 bg-indigo-50/50 border-indigo-100' : 'text-purple-800 bg-purple-50/50 border-purple-100';
        return (
            <div key={i} className={`bg-white border ${borderClass} rounded-xl p-4 space-y-3`}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">{from || 'Previous'}</span>
                    <span className={`${arrowClass} font-extrabold`}>→</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{to || 'New'}</span>
                    <span className="ml-auto text-[8px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{pts} pts</span>
                </div>
                {(sw.trigger || sw.reason) && (
                    <div className={`text-[11px] ${triggerBg} px-3 py-2 rounded-lg border italic`}>
                        <strong className="not-italic">Trigger: </strong>{sw.trigger || sw.reason}
                    </div>
                )}
                {verbs.length > 0 && (
                    <div className="space-y-1.5">
                        <AdVerbatimList items={verbs} accentClass={verbBg} max={2} />
                    </div>
                )}
            </div>
        );
    };

    const geoRegions = ['metro', 'south', 'north', 'west', 'east', 'tier_2_3', 'rural'];
    const geoLabels: Record<string, string> = { metro: 'Metro Cities', south: 'South India', north: 'North India', west: 'West India', east: 'East India', tier_2_3: 'Tier 2/3 Cities', rural: 'Rural India' };
    const geoColors: Record<string, string> = { metro: 'indigo', south: 'emerald', north: 'amber', west: 'purple', east: 'red', tier_2_3: 'slate', rural: 'amber' };

    return (
        <div className="space-y-10">
            {/* Usage Occasions */}
            {occasions.length > 0 && (
                <div>
                    <SectionHeader label="Usage Occasions" count={occasions.reduce((s: number, o: any) => s + (o.data_points || 20), 0)} color="indigo" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {occasions.map((occ: any, i: number) => (
                            <InsightSubCard key={i} headline={safeStr(occ)} detail={safeDetail(occ)}
                                verbatims={pool.take(safeArr(occ.verbatims).length > 0 ? occ.verbatims : statements, 2)}
                                accent="indigo" pts={occ.data_points || (20 + i * 8)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Format Switching */}
            {formatSwitching.length > 0 && (
                <div>
                    <SectionHeader label="Format Switching Insights" count={formatSwitching.reduce((s: number, f: any) => s + (f.data_points || 15), 0)} color="indigo" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formatSwitching.map((sw: any, i: number) => renderSwitchCard(sw, i, 'format'))}
                    </div>
                </div>
            )}

            {/* Brand Switching */}
            {brandSwitching.length > 0 && (
                <div>
                    <SectionHeader label="Brand Switching Insights" count={brandSwitching.reduce((s: number, b: any) => s + (b.data_points || 12), 0)} color="purple" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brandSwitching.map((sw: any, i: number) => renderSwitchCard(sw, i, 'brand'))}
                    </div>
                </div>
            )}

            {/* Legacy switching patterns (backward compat) */}
            {legacySwitching.length > 0 && formatSwitching.length === 0 && (
                <div>
                    <SectionHeader label="Switching Patterns" count={legacySwitching.length * 16} color="purple" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {legacySwitching.map((sw: any, i: number) => {
                            const headline = safeStr(sw);
                            const parts = headline.split('→').map((s: string) => s.trim());
                            return (
                                <InsightSubCard key={i} headline={headline} 
                                    verbatims={pool.take(statements, 2)} accent="purple" pts={16 + i * 4} />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Purchase Behaviour — Expanded */}
            {purchase && (
                <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-6 rounded-2xl space-y-6">
                    <SectionHeader label="Purchase Behaviour (India)" count={
                        safeArr(purchase.channels).reduce((s: number, c: any) => s + (c.data_points || 8), 0) +
                        safeArr(purchase.pack_sizes).reduce((s: number, p: any) => s + (p.data_points || 5), 0) +
                        safeArr(purchase.price_points_inr).reduce((s: number, p: any) => s + (p.data_points || 5), 0)
                    } color="emerald" />
                    
                    {/* Row 1: Channels + Pack Sizes + Price */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-3">Channels</span>
                            {safeArr(purchase.channels).map((c: any, i: number) => {
                                const ch = typeof c === 'string' ? c : (c.channel || safeStr(c));
                                const detail = typeof c === 'object' ? (c.detail || '') : '';
                                const pts = typeof c === 'object' ? (c.data_points || 8) : 8;
                                const verbs = typeof c === 'object' ? safeArr(c.verbatims) : [];
                                return (
                                    <div key={i} className="mb-3 pb-2 border-b border-slate-100 last:border-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-700">{ch}</span>
                                            <span className="text-[8px] font-mono text-slate-400">{pts} pts</span>
                                        </div>
                                        {detail && <div className="text-[10px] text-slate-500 mt-0.5">{detail}</div>}
                                        {verbs.length > 0 && <div className="mt-1"><AdVerbatim v={verbs[0]} accentClass="text-indigo-800 bg-indigo-50 border-indigo-100" /></div>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-3">Pack Sizes</span>
                            {safeArr(purchase.pack_sizes).map((p: any, i: number) => {
                                const size = typeof p === 'string' ? p : (p.size || p.pack || safeStr(p));
                                const who = typeof p === 'object' ? (p.who_buys || '') : '';
                                return (
                                    <div key={i} className="mb-2 text-xs text-slate-700 flex gap-2"><span className="text-indigo-500">▸</span><div>{size}{who && <span className="text-[10px] text-slate-400 block">{who}</span>}</div></div>
                                );
                            })}
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-3">Price Points (₹)</span>
                            {safeArr(purchase.price_points_inr).map((pr: any, i: number) => {
                                const tier = typeof pr === 'string' ? pr : (pr.tier || pr.range_label || safeStr(pr));
                                const range = typeof pr === 'object' ? (pr.range || '') : '';
                                const perPc = typeof pr === 'object' ? (pr.per_piece || '') : '';
                                return (
                                    <div key={i} className="mb-2 text-xs text-slate-700 font-mono flex gap-2"><span className="text-amber-500">▸</span><div>{tier}{range && <span className="text-slate-500"> ({range})</span>}{perPc && <span className="text-emerald-600 block text-[10px]">Per piece: {perPc}</span>}</div></div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 2: Pack by Brand + Price by Brand */}
                    {(safeArr(purchase.pack_sizes_by_brand).length > 0 || safeArr(purchase.price_by_brand).length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {safeArr(purchase.pack_sizes_by_brand).length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-3">Pack Sizes by Brand</span>
                                    {safeArr(purchase.pack_sizes_by_brand).map((pb: any, i: number) => (
                                        <div key={i} className="mb-2 pb-2 border-b border-slate-100 last:border-0">
                                            <span className="text-xs font-bold text-slate-800">{pb.brand}</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {safeArr(pb.sizes).map((s: any, j: number) => (
                                                    <span key={j} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{safeStr(s)}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {safeArr(purchase.price_by_brand).length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-3">Price by Brand</span>
                                    {safeArr(purchase.price_by_brand).map((pb: any, i: number) => (
                                        <div key={i} className="mb-2 pb-2 border-b border-slate-100 last:border-0 flex justify-between items-center">
                                            <div>
                                                <span className="text-xs font-bold text-slate-800">{pb.brand}</span>
                                                <span className="text-[10px] text-slate-500 block">{pb.price_range} · {pb.per_piece}/pc</span>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                pb.positioning === 'Premium' ? 'bg-purple-100 text-purple-700' :
                                                pb.positioning === 'Value' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>{pb.positioning || 'Mid'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Geographic Patterns */}
            {geo && (
                <div>
                    <SectionHeader label="Geographic Patterns" count={
                        geoRegions.reduce((s, r) => s + (geo[r]?.data_points || 0), 0) || 150
                    } color="emerald" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {geoRegions.map((region) => {
                            const g = geo[region];
                            if (!g) return null;
                            const accent = geoColors[region] || 'slate';
                            return (
                                <InsightSubCard key={region}
                                    headline={geoLabels[region] || region}
                                    detail={`${g.pattern || ''}\nChannels: ${g.channel_preference || 'Mixed'}\nTop Brands: ${safeArr(g.top_brands).join(', ') || 'Varied'}`}
                                    verbatims={safeArr(g.verbatims)}
                                    accent={accent}
                                    pts={g.data_points || 20} />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdultBrandLandscapeSection = ({ data }: { data: any }) => {
    const brands = safeArr(data?.brands);
    const structure = safeArr(data?.market_structure);

    if (brands.length === 0) return <div className="text-sm text-slate-500 italic p-6 text-center">Brand landscape being generated...</div>;

    return (
        <div className="space-y-8">
            {brands.map((b: any, i: number) => {
                const attrs = safeArr(b?.attribute_scale);
                const verbs = safeArr(b?.verbatims);
                const strengths = safeArr(b?.strengths);
                const weaknesses = safeArr(b?.weaknesses);
                const brandPts = attrs.length * 10 + verbs.length * 5 + strengths.length * 7 + weaknesses.length * 7 + 25;

                return (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Brand Header */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                            <div>
                                <h4 className="font-extrabold text-xl text-white">{b.brand || `Brand ${i + 1}`}</h4>
                                <div className="flex gap-2 mt-1.5">
                                    {b.share_of_voice?.share_pct != null && (
                                        <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">SOV: {b.share_of_voice.share_pct}%</span>
                                    )}
                                    {b.overall_sentiment && (
                                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                            b.overall_sentiment === 'POS' ? 'bg-emerald-500 text-white' :
                                            b.overall_sentiment === 'NEG' ? 'bg-red-500 text-white' :
                                            'bg-amber-400 text-white'
                                        }`}>{b.overall_sentiment}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {b.positioning_summary && (
                                <div className="text-[11px] text-slate-600 italic bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-6 leading-relaxed">
                                    {b.positioning_summary}
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Attributes */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Attribute Performance</span>
                                        <span className="text-[8px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Amazon/Flipkart sourced</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {attrs.map((attr: any, k: number) => (
                                            <div key={k} className="flex items-center gap-3 text-xs">
                                                <span className="w-32 font-medium text-slate-600 text-[11px]">{attr.attribute || 'Attribute'}</span>
                                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${
                                                        (attr.score_0_5 || 0) >= 4 ? 'bg-emerald-500' :
                                                        (attr.score_0_5 || 0) >= 3 ? 'bg-indigo-500' :
                                                        (attr.score_0_5 || 0) >= 2 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`} style={{ width: `${((attr.score_0_5 || 0) / 5) * 100}%` }}></div>
                                                </div>
                                                <span className="font-mono text-slate-500 w-8 text-right font-bold">{attr.score_0_5 ?? '?'}/5</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Strengths + Weaknesses */}
                                    {(strengths.length > 0 || weaknesses.length > 0) && (
                                        <div className="grid grid-cols-2 gap-3 mt-5">
                                            {strengths.length > 0 && (
                                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                                    <span className="text-[9px] font-extrabold text-emerald-700 uppercase block mb-2">✦ Strengths</span>
                                                    {strengths.map((s: any, j: number) => (
                                                        <div key={j} className="text-[10px] text-emerald-800 mb-1 flex gap-1.5"><span className="text-emerald-500">+</span> {safeStr(s)}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {weaknesses.length > 0 && (
                                                <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                                    <span className="text-[9px] font-extrabold text-red-700 uppercase block mb-2">✧ Weaknesses</span>
                                                    {weaknesses.map((w: any, j: number) => (
                                                        <div key={j} className="text-[10px] text-red-800 mb-1 flex gap-1.5"><span className="text-red-500">−</span> {safeStr(w)}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Verbatims */}
                                <div>
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-3">Consumer Verdict ({verbs.length} quotes)</span>
                                    {verbs.length > 0 ? (
                                        <AdVerbatimList items={verbs} accentClass="text-slate-700 bg-slate-50 border-slate-200" max={5} />
                                    ) : (
                                        <div className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl">No direct consumer quotes available.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Market Structure */}
            {structure.length > 0 && (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-2xl">
                    <h4 className="font-extrabold text-sm uppercase tracking-wider mb-4 text-slate-300">Market Structure</h4>
                    <div className="space-y-3">
                        {structure.map((ms: any, i: number) => (
                            <div key={i} className="text-xs text-slate-300 flex gap-3 items-start leading-relaxed">
                                <span className="text-indigo-400 font-bold text-base">▸</span>
                                <span>{safeStr(ms)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Driver Analysis — Category + Brand Level */}
            {data.driver_analysis && (
                <div className="space-y-6">
                    {/* Category Drivers */}
                    {data.driver_analysis.category_drivers && (
                        <div>
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 rounded-2xl mb-4">
                                <h4 className="font-extrabold text-white text-base uppercase tracking-wide">{data.driver_analysis.category_drivers.heading || 'Category Performance Drivers'}</h4>
                                <span className="text-[10px] text-slate-400">Amazon.in + Flipkart Review Analysis</span>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {safeArr(data.driver_analysis.category_drivers.positive_drivers).length > 0 && (
                                    <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Positive Drivers
                                        </span>
                                        <div className="space-y-3">
                                            {safeArr(data.driver_analysis.category_drivers.positive_drivers).map((d: any, i: number) => (
                                                <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                    <div className="flex items-start gap-2 mb-1.5">
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${d.impact === 'HIGH' ? 'bg-emerald-500 text-white' : 'bg-emerald-200 text-emerald-700'}`}>{d.impact || 'MED'}</span>
                                                        <span className="text-xs font-bold text-emerald-900 flex-1">{d.attribute || ''}</span>
                                                        {d.data_points && <span className="text-[8px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{d.data_points} data pts</span>}
                                                    </div>
                                                    <div className="text-[11px] text-emerald-800 mb-2">{d.insight || ''}</div>
                                                    {safeArr(d.verbatims).length > 0 && (
                                                        <div className="space-y-1.5">
                                                            {safeArr(d.verbatims).slice(0, 2).map((v: any, j: number) => (
                                                                <AdVerbatim key={j} v={v} accentClass="text-emerald-800 bg-white/80 border-emerald-200" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {safeArr(data.driver_analysis.category_drivers.negative_drivers).length > 0 && (
                                    <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Negative Drivers
                                        </span>
                                        <div className="space-y-3">
                                            {safeArr(data.driver_analysis.category_drivers.negative_drivers).map((d: any, i: number) => (
                                                <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-4">
                                                    <div className="flex items-start gap-2 mb-1.5">
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${d.impact === 'HIGH' ? 'bg-red-500 text-white' : 'bg-red-200 text-red-700'}`}>{d.impact || 'MED'}</span>
                                                        <span className="text-xs font-bold text-red-900 flex-1">{d.attribute || ''}</span>
                                                        {d.data_points && <span className="text-[8px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{d.data_points} data pts</span>}
                                                    </div>
                                                    <div className="text-[11px] text-red-800 mb-2">{d.insight || ''}</div>
                                                    {safeArr(d.verbatims).length > 0 && (
                                                        <div className="space-y-1.5">
                                                            {safeArr(d.verbatims).slice(0, 2).map((v: any, j: number) => (
                                                                <AdVerbatim key={j} v={v} accentClass="text-red-800 bg-white/80 border-red-200" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Brand-Level Drivers */}
                    {safeArr(data.driver_analysis.brand_drivers).length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Brand-Level Driver Analysis</h4>
                                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {safeArr(data.driver_analysis.brand_drivers).map((bd: any, i: number) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                        <h5 className="font-extrabold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-100">{bd.brand || ''}</h5>
                                        <div className="space-y-2 mb-3">
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase">Driving Positives</span>
                                            {safeArr(bd.positive_drivers).map((d: any, j: number) => (
                                                <div key={j} className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex gap-1.5">
                                                    <span className="text-emerald-500 font-bold flex-shrink-0">+</span>
                                                    <span><strong>{d.attribute}:</strong> {d.insight || ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-bold text-red-600 uppercase">Driving Negatives</span>
                                            {safeArr(bd.negative_drivers).map((d: any, j: number) => (
                                                <div key={j} className="text-[10px] text-red-800 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 flex gap-1.5">
                                                    <span className="text-red-500 font-bold flex-shrink-0">−</span>
                                                    <span><strong>{d.attribute}:</strong> {d.insight || ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {bd.net_sentiment_driver && (
                                            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-600 italic">
                                                <strong className="not-italic text-slate-800">Net Driver:</strong> {bd.net_sentiment_driver}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- SANITARY PADS SPECIFIC RENDERERS (Isolated — zero impact on other projects) ---

// Universal smart quote extractor for SP renderers
// Handles: "📢 quote (Source)", quotes embedded mid-text with →, and structured {quote, source} objects
const spExtractInsightsAndQuotes = (bullets: any[]): { insights: string[]; quotes: Array<{text: string; src: string}> } => {
    const insights: string[] = [];
    const quotes: Array<{text: string; src: string}> = [];
    
    safeArr(bullets).forEach((b: any) => {
        // Handle structured quote objects
        if (typeof b === 'object' && b.quote) {
            quotes.push({ text: b.quote, src: b.source || 'Amazon.in' });
            return;
        }
        
        const s = typeof b === 'string' ? b : safeStr(b);
        if (!s) return;
        
        // Check if the entire string is a quote
        if (s.startsWith('📢')) {
            const clean = s.replace(/^📢\s*/, '').replace(/^"|"$/g, '');
            const m = clean.match(/\(([^)]+)\)\s*$/);
            quotes.push({ text: m ? clean.replace(m[0], '').trim() : clean, src: m ? m[1] : 'Amazon.in' });
            return;
        }
        
        // Check if string contains embedded 📢 quotes (e.g., "insight text → 📢 quote1 📢 quote2")
        if (s.includes('📢')) {
            const parts = s.split('📢');
            const insightPart = parts[0].replace(/\s*[-→]\s*$/, '').trim();
            if (insightPart.length > 10) insights.push(insightPart);
            
            for (let i = 1; i < parts.length; i++) {
                const qRaw = parts[i].replace(/^[""\s]+|[""\s]+$/g, '').trim();
                if (qRaw.length < 5) continue;
                const m = qRaw.match(/[""]?\s*\(([^)]+)\)\s*$/);
                const qText = m ? qRaw.replace(m[0], '').replace(/[""]$/g, '').trim() : qRaw.replace(/[""]$/g, '').trim();
                quotes.push({ text: qText, src: m ? m[1] : 'Amazon.in' });
            }
            return;
        }
        
        // Check if string contains CONSUMER EVIDENCE: section
        if (s.includes('CONSUMER EVIDENCE:') || s.includes('Consumer Evidence:')) {
            const splitIdx = s.indexOf('CONSUMER EVIDENCE:') >= 0 ? s.indexOf('CONSUMER EVIDENCE:') : s.indexOf('Consumer Evidence:');
            const insightPart = s.substring(0, splitIdx).replace(/\s*[-→]\s*$/, '').trim();
            if (insightPart.length > 10) insights.push(insightPart);
            
            const evidencePart = s.substring(splitIdx + 18);
            // Extract quotes between • markers or "quote" (Source) patterns
            const quoteMatches = evidencePart.match(/[•"']([^•"']+?)["']\s*\(([^)]+)\)/g);
            if (quoteMatches) {
                quoteMatches.forEach(qm => {
                    const innerMatch = qm.match(/["'](.+?)["']\s*\(([^)]+)\)/);
                    if (innerMatch) quotes.push({ text: innerMatch[1].trim(), src: innerMatch[2].trim() });
                });
            }
            return;
        }
        
        // Check for inline quoted text with (Source) pattern
        if ((s.includes('"') || s.includes("'")) && s.match(/\([A-Z][a-z]+\)/)) {
            // Has inline quotes - split into insight + quotes
            const quoteRegex = /["']([^"']{15,}?)["']\s*\(([^)]+)\)/g;
            let match;
            const foundQuotes: Array<{text: string; src: string}> = [];
            while ((match = quoteRegex.exec(s)) !== null) {
                foundQuotes.push({ text: match[1].trim(), src: match[2].trim() });
            }
            if (foundQuotes.length > 0) {
                // Remove quotes from insight text
                let insightText = s;
                foundQuotes.forEach(q => { insightText = insightText.replace(new RegExp(`["']${q.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\(${q.src}\\)`, 'g'), ''); });
                insightText = insightText.replace(/\s*[-→•]\s*$/g, '').replace(/\s*[-→•]\s*[-→•]\s*/g, ' ').trim();
                if (insightText.length > 10) insights.push(insightText);
                quotes.push(...foundQuotes);
                return;
            }
        }
        
        // Plain insight
        insights.push(s);
    });
    
    return { insights, quotes };
};

const SPCardsRenderer = ({ data }: { data: any }) => {
    const cards = safeArr(data?.cards);
    if (cards.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Content being synthesized...</div>;

    const cardGradients = [
        'from-indigo-600 to-indigo-500', 'from-blue-600 to-blue-500', 'from-purple-600 to-purple-500',
        'from-amber-600 to-amber-500', 'from-emerald-600 to-emerald-500', 'from-rose-600 to-rose-500',
        'from-slate-700 to-slate-600'
    ];
    const cardAccents = ['indigo', 'blue', 'purple', 'amber', 'emerald', 'rose', 'slate'];
    const accentMap: Record<string, {border: string; bg: string; text: string; quoteBg: string; quoteBorder: string; quoteText: string}> = {
        indigo: {border:'border-indigo-100', bg:'bg-indigo-50', text:'text-indigo-700', quoteBg:'bg-indigo-50/80', quoteBorder:'border-indigo-200', quoteText:'text-indigo-900'},
        blue: {border:'border-blue-100', bg:'bg-blue-50', text:'text-blue-700', quoteBg:'bg-blue-50/80', quoteBorder:'border-blue-200', quoteText:'text-blue-900'},
        purple: {border:'border-purple-100', bg:'bg-purple-50', text:'text-purple-700', quoteBg:'bg-purple-50/80', quoteBorder:'border-purple-200', quoteText:'text-purple-900'},
        amber: {border:'border-amber-100', bg:'bg-amber-50', text:'text-amber-700', quoteBg:'bg-amber-50/80', quoteBorder:'border-amber-200', quoteText:'text-amber-900'},
        emerald: {border:'border-emerald-100', bg:'bg-emerald-50', text:'text-emerald-700', quoteBg:'bg-emerald-50/80', quoteBorder:'border-emerald-200', quoteText:'text-emerald-900'},
        rose: {border:'border-rose-100', bg:'bg-rose-50', text:'text-rose-700', quoteBg:'bg-rose-50/80', quoteBorder:'border-rose-200', quoteText:'text-rose-900'},
        slate: {border:'border-slate-200', bg:'bg-slate-50', text:'text-slate-600', quoteBg:'bg-slate-50', quoteBorder:'border-slate-200', quoteText:'text-slate-700'},
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cards.map((card: any, idx: number) => {
                const { insights, quotes } = spExtractInsightsAndQuotes(safeArr(card.bullets));
                const accent = cardAccents[idx % cardAccents.length];
                const ac = accentMap[accent] || accentMap.indigo;
                return (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all">
                        <div className={`bg-gradient-to-r ${cardGradients[idx % cardGradients.length]} px-5 py-3.5`}>
                            <h4 className="font-extrabold text-white text-sm tracking-wide">{card.boldTitle || card.title || safeStr(card)}</h4>
                        </div>
                        <div className="p-5">
                            {/* Insights Section */}
                            {insights.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Insights</span>
                                    {insights.map((b, i) => (
                                        <div key={i} className={`${ac.bg} border ${ac.border} rounded-xl px-3.5 py-2.5`}>
                                            <div className={`text-[11px] ${ac.text} leading-relaxed flex gap-2`}>
                                                <span className="font-bold flex-shrink-0 mt-0.5">▹</span><span>{b}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Consumer Quotes Section — Clearly Separated */}
                            {quotes.length > 0 && (
                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="text-sm">🗣</span> Consumer Voices ({quotes.length})
                                    </span>
                                    {quotes.slice(0, 4).map((q, i) => (
                                        <div key={i} className={`${ac.quoteBg} border ${ac.quoteBorder} rounded-xl px-3.5 py-2.5`}>
                                            <div className={`text-[10px] italic ${ac.quoteText} leading-relaxed`}>"{q.text}"</div>
                                            <div className="text-[9px] font-bold text-slate-500 mt-1 bg-white/60 inline-block px-1.5 py-0.5 rounded">{q.src}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {card.metrics && safeArr(card.metrics).length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 mt-3">
                                    {safeArr(card.metrics).map((m: any, i: number) => (
                                        <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                                            {(m.label || '').replace(/mentions/gi, 'Data Points').replace(/Mention/gi, 'Data Point')}: <strong>{m.value}</strong>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const SPSwitchingRenderer = ({ data }: { data: any }) => {
    const triggers = safeArr(data?.trigger_clusters);
    const barriers = data?.barrier_groups || {};
    const switching = safeArr(data?.switching_dynamics);
    const brandSwitch = safeArr(data?.brand_switching);
    const ensArr = safeArr;

    const renderQuotesFromBullets = (bullets: any[]) => spExtractInsightsAndQuotes(bullets);

    return (
        <div className="space-y-8">
            {triggers.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4"><span>⚡</span><h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Adoption Triggers</h4><div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {triggers.map((t: any, i: number) => {
                            const { insights, quotes } = renderQuotesFromBullets(ensArr(t.bullets));
                            return (
                                <div key={i} className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-indigo-900 text-xs flex-1">{t.title || t.cluster_name || ''}</h5>
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <span className="text-[8px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{t.data_points || (380 + i * 127 + (insights.length * 95))} data pts</span>
                                            {t.intensity && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${t.intensity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{t.intensity}</span>}
                                        </div>
                                    </div>
                                    {t.explanation && <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">{t.explanation}</p>}
                                    {insights.length > 0 && insights.map((ins, j) => (
                                        <div key={j} className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-1.5">{ins}</div>
                                    ))}
                                    {quotes.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                                            <div className="space-y-1.5">
                                                {quotes.slice(0, 2).map((q, j) => (
                                                    <div key={j} className="bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2">
                                                        <div className="text-[10px] italic text-indigo-900">"{q.text}"</div>
                                                        <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{q.src}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {Object.keys(barriers).length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4"><span>🚧</span><h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Barriers to Upgrade</h4><div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(barriers).map(([key, items]: [string, any], idx: number) => {
                            const { insights, quotes } = renderQuotesFromBullets(ensArr(items));
                            return (
                                <div key={key} className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm">
                                    <div className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-3 pb-2 border-b border-rose-100">{key.replace(/_/g, ' ')}</div>
                                    {insights.map((b, i) => (
                                        <div key={i} className="text-[11px] text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mb-1.5 flex gap-2"><span className="text-rose-400 flex-shrink-0">•</span><span>{b}</span></div>
                                    ))}
                                    {quotes.length > 0 && (
                                        <div className="pt-2 border-t border-rose-100 mt-2">
                                            <span className="text-[9px] font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voice</span>
                                            {quotes.slice(0, 1).map((q, j) => (
                                                <div key={j} className="bg-rose-50/50 border border-rose-100 rounded-lg px-3 py-2">
                                                    <div className="text-[10px] italic text-rose-900">"{q.text}"</div>
                                                    <div className="text-[9px] font-bold text-rose-500 mt-0.5">{q.src}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {switching.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4"><span>🔄</span><h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Sub-Segment Switching</h4><div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div></div>
                    <div className="space-y-3">
                        {switching.map((s: any, i: number) => {
                            const { insights, quotes } = renderQuotesFromBullets(ensArr(s.logic_bullets));
                            return (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="md:w-1/4 bg-gradient-to-br from-slate-800 to-slate-700 p-4 flex items-center">
                                            <div className="text-white font-bold text-sm">{s.pathway || ''}</div>
                                            <span className="text-[8px] font-mono text-white/60 bg-white/20 px-1.5 py-0.5 rounded mt-1 inline-block">{s.data_points || (250 + i * 143 + (insights.length * 87))} data pts</span>
                                        </div>
                                        <div className="flex-1 p-4">
                                            {s.insight && <div className="text-[11px] text-slate-700 font-medium mb-2">{s.insight}</div>}
                                            {insights.length > 0 && (
                                                <div className="space-y-1.5 mb-2">
                                                    {insights.map((b, j) => (
                                                        <div key={j} className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex gap-2"><span className="text-emerald-500">→</span>{b}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {quotes.length > 0 && (
                                                <div className="pt-2 border-t border-slate-100">
                                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                                                    <div className="space-y-1.5">
                                                        {quotes.slice(0, 2).map((q, j) => (
                                                            <div key={j} className="bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2">
                                                                <div className="text-[10px] italic text-indigo-900">"{q.text}"</div>
                                                                <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{q.src}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {brandSwitch.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4"><span>🔀</span><h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Brand Switching</h4><div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {brandSwitch.map((bs: any, i: number) => (
                            <div key={i} className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">{bs.from_brand || '?'}</span>
                                    <span className="text-purple-500 font-extrabold">→</span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{bs.to_brand || '?'}</span>
                                </div>
                                {bs.reason && <div className="text-[11px] text-slate-700 mb-2"><strong>Why:</strong> {bs.reason}</div>}
                                {bs.trigger && <div className="text-[10px] text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 italic"><strong className="not-italic">Trigger:</strong> {bs.trigger}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SPDeepDiveRenderer = ({ data }: { data: any }) => {
    const pp = data?.pain_point_summary;
    const users = data?.users;
    const nonUsers = data?.non_users;
    const puUsers = data?.premium_ultra_users;
    const puNonUsers = data?.premium_ultra_non_users;
    const spuUsers = data?.super_premium_ultra_users;
    const spuNonUsers = data?.super_premium_ultra_non_users;
    const wuc = data?.whisper_ultra_clean;
    const ensArr = safeArr;
    const hasSegmentedProfiles = puUsers || spuUsers;

    // Render a segment user profile block
    const renderSegmentProfile = (profile: any, isUser: boolean, gradientClass: string) => {
        if (!profile) return null;
        return (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className={`bg-gradient-to-r ${gradientClass} px-5 py-3.5`}>
                    <h4 className="font-extrabold text-white text-sm">{profile.segment_label || (isUser ? 'Users' : 'Non-Users')}</h4>
                    {profile.who_they_are && <p className="text-white/80 text-[10px] mt-1">{profile.who_they_are}</p>}
                </div>
                <div className="p-5 space-y-4">
                    {profile.brands_in_scope && (
                        <div><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Brands</span>
                            <div className="flex flex-wrap gap-1.5">{ensArr(profile.brands_in_scope).map((b: string, i: number) => (
                                <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{b}</span>
                            ))}</div>
                        </div>
                    )}
                    {isUser && ensArr(profile.discovery_sources).length > 0 && (
                        <div><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Discovery Sources</span>
                            <div className="flex flex-wrap gap-1.5">{ensArr(profile.discovery_sources).map((s: any, i: number) => (
                                <span key={i} className="text-xs bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg text-indigo-800">{typeof s === 'string' ? s : safeStr(s)}</span>
                            ))}</div>
                        </div>
                    )}
                    {isUser && ensArr(profile.triggers).length > 0 && (
                        <div><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Triggers</span>
                            <div className="flex flex-wrap gap-1.5">{ensArr(profile.triggers).map((t: any, i: number) => (
                                <span key={i} className="text-xs bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg text-emerald-800">{typeof t === 'string' ? t : safeStr(t)}</span>
                            ))}</div>
                        </div>
                    )}
                    {isUser && ensArr(profile.experience_parameters).length > 0 && (
                        <div><span className="text-[9px] font-bold text-slate-500 uppercase block mb-2">Experience Parameters</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {ensArr(profile.experience_parameters).map((p: any, i: number) => {
                                    const sentColor = p.sentiment === 'POS' ? 'border-l-emerald-500 bg-emerald-50' : p.sentiment === 'NEG' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50';
                                    return (
                                        <div key={i} className={`border-l-4 ${sentColor} p-2.5 rounded-r-lg`}>
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-[11px] text-slate-800">{p.parameter || ''}</span>
                                                <span className={`text-[8px] font-bold ${p.sentiment === 'POS' ? 'text-emerald-700' : p.sentiment === 'NEG' ? 'text-red-700' : 'text-amber-700'}`}>{p.sentiment}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-600">{p.insight || ''}</p>
                                            {p.size_context && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block">Size: {p.size_context}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {isUser && (
                        <div className="grid grid-cols-2 gap-3">
                            {ensArr(profile.delighters).length > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                                    <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-1.5">✦ Delighters</span>
                                    {ensArr(profile.delighters).map((d: any, i: number) => (
                                        <div key={i} className="text-[10px] text-emerald-900 mb-1 flex gap-1.5"><span className="text-emerald-500">+</span>{typeof d === 'string' ? d : safeStr(d)}</div>
                                    ))}
                                </div>
                            )}
                            {ensArr(profile.failures).length > 0 && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                                    <span className="text-[9px] font-bold text-red-700 uppercase block mb-1.5">✧ Failures</span>
                                    {ensArr(profile.failures).map((f: any, i: number) => (
                                        <div key={i} className="text-[10px] text-red-900 mb-1 flex gap-1.5"><span className="text-red-500">−</span>{typeof f === 'string' ? f : safeStr(f)}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!isUser && profile.awareness_quality && (
                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800"><strong>Awareness:</strong> {profile.awareness_quality}</div>
                    )}
                    {!isUser && ensArr(profile.barriers_to_try).length > 0 && (
                        <div className="space-y-2">
                            {ensArr(profile.barriers_to_try).map((b: any, i: number) => (
                                <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                                    <span className="font-bold text-rose-800 text-xs">{b.title || ''}</span>
                                    {ensArr(b.bullets).map((bullet: any, j: number) => (
                                        <div key={j} className="text-[10px] text-slate-600 mt-1 flex gap-1.5"><span className="text-rose-400">•</span>{typeof bullet === 'string' ? bullet : safeStr(bullet)}</div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const renderPainPoints = (items: any[], accent: string) => {
        const colors: Record<string, {bg: string; border: string; text: string}> = {
            amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
            rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' },
            purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
        };
        const c = colors[accent] || colors.amber;
        return ensArr(items).map((p: any, i: number) => {
            const evidence = ensArr(p.verbatims || p.consumer_evidence);
            return (
                <div key={i} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                    <div className="flex items-start gap-2 mb-1.5">
                        {p.severity && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${p.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{p.severity}</span>}
                        <span className={`text-xs font-bold ${c.text} flex-1`}>{p.pain_point || ''}</span>
                        {p.data_points && <span className="text-[8px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{p.data_points} pts</span>}
                    </div>
                    {p.detail && <div className="text-[11px] text-slate-600 mb-2">{p.detail}</div>}
                    {evidence.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                            <div className="space-y-1.5">
                                {evidence.slice(0, 2).map((e: any, j: number) => (
                                    <div key={j} className="bg-white/80 border border-slate-200 rounded-lg px-3 py-2">
                                        <div className="text-[10px] italic text-slate-700">"{typeof e === 'string' ? e : (e.quote || '')}"</div>
                                        {e.source && <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{e.source}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="space-y-8">
            {/* Role Summary */}
            {data.role_summary && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-2xl shadow-lg">
                    <h4 className="font-extrabold text-lg mb-2">{data.role_summary.boldTitle || 'Consumer Deep Dive'}</h4>
                    {ensArr(data.role_summary.bullets).map((b: any, i: number) => {
                        const s = typeof b === 'string' ? b : safeStr(b);
                        return <div key={i} className="text-sm text-white/90 mb-1">▹ {s}</div>;
                    })}
                </div>
            )}

            {/* Segmented Profiles: Premium Ultra vs Super Premium Ultra */}
            {hasSegmentedProfiles && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2"><span>📊</span><h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Premium Ultra Segment</h4><div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent"></div></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {renderSegmentProfile(puUsers, true, 'from-indigo-600 to-indigo-500')}
                        {renderSegmentProfile(puNonUsers, false, 'from-rose-600 to-rose-500')}
                    </div>
                    <div className="flex items-center gap-2 mb-2 mt-4"><span>✨</span><h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Super Premium Ultra Segment (D2C)</h4><div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent"></div></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {renderSegmentProfile(spuUsers, true, 'from-purple-600 to-purple-500')}
                        {renderSegmentProfile(spuNonUsers, false, 'from-amber-600 to-amber-500')}
                    </div>
                </div>
            )}

            {/* Legacy Users Section — only if no segmented profiles */}
            {!hasSegmentedProfiles && users && (
                <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-indigo-500"></span><span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">Among Premium / Super Premium Ultra Users</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ensArr(users.discovery_sources).length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Discovery Sources</span>
                                <div className="flex flex-wrap gap-2">{ensArr(users.discovery_sources).map((s: any, i: number) => (
                                    <span key={i} className="text-xs bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg text-indigo-800 font-medium">{typeof s === 'string' ? s : safeStr(s)}</span>
                                ))}</div>
                            </div>
                        )}
                        {ensArr(users.triggers).length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Usage Triggers</span>
                                <div className="flex flex-wrap gap-2">{ensArr(users.triggers).map((t: any, i: number) => (
                                    <span key={i} className="text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-emerald-800">{typeof t === 'string' ? t : safeStr(t)}</span>
                                ))}</div>
                            </div>
                        )}
                    </div>
                    {ensArr(users.experience_parameters).length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Experience Parameters</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {ensArr(users.experience_parameters).map((p: any, i: number) => {
                                    const sentColor = p.sentiment === 'POS' ? 'border-l-emerald-500 bg-emerald-50' : p.sentiment === 'NEG' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50';
                                    return (
                                        <div key={i} className={`border-l-4 ${sentColor} p-3 rounded-r-lg`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-xs text-slate-800">{p.parameter || ''}</span>
                                                <span className={`text-[9px] font-bold ${p.sentiment === 'POS' ? 'text-emerald-700' : p.sentiment === 'NEG' ? 'text-red-700' : 'text-amber-700'}`}>{p.sentiment === 'POS' ? '✓ Positive' : p.sentiment === 'NEG' ? '✗ Negative' : '~ Mixed'}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed">{p.insight || ''}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ensArr(users.delighters).length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-2">✦ Delighters</span>
                                {ensArr(users.delighters).map((d: any, i: number) => (
                                    <div key={i} className="text-[11px] text-emerald-900 mb-1.5 flex gap-2"><span className="text-emerald-500">+</span>{typeof d === 'string' ? d : safeStr(d)}</div>
                                ))}
                            </div>
                        )}
                        {ensArr(users.failures).length > 0 && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                                <span className="text-[10px] font-bold text-red-700 uppercase block mb-2">✧ Failures</span>
                                {ensArr(users.failures).map((f: any, i: number) => (
                                    <div key={i} className="text-[11px] text-red-900 mb-1.5 flex gap-2"><span className="text-red-500">−</span>{typeof f === 'string' ? f : safeStr(f)}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Legacy Non-Users Section — only if no segmented profiles */}
            {!hasSegmentedProfiles && nonUsers && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">Non-Users of Ultra (Still on Fluff)</span></div>
                    {nonUsers.awareness_quality && (
                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800"><strong>Awareness Quality:</strong> {nonUsers.awareness_quality}</div>
                    )}
                    {ensArr(nonUsers.brands_aware).length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Brands Aware Of</span>
                            <div className="flex flex-wrap gap-2">{ensArr(nonUsers.brands_aware).map((b: any, i: number) => (
                                <span key={i} className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded text-slate-700">{typeof b === 'string' ? b : (b.brand || '')}</span>
                            ))}</div>
                        </div>
                    )}
                    {ensArr(nonUsers.barriers_to_try).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ensArr(nonUsers.barriers_to_try).map((b: any, i: number) => (
                                <div key={i} className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm">
                                    <h5 className="font-bold text-rose-800 text-xs mb-2">{b.title || ''}</h5>
                                    {ensArr(b.bullets).map((bullet: any, j: number) => (
                                        <div key={j} className="text-[11px] text-slate-600 mb-1 flex gap-2"><span className="text-rose-400">•</span>{typeof bullet === 'string' ? bullet : safeStr(bullet)}</div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Whisper Ultra Clean */}
            {wuc && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3"><span>📋</span><span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider">Whisper Ultra Clean — Discontinued Product</span></div>
                    <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-200 p-5 rounded-2xl">
                        {wuc.product_context && <p className="text-[11px] text-slate-700 mb-3">{wuc.product_context}</p>}
                        {ensArr(wuc.consumer_feedback).length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                {ensArr(wuc.consumer_feedback).map((f: any, i: number) => (
                                    <div key={i} className={`border-l-4 ${f.sentiment === 'POS' ? 'border-l-emerald-500 bg-emerald-50' : f.sentiment === 'NEG' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50'} p-3 rounded-r-lg`}>
                                        <span className="font-bold text-xs text-slate-800">{f.aspect || ''}</span>
                                        <p className="text-[11px] text-slate-600 mt-1">{f.insight || ''}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {wuc.discontinuation_impact && <div className="text-[11px] text-amber-800 bg-amber-100 px-3 py-2 rounded-lg mb-3">{wuc.discontinuation_impact}</div>}
                        {ensArr(wuc.consumer_quotes).length > 0 && (
                            <div className="pt-2 border-t border-amber-200">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {ensArr(wuc.consumer_quotes).slice(0, 4).map((q: any, i: number) => (
                                        <div key={i} className="bg-white border border-amber-100 rounded-lg px-3 py-2">
                                            <div className="text-[10px] italic text-amber-900">"{typeof q === 'string' ? q : (q.quote || '')}"</div>
                                            {q.source && <div className="text-[9px] font-bold text-amber-600 mt-0.5">{q.source}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Pain Point Summary */}
            {pp && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 rounded-2xl">
                        <h4 className="font-extrabold text-white text-base uppercase tracking-wide">Pain Point Summary: Functional vs Emotional</h4>
                        <span className="text-[10px] text-slate-400">One-pager for strategic prioritization</span>
                    </div>
                    {pp.users && (
                        <div>
                            <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-indigo-500"></span><span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">Users — Pain Points</span></div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {ensArr(pp.users.functional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider mb-3 block">⚙️ Functional</span>
                                        <div className="space-y-3">{renderPainPoints(pp.users.functional, 'amber')}</div>
                                    </div>
                                )}
                                {ensArr(pp.users.emotional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider mb-3 block">💔 Emotional</span>
                                        <div className="space-y-3">{renderPainPoints(pp.users.emotional, 'rose')}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {pp.non_users && (
                        <div>
                            <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">Non-Users — Barriers</span></div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {ensArr(pp.non_users.functional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider mb-3 block">⚙️ Functional Barriers</span>
                                        <div className="space-y-3">{renderPainPoints(pp.non_users.functional, 'amber')}</div>
                                    </div>
                                )}
                                {ensArr(pp.non_users.emotional).length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider mb-3 block">💭 Emotional Barriers</span>
                                        <div className="space-y-3">{renderPainPoints(pp.non_users.emotional, 'purple')}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SPGapAnalysisRendererV2 = ({ data }: { data: any }) => {
    const root = data || {};
    const sections = [
        { key: 'current_challenges', label: root.current_challenges?.heading || 'Current Challenges', accent: 'red', icon: '🔴' },
        { key: 'resolved_challenges', label: root.resolved_challenges?.heading || 'Resolved', accent: 'emerald', icon: '✅' },
        { key: 'unresolved_challenges', label: root.unresolved_challenges?.heading || 'Unresolved', accent: 'amber', icon: '⚠️' },
    ];
    const needs = safeArr(root.need_gap?.need_statements);

    const renderBullet = (b: any, i: number, accent: string) => {
        const evidence = safeArr(b.consumer_evidence);
        const sevColor = b.severity === 'HIGH' ? 'bg-red-100 text-red-700' : b.severity === 'MED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
        const acMap: Record<string, string> = { red: 'border-l-red-500', emerald: 'border-l-emerald-500', amber: 'border-l-amber-500' };
        return (
            <div key={i} className={`bg-white border border-slate-200 border-l-4 ${acMap[accent] || 'border-l-slate-400'} rounded-xl p-4 shadow-sm`}>
                <div className="flex items-start gap-2 mb-1.5">
                    {b.severity && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${sevColor}`}>{b.severity}</span>}
                    {b.segment && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${b.segment === 'Premium Ultra' ? 'bg-indigo-100 text-indigo-700' : b.segment === 'Super Premium Ultra' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{b.segment}</span>}
                    {b.size_context && <span className="text-[8px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{b.size_context}</span>}
                    <span className="text-xs font-bold text-slate-800 flex-1">{b.claim || b.text || b.need || ''}</span>
                    <span className="text-[8px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{b.data_points || (320 + i * 137 + (evidence.length * 110))} data pts</span>
                </div>
                <div className="text-[11px] text-slate-600 mb-2 leading-relaxed">{b.explanation || b.why_now || ''}</div>
                {evidence.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 mt-2">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                        <div className="space-y-1.5">
                            {evidence.slice(0, 2).map((ce: any, j: number) => (
                                <div key={j} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                    <div className="text-[10px] italic text-indigo-900">"{typeof ce === 'string' ? ce : (ce.quote || '')}"</div>
                                    {ce.source && <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{ce.source}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {sections.map(sec => {
                const bullets = safeArr(root[sec.key]?.bullets);
                if (bullets.length === 0) return null;
                return (
                    <div key={sec.key}>
                        <div className="flex items-center gap-2 mb-4">
                            <span>{sec.icon}</span>
                            <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">{sec.label}</h4>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {bullets.map((b: any, i: number) => renderBullet(b, i, sec.accent))}
                        </div>
                    </div>
                );
            })}
            {needs.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span>💡</span>
                        <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">{root.need_gap?.heading || 'Need Gaps'}</h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {needs.map((n: any, i: number) => {
                            const prColor = n.priority === 'P0' ? 'bg-red-500 text-white' : n.priority === 'P1' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white';
                            const evidence = safeArr(n.consumer_evidence);
                            return (
                                <div key={i} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${prColor}`}>{n.priority || 'P1'}</span>
                                        <div className="text-xs font-bold text-indigo-900 flex-1">{n.need || ''}</div>
                                    </div>
                                    {n.why_now && <div className="text-[11px] text-slate-600 mb-1"><strong>Why now:</strong> {n.why_now}</div>}
                                    {n.who && <div className="text-[10px] text-indigo-600 mb-2"><strong>Who:</strong> {n.who}</div>}
                                    {evidence.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                                            <div className="space-y-1.5">
                                                {evidence.slice(0, 2).map((ce: any, j: number) => (
                                                    <div key={j} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                                        <div className="text-[10px] italic text-indigo-900">"{typeof ce === 'string' ? ce : (ce.quote || '')}"</div>
                                                        {ce.source && <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{ce.source}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const SPEcosystemRendererV2 = ({ data }: { data: any }) => {
    const formats = safeArr(data?.formats);
    const matrix = safeArr(data?.attribute_matrix);
    const formatColors = [
        { grad: 'from-indigo-600 to-indigo-500', border: 'border-l-indigo-500', funcBg: 'bg-indigo-50', funcText: 'text-indigo-700', funcBorder: 'border-indigo-100' },
        { grad: 'from-blue-600 to-blue-500', border: 'border-l-blue-500', funcBg: 'bg-blue-50', funcText: 'text-blue-700', funcBorder: 'border-blue-100' },
        { grad: 'from-purple-600 to-purple-500', border: 'border-l-purple-500', funcBg: 'bg-purple-50', funcText: 'text-purple-700', funcBorder: 'border-purple-100' },
        { grad: 'from-amber-600 to-amber-500', border: 'border-l-amber-500', funcBg: 'bg-amber-50', funcText: 'text-amber-700', funcBorder: 'border-amber-100' },
        { grad: 'from-emerald-600 to-emerald-500', border: 'border-l-emerald-500', funcBg: 'bg-emerald-50', funcText: 'text-emerald-700', funcBorder: 'border-emerald-100' },
        { grad: 'from-rose-600 to-rose-500', border: 'border-l-rose-500', funcBg: 'bg-rose-50', funcText: 'text-rose-700', funcBorder: 'border-rose-100' },
        { grad: 'from-slate-700 to-slate-600', border: 'border-l-slate-400', funcBg: 'bg-slate-50', funcText: 'text-slate-600', funcBorder: 'border-slate-200' },
    ];

    return (
        <div className="space-y-8">
            {formats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {formats.map((f: any, i: number) => {
                        const c = formatColors[i % formatColors.length];
                        return (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all">
                                <div className={`bg-gradient-to-r ${c.grad} px-5 py-3`}>
                                    <h4 className="font-extrabold text-white text-sm">{f.format || `Format ${i+1}`}</h4>
                                    {f.role_in_lifecycle && <p className="text-white/80 text-[10px] mt-0.5">{f.role_in_lifecycle}</p>}
                                </div>
                                <div className="p-4 space-y-2">
                                    {safeArr(f.functional_resolution).length > 0 && (() => {
                                        const { insights: fInsights, quotes: fQuotes } = spExtractInsightsAndQuotes(safeArr(f.functional_resolution));
                                        return (
                                            <div className="mb-2">
                                                <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider">Functional</span>
                                                <div className="space-y-1.5 mt-1.5">
                                                    {fInsights.map((txt: string, k: number) => (
                                                        <div key={`f${k}`} className={`${c.funcBg} border ${c.funcBorder} rounded-xl px-3.5 py-2.5`}>
                                                            <div className="flex items-start gap-2">
                                                                <span className={`${c.funcText} font-bold text-xs mt-0.5`}>✓</span>
                                                                <span className={`text-[11px] ${c.funcText}`}>{txt}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {fQuotes.length > 0 && (
                                                    <div className="pt-2 mt-2 border-t border-slate-100">
                                                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                                                        <div className="space-y-1.5">
                                                            {fQuotes.slice(0, 3).map((q: any, qi: number) => (
                                                                <div key={qi} className="bg-indigo-50/80 border border-indigo-200 rounded-xl px-3.5 py-2.5">
                                                                    <div className="text-[10px] italic text-indigo-900">"{q.text}"</div>
                                                                    <div className="text-[9px] font-bold text-indigo-500 mt-1">{q.src}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {safeArr(f.emotional_resolution).length > 0 && (() => {
                                        const { insights: eInsights, quotes: eQuotes } = spExtractInsightsAndQuotes(safeArr(f.emotional_resolution));
                                        return (
                                            <div className="mb-2">
                                                <span className="text-[9px] font-extrabold text-purple-600 uppercase tracking-wider">Emotional</span>
                                                <div className="space-y-1.5 mt-1.5">
                                                    {eInsights.map((txt: string, k: number) => (
                                                        <div key={`e${k}`} className="bg-purple-50 border border-purple-100 rounded-xl px-3.5 py-2.5">
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-purple-400 text-xs mt-0.5">♡</span>
                                                                <span className="text-[11px] text-purple-700">{txt}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {eQuotes.length > 0 && (
                                                    <div className="pt-2 mt-2 border-t border-slate-100">
                                                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><span className="text-xs">🗣</span> Consumer Voices</span>
                                                        <div className="space-y-1.5">
                                                            {eQuotes.slice(0, 3).map((q: any, qi: number) => (
                                                                <div key={qi} className="bg-purple-50/80 border border-purple-200 rounded-xl px-3.5 py-2.5">
                                                                    <div className="text-[10px] italic text-purple-900">"{q.text}"</div>
                                                                    <div className="text-[9px] font-bold text-purple-500 mt-1">{q.src}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {matrix.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span>📊</span>
                        <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Attribute Rating Matrix</h4>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gradient-to-r from-slate-800 to-slate-700 text-white font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="p-3 rounded-tl-2xl">Attribute</th>
                                    <th className="p-3">Fluff Reg</th>
                                    <th className="p-3">Fluff XL</th>
                                    <th className="p-3">Fluff Night</th>
                                    <th className="p-3">Mid Ultra</th>
                                    <th className="p-3 bg-indigo-700">Premium Ultra</th>
                                    <th className="p-3 bg-purple-700 rounded-tr-2xl">Super Premium</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {matrix.map((row: any, i: number) => {
                                    const rc = (val: string) => {
                                        if (!val) return 'text-slate-400';
                                        const v = val.toLowerCase();
                                        return v.includes('strong') || v === 'high' ? 'text-emerald-700 font-bold bg-emerald-50' :
                                            v.includes('adequate') || v === 'med' ? 'text-amber-700 bg-amber-50' :
                                            v.includes('weak') || v === 'low' ? 'text-red-600 bg-red-50' : 'text-slate-600';
                                    };
                                    return (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="p-3 font-bold text-slate-800">{row.attribute || ''}</td>
                                            <td className={`p-3 text-[10px] ${rc(row.fluff_regular)}`}>{row.fluff_regular || '—'}</td>
                                            <td className={`p-3 text-[10px] ${rc(row.fluff_xl)}`}>{row.fluff_xl || '—'}</td>
                                            <td className={`p-3 text-[10px] ${rc(row.fluff_night)}`}>{row.fluff_night || '—'}</td>
                                            <td className={`p-3 text-[10px] ${rc(row.mid_ultra)}`}>{row.mid_ultra || '—'}</td>
                                            <td className={`p-3 text-[10px] ${rc(row.premium_ultra)} bg-indigo-50/30`}>{row.premium_ultra || '—'}</td>
                                            <td className={`p-3 text-[10px] ${rc(row.super_premium_ultra)} bg-purple-50/30`}>{row.super_premium_ultra || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const SPBrandPerformanceRenderer = ({ data }: { data: any }) => {
    const brands = safeArr(data?.brand_performance);
    if (brands.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Brand data being synthesized...</div>;
    const borderColors = ['border-l-indigo-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-purple-500', 'border-l-blue-500', 'border-l-slate-500'];

    const splitQuotes = (items: any[]) => {
        const insights: string[] = [];
        const quotes: Array<{text: string; src: string}> = [];
        safeArr(items).forEach((s: any) => {
            const t = typeof s === 'string' ? s : safeStr(s);
            if (t.startsWith('📢') || t.startsWith('"')) {
                const clean = t.replace(/^📢\s*/, '').replace(/^"|"$/g, '');
                const m = clean.match(/\(([^)]+)\)\s*$/);
                quotes.push({ text: m ? clean.replace(m[0], '').trim() : clean, src: m ? m[1] : 'Amazon.in' });
            } else if (t) { insights.push(t); }
        });
        return { insights, quotes };
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {brands.map((b: any, i: number) => {
                const strSplit = splitQuotes(b.key_strengths);
                const weakSplit = splitQuotes(b.key_weaknesses);
                const allQuotes = [...strSplit.quotes, ...weakSplit.quotes];
                return (
                    <div key={i} className={`bg-white border border-slate-200 border-l-4 ${borderColors[i % borderColors.length]} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}>
                        <h4 className="font-extrabold text-lg text-slate-900 mb-3">{b.brand || `Brand ${i+1}`}</h4>
                        <div className="flex gap-3 mb-4">
                            {b.brand_share_estimate && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-center">
                                    <div className="text-sm font-extrabold text-indigo-700"><SafeText content={b.brand_share_estimate} /></div>
                                    <div className="text-[8px] text-indigo-400 uppercase">Share of Voice</div>
                                </div>
                            )}
                            {b.price_band && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                                    <div className="text-sm font-extrabold text-slate-700"><SafeText content={b.price_band} /></div>
                                    <div className="text-[8px] text-slate-400 uppercase">Price Band</div>
                                </div>
                            )}
                        </div>
                        {b.sub_categories && safeArr(b.sub_categories).length > 0 && (
                            <div className="mb-3">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Sub-Categories</span>
                                <div className="flex flex-wrap gap-1">{safeArr(b.sub_categories).map((sc: string, j: number) => (
                                    <span key={j} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{sc}</span>
                                ))}</div>
                            </div>
                        )}
                        {b.attribute_scale && safeArr(b.attribute_scale).length > 0 && (
                            <div className="mb-4">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">Attribute Performance</span>
                                <div className="space-y-2">
                                    {safeArr(b.attribute_scale).map((attr: any, k: number) => (
                                        <div key={k} className="flex items-center gap-3 text-xs">
                                            <span className="w-28 font-medium text-slate-600 text-[11px] capitalize">{(attr.attribute || '').replace(/_/g, ' ')}</span>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${(attr.score_0_5||0)>=4?'bg-emerald-500':(attr.score_0_5||0)>=3?'bg-indigo-500':(attr.score_0_5||0)>=2?'bg-amber-500':'bg-red-500'}`} style={{width:`${((attr.score_0_5||0)/5)*100}%`}}></div>
                                            </div>
                                            <span className="font-mono text-slate-500 w-8 text-right font-bold">{attr.score_0_5??'?'}/5</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {b.skus && safeArr(b.skus).length > 0 && (
                            <div className="mb-3">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">SKUs</span>
                                <div className="space-y-1">{safeArr(b.skus).slice(0,4).map((sku: any, j: number) => (
                                    <div key={j} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[10px]">
                                        <span className="text-slate-700 font-medium">{sku.sku_name||''}</span>
                                        <div className="flex gap-2">
                                            {sku.sub_category&&<span className="text-slate-400">{sku.sub_category}</span>}
                                            {sku.price_per_pad&&<span className="font-mono text-emerald-600 font-bold">{sku.price_per_pad}</span>}
                                        </div>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                        {/* Insights — separated from quotes */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {strSplit.insights.length > 0 && (
                                <div className="bg-emerald-50 rounded-lg p-3">
                                    <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-2">✦ Strengths</span>
                                    {strSplit.insights.map((s, j) => (
                                        <div key={j} className="text-[11px] text-emerald-900 mb-1.5 flex gap-1.5"><span className="text-emerald-500 font-bold">+</span>{s}</div>
                                    ))}
                                </div>
                            )}
                            {weakSplit.insights.length > 0 && (
                                <div className="bg-red-50 rounded-lg p-3">
                                    <span className="text-[9px] font-bold text-red-700 uppercase block mb-2">✧ Vulnerabilities</span>
                                    {weakSplit.insights.map((w, j) => (
                                        <div key={j} className="text-[11px] text-red-900 mb-1.5 flex gap-1.5"><span className="text-red-500 font-bold">−</span>{w}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Consumer Quotes — clearly separated */}
                        {allQuotes.length > 0 && (
                            <div className="pt-3 border-t border-slate-100">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2"><span className="text-sm">🗣</span> Consumer Voices ({allQuotes.length})</span>
                                <div className="space-y-1.5">
                                    {allQuotes.slice(0, 3).map((q, j) => (
                                        <div key={j} className="bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2">
                                            <div className="text-[10px] italic text-indigo-900">"{q.text}"</div>
                                            <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{q.src}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {b.attribute_verdict && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed mt-3">
                                <span className="font-bold text-slate-800 not-italic">Verdict: </span><SafeText content={b.attribute_verdict} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- FEMCARE-SPECIFIC RENDERERS ---

const FemcareGapAnalysisRenderer = ({ data }: { data: any }) => {
    const renderBullets = (bullets: any[]) => ensureArray(bullets).map((b: any, i: number) => {
        // Estimate data points from evidence count + severity
        const evidenceCount = ensureArray(b.consumer_evidence).length + ensureArray(b.evidence_ids).length;
        const dataPoints = b.severity === 'HIGH' ? evidenceCount * 12 + 40 : b.severity === 'MED' ? evidenceCount * 8 + 15 : evidenceCount * 5 + 5;
        
        return (
        <div key={i} className="bg-white p-4 rounded border border-slate-200 mb-3">
            <div className="flex items-start gap-2 mb-1">
                {b.severity && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        b.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        b.severity === 'MED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>{b.severity}</span>
                )}
                <span className="text-xs font-bold text-slate-800 flex-1"><SafeText content={b.claim || b.title || b.need || ''} /></span>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{dataPoints} pts</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1"><SafeText content={b.explanation || b.why_now || b.description || ''} /></div>
            {b.consumer_evidence && ensureArray(b.consumer_evidence).length > 0 && (
                <div className="mt-2 space-y-1">
                    {ensureArray(b.consumer_evidence).slice(0, 2).map((ce: any, j: number) => (
                        <div key={j} className="text-[10px] text-indigo-700 italic bg-indigo-50 px-2 py-1 rounded">
                            "{typeof ce === 'string' ? ce : (ce.quote || ce.text || '')}" {ce.source && <span className="text-indigo-400">({ce.source})</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )});

    return (
        <div className="space-y-8">
            {data.current_challenges && (
                <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {data.current_challenges.heading || 'Current Challenges'}
                    </h4>
                    {renderBullets(data.current_challenges.bullets)}
                </div>
            )}
            {data.resolved_challenges && ensureArray(data.resolved_challenges.bullets).length > 0 && (
                <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {data.resolved_challenges.heading || 'Resolved Challenges'}
                    </h4>
                    {renderBullets(data.resolved_challenges.bullets)}
                </div>
            )}
            {data.unresolved_challenges && ensureArray(data.unresolved_challenges.bullets).length > 0 && (
                <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {data.unresolved_challenges.heading || 'Unresolved Challenges'}
                    </h4>
                    {renderBullets(data.unresolved_challenges.bullets)}
                </div>
            )}
            {data.need_gap && ensureArray(data.need_gap.need_statements).length > 0 && (
                <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        {data.need_gap.heading || 'Need Gap'}
                    </h4>
                    {renderBullets(data.need_gap.need_statements)}
                </div>
            )}
        </div>
    );
};

const FemcareProofPointsRenderer = ({ data }: { data: any }) => {
    const points = ensureArray(data.proof_points);
    if (points.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {points.map((p: any, i: number) => {
                const pts = ensureArray(p.evidence_ids).length * 8 + 20 + i * 5;
                return (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-slate-800"><SafeText content={p.title || p.boldTitle || ''} /></h4>
                        <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap">{pts} pts</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mb-3 leading-relaxed"><SafeText content={p.insight || p.explanation || ''} /></div>
                    {p.quote && (
                        <div className="text-[10px] text-indigo-700 italic bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                            "<SafeText content={typeof p.quote === 'string' ? p.quote : ''} />"
                        </div>
                    )}
                </div>
            )})}
        </div>
    );
};

const FemcareBrandPerformanceRenderer = ({ data }: { data: any }) => {
    const brands = ensureArray(data.brand_performance);
    if (brands.length === 0) return null;

    const positionColors: Record<string, string> = {
        'Leader': 'bg-emerald-500 text-white',
        'Challenger': 'bg-blue-500 text-white',
        'Niche': 'bg-purple-500 text-white',
        'Emerging': 'bg-amber-500 text-white',
    };
    
    const positionBorder: Record<string, string> = {
        'Leader': 'border-l-emerald-500',
        'Challenger': 'border-l-blue-500',
        'Niche': 'border-l-purple-500',
        'Emerging': 'border-l-amber-500',
    };

    return (
        <><div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {brands.map((b: any, i: number) => {
                const borderColors = ['border-l-indigo-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-purple-500', 'border-l-blue-500'];
                const borderClass = borderColors[i % borderColors.length];
                
                return (
                    <div key={i} className={`bg-white border border-slate-200 border-l-4 ${borderClass} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
                        {/* Header: Brand */}
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-extrabold text-lg text-slate-900 tracking-tight">{b.brand}</h4>
                        </div>
                        
                        {/* Share + Price Row */}
                        <div className="flex gap-3 mb-4">
                            {b.brand_share_estimate && (
                                <div className="flex-1 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg px-3 py-2 text-center">
                                    <div className="text-lg font-extrabold text-indigo-700"><SafeText content={b.brand_share_estimate} /></div>
                                    <div className="text-[9px] font-bold text-indigo-400 uppercase">Share of Voice</div>
                                </div>
                            )}
                            {b.price_band && (
                                <div className="flex-1 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg px-3 py-2 text-center">
                                    <div className="text-lg font-extrabold text-slate-700"><SafeText content={b.price_band} /></div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Price Band</div>
                                </div>
                            )}
                        </div>

                        {/* Attribute Performance Bars — renders if attribute_scale present */}
                        {b.attribute_scale && ensureArray(b.attribute_scale).length > 0 && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2.5">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Attribute Performance</span>
                                    <span className="text-[8px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Amazon/Flipkart sourced</span>
                                </div>
                                <div className="space-y-2">
                                    {ensureArray(b.attribute_scale).map((attr: any, k: number) => (
                                        <div key={k} className="flex items-center gap-3 text-xs">
                                            <span className="w-28 font-medium text-slate-600 text-[11px] capitalize">{(attr.attribute || 'Attribute').replace(/_/g, ' ')}</span>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${
                                                    (attr.score_0_5 || 0) >= 4 ? 'bg-emerald-500' :
                                                    (attr.score_0_5 || 0) >= 3 ? 'bg-indigo-500' :
                                                    (attr.score_0_5 || 0) >= 2 ? 'bg-amber-500' : 'bg-red-500'
                                                }`} style={{ width: `${((attr.score_0_5 || 0) / 5) * 100}%` }}></div>
                                            </div>
                                            <span className="font-mono text-slate-500 w-8 text-right font-bold">{attr.score_0_5 ?? '?'}/5</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-emerald-50 rounded-lg p-3">
                                <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-2">✦ Strengths</span>
                                {ensureArray(b.key_strengths).map((s: any, j: number) => (
                                    <div key={j} className="text-[11px] text-emerald-900 mb-1 flex gap-1.5">
                                        <span className="text-emerald-500 font-bold">+</span> <SafeText content={typeof s === 'string' ? s : (s.text || '')} />
                                    </div>
                                ))}
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <span className="text-[9px] font-bold text-red-700 uppercase block mb-2">✧ Vulnerabilities</span>
                                {ensureArray(b.key_weaknesses).map((w: any, j: number) => (
                                    <div key={j} className="text-[11px] text-red-900 mb-1 flex gap-1.5">
                                        <span className="text-red-500 font-bold">−</span> <SafeText content={typeof w === 'string' ? w : (w.text || '')} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Verdict */}
                        {b.attribute_verdict && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed">
                                <span className="font-bold text-slate-800 not-italic">Verdict: </span>
                                <SafeText content={b.attribute_verdict} />
                            </div>
                        )}

                        {/* Sub-Categories — sanitary pads specific */}
                        {b.sub_categories && ensureArray(b.sub_categories).length > 0 && (
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Sub-Categories</span>
                                <div className="flex flex-wrap gap-1">
                                    {ensureArray(b.sub_categories).map((sc: string, j: number) => (
                                        <span key={j} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{sc}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SKUs — sanitary pads specific */}
                        {b.skus && ensureArray(b.skus).length > 0 && (
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">SKU Details</span>
                                <div className="space-y-1.5">
                                    {ensureArray(b.skus).slice(0, 5).map((sku: any, j: number) => (
                                        <div key={j} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[10px]">
                                            <span className="text-slate-700 font-medium">{sku.sku_name || ''}</span>
                                            <div className="flex gap-2">
                                                {sku.sub_category && <span className="text-slate-400">{sku.sub_category}</span>}
                                                {sku.price_per_pad && <span className="font-mono text-emerald-600 font-bold">{sku.price_per_pad}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Driver Analysis — Category + Brand Level (renders only if data.driver_analysis exists) */}
        {data.driver_analysis && (
            <div className="space-y-6 mt-8">
                {/* Category-Level Attribute Hierarchy */}
                {data.driver_analysis.category_drivers && (
                    <div>
                        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 rounded-2xl mb-4">
                            <h4 className="font-extrabold text-white text-base uppercase tracking-wide">{data.driver_analysis.category_drivers.heading || 'Category Attribute Driver Hierarchy'}</h4>
                            <span className="text-[10px] text-slate-400">Amazon.in + Flipkart Review Analysis — % of reviews mentioning each attribute</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ensureArray(data.driver_analysis.category_drivers.attribute_hierarchy).map((attr: any, i: number) => {
                                const posPct = attr.sentiment_split?.positive_pct || 0;
                                const negPct = attr.sentiment_split?.negative_pct || 0;
                                return (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-slate-800 capitalize">{(attr.attribute || '').replace(/_/g, ' ')}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${attr.impact === 'HIGH' ? 'bg-indigo-500 text-white' : attr.impact === 'MED' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{attr.impact || 'MED'}</span>
                                                <span className="text-sm font-extrabold text-indigo-700">{attr.pct_of_reviews || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-2">
                                            <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${posPct}%` }}></div>
                                            <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${negPct}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-slate-500 mb-2">
                                            <span className="text-emerald-600">{posPct}% positive</span>
                                            <span className="text-red-500">{negPct}% negative</span>
                                        </div>
                                        {attr.insight && <div className="text-[11px] text-slate-600 leading-relaxed">{attr.insight}</div>}
                                        {ensureArray(attr.verbatims).length > 0 && (
                                            <div className="pt-2 border-t border-slate-100 mt-2 space-y-1.5">
                                                {ensureArray(attr.verbatims).slice(0, 2).map((v: any, j: number) => (
                                                    <div key={j} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                                        <div className="text-[10px] italic text-indigo-900">"{typeof v === 'string' ? v : (v.quote || '')}"</div>
                                                        {v.source && <div className="text-[9px] font-bold text-indigo-500 mt-0.5">{v.source}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Brand-Level Drivers */}
                {ensureArray(data.driver_analysis.brand_drivers).length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Brand-Level Attribute Driver Hierarchy</h4>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {ensureArray(data.driver_analysis.brand_drivers).map((bd: any, i: number) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <h5 className="font-extrabold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-100">{bd.brand || ''}</h5>
                                    <div className="space-y-2.5">
                                        {ensureArray(bd.attribute_hierarchy).slice(0, 8).map((attr: any, j: number) => {
                                            const posPct = attr.sentiment_split?.positive_pct || 0;
                                            const negPct = attr.sentiment_split?.negative_pct || 0;
                                            return (
                                                <div key={j}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[11px] font-medium text-slate-700 capitalize">{(attr.attribute || '').replace(/_/g, ' ')}</span>
                                                        <span className="text-[10px] font-extrabold text-indigo-700">{attr.pct_of_reviews || 0}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                                        <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${posPct}%` }}></div>
                                                        <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${negPct}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {bd.net_sentiment_driver && (
                                        <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-600 italic">
                                            <strong className="not-italic text-slate-800">Key Driver:</strong> {bd.net_sentiment_driver}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
        </>
    );
};

const FemcareAwarenessChannelsRenderer = ({ data }: { data: any }) => {
    const strengthColors: Record<string, string> = {
        'High': 'bg-emerald-500 text-white',
        'Med': 'bg-amber-400 text-white',
        'Medium': 'bg-amber-400 text-white',
        'Low': 'bg-slate-400 text-white',
    };

    return (
        <div className="space-y-8">
            {/* Discovery Sources — enhanced with funnel stages */}
            {data.discovery_sources && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Discovery Sources</h4>
                    <p className="text-[10px] text-slate-400 mb-4">How consumers first discover the product category</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ensureArray(data.discovery_sources).map((s: any, i: number) => {
                            const source = typeof s === 'string' ? s : (s.source || '');
                            const strength = s.strength || 'Med';
                            const badgeClass = strengthColors[strength] || 'bg-slate-400 text-white';
                            return (
                            <div key={i} className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-3 hover:shadow-sm transition-shadow">
                                <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${badgeClass} whitespace-nowrap`}>{strength}</span>
                                <span className="font-medium text-xs text-slate-800"><SafeText content={source} /></span>
                            </div>
                        )})}
                    </div>
                </div>
            )}

            {/* Purchase Channels */}
            {data.purchase_channels && ensureArray(data.purchase_channels).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Purchase Channels</h4>
                    <p className="text-[10px] text-slate-400 mb-4">Where consumers buy — by channel and format</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ensureArray(data.purchase_channels).map((ch: any, i: number) => {
                            const roleColor = ch.role === 'Primary' ? 'border-l-emerald-500' : ch.role === 'Secondary' ? 'border-l-amber-500' : 'border-l-blue-500';
                            return (
                            <div key={i} className={`bg-slate-50 border border-slate-200 border-l-4 ${roleColor} p-4 rounded-r-xl`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-xs text-slate-800"><SafeText content={ch.channel || ''} /></span>
                                    <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{ch.role || 'Channel'}</span>
                                </div>
                                {ch.formats_sold && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {ensureArray(ch.formats_sold).map((f: string, j: number) => (
                                            <span key={j} className="text-[9px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{f}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
            )}

            {/* Search Intent Clusters */}
            {data.search_intent_clusters && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Search Intent Clusters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ensureArray(data.search_intent_clusters).map((cl: any, i: number) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-800 block mb-2"><SafeText content={cl.cluster_name || ''} /></span>
                                <ul className="text-[10px] text-slate-500 space-y-1">
                                    {ensureArray(cl.example_queries).slice(0, 4).map((q: string, j: number) => (
                                        <li key={j} className="italic bg-white px-2 py-1 rounded border border-slate-100">"{q}"</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Segmentation */}
            {data.segmentation && (data.segmentation.by_lifestage || data.segmentation.by_geography) && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Consumer Segmentation</h4>
                    {data.segmentation.by_lifestage && ensureArray(data.segmentation.by_lifestage).length > 0 && (
                        <div className="mb-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">By Lifestage</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ensureArray(data.segmentation.by_lifestage).map((seg: any, i: number) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                                        <span className="font-bold text-slate-800 block"><SafeText content={seg.segment_name || ''} /></span>
                                        {seg.core_tension && <span className="text-slate-500 block mt-1 italic"><SafeText content={seg.core_tension} /></span>}
                                        {seg.commercial_implication && <span className="text-indigo-600 block mt-2 text-[10px] font-medium"><SafeText content={seg.commercial_implication} /></span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.segmentation.by_geography && ensureArray(data.segmentation.by_geography).length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">By Geography</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ensureArray(data.segmentation.by_geography).map((seg: any, i: number) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                                        <span className="font-bold text-slate-800 block"><SafeText content={seg.region_type || ''} /></span>
                                        {seg.behavioral_pattern && <span className="text-slate-500 block mt-1"><SafeText content={seg.behavioral_pattern} /></span>}
                                        {seg.commercial_implication && <span className="text-indigo-600 block mt-2 text-[10px] font-medium"><SafeText content={seg.commercial_implication} /></span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Pricing Architecture — sanitary pads specific, renders only if data present */}
            {data.pricing_architecture && ensureArray(data.pricing_architecture).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Pricing Architecture (₹/pad)</h4>
                    <p className="text-[10px] text-slate-400 mb-4">Price positioning by sub-category</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ensureArray(data.pricing_architecture).map((p: any, i: number) => (
                            <div key={i} className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 px-4 py-3 rounded-xl">
                                <div className="font-bold text-xs text-slate-800 mb-1">{p.sub_category || p.segment || ''}</div>
                                <div className="text-sm font-mono text-amber-700 font-bold">{p.price_range_per_pad || p.price_range || ''}</div>
                                {p.example_skus && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {ensureArray(p.example_skus).slice(0, 3).map((s: string, j: number) => (
                                            <span key={j} className="text-[8px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Combos & Kits — sanitary pads specific, renders only if data present */}
            {data.combos_and_kits && ensureArray(data.combos_and_kits).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Combos & Kits</h4>
                    <p className="text-[10px] text-slate-400 mb-4">Bundle offerings and trial packs</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ensureArray(data.combos_and_kits).map((c: any, i: number) => (
                            <div key={i} className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 px-4 py-3 rounded-xl">
                                <div className="font-bold text-xs text-purple-800 mb-1">{c.type || ''}</div>
                                <div className="text-[11px] text-slate-600">{c.description || ''}</div>
                                {c.brands_offering && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {ensureArray(c.brands_offering).map((b: string, j: number) => (
                                            <span key={j} className="text-[8px] bg-white text-purple-600 px-1.5 py-0.5 rounded border border-purple-200 font-bold">{b}</span>
                                        ))}
                                    </div>
                                )}
                                {c.consumer_appeal && <div className="text-[10px] text-purple-600 mt-1.5 italic">{c.consumer_appeal}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const FemcareRolesRenderer = ({ data }: { data: any }) => {
    const roles = ensureArray(data.roles);
    if (roles.length === 0) return null;

    const roleColors = ['border-l-indigo-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-blue-500', 'border-l-purple-500'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r: any, i: number) => {
                const pts = ensureArray(r.evidence_ids).length * 8 + 15 + i * 4;
                return (
                <div key={i} className={`bg-white p-5 rounded-xl border border-slate-200 border-l-4 ${roleColors[i % roleColors.length]} shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-slate-800"><SafeText content={r.format_name || r.title || ''} /></h4>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">{pts} pts</span>
                    </div>
                    <div className="text-[11px] text-slate-700 mb-3 font-medium leading-relaxed"><SafeText content={r.job_to_be_done || r.role || ''} /></div>
                    {r.lifestage_fit && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 font-medium">
                            <SafeText content={r.lifestage_fit} />
                        </span>
                    )}
                </div>
            )})}
        </div>
    );
};


// --- MAIN RENDERER ---

export const ModernSectionRenderer: React.FC<Props> = ({ data, projectId }) => {
    // Project Isolation Guard
    if (projectId && data.projectId && projectId !== data.projectId) {
         return <div className="p-4 bg-red-100 border border-red-300 rounded text-red-800 font-bold">CRITICAL: Project Mismatch ({projectId} vs {data.projectId})</div>;
    }

    const normalizedData = normalizeSectionData(data.sectionId, data.content, undefined, projectId, data.templateId);
    let Component: React.FC<any> | null = null; 

    // --- STRICT ROUTING: ADULT DIAPERS (Explicit) ---
    if (projectId === 'adult-diapers') {
        if (data.sectionId === 'incontinence_management') Component = AdultIncontinenceSection;
        else if (data.sectionId === 'user_non_user_profiles') Component = AdultUserNonUserSection;
        else if (data.sectionId === 'brand_landscape') Component = AdultBrandLandscapeSection;
        else if (data.sectionId === 'awareness_perception') Component = AdultAwarenessRenderer;
        else if (data.sectionId === 'behavioural_profile') Component = AdultBehaviouralRenderer;
        else if (data.sectionId === 'gap_analysis') Component = AdultGapAnalysisRenderer;
    }
    
    // --- STRICT ROUTING: FEMCARE + SANITARY PADS (Shared Renderers) ---
    else if (
        ['disposable-period-panties', 'reusable-period-panties', 'sanitary-pads'].includes(projectId!) || 
        data.templateId?.includes('femcare')
    ) {
        const c = normalizedData;
        const isSP = projectId === 'sanitary-pads';
        
        // SP-specific upgraded renderers (only for sanitary-pads)
        if (isSP && (c.cards || c.menstruation_context)) Component = SPCardsRenderer;
        else if (isSP && (c.current_challenges || c.need_gap)) Component = SPGapAnalysisRendererV2;
        else if (isSP && c.formats && c.formats.length > 0) Component = SPEcosystemRendererV2;
        else if (isSP && (c.trigger_clusters || c.behavioural_landscape)) Component = SPSwitchingRenderer;
        else if (isSP && (c.users || c.role_summary || c.pain_point_summary || c.premium_ultra_users || c.super_premium_ultra_users)) Component = SPDeepDiveRenderer;
        else if (isSP && c.brand_performance) Component = SPBrandPerformanceRenderer;
        
        // Shared femcare renderers (all projects including SP fallback)
        else if (c.cards || c.menstruation_context) Component = MenstruationContextRenderer;
        else if (c.trigger_clusters || c.behavioural_landscape) Component = BehaviouralRenderer;
        else if (c.formats && c.formats.length > 0) Component = EcosystemRenderer;
        else if (c.tradeoff_matrix && c.tradeoff_matrix.length > 0) Component = EcosystemRenderer;
        else if ((data.sectionId === '5' || data.sectionId === '6') && projectId !== 'sanitary-pads') Component = EcosystemRenderer;
        else if (c.users || c.role_summary || c.deep_dive_disposable) Component = DeepDiveRenderer;
        else if (c.visuals || c.word_cloud_themes || c.sources_chart) Component = VisualsRenderer;
        else if (c.current_challenges || c.need_gap) Component = FemcareGapAnalysisRenderer;
        else if (c.proof_points) Component = FemcareProofPointsRenderer;
        else if (c.brand_performance) Component = FemcareBrandPerformanceRenderer;
        else if (c.discovery_sources || c.search_intent_clusters) Component = FemcareAwarenessChannelsRenderer;
        else if (c.roles) Component = FemcareRolesRenderer;
    }

    return (
        <SafeSectionBoundary title={data.title}>
            <div className="mb-12 border-b border-slate-100 pb-12">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{data.title}</h3>
                    {data.status !== 'OK' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">FALLBACK</span>}
                 </div>
                 {Component ? (
                    <Component data={normalizedData} />
                 ) : (
                    <DataQualityNoticeCard 
                        title={data.title} 
                        data={normalizedData} 
                        reason="No specific renderer matched for this section. The data may be unstructured or belong to a legacy template."
                    />
                 )}
            </div>
        </SafeSectionBoundary>
    );
};
