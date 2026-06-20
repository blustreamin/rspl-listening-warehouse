import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, SynthesizeArgs, SynthesizeResult, DEFAULT_MAX_TOKENS } from "./types.js";

// Env-overridable. Default to a current Sonnet; set ANTHROPIC_MODEL to pin.
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export const anthropicProvider: LLMProvider = {
  id: "anthropic",

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  defaultModel() {
    return DEFAULT_MODEL;
  },

  async synthesize(args: SynthesizeArgs): Promise<SynthesizeResult> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    const model = args.model || DEFAULT_MODEL;
    const jsonMode = args.jsonMode !== false;

    // Anthropic has no strict json flag — prefill the assistant turn with "{"
    // so the model is forced to continue valid JSON, then re-prepend it.
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: args.prompt }];
    if (jsonMode) messages.push({ role: "assistant", content: "{" });

    const msg = await client.messages.create({
      model,
      max_tokens: args.maxTokens || DEFAULT_MAX_TOKENS,
      system: args.system || undefined,
      messages,
    });

    const body = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const text = jsonMode ? "{" + body : body;
    return { text, provider: "anthropic", model };
  },
};
