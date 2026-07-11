/* ============================================================================
   LovingleSectionShell — the booklet chrome every report section wears.
   ----------------------------------------------------------------------------
   Face Care booklet presentation (02 Jul 2026 rework): SectionHeaderBar with
   the zero-padded number + part-hued accent strip, the data-point count line,
   and the BookletFooter. Keeps `.lv-section-break` (PDF pagination) and adds
   the `#section-<key>` anchor the BookletTOC links to. The `.bk-scope` class
   re-skins every carried lv-* block to booklet tokens (styles/booklet.css).
   The MethodFooter evidence band is unrouted from this shell (QA, 03 Jul) —
   the component itself stays in LovingleBlocks for other report families.
   ============================================================================ */

import React from 'react';
import { SectionOutput } from '../../types';
import { SectionHeaderBar, BookletFooter, bookletSectionNumber, sectionPart } from './blocks/BookletChrome';

/** Sum every object's `data_points` once across arbitrary content — the section's evidence weight. */
const sumDataPoints = (node: any, seen: WeakSet<object> = new WeakSet()): number => {
  if (!node || typeof node !== 'object') return 0;
  if (seen.has(node)) return 0;
  seen.add(node);
  let total = 0;
  if (!Array.isArray(node) && typeof node.data_points === 'number') total += node.data_points;
  const values = Array.isArray(node)
    ? node
    : Object.entries(node).filter(([k]) => !k.startsWith('_')).map(([, v]) => v);
  for (const v of values) total += sumDataPoints(v, seen);
  return total;
};

export const confidenceBand = (totalDataPoints: number): string => {
  if (totalDataPoints >= 1500) return 'High';
  if (totalDataPoints >= 600) return 'Medium-High';
  if (totalDataPoints >= 200) return 'Medium';
  return 'Indicative';
};

interface ShellProps {
  section?: SectionOutput;
  data: any;
  /** Legacy prop — the booklet header carries no eyebrow; accepted for compatibility. */
  eyebrow?: string;
  titleAccent?: string;
  standfirst?: React.ReactNode;
  showGiraffe?: boolean;   // retired motif (N8/N10) — accepted, ignored
  indicative?: boolean;
  children: React.ReactNode;
}

export const LovingleSectionShell: React.FC<ShellProps> = ({
  section, data, standfirst, indicative, children,
}) => {
  const content = section?.content ?? data;
  const title = section?.title || '';

  const totalDataPoints = React.useMemo(() => sumDataPoints(content), [content]);
  const dp = totalDataPoints.toLocaleString();

  const secNum = bookletSectionNumber(section?.sectionId);

  return (
    <div
      className="lv-scope bk-scope lv-section-break"
      id={section?.sectionId ? `section-${section.sectionId}` : undefined}
    >
      <div className="lv-sheet">
        <SectionHeaderBar secNum={secNum} title={title} part={sectionPart(section?.sectionId)} />

        {standfirst && <p className="lv-standfirst" style={{ marginBottom: 18 }}>{standfirst}</p>}

        <div className="lv-grid">{children}</div>

        {/* N-08 — the section's data-point count is now a standard footnote
            line above the footer, not a badge under the section title. */}
        {totalDataPoints > 0 && (
          <p className="bk-section-footnote">Evidence base for this section: {dp} data points across the corpus.</p>
        )}

        {/* The evidence band (source pills · triangulation line · disclaimer)
            is unrouted — screen, print and PDF share this DOM. */}
        <BookletFooter secNum={secNum} />
      </div>
    </div>
  );
};
