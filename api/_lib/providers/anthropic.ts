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

    // Claude 4.x models reject assistant-prefill ("conversation must end with
    // a user message"). Instead, enforce JSON output via the system prompt and
    // a trailing instruction in the user turn.
    const jsonSuffix = jsonMode
      ? "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown fences, no preamble, no commentary — just the raw JSON object starting with {."
      : "";

    const systemText = args.system
      ? (jsonMode ? args.system + "\nYou MUST respond with pure JSON only." : args.system)
      : (jsonMode ? "You MUST respond with pure JSON only." : undefined);

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: args.prompt + jsonSuffix },
    ];

    const msg = await client.messages.create({
      model,
      max_tokens: args.maxTokens || DEFAULT_MAX_TOKENS,
      system: systemText,
      messages,
    });

    const body = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    // Strip any markdown fences the model might still wrap around JSON.
    let text = body;
    if (jsonMode) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    }
    return { text, provider: "anthropic", model };
  },
};
