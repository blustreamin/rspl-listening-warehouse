/* ============================================================================
   RunBar — the explicit run gate (05 Jul 2026).
   ----------------------------------------------------------------------------
   Synthesis NEVER starts from navigation; this bar is the only trigger. It
   shows the selected engine, the provider-scoped cache state for the current
   evidence hash, and a freshness badge when the corpus has changed since the
   last recorded run. The primary button relabels by state:
       cache empty    → "Run Report"
       cache partial  → "Run Missing Sections (N)"
       cache complete → "Regenerate Report"   (also when data changed)
   Clicking defers to ReportView's confirm dialog (the second gate); while the
   run-state machine reports `running`, the button is dead and shows progress.
   ============================================================================ */

import React from 'react';
import { useRunState } from '../../lib/runState';

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI GPT',
  seed: 'Seed mode — no API key',
};

interface Props {
  projectId: string;
  /** provider the next run would execute on ('seed' when unconfigured) */
  provider: string;
  /** sections cached for the current evidence hash + provider */
  cached: number;
  /** registry size (femcare excludes the retired visual-synthesis section) */
  total: number;
  /** cache probe finished — before that the button stays disabled */
  probed: boolean;
  /** corpus hash no longer matches the last recorded run's cache */
  stale: boolean;
  onRun: () => void;
}

export const RunBar: React.FC<Props> = ({ projectId, provider, cached, total, probed, stale, onRun }) => {
  const run = useRunState();
  const running = run.phase === 'running' && run.projectId === projectId;
  const missing = Math.max(0, total - cached);

  const cacheLine = !probed
    ? 'Checking cache…'
    : cached === 0
      ? `0/${total} — not yet run`
      : cached < total
        ? `${cached}/${total} partial`
        : `${total}/${total} cached`;

  const label = running
    ? `Running… ${run.done}/${run.total}`
    : !probed
      ? 'Checking cache…'
      : stale || cached === total
        ? 'Regenerate Report'
        : cached === 0
          ? 'Run Report'
          : `Run Missing Sections (${missing})`;

  const disabled = running || !probed;
  // "Data changed" makes Regenerate the highlighted action (amber); a plain
  // run/regenerate stays indigo like the rest of the app chrome.
  const buttonClass = disabled
    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
    : stale
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <div className="lv-no-print mb-6 bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${provider === 'seed' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
          {PROVIDER_LABELS[provider] || provider}
        </span>
      </div>

      <span className="text-slate-300">|</span>

      <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{cacheLine}</span>

      {probed && stale && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-2.5 py-0.5 whitespace-nowrap">
          Data changed since last run
        </span>
      )}

      <div className="ml-auto">
        <button
          type="button"
          onClick={() => { if (!disabled) onRun(); }}
          disabled={disabled}
          title={running
            ? `Synthesis in progress — ${run.done}/${run.total} sections`
            : 'Runs synthesis on the selected engine — asks for confirmation first'}
          className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${buttonClass}`}
        >
          {label}
        </button>
      </div>
    </div>
  );
};

export default RunBar;
