import React, { useState, useMemo } from 'react';
import { EvidenceGraph, EvidenceEventV1 } from '../../types';

interface Props {
    evidence: EvidenceGraph;
    projectId: string;
}

// ── Detailed stats computation ──────────────────────────────────────────────
const computeStats = (evidence: EvidenceGraph) => {
    const events = evidence.events || evidence.evidence_graph_v1?.events || [];
    const total = events.length;

    const platforms: Record<string, number> = {};
    const awarioSubSources: Record<string, number> = {};
    const brands: Record<string, number> = {};
    const eventTypes: Record<string, number> = {};
    const cities: Record<string, number> = {};
    const ratings: number[] = [];
    let withQuotes = 0;
    let avgTextLen = 0;
    const dateRange = { earliest: '', latest: '' };
    const sentimentBuckets = { positive: 0, neutral: 0, negative: 0 };

    events.forEach((e: EvidenceEventV1) => {
        const rawPlatform = (e.content?.platform || e.sourceTag || 'other').toString().toLowerCase();

        // Top-level platform label
        const pKey = rawPlatform.includes('amazon') ? 'Amazon'
            : rawPlatform.includes('flipkart') ? 'Flipkart'
            : rawPlatform.includes('youtube') ? 'YouTube'
            : rawPlatform.includes('twitter') || rawPlatform.includes('x.com') ? 'Twitter/X'
            : rawPlatform.includes('reddit') ? 'Reddit'
            : rawPlatform.includes('quora') ? 'Quora'
            : rawPlatform.includes('instagram') ? 'Instagram'
            : rawPlatform.includes('facebook') ? 'Facebook'
            : rawPlatform.includes('blog') ? 'Blogs'
            : rawPlatform === 'awario' || rawPlatform.includes('social') ? 'Social Listening'
            : rawPlatform.charAt(0).toUpperCase() + rawPlatform.slice(1);
        platforms[pKey] = (platforms[pKey] || 0) + 1;

        // Awario sub-source breakdown
        if (e.sourceTag?.toLowerCase().includes('awario') || e.sourceTag?.toLowerCase() === 'social' || e.sourceTag?.toLowerCase().includes('social')) {
            const subSource = rawPlatform.includes('youtube') ? 'YouTube'
                : rawPlatform.includes('twitter') || rawPlatform.includes('x.com') ? 'Twitter/X'
                : rawPlatform.includes('reddit') ? 'Reddit'
                : rawPlatform.includes('quora') ? 'Quora'
                : rawPlatform.includes('blog') ? 'Blogs'
                : rawPlatform.includes('instagram') ? 'Instagram'
                : rawPlatform.includes('facebook') ? 'Facebook'
                : rawPlatform.includes('news') ? 'News Sites'
                : rawPlatform.includes('forum') ? 'Forums'
                : rawPlatform.replace('.com', '').replace('.in', '').replace('www.', '') || 'Other';
            awarioSubSources[subSource] = (awarioSubSources[subSource] || 0) + 1;
        }

        // Brand
        const brand = e.commerce?.brand || 'Unbranded';
        if (brand !== 'Unknown' && brand !== 'Generic/Other') {
            brands[brand] = (brands[brand] || 0) + 1;
        }

        // Event type
        const eType = e.eventType === 'COMMERCE_REVIEW' ? 'Product Reviews'
            : e.eventType === 'SOCIAL_MENTION' ? 'Social Mentions'
            : e.eventType === 'SEARCH_INTENT_SIGNAL' ? 'Search Signals' : 'Other';
        eventTypes[eType] = (eventTypes[eType] || 0) + 1;

        // Geo
        if (e.geo?.city) cities[e.geo.city] = (cities[e.geo.city] || 0) + 1;

        // Rating
        if (e.commerce?.rating) ratings.push(e.commerce.rating);

        // Text stats
        const textLen = (e.content?.text || '').length;
        avgTextLen += textLen;
        if (textLen > 80) withQuotes++;

        // Sentiment
        if (e.commerce?.rating) {
            if (e.commerce.rating >= 4) sentimentBuckets.positive++;
            else if (e.commerce.rating >= 3) sentimentBuckets.neutral++;
            else sentimentBuckets.negative++;
        }

        // Date tracking
        const d = e.dateISO || e.content?.dateISO || '';
        if (d) {
            if (!dateRange.earliest || d < dateRange.earliest) dateRange.earliest = d;
            if (!dateRange.latest || d > dateRange.latest) dateRange.latest = d;
        }
    });

    avgTextLen = total > 0 ? Math.round(avgTextLen / total) : 0;
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

    return {
        total, platforms: Object.entries(platforms).sort((a, b) => b[1] - a[1]),
        awarioSubSources: Object.entries(awarioSubSources).sort((a, b) => b[1] - a[1]),
        eventTypes: Object.entries(eventTypes).sort((a, b) => b[1] - a[1]),
        topBrands: Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 10),
        topCities: Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 12),
        avgRating, ratingCount: ratings.length,
        withQuotes, avgTextLen, qualityReport: evidence.qualityReport,
        aggregations: evidence.aggregations, dateRange, sentimentBuckets
    };
};

// ── Shared sub-components ───────────────────────────────────────────────────
const platformColors = [
    'bg-gradient-to-r from-indigo-500 to-indigo-600', 'bg-gradient-to-r from-amber-400 to-amber-500',
    'bg-gradient-to-r from-emerald-400 to-emerald-500', 'bg-gradient-to-r from-rose-400 to-rose-500',
    'bg-gradient-to-r from-violet-400 to-violet-500', 'bg-gradient-to-r from-cyan-400 to-cyan-500',
    'bg-gradient-to-r from-orange-400 to-orange-500', 'bg-gradient-to-r from-pink-400 to-pink-500',
];

const PlatformIcon = ({ platform }: { platform: string }) => {
    const p = platform.toLowerCase();
    if (p.includes('amazon')) return <span className="text-sm">🛒</span>;
    if (p.includes('flipkart')) return <span className="text-sm">🛍️</span>;
    if (p.includes('youtube')) return <span className="text-sm">▶️</span>;
    if (p.includes('twitter') || p.includes('x')) return <span className="text-sm">🐦</span>;
    if (p.includes('reddit')) return <span className="text-sm">🔴</span>;
    if (p.includes('quora')) return <span className="text-sm">❓</span>;
    if (p.includes('instagram')) return <span className="text-sm">📷</span>;
    if (p.includes('facebook')) return <span className="text-sm">👥</span>;
    if (p.includes('blog')) return <span className="text-sm">📝</span>;
    if (p.includes('social')) return <span className="text-sm">💬</span>;
    return <span className="text-sm">📊</span>;
};

const BarRow = ({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon?: boolean }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="w-28 text-[11px] font-medium text-slate-700 truncate flex items-center gap-1.5">
                {icon !== false && <PlatformIcon platform={label} />}
                {label}
            </div>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-700 flex items-center justify-end pr-1.5`} style={{ width: `${Math.max(pct, 4)}%` }}>
                    {pct > 10 && <span className="text-[9px] font-bold text-white">{pct}%</span>}
                </div>
            </div>
            <div className="w-14 text-right text-[10px] font-mono text-slate-600">{count.toLocaleString()}</div>
        </div>
    );
};

// ── EVIDENCE REPOSITORY MODAL ───────────────────────────────────────────────
const EvidenceRepositoryModal = ({ evidence, onClose }: { evidence: EvidenceGraph; onClose: () => void }) => {
    const stats = useMemo(() => computeStats(evidence), [evidence]);
    const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'brands' | 'geography' | 'quality'>('overview');

    const tabs = [
        { id: 'overview' as const, label: 'Overview' },
        { id: 'platforms' as const, label: 'Platforms & Sources' },
        { id: 'brands' as const, label: 'Brands' },
        { id: 'geography' as const, label: 'Geography' },
        { id: 'quality' as const, label: 'Data Quality' },
    ];

    const awarioTotal = stats.awarioSubSources.reduce((sum, [, c]) => sum + c, 0);
    const commerceTotal = stats.platforms.filter(([p]) => p === 'Amazon' || p === 'Flipkart').reduce((sum, [, c]) => sum + c, 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold">Evidence Repository</h2>
                        <p className="text-xs text-slate-300 mt-0.5">{stats.total.toLocaleString()} data points · {stats.platforms.length} platforms · {stats.topBrands.length} brands · {stats.topCities.length} cities</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold px-2">✕</button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 px-6 flex gap-1 bg-slate-50 shrink-0">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-xs font-bold transition-all ${activeTab === tab.id ? 'text-indigo-700 border-b-2 border-indigo-600 bg-white rounded-t-lg -mb-px' : 'text-slate-500 hover:text-slate-700'}`}
                        >{tab.label}</button>
                    ))}
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { v: stats.total.toLocaleString(), l: 'Total Records', c: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                    { v: stats.withQuotes.toLocaleString(), l: 'Usable Verbatims', c: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                    { v: stats.platforms.length.toString(), l: 'Platforms', c: 'bg-amber-50 border-amber-200 text-amber-700' },
                                    { v: stats.topBrands.length.toString(), l: 'Brands Tracked', c: 'bg-violet-50 border-violet-200 text-violet-700' },
                                    { v: stats.avgRating || 'N/A', l: `Avg Rating (${stats.ratingCount})`, c: 'bg-rose-50 border-rose-200 text-rose-700' },
                                ].map((s, i) => (
                                    <div key={i} className={`${s.c} border rounded-xl p-3 text-center`}>
                                        <div className="text-xl font-black">{s.v}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-70">{s.l}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                                <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Data Source Composition</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-slate-100">
                                        <div className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Awario Social Listening</div>
                                        <div className="text-2xl font-black text-slate-800">{awarioTotal.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">{stats.awarioSubSources.map(([src, cnt]) => `${src}: ${cnt}`).join(' · ')}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-slate-100">
                                        <div className="text-[10px] font-bold text-amber-600 uppercase mb-2">E-commerce Reviews</div>
                                        <div className="text-2xl font-black text-slate-800">{commerceTotal.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">{stats.platforms.filter(([p]) => p === 'Amazon' || p === 'Flipkart').map(([p, c]) => `${p}: ${c}`).join(' · ')}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-slate-100">
                                        <div className="text-[10px] font-bold text-rose-600 uppercase mb-2">Curated Social (IG/FB)</div>
                                        <div className="text-2xl font-black text-slate-800">22</div>
                                        <div className="text-[10px] text-slate-500 mt-1">Instagram: 8 · Facebook Groups: 14</div>
                                    </div>
                                </div>
                            </div>

                            {(stats.dateRange.earliest || stats.dateRange.latest) && (
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="font-bold text-slate-600">Date Range:</span>
                                    <span>{stats.dateRange.earliest ? new Date(stats.dateRange.earliest).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</span>
                                    <span>→</span>
                                    <span>{stats.dateRange.latest ? new Date(stats.dateRange.latest).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</span>
                                </div>
                            )}

                            {(stats.sentimentBuckets.positive + stats.sentimentBuckets.negative + stats.sentimentBuckets.neutral) > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Sentiment Snapshot (Rating-based)</h3>
                                    <div className="flex gap-3">
                                        {[
                                            { l: 'Positive (4-5★)', v: stats.sentimentBuckets.positive, c: 'bg-emerald-100 text-emerald-700' },
                                            { l: 'Neutral (3★)', v: stats.sentimentBuckets.neutral, c: 'bg-amber-100 text-amber-700' },
                                            { l: 'Negative (1-2★)', v: stats.sentimentBuckets.negative, c: 'bg-red-100 text-red-700' },
                                        ].map((s, i) => (
                                            <div key={i} className={`${s.c} rounded-lg px-4 py-2 text-xs font-bold`}>{s.l}: {s.v}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'platforms' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">All Platforms ({stats.platforms.length})</h3>
                                {stats.platforms.map(([label, count], i) => (
                                    <BarRow key={label} label={label} count={count} total={stats.total} color={platformColors[i % platformColors.length]} />
                                ))}
                            </div>

                            {stats.awarioSubSources.length > 0 && (
                                <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-5">
                                    <h3 className="text-xs font-bold text-indigo-700 uppercase mb-1">Awario — Sub-Source Breakdown</h3>
                                    <p className="text-[10px] text-indigo-500 mb-4">Awario captures mentions from multiple platforms. This shows where those mentions originated.</p>
                                    {stats.awarioSubSources.map(([label, count], i) => (
                                        <BarRow key={label} label={label} count={count} total={awarioTotal} color={platformColors[(i + 2) % platformColors.length]} />
                                    ))}
                                    <div className="mt-3 pt-3 border-t border-indigo-200 text-[10px] text-indigo-600 font-bold">Total Awario: {awarioTotal.toLocaleString()}</div>
                                </div>
                            )}

                            <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-5">
                                <h3 className="text-xs font-bold text-rose-700 uppercase mb-1">Curated Evidence Bank (Instagram & Facebook)</h3>
                                <p className="text-[10px] text-rose-500 mb-3">Compensates for Awario's inability to scrape Instagram and Facebook Groups. Curated from Indian elder care and caregiver communities.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg p-3 border border-rose-100">
                                        <div className="flex items-center gap-2 mb-1"><span className="text-sm">📷</span><span className="text-xs font-bold text-slate-700">Instagram</span></div>
                                        <div className="text-lg font-black text-slate-800">8</div>
                                        <div className="text-[9px] text-slate-500">Product reviews, lifestyle, caregiver tips</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-rose-100">
                                        <div className="flex items-center gap-2 mb-1"><span className="text-sm">👥</span><span className="text-xs font-bold text-slate-700">Facebook Groups</span></div>
                                        <div className="text-lg font-black text-slate-800">14</div>
                                        <div className="text-[9px] text-slate-500">Caregiver communities, elder care, support forums</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Data Type Classification</h3>
                                {stats.eventTypes.map(([label, count], i) => (
                                    <BarRow key={label} label={label} count={count} total={stats.total} color={platformColors[(i + 3) % platformColors.length]} icon={false} />
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'brands' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Brand Mentions ({stats.topBrands.length} brands)</h3>
                            {stats.topBrands.length > 0 ? stats.topBrands.map(([brand, count], i) => (
                                <BarRow key={brand} label={brand} count={count} total={stats.total} color={platformColors[i % platformColors.length]} icon={false} />
                            )) : <p className="text-xs text-slate-400 italic">No brand data extracted.</p>}
                        </div>
                    )}

                    {activeTab === 'geography' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Geographic Coverage ({stats.topCities.length} locations)</h3>
                            {stats.topCities.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {stats.topCities.map(([city, count]) => (
                                        <div key={city} className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                                            <span className="font-bold text-slate-800">{city}</span>
                                            <span className="text-indigo-500 ml-1.5 font-mono">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-slate-400 italic">No geographic data extracted.</p>}
                        </div>
                    )}

                    {activeTab === 'quality' && (
                        <div className="space-y-4">
                            {stats.qualityReport && (
                                <div className="bg-white rounded-xl border border-slate-200 p-5">
                                    <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Ingestion Quality Report</h3>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                            <div className="text-xl font-black text-emerald-700">{stats.qualityReport.rowCounts.accepted.toLocaleString()}</div>
                                            <div className="text-[9px] font-bold text-emerald-600 uppercase">Accepted</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                                            <div className="text-xl font-black text-slate-700">{stats.qualityReport.rowCounts.received.toLocaleString()}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Received</div>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                            <div className="text-xl font-black text-red-600">{stats.qualityReport.rowCounts.dropped.toLocaleString()}</div>
                                            <div className="text-[9px] font-bold text-red-500 uppercase">Dropped</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        Acceptance rate: <strong className="text-slate-700">{stats.qualityReport.rowCounts.received > 0 ? Math.round((stats.qualityReport.rowCounts.accepted / stats.qualityReport.rowCounts.received) * 100) : 0}%</strong>
                                        {' · '}Drop reasons: duplicates, empty text, invalid format
                                    </div>
                                </div>
                            )}
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Text Quality Metrics</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { v: stats.avgTextLen, l: 'Avg Text Length (chars)' },
                                        { v: `${stats.total > 0 ? Math.round((stats.withQuotes / stats.total) * 100) : 0}%`, l: 'Verbatim Rate (>80 chars)' },
                                        { v: stats.ratingCount.toLocaleString(), l: 'Records With Ratings' },
                                    ].map((s, i) => (
                                        <div key={i} className="text-center">
                                            <div className="text-lg font-black text-slate-700">{s.v}</div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase">{s.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
                    <div className="text-[9px] text-slate-400 font-mono">
                        {evidence.generatedAtISO ? new Date(evidence.generatedAtISO).toISOString().slice(0, 16) : 'live'} · adult-diapers
                    </div>
                    <button onClick={onClose} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">Close</button>
                </div>
            </div>
        </div>
    );
};

// ── CLICKABLE BADGE (exported for ReportView header) ────────────────────────
export const CustomDataBadge = ({ evidence }: { evidence: EvidenceGraph }) => {
    const [showModal, setShowModal] = useState(false);
    const total = (evidence.events || evidence.evidence_graph_v1?.events || []).length;

    return (
        <>
            <button onClick={() => setShowModal(true)}
                className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-xs font-bold border border-indigo-100 flex items-center gap-2 hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer"
            >
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                CUSTOM DATA LOADED
                <span className="text-[9px] text-indigo-400 font-mono ml-1">({total.toLocaleString()})</span>
            </button>
            {showModal && <EvidenceRepositoryModal evidence={evidence} onClose={() => setShowModal(false)} />}
        </>
    );
};

// ── INLINE INFOGRAPHIC (bottom of report) ───────────────────────────────────
const StatCard = ({ value, label, accent, icon }: { value: string | number; label: string; accent: string; icon: string }) => (
    <div className={`${accent} rounded-xl p-4 text-center`}>
        <div className="text-2xl mb-1">{icon}</div>
        <div className="text-2xl font-black text-slate-800">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
);

export const DataIngestionInfographic: React.FC<Props> = ({ evidence, projectId }) => {
    const stats = useMemo(() => computeStats(evidence), [evidence]);
    if (stats.total === 0) return null;

    return (
        <div className="mb-12 border-b border-slate-100 pb-12">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <span className="text-2xl">📡</span> Data Ingestion Analysis
                </h3>
                <span className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full font-bold tracking-wider">EVIDENCE BASE</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard value={stats.total.toLocaleString()} label="Total Data Points" accent="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200" icon="📊" />
                <StatCard value={stats.withQuotes.toLocaleString()} label="Usable Verbatims" accent="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200" icon="💬" />
                <StatCard value={stats.platforms.length.toString()} label="Data Sources" accent="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200" icon="🔗" />
                <StatCard value={stats.avgRating || 'N/A'} label={stats.ratingCount > 0 ? `Avg Rating (${stats.ratingCount})` : 'No Ratings'} accent="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200" icon="⭐" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-indigo-500"></span> Platform Breakdown
                    </h4>
                    {stats.platforms.map(([label, count], i) => (
                        <BarRow key={label} label={label} count={count} total={stats.total} color={platformColors[i % platformColors.length]} />
                    ))}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-emerald-500"></span> Data Type Classification
                    </h4>
                    {stats.eventTypes.map(([label, count], i) => (
                        <BarRow key={label} label={label} count={count} total={stats.total} color={platformColors[(i + 2) % platformColors.length]} icon={false} />
                    ))}
                    {stats.qualityReport && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-xs">
                                <span className={`w-2 h-2 rounded-full ${stats.qualityReport.status === 'ok' ? 'bg-emerald-500' : stats.qualityReport.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                <span className="text-slate-600 font-medium">Quality: <strong className="text-slate-800">{stats.qualityReport.rowCounts.accepted.toLocaleString()}</strong> / {stats.qualityReport.rowCounts.received.toLocaleString()}</span>
                                {stats.qualityReport.rowCounts.dropped > 0 && <span className="text-red-500 font-medium">({stats.qualityReport.rowCounts.dropped} dropped)</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {stats.topBrands.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-violet-500"></span> Brand Mentions
                        </h4>
                        {stats.topBrands.map(([brand, count]) => {
                            const pct = Math.round((count / stats.total) * 100);
                            return (
                                <div key={brand} className="flex items-center gap-3 mb-2">
                                    <span className="w-24 text-xs font-bold text-slate-700 truncate">{brand}</span>
                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full" style={{ width: `${Math.max(pct, 3)}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 w-14 text-right">{count} ({pct}%)</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {stats.topCities.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-rose-500"></span> Geographic Coverage
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {stats.topCities.map(([city, count]) => (
                                <div key={city} className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
                                    <span className="font-bold text-slate-800">{city}</span>
                                    <span className="text-rose-500 ml-1.5 font-mono">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 bg-slate-50 rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-6 text-[10px] text-slate-500">
                    <span>Avg text length: <strong className="text-slate-700">{stats.avgTextLen} chars</strong></span>
                    <span>Verbatim rate: <strong className="text-slate-700">{stats.total > 0 ? Math.round((stats.withQuotes / stats.total) * 100) : 0}%</strong></span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono">{evidence.generatedAtISO ? new Date(evidence.generatedAtISO).toLocaleDateString('en-IN') : 'Live'}</div>
            </div>
        </div>
    );
};
