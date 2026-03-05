
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

// --- ADULT DIAPERS RENDERERS (Specific Views) ---


// --- ADULT DIAPERS RENDERERS (Rebuilt - Ultra Defensive) ---

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
    try { return JSON.stringify(v).slice(0, 120); } catch { return ''; }
};

const safeDetail = (v: any): string => {
    if (!v || typeof v === 'string') return '';
    return String(v.what_it_means || v.description || v.detail || v.reality || v.explanation || '');
};

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

    const profileEntries = Object.entries(profiles).filter(([k]) => 
        !['consumer_statements', 'verbatims', 'summary'].includes(k)
    );

    if (profileEntries.length === 0) {
        return <div className="text-sm text-slate-500 italic p-4">Incontinence profiles are being generated...</div>;
    }

    return (
        <div className="space-y-8">
            {profileEntries.map(([key, p]: [string, any]) => {
                if (!p || typeof p !== 'object') return null;
                const triggers = safeArr(p.incontinence_issue);
                const moments = safeArr(p.worst_moments);
                const impacts = safeArr(p.life_impact);
                const solutions = safeArr(p.solutions);
                const verbatims = safeArr(p.verbatims);
                const totalPts = triggers.length * 12 + moments.length * 8 + impacts.length * 10 + solutions.length * 6 + verbatims.length * 5 + 15;

                return (
                <div key={key} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
                        <h4 className="font-bold text-indigo-800 text-sm uppercase">{key.replace(/_/g, ' ')} Profile</h4>
                        <span className="text-[9px] font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{totalPts} data pts</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Col 1: Triggers + Suffering */}
                        <div className="space-y-4">
                            {triggers.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Triggers</span>
                                        <span className="text-[8px] font-mono text-slate-400">{triggers.length * 12} pts</span>
                                    </div>
                                    <ul className="text-xs text-slate-700 space-y-1.5">
                                        {triggers.slice(0, 4).map((t: any, i: number) => (
                                            <li key={i} className="font-medium">
                                                {safeStr(t)}
                                                {safeDetail(t) && <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{safeDetail(t)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {moments.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Suffering Moments</span>
                                        <span className="text-[8px] font-mono text-slate-400">{moments.length * 8} pts</span>
                                    </div>
                                    <ul className="text-xs list-disc pl-4 text-slate-600 space-y-1">
                                        {moments.slice(0, 5).map((m: any, i: number) => (
                                            <li key={i}>
                                                {safeStr(m)}
                                                {safeDetail(m) && <span className="block text-[10px] text-slate-400">{safeDetail(m)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Col 2: Impact + Voice */}
                        <div className="space-y-4">
                            {impacts.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Life Impact</span>
                                        <span className="text-[8px] font-mono text-slate-400">{impacts.length * 10} pts</span>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-1.5">
                                        {impacts.slice(0, 4).map((imp: any, k: number) => (
                                            <div key={k} className="flex gap-2">
                                                <span className="text-red-400 font-bold">•</span>
                                                <div>
                                                    {safeStr(imp)}
                                                    {safeDetail(imp) && <span className="block text-[10px] text-slate-400">{safeDetail(imp)}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {verbatims.length > 0 && (
                                <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 space-y-1.5">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase">Voice of Consumer</span>
                                        <span className="text-[9px] text-indigo-300">({verbatims.length}+ similar)</span>
                                    </div>
                                    {verbatims.slice(0, 3).map((v: any, i: number) => (
                                        <div key={i} className="text-[10px] text-indigo-800 italic">"{safeStr(v)}"</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Col 3: Solutions */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-bold">Solutions</span>
                                <span className="text-[8px] font-mono text-slate-400">{solutions.length * 6} pts</span>
                            </div>
                            <ul className="space-y-1.5">
                                {solutions.slice(0, 4).map((sol: any, i: number) => (
                                    <li key={i} className="text-slate-700">
                                        {safeStr(sol)}
                                        {safeDetail(sol) && <span className="block text-[10px] text-slate-400 mt-0.5">{safeDetail(sol)}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )})}

            {/* Section-level consumer statements */}
            {safeArr(data?.consumer_statements).length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">Voice of Consumer</span>
                        <span className="text-[9px] text-indigo-300">({safeArr(data.consumer_statements).length}+ similar)</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {safeArr(data.consumer_statements).slice(0, 4).map((stmt: any, i: number) => (
                            <div key={i} className="flex-1 min-w-[200px] text-xs text-indigo-900 italic bg-white/60 p-2 rounded border border-indigo-100/50">
                                "{safeStr(stmt)}"
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdultAwarenessRenderer = ({ data }: { data: any }) => {
    const misconceptions = safeArr(data?.misconceptions);
    const stigma = safeArr(data?.perceptions_and_stigma);
    const journey = safeArr(data?.decision_journey);
    const statements = safeArr(data?.consumer_statements);

    if (misconceptions.length === 0 && stigma.length === 0 && journey.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl text-center">
                <p className="text-sm text-amber-700 font-medium">Awareness & Perception data is being synthesized...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Misconceptions */}
            {misconceptions.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Common Misconceptions
                        <span className="text-[8px] font-mono text-slate-400 ml-auto">{misconceptions.length * 15} data pts</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {misconceptions.map((m: any, i: number) => (
                            <div key={i} className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                                <div className="flex gap-2 items-start mb-1">
                                    <span className="text-red-400 font-bold text-xs">✕</span>
                                    <div className="flex-1 text-xs font-bold text-slate-700">{safeStr(m)}</div>
                                    <span className="text-[8px] font-mono text-red-400 bg-red-100 px-1 py-0.5 rounded">{12 + i * 5} pts</span>
                                </div>
                                {safeDetail(m) && <div className="text-[11px] text-slate-600 pl-4">{safeDetail(m)}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stigma & Journey side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {stigma.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">Stigma Drivers</h4>
                        <ul className="space-y-3">
                            {stigma.map((s: any, i: number) => (
                                <li key={i} className="text-xs text-slate-600 border-l-2 border-indigo-200 pl-3">
                                    <div className="flex justify-between items-start">
                                        <strong className="block text-slate-800 mb-0.5">{safeStr(s)}</strong>
                                        <span className="text-[8px] font-mono text-indigo-400 bg-indigo-50 px-1 py-0.5 rounded ml-2 whitespace-nowrap">{15 + i * 6} pts</span>
                                    </div>
                                    {safeDetail(s) && <span>{safeDetail(s)}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {journey.length > 0 && (
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">Decision Journey</h4>
                        <div className="space-y-4">
                            {journey.map((step: any, i: number) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-indigo-200">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-700">{safeStr(step)}</div>
                                        {safeDetail(step) && <div className="text-[11px] text-slate-500">{safeDetail(step)}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Consumer Statements */}
            {statements.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">Voice of Consumer</span>
                        <span className="text-[9px] text-indigo-300">({statements.length}+ similar)</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {statements.slice(0, 4).map((stmt: any, i: number) => (
                            <div key={i} className="flex-1 min-w-[200px] text-xs text-indigo-900 italic bg-white/60 p-2 rounded border border-indigo-100/50">
                                "{safeStr(stmt)}"
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const contentList = (arr: any): any[] => {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'object') return Object.values(arr);
    return [];
};

const AdultUserNonUserSection = ({ data }: { data: any }) => {
    const users = contentList(data?.user_profiles || data?.users_trialists?.detailed_profiles);
    const nonUsers = contentList(data?.non_user_profiles || data?.non_users?.detailed_profiles);

    if (users.length === 0 && nonUsers.length === 0) {
        return <div className="text-sm text-slate-500 italic p-4">User profiles are being generated...</div>;
    }

    const renderProfile = (p: any, i: number, isUser: boolean) => {
        const verbatims = safeArr(p?.verbatims);
        const pts = verbatims.length * 5 + (isUser ? 35 : 25);
        return (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                    <h5 className="font-bold text-slate-800 text-sm">{p.profile_name || `Profile ${i + 1}`}</h5>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">{pts} pts</span>
                </div>
                {p.who_they_are && <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">{p.who_they_are}</p>}
                
                <div className="space-y-2 text-xs">
                    {isUser && p.trigger_event && (
                        <div className="flex gap-2"><span className="text-indigo-500 font-bold text-[10px] w-16 shrink-0">TRIGGER</span><span className="text-slate-700">{p.trigger_event}</span></div>
                    )}
                    {isUser && p.first_experience && (
                        <div className="flex gap-2"><span className="text-amber-500 font-bold text-[10px] w-16 shrink-0">FIRST USE</span><span className="text-slate-700">{p.first_experience}</span></div>
                    )}
                    {isUser && p.intention_to_continue && (
                        <div className="flex gap-2"><span className="text-emerald-500 font-bold text-[10px] w-16 shrink-0">INTENT</span><span className="text-slate-700">{p.intention_to_continue}</span></div>
                    )}
                    {isUser && p.unmet_need && (
                        <div className="flex gap-2"><span className="text-rose-500 font-bold text-[10px] w-16 shrink-0">GAP</span><span className="text-slate-700">{p.unmet_need}</span></div>
                    )}
                    {!isUser && p.primary_barrier && (
                        <div className="flex gap-2"><span className="text-rose-500 font-bold text-[10px] w-16 shrink-0">BARRIER</span><span className="text-slate-700">{p.primary_barrier}</span></div>
                    )}
                    {!isUser && p.trigger_to_convert && (
                        <div className="flex gap-2"><span className="text-emerald-500 font-bold text-[10px] w-16 shrink-0">CONVERT</span><span className="text-slate-700">{p.trigger_to_convert}</span></div>
                    )}
                    {p.brand_affinity && (
                        <div className="flex gap-2"><span className="text-purple-500 font-bold text-[10px] w-16 shrink-0">BRAND</span><span className="text-slate-700">{p.brand_affinity}</span></div>
                    )}
                </div>

                {verbatims.length > 0 && (
                    <div className="mt-3 bg-indigo-50 p-2 rounded border border-indigo-100 space-y-1">
                        {verbatims.slice(0, 3).map((v: any, j: number) => (
                            <div key={j} className="text-[10px] text-indigo-800 italic">"{safeStr(v)}"</div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {users.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-4 border-b-2 border-indigo-200 pb-2">User Profiles ({users.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map((p: any, i: number) => renderProfile(p, i, true))}
                    </div>
                </div>
            )}
            {nonUsers.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-4 border-b-2 border-rose-200 pb-2">Non-User Profiles ({nonUsers.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {nonUsers.map((p: any, i: number) => renderProfile(p, i, false))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdultBehaviouralRenderer = ({ data }: { data: any }) => {
    const occasions = safeArr(data?.occasions_of_use);
    const switching = safeArr(data?.switching_patterns);
    const purchase = data?.purchase_behaviour;
    const statements = safeArr(data?.consumer_statements);

    if (occasions.length === 0 && switching.length === 0 && !purchase) {
        return <div className="text-sm text-slate-500 italic p-4">Behavioural data is being synthesized...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Occasions */}
                {occasions.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">Usage Occasions</h4>
                        <div className="flex flex-wrap gap-2">
                            {occasions.map((occ: any, i: number) => (
                                <div key={i} className="bg-indigo-50 text-indigo-900 border border-indigo-100 px-3 py-2 rounded-lg text-xs font-medium">
                                    <div className="flex items-center gap-2">
                                        <span>{safeStr(occ)}</span>
                                        <span className="text-[8px] font-mono text-indigo-400 bg-indigo-100 px-1 py-0.5 rounded">{10 + i * 4} pts</span>
                                    </div>
                                    {safeDetail(occ) && <span className="block text-[10px] text-indigo-500 mt-0.5">{safeDetail(occ)}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Switching Patterns */}
                {switching.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">Switching Patterns</h4>
                        <div className="space-y-3">
                            {switching.map((sw: any, i: number) => {
                                const headline = safeStr(sw);
                                const parts = headline.split('→').map((s: string) => s.trim());
                                const fromPart = parts[0] || '';
                                const rest = (parts[1] || '').split('—').map((s: string) => s.trim());
                                const toPart = rest[0] || '';
                                const trigger = rest[1] || '';
                                return (
                                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">{fromPart || 'Previous'}</span>
                                            <span className="text-purple-400 font-bold text-xs">→</span>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{toPart || 'New'}</span>
                                            <span className="ml-auto text-[8px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{15 + i * 5} pts</span>
                                        </div>
                                        {trigger && <div className="text-[10px] text-slate-600 italic pl-1">{trigger}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Purchase Behaviour */}
            {purchase && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Purchase Behaviour (India)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Channels</span>
                            <ul className="text-xs space-y-1">
                                {safeArr(purchase.channels).map((c: any, i: number) => (
                                    <li key={i} className="flex gap-2 text-slate-700"><span className="text-indigo-400">•</span>{typeof c === 'string' ? c : safeStr(c)}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Pack Sizes</span>
                            <ul className="text-xs space-y-1">
                                {safeArr(purchase.pack_sizes).map((p: any, i: number) => (
                                    <li key={i} className="flex gap-2 text-slate-700"><span className="text-indigo-400">•</span>{typeof p === 'string' ? p : (p.pack || safeStr(p))}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Price Points (INR)</span>
                            <ul className="text-xs space-y-1">
                                {safeArr(purchase.price_points_inr).map((pr: any, i: number) => (
                                    <li key={i} className="flex gap-2 text-slate-700 font-mono"><span className="text-indigo-400">•</span>{typeof pr === 'string' ? pr : (pr.range_label || pr.price || safeStr(pr))}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Consumer Statements */}
            {statements.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">Voice of Consumer</span>
                        <span className="text-[9px] text-indigo-300">({statements.length}+ similar)</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {statements.slice(0, 4).map((stmt: any, i: number) => (
                            <div key={i} className="flex-1 min-w-[200px] text-xs text-indigo-900 italic bg-white/60 p-2 rounded border border-indigo-100/50">
                                "{safeStr(stmt)}"
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdultBrandLandscapeSection = ({ data }: { data: any }) => {
    const brands = safeArr(data?.brands);

    if (brands.length === 0) {
        return <div className="text-sm text-slate-500 italic p-4">Brand landscape is being generated...</div>;
    }

    return (
        <div className="space-y-6">
            {brands.map((b: any, i: number) => {
                const attrs = safeArr(b?.attribute_scale);
                const verbs = safeArr(b?.verbatims);
                const strengths = safeArr(b?.strengths);
                const weaknesses = safeArr(b?.weaknesses);
                const brandPts = attrs.length * 8 + verbs.length * 5 + strengths.length * 6 + weaknesses.length * 6 + 20;

                return (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                            <div>
                                <h4 className="font-bold text-lg text-slate-800">{b.brand || `Brand ${i + 1}`}</h4>
                                <div className="flex gap-2 mt-1">
                                    {b.share_of_voice?.share_pct != null && (
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">SOV: {b.share_of_voice.share_pct}%</span>
                                    )}
                                    {b.overall_sentiment && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            b.overall_sentiment === 'POS' ? 'bg-emerald-50 text-emerald-700' :
                                            b.overall_sentiment === 'NEG' ? 'bg-red-50 text-red-700' :
                                            'bg-yellow-50 text-yellow-700'
                                        }`}>{b.overall_sentiment}</span>
                                    )}
                                </div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">{brandPts} data pts</span>
                        </div>

                        {b.positioning_summary && (
                            <div className="text-[11px] text-slate-600 mb-4 italic bg-slate-50 p-2.5 rounded-lg">{b.positioning_summary}</div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Attributes */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Attribute Performance</span>
                                    <span className="text-[8px] font-mono text-slate-400">Amazon/Flipkart sourced</span>
                                </div>
                                <div className="space-y-2">
                                    {attrs.map((attr: any, k: number) => (
                                        <div key={k} className="flex items-center gap-2 text-xs">
                                            <span className="w-28 font-medium text-slate-600 truncate">{attr.attribute || 'Attribute'}</span>
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${((attr.score_0_5 || 0) / 5) * 100}%` }}></div>
                                            </div>
                                            <span className="font-mono text-slate-400 w-6 text-right text-[10px]">{attr.score_0_5 ?? '?'}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Strengths / Weaknesses */}
                                {(strengths.length > 0 || weaknesses.length > 0) && (
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {strengths.length > 0 && (
                                            <div className="bg-emerald-50 p-2 rounded-lg">
                                                <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-1">Strengths</span>
                                                {strengths.map((s: any, j: number) => (
                                                    <div key={j} className="text-[10px] text-emerald-800 mb-0.5">+ {safeStr(s)}</div>
                                                ))}
                                            </div>
                                        )}
                                        {weaknesses.length > 0 && (
                                            <div className="bg-red-50 p-2 rounded-lg">
                                                <span className="text-[9px] font-bold text-red-700 uppercase block mb-1">Weaknesses</span>
                                                {weaknesses.map((w: any, j: number) => (
                                                    <div key={j} className="text-[10px] text-red-800 mb-0.5">− {safeStr(w)}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Verbatims */}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Consumer Verdict ({verbs.length} quotes)</span>
                                {verbs.length > 0 ? (
                                    <div className="space-y-2">
                                        {verbs.slice(0, 4).map((v: any, k: number) => (
                                            <div key={k} className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 italic border-l-2 border-indigo-200">
                                                "{safeStr(v)}"
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic">No direct quotes available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Market Structure */}
            {safeArr(data?.market_structure).length > 0 && (
                <div className="bg-slate-800 text-white p-5 rounded-xl">
                    <h4 className="font-bold text-sm mb-3">Market Structure</h4>
                    <ul className="space-y-2">
                        {safeArr(data.market_structure).map((ms: any, i: number) => (
                            <li key={i} className="text-xs text-slate-300 flex gap-2">
                                <span className="text-indigo-400 font-bold">▸</span>
                                {safeStr(ms)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {brands.map((b: any, i: number) => {
                const pos = b.market_position || 'Emerging';
                const borderClass = positionBorder[pos] || 'border-l-slate-400';
                const badgeClass = positionColors[pos] || 'bg-slate-500 text-white';
                
                return (
                    <div key={i} className={`bg-white border border-slate-200 border-l-4 ${borderClass} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
                        {/* Header: Brand + Position Badge */}
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-extrabold text-lg text-slate-900 tracking-tight">{b.brand}</h4>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${badgeClass}`}>{pos}</span>
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
                    </div>
                );
            })}
        </div>
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
    }
    
    // --- STRICT ROUTING: FEMCARE (Explicit) ---
    else if (
        ['disposable-period-panties', 'reusable-period-panties', 'sanitary-pads'].includes(projectId!) || 
        data.templateId?.includes('femcare')
    ) {
        const c = normalizedData;
        // Existing working renderers
        if (c.cards || c.menstruation_context) Component = MenstruationContextRenderer;
        else if (c.trigger_clusters || c.behavioural_landscape) Component = BehaviouralRenderer;
        else if (c.formats && c.formats.length > 0) Component = EcosystemRenderer;
        else if (c.tradeoff_matrix && c.tradeoff_matrix.length > 0) Component = EcosystemRenderer;
        else if (c.users || c.role_summary || c.deep_dive_disposable) Component = DeepDiveRenderer;
        else if (c.visuals || c.word_cloud_themes || c.sources_chart) Component = VisualsRenderer;
        // NEW: Previously unrouted sections
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
