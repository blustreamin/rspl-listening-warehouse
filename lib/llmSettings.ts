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

export function getProvider(): ProviderId {
  return _active;
}

export function setProvider(p: ProviderId): void {
  _active = p;
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
    // Default the active provider to the server default (or first configured).
    if (_status.default) {
      _active = _status.default;
    } else {
      const firstOn = (Object.keys(_status.providers) as ProviderId[]).find((k) => _status.providers[k]);
      if (firstOn) _active = firstOn;
    }
  } catch {
    _status = DEFAULT_STATUS;
  }
  _loaded = true;
  return _status;
}
