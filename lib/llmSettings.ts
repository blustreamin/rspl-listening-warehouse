import { useSyncExternalStore } from "react";
import { apiGet } from "./api";

export type ProviderId = "gemini" | "anthropic" | "openai";

export interface ProviderStatus {
  providers: Record<ProviderId, boolean>;
  default: ProviderId | null;
  any: boolean;
  persistence: boolean;
}

const DEFAULT_STATUS: ProviderStatus = {
  providers: { gemini: false, anthropic: false, openai: false },
  default: null,
  any: false,
  persistence: false,
};

let _status: ProviderStatus = DEFAULT_STATUS;
let _active: ProviderId = "gemini";
let _loaded = false;
// A user's explicit engine choice must survive the async status load — the
// server default only applies while the session is unpinned.
let _userPinned = false;

// Engine flips must be observable: the run bar re-probes the cache for the
// newly selected provider (reads only — a flip never starts synthesis).
const _listeners = new Set<() => void>();
function notifyProviderChange(): void {
  for (const l of _listeners) {
    try { l(); } catch { /* a bad listener must not break settings */ }
  }
}

export function getProvider(): ProviderId {
  return _active;
}

export function setProvider(p: ProviderId): void {
  _userPinned = true;
  if (_active === p) return;
  _active = p;
  notifyProviderChange();
}

/** Subscribe to active-provider changes; returns an unsubscribe fn. */
export function subscribeProvider(fn: () => void): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/** React hook — live active provider id. */
export function useProviderId(): ProviderId {
  return useSyncExternalStore(subscribeProvider, getProvider, getProvider);
}

export function getStatus(): ProviderStatus {
  return _status;
}

export function isLoaded(): boolean {
  return _loaded;
}

/** Fetch which providers are configured server-side; pick a sensible default. */
export async function loadProviderStatus(): Promise<ProviderStatus> {
  try {
    const r = await apiGet("/api/providers");
    _status = {
      providers: r.providers || DEFAULT_STATUS.providers,
      default: r.default ?? null,
      any: !!r.any,
      persistence: !!r.persistence,
    };
    // Default the active provider to the server default (or first configured),
    // unless the user already picked an engine this session.
    const before = _active;
    if (!_userPinned) {
      if (_status.default) {
        _active = _status.default;
      } else {
        const firstOn = (Object.keys(_status.providers) as ProviderId[]).find((k) => _status.providers[k]);
        if (firstOn) _active = firstOn;
      }
    }
    if (_active !== before) notifyProviderChange();
    _loaded = true;
  } catch {
    // A transient /api/providers failure must not latch the session into seed
    // mode — leave _loaded false and drop the memoised promise so the next
    // ensureProviderStatus() retries the fetch.
    _status = DEFAULT_STATUS;
    _loadPromise = null;
  }
  return _status;
}

let _loadPromise: Promise<ProviderStatus> | null = null;

/** Await the server-side provider status exactly once (idempotent). */
export function ensureProviderStatus(): Promise<ProviderStatus> {
  if (_loaded) return Promise.resolve(_status);
  if (!_loadPromise) _loadPromise = loadProviderStatus();
  return _loadPromise;
}
