import React, { useEffect, useState } from "react";
import { loadProviderStatus, getProvider, setProvider, ProviderId, ProviderStatus } from "../lib/llmSettings";

const LABELS: Record<ProviderId, string> = {
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  openai: "OpenAI GPT",
};

// Sidebar control: shows which providers are configured server-side and lets the
// user pick which one runs synthesis (so Gemini / Claude / GPT can be compared).
// When none are configured the app runs in seed mode.
export const ProviderSelector: React.FC = () => {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [active, setActive] = useState<ProviderId>(getProvider());

  useEffect(() => {
    let alive = true;
    loadProviderStatus().then((s) => {
      if (!alive) return;
      setStatus(s);
      setActive(getProvider());
    });
    return () => { alive = false; };
  }, []);

  const configured = status
    ? (Object.keys(status.providers) as ProviderId[]).filter((k) => status.providers[k])
    : [];

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = e.target.value as ProviderId;
    setProvider(p);
    setActive(p);
  };

  return (
    <div className="px-3 space-y-3">
      {/* Synthesis engine */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Synthesis engine</label>
        {!status ? (
          <div className="text-xs text-slate-500">Checking…</div>
        ) : configured.length === 0 ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs text-amber-400">Seed mode · no API key set</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <select
              value={active}
              onChange={onChange}
              className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 flex-1"
            >
              {configured.map((p) => (
                <option key={p} value={p}>{LABELS[p]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Persistence */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status?.persistence ? "bg-emerald-500" : "bg-slate-600"}`}></div>
        <span className="text-xs text-slate-400">
          {status?.persistence ? "Supabase persistence on" : "Persistence off"}
        </span>
      </div>
    </div>
  );
};
