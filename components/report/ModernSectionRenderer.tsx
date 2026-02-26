
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

// --- SHARED HELPERS ---

const QuoteBlock = ({ quotes, limit }: { quotes: any[], limit?: number }) => {
    const items = ensureArray(quotes).slice(0, limit || 3);
    if (items.length === 0) return null;
    return (
        <div className="mt-3 space-y-1.5">
            {items.map((q: any, i: number) => {
                const text = typeof q === 'string' ? q : (q.text || q.quote || q.consumer_quote || '');
                if (!text) return null;
                return (
                    <div key={i} className="border-l-[3px] border-indigo-400 bg-indigo-50/60 px-3 py-2 rounded-r">
                        <div className="text-[11px] text-indigo-900 italic leading-relaxed font-medium">
                            <SafeText content={text} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const SectionLabel = ({ children, color }: { children: string, color?: string }) => (
    <div className="flex items-center gap-2 mb-3">
        <div className={`w-1 h-4 rounded-full ${color || 'bg-indigo-500'}`}></div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{children}</span>
    </div>
);

// --- ADULT DIAPERS RENDERERS ---

const AdultIncontinenceSection = ({ data }: { data: any }) => {
    const profiles = data.profiles || {};

    const extractText = (item: any): string => {
        if (!item) return '';
        if (typeof item === 'string') return item.replace(/[{}\[\]"]/g, '');
        return item.headline || item.text || item.title || (Object.values(item).find(v => typeof v === 'string' && (v as string).length > 0) as string) || '';
    };

    const extractDetail = (item: any): string => {
        if (!item || typeof item === 'string') return '';
        return item.what_it_means || item.description || item.detail || item.reality || '';
    };

    return (
        <div className="space-y-8">
            {Object.entries(profiles).map(([key, p]: [string, any]) => (
                <div key={key} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h4 className="font-bold text-indigo-800 text-sm uppercase mb-5 border-b border-indigo-100 pb-2 tracking-wide">
                        {key.replace(/_/g, ' ')} Profile
                    </h4>

                    {/* Switching Triggers */}
                    <div className="mb-6">
                        <SectionLabel color="bg-amber-500">Switching Triggers</SectionLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ensureArray(p.incontinence_issue).slice(0, 4).map((t: any, i: number) => (
                                <div key={i} className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-800"><SafeText content={extractText(t)} /></div>
                                    {extractDetail(t) && <div className="text-[10px] text-slate-500 mt-1"><SafeText content={extractDetail(t)} /></div>}
                                    <QuoteBlock quotes={ensureArray(t.consumer_quotes)} limit={2} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suffering Moments */}
                    <div className="mb-6">
                        <SectionLabel color="bg-red-500">Suffering Moments</SectionLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ensureArray(p.worst_moments).slice(0, 6).map((m: any, i: number) => (
                                <div key={i} className="p-2.5 bg-red-50/40 border border-red-100/60 rounded-lg">
                                    <div className="flex gap-2.5">
                                        <span className="text-red-400 font-bold text-[10px] mt-0.5">{'0' + (i+1)}</span>
                                        <div className="flex-1">
                                            <div className="text-xs font-medium text-slate-800"><SafeText content={extractText(m)} /></div>
                                            {extractDetail(m) && <div className="text-[10px] text-slate-500 mt-0.5"><SafeText content={extractDetail(m)} /></div>}
                                        </div>
                                    </div>
                                    <QuoteBlock quotes={ensureArray(m.consumer_quotes)} limit={2} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Impact */}
                    <div className="mb-6">
                        <SectionLabel color="bg-rose-500">Impact</SectionLabel>
                        <div className="space-y-2.5">
                            {ensureArray(p.life_impact).slice(0, 4).map((imp: any, k: number) => (
                                <div key={k} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex gap-2.5 items-start">
                                        <span className="text-rose-500 font-bold text-xs mt-0.5">!</span>
                                        <div className="flex-1">
                                            <div className="text-xs font-medium text-slate-800"><SafeText content={extractText(imp)} /></div>
                                            {extractDetail(imp) && <div className="text-[10px] text-slate-500 mt-0.5"><SafeText content={extractDetail(imp)} /></div>}
                                        </div>
                                    </div>
                                    <QuoteBlock quotes={ensureArray(imp.consumer_quotes)} limit={2} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Solutions */}
                    <div className="mb-4">
                        <SectionLabel color="bg-emerald-500">Solutions</SectionLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ensureArray(p.solutions).slice(0, 6).map((sol: any, i: number) => (
                                <div key={i} className="bg-emerald-50/40 border border-emerald-100/60 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-800"><SafeText content={extractText(sol)} /></div>
                                    {extractDetail(sol) && <div className="text-[10px] text-slate-500 mt-1 leading-relaxed"><SafeText content={extractDetail(sol)} /></div>}
                                    <QuoteBlock quotes={ensureArray(sol.consumer_quotes)} limit={2} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AdultAwarenessRenderer = ({ data }: { data: any }) => {
    if (!data.misconceptions && !data.perceptions_and_stigma && !data.decision_journey && !data.awareness_sources && !data.awareness_depth) return null;

    const sources = ensureArray(data.awareness_sources || data.awareness_depth);

    return (
        <div className="space-y-8">
            {/* Information Sources */}
            {sources.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <SectionLabel color="bg-blue-500">Information Sources</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sources.map((s: any, i: number) => (
                            <div key={i} className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                <div className="text-xs font-bold text-slate-800 mb-1.5"><SafeText content={s.headline || s.source || ''} /></div>
                                <div className="text-[11px] text-slate-600 leading-relaxed"><SafeText content={s.what_it_means || s.description || s.so_what || ''} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Misconceptions */}
            {data.misconceptions && ensureArray(data.misconceptions).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <SectionLabel color="bg-red-500">Common Misconceptions</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ensureArray(data.misconceptions).map((m: any, i: number) => (
                            <div key={i} className="bg-red-50/40 p-4 rounded-lg border border-red-100">
                                <div className="flex gap-2 items-start mb-1.5">
                                    <span className="text-red-400 font-bold text-sm">x</span>
                                    <div className="text-xs font-bold text-slate-800"><SafeText content={m.headline || m.misconception || ''} /></div>
                                </div>
                                <div className="text-[11px] text-slate-600 ml-5 leading-relaxed"><SafeText content={m.what_it_means || m.reality || ''} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stigma & Decision Journey side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.perceptions_and_stigma && ensureArray(data.perceptions_and_stigma).length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <SectionLabel color="bg-purple-500">Stigma Drivers</SectionLabel>
                        <div className="space-y-4">
                            {ensureArray(data.perceptions_and_stigma).map((s: any, i: number) => (
                                <div key={i} className="border-l-2 border-purple-200 pl-4 py-1">
                                    <div className="text-xs font-bold text-slate-800 mb-1"><SafeText content={s.headline || s.driver || ''} /></div>
                                    <div className="text-[11px] text-slate-600 leading-relaxed"><SafeText content={s.what_it_means || s.description || ''} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.decision_journey && ensureArray(data.decision_journey).length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
                        <SectionLabel color="bg-indigo-500">Decision Journey</SectionLabel>
                        <div className="space-y-5">
                            {ensureArray(data.decision_journey).map((step: any, i: number) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">{i + 1}</div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800"><SafeText content={step.headline || step.step || ''} /></div>
                                        <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed"><SafeText content={step.what_it_means || step.detail || ''} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Consumer Statements */}
            <QuoteBlock quotes={ensureArray(data.consumer_statements)} limit={4} />
        </div>
    );
};

const AdultUserNonUserSection = ({ data }: { data: any }) => {
    const users = ensureArray(data.user_profiles || data.users_trialists?.detailed_profiles);
    const nonUsers = ensureArray(data.non_user_profiles || data.non_users?.detailed_profiles);

    const ProfileCard = ({ p, accent }: { p: any, accent: string }) => (
        <div className={`bg-white rounded-xl border ${accent} p-5 shadow-sm mb-4`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-slate-800"><SafeText content={p.profile_name || ''} /></span>
                {p.cost_sensitivity && <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{p.cost_sensitivity} Cost</span>}
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed mb-3"><SafeText content={p.who_they_are || p.primary_barrier || ''} /></div>
            {p.switching_trigger && <div className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-100 mb-2"><span className="font-bold">Trigger: </span><SafeText content={p.switching_trigger || p.trigger_event || ''} /></div>}
            {p.skepticism_quote && <div className="text-[10px] text-red-700 italic bg-red-50 px-2.5 py-1.5 rounded border border-red-100 mb-2"><SafeText content={p.skepticism_quote} /></div>}
            <QuoteBlock quotes={ensureArray(p.verbatims)} limit={3} />
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Current Users ({users.length})</h4>
                    </div>
                    {users.map((p: any, i: number) => <ProfileCard key={i} p={p} accent="border-emerald-200" />)}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Non-Users / Resisters ({nonUsers.length})</h4>
                    </div>
                    {nonUsers.map((p: any, i: number) => <ProfileCard key={i} p={p} accent="border-red-200" />)}
                </div>
            </div>

            {/* Failure & Delight Stories */}
            {(ensureArray(data.failure_stories).length > 0 || ensureArray(data.delight_stories).length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {ensureArray(data.failure_stories).length > 0 && (
                        <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
                            <SectionLabel color="bg-red-500">Failure Stories</SectionLabel>
                            <p className="text-[11px] text-slate-500 mb-3 -mt-1">Product experiences that fell short of expectations</p>
                            {ensureArray(data.failure_stories).slice(0, 5).map((s: any, i: number) => (
                                <div key={i} className="text-xs text-slate-700 bg-red-50/40 p-3 rounded-lg border border-red-100 mb-2 leading-relaxed">
                                    <SafeText content={typeof s === 'string' ? s : (s.story || s.text || '')} />
                                </div>
                            ))}
                        </div>
                    )}
                    {ensureArray(data.delight_stories).length > 0 && (
                        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
                            <SectionLabel color="bg-emerald-500">Delight Stories</SectionLabel>
                            <p className="text-[11px] text-slate-500 mb-3 -mt-1">Moments where the product made a meaningful difference</p>
                            {ensureArray(data.delight_stories).slice(0, 5).map((s: any, i: number) => (
                                <div key={i} className="text-xs text-slate-700 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 mb-2 leading-relaxed">
                                    <SafeText content={typeof s === 'string' ? s : (s.story || s.text || '')} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AdultBehaviouralRenderer = ({ data }: { data: any }) => {
    if (!data.occasions_of_use && !data.switching_patterns && !data.purchase_behaviour) return null;

    return (
        <div className="space-y-8">
            {/* Usage Occasions - expanded cards */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <SectionLabel color="bg-indigo-500">Usage Occasions</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ensureArray(data.occasions_of_use).map((occ: any, i: number) => (
                        <div key={i} className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-4">
                            <div className="text-xs font-bold text-slate-800 mb-1.5"><SafeText content={occ.headline || occ.occasion || (typeof occ === 'string' ? occ : '')} /></div>
                            {occ.what_it_means && <div className="text-[11px] text-slate-600 leading-relaxed"><SafeText content={occ.what_it_means} /></div>}
                            <QuoteBlock quotes={ensureArray(occ.consumer_quotes || occ.verbatims)} limit={3} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Switching Triggers + Brand Switching */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <SectionLabel color="bg-amber-500">Switching Triggers (Product-to-Product)</SectionLabel>
                    <div className="space-y-3">
                        {ensureArray(data.switching_patterns).map((sw: any, i: number) => (
                            <div key={i} className="bg-amber-50/40 border border-amber-100 rounded-lg p-3">
                                <div className="text-xs text-slate-800 font-medium"><SafeText content={sw.headline || sw.pattern || (typeof sw === 'string' ? sw : '')} /></div>
                            </div>
                        ))}
                    </div>
                </div>

                {data.brand_switching && ensureArray(data.brand_switching).length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <SectionLabel color="bg-violet-500">Brand Switching Context</SectionLabel>
                        <div className="space-y-3">
                            {ensureArray(data.brand_switching).map((bs: any, i: number) => (
                                <div key={i} className="bg-violet-50/40 border border-violet-100 rounded-lg p-3">
                                    <div className="text-xs text-slate-800 font-medium"><SafeText content={bs.headline || bs.reason || (typeof bs === 'string' ? bs : '')} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Purchase Behaviour - spaced cards with sub-sections */}
            {data.purchase_behaviour && (
                <div className="space-y-6">
                    <SectionLabel>Purchase Behaviour (India)</SectionLabel>
                    <div className="grid grid-cols-1 gap-6">
                        {/* Channels — full width horizontal spread */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-indigo-700 uppercase mb-4 pb-2 border-b border-indigo-100">Channels</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {ensureArray(data.purchase_behaviour.channels).map((c: any, i: number) => {
                                    const txt = (c.channel || c || '').toString();
                                    const parts = txt.split(':');
                                    return (
                                        <div key={i} className="border-l-2 border-indigo-200 pl-3">
                                            {parts.length > 1 ? (
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-800">{parts[0].trim()}</div>
                                                    <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{parts.slice(1).join(':').trim()}</div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-700 leading-relaxed"><SafeText content={txt} /></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Pack Sizes + Price Points — side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-emerald-700 uppercase mb-4 pb-2 border-b border-emerald-100">Pack Sizes</div>
                            <div className="space-y-3">
                                {ensureArray(data.purchase_behaviour.pack_sizes).map((p: any, i: number) => {
                                    const isObj = typeof p === 'object' && p !== null && p.headline;
                                    const headline = isObj ? p.headline : '';
                                    const insight = isObj ? p.insight : (p || '').toString();
                                    const txt = !isObj ? (p || '').toString() : '';
                                    const parts = txt.split(':');
                                    return (
                                        <div key={i} className="border-l-2 border-emerald-200 pl-3">
                                            {isObj ? (
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-800">{headline}</div>
                                                    <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{insight}</div>
                                                    <QuoteBlock quotes={ensureArray(p.consumer_quotes)} limit={2} />
                                                </div>
                                            ) : parts.length > 1 ? (
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-800">{parts[0].trim()}</div>
                                                    <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{parts.slice(1).join(':').trim()}</div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-700 leading-relaxed"><SafeText content={txt} /></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Pack Sizes By Brand sub-section */}
                            {ensureArray(data.purchase_behaviour.pack_sizes_by_brand).length > 0 && (
                                <div className="mt-5 pt-4 border-t border-emerald-100">
                                    <div className="text-[10px] font-bold text-emerald-600 uppercase mb-3">Pack Sizes By Brand</div>
                                    <div className="space-y-3">
                                        {ensureArray(data.purchase_behaviour.pack_sizes_by_brand).map((item: any, i: number) => (
                                            <div key={i} className="border-l-2 border-emerald-300 pl-3 bg-emerald-50/30 rounded-r-lg py-2 pr-2">
                                                <div className="text-xs font-semibold text-slate-800">{item.headline || ''}</div>
                                                <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{item.insight || ''}</div>
                                                <QuoteBlock quotes={ensureArray(item.consumer_quotes)} limit={2} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-amber-700 uppercase mb-4 pb-2 border-b border-amber-100">Price Points (INR)</div>
                            <div className="space-y-3">
                                {ensureArray(data.purchase_behaviour.price_points_inr).map((pr: any, i: number) => {
                                    const isObj = typeof pr === 'object' && pr !== null && pr.headline;
                                    const headline = isObj ? pr.headline : '';
                                    const insight = isObj ? pr.insight : (pr || '').toString();
                                    const txt = !isObj ? (pr.range_label || pr.price || pr || '').toString() : '';
                                    const parts = txt.split(':');
                                    return (
                                        <div key={i} className="border-l-2 border-amber-200 pl-3">
                                            {isObj ? (
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-800">{headline}</div>
                                                    <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{insight}</div>
                                                    <QuoteBlock quotes={ensureArray(pr.consumer_quotes)} limit={2} />
                                                </div>
                                            ) : parts.length > 1 ? (
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-800">{parts[0].trim()}</div>
                                                    <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{parts.slice(1).join(':').trim()}</div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-700 leading-relaxed"><SafeText content={txt} /></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Price By Brand sub-section */}
                            {ensureArray(data.purchase_behaviour.price_by_brand).length > 0 && (
                                <div className="mt-5 pt-4 border-t border-amber-100">
                                    <div className="text-[10px] font-bold text-amber-600 uppercase mb-3">Price By Brand</div>
                                    <div className="space-y-3">
                                        {ensureArray(data.purchase_behaviour.price_by_brand).map((item: any, i: number) => (
                                            <div key={i} className="border-l-2 border-amber-300 pl-3 bg-amber-50/30 rounded-r-lg py-2 pr-2">
                                                <div className="text-xs font-semibold text-slate-800">{item.headline || ''}</div>
                                                <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{item.insight || ''}</div>
                                                <QuoteBlock quotes={ensureArray(item.consumer_quotes)} limit={2} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>{/* end Pack Sizes + Price Points 2-col grid */}
                        {data.purchase_behaviour.geographic_patterns && ensureArray(data.purchase_behaviour.geographic_patterns).length > 0 && (
                            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-rose-700 uppercase mb-4 pb-2 border-b border-rose-100">Geographic Patterns</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {ensureArray(data.purchase_behaviour.geographic_patterns).map((gp: any, i: number) => {
                                        const isObj = typeof gp === 'object' && gp !== null && gp.headline;
                                        if (!isObj) {
                                            const txt = (typeof gp === 'string' ? gp : (gp.pattern || gp.insight || '')).toString();
                                            const parts = txt.split(':');
                                            return (
                                                <div key={i} className="border-l-2 border-rose-200 pl-3">
                                                    {parts.length > 1 ? (
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-800">{parts[0].trim()}</div>
                                                            <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{parts.slice(1).join(':').trim()}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-700 leading-relaxed"><SafeText content={txt} /></div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={i} className="bg-rose-50/30 rounded-lg p-3 border border-rose-100">
                                                <div className="text-xs font-semibold text-rose-800 mb-1">{gp.headline}</div>
                                                <div className="text-[10px] text-slate-600 leading-relaxed mb-2">{gp.insight || ''}</div>
                                                {ensureArray(gp.sub_factors).length > 0 && (
                                                    <div className="space-y-2 mt-2 pt-2 border-t border-rose-100">
                                                        {ensureArray(gp.sub_factors).map((sf: any, j: number) => (
                                                            <div key={j} className="border-l-2 border-rose-300 pl-2">
                                                                <div className="text-[10px] font-semibold text-slate-700">{sf.factor || ''}</div>
                                                                <div className="text-[10px] text-slate-500 leading-relaxed">{sf.detail || ''}</div>
                                                                <QuoteBlock quotes={ensureArray(sf.consumer_quotes)} limit={2} />
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
                    </div>
                </div>
            )}

            <QuoteBlock quotes={ensureArray(data.consumer_statements)} limit={4} />
        </div>
    );
};

const AdultBrandLandscapeSection = ({ data }: { data: any }) => {
    const brands = ensureArray(data.brands);
    if (brands.length === 0 || brands.some((b: any) => (b.brand || '').includes('Unknown'))) {
        return <DataQualityNoticeCard title="Brand Landscape" reason="Brand data insufficient." data={data} />;
    }

    const sentimentColor = (s: string) => s === 'POS' ? 'bg-emerald-100 text-emerald-700' : s === 'NEG' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

    return (
        <div className="space-y-6">
            {brands.map((b: any, i: number) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Brand Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 text-white">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-lg">{b.brand}</h4>
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-white/20 backdrop-blur px-2.5 py-1 rounded-full font-bold">SOV: {b.share_of_voice?.share_pct ?? '?'}%</span>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${sentimentColor(b.overall_sentiment || '')}`}>{b.overall_sentiment}</span>
                            </div>
                        </div>
                        {b.positioning_summary && <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed"><SafeText content={b.positioning_summary} /></div>}
                    </div>

                    <div className="p-6">
                        {/* Attributes + SWOT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Attribute Performance</span>
                                <div className="space-y-2.5">
                                    {ensureArray(b.attribute_scale).map((attr: any, k: number) => (
                                        <div key={k} className="flex items-center gap-2 text-xs">
                                            <span className="w-28 font-medium text-slate-600 truncate">{attr.attribute}</span>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all" style={{ width: `${(attr.score_0_5 || 0) * 20}%` }}></div>
                                            </div>
                                            <span className="font-mono text-slate-500 w-6 text-right font-bold">{attr.score_0_5}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-5">
                                {b.strengths && ensureArray(b.strengths).length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-2">Strengths</span>
                                        {ensureArray(b.strengths).map((sw: any, j: number) => (
                                            <div key={j} className="flex gap-2 mb-1.5 text-xs text-slate-700">
                                                <span className="text-emerald-500 font-bold">+</span>
                                                <span className="leading-relaxed"><SafeText content={typeof sw === 'string' ? sw : (sw.text || '')} /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {b.weaknesses && ensureArray(b.weaknesses).length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-bold text-red-600 uppercase block mb-2">Weaknesses</span>
                                        {ensureArray(b.weaknesses).map((wk: any, j: number) => (
                                            <div key={j} className="flex gap-2 mb-1.5 text-xs text-slate-700">
                                                <span className="text-red-500 font-bold">-</span>
                                                <span className="leading-relaxed"><SafeText content={typeof wk === 'string' ? wk : (wk.text || '')} /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing, Packaging, Geographic - with bullet sub-points */}
                        {(b.pricing_insight || b.packaging_insight || b.geographic_strength) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-5 border-t border-slate-100">
                                {b.pricing_insight && (
                                    <div className="bg-amber-50/40 p-4 rounded-lg border border-amber-200/50">
                                        <span className="text-[9px] font-bold text-amber-700 uppercase block mb-2">Pricing</span>
                                        <div className="text-[11px] text-slate-700 leading-relaxed mb-2"><SafeText content={typeof b.pricing_insight === 'string' ? b.pricing_insight.split('.')[0] + '.' : b.pricing_insight} /></div>
                                        {typeof b.pricing_insight === 'string' && b.pricing_insight.split('.').length > 2 && (
                                            <div className="space-y-1 mt-2">
                                                {b.pricing_insight.split('.').slice(1).filter((s: string) => s.trim().length > 5).slice(0, 3).map((pt: string, j: number) => (
                                                    <div key={j} className="flex gap-1.5 text-[10px] text-slate-600">
                                                        <span className="text-amber-400 mt-0.5">-</span>
                                                        <span className="leading-relaxed">{pt.trim()}.</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {ensureArray(b.pricing_bullets).length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                {ensureArray(b.pricing_bullets).slice(0, 3).map((pt: any, j: number) => (
                                                    <div key={j} className="flex gap-1.5 text-[10px] text-slate-600">
                                                        <span className="text-amber-400 mt-0.5">-</span>
                                                        <span className="leading-relaxed"><SafeText content={typeof pt === 'string' ? pt : (pt.text || '')} /></span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {b.packaging_insight && (
                                    <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-200/50">
                                        <span className="text-[9px] font-bold text-blue-700 uppercase block mb-2">Packaging</span>
                                        <div className="text-[11px] text-slate-700 leading-relaxed mb-2"><SafeText content={typeof b.packaging_insight === 'string' ? b.packaging_insight.split('.')[0] + '.' : b.packaging_insight} /></div>
                                        {typeof b.packaging_insight === 'string' && b.packaging_insight.split('.').length > 2 && (
                                            <div className="space-y-1 mt-2">
                                                {b.packaging_insight.split('.').slice(1).filter((s: string) => s.trim().length > 5).slice(0, 3).map((pt: string, j: number) => (
                                                    <div key={j} className="flex gap-1.5 text-[10px] text-slate-600">
                                                        <span className="text-blue-400 mt-0.5">-</span>
                                                        <span className="leading-relaxed">{pt.trim()}.</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {ensureArray(b.packaging_bullets).length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                {ensureArray(b.packaging_bullets).slice(0, 3).map((pt: any, j: number) => (
                                                    <div key={j} className="flex gap-1.5 text-[10px] text-slate-600">
                                                        <span className="text-blue-400 mt-0.5">-</span>
                                                        <span className="leading-relaxed"><SafeText content={typeof pt === 'string' ? pt : (pt.text || '')} /></span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {b.geographic_strength && (
                                    <div className="bg-emerald-50/40 p-4 rounded-lg border border-emerald-200/50">
                                        <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-2">Geographic</span>
                                        <div className="text-[11px] text-slate-700 leading-relaxed mb-2"><SafeText content={typeof b.geographic_strength === 'string' ? b.geographic_strength.split('.')[0] + '.' : b.geographic_strength} /></div>
                                        {typeof b.geographic_strength === 'string' && b.geographic_strength.split('.').length > 2 && (
                                            <div className="space-y-1 mt-2">
                                                {b.geographic_strength.split('.').slice(1).filter((s: string) => s.trim().length > 5).slice(0, 3).map((pt: string, j: number) => (
                                                    <div key={j} className="flex gap-1.5 text-[10px] text-slate-600">
                                                        <span className="text-emerald-400 mt-0.5">-</span>
                                                        <span className="leading-relaxed">{pt.trim()}.</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {ensureArray(b.geographic_bullets).length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                {ensureArray(b.geographic_bullets).slice(0, 3).map((pt: any, j: number) => (
                                                    <div key={j} className="flex gap-1.5 text-[10px] text-slate-600">
                                                        <span className="text-emerald-400 mt-0.5">-</span>
                                                        <span className="leading-relaxed"><SafeText content={typeof pt === 'string' ? pt : (pt.text || '')} /></span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Consumer Verdict */}
                        <QuoteBlock quotes={ensureArray(b.verbatims)} limit={4} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- ADULT DIAPERS GAP ANALYSIS RENDERER ---

const AdultGapAnalysisRenderer = ({ data }: { data: any }) => {
    // Resilient: show whatever we have, even partial data
    const emotional = ensureArray(data.emotional_needs);
    const functional = ensureArray(data.functional_needs);
    const unmet = ensureArray(data.unmet_expectations);
    const nonUser = ensureArray(data.non_user_gaps);
    
    if (emotional.length === 0 && functional.length === 0 && unmet.length === 0 && nonUser.length === 0) return null;

    const renderGapCard = (item: any, accent: string) => (
        <div className={`${accent} rounded-lg p-4 mb-3`}>
            <div className="text-xs font-bold text-slate-800 mb-1.5"><SafeText content={item.need || item.expectation || item.gap || ''} /></div>
            {(item.who_feels_it || item.segment) && (
                <div className="text-[10px] text-slate-500 mb-1.5"><SafeText content={item.who_feels_it || item.segment || ''} /></div>
            )}
            <div className="text-[11px] text-slate-600 leading-relaxed mb-2"><SafeText content={item.current_gap || item.brand_implication || item.conversion_lever || ''} /></div>
            {item.opportunity && (
                <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-100 mb-2"><SafeText content={item.opportunity} /></div>
            )}
            <QuoteBlock quotes={ensureArray(item.consumer_quotes || (item.consumer_quote ? [item.consumer_quote] : []))} limit={3} />
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.emotional_needs && ensureArray(data.emotional_needs).length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <SectionLabel color="bg-purple-500">Emotional Needs</SectionLabel>
                        {ensureArray(data.emotional_needs).map((item: any, i: number) => (
                            <div key={i}>{renderGapCard(item, 'bg-purple-50/40 border border-purple-100')}</div>
                        ))}
                    </div>
                )}
                {data.functional_needs && ensureArray(data.functional_needs).length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <SectionLabel color="bg-blue-500">Functional Needs</SectionLabel>
                        {ensureArray(data.functional_needs).map((item: any, i: number) => (
                            <div key={i}>{renderGapCard(item, 'bg-blue-50/40 border border-blue-100')}</div>
                        ))}
                    </div>
                )}
            </div>
            {data.unmet_expectations && ensureArray(data.unmet_expectations).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <SectionLabel color="bg-amber-500">Unmet Expectations</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ensureArray(data.unmet_expectations).map((item: any, i: number) => (
                            <div key={i}>{renderGapCard(item, 'bg-amber-50/40 border border-amber-100')}</div>
                        ))}
                    </div>
                </div>
            )}
            {data.non_user_gaps && ensureArray(data.non_user_gaps).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <SectionLabel color="bg-red-500">Non-User Conversion Gaps</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ensureArray(data.non_user_gaps).map((item: any, i: number) => (
                            <div key={i}>{renderGapCard(item, 'bg-red-50/40 border border-red-100')}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- FEMCARE-SPECIFIC RENDERERS ---

const FemcareGapAnalysisRenderer = ({ data }: { data: any }) => {
    const renderBullets = (bullets: any[]) => ensureArray(bullets).map((b: any, i: number) => (
        <div key={i} className="bg-white p-4 rounded border border-slate-200 mb-3">
            <div className="flex items-start gap-2 mb-1">
                {b.severity && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        b.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        b.severity === 'MED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>{b.severity}</span>
                )}
                <span className="text-xs font-bold text-slate-800"><SafeText content={b.claim || b.title || b.need || ''} /></span>
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
    ));

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
            {points.map((p: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-800 mb-2"><SafeText content={p.title || p.boldTitle || ''} /></h4>
                    <div className="text-[11px] text-slate-600 mb-2"><SafeText content={p.insight || p.explanation || ''} /></div>
                    {p.quote && (
                        <div className="text-[10px] text-indigo-700 italic bg-indigo-50 px-2 py-1.5 rounded border border-indigo-100">
                            "<SafeText content={typeof p.quote === 'string' ? p.quote : ''} />"
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const FemcareBrandPerformanceRenderer = ({ data }: { data: any }) => {
    const brands = ensureArray(data.brand_performance);
    if (brands.length === 0) return null;

    return (
        <div className="space-y-6">
            {brands.map((b: any, i: number) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-lg text-slate-800">{b.brand}</h4>
                        {b.market_position && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">{b.market_position}</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Strengths</span>
                            <ul className="text-xs text-slate-600 space-y-1">
                                {ensureArray(b.key_strengths).map((s: any, j: number) => (
                                    <li key={j} className="flex gap-2"><span className="text-emerald-400">+</span> <SafeText content={typeof s === 'string' ? s : (s.text || '')} /></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-red-600 uppercase block mb-1">Weaknesses</span>
                            <ul className="text-xs text-slate-600 space-y-1">
                                {ensureArray(b.key_weaknesses).map((w: any, j: number) => (
                                    <li key={j} className="flex gap-2"><span className="text-red-400">−</span> <SafeText content={typeof w === 'string' ? w : (w.text || '')} /></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    {b.attribute_verdict && (
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                            <SafeText content={b.attribute_verdict} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const FemcareAwarenessChannelsRenderer = ({ data }: { data: any }) => {
    return (
        <div className="space-y-8">
            {/* Discovery Sources */}
            {data.discovery_sources && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Discovery Sources</h4>
                    <div className="flex flex-wrap gap-3">
                        {ensureArray(data.discovery_sources).map((s: any, i: number) => (
                            <div key={i} className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded text-xs">
                                <span className="font-bold text-slate-800"><SafeText content={typeof s === 'string' ? s : (s.source || '')} /></span>
                                {s.strength && <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${s.strength === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.strength}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Intent Clusters */}
            {data.search_intent_clusters && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Search Intent Clusters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ensureArray(data.search_intent_clusters).map((cl: any, i: number) => (
                            <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200">
                                <span className="text-xs font-bold text-slate-800 block mb-1"><SafeText content={cl.cluster_name || ''} /></span>
                                <ul className="text-[10px] text-slate-500 space-y-0.5">
                                    {ensureArray(cl.example_queries).slice(0, 3).map((q: string, j: number) => (
                                        <li key={j} className="italic">"{q}"</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Segmentation */}
            {data.segmentation && (data.segmentation.by_lifestage || data.segmentation.by_geography) && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Consumer Segmentation</h4>
                    {data.segmentation.by_lifestage && ensureArray(data.segmentation.by_lifestage).length > 0 && (
                        <div className="mb-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">By Lifestage</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ensureArray(data.segmentation.by_lifestage).map((seg: any, i: number) => (
                                    <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                                        <span className="font-bold text-slate-800 block"><SafeText content={seg.segment_name || ''} /></span>
                                        {seg.core_tension && <span className="text-slate-500 block mt-1 italic"><SafeText content={seg.core_tension} /></span>}
                                        {seg.commercial_implication && <span className="text-indigo-600 block mt-1 text-[10px]"><SafeText content={seg.commercial_implication} /></span>}
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
                                    <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                                        <span className="font-bold text-slate-800 block"><SafeText content={seg.region_type || ''} /></span>
                                        {seg.behavioral_pattern && <span className="text-slate-500 block mt-1"><SafeText content={seg.behavioral_pattern} /></span>}
                                        {seg.commercial_implication && <span className="text-indigo-600 block mt-1 text-[10px]"><SafeText content={seg.commercial_implication} /></span>}
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase mb-2"><SafeText content={r.format_name || r.title || ''} /></h4>
                    <div className="text-[11px] text-slate-700 mb-2 font-medium"><SafeText content={r.job_to_be_done || r.role || ''} /></div>
                    {r.lifestage_fit && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            <SafeText content={r.lifestage_fit} />
                        </span>
                    )}
                </div>
            ))}
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
    
    // --- STRICT ROUTING: FEMCARE (Explicit) ---
    else if (
        ['disposable-period-panties', 'reusable-period-panties', 'sanitary-pads'].includes(projectId!) || 
        data.templateId?.includes('femcare')
    ) {
        const c = normalizedData;
        // Existing working renderers
        if (c.cards || c.menstruation_context) Component = MenstruationContextRenderer;
        else if (c.trigger_clusters || c.behavioural_landscape) Component = BehaviouralRenderer;
        else if (c.formats || c.product_ecosystem || c.tradeoff_matrix) Component = EcosystemRenderer;
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
