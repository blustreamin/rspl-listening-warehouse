import type { VercelRequest, VercelResponse } from "@vercel/node";
import { configuredProviders, defaultProviderId } from "./_lib/providers/index.js";
import { supabaseConfigured, handlePreflight } from "./_lib/supabaseAdmin.js";

// GET /api/providers
// Tells the client which providers are usable, so the UI selector only offers
// configured ones and the pipeline knows whether to attempt synthesis or seed.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const providers = configuredProviders();
  res.status(200).json({
    providers,
    default: defaultProviderId(),
    any: Object.values(providers).some(Boolean),
    persistence: supabaseConfigured(),
  });
}
