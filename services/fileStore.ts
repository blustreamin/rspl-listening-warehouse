
import { ProjectId, ProjectDataBundle, UploadedFile, FileSourceTag } from '../types';

// In-memory store to simulate database persistence
const STORE: Record<ProjectId, ProjectDataBundle> = {
  "disposable-period-panties": { projectId: "disposable-period-panties", files: [] },
  "reusable-period-panties": { projectId: "reusable-period-panties", files: [] },
  "sanitary-pads": { projectId: "sanitary-pads", files: [] },
  "adult-diapers": { projectId: "adult-diapers", files: [] }
};

export const FileStore = {
  getBundle: (projectId: ProjectId): ProjectDataBundle => {
    return STORE[projectId] || { projectId, files: [] };
  },

  addFile: (projectId: ProjectId, file: UploadedFile) => {
    if (!STORE[projectId]) STORE[projectId] = { projectId, files: [] };
    STORE[projectId].files.push(file);
  },

  removeFile: (projectId: ProjectId, fileId: string) => {
    if (!STORE[projectId]) return;
    STORE[projectId].files = STORE[projectId].files.filter(f => f.id !== fileId);
  },

  updateSourceTag: (projectId: ProjectId, fileId: string, tag: FileSourceTag) => {
    if (!STORE[projectId]) return;
    const file = STORE[projectId].files.find(f => f.id === fileId);
    if (file) file.sourceTag = tag;
  },

  recordIngestion: (projectId: ProjectId, runId: string) => {
    if (!STORE[projectId]) return;
    STORE[projectId].lastIngestedAt = new Date().toISOString();
    STORE[projectId].lastRunId = runId;
  }
};
