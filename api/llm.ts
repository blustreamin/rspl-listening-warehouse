import type { VercelRequest, VercelResponse } from "@vercel/node";
import { synthesizeWith } from "./_lib/providers";
import { handlePreflight, readBody } from "./_lib/supabaseAdmin";

// POST /api/llm
// The single egress point for all LLM calls. API keys live in server env and
// never reach the browser. Body:
//   { provider?, system, prompt, jsonMode?, maxTokens?, model?, gemini? }
// Returns { ok:true, text, provider, model } or { ok:false, available, reason }.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "method_not_allowed" });
    return;
  }

  const body = readBody<{
    provider?: string;
    system?: string;
    prompt?: string;
    jsonMode?: boolean;
    maxTokens?: number;
    model?: string;
    gemini?: { grounding?: boolean; thinkingBudget?: number };
  }>(req);

  if (!body.prompt) {
    res.status(400).json({ ok: false, reason: "missing_prompt" });
    return;
  }

  try {
    const result = await synthesizeWith(body.provider, {
      system: body.system || "",
      prompt: body.prompt,
      jsonMode: body.jsonMode,
      maxTokens: body.maxTokens,
      model: body.model,
      gemini: body.gemini,
    });

    if (!result) {
      // No provider key configured anywhere → the client falls back to seed data.
      res.status(200).json({ ok: false, available: false, reason: "no_provider_configured" });
      return;
    }

    res.status(200).json({
      ok: true,
      text: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (err: any) {
    console.error("[/api/llm] provider error:", err?.message || err);
    res.status(502).json({ ok: false, available: true, reason: "provider_error", detail: String(err?.message || err) });
  }
}
