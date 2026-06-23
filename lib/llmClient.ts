import { apiPost } from "./api";
import { getProvider } from "./llmSettings";

export interface CallLLMArgs {
  system?: string;
  prompt: string;
  jsonMode?: boolean;
  maxTokens?: number;
  model?: string;
  provider?: string;                 // defaults to the active provider
  gemini?: { grounding?: boolean; thinkingBudget?: number };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Global egress mutex (strict concurrency cap = 1) ────────────────────────
// /api/llm is the single LLM egress point. A generation run loops ~25 sections;
// if those calls ever overlap, the provider rejects the burst and returns 502 →
// every failed section silently falls back to seed. To make a burst impossible
// regardless of how callers dispatch, ALL calls funnel through one promise
// chain and execute strictly one at a time, in invocation order. (Only raise
// this cap after a full 25/25 run is proven stable.)
let egressChain: Promise<void> = Promise.resolve();
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = egressChain.then(fn, fn); // run after the prior call settles (ok or error)
  egressChain = result.then(() => {}, () => {}); // advance the chain regardless of outcome
  return result;
}

// ── Retry with exponential backoff on transient provider errors ─────────────
// /api/llm returns:
//   200 { ok:true, text }                              → success
//   200 { ok:false, available:false }                  → no provider key → seed (permanent; no retry)
//   502 { ok:false, available:true, reason:provider_error } → transient → retry
// A network failure (fetch throws) is treated as transient too. We retry up to
// MAX_RETRIES with 1s / 2s / 4s backoff before giving up (→ caller seeds).
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

async function postWithRetry(payload: Record<string, unknown>): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let r: any;
    try {
      r = await apiPost("/api/llm", payload);
    } catch {
      r = null; // network/transport error → transient
    }

    if (r && r.ok === true && typeof r.text === "string") return r.text;

    // Permanent: no provider configured anywhere. Seed immediately — retrying
    // would only add latency to every seed render (e.g. local dev with no key).
    if (r && r.available === false) return null;

    // Transient (provider_error / network / malformed): back off and retry.
    if (attempt < MAX_RETRIES) {
      const reason = r?.reason || "network_error";
      const status = r?.status != null ? ` status=${r.status}` : "";
      console.warn(`[llmClient] /api/llm ${reason}${status} — retry ${attempt + 1}/${MAX_RETRIES} in ${BACKOFF_MS[attempt]}ms`);
      await delay(BACKOFF_MS[attempt]);
      continue;
    }

    console.error(`[llmClient] /api/llm failed after ${MAX_RETRIES} retries (${r?.reason || "network_error"}) — falling back to seed`);
    return null;
  }
  return null;
}

// Returns the raw model text, or null when no provider is configured / the call
// failed after retries — callers treat null exactly like the old "no API key"
// path and fall back to seed data, so the app always renders.
export async function callLLM(args: CallLLMArgs): Promise<string | null> {
  const provider = args.provider || getProvider();
  return runExclusive(() =>
    postWithRetry({
      provider,
      system: args.system || "",
      prompt: args.prompt,
      jsonMode: args.jsonMode !== false,
      maxTokens: args.maxTokens,
      model: args.model,
      gemini: args.gemini,
    })
  );
}
