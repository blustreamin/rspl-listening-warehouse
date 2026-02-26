import React, { useState, useEffect } from 'react';
import { UploadedFile, InputMapping, ProjectId, CanonicalFieldMap, FileSourceTag } from '../types';
import { generateAutoMapping, getPreviewRows, CANONICAL_FIELDS } from '../services/mappingService';
import { FileStore } from '../services/fileStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: UploadedFile[];
  projectId: ProjectId;
  onConfirm: (mappings: Record<string, InputMapping>) => void;
}

export const MappingModal: React.FC<Props> = ({ isOpen, onClose, files, projectId, onConfirm }) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, InputMapping>>({});
  
  // Initialize mappings when files change
  useEffect(() => {
    if (files.length > 0) {
        const initialMappings: Record<string, InputMapping> = {};
        files.forEach(f => {
            initialMappings[f.id] = generateAutoMapping(f);
        });
        setMappings(initialMappings);
        if (!selectedFileId) setSelectedFileId(files[0].id);
    }
  }, [files]);

  if (!isOpen) return null;

  const activeFile = files.find(f => f.id === selectedFileId);
  const activeMapping = activeFile && mappings[activeFile.id];
  const previewRows = activeFile && activeMapping ? getPreviewRows(activeFile, activeMapping) : [];

  const handleMappingChange = (key: string, value: string) => {
    if (!activeFile) return;
    setMappings(prev => ({
        ...prev,
        [activeFile.id]: {
            ...prev[activeFile.id],
            fieldMap: {
                ...prev[activeFile.id].fieldMap,
                [key]: value === '__null__' ? undefined : value
            }
        }
    }));
  };
  
  const handleSourceTagChange = (newTag: FileSourceTag) => {
      if (!activeFile) return;
      // Update store
      FileStore.updateSourceTag(projectId, activeFile.id, newTag);
      // Re-run auto mapping with new heuristics
      const updatedFile = { ...activeFile, sourceTag: newTag };
      const newMapping = generateAutoMapping(updatedFile);
      setMappings(prev => ({
          ...prev,
          [activeFile.id]: newMapping
      }));
  };

  const handleConfirm = () => {
    onConfirm(mappings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Map Dataset to Canonical Schema</h2>
                <div className="flex gap-4 text-xs font-mono text-slate-500">
                    <span>PROJECT: {projectId}</span>
                    <span>FILES: {files.length}</span>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                <button 
                    onClick={handleConfirm}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"
                >
                    Confirm & Ingest
                </button>
            </div>
        </div>

        {/* BODY */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* PANE A: INPUT NAVIGATOR */}
            <div className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto p-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Project Bundle</h3>
                <div className="space-y-2">
                    {files.map(file => {
                         const m = mappings[file.id];
                         const isReady = m?.fieldMap?.text;
                         return (
                            <div 
                                key={file.id} 
                                onClick={() => setSelectedFileId(file.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    selectedFileId === file.id 
                                    ? 'bg-white border-indigo-400 shadow-md ring-1 ring-indigo-400' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-medium text-sm text-slate-700 truncate w-32" title={file.name}>{file.name}</div>
                                    <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mb-2">
                                    {file.sourceTag.toUpperCase()} • {file.parsedPreview?.rowCount} Rows
                                </div>
                                <div className="flex gap-1">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {isReady ? 'READY' : 'FIX'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PANE B: MAPPING CONTROLS */}
            <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Field Mapper
                </h3>
                
                {activeFile && activeMapping ? (
                    <div className="space-y-4">
                        {/* Source Tag Selector in Modal */}
                         <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded text-sm">
                            <label className="block text-xs font-bold text-slate-500 mb-1">DATA SOURCE PRESET</label>
                            <select 
                                value={activeFile.sourceTag} 
                                onChange={(e) => handleSourceTagChange(e.target.value as FileSourceTag)}
                                className="w-full border-slate-300 rounded text-sm"
                            >
                                <option value="amazon">Amazon Reviews (Generic)</option>
                                <option value="amazon_apify">Amazon Reviews (Apify XLSX)</option>
                                <option value="flipkart">Flipkart Reviews (Apify XLSX)</option>
                                <option value="flipkart_apify">Flipkart Reviews (Apify Scraper)</option>
                                <option value="instagram_apify">Instagram Posts (Apify)</option>
                                <option value="facebook_apify">Facebook Posts (Apify)</option>
                                <option value="awario">Awario Mentions (CSV)</option>
                                <option value="other">Other / Custom</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">Changing preset re-runs auto-mapping heuristics.</p>
                        </div>

                        {CANONICAL_FIELDS.map(field => (
                            <div key={field.key} className="space-y-1">
                                <label className="flex justify-between text-xs font-medium text-slate-600">
                                    <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                                    <span className="font-mono text-indigo-400">{field.key}</span>
                                </label>
                                <select 
                                    className={`w-full text-sm border rounded px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        field.required && !activeMapping.fieldMap[field.key as keyof CanonicalFieldMap] 
                                        ? 'border-red-300 bg-red-50' 
                                        : 'border-slate-300'
                                    }`}
                                    value={activeMapping.fieldMap[field.key as keyof CanonicalFieldMap] || '__null__'}
                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                >
                                    <option value="__null__" className="text-slate-400">(Not Mapped)</option>
                                    {activeFile.parsedPreview?.columns.map(col => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-400 mt-20">Select a file to map fields</div>
                )}
            </div>

            {/* PANE C: PREVIEW */}
            <div className="flex-1 bg-slate-50 p-6 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Live Canonical Preview
                    </h3>
                    {activeMapping && (
                        <div className="flex gap-3 text-xs">
                             <span className={`px-2 py-1 rounded border ${activeMapping.coverage.text > 0.8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                 Text Coverage: {(activeMapping.coverage.text * 100).toFixed(0)}%
                             </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Text (Preview)</th>
                                <th className="px-4 py-3">Rating</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Brand</th>
                                <th className="px-4 py-3">Platform</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {previewRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-slate-400 font-mono">{row._rowId + 1}</td>
                                    <td className="px-4 py-2 max-w-[300px] truncate" title={row.text}>{row.text || <span className="text-slate-300 italic">null</span>}</td>
                                    <td className="px-4 py-2">{row.rating}</td>
                                    <td className="px-4 py-2 text-slate-500">{row.createdAtISO}</td>
                                    <td className="px-4 py-2 text-slate-600">{row.brand}</td>
                                    <td className="px-4 py-2 text-slate-600">{row.platform || activeMapping?.constants.platform}</td>
                                </tr>
                            ))}
                            {previewRows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        No preview available. Map fields to see data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
