
import React, { useEffect, useState, useRef } from 'react';
import { ProjectId, RunInspectorData, SectionOutput, EvidenceGraph } from '../types';
import { TEMPLATE_REGISTRY } from '../constants/templates';
import { runPipelineForSection } from '../services/pipeline';
import { SectionRenderer } from './SectionRenderer';
import { ModernSectionRenderer } from './report/ModernSectionRenderer';
import { RunInspector } from './RunInspector';
import { ExportBar } from './report/ExportBar';
import { BookletCover, BookletTOC } from './report/blocks/BookletChrome';
import { DataIngestionInfographic, CustomDataBadge } from './report/DataIngestionInfographic';
import { beginRun, completeRun, abandonRun, reportRunProgress } from '../lib/runState';

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
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  
  // FEATURE FLAG: Enable modern renderer for specific projects
  const useModernRenderer = ['disposable-period-panties', 'reusable-period-panties', 'adult-diapers', 'sanitary-pads', 'baby-diapers'].includes(projectId);

  // GUARD: Ensure injected evidence belongs to current project if present
  const validEvidence = (injectedEvidence && injectedEvidence.projectId === projectId) ? injectedEvidence : null;

  // N7 — client-facing browser-tab title for the baby-diapers report.
  useEffect(() => {
    if (projectId !== 'baby-diapers') return;
    const prev = document.title;
    document.title = 'Baby Diaper — Category and Consumer Understanding';
    return () => { document.title = prev; };
  }, [projectId]);

  useEffect(() => {
    let active = true; // ABORT FLAG
    console.debug(`[ReportView] MOUNTING ${projectId}`);

    const loadReport = async () => {
      const template = TEMPLATE_REGISTRY[projectId];
      if (!template) {
          console.error(`No template found for project: ${projectId}`);
          return;
      }

      // Run-state lock: freezes exports, the engine choice, uploads for this
      // project, and guards project switch / tab close until the run resolves.
      beginRun(projectId, template.sections.length);
      
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
      let resolvedCount = 0;
      let failedCount = 0;

      // Execute Section Jobs Sequentially
      try {
      for (const sec of template.sections) {
        if (!active) { console.debug(`[ReportView] ABORT ${projectId}`); break; }

        // Skip Visual Synthesis for femcare projects (redundant)
        if (['disposable-period-panties', 'reusable-period-panties'].includes(projectId) && sec.sectionId === '10') {
            continue;
        }

        // Mark pending
        setInspectorData(prev => ({
          ...prev,
          perSectionStatus: { ...prev.perSectionStatus, [sec.sectionId]: 'PENDING' }
        }));

        // Artificial delay for realism (and to allow race conditions to manifest if unprotected)
        await new Promise(r => setTimeout(r, 500));
        
        if (!active) break; // Check again after await

        try {
            // Run Pipeline
            const result = await runPipelineForSection(
                projectId, 
                sec.sectionId, 
                (update) => {
                    // HARDENED CALLBACK: Check strict isolation
                    if (active) {
                        // Double check: is this update meant for the current project context?
                        if (projectId !== lastProjectIdRef.current) {
                            console.warn("[Synthesis] ISOLATION_VIOLATION: Callback for stale project ignored");
                            return;
                        }
                        setInspectorData(prev => ({ ...prev, ...update }));
                    }
                },
                validEvidence || undefined
            );

            if (!active) break;
            if (projectId !== lastProjectIdRef.current) break; // Extra guard

            localSections.push(result);
            setSections([...localSections]); // Incremental update

            resolvedCount++;
            if (result.status === 'FAILED') failedCount++;
            reportRunProgress(resolvedCount, failedCount);

            // Update Inspector Status
            setInspectorData(prev => ({
              ...prev,
              perSectionStatus: { ...prev.perSectionStatus, [sec.sectionId]: result.status }
            }));

        } catch (err) {
            console.error(`Pipeline failed for ${sec.sectionId}`, err);
            if (active) {
                resolvedCount++;
                failedCount++;
                reportRunProgress(resolvedCount, failedCount);
                setInspectorData(prev => ({
                    ...prev,
                    perSectionStatus: { ...prev.perSectionStatus, [sec.sectionId]: 'FAILED' },
                    retryLog: [...prev.retryLog, `CRITICAL FAIL ${sec.sectionId}: ${err}`]
                }));
            }
        }
      }
      } finally {
        // Natural end → complete (or partial_failed if any section FAILED);
        // an aborted loop → abandoned, recorded as partial_failed so the
        // half-run is visible in the runs table instead of silent.
        if (active) completeRun();
        else abandonRun();
      }
    };

    loadReport();

    return () => {
        active = false; // Cleanup: Cancel the loop
        abandonRun(); // Backstop: an unmount mid-run is an abandoned run
        console.debug(`[ReportView] UNMOUNTING ${projectId}`);
    };
  }, [projectId, validEvidence]);

  return (
    // id anchors the inspector-drawer content shift (booklet.css, ≥1280px)
    <div id="lovingle-page" className="max-w-5xl mx-auto px-6 py-12 pb-32">
      {projectId === 'baby-diapers' && <ExportBar sections={sections} />}
      {/* Baby-diapers leads with the warm exec_summary cover; hide the slate report header. */}
      {projectId !== 'baby-diapers' && <header className="mb-12 lv-no-print">
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
                <button 
                    onClick={() => setShowEvidenceModal(!showEvidenceModal)}
                    className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-xs font-bold border border-indigo-100 flex items-center gap-2 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    CUSTOM DATA LOADED · VIEW EVIDENCE
                </button>
            )}
        </div>
      </header>}

      {/* Evidence Repository & Data Ingestion Analysis */}
      {validEvidence && showEvidenceModal && (
          <div className="mb-6">
              <DataIngestionInfographic evidence={validEvidence} projectId={projectId} />
          </div>
      )}

      {/* N15 — html2pdf capture root: Cover → TOC → sections 00–20 all live
          inside this container so the downloaded PDF captures the full booklet. */}
      <div className="space-y-2" id="lovingle-report-container">
        {projectId === 'baby-diapers' && (
          <>
            <BookletCover />
            <BookletTOC />
          </>
        )}
        {sections
            .filter(section => {
                if (section.projectId && section.projectId !== projectId) {
                    console.warn(`[ReportView] Render blocked for stale section from ${section.projectId}`);
                    return false;
                }
                // Only render sections that exist in the current project's template
                const template = TEMPLATE_REGISTRY[projectId];
                if (template && section.sectionId) {
                    const validIds = template.sections.map(s => s.sectionId);
                    if (!validIds.includes(section.sectionId)) {
                        console.warn(`[ReportView] Section ${section.sectionId} not in ${projectId} template, filtering out`);
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => {
                // Sort by template section order to guarantee correct sequence
                const template = TEMPLATE_REGISTRY[projectId];
                if (!template) return 0;
                const order = template.sections.map(s => s.sectionId);
                const aIdx = order.indexOf(a.sectionId || '');
                const bIdx = order.indexOf(b.sectionId || '');
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            })
            .filter(section => {
                // Remove Visual Synthesis section for femcare projects
                if (['disposable-period-panties', 'reusable-period-panties'].includes(projectId)) {
                    if (section.sectionId === '10' || (section.title && section.title.toLowerCase().includes('visual synthesis'))) {
                        return false;
                    }
                }
                return true;
            })
            .map(section => {
            return useModernRenderer ? (
                <ModernSectionRenderer key={section.title} data={section} projectId={projectId} />
            ) : (
                <SectionRenderer key={section.title} data={section} projectId={projectId} />
            );
        })}
        {(() => {
            const templateSections = TEMPLATE_REGISTRY[projectId]?.sections || [];
            const isFemcare = ['disposable-period-panties', 'reusable-period-panties'].includes(projectId);
            const expectedCount = isFemcare ? templateSections.filter(s => s.sectionId !== '10').length : templateSections.length;
            return sections.length < expectedCount ? (
                 <div className="text-center py-12">
                     <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full mb-4"></div>
                     <p className="text-slate-400 font-mono text-sm">Synthesizing next section...</p>
                 </div>
            ) : null;
        })()}
      </div>

      <div className="lv-no-print">
        <RunInspector data={inspectorData} projectId={projectId} />
      </div>
    </div>
  );
};
