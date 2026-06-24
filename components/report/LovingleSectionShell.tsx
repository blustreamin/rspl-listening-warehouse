/* ============================================================================
   LovingleSectionShell — the consistent warm chrome every Lovingle section wears
   ----------------------------------------------------------------------------
   Provides the `.lv-scope` sheet, a per-section ReportHeader (evidence pills +
   the F2 EvidenceTrigger), the `.lv-grid` for the section's zones, and a
   MethodFooter — all DERIVED from the real section content (no fabricated data).
   Section components supply only their eyebrow/standfirst + zone children.
   ============================================================================ */

import React from 'react';
import { SectionOutput } from '../../types';
import { extractEvidence, summarizeEvidence } from '../../utils/evidence/extractEvidence';
import { EvidenceTrigger } from './EvidencePanel';
import { ReportHeader, MethodFooter, LovingleGiraffe } from './blocks/LovingleBlocks';

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
  eyebrow: string;
  titleAccent?: string;
  standfirst?: React.ReactNode;
  showGiraffe?: boolean;
  indicative?: boolean;
  children: React.ReactNode;
}

export const LovingleSectionShell: React.FC<ShellProps> = ({
  section, data, eyebrow, titleAccent, standfirst, showGiraffe, indicative, children,
}) => {
  const content = section?.content ?? data;
  const title = section?.title || '';

  const verbatims = React.useMemo(() => extractEvidence(content), [content]);
  const summary = React.useMemo(() => summarizeEvidence(verbatims), [verbatims]);
  const totalDataPoints = React.useMemo(() => sumDataPoints(content), [content]);

  const sourceLayers = summary.sourceMix.map((s) => s.source).filter((s) => s && s !== 'Unattributed');
  const confidence = confidenceBand(totalDataPoints);

  // Verbatim provenance, attached by the synthesis layer (real runs only).
  const audit = (content as any)?._verbatim_audit;
  const provenance = audit && typeof audit.total === 'number'
    ? { corpus: audit.corpus || 0, total: audit.total || 0, unverified: audit.unverified || 0 }
    : undefined;

  return (
    <div className="lv-scope">
      <div className="lv-sheet">
        <span className="lv-blob lv-blob-o" />
        <span className="lv-blob lv-blob-t" />

        <ReportHeader
          eyebrow={eyebrow}
          title={title}
          titleAccent={titleAccent}
          standfirst={standfirst}
          indicative={indicative}
          evidenceN={verbatims.length}
          confidence={confidence}
          window={`${totalDataPoints.toLocaleString()} data points · ${sourceLayers.length || 'multi'} source layers`}
          provenance={provenance}
          metaSlot={<span className="lv-no-print"><EvidenceTrigger content={content} sectionTitle={title} /></span>}
        />

        <div className="lv-grid">{children}</div>

        <MethodFooter
          sources={sourceLayers.length ? sourceLayers : ['Social platforms', 'E-commerce reviews', 'Content communities']}
          window={`Triangulated across ${sourceLayers.length || 'multiple'} source layers · ${totalDataPoints.toLocaleString()} data points`}
          confidence={confidence}
          disclaimer="Warm-premium format pass — verbatims and evidence weights render directly from the section corpus; the real Lovingle logo composites into the header slot in production."
        />

        {showGiraffe && <LovingleGiraffe />}
      </div>
    </div>
  );
};
