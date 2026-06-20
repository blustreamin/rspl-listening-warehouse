/**
 * EVIDENCE INSIGHTS PANEL (F2) — UI-only
 * ----------------------------------------------------------------------------
 * A shared, section-agnostic slide-over that surfaces the stored consumer
 * verbatims for ANY section. It reads only from section content already in app
 * state (no fetch), via the pure `extractEvidence` util, and renders:
 *   - a top-of-panel "insight" summary (source mix, confidence distribution,
 *     total evidence weight),
 *   - verbatims grouped by their parent theme, each with quote + attribution,
 *     a colour-coded confidence chip (only where present) and a data_points
 *     "evidence weight" pill (only where present).
 *
 * `EvidenceTrigger` is the compact "Evidence (N)" control that lives in the
 * shared section header/wrapper — mount it once and it appears on every
 * section/surface without touching the bespoke section renderers.
 *
 * Accessibility: role="dialog" + aria-modal, focus trap, Esc to close, focus
 * restoration on close, and background scroll lock.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  extractEvidence,
  summarizeEvidence,
  groupVerbatims,
  type Verbatim,
  type Confidence,
} from '../../utils/evidence/extractEvidence';

// ── Design tokens (match existing Modern UI palette) ─────────────────────────

const CONFIDENCE_STYLES: Record<Confidence, { chip: string; label: string }> = {
  HIGH: { chip: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'High' },
  MED: { chip: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Medium' },
  LOW: { chip: 'text-slate-500 bg-slate-100 border-slate-200', label: 'Low' },
};

const QuoteIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);

// ── Confidence chip & evidence-weight pill (render only where data exists) ───

const ConfidenceChip: React.FC<{ level?: Confidence }> = ({ level }) => {
  if (!level) return null;
  const s = CONFIDENCE_STYLES[level];
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${s.chip}`}
      title={`Confidence: ${s.label}`}
    >
      {s.label} confidence
    </span>
  );
};

const EvidenceWeightPill: React.FC<{ dataPoints?: number }> = ({ dataPoints }) => {
  if (typeof dataPoints !== 'number') return null;
  return (
    <span
      className="text-[9px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded whitespace-nowrap"
      title="Evidence weight (data points)"
    >
      {dataPoints.toLocaleString()} data pts
    </span>
  );
};

// ── Single verbatim row ──────────────────────────────────────────────────────

const VerbatimRow: React.FC<{ verbatim: Verbatim }> = ({ verbatim }) => {
  const { quote, source, consumer, confidence, data_points } = verbatim;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
      <p className="text-[12px] leading-relaxed text-slate-800 italic">“{quote}”</p>
      {(source || consumer) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500 not-italic">
          {source && <span className="font-bold text-slate-600">{source}</span>}
          {source && consumer && <span className="text-slate-300">·</span>}
          {consumer && <span>{consumer}</span>}
        </div>
      )}
      {(confidence || typeof data_points === 'number') && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <ConfidenceChip level={confidence} />
          <EvidenceWeightPill dataPoints={data_points} />
        </div>
      )}
    </div>
  );
};

// ── Top-of-panel insight summary ─────────────────────────────────────────────

const SummaryBlock: React.FC<{ verbatims: Verbatim[] }> = ({ verbatims }) => {
  const summary = useMemo(() => summarizeEvidence(verbatims), [verbatims]);

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 space-y-3">
      {/* Source mix */}
      <div>
        <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
          Source mix
        </div>
        <div className="flex flex-wrap gap-1.5">
          {summary.sourceMix.map((s) => (
            <span
              key={s.source}
              className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full"
            >
              <span className="font-medium">{s.source}</span>
              <span className="font-mono text-slate-400">{s.count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {/* Confidence distribution — only when any verbatim carries confidence */}
        {summary.hasConfidence && (
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
              Confidence
            </div>
            <div className="flex flex-wrap gap-1.5">
              {summary.confidenceMix.map((c) => (
                <span
                  key={c.level}
                  className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${CONFIDENCE_STYLES[c.level].chip}`}
                >
                  {CONFIDENCE_STYLES[c.level].label}
                  <span className="font-mono">{c.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Total evidence weight — only when any verbatim carries data_points */}
        {summary.withDataPoints > 0 && (
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
              Evidence weight
            </div>
            <div className="text-sm font-bold text-indigo-700 font-mono">
              {summary.totalDataPoints.toLocaleString()}
              <span className="text-[10px] font-normal text-slate-400 ml-1">data points</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── The slide-over drawer ────────────────────────────────────────────────────

interface PanelProps {
  verbatims: Verbatim[];
  sectionTitle?: string;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const EvidencePanel: React.FC<PanelProps> = ({ verbatims, sectionTitle, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupVerbatims(verbatims), [verbatims]);
  const titleId = 'evidence-panel-title';

  useEffect(() => {
    const previouslyFocused = (typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null);

    const node = panelRef.current;
    const getFocusable = (): HTMLElement[] =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    // Move focus into the panel.
    const first = getFocusable()[0];
    (first || node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) {
          e.preventDefault();
          node?.focus();
          return;
        }
        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === firstEl || active === node)) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    // Lock background scroll.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const drawer = (
    <div className="fixed inset-0 z-[60]" aria-hidden={false}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col outline-none animate-[slideIn_0.2s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <h2
                id={titleId}
                className="text-sm font-extrabold uppercase tracking-wider text-slate-800"
              >
                Evidence Insights
              </h2>
            </div>
            {sectionTitle && (
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {sectionTitle} · {verbatims.length} verbatim{verbatims.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence panel"
            className="flex-shrink-0 ml-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {verbatims.length > 0 ? (
          <>
            <SummaryBlock verbatims={verbatims} />

            {/* Grouped verbatims */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 leading-snug pr-2">
                      {group.label}
                    </h3>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((v, i) => (
                      <VerbatimRow key={i} verbatim={v} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-slate-400">
            <QuoteIcon className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm font-medium text-slate-500">No stored verbatims</p>
            <p className="text-xs mt-1">This section has no consumer evidence to surface yet.</p>
          </div>
        )}
      </div>

      {/* Local keyframes — scoped, no global CSS file changes needed */}
      <style>{`@keyframes slideIn { from { transform: translateX(16px); opacity: 0.4 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );

  if (typeof document === 'undefined') return drawer;
  return createPortal(drawer, document.body);
};

// ── The shared header trigger ────────────────────────────────────────────────

interface TriggerProps {
  /** Raw section content jsonb (e.g. SectionOutput.content). */
  content: any;
  /** Section title, shown in the panel header. */
  sectionTitle?: string;
}

export const EvidenceTrigger: React.FC<TriggerProps> = ({ content, sectionTitle }) => {
  const verbatims = useMemo(() => extractEvidence(content), [content]);
  const [open, setOpen] = useState(false);
  const count = verbatims.length;

  const close = useCallback(() => setOpen(false), []);

  // No evidence → render a muted, non-interactive marker so every section still
  // shows "Evidence (N)" without offering an empty drawer.
  if (count === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg cursor-default select-none"
        title="No stored verbatims in this section"
      >
        <QuoteIcon />
        Evidence (0)
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`View ${count} consumer verbatim${count === 1 ? '' : 's'}`}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
      >
        <QuoteIcon />
        Evidence ({count})
      </button>
      {open && (
        <EvidencePanel verbatims={verbatims} sectionTitle={sectionTitle} onClose={close} />
      )}
    </>
  );
};

export default EvidenceTrigger;
