/**
 * SanitaryPadsRenderer.tsx
 * Standalone renderer for Sanitary Pads V4 report — COMPLETELY ISOLATED.
 * Does NOT import or affect any other project's renderers.
 */
import React from 'react';

// ── UTILS ───────────────────────────────────────────────────────────
const safeArr = (v: any): any[] => Array.isArray(v) ? v : (v ? [v] : []);
const safeText = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v.text || v.title || v.headline || v.boldTitle || v.name || v.claim || v.quote || '';
};

// Extract verbatims from bullet arrays (lines with 📢 or quoted text)
const splitBulletsAndQuotes = (bullets: any[]): { insights: string[]; quotes: Array<{text: string; source: string; consumer: string}> } => {
    const insights: string[] = [];
    const quotes: Array<{text: string; source: string; consumer: string}> = [];
    safeArr(bullets).forEach(b => {
        const s = typeof b === 'string' ? b : (b?.text || b?.quote || safeText(b));
        if (!s) return;
        if (s.startsWith('📢') || (s.startsWith('"') && s.includes('"'))) {
            const clean = s.replace(/^📢\s*/, '').replace(/^"|"$/g, '');
            const srcMatch = clean.match(/\(([^)]+)\)\s*$/);
            quotes.push({ text: srcMatch ? clean.replace(srcMatch[0], '').trim() : clean, source: srcMatch ? srcMatch[1] : 'Consumer', consumer: '' });
        } else if (typeof b === 'object' && b.quote) {
            quotes.push({ text: b.quote, source: b.source || '', consumer: b.consumer || '' });
        } else {
            insights.push(s);
        }
    });
    return { insights, quotes };
};

// ── SHARED UI COMPONENTS ────────────────────────────────────────────

const SectionTitle = ({ label, icon }: { label: string; icon?: string }) => (
    <div className="flex items-center gap-2.5 mb-5">
        {icon && <span className="text-base">{icon}</span>}
        <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">{label}</h4>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
    </div>
);

const VerbatimCard = ({ text, source, consumer }: { text: string; source?: string; consumer?: string }) => {
    if (!text) return null;
    return (
        <div className="bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100 rounded-xl px-4 py-3 shadow-sm">
            <div className="text-[11px] italic text-indigo-900 leading-relaxed">"{text}"</div>
            {(source || consumer) && (
                <div className="flex gap-2 mt-2 text-[9px] not-italic">
                    {source && <span className="font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{source}</span>}
                    {consumer && <span className="text-slate-500">{consumer}</span>}
                </div>
            )}
        </div>
    );
};

const VerbatimGrid = ({ items, max = 4 }: { items: any[]; max?: number }) => {
    const verbs = safeArr(items).slice(0, max);
    if (verbs.length === 0) return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
            {verbs.map((v: any, i: number) => {
                if (typeof v === 'string') return <VerbatimCard key={i} text={v} />;
                return <VerbatimCard key={i} text={v.quote || v.text || v} source={v.source} consumer={v.consumer} />;
            })}
        </div>
    );
};

const InsightCard = ({ title, detail, verbatims, accent = 'indigo', icon }: {
    title: string; detail?: string; verbatims?: any[]; accent?: string; icon?: string;
}) => {
    const colors: Record<string, { bg: string; border: string; title: string; dot: string }> = {
        indigo: { bg: 'bg-white', border: 'border-l-indigo-500', title: 'text-indigo-900', dot: 'bg-indigo-500' },
        emerald: { bg: 'bg-white', border: 'border-l-emerald-500', title: 'text-emerald-900', dot: 'bg-emerald-500' },
        amber: { bg: 'bg-white', border: 'border-l-amber-500', title: 'text-amber-900', dot: 'bg-amber-500' },
        rose: { bg: 'bg-white', border: 'border-l-rose-500', title: 'text-rose-900', dot: 'bg-rose-500' },
        purple: { bg: 'bg-white', border: 'border-l-purple-500', title: 'text-purple-900', dot: 'bg-purple-500' },
        red: { bg: 'bg-white', border: 'border-l-red-500', title: 'text-red-900', dot: 'bg-red-500' },
        slate: { bg: 'bg-white', border: 'border-l-slate-400', title: 'text-slate-800', dot: 'bg-slate-400' },
    };
    const c = colors[accent] || colors.indigo;
    const verbs = safeArr(verbatims);
    return (
        <div className={`${c.bg} border border-slate-200 border-l-4 ${c.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all`}>
            <div className="flex items-start gap-2 mb-2">
                {icon && <span className="text-sm mt-0.5">{icon}</span>}
                <div className="flex-1">
                    <div className={`text-xs font-bold ${c.title} leading-snug`}>{title}</div>
                    {detail && <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">{detail}</div>}
                </div>
            </div>
            {verbs.length > 0 && <VerbatimGrid items={verbs} max={2} />}
        </div>
    );
};

const ConsumerVoiceBank = ({ statements, title = 'Consumer Voice Bank' }: { statements: any[]; title?: string }) => {
    const items = safeArr(statements);
    if (items.length === 0) return null;
    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50/30 border border-indigo-200 p-5 rounded-2xl mt-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">🗣️</span>
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">{title}</span>
                <span className="text-[9px] text-indigo-400">({items.length} voices)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {items.slice(0, 9).map((s: any, i: number) => (
                    <VerbatimCard key={i} text={typeof s === 'string' ? s : (s.quote || s.text || safeText(s))} 
                        source={s.source} consumer={s.consumer} />
                ))}
            </div>
        </div>
    );
};

// ── SECTION 1: MENSTRUATION CONTEXT BY SUB-CATEGORY ─────────────────

const SPMenstruationContextRenderer = ({ data }: { data: any }) => {
    const cards = safeArr(data?.cards);
    if (cards.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Menstruation context being synthesized...</div>;

    const cardAccents = ['indigo', 'blue', 'purple', 'amber', 'emerald', 'slate', 'rose'];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card: any, idx: number) => {
                    const { insights, quotes } = splitBulletsAndQuotes(safeArr(card.bullets));
                    const accent = cardAccents[idx % cardAccents.length];
                    const accentColors: Record<string, string> = {
                        indigo: 'from-indigo-600 to-indigo-500', blue: 'from-blue-600 to-blue-500',
                        purple: 'from-purple-600 to-purple-500', amber: 'from-amber-600 to-amber-500',
                        emerald: 'from-emerald-600 to-emerald-500', slate: 'from-slate-700 to-slate-600',
                        rose: 'from-rose-600 to-rose-500'
                    };
                    return (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all">
                            <div className={`bg-gradient-to-r ${accentColors[accent]} px-4 py-3`}>
                                <h4 className="font-extrabold text-white text-sm tracking-wide">{safeText(card) || card.boldTitle || `Sub-Category ${idx + 1}`}</h4>
                            </div>
                            <div className="p-4 space-y-3">
                                {insights.length > 0 && (
                                    <ul className="space-y-2">
                                        {insights.map((b, i) => (
                                            <li key={i} className="text-[11px] text-slate-700 leading-relaxed flex gap-2">
                                                <span className="text-slate-400 mt-0.5 flex-shrink-0">▹</span>
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {quotes.length > 0 && <VerbatimGrid items={quotes} max={2} />}
                                {card.metrics && safeArr(card.metrics).length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                        {safeArr(card.metrics).map((m: any, i: number) => (
                                            <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                                                {m.label}: <strong>{m.value}</strong>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── SUB-CATEGORY LANDSCAPE ──────────────────────────────────────────

const SPSubCategoryRenderer = ({ data }: { data: any }) => {
    const cards = safeArr(data?.cards);
    if (cards.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Sub-category landscape being synthesized...</div>;
    return <SPMenstruationContextRenderer data={data} />;
};

// ── GAP ANALYSIS ────────────────────────────────────────────────────

const SPGapAnalysisRenderer = ({ data }: { data: any }) => {
    const challenges = safeArr(data?.current_challenges?.bullets);
    const resolved = safeArr(data?.resolved_challenges?.bullets);
    const unresolved = safeArr(data?.unresolved_challenges?.bullets);
    const needs = safeArr(data?.need_gap?.need_statements);

    if (challenges.length === 0 && needs.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Gap analysis being synthesized...</div>;

    const renderBullets = (bullets: any[], accent: string, icon: string) => (
        <div className="space-y-3">
            {bullets.map((b: any, i: number) => {
                const evidence = safeArr(b.consumer_evidence);
                return (
                    <InsightCard key={i} title={b.claim || b.text || ''} detail={b.explanation || ''}
                        verbatims={evidence.length > 0 ? evidence : undefined} accent={accent} icon={icon} />
                );
            })}
        </div>
    );

    return (
        <div className="space-y-8">
            {challenges.length > 0 && (
                <div>
                    <SectionTitle label={data.current_challenges?.heading || 'Current Challenges'} icon="🔴" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{challenges.map((b: any, i: number) => (
                        <InsightCard key={i} title={b.claim || ''} detail={b.explanation || ''} 
                            verbatims={safeArr(b.consumer_evidence)} accent="red" />
                    ))}</div>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {resolved.length > 0 && (
                    <div>
                        <SectionTitle label={data.resolved_challenges?.heading || 'Resolved'} icon="✅" />
                        {renderBullets(resolved, 'emerald', '✓')}
                    </div>
                )}
                {unresolved.length > 0 && (
                    <div>
                        <SectionTitle label={data.unresolved_challenges?.heading || 'Unresolved'} icon="⚠️" />
                        {renderBullets(unresolved, 'amber', '!')}
                    </div>
                )}
            </div>
            {needs.length > 0 && (
                <div>
                    <SectionTitle label={data.need_gap?.heading || 'White Space & Need Gaps'} icon="💡" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {needs.map((n: any, i: number) => {
                            const prColor = n.priority === 'P0' ? 'bg-red-500 text-white' : n.priority === 'P1' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white';
                            const evidence = safeArr(n.consumer_evidence);
                            return (
                                <div key={i} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${prColor}`}>{n.priority || 'P1'}</span>
                                        <div className="text-xs font-bold text-indigo-900 flex-1">{n.need || ''}</div>
                                    </div>
                                    {n.why_now && <div className="text-[11px] text-slate-600 mb-1"><strong>Why now:</strong> {n.why_now}</div>}
                                    {n.who && <div className="text-[10px] text-indigo-600 mb-2"><strong>Who:</strong> {n.who}</div>}
                                    {evidence.length > 0 && <VerbatimGrid items={evidence} max={2} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── SWITCHING DYNAMICS ──────────────────────────────────────────────

const SPSwitchingDynamicsRenderer = ({ data }: { data: any }) => {
    const triggers = safeArr(data?.trigger_clusters);
    const barriers = data?.barrier_groups || {};
    const switching = safeArr(data?.switching_dynamics);
    const brandSwitch = safeArr(data?.brand_switching);

    return (
        <div className="space-y-8">
            {triggers.length > 0 && (
                <div>
                    <SectionTitle label="Adoption Triggers" icon="⚡" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {triggers.map((t: any, i: number) => {
                            const { insights, quotes } = splitBulletsAndQuotes(safeArr(t.bullets));
                            return (
                                <InsightCard key={i} title={t.title || t.cluster_name || ''} detail={t.explanation || ''}
                                    verbatims={quotes.length > 0 ? quotes : undefined}
                                    accent={t.intensity === 'HIGH' ? 'indigo' : 'slate'} icon={t.intensity === 'HIGH' ? '🔥' : '💡'} />
                            );
                        })}
                    </div>
                </div>
            )}

            {Object.keys(barriers).length > 0 && (
                <div>
                    <SectionTitle label="Barriers to Upgrade" icon="🚧" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(barriers).map(([key, items]: [string, any], idx: number) => {
                            const { insights, quotes } = splitBulletsAndQuotes(safeArr(items));
                            return (
                                <div key={key} className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm">
                                    <div className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-3 pb-2 border-b border-rose-100">{key.replace(/_/g, ' ')}</div>
                                    {insights.map((b, i) => (
                                        <div key={i} className="text-[11px] text-slate-700 mb-2 flex gap-2">
                                            <span className="text-rose-400 flex-shrink-0">•</span><span>{b}</span>
                                        </div>
                                    ))}
                                    {quotes.length > 0 && <VerbatimGrid items={quotes} max={1} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {switching.length > 0 && (
                <div>
                    <SectionTitle label="Sub-Segment Switching Pathways" icon="🔄" />
                    <div className="space-y-3">
                        {switching.map((s: any, i: number) => {
                            const { insights, quotes } = splitBulletsAndQuotes(safeArr(s.logic_bullets));
                            return (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="md:w-1/4 bg-gradient-to-br from-slate-800 to-slate-700 p-4 flex items-center">
                                            <div className="text-white font-bold text-sm">{s.pathway || ''}</div>
                                        </div>
                                        <div className="flex-1 p-4 space-y-2">
                                            {s.insight && <div className="text-[11px] text-slate-600 italic">{s.insight}</div>}
                                            {insights.length > 0 && insights.map((b, j) => (
                                                <div key={j} className="text-[11px] text-slate-700 flex gap-2"><span className="text-emerald-500">→</span>{b}</div>
                                            ))}
                                            {quotes.length > 0 && <VerbatimGrid items={quotes} max={2} />}
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
                    <SectionTitle label="Brand Switching" icon="🔀" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {brandSwitch.map((bs: any, i: number) => (
                            <div key={i} className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">{bs.from_brand || '?'}</span>
                                    <span className="text-purple-500 font-extrabold">→</span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{bs.to_brand || '?'}</span>
                                </div>
                                {bs.reason && <div className="text-[11px] text-slate-700 mb-2"><strong>Why:</strong> {bs.reason}</div>}
                                {bs.trigger && (
                                    <div className="text-[10px] text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 italic">
                                        <strong className="not-italic">Trigger:</strong> {bs.trigger}
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

// ── ATTRIBUTE PERFORMANCE ───────────────────────────────────────────

const SPAttributePerformanceRenderer = ({ data }: { data: any }) => {
    const formats = safeArr(data?.formats);
    const matrix = safeArr(data?.attribute_matrix);

    const formatColors = [
        { bg: 'from-indigo-500 to-indigo-400', card: 'border-l-indigo-500' },
        { bg: 'from-blue-500 to-blue-400', card: 'border-l-blue-500' },
        { bg: 'from-purple-500 to-purple-400', card: 'border-l-purple-500' },
        { bg: 'from-amber-500 to-amber-400', card: 'border-l-amber-500' },
        { bg: 'from-emerald-500 to-emerald-400', card: 'border-l-emerald-500' },
        { bg: 'from-rose-500 to-rose-400', card: 'border-l-rose-500' },
        { bg: 'from-slate-600 to-slate-500', card: 'border-l-slate-500' },
    ];

    return (
        <div className="space-y-8">
            {formats.length > 0 && (
                <div>
                    <SectionTitle label="Format Cards by Sub-Category" icon="📋" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formats.map((f: any, i: number) => {
                            const c = formatColors[i % formatColors.length];
                            return (
                                <div key={i} className={`bg-white border border-slate-200 border-l-4 ${c.card} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}>
                                    <h4 className="font-extrabold text-slate-800 text-sm mb-1">{f.format || `Format ${i+1}`}</h4>
                                    <p className="text-[11px] text-slate-500 italic mb-3">{f.role_in_lifecycle || ''}</p>
                                    {safeArr(f.functional_resolution).length > 0 && (
                                        <div className="mb-3">
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">Functional</span>
                                            <div className="mt-1.5 space-y-1">{safeArr(f.functional_resolution).map((r: any, k: number) => (
                                                <div key={k} className="text-[11px] text-slate-700 flex gap-2"><span className="text-emerald-500">✓</span>{typeof r === 'string' ? r : safeText(r)}</div>
                                            ))}</div>
                                        </div>
                                    )}
                                    {safeArr(f.emotional_resolution).length > 0 && (
                                        <div>
                                            <span className="text-[9px] font-bold text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded-full">Emotional</span>
                                            <div className="mt-1.5 space-y-1">{safeArr(f.emotional_resolution).map((r: any, k: number) => (
                                                <div key={k} className="text-[11px] text-slate-700 flex gap-2"><span className="text-purple-400">♡</span>{typeof r === 'string' ? r : safeText(r)}</div>
                                            ))}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {matrix.length > 0 && (
                <div>
                    <SectionTitle label="Attribute Rating Matrix" icon="📊" />
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
                                    const ratingColor = (val: string) => {
                                        if (!val) return '';
                                        const v = val.toLowerCase();
                                        if (v.includes('strong') || v === 'high') return 'text-emerald-700 font-bold bg-emerald-50';
                                        if (v.includes('adequate') || v === 'med') return 'text-amber-700 bg-amber-50';
                                        if (v.includes('weak') || v === 'low') return 'text-red-600 bg-red-50';
                                        return 'text-slate-600';
                                    };
                                    return (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="p-3 font-bold text-slate-800">{row.attribute || ''}</td>
                                            <td className={`p-3 text-[10px] ${ratingColor(row.fluff_regular)}`}>{row.fluff_regular || '—'}</td>
                                            <td className={`p-3 text-[10px] ${ratingColor(row.fluff_xl)}`}>{row.fluff_xl || '—'}</td>
                                            <td className={`p-3 text-[10px] ${ratingColor(row.fluff_night)}`}>{row.fluff_night || '—'}</td>
                                            <td className={`p-3 text-[10px] ${ratingColor(row.mid_ultra)}`}>{row.mid_ultra || '—'}</td>
                                            <td className={`p-3 text-[10px] ${ratingColor(row.premium_ultra)} bg-indigo-50/30`}>{row.premium_ultra || '—'}</td>
                                            <td className={`p-3 text-[10px] ${ratingColor(row.super_premium_ultra)} bg-purple-50/30`}>{row.super_premium_ultra || '—'}</td>
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

// ── PURCHASE BEHAVIOUR & CHANNELS ───────────────────────────────────

const SPPurchaseBehaviourRenderer = ({ data }: { data: any }) => {
    const discovery = safeArr(data?.discovery_sources);
    const channels = safeArr(data?.purchase_channels);
    const searchClusters = safeArr(data?.search_intent_clusters);
    const pricing = safeArr(data?.pricing_architecture);
    const combos = safeArr(data?.combos_and_kits);

    return (
        <div className="space-y-8">
            {discovery.length > 0 && (
                <div>
                    <SectionTitle label="Discovery Sources" icon="🔍" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {discovery.map((s: any, i: number) => {
                            const src = typeof s === 'string' ? s : (s.source || '');
                            const str = s.strength || 'Med';
                            const badge = str === 'High' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white';
                            return (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${badge}`}>{str}</span>
                                    <span className="text-xs text-slate-800 font-medium">{src}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {channels.length > 0 && (
                <div>
                    <SectionTitle label="Purchase Channels" icon="🛒" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {channels.map((ch: any, i: number) => {
                            const roleColor = ch.role === 'Primary' ? 'border-l-emerald-500' : ch.role === 'Secondary' ? 'border-l-amber-500' : 'border-l-blue-500';
                            const evidence = safeArr(ch.consumer_evidence);
                            return (
                                <div key={i} className={`bg-white border border-slate-200 border-l-4 ${roleColor} p-4 rounded-r-xl shadow-sm`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-xs text-slate-800">{ch.channel || ''}</span>
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{ch.role || ''}</span>
                                    </div>
                                    {ch.formats_sold && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {safeArr(ch.formats_sold).map((f: string, j: number) => (
                                                <span key={j} className="text-[9px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{f}</span>
                                            ))}
                                        </div>
                                    )}
                                    {evidence.length > 0 && <VerbatimGrid items={evidence} max={1} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {pricing.length > 0 && (
                <div>
                    <SectionTitle label="Pricing Architecture (₹/pad)" icon="💰" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {pricing.map((p: any, i: number) => (
                            <div key={i} className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 px-4 py-3 rounded-xl shadow-sm">
                                <div className="font-bold text-xs text-slate-800 mb-1">{p.sub_category || p.segment || ''}</div>
                                <div className="text-lg font-mono text-amber-700 font-extrabold">{p.price_range_per_pad || p.price_range || ''}</div>
                                {p.example_skus && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {safeArr(p.example_skus).slice(0, 3).map((s: string, j: number) => (
                                            <span key={j} className="text-[8px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {combos.length > 0 && (
                <div>
                    <SectionTitle label="Combos & Kits" icon="📦" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {combos.map((c: any, i: number) => (
                            <div key={i} className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 px-4 py-3 rounded-xl shadow-sm">
                                <div className="font-bold text-xs text-purple-800 mb-1">{c.type || ''}</div>
                                <div className="text-[11px] text-slate-600">{c.description || ''}</div>
                                {c.brands_offering && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {safeArr(c.brands_offering).map((b: string, j: number) => (
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

            {searchClusters.length > 0 && (
                <div>
                    <SectionTitle label="Search Intent Clusters" icon="🔎" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {searchClusters.map((cl: any, i: number) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <div className="font-bold text-xs text-slate-800 mb-2">{cl.cluster_name || ''}</div>
                                <div className="flex flex-wrap gap-1">
                                    {safeArr(cl.example_queries).map((q: string, j: number) => (
                                        <span key={j} className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-mono">{q}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── CONSUMER DEEP DIVE ──────────────────────────────────────────────

const SPDeepDiveRenderer = ({ data }: { data: any }) => {
    const users = data?.users;
    const nonUsers = data?.non_users;
    const wuc = data?.whisper_ultra_clean;

    return (
        <div className="space-y-8">
            {data.role_summary && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-2xl shadow-lg">
                    <h4 className="font-extrabold text-lg mb-2">{data.role_summary.boldTitle || 'Consumer Deep Dive'}</h4>
                    {safeArr(data.role_summary.bullets).map((b: any, i: number) => (
                        <div key={i} className="text-sm text-white/90 mb-1">▹ {typeof b === 'string' ? b : safeText(b)}</div>
                    ))}
                </div>
            )}

            {users && (
                <div className="space-y-5">
                    <SectionTitle label="Among Premium / Super Premium Ultra Users" icon="👤" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safeArr(users.discovery_sources).length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Discovery</span>
                                <div className="flex flex-wrap gap-2">
                                    {safeArr(users.discovery_sources).map((s: any, i: number) => (
                                        <span key={i} className="text-xs bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg text-indigo-800 font-medium">{typeof s === 'string' ? s : safeText(s)}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {safeArr(users.triggers).length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Usage Triggers</span>
                                <div className="flex flex-wrap gap-2">
                                    {safeArr(users.triggers).map((t: any, i: number) => (
                                        <span key={i} className="text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-emerald-800">{typeof t === 'string' ? t : safeText(t)}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {safeArr(users.experience_parameters).length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Experience Parameters</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {safeArr(users.experience_parameters).map((p: any, i: number) => {
                                    const accent = p.sentiment === 'POS' ? 'emerald' : p.sentiment === 'NEG' ? 'red' : 'amber';
                                    return <InsightCard key={i} title={p.parameter || ''} detail={p.insight || ''} accent={accent} 
                                        icon={p.sentiment === 'POS' ? '✅' : p.sentiment === 'NEG' ? '❌' : '⚖️'} />;
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safeArr(users.delighters).length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-2">✦ Delighters</span>
                                {safeArr(users.delighters).map((d: any, i: number) => (
                                    <div key={i} className="text-[11px] text-emerald-900 mb-1.5 flex gap-2"><span className="text-emerald-500">+</span>{typeof d === 'string' ? d : safeText(d)}</div>
                                ))}
                            </div>
                        )}
                        {safeArr(users.failures).length > 0 && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                                <span className="text-[10px] font-bold text-red-700 uppercase block mb-2">✧ Failures</span>
                                {safeArr(users.failures).map((f: any, i: number) => (
                                    <div key={i} className="text-[11px] text-red-900 mb-1.5 flex gap-2"><span className="text-red-500">−</span>{typeof f === 'string' ? f : safeText(f)}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {nonUsers && (
                <div className="space-y-4">
                    <SectionTitle label="Non-Users of Ultra (Still on Fluff)" icon="🚫" />
                    {nonUsers.awareness_quality && (
                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800">
                            <strong>Awareness Quality:</strong> {nonUsers.awareness_quality}
                        </div>
                    )}
                    {safeArr(nonUsers.barriers_to_try).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {safeArr(nonUsers.barriers_to_try).map((b: any, i: number) => (
                                <InsightCard key={i} title={b.title || ''} detail={safeArr(b.bullets).join(' · ')} accent="rose" icon="🚧" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {wuc && (
                <div className="space-y-4">
                    <SectionTitle label="Whisper Ultra Clean — Discontinued Product" icon="📋" />
                    <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-200 p-5 rounded-2xl">
                        {wuc.product_context && <p className="text-[11px] text-slate-700 mb-3">{wuc.product_context}</p>}
                        {safeArr(wuc.consumer_feedback).length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                {safeArr(wuc.consumer_feedback).map((f: any, i: number) => {
                                    const accent = f.sentiment === 'POS' ? 'emerald' : f.sentiment === 'NEG' ? 'red' : 'amber';
                                    return <InsightCard key={i} title={f.aspect || ''} detail={f.insight || ''} accent={accent} />;
                                })}
                            </div>
                        )}
                        {wuc.discontinuation_impact && <div className="text-[11px] text-amber-800 bg-amber-100 px-3 py-2 rounded-lg">{wuc.discontinuation_impact}</div>}
                        {safeArr(wuc.consumer_quotes).length > 0 && <VerbatimGrid items={wuc.consumer_quotes} max={4} />}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── BRAND PERFORMANCE ───────────────────────────────────────────────

const SPBrandPerformanceRenderer = ({ data }: { data: any }) => {
    const brands = safeArr(data?.brand_performance);
    if (brands.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Brand data being synthesized...</div>;

    const borderColors = ['border-l-indigo-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-purple-500', 'border-l-blue-500', 'border-l-slate-500'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {brands.map((b: any, i: number) => (
                <div key={i} className={`bg-white border border-slate-200 border-l-4 ${borderColors[i % borderColors.length]} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}>
                    <h4 className="font-extrabold text-lg text-slate-900 mb-3">{b.brand || `Brand ${i+1}`}</h4>

                    <div className="flex gap-3 mb-4">
                        {b.brand_share_estimate && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-center">
                                <div className="text-sm font-extrabold text-indigo-700">{b.brand_share_estimate}</div>
                                <div className="text-[8px] text-indigo-400 uppercase">Share of Voice</div>
                            </div>
                        )}
                        {b.price_band && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                                <div className="text-sm font-extrabold text-slate-700">{b.price_band}</div>
                                <div className="text-[8px] text-slate-400 uppercase">Price Band</div>
                            </div>
                        )}
                    </div>

                    {safeArr(b.sub_categories).length > 0 && (
                        <div className="mb-3">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Sub-Categories</span>
                            <div className="flex flex-wrap gap-1">
                                {safeArr(b.sub_categories).map((sc: string, j: number) => (
                                    <span key={j} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{sc}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {safeArr(b.skus).length > 0 && (
                        <div className="mb-3">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">SKUs</span>
                            <div className="space-y-1">
                                {safeArr(b.skus).slice(0, 4).map((sku: any, j: number) => (
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

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        {safeArr(b.key_strengths).length > 0 && (
                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-1.5">Strengths</span>
                                {safeArr(b.key_strengths).map((s: any, j: number) => (
                                    <div key={j} className="text-[10px] text-emerald-900 mb-1 flex gap-1.5"><span>+</span>{typeof s === 'string' ? s : safeText(s)}</div>
                                ))}
                            </div>
                        )}
                        {safeArr(b.key_weaknesses).length > 0 && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                <span className="text-[9px] font-bold text-red-700 uppercase block mb-1.5">Weaknesses</span>
                                {safeArr(b.key_weaknesses).map((w: any, j: number) => (
                                    <div key={j} className="text-[10px] text-red-900 mb-1 flex gap-1.5"><span>−</span>{typeof w === 'string' ? w : safeText(w)}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    {b.attribute_verdict && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                            <strong className="not-italic text-slate-800">Verdict:</strong> {b.attribute_verdict}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// ── WHISPER ULTRA CLEAN (STANDALONE SECTION 8) ──────────────────────

const SPWhisperUltraCleanRenderer = ({ data }: { data: any }) => {
    const cards = safeArr(data?.cards);
    if (cards.length === 0) return <div className="text-sm text-slate-400 italic text-center py-8">Whisper Ultra Clean analysis being synthesized...</div>;
    return <SPMenstruationContextRenderer data={data} />;
};

// ── MAIN ROUTER ─────────────────────────────────────────────────────

export const SanitaryPadsSectionRenderer = ({ data, normalizedData }: { data: any; normalizedData: any }) => {
    const c = normalizedData;
    const sid = data.sectionId;

    if (sid === '1') return <SPMenstruationContextRenderer data={c} />;
    if (sid === 'sub_categories') return <SPSubCategoryRenderer data={c} />;
    if (sid === 'gap_analysis') return <SPGapAnalysisRenderer data={c} />;
    if (sid === '2') return <SPSwitchingDynamicsRenderer data={c} />;
    if (sid === '3') return <SPAttributePerformanceRenderer data={c} />;
    if (sid === '4') return <SPPurchaseBehaviourRenderer data={c} />;
    if (sid === '5') return <SPDeepDiveRenderer data={c} />;
    if (sid === '7') return <SPBrandPerformanceRenderer data={c} />;
    if (sid === '8') return <SPWhisperUltraCleanRenderer data={c} />;

    // Fallback: try cards
    if (c.cards) return <SPMenstruationContextRenderer data={c} />;

    return null;
};
