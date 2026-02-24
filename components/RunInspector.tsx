
import React from 'react';
import { RunInspectorData, ProjectId } from '../types';

interface Props {
  data: RunInspectorData;
  projectId?: ProjectId; // Added ProjectId support
}

export const RunInspector: React.FC<Props> = ({ data, projectId }) => {
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-slate-850 text-white rounded-lg shadow-2xl border border-slate-700 overflow-hidden text-xs font-mono z-50">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <span className="font-bold text-emerald-400">RUN INSPECTOR</span>
        <span className="text-slate-500">Live</span>
      </div>
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        
        {/* Identity & Hash */}
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
             <div className="text-slate-500 mb-1">PROJECT SCOPE</div>
             <div className="text-indigo-300 bg-slate-800 p-1 rounded font-bold truncate">{projectId || "Unknown"}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">TEMPLATE ID</div>
            <div className="text-white bg-slate-800 p-1 rounded truncate" title={data.templateId}>{data.templateId || "..."}</div>
          </div>
          <div>
             <div className="text-slate-500 mb-1">EVIDENCE HASH</div>
             <div className="text-orange-300 bg-slate-800 p-1 rounded truncate">{data.evidenceHash || "Computing..."}</div>
          </div>
        </div>

        {/* Section Status */}
        <div>
          <div className="text-slate-500 mb-1">SECTION JOBS</div>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(data.perSectionStatus).map(([id, status]) => (
              <div key={id} className={`
                text-center p-1 rounded text-[10px] font-bold truncate
                ${status === 'OK' ? 'bg-emerald-900 text-emerald-300' : 
                  status === 'PARTIAL' ? 'bg-yellow-900 text-yellow-300' :
                  status === 'SEEDED' ? 'bg-blue-900 text-blue-300' :
                  status === 'FAILED' ? 'bg-red-900 text-red-300' : 'bg-slate-800 text-slate-500'}
              `}>
                S{id.substring(0, 4)}
              </div>
            ))}
          </div>
        </div>

        {/* Logs */}
        {data.retryLog.length > 0 && (
          <div>
            <div className="text-slate-500 mb-1">REPAIR LOG</div>
            <div className="bg-black/50 p-2 rounded text-red-300 space-y-1">
              {data.retryLog.map((log, i) => (
                <div key={i}>&gt; {log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-700">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> OK</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> SEEDED</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> PARTIAL</span>
        </div>

      </div>
    </div>
  );
};
