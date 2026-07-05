// ============================================================================
//  RUN STATE — the client run-state machine around the synthesis loop.
//
//      idle → running → complete | partial_failed
//
//  ReportView owns the loop and drives the transitions; everything that must
//  freeze while a run is live subscribes here: export actions (ExportBar),
//  the engine choice (ProviderSelector), Data Studio uploads for the active
//  project, project switching and tab close (App / window guards). One run at
//  a time — no racing writes, no half-Gemini-half-Claude reports, no exports
//  of a half-generated artifact.
//
//  Terminal transitions post a record to /api/runs so half-runs are VISIBLE
//  in the runs table instead of silent (an abandoned run is recorded as
//  status "partial_failed" — the Gemini orphan would have been caught by
//  this). Tab close uses sendBeacon so the record survives page teardown.
// ============================================================================

import { useSyncExternalStore } from "react";
import { getProvider } from "./llmSettings";
import { API_BASE } from "./api";

export type RunPhase = "idle" | "running" | "complete" | "partial_failed";

export interface RunSnapshot {
  phase: RunPhase;
  projectId: string | null;
  /** sections resolved so far (any terminal status) */
  done: number;
  /** registry size for the running project */
  total: number;
  /** sections that resolved FAILED */
  failed: number;
  /** sections that resolved PENDING (awaiting stubs — not ok, not failed) */
  pending: number;
  /** 40-char evidence hash key the run executes against (freshness anchor) */
  evidenceHash: string | null;
  /** engine the run actually executes on ('seed' when unconfigured) */
  provider: string | null;
}

type Listener = () => void;

let _snap: RunSnapshot = { phase: "idle", projectId: null, done: 0, total: 0, failed: 0, pending: 0, evidenceHash: null, provider: null };
const _listeners = new Set<Listener>();

function set(next: Partial<RunSnapshot>): void {
  _snap = { ..._snap, ...next };
  for (const l of _listeners) {
    try { l(); } catch { /* a bad listener must not break the run */ }
  }
}

// ── run-record persistence (the runs table) ──────────────────────────────────

function postRunRecord(status: "done" | "partial_failed", viaBeacon = false): void {
  // A 0-progress abandon is dev-remount noise (StrictMode) or an instant
  // project bounce — not a run worth recording.
  if (status === "partial_failed" && _snap.done === 0) return;
  const payload = {
    project_id: _snap.projectId,
    // The run's OWN engine ('seed' when unconfigured) — getProvider() would
    // misattribute seed runs to the default engine and poison the freshness probe.
    provider: _snap.provider ?? getProvider(),
    evidence_hash: _snap.evidenceHash,
    sections_total: _snap.total,
    // PENDING stubs are neither ok nor failed — they await generation.
    sections_ok: Math.max(0, _snap.done - _snap.failed - _snap.pending),
    status,
    finished_at: new Date().toISOString(),
  };
  try {
    if (viaBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        `${API_BASE}/api/runs`,
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
    } else {
      void fetch(`${API_BASE}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* no backend -> unrecorded */ });
    }
  } catch { /* recording must never break the app */ }
}

// ── transitions ──────────────────────────────────────────────────────────────

/** Start a run. Idempotent for the same project. */
export function beginRun(projectId: string, total = 0, evidenceHash?: string, provider?: string): void {
  if (_snap.phase === "running" && _snap.projectId === projectId) return;
  set({
    phase: "running", projectId, done: 0, total, failed: 0, pending: 0,
    evidenceHash: evidenceHash ?? null, provider: provider ?? null,
  });
}

/** Registry assembly resolves the true corpus hash only AFTER beginRun has
 *  engaged the lock — update the snapshot so the run record carries the real
 *  hash instead of the pre-assembly (mock) one. */
export function setRunEvidenceHash(hash: string): void {
  if (_snap.phase !== "running") return;
  set({ evidenceHash: hash });
}

/** Live progress from the synthesis loop. */
export function reportRunProgress(done: number, failed: number, total?: number, pending?: number): void {
  if (_snap.phase !== "running") return;
  set({
    done, failed,
    ...(typeof total === "number" ? { total } : {}),
    ...(typeof pending === "number" ? { pending } : {}),
  });
}

/** The loop ran to its natural end. */
export function completeRun(): void {
  if (_snap.phase !== "running") return;
  const status = _snap.failed > 0 ? "partial_failed" : "done";
  set({ phase: _snap.failed > 0 ? "partial_failed" : "complete" });
  postRunRecord(status);
}

/** The run was abandoned mid-flight (project switch, unmount, tab close). */
export function abandonRun(viaBeacon = false): void {
  if (_snap.phase !== "running") return;
  postRunRecord("partial_failed", viaBeacon);
  set({ phase: "partial_failed" });
}

/** Legacy alias — releases the lock without recording (used as a backstop). */
export function endRun(): void {
  abandonRun();
}

// ── reads ────────────────────────────────────────────────────────────────────

/** Is a generation run currently in progress? (The lock predicate.) */
export function isRunActive(): boolean {
  return _snap.phase === "running";
}

/** Which project is mid-run, if any. */
export function activeRunProject(): string | null {
  return _snap.phase === "running" ? _snap.projectId : null;
}

export function getRunState(): RunSnapshot {
  return _snap;
}

/** Subscribe to run-state changes; returns an unsubscribe fn. */
export function subscribeRunState(fn: Listener): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/** React hook — live snapshot of the run state. */
export function useRunState(): RunSnapshot {
  return useSyncExternalStore(subscribeRunState, getRunState, getRunState);
}

// ── window guards: tab close while running ───────────────────────────────────
// beforeunload surfaces the browser's leave-confirmation; if the user leaves
// anyway, pagehide beacons the partial_failed record before teardown.

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (_snap.phase !== "running") return;
    e.preventDefault();
    e.returnValue = `A synthesis run is in progress (${_snap.done}/${_snap.total}). Leaving abandons it.`;
  });
  window.addEventListener("pagehide", () => {
    if (_snap.phase === "running") abandonRun(true);
  });
}
