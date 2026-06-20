import { LLMProvider, ProviderId, SynthesizeArgs, SynthesizeResult } from "./types.js";
import { geminiProvider } from "./gemini.js";
import { anthropicProvider } from "./anthropic.js";
import { openaiProvider } from "./openai.js";

// Priority order used when picking a default provider.
const REGISTRY: LLMProvider[] = [geminiProvider, anthropicProvider, openaiProvider];

const byId: Record<ProviderId, LLMProvider> = {
  gemini: geminiProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
};

/** Which providers have a key configured in this environment. */
export function configuredProviders(): Record<ProviderId, boolean> {
  return {
    gemini: geminiProvider.isConfigured(),
    anthropic: anthropicProvider.isConfigured(),
    openai: openaiProvider.isConfigured(),
  };
}

/** The default provider = first configured in priority order, or null. */
export function defaultProviderId(): ProviderId | null {
  const found = REGISTRY.find((p) => p.isConfigured());
  return found ? found.id : null;
}

/** Resolve a requested provider, falling back to the default. Returns null if none configured. */
export function resolveProvider(requested?: string | null): LLMProvider | null {
  if (requested && (requested in byId)) {
    const p = byId[requested as ProviderId];
    if (p.isConfigured()) return p;
  }
  const def = defaultProviderId();
  return def ? byId[def] : null;
}

export async function synthesizeWith(
  requested: string | null | undefined,
  args: SynthesizeArgs
): Promise<SynthesizeResult | null> {
  const provider = resolveProvider(requested);
  if (!provider) return null; // no key configured anywhere → caller seeds
  return provider.synthesize(args);
}

export type { ProviderId } from "./types.js";
