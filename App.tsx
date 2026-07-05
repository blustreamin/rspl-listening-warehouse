
import React, { useState, useEffect } from 'react';
import { ReportView } from './components/ReportView';
import { DataStudio } from './components/DataStudio';
import { ProviderSelector } from './components/ProviderSelector';
import { persistEvidence, loadEvidence } from './lib/persistence';
import { computeEvidenceHashKey } from './services/pipeline';
import { isRunActive, getRunState } from './lib/runState';
import { ProjectId, EvidenceGraph } from './types';

const App: React.FC = () => {
  const [projectId, setProjectId] = useState<ProjectId>('disposable-period-panties');
  const [view, setView] = useState<'report' | 'data'>('report');

  // FIX: Namespace evidence by project to prevent leakage when switching contexts
  const [evidenceByProject, setEvidenceByProject] = useState<Record<string, EvidenceGraph>>({});

  // RUN-STATE LOCK: switching project remounts ReportView (keyed) and kills the
  // run — confirm first. A confirmed abandon is recorded as partial_failed by
  // the ReportView unmount cleanup, so the half-run is visible in the runs table.
  const confirmAbandonIfRunning = (): boolean => {
    if (!isRunActive()) return true;
    const { done, total } = getRunState();
    return window.confirm(`A synthesis run is in progress (${done}/${total}). Leaving abandons it.`);
  };

  const switchProject = (next: ProjectId) => {
    if (next !== projectId && !confirmAbandonIfRunning()) return;
    setProjectId(next);
    setView('report');
  };

  const handleDataIngested = (data: EvidenceGraph) => {
      // Ensure we store evidence strictly for the target project
      if (data.projectId) {
          setEvidenceByProject(prev => ({
              ...prev,
              [data.projectId!]: data
          }));
          // Persist the computed graph so the report survives a refresh —
          // WITH its hash, so the run-start dedup probe recognises the row
          // instead of persisting the same corpus a second time.
          void computeEvidenceHashKey(data).then((h) =>
            persistEvidence({ ...(data as any), evidenceHash: h })
          );
          // Auto-switch project context if data implies a different project —
          // guarded: it would remount ReportView and abandon a live run.
          if (data.projectId !== projectId) {
              if (!confirmAbandonIfRunning()) { setView('report'); return; }
              setProjectId(data.projectId as ProjectId);
          }
      }
      setView('report');
  };

  // On mount / project switch, if we have no in-session evidence for this project,
  // try to hydrate the last persisted graph from Supabase. Silent no-op offline.
  useEffect(() => {
    let alive = true;
    if (evidenceByProject[projectId]) return; // in-session data wins
    loadEvidence(projectId).then((g) => {
      if (alive && g && g.projectId === projectId) {
        setEvidenceByProject(prev => prev[projectId] ? prev : { ...prev, [projectId]: g });
      }
    });
    return () => { alive = false; };
  }, [projectId]);

  // Select evidence relevant to current project only
  const activeEvidence = evidenceByProject[projectId] || null;

  return (
    <div className="lv-app-root flex h-screen bg-slate-50 overflow-hidden">

      {/* Sidebar Navigation */}
      <div className="lv-no-print w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0 z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
             <div>
                <h1 className="font-bold text-white tracking-wide">RSPL</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Listening Warehouse</p>
             </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-8 overflow-y-auto">
           <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Workspaces</h2>
              <ul className="space-y-1">
                 <li>
                    <button 
                        onClick={() => setView('report')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${view === 'report' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
                    >
                        <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Report View
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => setView('data')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${view === 'data' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
                    >
                        <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        Data Studio
                    </button>
                 </li>
              </ul>
           </div>

           <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Active Projects</h2>
              <ul className="space-y-1">
                 <li>
                    <button 
                        onClick={() => switchProject('disposable-period-panties')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'disposable-period-panties' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Disposable Panties
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => switchProject('reusable-period-panties')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'reusable-period-panties' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Reusable Panties
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => switchProject('sanitary-pads')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'sanitary-pads' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Sanitary Pads
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => switchProject('adult-diapers')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'adult-diapers' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Adult Diapers
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => switchProject('baby-diapers')}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'baby-diapers' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Baby Diapers
                    </button>
                 </li>
              </ul>
           </div>
           
           <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">System Status</h2>
              <div className="px-3 mb-3">
                   <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${activeEvidence ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                       <span className="text-xs">{activeEvidence ? 'Custom Data Active' : 'Mock Evidence Active'}</span>
                   </div>
              </div>
              <ProviderSelector />
           </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="lv-report-scroll flex-1 overflow-y-auto h-full scroll-smooth">
          {/* RUN-STATE LOCK: ReportView stays MOUNTED (hidden) while in Data
              Studio so a live run keeps going — only a project switch (keyed
              remount) or tab close can abandon it, and both are guarded. */}
          <div style={{ display: view === 'report' ? undefined : 'none' }}>
             <ReportView
                key={projectId} // CRITICAL FIX: Force remount on project change to wipe state
                projectId={projectId}
                injectedEvidence={activeEvidence}
                onEvidenceAssembled={(g) => {
                    // Registry rebuild mid-run: adopt the assembled graph so the
                    // panel, hash probes and future sessions all see one corpus.
                    // Persistence is handled by the run itself (persist-at-assembly).
                    if (g.projectId) {
                        setEvidenceByProject(prev => ({ ...prev, [g.projectId!]: g }));
                    }
                }}
             />
          </div>
          {view === 'data' && (
             <DataStudio projectId={projectId} onDataIngested={handleDataIngested} />
          )}
      </main>

    </div>
  );
};

export default App;
