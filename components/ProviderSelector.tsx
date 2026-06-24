import React, { useEffect, useState } from "react";
import { loadProviderStatus, getProvider, setProvider, ProviderId, ProviderStatus } from "../lib/llmSettings";
import { isRunActive, subscribeRunState } from "../lib/runState";

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
  const [locked, setLocked] = useState<boolean>(isRunActive());

  useEffect(() => {
    let alive = true;
    loadProviderStatus().then((s) => {
      if (!alive) return;
      setStatus(s);
      setActive(getProvider());
    });
    return () => { alive = false; };
  }, []);

  // Lock the engine choice while a generation run is in progress, so one report
  // can't be synthesised half on Gemini and half on Claude.
  useEffect(() => {
    setLocked(isRunActive());
    const unsub = subscribeRunState(() => setLocked(isRunActive()));
    return unsub;
  }, []);

  const configured = status
    ? (Object.keys(status.providers) as ProviderId[]).filter((k) => status.providers[k])
    : [];

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (locked) return; // hard guard in addition to the disabled attribute
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
            <div className={`w-2 h-2 rounded-full ${locked ? 'bg-slate-500' : 'bg-emerald-500'}`}></div>
            <select
              value={active}
              onChange={onChange}
              disabled={locked}
              title={locked ? 'Engine is locked while a report is generating' : undefined}
              className={`bg-slate-800 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 flex-1 ${locked ? 'text-slate-400 opacity-60 cursor-not-allowed' : 'text-slate-200'}`}
            >
              {configured.map((p) => (
                <option key={p} value={p}>{LABELS[p]}</option>
              ))}
            </select>
          </div>
        )}
        {locked && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            <span className="text-[10px] text-slate-400">Locked during run</span>
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
