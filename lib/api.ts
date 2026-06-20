// Client-side fetch helpers for the Vercel API tier.
// In production the API is same-origin (''); for local `vite dev` against a
// deployed backend, set VITE_API_BASE to the Vercel URL.

const BASE: string = ((import.meta as any).env?.VITE_API_BASE as string) || "";

async function asJson(res: Response): Promise<any> {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : {}; } catch { return { __raw: txt }; }
}

export async function apiGet(path: string, params?: Record<string, string | undefined>): Promise<any> {
  const qs = params
    ? "?" + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
    : "";
  const res = await fetch(`${BASE}${path}${qs}`);
  return asJson(res);
}

export async function apiPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return asJson(res);
}

export async function apiDelete(path: string, params?: Record<string, string | undefined>): Promise<any> {
  const qs = params
    ? "?" + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
    : "";
  const res = await fetch(`${BASE}${path}${qs}`, { method: "DELETE" });
  return asJson(res);
}
