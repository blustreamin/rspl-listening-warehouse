import type { VercelRequest, VercelResponse } from "@vercel/node";
import { synthesizeWith } from "./_lib/providers/index.js";
import { handlePreflight, readBody } from "./_lib/supabaseAdmin.js";

// A full section synthesis (esp. Anthropic with grounding + large thinking
// budget) can run long; give the function ample headroom so it isn't killed
// mid-generation and turned into a 502. Each call is its own short-lived
// invocation — the client drives the loop one awaited section at a time.
export const maxDuration = 300;

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
    // Surface the REAL provider failure so the next 502 is diagnosable instead
    // of an opaque "provider error". Provider SDK errors (e.g. Anthropic APIError)
    // carry an HTTP `status` and a structured `error` body.
    const requested = body.provider || "default";
    const status: number | null = err?.status ?? err?.statusCode ?? null;
    const detail: string =
      err?.error?.error?.message || err?.error?.message || err?.message || String(err);
    let providerBody: string | null = null;
    try {
      providerBody = JSON.stringify(err?.error ?? err?.response?.data ?? null);
    } catch { providerBody = null; }

    console.error(
      `[/api/llm] provider error: requested=${requested} status=${status ?? "n/a"} detail=${detail} body=${providerBody ?? "n/a"}`
    );
    res.status(502).json({
      ok: false,
      available: true,
      reason: "provider_error",
      provider: requested,
      status,
      detail,
    });
  }
}
