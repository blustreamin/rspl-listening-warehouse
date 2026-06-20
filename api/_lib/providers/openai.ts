import OpenAI from "openai";
import { LLMProvider, SynthesizeArgs, SynthesizeResult, DEFAULT_MAX_TOKENS } from "./types";

// Env-overridable. Default to a broadly available model; set OPENAI_MODEL to pin
// to whatever current model you want (e.g. a newer GPT or an o-series model).
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export const openaiProvider: LLMProvider = {
  id: "openai",

  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  },

  defaultModel() {
    return DEFAULT_MODEL;
  },

  async synthesize(args: SynthesizeArgs): Promise<SynthesizeResult> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
    const model = args.model || DEFAULT_MODEL;
    const jsonMode = args.jsonMode !== false;

    const res = await client.chat.completions.create({
      model,
      max_tokens: args.maxTokens || DEFAULT_MAX_TOKENS,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: args.system || "" },
        { role: "user", content: args.prompt },
      ],
    });

    const text = res.choices?.[0]?.message?.content || "";
    return { text, provider: "openai", model };
  },
};
