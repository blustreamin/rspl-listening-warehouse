
import React, { useEffect, useState, useRef } from 'react';
import { ProjectId, RunInspectorData, SectionOutput, EvidenceGraph } from '../types';
import { TEMPLATE_REGISTRY } from '../constants/templates';
import { runPipelineForSection } from '../services/pipeline';
import { SectionRenderer } from './SectionRenderer';
import { ModernSectionRenderer } from './report/ModernSectionRenderer';
import { RunInspector } from './RunInspector';
import { DataIngestionInfographic } from './report/DataIngestionInfographic';

interface Props {
  projectId: ProjectId;
  injectedEvidence?: EvidenceGraph | null;
}

export const ReportView: React.FC<Props> = ({ projectId, injectedEvidence }) => {
  // STATE GUARD: Track projectId with ref for synchronous invalidation of stale renders
  const lastProjectIdRef = useRef<ProjectId | null>(null);
  
  // Guard: If we are rendering a new project, immediately update the ref.
  // This allows us to synchronously filter out stale sections in the render pass below.
  if (lastProjectIdRef.current !== projectId) {
      console.debug(`[ReportView] Project switch detected: ${lastProjectIdRef.current} -> ${projectId}. Invalidating previous sections.`);
      lastProjectIdRef.current = projectId;
      // Note: State 'sections' will be cleared by the new component instance mounting (via key in App.tsx),
      // but if the parent ever removes the key, this ref ensures we don't render stale data.
  }

  const [inspectorData, setInspectorData] = useState<RunInspectorData>({
    templateId: '', promptVersion: '', schemaVersion: '', evidenceHash: '',
    perSectionStatus: {}, validatorFailures: [], retryLog: []
  });
  
  const [sections, setSections] = useState<SectionOutput[]>([]);
  
  // FEATURE FLAG: Enable modern renderer for specific projects
  const useModernRenderer = ['disposable-period-panties', 'reusable-period-panties', 'adult-diapers'].includes(projectId);

  // GUARD: Ensure injected evidence belongs to current project if present
  const validEvidence = (injectedEvidence && injectedEvidence.projectId === projectId) ? injectedEvidence : null;

  useEffect(() => {
    let active = true; // ABORT FLAG
    console.debug(`[ReportView] MOUNTING ${projectId}`);

    const loadReport = async () => {
      const template = TEMPLATE_REGISTRY[projectId];
      if (!template) {
          console.error(`No template found for project: ${projectId}`);
          return;
      }
      
      // Reset State Immediately on Mount
      setSections([]);
      setInspectorData({
        templateId: template.templateId,
        promptVersion: template.versionPolicy.version,
        schemaVersion: "v1.0",
        evidenceHash: "Computing...",
        perSectionStatus: {},
        validatorFailures: [],
        retryLog: []
      });

      const localSections: SectionOutput[] = [];
      
      // Execute Section Jobs in PARALLEL BATCHES for speed
      // Batch 1: independent sections that can run simultaneously
      // Batch 2: sections that may benefit from seeing batch 1 context
      const batch1 = template.sections.filter((s: any) => 
        ['incontinence_management', 'awareness_perception', 'brand_landscape'].includes(s.sectionId)
      );
      const batch2 = template.sections.filter((s: any) => 
        ['gap_analysis', 'user_non_user_profiles', 'behavioural_profile'].includes(s.sectionId)
      );
      // Any remaining sections not in batches
      const batch3 = template.sections.filter((s: any) => 
        !batch1.some((b: any) => b.sectionId === s.sectionId) && 
        !batch2.some((b: any) => b.sectionId === s.sectionId)
      );

      const runBatch = async (batch: any[]) => {
        if (!active) return;
        
        // Mark all in batch as pending
        batch.forEach((sec: any) => {
          setInspectorData(prev => ({
            ...prev,
            perSectionStatus: { ...prev.perSectionStatus, [sec.sectionId]: 'PENDING' }
          }));
        });

        const results = await Promise.allSettled(
          batch.map(async (sec: any) => {
            if (!active) throw new Error('ABORT');
            
            const result = await runPipelineForSection(
              projectId,
              sec.sectionId,
              (update) => {
                if (active && projectId === lastProjectIdRef.current) {
                  setInspectorData(prev => ({ ...prev, ...update }));
                }
              },
              validEvidence || undefined
            );
            return { sec, result };
          })
        );

        for (const r of results) {
          if (!active || projectId !== lastProjectIdRef.current) break;
          if (r.status === 'fulfilled') {
            localSections.push(r.value.result);
            setSections([...localSections]);
            setInspectorData(prev => ({
              ...prev,
              perSectionStatus: { ...prev.perSectionStatus, [r.value.sec.sectionId]: r.value.result.status }
            }));
          } else {
            const secId = 'unknown';
            console.error(`Pipeline failed for batch section`, r.reason);
            setInspectorData(prev => ({
              ...prev,
              retryLog: [...prev.retryLog, `BATCH FAIL: ${r.reason}`]
            }));
          }
        }
      };

      // Run batches
      await runBatch(batch1);
      if (active) {
        await new Promise(r => setTimeout(r, 300));
        await runBatch(batch2);
      }
      if (active && batch3.length > 0) {
        await new Promise(r => setTimeout(r, 300));
        await runBatch(batch3);
      }

    };

    loadReport();
    
    return () => {
        active = false; // Cleanup: Cancel the loop
        console.debug(`[ReportView] UNMOUNTING ${projectId}`);
    };
  }, [projectId, validEvidence]); 

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 pb-32">
      <header className="mb-12">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    {TEMPLATE_REGISTRY[projectId]?.templateId.toUpperCase().replace(/_/g, ' ') || "LOADING..."}
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-500 font-mono">
                    <span>PROJECT: {projectId}</span>
                    <span>|</span>
                    <span>VERSION: {TEMPLATE_REGISTRY[projectId]?.versionPolicy.version}</span>
                    <span>|</span>
                    <span className={TEMPLATE_REGISTRY[projectId]?.versionPolicy.locked ? "text-emerald-600 flex items-center gap-1" : "text-red-500"}>
                        {TEMPLATE_REGISTRY[projectId]?.versionPolicy.locked && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        )}
                        LOCKED
                    </span>
                    {useModernRenderer && (
                        <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded ml-2">MODERN UI</span>
                    )}
                </div>
            </div>
            {validEvidence && (
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-xs font-bold border border-indigo-100 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    CUSTOM DATA LOADED
                </div>
            )}
        </div>
      </header>

      {/* Data Ingestion Infographic */}
      {validEvidence && (
        <DataIngestionInfographic evidence={validEvidence} projectId={projectId} />
      )}

      <div className="space-y-2">
        {sections.map(section => {
            // STRICT RENDER GUARD: Do not render section if it belongs to a different project
            // This catches race conditions where state might not have been cleared yet
            if (section.projectId && section.projectId !== projectId) {
                console.warn(`[ReportView] Render blocked for stale section from ${section.projectId}`);
                return null;
            }

            return useModernRenderer ? (
                <ModernSectionRenderer key={section.title} data={section} projectId={projectId} />
            ) : (
                <SectionRenderer key={section.title} data={section} projectId={projectId} />
            );
        })}
        {sections.length < (TEMPLATE_REGISTRY[projectId]?.sections.length || 0) && (
             <div className="text-center py-12">
                 <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full mb-4"></div>
                 <p className="text-slate-400 font-mono text-sm">Synthesizing next section...</p>
             </div>
        )}
      </div>

      <RunInspector data={inspectorData} projectId={projectId} />
    </div>
  );
};
