// ============================================================================
//  RUN STATE — a tiny shared signal for "a generation run is in progress".
//
//  ReportView owns the run loop but the ProviderSelector (sidebar) needs to know
//  when a run is active so it can lock the engine choice. A module-level store
//  with a subscribe/notify pattern keeps them in sync without prop-drilling or a
//  context provider, and survives the ReportView remount-on-project-switch.
//
//  Switching providers mid-run would mean a single report is half Gemini, half
//  Claude — incoherent and unauditable. So the engine is frozen for the whole
//  run, start to finish (or abort).
// ============================================================================

type Listener = () => void;

let _running = false;
let _projectId: string | null = null;
const _listeners = new Set<Listener>();

function notify(): void {
  for (const l of _listeners) {
    try { l(); } catch { /* a bad listener must not break the run */ }
  }
}

/** Mark a run as started for a given project. Idempotent. */
export function beginRun(projectId: string): void {
  if (_running && _projectId === projectId) return;
  _running = true;
  _projectId = projectId;
  notify();
}

/** Mark the current run as finished or aborted. Idempotent. */
export function endRun(): void {
  if (!_running) return;
  _running = false;
  _projectId = null;
  notify();
}

/** Is a generation run currently in progress? */
export function isRunActive(): boolean {
  return _running;
}

/** Which project is mid-run, if any. */
export function activeRunProject(): string | null {
  return _projectId;
}

/** Subscribe to run-state changes; returns an unsubscribe fn. */
export function subscribeRunState(fn: Listener): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}
