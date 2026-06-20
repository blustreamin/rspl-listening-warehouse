import { GoogleGenAI } from "@google/genai";
import { LLMProvider, SynthesizeArgs, SynthesizeResult, DEFAULT_MAX_TOKENS } from "./types.js";

// Model is env-overridable so the exact current Gemini model can change without
// a code edit. Default kept conservative; set GEMINI_MODEL in Vercel to pin.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

export const geminiProvider: LLMProvider = {
  id: "gemini",

  isConfigured() {
    return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  },

  defaultModel() {
    return DEFAULT_MODEL;
  },

  async synthesize(args: SynthesizeArgs): Promise<SynthesizeResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    const ai = new GoogleGenAI({ apiKey });
    const model = args.model || DEFAULT_MODEL;

    const config: any = {
      maxOutputTokens: args.maxTokens || DEFAULT_MAX_TOKENS,
    };
    if (args.jsonMode !== false) config.responseMimeType = "application/json";
    // Gemini-only: search grounding + thinking budget (preserves prior behaviour)
    if (args.gemini?.grounding) config.tools = [{ googleSearch: {} }];
    if (args.gemini?.thinkingBudget) {
      config.thinkingConfig = { thinkingBudget: args.gemini.thinkingBudget };
    }

    // Gemini takes the system instruction via config.systemInstruction.
    if (args.system) config.systemInstruction = args.system;

    const res = await ai.models.generateContent({
      model,
      contents: args.prompt,
      config,
    });

    return { text: res.text || "", provider: "gemini", model };
  },
};
