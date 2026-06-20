import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================================================
// Server-only Supabase admin client. Uses the SERVICE ROLE key, which bypasses
// RLS — so this must NEVER be imported into client code. It lives under /api,
// which Vercel bundles only into serverless functions.
// ============================================================================

export const DATASET_BUCKET = "warehouse-datasets";

let _client: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) {
    throw new Error("Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** Whether the Supabase env is present (used to gate persistence gracefully). */
export function supabaseConfigured(): boolean {
  return !!(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let _bucketReady = false;
/** Ensure the private datasets bucket exists. Idempotent; safe to call per request. */
export async function ensureBucket(): Promise<void> {
  if (_bucketReady) return;
  const admin = getAdmin();
  const { data } = await admin.storage.getBucket(DATASET_BUCKET);
  if (!data) {
    await admin.storage.createBucket(DATASET_BUCKET, { public: false });
  }
  _bucketReady = true;
}

// --- small HTTP helpers shared by the route handlers ---

export function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function readBody<T = any>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}
