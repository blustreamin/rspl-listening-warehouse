
import { ProjectId, ProjectDataBundle, UploadedFile, FileSourceTag } from '../types';
import { persistDataset, deleteDataset } from '../lib/persistence';

// In-memory store with write-through persistence to the API tier. Sync reads stay
// instant (UI never blocks); persistence is fire-and-forget and silent offline.
const STORE: Record<ProjectId, ProjectDataBundle> = {
  "disposable-period-panties": { projectId: "disposable-period-panties", files: [] },
  "reusable-period-panties": { projectId: "reusable-period-panties", files: [] },
  "sanitary-pads": { projectId: "sanitary-pads", files: [] },
  "adult-diapers": { projectId: "adult-diapers", files: [] },
  "baby-diapers": { projectId: "baby-diapers", files: [] }
};

// Maps our local file id -> the persisted dataset id (for deletes).
const REMOTE_IDS: Record<string, string> = {};

export const FileStore = {
  getBundle: (projectId: ProjectId): ProjectDataBundle => {
    return STORE[projectId] || { projectId, files: [] };
  },

  addFile: (projectId: ProjectId, file: UploadedFile) => {
    if (!STORE[projectId]) STORE[projectId] = { projectId, files: [] };
    STORE[projectId].files.push(file);

    // Write-through: rows -> Storage, metadata -> datasets table.
    void persistDataset({
      projectId,
      name: file.name,
      sourceTag: file.sourceTag,
      columns: file.parsedPreview?.columns || [],
      rows: Array.isArray(file.rawContent) ? file.rawContent : [],
    }).then((id) => { if (id) REMOTE_IDS[file.id] = id; });
  },

  removeFile: (projectId: ProjectId, fileId: string) => {
    if (!STORE[projectId]) return;
    STORE[projectId].files = STORE[projectId].files.filter(f => f.id !== fileId);
    const remote = REMOTE_IDS[fileId];
    if (remote) { void deleteDataset(remote); delete REMOTE_IDS[fileId]; }
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
