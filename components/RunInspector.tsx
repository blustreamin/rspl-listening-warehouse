
import React, { useEffect, useRef, useState } from 'react';
import { RunInspectorData, ProjectId } from '../types';
import { TEMPLATE_REGISTRY } from '../constants/templates';
import { useRunState } from '../lib/runState';

interface Props {
  data: RunInspectorData;
  projectId?: ProjectId;
}

const LS_KEY = 'rspl_inspector_open';

// Only error / repair signals earn attention — routine progress lines never
// pulse and NOTHING auto-expands the drawer.
const ATTENTION_RE = /CRITICAL|FAILED|Generation Failed|soft-fail|repair|retry|PENDING stub/i;

export const RunInspector: React.FC<Props> = ({ data, projectId }) => {
  // collapsed by default; state persists across reloads
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
  });
  const [pulse, setPulse] = useState(false);
  const attentionSeen = useRef(0);

  // The pill is the run-state lock's visual anchor — phase comes from the
  // run-state machine; per-section detail from the inspector data.
  const run = useRunState();
  const statuses = Object.values(data.perSectionStatus);
  // Prefer the live status map (it excludes femcare's retired section '10');
  // the registry length is only the pre-hydration fallback.
  const total = statuses.length || (projectId && TEMPLATE_REGISTRY[projectId]?.sections.length) || 0;
  const resolved = statuses.filter((s) => s !== 'PENDING').length;
  const failed = statuses.filter((s) => s === 'FAILED').length;
  const running = run.phase === 'running';
  const attentionCount = failed + data.retryLog.filter((l) => ATTENTION_RE.test(l)).length;

  useEffect(() => {
    if (attentionCount > attentionSeen.current && !open) setPulse(true);
    attentionSeen.current = attentionCount;
  }, [attentionCount, open]);

  // One-shot green pulse when the run completes (running → complete). Failure
  // states keep the red attention pulse; nothing ever auto-expands.
  const [donePulse, setDonePulse] = useState(false);
  const prevPhase = useRef(run.phase);
  useEffect(() => {
    if (prevPhase.current === 'running' && run.phase === 'complete') setDonePulse(true);
    prevPhase.current = run.phase;
  }, [run.phase]);

  const toggle = (v: boolean) => {
    setOpen(v);
    if (v) setPulse(false);
    try { localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  // ≥1280px: a body class shifts the report page left so the drawer never
  // overlaps #lovingle-report-container (see booklet.css).
  useEffect(() => {
    document.body.classList.toggle('rspl-inspector-open', open);
    return () => document.body.classList.remove('rspl-inspector-open');
  }, [open]);

  // amber while running · green at N/N · red on any FAILED (or an abandoned run)
  const dot = (failed > 0 || run.phase === 'partial_failed') ? '#EF4444' : running ? '#F59E0B' : '#22C55E';

  if (!open) {
    return (
      <button
        type="button"
        className={`rspl-insp-pill${pulse ? ' rspl-insp-pulse' : ''}${donePulse ? ' rspl-insp-pulse-once' : ''}`}
        onAnimationEnd={() => setDonePulse(false)}
        onClick={() => toggle(true)}
        title={running
          ? `Synthesis in progress — ${resolved}/${total} sections`
          : `Run inspector — ${resolved}/${total} sections resolved${failed ? `, ${failed} failed` : ''}`}
      >
        <span className="rspl-insp-dot" style={{ background: dot }} aria-hidden="true" />
        {resolved}/{total}
      </button>
    );
  }

  return (
    <aside className="rspl-insp-drawer" aria-label="Run inspector">
      <div className="rspl-insp-head">
        <span className="rspl-insp-title">
          <span className="rspl-insp-dot" style={{ background: dot }} aria-hidden="true" />
          RUN INSPECTOR · {resolved}/{total}
        </span>
        <button type="button" className="rspl-insp-close" onClick={() => toggle(false)} title="Collapse to status pill">✕</button>
      </div>

      <div className="rspl-insp-body text-xs font-mono">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="col-span-2">
            <div className="text-slate-500 mb-1">PROJECT SCOPE</div>
            <div className="text-indigo-300 bg-slate-800 p-1 rounded font-bold truncate">{projectId || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">TEMPLATE ID</div>
            <div className="text-white bg-slate-800 p-1 rounded truncate" title={data.templateId}>{data.templateId || '...'}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">EVIDENCE HASH</div>
            <div className="text-orange-300 bg-slate-800 p-1 rounded truncate">{data.evidenceHash || 'Computing...'}</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-slate-500 mb-1">SECTION JOBS</div>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(data.perSectionStatus).map(([id, status]) => (
              <div key={id} title={`${id} — ${status}`} className={`
                text-center p-1 rounded text-[10px] font-bold truncate
                ${status === 'OK' ? 'bg-emerald-900 text-emerald-300' :
                  status === 'PARTIAL' ? 'bg-yellow-900 text-yellow-300' :
                  status === 'SEEDED' ? 'bg-blue-900 text-blue-300' :
                  status === 'FAILED' ? 'bg-red-900 text-red-300' : 'bg-slate-800 text-slate-500'}
              `}>
                {id}
              </div>
            ))}
          </div>
        </div>

        {data.retryLog.length > 0 && (
          <div className="mb-3">
            <div className="text-slate-500 mb-1">REPAIR LOG</div>
            <div className="bg-black/50 p-2 rounded text-red-300 space-y-1 break-words">
              {data.retryLog.map((log, i) => (
                <div key={i}>&gt; {log}</div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-700">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> OK</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> SEEDED</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> PARTIAL</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> FAILED</span>
        </div>
      </div>
    </aside>
  );
};
