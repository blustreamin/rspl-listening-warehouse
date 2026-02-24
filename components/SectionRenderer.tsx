
/* 
 * PATCH SUMMARY:
 * 1. Exported Femcare renderers (Menstruation, Behavioural, etc.) for ModernSectionRenderer reuse.
 * 2. Updated SectionRenderer fallback to use DataQualityNoticeCard (no inline JSON).
 * 3. Maintained legacy support while deferring to ModernSectionRenderer for new projects.
 * 4. Fixed duplicate table header in EcosystemRenderer by conditionally rendering matrix only when formats are absent.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SectionOutput, ProjectId } from '../types';
import { normalizeSectionData } from '../utils/normalization';
import { DataQualityNoticeCard } from './report/DataQualityNotice';

interface Props {
  data: SectionOutput;
  projectId?: ProjectId; // Added ProjectId prop
}

interface ErrorBoundaryProps {
  title: string;
  children?: ReactNode; // Make optional to satisfy strict JSX checks if nesting isn't detected immediately
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// --- ERROR: Project Mismatch Card ---
const ProjectMismatchError = ({ expected, actual }: { expected: string, actual: string }) => (
    <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8">
        <h4 className="text-red-800 font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Project Scope Violation
        </h4>
        <p className="text-red-600 text-sm mt-2">
            A critical isolation error occurred. This section belongs to project <strong>{actual}</strong> but was rendered in the context of <strong>{expected}</strong>.
            This data has been suppressed for safety.
        </p>
    </div>
);

// --- ERROR BOUNDARY ---
class SectionErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Section Render Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mb-8 border border-red-200 bg-red-50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
             <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             <h3 className="text-sm font-bold text-red-800">Section Failed to Render</h3>
          </div>
          <p className="text-xs text-red-600 font-mono mb-4">{this.state.error?.message}</p>
          <div className="text-[10px] text-red-500 uppercase tracking-wider mb-1">Context</div>
          <div className="bg-white p-2 rounded border border-red-100 text-xs text-slate-500 font-mono">
              {this.props.title}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- MICRO COMPONENTS ---

const SafeText: React.FC<{ content: any }> = ({ content }) => {
  if (content === null || content === undefined) return null;
  if (typeof content === 'string' || typeof content === 'number') return <>{content}</>;
  if (React.isValidElement(content)) return content;
  
  if (typeof content === 'object') {
      if (content.text) return <>{String(content.text)}</>;
      if (content.issue) return <>{String(content.issue)}</>;
      if (content.description) return <>{String(content.description)}</>;
      if (content.insight) return <>{String(content.insight)}</>;
      // Last resort fallback
      return <span className="text-[10px] text-slate-400 font-mono" title={JSON.stringify(content)}>{JSON.stringify(content).slice(0, 50)}...</span>;
  }
  return <>{String(content)}</>;
};

const ConfidenceBadge: React.FC<{ score?: string }> = ({ score }) => {
  if (!score) return null;
  const color = score === 'HIGH' ? 'text-emerald-700 bg-emerald-50' : score === 'MED' ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ml-2 border border-current opacity-75 ${color}`}>
      {score} CONFIDENCE
    </span>
  );
};

const EvidencePill: React.FC<{ ids?: any[] }> = ({ ids }) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return null;
  return (
    <span className="inline-flex gap-1 ml-2 align-middle">
      {ids.slice(0, 3).map((id, i) => (
        <span key={i} className="text-[9px] text-slate-400 bg-slate-100 border border-slate-200 px-1 rounded hover:text-indigo-600 cursor-pointer" title={String(id)}>
          #{String(id).slice(-4)}
        </span>
      ))}
      {ids.length > 3 && <span className="text-[9px] text-slate-400">+{ids.length - 3}</span>}
    </span>
  );
};

const MetricBadge: React.FC<{ metrics?: any[] }> = ({ metrics }) => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) return null;
    return (
        <div className="flex gap-2 mt-1 flex-wrap">
            {metrics.map((m, i) => (
                <span key={i} className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100 whitespace-nowrap">
                    {m.label || "Count"}: {m.value}{m.pct ? '%' : ''}
                </span>
            ))}
        </div>
    );
};

// --- SUB-RENDERERS (EXPORTED FOR FEMCARE REUSE) ---

export const MenstruationContextRenderer = ({ data }: { data: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {data.cards?.map((card: any, idx: number) => (
      <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-800 text-sm leading-tight"><SafeText content={card.boldTitle || card.title} /></h4>
            <ConfidenceBadge score={card.confidence} />
        </div>
        <ul className="space-y-2 mb-3">
            {Array.isArray(card.bullets) && card.bullets.map((b: any, i: number) => (
                <li key={i} className="text-xs text-slate-600 pl-2 border-l-2 border-slate-300 leading-relaxed">
                    <SafeText content={b} />
                </li>
            ))}
        </ul>
        <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
             <MetricBadge metrics={card.metrics} />
             <EvidencePill ids={card.evidence_ids} />
        </div>
      </div>
    ))}
  </div>
);

export const BehaviouralRenderer = ({ data }: { data: any }) => (
    <div className="space-y-8">
        {/* Trigger Clusters */}
        {data.trigger_clusters && data.trigger_clusters.length > 0 && (
             <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Trigger Clusters
                </h4>
                <div className="flex flex-wrap gap-3">
                    {data.trigger_clusters.map((t: any, i: number) => (
                        <div key={i} className="flex-1 min-w-[240px] bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h5 className="font-bold text-indigo-900 text-sm"><SafeText content={t.title || t.cluster_name} /></h5>
                                <EvidencePill ids={t.evidence_ids} />
                            </div>
                            <p className="text-xs text-slate-600 mb-3 leading-relaxed italic"><SafeText content={t.explanation} /></p>
                            {Array.isArray(t.bullets) && (
                                <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                                    {t.bullets.map((b: any, k: number) => <li key={k}><SafeText content={b} /></li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* Barrier Groups */}
        {data.barrier_groups && Object.keys(data.barrier_groups).length > 0 && (
            <div>
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Barriers to Adoption
                </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                     {Object.entries(data.barrier_groups).map(([key, barriers]: [string, any]) => (
                         <div key={key} className="bg-rose-50/50 border border-rose-100 p-3 rounded-lg">
                             <h5 className="font-bold text-rose-900 text-xs uppercase mb-2 pb-1 border-b border-rose-200">{key.replace(/_/g, ' ')}</h5>
                             <ul className="space-y-2">
                                 {Array.isArray(barriers) && barriers.map((b: any, i: number) => (
                                     <li key={i} className="text-[11px] text-rose-900 leading-snug flex gap-2">
                                         <span className="text-rose-400">•</span>
                                         <span><SafeText content={b} /></span>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     ))}
                 </div>
            </div>
        )}
        
        {/* Switching Dynamics */}
        {data.switching_dynamics && data.switching_dynamics.length > 0 && (
            <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Switching Dynamics
                </h4>
                <div className="space-y-3">
                    {data.switching_dynamics.map((s: any, i: number) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                            <div className="md:w-1/4">
                                <div className="font-bold text-slate-800 text-sm mb-1"><SafeText content={s.pathway} /></div>
                                <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                                    {s.from && <span>{s.from}</span>}
                                    {s.to && <span className="text-slate-300">→</span>}
                                    {s.to && <span>{s.to}</span>}
                                </div>
                            </div>
                            <div className="flex-1 border-l border-slate-100 md:pl-4">
                                <div className="text-xs text-slate-600 mb-2 font-medium italic"><SafeText content={s.insight || s.logic_bullets?.[0]} /></div>
                                {Array.isArray(s.logic_bullets) && s.logic_bullets.length > 1 && (
                                    <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-1">
                                        {s.logic_bullets.slice(1).map((b: any, k: number) => <li key={k}><SafeText content={b} /></li>)}
                                    </ul>
                                )}
                            </div>
                            <div className="md:w-24 text-right">
                                <EvidencePill ids={s.evidence_ids} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export const EcosystemRenderer = ({ data }: { data: any }) => (
    <div className="space-y-6">
        {data.formats && Array.isArray(data.formats) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.formats.map((f: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-4 rounded border border-slate-200">
                        <h4 className="font-bold text-indigo-700 text-sm mb-2"><SafeText content={f.format} /></h4>
                        <p className="text-xs text-slate-600 mb-2 italic"><SafeText content={f.role_in_lifecycle} /></p>
                        <div className="space-y-1">
                            {Array.isArray(f.functional_resolution) && f.functional_resolution.map((r: any, k: number) => (
                                <div key={k} className="text-xs text-slate-700 flex gap-2">
                                    <span className="text-indigo-400 font-bold text-[9px]">FUNC</span> <SafeText content={r} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
        {data.tradeoff_matrix && Array.isArray(data.tradeoff_matrix) && !data.formats && (
             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                 <table className="w-full text-xs text-left">
                     <thead className="bg-slate-100 text-slate-500 font-bold uppercase">
                         <tr>
                             <th className="p-3">Attribute</th>
                             <th className="p-3">Pads</th>
                             <th className="p-3">Disposable</th>
                             <th className="p-3">Reusable</th>
                             <th className="p-3">Winner</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {data.tradeoff_matrix.map((row: any, i: number) => (
                             <tr key={i} className="bg-white hover:bg-slate-50">
                                 <td className="p-3 font-bold text-slate-700"><SafeText content={row.attribute} /></td>
                                 <td className="p-3 text-slate-600"><SafeText content={row.pads} /></td>
                                 <td className="p-3 text-slate-600"><SafeText content={row.disposable_panties} /></td>
                                 <td className="p-3 text-slate-600"><SafeText content={row.reusable_panties} /></td>
                                 <td className="p-3 font-bold text-emerald-600"><SafeText content={row.winner} /></td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        )}
    </div>
);

export const DeepDiveRenderer = ({ data }: { data: any }) => (
    <div className="space-y-8">
        {data.role_summary && (
            <div className="bg-gradient-to-r from-slate-100 to-white p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                    <h4 className="font-bold text-slate-800 mb-2"><SafeText content={data.role_summary.boldTitle} /></h4>
                    <ConfidenceBadge score={data.role_summary.confidence} />
                </div>
                {Array.isArray(data.role_summary.bullets) && (
                    <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                        {data.role_summary.bullets.map((b: any, i: number) => <li key={i}><SafeText content={b} /></li>)}
                    </ul>
                )}
            </div>
        )}
         {data.users && (
            <div>
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2">User Experience</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 block mb-2">DISCOVERY</span>
                        <div className="flex flex-wrap gap-2">
                            {Array.isArray(data.users.discovery_sources) && data.users.discovery_sources.map((s: any, i: number) => (
                                <span key={i} className="text-xs bg-white border px-2 py-1 rounded text-slate-700"><SafeText content={s} /></span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
         )}
    </div>
);

export const VisualsRenderer = ({ data }: { data: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {data.sources_chart && Array.isArray(data.sources_chart.data) && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-4 text-center">Data Sources</h4>
                <div className="flex items-end justify-center gap-4 h-40 pb-2 border-b border-slate-200">
                    {data.sources_chart.data.map((d: any, i: number) => (
                         <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-8 bg-indigo-500" style={{ height: Math.max(d.pct, 5) + '%' }}></div>
                            <span className="text-[10px]"><SafeText content={d.source} /></span>
                         </div>
                    ))}
                </div>
            </div>
        )}
        {/* Word clouds */}
        {data.word_cloud_themes && Array.isArray(data.word_cloud_themes.tokens) && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                 <h4 className="font-bold text-slate-700 mb-2 text-center text-xs uppercase">Themes</h4>
                 <div className="flex flex-wrap justify-center gap-2">
                     {data.word_cloud_themes.tokens.map((t: any, i: number) => (
                         <span key={i} className="bg-slate-100 text-xs px-2 py-1 rounded"><SafeText content={t.term} /></span>
                     ))}
                 </div>
            </div>
        )}
    </div>
);

// --- MAIN RENDERER ---

export const SectionRenderer: React.FC<Props> = ({ data, projectId }) => {
  // --- FIREWALL: PROJECT ISOLATION CHECK ---
  if (projectId && data.projectId && projectId !== data.projectId) {
      console.error(`[Renderer] Firewall blocked display of ${data.projectId} data in ${projectId} view.`);
      return <ProjectMismatchError expected={projectId} actual={data.projectId} />;
  }

  const isSeeded = data.status === 'SEEDED' || data.status === 'PARTIAL';
  
  if (!data.content) {
      return (
          <div className="mb-8 border border-red-200 bg-red-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800">{data.title}</h3>
              <p className="text-red-600 text-sm mt-2">Data Unavailable (Render Error)</p>
          </div>
      );
  }

  // Quick inference mapping for legacy pipeline
  let inferredId = '0';
  const c = data.content;
  if (c.cards || c.menstruation_context) inferredId = '1';
  else if (c.trigger_clusters || c.behavioural_landscape) inferredId = '2';
  else if (c.formats || c.product_ecosystem) inferredId = '3';
  else if (c.by_format || c.funnel || c.awareness_channels) inferredId = '4';
  else if (c.deep_dive_disposable || c.deep_dive_reusable) inferredId = '5'; 
  else if (c.brand_table || c.brand_landscape) inferredId = '7';
  else if (c.visuals || c.word_cloud_themes) inferredId = '8';

  const normalizedContent = normalizeSectionData(inferredId, data.content, undefined, projectId);
  const isRawParseFailure = normalizedContent.__parseError;

  // Route to sub-renderer
  let ContentComponent = null;

  if (isRawParseFailure) ContentComponent = null;
  else if (normalizedContent.cards) ContentComponent = MenstruationContextRenderer;
  else if (normalizedContent.trigger_clusters) ContentComponent = BehaviouralRenderer;
  else if (normalizedContent.formats || normalizedContent.tradeoff_matrix) ContentComponent = EcosystemRenderer;
  else if (normalizedContent.users || normalizedContent.role_summary) ContentComponent = DeepDiveRenderer;
  else if (normalizedContent.visuals || normalizedContent.word_cloud_themes) ContentComponent = VisualsRenderer;
  
  return (
    <SectionErrorBoundary title={data.title}>
        <div className={`mb-12 border rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-500 ${isSeeded ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-3">
                {data.title}
                {isSeeded && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide">LOW SIGNAL / SEEDED</span>}
            </h3>
            <div className={`w-2.5 h-2.5 rounded-full ${data.status === 'OK' ? 'bg-emerald-500 shadow-emerald-200 shadow-md' : 'bg-blue-400'}`}></div>
        </div>

        {/* Content Body */}
        <div className="p-6">
            {ContentComponent ? (
                <ContentComponent data={normalizedContent} />
            ) : (
                <DataQualityNoticeCard 
                    title={data.title} 
                    data={normalizedContent} 
                    reason="The data for this section could not be rendered in the standard view. It may be incomplete or structured incorrectly."
                />
            )}
        </div>
        </div>
    </SectionErrorBoundary>
  );
};
