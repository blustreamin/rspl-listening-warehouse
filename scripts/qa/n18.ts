/* ============================================================================
   QA Harness · N-18 margin-box PDF orientation spot-check

   METHOD (stated per the register): DOM-in-print STATIC analysis.

   The PDF export (components/report/ExportBar.tsx) rasterises the report with
   html2canvas + jsPDF, adding the `.pdf-export` class to the CLONE only
   (ExportBar onclone). So the PDF renders with SCREEN css plus any `.pdf-export`
   overrides — NOT with `@media print`. The margin-box band/tier labels
   (FourBandMatrix p.6–9, TierLadder p.19) are laid out vertically via
   `writing-mode: vertical-rl; transform: rotate(180deg)` in styles/booklet.css.

   html2canvas' support for combined writing-mode + CSS transform on inline text
   is incomplete, so the rasterised orientation of these labels is NOT guaranteed
   to match the on-screen (intended) orientation, and there is no upright/print
   fallback restoring them during capture.

   A true pixel-level assertion needs a headless browser (puppeteer/playwright) to
   run the actual html2canvas capture and read glyph orientation — not available
   in this offline harness. This static check therefore verifies the two things a
   DOM-in-print check CAN prove deterministically:
     (a) the margin-box labels are transform/writing-mode rotated, and
     (b) whether a `.pdf-export`/print rule restores them upright for the capture.

   Verdict:
     • rotated + NO export/print upright override  → WARN (pixel-unverified;
       needs a visual/headless confirmation). Set QA_N18_STRICT=1 to gate (FAIL).
     • rotated + an upright override exists         → PASS.
     • no rotation on the labels at all             → PASS (nothing to mangle).
   ============================================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Finding } from './registry';
import { MARGIN_BOX } from './registry';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

function readCss(rel: string): { css: string; file: string } | null {
  for (const p of [resolve(process.cwd(), rel), resolve(REPO_ROOT, rel)]) {
    if (existsSync(p)) return { css: readFileSync(p, 'utf8'), file: p };
  }
  return null;
}

/** crude but sufficient: pull the declaration block for a selector. */
function ruleBody(css: string, selector: string): string | null {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`${esc}\\s*\\{([^}]*)\\}`).exec(css);
  return m ? m[1] : null;
}

export function n18_marginBox(): Finding[] {
  const found = readCss(MARGIN_BOX.cssFile);
  const section = MARGIN_BOX.sections[0]; // babycare_needs — first margin-box slide
  if (!found) {
    return [{ register_id: 'N-18', section, status: 'WARN', evidence: `stylesheet ${MARGIN_BOX.cssFile} not found — cannot inspect margin-box orientation` }];
  }
  const { css, file } = found;

  const rotated: string[] = [];
  for (const sel of MARGIN_BOX.labelSelectors) {
    const body = ruleBody(css, sel);
    if (!body) continue;
    const vertical = /writing-mode\s*:\s*vertical/i.test(body);
    const rotate = /transform\s*:\s*[^;]*rotate/i.test(body);
    if (vertical || rotate) rotated.push(`${sel} {${vertical ? ' writing-mode:vertical' : ''}${rotate ? ' transform:rotate' : ''} }`);
  }

  if (!rotated.length) {
    return [{ register_id: 'N-18', section, status: 'PASS', evidence: 'margin-box labels carry no writing-mode/rotate — nothing for the PDF to mangle' }];
  }

  // Is there an export/print upright override for these labels during capture?
  const upright = MARGIN_BOX.labelSelectors.some((sel) => {
    const pdfSel = `.pdf-export ${sel}`;
    const body = ruleBody(css, pdfSel);
    return !!body && (/writing-mode\s*:\s*horizontal/i.test(body) || /transform\s*:\s*none/i.test(body) || /rotate\(0/i.test(body));
  });

  if (upright) {
    return [{ register_id: 'N-18', section, status: 'PASS', evidence: `margin-box rotated but a .pdf-export upright override exists (${MARGIN_BOX.cssFile})` }];
  }

  const strict = process.env.QA_N18_STRICT === '1';
  const rel = file.replace(REPO_ROOT + '/', '');
  return [{
    register_id: 'N-18',
    section,
    status: strict ? 'FAIL' : 'WARN',
    evidence: `margin-box label is CSS-rotated (${rotated.join('; ')} in ${rel}) with NO .pdf-export upright fallback; ` +
      `PDF path is html2canvas (ExportBar) which rasterises writing-mode+transform unreliably. ` +
      `Static DOM-in-print verdict — pixel-level assertion needs a headless browser` + (strict ? '' : '. Set QA_N18_STRICT=1 to gate.'),
  }];
}
