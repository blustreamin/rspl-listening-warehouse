// ============================================================================
// LLM PROVIDER ABSTRACTION — shared interface
// Server-side only. Adapters wrap Gemini / Anthropic / OpenAI behind one call.
// Lives under /api so it is bundled into Vercel serverless functions, never
// into the client. API keys are read from server env and never leave the server.
// ============================================================================

export type ProviderId = "gemini" | "anthropic" | "openai";

export interface SynthesizeArgs {
  system: string;
  prompt: string;
  jsonMode?: boolean;      // default true — ask the model for strict JSON
  maxTokens?: number;      // default 8192
  model?: string;          // optional override; else provider env default
  // Gemini-only extras (ignored by other providers):
  gemini?: { grounding?: boolean; thinkingBudget?: number };
}

export interface SynthesizeResult {
  text: string;
  provider: ProviderId;
  model: string;
}

export interface LLMProvider {
  id: ProviderId;
  /** Whether the required API key is present in the environment. */
  isConfigured(): boolean;
  /** Default model id (env-overridable) used when no model is passed. */
  defaultModel(): string;
  synthesize(args: SynthesizeArgs): Promise<SynthesizeResult>;
}

export const DEFAULT_MAX_TOKENS = 8192;
