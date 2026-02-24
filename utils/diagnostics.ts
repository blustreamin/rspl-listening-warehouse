
import { ProjectId } from '../types';

interface TraceEvent {
    stage: string;
    payloadSummary: any;
    timestamp: number;
}

interface TraceSession {
    runId: string;
    projectId: ProjectId;
    sectionId: string;
    events: TraceEvent[];
}

const GLOBAL_TRACE: Record<string, TraceSession> = {};

export const DiagnosticTrace = {
    start: (runId: string, projectId: ProjectId, sectionId: string) => {
        const key = `${projectId}:${sectionId}`;
        GLOBAL_TRACE[key] = {
            runId,
            projectId,
            sectionId,
            events: []
        };
        console.groupCollapsed(`[Trace][${projectId}] S${sectionId} Started`);
    },

    mark: (projectId: ProjectId, sectionId: string, stage: string, payload?: any) => {
        const key = `${projectId}:${sectionId}`;
        const session = GLOBAL_TRACE[key];
        if (!session) return;

        // Redact large payloads for summary
        let summary = payload;
        if (payload && typeof payload === 'object') {
            summary = Array.isArray(payload) 
                ? `Array[${payload.length}]` 
                : Object.keys(payload);
        }
        if (typeof payload === 'string' && payload.length > 100) {
            summary = payload.substring(0, 100) + '...';
        }

        const event = { stage, payloadSummary: summary, timestamp: Date.now() };
        session.events.push(event);
        console.debug(`[Trace][${stage}]`, summary);
    },

    end: (projectId: ProjectId, sectionId: string, status: string) => {
        console.log(`[Trace][${projectId}] S${sectionId} Finished: ${status}`);
        console.groupEnd();
    },

    getLog: (projectId: ProjectId, sectionId: string): string[] => {
        const key = `${projectId}:${sectionId}`;
        return GLOBAL_TRACE[key]?.events.map(e => `[${e.stage}] ${JSON.stringify(e.payloadSummary)}`) || [];
    }
};
