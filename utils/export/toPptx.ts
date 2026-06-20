/* ============================================================================
   buildPptx — editable PowerPoint/Google-Slides deck from the section DTOs.
   The PptxGenJS constructor is passed in (dynamic-imported by ExportBar) so the
   library code-splits and never enters the main bundle. Content is native pptx
   tables (manually paginated into slides) + native bar charts — editable, not
   screenshots. 16:9 (LAYOUT_WIDE). One section block → 1+ slides.
   ============================================================================ */

import { SectionOutput } from '../../types';
import { C, confLabel, sevColor } from './theme';
import {
  reportToBlocks, ExportBlock, VerbatimX, CardX, GroupX, RungX, TriggerX,
  DriverX, GapGroupX, NeedX, BrandX, SwitchX, StyleX, PackX, JourneyLaneX,
} from './sectionBlocks';

const SLIDE_W = 13.333, MX = 0.55, CW = SLIDE_W - 2 * MX; // content width ≈ 12.23"

export async function buildPptx(PptxGenJS: any, sections: SectionOutput[]): Promise<Blob> {
  const report = reportToBlocks(sections);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Blustream'; pptx.company = 'RSPL · Lovingle';

  const TXT = (text: string, o: any = {}) => ({
    text: text || '', options: { fontFace: o.font || 'Calibri', fontSize: o.fontSize || 10, color: o.color || C.ink, bold: o.bold, italic: o.italic, breakLine: o.breakLine !== false },
  });
  const vbLines = (vs: VerbatimX[], max = 99) => vs.slice(0, max).flatMap((v) => {
    const src = [v.source, v.consumer].filter(Boolean).join(' · ');
    const a = [TXT(`“${v.quote}”`, { italic: true, color: C.ink, fontSize: 9 })];
    if (src) a.push(TXT(src, { color: C.blue600, fontSize: 8, bold: true }));
    return a;
  });
  const cardLines = (c: CardX) => {
    const tag = [c.confidence ? `${confLabel(c.confidence)} confidence` : '', typeof c.weight === 'number' ? `${c.weight.toLocaleString()} data points` : ''].filter(Boolean).join('  ·  ');
    const a = [TXT(c.headline, { bold: true, color: C.blue, fontSize: 11.5 })];
    if (c.signal) a.push(TXT(c.signal, { color: C.ink2, fontSize: 9.5 }));
    if (tag) a.push(TXT(tag, { color: C.orange700, fontSize: 8, bold: true }));
    return a;
  };

  const titleSlide = (eyebrow: string, title: string) => {
    const s = pptx.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: 1.02, fill: { color: C.blue } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.02, w: SLIDE_W, h: 0.06, fill: { color: C.orange } });
    s.addText((eyebrow || '').toUpperCase(), { x: MX, y: 0.12, w: CW, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: C.orange100, bold: true, charSpacing: 2 });
    s.addText(title || '', { x: MX, y: 0.4, w: CW, h: 0.55, fontFace: 'Georgia', fontSize: 21, color: 'FFFFFF', bold: true });
    return s;
  };
  const tableOpts = (colW: number[]) => ({
    x: MX, y: 1.45, w: CW, colW,
    border: { type: 'solid', pt: 0.5, color: C.line }, align: 'left', valign: 'top',
    fontFace: 'Calibri', fontSize: 10, margin: [3, 5, 3, 5],
  });
  const hRow = (labels: string[], fill = C.blue) => labels.map((l) => ({ text: l, options: { fill: { color: fill }, color: 'FFFFFF', bold: true, fontSize: 10, valign: 'middle' } }));
  const c0 = (lines: any, o: any = {}) => ({ text: lines, options: { fill: o.fill ? { color: o.fill } : undefined, color: C.ink, valign: 'top', ...o } });

  // Deterministic pagination — chunk rows into multiple slides (pptxgenjs autoPage
  // mis-handles rich array-cells, so we split ourselves and repeat the header).
  const tableSlide = (eyebrow: string, title: string, header: string[], rows: any[], colW: number[], headerFill = C.blue, perSlide = 6) => {
    const chunks: any[][] = [];
    if (!rows.length) chunks.push([]);
    else for (let i = 0; i < rows.length; i += perSlide) chunks.push(rows.slice(i, i + perSlide));
    chunks.forEach((chunk, idx) => {
      const s = titleSlide(eyebrow, chunks.length > 1 ? `${title}  (${idx + 1}/${chunks.length})` : title);
      s.addTable([hRow(header, headerFill), ...chunk], tableOpts(colW));
    });
  };

  // ── block dispatch ──────────────────────────────────────────────────────
  const renderBlock = (eyebrow: string, b: ExportBlock) => {
    switch (b.type) {
      case 'cards': {
        const w = [6.0, CW - 6.0];
        const rows = b.cards.map((c) => [c0(cardLines(c)), c0(c.verbatims.length ? vbLines(c.verbatims) : [TXT('—', { color: C.ink4 })])]);
        tableSlide(eyebrow, b.title, ['Insight', 'In their words'], rows, w, C.blue, 4);
        break;
      }
      case 'groups': {
        const w = [6.0, CW - 6.0];
        b.groups.forEach((g: GroupX) => {
          const rows = g.cards.map((c) => [c0(cardLines(c)), c0(c.verbatims.length ? vbLines(c.verbatims) : [TXT('—', { color: C.ink4 })])]);
          tableSlide(eyebrow, `${b.title} · ${g.label}`, ['Insight', 'In their words'], rows, w, C.blue, 4);
        });
        break;
      }
      case 'ladder': {
        const w = [2.0, 1.9, CW - 6.3, 2.4];
        const rows = b.rungs.map((r: RungX) => [
          c0([TXT(r.price, { bold: true, color: C.orange700, fontSize: 15 }), ...(r.unit ? [TXT(r.unit, { color: C.ink3, fontSize: 8 })] : [])], { fill: C.orange50 }),
          c0([TXT(r.band, { bold: true, color: C.blue, fontSize: 11 })]),
          c0([TXT(r.who, { color: C.ink2 })]),
          c0([TXT(r.ceiling, { color: C.ink3, fontSize: 9 })]),
        ]);
        tableSlide(eyebrow, b.title, ['Price ceiling', 'Segment', 'Who they are', 'Detail'], rows, w, C.blue, 8);
        break;
      }
      case 'triggers': {
        const w = [2.5, CW - 7.0, 1.3, 3.2];
        const rows = b.triggers.map((t: TriggerX) => {
          const f = t.locked ? C.orange50 : undefined;
          return [
            c0([TXT(t.name, { bold: true, color: t.locked ? C.orange700 : C.blue })], { fill: f }),
            c0([TXT(t.mechanism, { color: C.ink2 })], { fill: f }),
            c0([TXT(t.intensityLabel, { bold: true, color: C.orange700 })], { fill: f }),
            c0([TXT(t.verbatim ? `“${t.verbatim}”` : '', { italic: true, color: C.ink3, fontSize: 9 })], { fill: f }),
          ];
        });
        tableSlide(eyebrow, b.title, ['Trigger', 'Mechanism', 'Lift', 'In their words'], rows, w, C.blue, 6);
        break;
      }
      case 'journey': {
        const w = [2.2, CW / 2 - 1.1, CW / 2 - 1.1];
        const rows = b.lanes.map((l: JourneyLaneX) => [
          c0([TXT(l.ageBand, { bold: true, color: C.blue, fontSize: 11 }), TXT(l.headline, { color: C.ink2, fontSize: 9 }), ...(l.sizeSignal ? [TXT(l.sizeSignal, { italic: true, color: C.ink4, fontSize: 8 })] : [])], { fill: C.blue50 }),
          c0([...l.needs.map((n) => TXT(`• ${n}`, { color: C.ink2, fontSize: 9 })), ...(l.mindset ? [TXT(`Mindset · ${l.mindset}`, { italic: true, color: C.ink3, fontSize: 8 })] : [])]),
          c0([...l.switchTriggers.map((t) => TXT(`• ${t}`, { color: C.ink2, fontSize: 9 })), ...vbLines(l.verbatims, 2)]),
        ]);
        tableSlide(eyebrow, b.title, ['Lifestage', 'Needs & mindset', 'Switch triggers & evidence'], rows, w, C.blue, 4);
        if (b.spineSummary.length) {
          const s = titleSlide(eyebrow, 'The spine — what moves parents');
          s.addText(b.spineSummary.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink2, fontSize: 12, breakLine: true, paraSpaceAfter: 8 } })), { x: MX, y: 1.5, w: CW, h: 5 });
        }
        break;
      }
      case 'ranked': {
        // native bar chart (weights) ...
        const cs = titleSlide(eyebrow, `${b.title} — weight of each driver`);
        cs.addChart(pptx.ChartType.bar, [{ name: 'Weight', labels: b.drivers.map((d) => d.attribute), values: b.drivers.map((d) => d.weightPct) }], {
          x: MX, y: 1.45, w: CW, h: 5.4, barDir: 'bar', chartColors: [C.orange], showLegend: false,
          showValue: true, dataLabelColor: C.ink, dataLabelFontSize: 9, valAxisMaxVal: 100, valAxisHidden: true,
          catAxisLabelColor: C.ink2, catAxisLabelFontSize: 9,
        });
        // ... + data table (parity: insight + verbatim)
        const w = [3.0, CW - 6.0, 3.0];
        const rows = b.drivers.map((d: DriverX) => [
          c0([TXT(d.attribute, { bold: true, color: C.blue }), TXT(`${d.tierLabel} · ${d.importance}`, { color: C.ink4, fontSize: 8 })]),
          c0([TXT(d.insight, { color: C.ink2, fontSize: 9.5 })]),
          c0(d.verbatim ? vbLines([d.verbatim], 1) : [TXT('—', { color: C.ink4 })]),
        ]);
        tableSlide(eyebrow, `${b.title} — detail`, ['Attribute', 'Why it matters', 'In their words'], rows, w, C.blue, 5);
        break;
      }
      case 'gap': {
        const detailLines = (g?: GapGroupX) => (g ? g.bullets.flatMap((x) => [
          TXT(`${x.claim}  [${x.severity}${typeof x.weight === 'number' ? ` · ${x.weight} pts` : ''}]`, { bold: true, color: sevColor(x.severity), fontSize: 10 }),
          ...(x.explanation ? [TXT(x.explanation, { color: C.ink2, fontSize: 9 })] : []),
          ...vbLines(x.verbatims, 1),
        ]) : [TXT('—', { color: C.ink4 })]);
        if (b.current) tableSlide(eyebrow, `${b.title} — ${b.current.heading || 'Current challenges'}`, ['Challenge, severity & evidence'], b.current.bullets.map((x) => [c0([
          TXT(`${x.claim}  [${x.severity}${typeof x.weight === 'number' ? ` · ${x.weight} pts` : ''}]`, { bold: true, color: sevColor(x.severity), fontSize: 11 }),
          ...(x.explanation ? [TXT(x.explanation, { color: C.ink2, fontSize: 9.5 })] : []),
          ...vbLines(x.verbatims, 1),
        ])]), [CW], C.blue, 4);
        if (b.resolved || b.unresolved) {
          const w = [CW / 2, CW / 2];
          tableSlide(eyebrow, `${b.title} — resolved vs unresolved`, [b.resolved?.heading || 'Resolved', b.unresolved?.heading || 'Unresolved'], [[c0(detailLines(b.resolved)), c0(detailLines(b.unresolved))]], w, C.teal700);
        }
        if (b.needGap && b.needGap.needs.length) {
          const w = [3.4, 1.3, CW - 7.7, 3.0];
          const rows = b.needGap.needs.map((n: NeedX) => [
            c0([TXT(n.need, { bold: true, color: C.blue })]),
            c0([TXT(n.priority, { bold: true, color: C.orange700 })]),
            c0([...(n.whyNow ? [TXT(`Why now: ${n.whyNow}`, { color: C.ink2, fontSize: 9 })] : []), ...(n.who ? [TXT(`Who: ${n.who}`, { color: C.ink3, fontSize: 9 })] : [])]),
            c0(vbLines(n.verbatims, 1)),
          ]);
          tableSlide(eyebrow, `${b.needGap.heading || 'Need gaps'}`, ['Need', 'Priority', 'Rationale', 'In their words'], rows, w, C.blue, 5);
        }
        break;
      }
      case 'sov': {
        const cs = titleSlide(eyebrow, `${b.title} — share of voice`);
        cs.addChart(pptx.ChartType.bar, [{ name: 'SOV %', labels: b.brands.map((br) => br.brand), values: b.brands.map((br) => br.sov) }], {
          x: MX, y: 1.45, w: CW, h: 5.4, barDir: 'bar', chartColors: b.brands.map((br) => (br.isLovingle ? C.orange : C.blue)),
          showLegend: false, showValue: true, dataLabelColor: C.ink, dataLabelFontSize: 10, valAxisHidden: true, catAxisLabelColor: C.ink2, catAxisLabelFontSize: 11,
        });
        if (b.marketStructure.length) cs.addText(b.marketStructure.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink3, fontSize: 9, breakLine: true } })), { x: MX, y: 6.7, w: CW, h: 0.7 });
        const w = [2.0, 1.0, CW - 8.5, 2.5, 3.0];
        const rows = b.brands.map((br: BrandX) => [
          c0([TXT(br.brand, { bold: true, color: br.isLovingle ? C.orange700 : C.blue }), ...(br.isLovingle ? [TXT('FOCUS', { color: C.orange, bold: true, fontSize: 7 })] : []), TXT(br.tier, { color: C.ink4, fontSize: 8 })], { fill: br.isLovingle ? C.orange50 : undefined }),
          c0([TXT(`${br.sov}%`, { bold: true, color: C.ink2 })]),
          c0([TXT(br.positioning, { color: C.ink2, fontSize: 9 }), ...(br.attributes.length ? [TXT(br.attributes.map((a) => `${a.attribute} ${a.score}/5`).join('  ·  '), { color: C.ink4, fontSize: 8 })] : [])]),
          c0([...(br.strengths.length ? [TXT(`+ ${br.strengths.join(', ')}`, { color: C.teal700, fontSize: 8.5 })] : []), ...(br.weaknesses.length ? [TXT(`− ${br.weaknesses.join(', ')}`, { color: C.roseDk, fontSize: 8.5 })] : [])]),
          c0(vbLines(br.verbatims, 1)),
        ]);
        tableSlide(eyebrow, `${b.title} — detail`, ['Brand', 'SOV', 'Positioning & attributes', 'Strengths / watch-outs', 'In their words'], rows, w, C.blue, 4);
        break;
      }
      case 'switches': {
        const w = [2.8, CW - 8.6, 2.8 + 3.0];
        const rows = b.stories.map((s: SwitchX) => {
          const f = s.into ? C.teal50 : C.rose50;
          return [
            c0([TXT(`${s.from} → ${s.to}`, { bold: true, color: C.blue }), TXT(s.into ? 'WIN' : 'LEAK', { bold: true, color: s.into ? C.teal700 : C.roseDk, fontSize: 8 })], { fill: f }),
            c0([TXT(s.trigger, { color: C.ink2, fontSize: 9.5 })], { fill: f }),
            c0(vbLines(s.verbatims, 1), { fill: f }),
          ];
        });
        tableSlide(eyebrow, b.title, ['Switch', 'Trigger', 'In their words'], rows, [2.8, CW - 8.6, 5.8], C.blue, 6);
        break;
      }
      case 'styleCards': {
        const w = [2.0, CW - 8.5, 3.0, 3.5];
        const rows = b.styles.map((s: StyleX) => [
          c0([TXT(s.style, { bold: true, color: C.blue, fontSize: 11 }), ...(s.lifestageSkew ? [TXT(s.lifestageSkew, { color: C.ink4, fontSize: 8 })] : [])], { fill: C.blue50 }),
          c0([...(s.owns ? [TXT(`Owns: ${s.owns}`, { color: C.ink2, fontSize: 9 })] : []), ...(s.challenge ? [TXT(`Challenge: ${s.challenge}`, { color: C.roseDk, fontSize: 9 })] : []), ...(s.switchTriggers.length ? [TXT(`Switch: ${s.switchTriggers.join(' · ')}`, { color: C.ink3, fontSize: 8.5 })] : [])]),
          c0(s.notes.map((n) => TXT(`• ${n}`, { color: C.ink2, fontSize: 8.5 }))),
          c0(vbLines(s.verbatims, 1)),
        ]);
        tableSlide(eyebrow, b.title, ['Style', 'Role & switch', 'Notes', 'In their words'], rows, w, C.blue, 5);
        break;
      }
      case 'packColumns': {
        const w = [CW / 2, CW / 2];
        const packLines = (packs: PackX[]) => packs.flatMap((p) => {
          const a = [TXT(p.pack, { bold: true, color: C.blue, fontSize: 10.5 })];
          if (p.who) a.push(TXT(`Who: ${p.who}`, { color: C.ink2, fontSize: 8.5 }));
          if (p.occasion) a.push(TXT(`Occasion: ${p.occasion}`, { color: C.ink2, fontSize: 8.5 }));
          if (p.channel) a.push(TXT(`Channel: ${p.channel}`, { color: C.ink2, fontSize: 8.5 }));
          if (p.role) a.push(TXT(p.role, { italic: true, color: C.orange700, fontSize: 8.5 }));
          a.push(...vbLines(p.verbatims, 1));
          return a;
        });
        tableSlide(eyebrow, b.title, ['Laddi · single / twin', 'Non-Laddi · planned packs'], [[c0(packLines(b.laddi), { fill: C.blue50 }), c0(packLines(b.nonLaddi), { fill: C.orange50 })]], w);
        if (b.ladderDynamics.length) {
          const s = titleSlide(eyebrow, 'Value-ladder dynamics');
          s.addText(b.ladderDynamics.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink2, fontSize: 12, breakLine: true, paraSpaceAfter: 8 } })), { x: MX, y: 1.5, w: CW, h: 5 });
        }
        break;
      }
      case 'crosstab': {
        if (!b.matrix.columns.length) break;
        const n = b.matrix.columns.length + 1;
        const colW = Array.from({ length: n }, () => CW / n);
        const header = ['', ...b.matrix.columns];
        const rows = b.matrix.rows.map((r) => [c0([TXT(r.label, { bold: true, color: C.ink3, fontSize: 9 })], { fill: C.paperWarm }), ...r.cells.map((cl) => c0([TXT(cl, { color: C.ink2, fontSize: 9 })]))]);
        tableSlide(eyebrow, b.title, header, rows, colW, C.blue, 8);
        if (b.notes.length) {
          const s = titleSlide(eyebrow, `${b.title} — notes`);
          s.addText(b.notes.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink2, fontSize: 12, breakLine: true, paraSpaceAfter: 8 } })), { x: MX, y: 1.5, w: CW, h: 5 });
        }
        break;
      }
      case 'notes': {
        const s = titleSlide(eyebrow, b.title || 'Notes');
        s.addText(b.items.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink2, fontSize: 12, breakLine: true, paraSpaceAfter: 8 } })), { x: MX, y: 1.5, w: CW, h: 5 });
        break;
      }

      // ── F3 Gate 3 ──
      case 'statband': {
        const s = titleSlide(eyebrow, b.title);
        const n = b.stats.length || 1;
        const boxW = (CW - (n - 1) * 0.3) / n;
        b.stats.forEach((st, i) => {
          const x = MX + i * (boxW + 0.3);
          s.addShape(pptx.ShapeType.roundRect, { x, y: 1.7, w: boxW, h: 2.0, fill: { color: C.orange50 }, line: { color: C.orange100, width: 1 }, rectRadius: 0.1 });
          s.addText(st.stat, { x, y: 1.95, w: boxW, h: 1.0, align: 'center', fontFace: 'Georgia', bold: true, color: C.orange, fontSize: 40 });
          s.addText(st.label, { x: x + 0.15, y: 3.0, w: boxW - 0.3, h: 0.6, align: 'center', color: C.ink2, fontSize: 11 });
        });
        if (b.northStar) s.addText([{ text: 'North star   ', options: { bold: true, color: C.blue, fontSize: 14 } }, { text: b.northStar, options: { color: C.blue, fontSize: 14 } }], { x: MX, y: 4.1, w: CW, h: 1.3, fill: { color: C.blue50 }, align: 'left', valign: 'middle', margin: 12 });
        break;
      }
      case 'moves': {
        const w = [0.8, 4.5, CW - 5.3];
        const rows = b.moves.map((m) => [c0([TXT(String(m.n), { bold: true, color: C.orange700, fontSize: 14 })]), c0([TXT(m.title, { bold: true, color: C.blue, fontSize: 12 })]), c0([TXT(m.rationale, { color: C.ink2, fontSize: 10 })])]);
        tableSlide(eyebrow, b.title, ['#', 'Move', 'Rationale'], rows, w, C.blue, 6);
        break;
      }
      case 'wave': {
        const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const cs = titleSlide(eyebrow, b.title);
        cs.addChart(pptx.ChartType.line, [{ name: 'Demand index', labels: b.monthly.slice(0, 12).map((_, i) => M[i] || String(i + 1)), values: b.monthly.slice(0, 12) }], {
          x: MX, y: 1.5, w: CW, h: 4.4, chartColors: [C.orangeDk], showLegend: false, lineSize: 3, lineSmooth: true,
          valAxisMaxVal: 100, valAxisMinVal: 0, catAxisLabelColor: C.ink2, catAxisLabelFontSize: 10, valAxisLabelColor: C.ink3, valAxisLabelFontSize: 9,
        });
        if (b.spikes.length) {
          const w = [3.5, CW - 3.5];
          const rows = b.spikes.map((s) => [c0([TXT(s.month, { bold: true, color: C.orange700, fontSize: 11 }), TXT(s.label, { color: C.blue, fontSize: 11 })]), c0(s.verbatim ? vbLines([s.verbatim], 1) : [TXT('—', { color: C.ink4 })])]);
          tableSlide(eyebrow, `${b.title} — spikes`, ['Spike', 'In their words'], rows, w, C.blue, 6);
        }
        break;
      }
      case 'segments': {
        const w = [2.6, CW - 7.0, 4.4];
        const rows = b.segments.map((s) => [
          c0([TXT(s.segment, { bold: true, color: C.blue, fontSize: 12 })], { fill: C.blue50 }),
          c0([...(s.definition ? [TXT(s.definition, { color: C.ink2, fontSize: 9.5 })] : []), ...s.behaviours.map((x) => TXT(`• ${x}`, { color: C.ink2, fontSize: 9 }))]),
          c0(s.verbatims.length ? vbLines(s.verbatims, 1) : [TXT('—', { color: C.ink4 })]),
        ]);
        tableSlide(eyebrow, b.title, ['Segment', 'Definition & behaviours', 'In their words'], rows, w, C.blue, 4);
        break;
      }
      case 'channelflow': {
        const w = [2.4, 1.2, 2.6, CW - 6.2];
        const rows = b.nodes.map((n) => [
          c0([TXT(n.node, { bold: true, color: C.blue, fontSize: 12 })], { fill: C.blue50 }),
          c0([TXT(typeof n.share === 'number' ? `${n.share}%` : '—', { bold: true, color: C.orange700, fontSize: 12 })]),
          c0([TXT(n.mapsToPack, { bold: true, color: C.orange700, fontSize: 10 })]),
          c0([TXT(n.note, { color: C.ink2, fontSize: 9.5 }), ...vbLines(n.verbatims, 1)]),
        ]);
        tableSlide(eyebrow, b.title, ['Channel', 'Share', 'Pack', 'Role & evidence'], rows, w, C.blue, 5);
        if (b.flowNotes.length) { const s = titleSlide(eyebrow, `${b.title} — notes`); s.addText(b.flowNotes.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink2, fontSize: 12, breakLine: true, paraSpaceAfter: 8 } })), { x: MX, y: 1.5, w: CW, h: 5 }); }
        break;
      }
      case 'regionmap': {
        const w = [2.2, 1.4, CW - 3.6];
        const rows = b.regions.map((r) => [
          c0([TXT(r.name, { bold: true, color: C.blue, fontSize: 12 })]),
          c0([TXT(typeof r.intensity === 'number' ? `${r.intensity}` : '—', { bold: true, color: C.orange700, fontSize: 12 })]),
          c0([TXT(r.note, { color: C.ink2, fontSize: 9.5 }), ...vbLines(r.verbatims, 1)]),
        ]);
        tableSlide(eyebrow, b.title, ['Region', 'Intensity', 'Pattern & evidence'], rows, w, C.blue, 5);
        if (b.summary.length) { const s = titleSlide(eyebrow, `${b.title} — summary`); s.addText(b.summary.map((t) => ({ text: t, options: { bullet: { code: '2022' }, color: C.ink2, fontSize: 12, breakLine: true, paraSpaceAfter: 8 } })), { x: MX, y: 1.5, w: CW, h: 5 }); }
        break;
      }
      case 'network': {
        const cs = titleSlide(eyebrow, `${b.title} — influence weight`);
        cs.addChart(pptx.ChartType.bar, [{ name: 'Weight', labels: b.nodes.map((n) => n.name), values: b.nodes.map((n) => n.weight || 0) }], {
          x: MX, y: 1.45, w: CW, h: 3.5, barDir: 'bar', chartColors: [C.orange], showLegend: false, showValue: true,
          dataLabelColor: C.ink, dataLabelFontSize: 9, valAxisMaxVal: 100, valAxisHidden: true, catAxisLabelColor: C.ink2, catAxisLabelFontSize: 10,
        });
        cs.addText(`Centre: ${b.center}${b.excluded.length ? '     Excluded: ' + b.excluded.join('; ') : ''}`, { x: MX, y: 5.15, w: CW, h: 0.5, color: C.ink3, fontSize: 10, italic: true });
        const w = [2.6, 1.2, 2.6, CW - 6.4];
        const rows = b.nodes.map((n) => [
          c0([TXT(n.name, { bold: true, color: C.blue, fontSize: 11 })]),
          c0([TXT(typeof n.weight === 'number' ? `${n.weight}` : '—', { bold: true, color: C.orange700, fontSize: 11 })]),
          c0([TXT(n.role, { color: C.ink2, fontSize: 9.5 })]),
          c0(n.verbatim ? vbLines([n.verbatim], 1) : [TXT('—', { color: C.ink4 })]),
        ]);
        tableSlide(eyebrow, `${b.title} — detail`, ['Node', 'Weight', 'Role', 'In their words'], rows, w, C.blue, 5);
        break;
      }
      case 'quadrant': {
        const w = [0.7, 3.4, 1.1, 1.1, CW - 6.3];
        const rows = b.points.map((p, i) => [
          c0([TXT(String(i + 1), { bold: true, color: C.orange700, fontSize: 11 })]),
          c0([TXT(p.label, { bold: true, color: C.blue, fontSize: 11 })]),
          c0([TXT(String(p.x), { color: C.ink2, fontSize: 10 })]),
          c0([TXT(String(p.y), { color: C.ink2, fontSize: 10 })]),
          c0([TXT(p.quadrant, { bold: true, color: C.orange700, fontSize: 9 }), ...(p.note ? [TXT(p.note, { color: C.ink2, fontSize: 9 })] : [])]),
        ]);
        tableSlide(eyebrow, `${b.title}  ·  ${b.xAxis.low}→${b.xAxis.high} effort × ${b.yAxis.low}→${b.yAxis.high} impact`, ['#', 'Opportunity', 'Effort', 'Impact', 'Quadrant & note'], rows, w, C.blue, 6);
        break;
      }
    }
  };

  // ── cover ───────────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: C.cream };
  cover.addText([{ text: 'Lovingle', options: { fontFace: 'Georgia', bold: true, color: C.orange, fontSize: 40 } }, { text: ' ™', options: { color: C.ink4, fontSize: 14 } }], { x: 0.8, y: 1.9, w: 11.7, h: 0.9 });
  cover.addShape(pptx.ShapeType.rect, { x: 0.82, y: 2.82, w: 2.4, h: 0.06, fill: { color: C.orange } });
  cover.addText(report.title, { x: 0.8, y: 3.05, w: 11.7, h: 0.8, fontFace: 'Georgia', bold: true, color: C.blue, fontSize: 30 });
  cover.addText(report.subtitle, { x: 0.8, y: 3.85, w: 11.7, h: 0.5, fontFace: 'Calibri', color: C.ink2, fontSize: 16 });
  cover.addText(report.dateLabel, { x: 0.8, y: 4.3, w: 11.7, h: 0.4, color: C.ink3, fontSize: 12 });
  cover.addText([
    { text: `Evidence · ${report.totalEvidence.toLocaleString()} verbatims`, options: { bold: true, color: C.orange700, fontSize: 14 } },
    { text: `     Data points · ${report.totalDataPoints.toLocaleString()}`, options: { bold: true, color: C.blue, fontSize: 14 } },
    { text: `     Confidence · ${report.confidence}`, options: { bold: true, color: C.teal700, fontSize: 14 } },
  ], { x: 0.8, y: 5.1, w: 11.7, h: 0.5 });
  cover.addText('Indicative worked example — verbatims and evidence weights render from the live corpus on generation.', { x: 0.8, y: 6.7, w: 11.7, h: 0.5, italic: true, color: C.ink4, fontSize: 10 });

  // ── sections ──────────────────────────────────────────────────────────────
  report.sections.forEach((sec) => {
    // section divider slide
    const div = pptx.addSlide();
    div.background = { color: C.blue };
    if (sec.indicative) div.addText('● INDICATIVE · sample data', { x: 0.8, y: 2.32, w: 11.7, h: 0.32, color: C.orange, fontSize: 11, bold: true });
    div.addText((sec.eyebrow || '').toUpperCase(), { x: 0.8, y: 2.7, w: 11.7, h: 0.4, color: C.orange100, fontSize: 12, bold: true, charSpacing: 2 });
    div.addText(sec.title, { x: 0.8, y: 3.1, w: 11.7, h: 1.0, fontFace: 'Georgia', bold: true, color: 'FFFFFF', fontSize: 30 });
    if (sec.standfirst) div.addText(sec.standfirst, { x: 0.8, y: 4.2, w: 11.0, h: 1.2, color: C.blue100, fontSize: 13, italic: true });
    div.addText(`Evidence · ${sec.evidenceN} verbatims   ·   ${sec.dataPoints.toLocaleString()} data points   ·   Confidence ${sec.confidence}`, { x: 0.8, y: 6.6, w: 11.7, h: 0.4, color: C.teal100, fontSize: 11, bold: true });
    sec.blocks.forEach((b) => renderBlock(sec.title, b));
  });

  // ── method footer slide ───────────────────────────────────────────────────
  const m = titleSlide('Methodology', 'Methodology & Evidence Base');
  m.addText([
    { text: 'Source layers: ', options: { bold: true, color: C.blue, fontSize: 14 } },
    { text: (report.sources.join(', ') || 'Social platforms, E-commerce reviews, Content communities'), options: { color: C.ink2, fontSize: 14, breakLine: true } },
    { text: `\nTriangulated across ${report.sources.length || 'multiple'} source layers · ${report.totalDataPoints.toLocaleString()} data points · ${report.totalEvidence.toLocaleString()} verbatims.`, options: { color: C.ink2, fontSize: 13, breakLine: true } },
    { text: `\nReport confidence: ${report.confidence}`, options: { bold: true, color: C.teal700, fontSize: 13, breakLine: true } },
  ], { x: MX, y: 1.6, w: CW, h: 3 });
  m.addText('Warm-premium format export — content rendered directly from the section corpus; the real Lovingle logo composites into the cover in production.', { x: MX, y: 6.6, w: CW, h: 0.6, italic: true, color: C.ink4, fontSize: 10 });

  return pptx.write({ outputType: 'blob' }) as Promise<Blob>;
}
