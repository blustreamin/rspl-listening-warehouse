
import React, { useState } from 'react';
import { ReportView } from './components/ReportView';
import { DataStudio } from './components/DataStudio';
import { ProjectId, EvidenceGraph } from './types';

const App: React.FC = () => {
  const [projectId, setProjectId] = useState<ProjectId>('disposable-period-panties');
  const [view, setView] = useState<'report' | 'data'>('report');
  
  // FIX: Namespace evidence by project to prevent leakage when switching contexts
  const [evidenceByProject, setEvidenceByProject] = useState<Record<string, EvidenceGraph>>({});

  const handleDataIngested = (data: EvidenceGraph) => {
      // Ensure we store evidence strictly for the target project
      if (data.projectId) {
          setEvidenceByProject(prev => ({
              ...prev,
              [data.projectId!]: data
          }));
          // Auto-switch project context if data implies a different project (optional safety)
          if (data.projectId !== projectId) {
              setProjectId(data.projectId as ProjectId);
          }
      }
      setView('report'); 
  };

  // Select evidence relevant to current project only
  const activeEvidence = evidenceByProject[projectId] || null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0 z-20">
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
                        onClick={() => { setProjectId('disposable-period-panties'); setView('report'); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'disposable-period-panties' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Disposable Panties
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => { setProjectId('reusable-period-panties'); setView('report'); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'reusable-period-panties' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Reusable Panties
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => { setProjectId('sanitary-pads'); setView('report'); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'sanitary-pads' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Sanitary Pads
                    </button>
                 </li>
                 <li>
                    <button 
                        onClick={() => { setProjectId('adult-diapers'); setView('report'); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${projectId === 'adult-diapers' ? 'text-indigo-300 font-medium' : 'hover:bg-slate-800'}`}
                    >
                        Adult Diapers
                    </button>
                 </li>
              </ul>
           </div>
           
           <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">System Status</h2>
              <div className="px-3">
                   <div className="flex items-center gap-2 mb-2">
                       <div className={`w-2 h-2 rounded-full ${activeEvidence ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                       <span className="text-xs">{activeEvidence ? 'Custom Data Active' : 'Mock Evidence Active'}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                       <span className="text-xs">Gemini 3 Pro: Ready</span>
                   </div>
              </div>
           </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full scroll-smooth">
          {view === 'report' ? (
             <ReportView 
                key={projectId} // CRITICAL FIX: Force remount on project change to wipe state
                projectId={projectId} 
                injectedEvidence={activeEvidence} 
             />
          ) : (
             <DataStudio projectId={projectId} onDataIngested={handleDataIngested} />
          )}
      </main>

    </div>
  );
};

export default App;
