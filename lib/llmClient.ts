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

// Returns the raw model text, or null when no provider is configured / the call
// failed — callers treat null exactly like the old "no API key" path and fall
// back to seed data, so the app always renders.
export async function callLLM(args: CallLLMArgs): Promise<string | null> {
  const provider = args.provider || getProvider();
  try {
    const r = await apiPost("/api/llm", {
      provider,
      system: args.system || "",
      prompt: args.prompt,
      jsonMode: args.jsonMode !== false,
      maxTokens: args.maxTokens,
      model: args.model,
      gemini: args.gemini,
    });
    if (!r || r.ok !== true || typeof r.text !== "string") return null;
    return r.text;
  } catch {
    return null;
  }
}
