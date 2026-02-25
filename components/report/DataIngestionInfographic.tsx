import React from 'react';
import { EvidenceGraph, EvidenceEventV1 } from '../../types';

interface Props {
    evidence: EvidenceGraph;
    projectId: string;
}

const computeStats = (evidence: EvidenceGraph) => {
    const events = evidence.events || evidence.evidence_graph_v1?.events || [];
    const total = events.length;

    // Platform breakdown
    const platforms: Record<string, number> = {};
    const brands: Record<string, number> = {};
    const eventTypes: Record<string, number> = {};
    const cities: Record<string, number> = {};
    const ratings: number[] = [];
    let withQuotes = 0;
    let avgTextLen = 0;

    events.forEach((e: EvidenceEventV1) => {
        // Platform
        const platform = e.commerce?.platform?.toLowerCase() || e.sourceTag?.toLowerCase() || 'other';
        const pKey = platform.includes('amazon') ? 'Amazon' :
                     platform.includes('flipkart') ? 'Flipkart' :
                     platform === 'awario' || platform.includes('social') ? 'Social Listening' :
                     platform.charAt(0).toUpperCase() + platform.slice(1);
        platforms[pKey] = (platforms[pKey] || 0) + 1;

        // Brand
        const brand = e.commerce?.brand || 'Unbranded';
        if (brand !== 'Unknown' && brand !== 'Generic/Other') {
            brands[brand] = (brands[brand] || 0) + 1;
        }

        // Event type
        const eType = e.eventType === 'COMMERCE_REVIEW' ? 'Product Reviews' :
                       e.eventType === 'SOCIAL_MENTION' ? 'Social Mentions' :
                       e.eventType === 'SEARCH_INTENT_SIGNAL' ? 'Search Signals' : 'Other';
        eventTypes[eType] = (eventTypes[eType] || 0) + 1;

        // Geo
        if (e.geo?.city) {
            cities[e.geo.city] = (cities[e.geo.city] || 0) + 1;
        }

        // Rating
        if (e.commerce?.rating) ratings.push(e.commerce.rating);

        // Text stats
        const textLen = (e.content?.text || '').length;
        avgTextLen += textLen;
        if (textLen > 80) withQuotes++;
    });

    avgTextLen = total > 0 ? Math.round(avgTextLen / total) : 0;
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

    // Sort brands by count, top 8
    const topBrands = Object.entries(brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    // Sort cities by count, top 6
    const topCities = Object.entries(cities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    // Quality report
    const qr = evidence.qualityReport;

    return {
        total,
        platforms: Object.entries(platforms).sort((a, b) => b[1] - a[1]),
        eventTypes: Object.entries(eventTypes).sort((a, b) => b[1] - a[1]),
        topBrands,
        topCities,
        avgRating,
        ratingCount: ratings.length,
        withQuotes,
        avgTextLen,
        qualityReport: qr,
        aggregations: evidence.aggregations
    };
};

// Platform icon SVGs (inline for reliability)
const PlatformIcon = ({ platform }: { platform: string }) => {
    const p = platform.toLowerCase();
    if (p.includes('amazon')) return <span className="text-lg">🛒</span>;
    if (p.includes('flipkart')) return <span className="text-lg">🛍️</span>;
    if (p.includes('social')) return <span className="text-lg">💬</span>;
    if (p.includes('search')) return <span className="text-lg">🔍</span>;
    return <span className="text-lg">📊</span>;
};

const StatCard = ({ value, label, accent, icon }: { value: string | number, label: string, accent: string, icon: string }) => (
    <div className={`${accent} rounded-xl p-4 text-center`}>
        <div className="text-2xl mb-1">{icon}</div>
        <div className="text-2xl font-black text-slate-800">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
);

const BarSegment = ({ label, count, total, color }: { label: string, count: number, total: number, color: string }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3 mb-2.5">
            <div className="w-28 text-xs font-medium text-slate-700 truncate flex items-center gap-1.5">
                <PlatformIcon platform={label} />
                {label}
            </div>
            <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                <div className={`h-full ${color} rounded-full transition-all duration-700 flex items-center justify-end pr-2`} style={{ width: `${Math.max(pct, 5)}%` }}>
                    {pct > 12 && <span className="text-[10px] font-bold text-white">{pct}%</span>}
                </div>
            </div>
            <div className="w-16 text-right">
                <span className="text-xs font-bold text-slate-800">{count.toLocaleString()}</span>
            </div>
        </div>
    );
};

const platformColors = ['bg-gradient-to-r from-indigo-500 to-indigo-600', 'bg-gradient-to-r from-amber-400 to-amber-500', 'bg-gradient-to-r from-emerald-400 to-emerald-500', 'bg-gradient-to-r from-rose-400 to-rose-500', 'bg-gradient-to-r from-violet-400 to-violet-500'];

export const DataIngestionInfographic: React.FC<Props> = ({ evidence, projectId }) => {
    const stats = computeStats(evidence);

    if (stats.total === 0) return null;

    return (
        <div className="mb-12 border-b border-slate-100 pb-12">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <span className="text-2xl">📡</span> Data Ingestion Analysis
                </h3>
                <span className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full font-bold tracking-wider">
                    EVIDENCE BASE
                </span>
            </div>

            {/* Hero Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard value={stats.total.toLocaleString()} label="Total Data Points" accent="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200" icon="📊" />
                <StatCard value={stats.withQuotes.toLocaleString()} label="Usable Verbatims" accent="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200" icon="💬" />
                <StatCard value={stats.platforms.length.toString()} label="Data Sources" accent="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200" icon="🔗" />
                <StatCard value={stats.avgRating || 'N/A'} label={stats.ratingCount > 0 ? `Avg Rating (${stats.ratingCount})` : 'No Ratings'} accent="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200" icon="⭐" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Platform Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-indigo-500"></span> Platform Breakdown
                    </h4>
                    {stats.platforms.map(([label, count], i) => (
                        <BarSegment key={label} label={label} count={count} total={stats.total} color={platformColors[i % platformColors.length]} />
                    ))}
                </div>

                {/* Data Type Split */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-emerald-500"></span> Data Type Classification
                    </h4>
                    {stats.eventTypes.map(([label, count], i) => (
                        <BarSegment key={label} label={label} count={count} total={stats.total} color={platformColors[(i + 2) % platformColors.length]} />
                    ))}
                    {/* Quality indicator */}
                    {stats.qualityReport && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-xs">
                                <span className={`w-2 h-2 rounded-full ${stats.qualityReport.status === 'ok' ? 'bg-emerald-500' : stats.qualityReport.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                <span className="text-slate-600 font-medium">Quality: <strong className="text-slate-800">{stats.qualityReport.rowCounts.accepted.toLocaleString()}</strong> accepted / {stats.qualityReport.rowCounts.received.toLocaleString()} received</span>
                                {stats.qualityReport.rowCounts.dropped > 0 && (
                                    <span className="text-red-500 font-medium">({stats.qualityReport.rowCounts.dropped} dropped)</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Brand Distribution + Geographic Coverage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Top Brands */}
                {stats.topBrands.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-violet-500"></span> Brand Mentions
                        </h4>
                        <div className="space-y-2">
                            {stats.topBrands.map(([brand, count]) => {
                                const pct = Math.round((count / stats.total) * 100);
                                return (
                                    <div key={brand} className="flex items-center gap-3">
                                        <span className="w-24 text-xs font-bold text-slate-700 truncate">{brand}</span>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full" style={{ width: `${Math.max(pct, 3)}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500 w-14 text-right">{count} ({pct}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Geographic Coverage */}
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

            {/* Data Quality Footer */}
            <div className="mt-6 bg-slate-50 rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-6 text-[10px] text-slate-500">
                    <span>Avg text length: <strong className="text-slate-700">{stats.avgTextLen} chars</strong></span>
                    <span>Verbatim rate: <strong className="text-slate-700">{stats.total > 0 ? Math.round((stats.withQuotes / stats.total) * 100) : 0}%</strong></span>
                    {stats.aggregations?.languageCounts && stats.aggregations.languageCounts.length > 0 && (
                        <span>Languages: <strong className="text-slate-700">{stats.aggregations.languageCounts.map(l => l.lang).join(', ')}</strong></span>
                    )}
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                    {evidence.generatedAtISO ? new Date(evidence.generatedAtISO).toLocaleDateString('en-IN') : 'Live'}
                </div>
            </div>
        </div>
    );
};
