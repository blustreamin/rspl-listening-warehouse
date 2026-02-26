
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ingestRawData } from '../services/gemini';
import { EvidenceGraph, ProjectId, UploadedFile, FileSourceTag, InputMapping, IngestRequestV1 } from '../types';
import { FileStore } from '../services/fileStore';
import { parseFile } from '../services/fileParsing';
import { MappingModal } from './MappingModal';

interface Props {
  projectId: ProjectId;
  onDataIngested: (data: EvidenceGraph) => void;
}

// Helper to create stable identity for deduplication
const getFileIdentity = (f: { name: string; size: number; lastModified?: number }) => 
  `${f.name}_${f.size}_${f.lastModified || 'unknown'}`;

export const DataStudio: React.FC<Props> = ({ projectId, onDataIngested }) => {
  const [manualText, setManualText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Mapping State
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappings, setMappings] = useState<Record<string, InputMapping>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project bundle on mount or project change
  useEffect(() => {
    const bundle = FileStore.getBundle(projectId);
    // Explicitly clone to avoid ref issues
    setFiles([...(bundle.files || [])]);
    setManualText('');
    setSuccess(false);
    setError(null);
    setMappings({}); // Reset mappings on project change
  }, [projectId]);

  // Derived state for uniqueness
  const uniqueFiles = useMemo(() => {
     return files; // Files are now guaranteed unique by handleFileUpload
  }, [files]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    // FETCH LATEST FROM STORE (Source of Truth)
    const currentBundle = FileStore.getBundle(projectId);
    const existingKeys = new Set(currentBundle.files.map(getFileIdentity));
    const newFiles: UploadedFile[] = [];

    try {
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const key = getFileIdentity({
                name: file.name,
                size: file.size,
                lastModified: file.lastModified
            });

            if (existingKeys.has(key)) {
                console.warn(`Skipping duplicate file: ${file.name}`);
                continue;
            }
            
            // Mark as seen for this batch
            existingKeys.add(key);

            const uploaded = await parseFile(file);
            newFiles.push(uploaded);
            FileStore.addFile(projectId, uploaded);
        }

        if (newFiles.length > 0) {
            // Re-sync local state with store
            setFiles([...FileStore.getBundle(projectId).files]);
            setShowMappingModal(true);
        }
    } catch (err) {
        setError("Failed to parse file. Ensure valid CSV/Excel format.");
        console.error(err);
    } finally {
        setIsUploading(false);
        // Reset input to allow selecting same file again if user deletes it and re-uploads
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
      FileStore.removeFile(projectId, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      const newMappings = { ...mappings };
      delete newMappings[fileId];
      setMappings(newMappings);
  };

  const handleSourceTagChange = (fileId: string, tag: FileSourceTag) => {
      FileStore.updateSourceTag(projectId, fileId, tag);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, sourceTag: tag } : f));
  };

  const handleConfirmMappings = (newMappings: Record<string, InputMapping>) => {
      setMappings(newMappings);
  };

  const handleIngest = async () => {
    if (!manualText.trim() && uniqueFiles.length === 0) {
        setError("No data provided. Please upload files or paste text.");
        return;
    }

    // Validate if mappings are ready for all unique files
    const missingMappings = uniqueFiles.filter(f => !mappings[f.id]);
    if (missingMappings.length > 0) {
        setShowMappingModal(true);
        return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      // Construct IngestRequestV1 using uniqueFiles
      const requestPayload: IngestRequestV1 = {
          schemaVersion: "ingest_request_v1",
          orgId: "rspl_org_default",
          projectId: projectId,
          runMeta: {
              trigger: "ui_upload",
              requestedAtISO: new Date().toISOString()
          },
          inputs: uniqueFiles.map(f => ({
              inputId: f.id,
              sourceTag: f.sourceTag,
              fileMeta: {
                  fileId: f.id,
                  fileName: f.name,
                  rowCount: f.parsedPreview?.rowCount || 0
              },
              mapping: {
                  canonicalFieldMap: mappings[f.id].fieldMap,
                  constants: mappings[f.id].constants as any
              },
              // Process ALL rows - no limit for full coverage
              rows: f.rawContent.map((row, i) => ({
                  rowId: `r_${i}`,
                  raw: row
              }))
          }))
      };

      // 2. Send to Gemini Ingestion Engine
      const result = await ingestRawData(requestPayload);
      
      if (result) {
        FileStore.recordIngestion(projectId, "run_" + Date.now());
        onDataIngested(result);
        setSuccess(true);
      } else {
        setError("Failed to generate evidence graph. Check API Key or Input.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error during ingestion");
    } finally {
      setIsProcessing(false);
    }
  };

  const allFilesMapped = uniqueFiles.length > 0 && uniqueFiles.every(f => mappings[f.id]?.status === 'ready');

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <MappingModal 
          isOpen={showMappingModal} 
          onClose={() => setShowMappingModal(false)}
          files={uniqueFiles}
          projectId={projectId}
          onConfirm={handleConfirmMappings}
      />

      <header className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                DATA STUDIO
            </h1>
            <p className="text-slate-500 font-mono text-sm">
                Project: <span className="text-indigo-600 font-bold">{projectId.toUpperCase().replace(/-/g, ' ')}</span>
            </p>
        </div>
        <div className="text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">BUNDLE STATUS</div>
            <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-mono text-slate-600">{uniqueFiles.length} Files</span>
                <span className="text-slate-300">|</span>
                <span className={`text-sm font-bold ${success ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {success ? 'INGESTED' : 'DRAFT'}
                </span>
            </div>
        </div>
      </header>

      {/* ERROR / SUCCESS ALERTS */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
                <span className="font-bold block mb-1">Ingestion Failed</span>
                {error}
            </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
                <span className="font-bold block mb-1">Ingestion Successful</span>
                Evidence Graph generated. Return to Report View to see insights.
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COL: UPLOAD & FILES */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* UPLOAD ZONE */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        Project Data Bundle
                    </h3>
                    <button 
                        onClick={() => setShowMappingModal(true)}
                        className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${uniqueFiles.length > 0 ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        disabled={uniqueFiles.length === 0}
                    >
                        Map & Validate
                    </button>
                </div>
                <div className="p-6">
                    <div 
                        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            multiple 
                            accept=".csv,.xls,.xlsx" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        {isUploading ? (
                            <div className="text-slate-500">Parsing files...</div>
                        ) : (
                            <>
                                <div className="text-indigo-600 font-medium mb-1">Click to Upload Files</div>
                                <div className="text-xs text-slate-400">CSV, XLS, XLSX supported</div>
                            </>
                        )}
                    </div>

                    {/* FILE LIST */}
                    {uniqueFiles.length > 0 && (
                        <div className="mt-6 space-y-3">
                            {uniqueFiles.map(file => {
                                const isMapped = !!mappings[file.id];
                                return (
                                <div key={file.id} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200 text-sm">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`p-2 rounded border text-xs font-bold uppercase w-12 text-center ${isMapped ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                                            {file.name.split('.').pop()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-slate-700 truncate max-w-[200px]" title={file.name}>{file.name}</div>
                                            <div className="text-xs text-slate-400">
                                                {(file.size / 1024).toFixed(1)} KB • {file.parsedPreview?.rowCount} Rows
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select 
                                            value={file.sourceTag} 
                                            onChange={(e) => handleSourceTagChange(file.id, e.target.value as FileSourceTag)}
                                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="other">Other</option>
                                            <option value="awario">Awario (Social)</option>
                                            <option value="amazon">Amazon</option>
                                            <option value="flipkart">Flipkart</option>
                                        </select>
                                        <button 
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="text-slate-400 hover:text-red-500"
                                            title="Remove File"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
              </div>

              {/* MANUAL INPUT */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Legacy Input (Paste Text)
                    </h3>
                 </div>
                 <div className="p-4">
                    <textarea 
                        className="w-full h-32 p-3 font-mono text-xs bg-slate-50 text-slate-600 rounded border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                        placeholder="Paste raw CSV rows or review text here..."
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                    />
                 </div>
              </div>

          </div>

          {/* RIGHT COL: ACTIONS */}
          <div className="space-y-6">
              <div className="bg-slate-850 text-white rounded-xl p-6 shadow-lg">
                  <h3 className="font-bold text-lg mb-2">Ingestion Engine</h3>
                  <p className="text-slate-400 text-xs mb-6">
                      This will normalize all inputs into a canonical <code>EvidenceGraphV1</code> structure using Gemini 3 Pro.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Target Project</span>
                          <span className="font-mono text-indigo-300 truncate max-w-[150px]">{projectId}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Inputs</span>
                          <span className="font-mono">{uniqueFiles.length} Files + {manualText ? 'Text' : '0 Text'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Mapping Status</span>
                          <span className={`font-mono font-bold ${allFilesMapped ? 'text-emerald-400' : 'text-yellow-400'}`}>
                              {allFilesMapped ? 'READY' : 'PENDING'}
                          </span>
                      </div>
                  </div>

                  <button 
                    onClick={handleIngest}
                    disabled={isProcessing || (uniqueFiles.length === 0 && !manualText)}
                    className={`w-full py-3 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2
                        ${isProcessing || (uniqueFiles.length === 0 && !manualText)
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25'}
                    `}
                  >
                     {isProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Confirm & Ingest
                        </>
                    )}
                  </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-700 text-sm mb-2">Column Auto-Detect</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                    The engine automatically identifies canonical columns (Review Body, Rating, Date, Author) from your CSV/Excel headers.
                </p>
            </div>
          </div>

      </div>
    </div>
  );
};
