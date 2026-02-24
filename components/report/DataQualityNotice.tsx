
import React, { useState } from 'react';

interface Props {
  title: string;
  reason?: string;
  data: any;
  onRetry?: () => void;
}

export const DataQualityNoticeCard: React.FC<Props> = ({ title, reason, data, onRetry }) => {
  const [showData, setShowData] = useState(false);

  return (
    <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm my-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-600 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate" title={title}>{title} - Data Notice</h4>
          <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
            {reason || "The data for this section could not be rendered in the standard view. It may be incomplete or structured incorrectly."}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowData(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              View Data Payload
            </button>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Retry Generation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Inspector Modal */}
      {showData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                Raw Data Inspector
              </h3>
              <button 
                onClick={() => setShowData(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0 bg-slate-900">
              <pre className="text-[11px] font-mono text-emerald-400 p-4 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                onClick={() => setShowData(false)}
                className="text-xs text-slate-500 font-bold hover:text-slate-700 px-3 py-1.5"
              >
                Close
              </button>
              <button 
                onClick={() => { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); }}
                className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded font-bold transition-colors"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
