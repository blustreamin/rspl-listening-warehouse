/* ============================================================================
   buildDocx — editable Word/Google-Docs report from the section DTOs (F3 Gate 4b).
   The `docx` module is passed in (dynamic-imported by ExportBar) so it code-splits
   and never enters the main bundle. Google-Docs-safe: A4 DXA tables (never %),
   explicit column widths summing to content width, ShadingType.CLEAR, real list
   bullets (no unicode), dividers via paragraph borders.
   ============================================================================ */

import { SectionOutput } from '../../types';
import { C, FONT, DXA, sevColor, confLabel } from './theme';
import {
  reportToBlocks, ExportBlock, VerbatimX, CardX, GroupX, RungX, TriggerX,
  DriverX, GapGroupX, NeedX, BrandX, SwitchX, StyleX, PackX, JourneyLaneX, CrossTabX,
} from './sectionBlocks';

export async function buildDocx(docx: any, sections: SectionOutput[]): Promise<Blob> {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType, HeadingLevel, AlignmentType,
  } = docx;
  const report = reportToBlocks(sections);

  // ── primitives ──────────────────────────────────────────────────────────
  const W = (size: number) => ({ size, type: WidthType.DXA });
  const thin = { style: BorderStyle.SINGLE, size: 2, color: C.line };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const tableBorders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

  const run = (text: string, o: any = {}) => new TextRun({
    text, font: o.font || FONT.body, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color || C.ink,
  });
  const para = (children: any[], o: any = {}) => new Paragraph({
    children, alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line },
    indent: o.indent, border: o.border, bullet: o.bullet, heading: o.heading, keepNext: o.keepNext,
  });
  const empty = () => new Paragraph({ children: [run('', { size: 2 })] });
  const bullet = (t: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [run(t, { size: 19, color: C.ink2 })] });

  const heading = (title: string, eyebrow?: string) => {
    const ps: any[] = [];
    if (eyebrow) ps.push(para([run(eyebrow.toUpperCase(), { color: C.orange700, size: 16, bold: true })], { after: 20 }));
    ps.push(new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { before: 60, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.orange, space: 6 } },
      children: [run(title, { font: FONT.head, size: 30, bold: true, color: C.blue })],
    }));
    return ps;
  };
  const subhead = (t: string) => para([run(t, { font: FONT.head, size: 23, bold: true, color: C.blue })], { before: 140, after: 60, keepNext: true });

  const cell = (children: any[], o: any = {}) => new TableCell({
    width: o.w != null ? W(o.w) : undefined,
    columnSpan: o.span,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    verticalAlign: o.valign,
    children: children && children.length ? children : [empty()],
  });
  const table = (rows: any[], colWidths: number[]) => new Table({
    width: W(colWidths.reduce((a, b) => a + b, 0)), columnWidths: colWidths, borders: tableBorders, rows,
  });
  const headerRow = (labels: string[], widths: number[], fill = C.blue) => new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => cell([para([run(l, { color: C.white, bold: true, size: 18 })])], { w: widths[i], fill })),
  });

  // proportional bar as a 1-row nested table (real, editable, on-brand)
  const barCell = (pct: number, color: string, w: number) => {
    const fill = Math.max(1, Math.round((w - 240) * Math.min(100, Math.max(0, pct)) / 100));
    const rest = Math.max(1, (w - 240) - fill);
    const bar = new Table({
      width: W(w - 240), columnWidths: [fill, rest], borders: noBorders,
      rows: [new TableRow({ children: [
        new TableCell({ width: W(fill), shading: { type: ShadingType.CLEAR, color: 'auto', fill: color }, margins: { top: 20, bottom: 20, left: 0, right: 0 }, children: [empty()] }),
        new TableCell({ width: W(rest), margins: { top: 20, bottom: 20, left: 0, right: 0 }, children: [empty()] }),
      ] })],
    });
    return cell([bar], { w });
  };

  const verbatim = (v: VerbatimX): any[] => {
    const src = [v.source, v.consumer].filter(Boolean).join(' · ');
    const ps = [para([run(`“${v.quote}”`, { italics: true, color: C.ink })], {
      indent: { left: 200 }, after: src ? 10 : 80,
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: C.orange, space: 80 } },
    })];
    if (src) ps.push(para([run(src, { color: C.blue600, size: 16, bold: true })], { indent: { left: 200 }, after: 80 }));
    return ps;
  };
  const verbatims = (vs: VerbatimX[], max = 99): any[] => vs.slice(0, max).flatMap(verbatim);

  const cardBlock = (c: CardX): any[] => {
    const tags: any[] = [];
    if (c.confidence) tags.push(run(`  · ${confLabel(c.confidence)} confidence`, { color: C.teal700, size: 15, bold: true }));
    if (typeof c.weight === 'number') tags.push(run(`  · ${c.weight.toLocaleString()} data points`, { color: C.orange700, size: 15, bold: true }));
    const ps = [para([run(c.headline, { bold: true, color: C.blue, size: 22 }), ...tags], { before: 80, after: c.signal ? 20 : 40 })];
    if (c.signal) ps.push(para([run(c.signal, { color: C.ink2, size: 20 })], { after: 40 }));
    ps.push(...verbatims(c.verbatims));
    return ps;
  };

  // ── block dispatch ──────────────────────────────────────────────────────
  const renderBlock = (b: ExportBlock): any[] => {
    switch (b.type) {
      case 'cards':
        return [subhead(b.title), ...b.cards.flatMap(cardBlock)];

      case 'groups':
        return [subhead(b.title), ...b.groups.flatMap((g: GroupX) => [
          para([run(g.label.toUpperCase(), { color: C.orange700, bold: true, size: 16 })], { before: 100, after: 30 }),
          ...g.cards.flatMap(cardBlock),
        ])];

      case 'ladder': {
        const w = [1700, 1500, 3826, 2000];
        const rows = [headerRow(['Price ceiling', 'Segment', 'Who they are', 'Detail'], w)];
        b.rungs.forEach((r: RungX) => rows.push(new TableRow({ children: [
          cell([para([run(r.price, { bold: true, color: C.orange700, size: 24 }), ...(r.unit ? [run(` ${r.unit}`, { color: C.ink3, size: 14 })] : [])])], { w: w[0], fill: C.orange50 }),
          cell([para([run(r.band, { bold: true, color: C.blue, size: 19 })])], { w: w[1] }),
          cell([para([run(r.who, { color: C.ink2, size: 18 })])], { w: w[2] }),
          cell([para([run(r.ceiling, { color: C.ink3, size: 16 })])], { w: w[3] }),
        ] })));
        return [subhead(b.title), table(rows, w)];
      }

      case 'triggers': {
        const w = [2200, 3826, 1200, 1800];
        const rows = [headerRow(['Trigger', 'Mechanism', 'Lift', 'In their words'], w)];
        b.triggers.forEach((t: TriggerX) => rows.push(new TableRow({ children: [
          cell([para([run(t.name, { bold: true, color: t.locked ? C.orange700 : C.blue, size: 19 })])], { w: w[0], fill: t.locked ? C.orange50 : undefined }),
          cell([para([run(t.mechanism, { color: C.ink2, size: 18 })])], { w: w[1], fill: t.locked ? C.orange50 : undefined }),
          cell([para([run(t.intensityLabel, { bold: true, color: C.orange700, size: 18 })])], { w: w[2], fill: t.locked ? C.orange50 : undefined }),
          cell([para([run(t.verbatim ? `“${t.verbatim}”` : '', { italics: true, color: C.ink3, size: 16 })])], { w: w[3], fill: t.locked ? C.orange50 : undefined }),
        ] })));
        return [subhead(b.title), table(rows, w)];
      }

      case 'journey': {
        const w = [1900, 3563, 3563];
        const rows = [headerRow(['Lifestage', 'Needs & mindset', 'Switch triggers & evidence'], w)];
        b.lanes.forEach((l: JourneyLaneX) => rows.push(new TableRow({ children: [
          cell([
            para([run(l.ageBand, { bold: true, color: C.blue, size: 19 })], { after: 20 }),
            para([run(l.headline, { color: C.ink2, size: 16 })], { after: l.sizeSignal ? 20 : 0 }),
            ...(l.sizeSignal ? [para([run(l.sizeSignal, { color: C.ink4, size: 14, italics: true })])] : []),
          ], { w: w[0], fill: C.blue50 }),
          cell([
            ...l.needs.map(bullet),
            ...(l.mindset ? [para([run(`Mindset · ${l.mindset}`, { italics: true, color: C.ink3, size: 16 })], { before: 20 })] : []),
          ], { w: w[1] }),
          cell([...l.switchTriggers.map(bullet), ...verbatims(l.verbatims, 5)], { w: w[2] }),
        ] })));
        const out = [subhead(b.title), table(rows, w)];
        if (b.spineSummary.length) { out.push(subhead('The spine — what moves parents')); out.push(...b.spineSummary.map(bullet)); }
        return out;
      }

      case 'ranked': {
        const tiers = Array.from(new Set(b.drivers.map((d) => d.tierLabel)));
        const out: any[] = [subhead(b.title)];
        const w = [2600, 2600, 3826];
        tiers.forEach((tl) => {
          out.push(para([run(tl.toUpperCase(), { color: C.orange700, bold: true, size: 16 })], { before: 100, after: 30 }));
          const rows = [headerRow(['Attribute', 'Weight', 'Why it matters'], w)];
          b.drivers.filter((d: DriverX) => d.tierLabel === tl).forEach((d) => rows.push(new TableRow({ children: [
            cell([para([run(d.attribute, { bold: true, color: C.blue, size: 18 }), run(`  ${d.importance}`, { color: C.ink4, size: 14 })])], { w: w[0] }),
            barCell(d.weightPct, C.orange, w[1]),
            cell([para([run(d.insight, { color: C.ink2, size: 17 })]), ...(d.verbatim ? verbatim(d.verbatim) : [])], { w: w[2] }),
          ] })));
          out.push(table(rows, w));
        });
        return out;
      }

      case 'gap': {
        const out: any[] = [subhead(b.title)];
        const gapRows = (g?: GapGroupX) => (g ? g.bullets.flatMap((x) => {
          const ps = [para([
            run(x.claim, { bold: true, color: C.blue, size: 20 }),
            run(`  ${x.severity}`, { bold: true, color: sevColor(x.severity), size: 15 }),
            ...(typeof x.weight === 'number' ? [run(`  ${x.weight.toLocaleString()} pts`, { color: C.orange700, size: 15 })] : []),
          ], { before: 60, after: x.explanation ? 20 : 40 })];
          if (x.explanation) ps.push(para([run(x.explanation, { color: C.ink2, size: 18 })], { after: 40 }));
          ps.push(...verbatims(x.verbatims, 5));
          return ps;
        }) : []);
        if (b.current) { out.push(para([run((b.current.heading || 'Current challenges').toUpperCase(), { color: C.orange700, bold: true, size: 16 })], { before: 80, after: 30 })); out.push(...gapRows(b.current)); }
        if (b.resolved || b.unresolved) {
          const w = [4513, 4513];
          out.push(table([
            headerRow([b.resolved?.heading || 'Resolved', b.unresolved?.heading || 'Unresolved'], w, C.teal700),
            new TableRow({ children: [cell(gapRows(b.resolved), { w: w[0] }), cell(gapRows(b.unresolved), { w: w[1] })] }),
          ], w));
        }
        if (b.needGap && b.needGap.needs.length) {
          out.push(para([run((b.needGap.heading || 'Need gaps').toUpperCase(), { color: C.blue, bold: true, size: 16 })], { before: 120, after: 30 }));
          b.needGap.needs.forEach((n: NeedX) => {
            out.push(para([run(n.need, { bold: true, color: C.blue, size: 20 }), run(`  [${n.priority}]`, { bold: true, color: C.orange700, size: 15 })], { before: 60, after: 20 }));
            if (n.whyNow) out.push(para([run('Why now: ', { bold: true, color: C.ink, size: 17 }), run(n.whyNow, { color: C.ink2, size: 17 })], { after: 10 }));
            if (n.who) out.push(para([run('Who: ', { bold: true, color: C.ink, size: 17 }), run(n.who, { color: C.ink2, size: 17 })], { after: 20 }));
            out.push(...verbatims(n.verbatims, 5));
          });
        }
        return out;
      }

      case 'sov': {
        const out: any[] = [subhead(b.title)];
        if (b.marketStructure.length) { out.push(para([run('MARKET STRUCTURE', { color: C.orange700, bold: true, size: 15 })], { before: 60, after: 30 })); out.push(...b.marketStructure.map(bullet)); }
        // SOV summary table with proportional bars
        const w = [2400, 4226, 2400];
        const rows = [headerRow(['Brand', 'Share of voice', 'SOV %'], w)];
        b.brands.forEach((br: BrandX) => rows.push(new TableRow({ children: [
          cell([para([run(br.brand, { bold: true, color: br.isLovingle ? C.orange700 : C.blue, size: 19 }), ...(br.isLovingle ? [run('  FOCUS', { bold: true, color: C.orange, size: 12 })] : [])])], { w: w[0], fill: br.isLovingle ? C.orange50 : undefined }),
          barCell(br.sov, br.isLovingle ? C.orange : C.blue, w[1]),
          cell([para([run(`${br.sov}%`, { bold: true, color: C.ink2, size: 18 })])], { w: w[2] }),
        ] })));
        out.push(table(rows, w));
        // per-brand detail
        b.brands.forEach((br: BrandX) => {
          out.push(para([
            run(br.brand, { bold: true, color: br.isLovingle ? C.orange700 : C.blue, size: 21 }),
            run(`  ${br.tier} · ${br.sentiment} · SOV ${br.sov}%`, { color: C.ink3, size: 15 }),
          ], { before: 120, after: 20 }));
          if (br.positioning) out.push(para([run(br.positioning, { color: C.ink2, size: 18 })], { after: 20 }));
          if (br.strengths.length) out.push(para([run('Strengths: ', { bold: true, color: C.teal700, size: 16 }), run(br.strengths.join(', '), { color: C.ink2, size: 16 })], { after: 8 }));
          if (br.weaknesses.length) out.push(para([run('Watch-outs: ', { bold: true, color: C.roseDk, size: 16 }), run(br.weaknesses.join(', '), { color: C.ink2, size: 16 })], { after: 16 }));
          if (br.attributes.length) out.push(para([run(br.attributes.map((a) => `${a.attribute} ${a.score}/5`).join('  ·  '), { color: C.ink3, size: 15 })], { after: 16 }));
          out.push(...verbatims(br.verbatims, 5));
        });
        return out;
      }

      case 'switches': {
        const w = [2600, 3626, 2800];
        const rows = [headerRow(['Switch', 'Trigger', 'In their words'], w)];
        b.stories.forEach((s: SwitchX) => {
          const fill = s.into ? C.teal50 : C.rose50;
          rows.push(new TableRow({ children: [
            cell([para([run(`${s.from} → ${s.to}`, { bold: true, color: C.blue, size: 18 })], { after: 10 }), para([run(s.into ? 'WIN' : 'LEAK', { bold: true, color: s.into ? C.teal700 : C.roseDk, size: 14 })])], { w: w[0], fill }),
            cell([para([run(s.trigger, { color: C.ink2, size: 17 })])], { w: w[1], fill }),
            cell(verbatims(s.verbatims, 3), { w: w[2], fill }),
          ] }));
        });
        return [subhead(b.title), table(rows, w)];
      }

      case 'styleCards':
        return [subhead(b.title), ...b.styles.flatMap((s: StyleX) => {
          const ps = [para([run(s.style, { bold: true, color: C.blue, size: 21 }), ...(s.lifestageSkew ? [run(`  ${s.lifestageSkew}`, { color: C.ink4, size: 14 })] : [])], { before: 100, after: 20 })];
          if (s.owns) ps.push(para([run('Owns: ', { bold: true, color: C.ink, size: 17 }), run(s.owns, { color: C.ink2, size: 17 })], { after: 8 }));
          if (s.challenge) ps.push(para([run('Challenge: ', { bold: true, color: C.roseDk, size: 17 }), run(s.challenge, { color: C.ink2, size: 17 })], { after: 8 }));
          if (s.switchTriggers.length) ps.push(para([run('Switch: ', { bold: true, color: C.ink, size: 16 }), run(s.switchTriggers.join(' · '), { color: C.ink2, size: 16 })], { after: 8 }));
          s.notes.forEach((n) => ps.push(bullet(n)));
          ps.push(...verbatims(s.verbatims, 5));
          return ps;
        })];

      case 'packColumns': {
        const w = [4513, 4513];
        const packCell = (packs: PackX[]) => packs.flatMap((p) => {
          const ps = [para([run(p.pack, { bold: true, color: C.blue, size: 19 })], { before: 40, after: 10 })];
          if (p.who) ps.push(para([run('Who: ', { bold: true, size: 15 }), run(p.who, { color: C.ink2, size: 15 })], { after: 4 }));
          if (p.occasion) ps.push(para([run('Occasion: ', { bold: true, size: 15 }), run(p.occasion, { color: C.ink2, size: 15 })], { after: 4 }));
          if (p.channel) ps.push(para([run('Channel: ', { bold: true, size: 15 }), run(p.channel, { color: C.ink2, size: 15 })], { after: 4 }));
          if (p.role) ps.push(para([run(p.role, { italics: true, color: C.orange700, size: 15 })], { after: 8 }));
          ps.push(...verbatims(p.verbatims, 5));
          return ps;
        });
        const out: any[] = [subhead(b.title), table([
          headerRow(['Laddi · single / twin', 'Non-Laddi · planned packs'], w),
          new TableRow({ children: [cell(packCell(b.laddi), { w: w[0], fill: C.blue50 }), cell(packCell(b.nonLaddi), { w: w[1], fill: C.orange50 })] }),
        ], w)];
        if (b.ladderDynamics.length) { out.push(subhead('Value-ladder dynamics')); out.push(...b.ladderDynamics.map(bullet)); }
        return out;
      }

      case 'crosstab': {
        const cols = b.matrix.columns;
        if (!cols.length) return [];
        const n = cols.length + 1;
        const each = Math.floor(DXA.content / n);
        const w = Array.from({ length: n }, (_, i) => (i === n - 1 ? DXA.content - each * (n - 1) : each));
        const rows = [new TableRow({ tableHeader: true, children: [cell([empty()], { w: w[0], fill: C.paperWarm }), ...cols.map((c, i) => cell([para([run(c, { bold: true, color: C.blue, size: 16 })])], { w: w[i + 1], fill: C.paperWarm }))] })];
        b.matrix.rows.forEach((r) => rows.push(new TableRow({ children: [
          cell([para([run(r.label, { bold: true, color: C.ink3, size: 15 })])], { w: w[0], fill: C.paperWarm }),
          ...r.cells.map((cl, i) => cell([para([run(cl, { color: C.ink2, size: 15 })])], { w: w[i + 1] })),
        ] })));
        const out = [subhead(b.title), table(rows, w)];
        if (b.notes.length) out.push(...b.notes.map(bullet));
        return out;
      }

      case 'notes':
        return [...(b.title ? [subhead(b.title)] : []), ...b.items.map(bullet)];

      // ── F3 Gate 3 ──
      case 'statband': {
        const n = b.stats.length || 1;
        const each = Math.floor(DXA.content / n);
        const w = Array.from({ length: n }, (_, i) => (i === n - 1 ? DXA.content - each * (n - 1) : each));
        const out: any[] = [subhead(b.title)];
        if (b.stats.length) out.push(table([new TableRow({ children: b.stats.map((s, i) => cell([
          para([run(s.stat, { font: FONT.head, bold: true, color: C.orange, size: 44 })], { align: AlignmentType.CENTER, after: 20 }),
          para([run(s.label, { color: C.ink2, size: 16 })], { align: AlignmentType.CENTER }),
        ], { w: w[i], fill: C.orange50 })) })], w));
        if (b.northStar) out.push(para([run('North star · ', { bold: true, color: C.blue, size: 19 }), run(b.northStar, { color: C.blue, size: 19 })], { before: 100, after: 60 }));
        return out;
      }

      case 'moves':
        return [subhead(b.title), ...b.moves.flatMap((m) => [
          para([run(`${m.n}. `, { bold: true, color: C.orange700, size: 20 }), run(m.title, { bold: true, color: C.blue, size: 20 })], { before: 60, after: 10 }),
          ...(m.rationale ? [para([run(m.rationale, { color: C.ink2, size: 18 })], { after: 40 })] : []),
        ])];

      case 'wave': {
        const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const w = [3000, 6026];
        const rows = [headerRow(['Month', 'Demand index (0–100)'], w)];
        b.monthly.slice(0, 12).forEach((v, i) => rows.push(new TableRow({ children: [
          cell([para([run(M[i] || String(i + 1), { size: 18 })])], { w: w[0] }),
          barCell(typeof v === 'number' ? v : 0, C.orange, w[1]),
        ] })));
        const out: any[] = [subhead(b.title), table(rows, w)];
        if (b.spikes.length) {
          out.push(subhead('Seasonal spikes'));
          b.spikes.forEach((s) => {
            out.push(para([run(`${s.month} · `, { bold: true, color: C.orange700, size: 18 }), run(s.label, { bold: true, color: C.blue, size: 18 })], { before: 40, after: 10 }));
            if (s.verbatim) out.push(...verbatim(s.verbatim));
          });
        }
        return out;
      }

      case 'segments':
        return [subhead(b.title), ...b.segments.flatMap((s) => {
          const ps = [para([run(s.segment, { bold: true, color: C.blue, size: 21 })], { before: 100, after: 10 })];
          if (s.definition) ps.push(para([run(s.definition, { color: C.ink2, size: 18 })], { after: 10 }));
          s.behaviours.forEach((x) => ps.push(bullet(x)));
          ps.push(...verbatims(s.verbatims, 3));
          return ps;
        })];

      case 'channelflow': {
        const w = [2400, 1200, 2600, 2826];
        const rows = [headerRow(['Channel', 'Share', 'Pack it carries', 'Role & evidence'], w)];
        b.nodes.forEach((n) => rows.push(new TableRow({ children: [
          cell([para([run(n.node, { bold: true, color: C.blue, size: 18 })])], { w: w[0] }),
          typeof n.share === 'number' ? barCell(n.share, C.orange, w[1]) : cell([para([run('—', { color: C.ink4 })])], { w: w[1] }),
          cell([para([run(n.mapsToPack, { bold: true, color: C.orange700, size: 16 })])], { w: w[2] }),
          cell([para([run(n.note, { color: C.ink2, size: 16 })]), ...verbatims(n.verbatims, 3)], { w: w[3] }),
        ] })));
        const out: any[] = [subhead(b.title), table(rows, w)];
        if (b.flowNotes.length) out.push(...b.flowNotes.map(bullet));
        return out;
      }

      case 'regionmap': {
        const w = [2200, 1600, 5226];
        const rows = [headerRow(['Region', 'Intensity', 'Pattern & evidence'], w)];
        b.regions.forEach((r) => rows.push(new TableRow({ children: [
          cell([para([run(r.name, { bold: true, color: C.blue, size: 18 })])], { w: w[0] }),
          typeof r.intensity === 'number' ? barCell(r.intensity, C.orange, w[1]) : cell([para([run('—', { color: C.ink4 })])], { w: w[1] }),
          cell([para([run(r.note, { color: C.ink2, size: 16 })]), ...verbatims(r.verbatims, 3)], { w: w[2] }),
        ] })));
        const out: any[] = [subhead(b.title), table(rows, w)];
        if (b.summary.length) out.push(...b.summary.map(bullet));
        return out;
      }

      case 'network': {
        const w = [2400, 1400, 2400, 2826];
        const rows = [headerRow(['Influence node', 'Weight', 'Role', 'In their words'], w)];
        b.nodes.forEach((n) => rows.push(new TableRow({ children: [
          cell([para([run(n.name, { bold: true, color: C.blue, size: 18 })])], { w: w[0] }),
          typeof n.weight === 'number' ? barCell(n.weight, C.orange, w[1]) : cell([para([run('—', { color: C.ink4 })])], { w: w[1] }),
          cell([para([run(n.role, { color: C.ink2, size: 16 })])], { w: w[2] }),
          cell(n.verbatim ? verbatim(n.verbatim) : [para([run('—', { color: C.ink4 })])], { w: w[3] }),
        ] })));
        const out: any[] = [subhead(b.title), para([run(`Centre: ${b.center}`, { italics: true, color: C.ink3, size: 16 })], { after: 20 }), table(rows, w)];
        if (b.excluded.length) out.push(para([run('Excluded: ', { bold: true, color: C.roseDk, size: 16 }), run(b.excluded.join(' · '), { color: C.ink2, size: 16 })], { before: 40 }));
        if (b.notes.length) out.push(...b.notes.map(bullet));
        return out;
      }

      case 'quadrant': {
        const w = [600, 3000, 1300, 1300, 2826];
        const rows = [headerRow(['#', 'Opportunity', 'Effort', 'Impact', 'Quadrant & note'], w)];
        b.points.forEach((p, i) => rows.push(new TableRow({ children: [
          cell([para([run(String(i + 1), { bold: true, color: C.orange700, size: 18 })])], { w: w[0] }),
          cell([para([run(p.label, { bold: true, color: C.blue, size: 17 })])], { w: w[1] }),
          cell([para([run(String(p.x), { color: C.ink2, size: 16 })])], { w: w[2] }),
          cell([para([run(String(p.y), { color: C.ink2, size: 16 })])], { w: w[3] }),
          cell([para([run(p.quadrant, { bold: true, color: C.orange700, size: 15 }), ...(p.note ? [run(`  ${p.note}`, { color: C.ink2, size: 15 })] : [])])], { w: w[4] }),
        ] })));
        return [subhead(b.title), para([run(`${b.xAxis.low} → ${b.xAxis.high} (effort)  ·  ${b.yAxis.low} → ${b.yAxis.high} (impact)`, { italics: true, color: C.ink3, size: 15 })], { after: 20 }), table(rows, w)];
      }

      default:
        return [];
    }
  };

  // ── cover ───────────────────────────────────────────────────────────────
  const cover: any[] = [
    para([run('Lovingle', { font: FONT.head, bold: true, color: C.orange, size: 52 }), run('™', { color: C.ink4, size: 20 })], { before: 1200, after: 60 }),
    para([run(report.title, { font: FONT.head, bold: true, color: C.blue, size: 40 })], { after: 40 }),
    para([run(report.subtitle, { color: C.ink2, size: 24 })], { after: 30 }),
    para([run(report.dateLabel, { color: C.ink3, size: 18 })], { after: 200 }),
    para([
      run(`Evidence · ${report.totalEvidence.toLocaleString()} verbatims`, { bold: true, color: C.orange700, size: 20 }),
      run(`     Data points · ${report.totalDataPoints.toLocaleString()}`, { bold: true, color: C.blue, size: 20 }),
      run(`     Confidence · ${report.confidence}`, { bold: true, color: C.teal700, size: 20 }),
    ], { after: 40 }),
    para([run('Indicative worked example — verbatims and evidence weights render from the live corpus on generation.', { italics: true, color: C.ink4, size: 16 })], { before: 120 }),
  ];

  // ── body ────────────────────────────────────────────────────────────────
  const body: any[] = [];
  report.sections.forEach((sec, idx) => {
    body.push(new Paragraph({ children: [run('', { size: 2 })], pageBreakBefore: idx > 0 }));
    body.push(...heading(sec.title, sec.eyebrow));
    if (sec.indicative) body.push(para([run('● INDICATIVE · sample data', { bold: true, color: C.orange700, size: 15 })], { after: 40 }));
    if (sec.standfirst) body.push(para([run(sec.standfirst, { italics: true, color: C.ink2, size: 20 })], { after: 80 }));
    body.push(para([run(`Evidence · ${sec.evidenceN} verbatims   ·   ${sec.dataPoints.toLocaleString()} data points   ·   Confidence ${sec.confidence}`, { color: C.ink3, size: 15, bold: true })], { after: 120 }));
    sec.blocks.forEach((b) => body.push(...renderBlock(b)));
  });

  // ── method footer ─────────────────────────────────────────────────────────
  const footer: any[] = [
    new Paragraph({ pageBreakBefore: true, children: [run('', { size: 2 })] }),
    ...heading('Methodology & Evidence Base'),
    para([run('Source layers: ', { bold: true, color: C.blue, size: 18 }), run(report.sources.join(', ') || 'Social platforms, E-commerce reviews, Content communities', { color: C.ink2, size: 18 })], { after: 40 }),
    para([run(`Triangulated across ${report.sources.length || 'multiple'} source layers · ${report.totalDataPoints.toLocaleString()} data points · ${report.totalEvidence.toLocaleString()} verbatims.`, { color: C.ink2, size: 18 })], { after: 40 }),
    para([run('Report confidence: ', { bold: true, color: C.teal700, size: 18 }), run(report.confidence, { color: C.ink2, size: 18 })], { after: 80 }),
    para([run('Warm-premium format export — content rendered directly from the section corpus; the real Lovingle logo composites into the cover in production.', { italics: true, color: C.ink4, size: 16 })]),
  ];

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: DXA.pageW, height: DXA.pageH }, margin: { top: DXA.margin, right: DXA.margin, bottom: DXA.margin, left: DXA.margin } } },
      children: [...cover, ...body, ...footer],
    }],
  });
  return Packer.toBlob(doc);
}
