# v2 Bundle Contract — RSPL Baby Diapers Report

Single source of truth for the v2 (images / nav / footer / PDF / immersion) pass.
Every sub-agent builds against this. **No two agents write the same file.**

## Hard rules (from the brief)
- ALL report changes flow through `scripts/prepare-report.py` (main thread) calling your module. **Never hand-edit files in `public/reports/baby-diapers/`.**
- **Do NOT run the full `prepare-report.py` and do NOT write into `public/reports/`.** Main thread owns integration. Unit-test your own module on a sample string / scratch dir only.
- Never AI-generate or fabricate logos. Real files only.
- Raw 71MB PNGs never enter the repo — only optimized derivatives under `scripts/report-assets/assets/`.
- Design tokens (unchanged): navy `#0D2A55`, blue `#1F5FBF`, coral `#F26A3D`, off-white `#F6F8FB`, card `#FFFFFF`, line `#E3E8EF`. Battery ramp `#E2534B→#F0913C→#F2C744→#8FC06B→#3FAE7A`. System UI font stack; headings 700, body 400. McKinsey-grade: polish, not theatrics.

## File ownership
| Owner | Files (exclusive) |
|---|---|
| main thread | `scripts/prepare-report.py`, `scripts/report-assets/CONTRACT.md` |
| Agent 1 | `scripts/prepare-assets.py`, `scripts/report_media.py`, `scripts/assets-map.json`, `scripts/report-assets/assets/**` |
| Agent 2 | `scripts/report_nav.py`, `scripts/report-assets/report.css`, `scripts/report-assets/report.js` |
| Agent 3 | `scripts/report_print.py`, `scripts/report-assets/print.css` |
| Agent 4 | `scripts/report_immersion.py`, `scripts/report-assets/immersion.js`, `scripts/report-assets/immersion.css` |

## Emitted bundle → `public/reports/baby-diapers/`
`index.html` (cover) · `01..21 *.html` · `print.html` · `report.css` `report.js` `print.css` `immersion.css` `immersion.js` · `assets/*.webp`

## Stage contract — each stage is a pure function `fn(html: str, ctx: dict) -> str`
Runs in this order inside the orchestrator (after the v1 scrub, which already emits clean content + a v1 `.rpt-top`/`.rpt-foot` you will replace):
1. `report_media.inject_media(html, ctx)`  — Agent 1
2. `report_nav.inject_chrome(html, ctx)`    — Agent 2 (replaces the v1 `.rpt-top`/`.rpt-foot`)
3. `report_immersion.inject_section(html, ctx)` — Agent 4
Then main thread injects `<head>` includes + copies assets + calls `report_print.generate_print_html(...)`.

### ctx (dict) fields
```
num        : '01'..'21' or 'cover'
target     : emitted filename, e.g. '02-s12-data-foundation.html'
toc_title  : canonical section title
is_cover   : bool
sections   : [ {num,target,title}, ... ]  # ALL 21 in TOC order (for nav / TOC overlay / cover grid)
prev, next : {num,target,title} or None
assets_map : parsed assets-map.json (schema below)
assets_dir : 'assets'
```
Stages must be **idempotent-safe and defensive**: if `assets_map` has no entry for this section, inject nothing. Branch on `ctx['is_cover']`.

### `report_print.generate_print_html(emitted, base_ctx) -> str`
`emitted = [ {num,target,title,html}, ... ]` for cover + 21 in TOC order (final post-stage HTML). Return one print.html doc: shared `<head>` (print.css + minimal reset), each section's `.wrap` body concatenated, `page-break-before` per section, nav/scripts/animation stripped, page numbers via CSS counters if feasible. References the SAME `assets/` (relative paths — print.html sits in the bundle root). Text must stay selectable (no rasterization).

## Injection anchors (stable — compose without collision)
- **hero**: immediately after the first `</h1>`. Remove any pre-existing `<div class="hero-img">…</div>` first (the v1 hero), then inject the new treatment.
- **v1 chrome to replace**: `<div class="rpt-top"> … </div>` and `<div class="rpt-foot"> … </div>` (regex-match the whole element).
- **head includes** (main thread): before `</head>`.
- **cover TOC**: the v1 cover TOC lives in `.toc`/`.part` blocks inside `.wrap`; Agent 4 upgrades to a visual grid using `ctx['sections']` + `assets_map['heroes']` thumbnails.
- **§06 personas / §18-§19 drivers / §14 journey / §10 occasions / §11 roles**: Agent 1 inspects the real emitted structure and wires where there is a clean, unambiguous anchor; **HOLD (skip) where anchoring is fragile** and report what was placed vs held. No image is better than a wrong one.

## Canonical asset filenames (all agents use these EXACT names)
`assets/A01.webp … A16.webp` · `assets/B01.webp … B07.webp` · `assets/C01.webp … C09.webp` · `assets/P01.webp … P05.webp`
`assets/pampers.webp huggies.webp mamypoko.webp little-angels.webp lovingle.webp rspl.webp blustream.webp`

## `assets-map.json` schema (Agent 1 writes; must match the CONFIRMED mapping below)
```json
{
  "heroes":  {"cover":"A10","01":"A01","02":"A16","03":"A04","04":"A06","05":"A05","06":"A15","09":"A02","10":"A08","11":"A03","12":"A09","14":"A07","16":"A11","17":"A14","18":"A12","21":"A13"},
  "hero_alt":{"01":"...", "...":"..."},
  "personas":{"06":{"1":"P03","2":"P01","3":"P02","4":"P04","5":"P05"}},
  "persona_names":{"P01":"Anxious First-Timer","P02":"Confident Optimizer","P03":"Premium Skin-Safety Seeker","P04":"Value-Rational Switcher","P05":"Conscious Hybrid User"},
  "drivers":{"sections":["18","19"],"icons":{"softness":"B01","overnight_absorption":"B02","rash_skin_safety":"B03","leak_protection":"B04","fit":"B05","value_for_money":"B06","availability":"B07"}},
  "vectors":{"14":{"Trial":"C01","Repeat":"C02","Switch":"C03"},"10":{"Night":"C04","Day/Outing":"C05"},"11":{"Mother":"C06","Father":"C07","Grandparent":"C08","Maalish wali":"C09"}},
  "logos":{"pampers":"pampers","huggies":"huggies","mamypoko":"mamypoko","little-angels":"little-angels","lovingle":"lovingle","rspl":"rspl","blustream":"blustream"},
  "logo_sections":["17","18"]
}
```
`superbottoms, himalaya, bumtum, babyhug, supples` logos are NOT supplied → never referenced (text only). Sections `07,08,13,15,19,20` have NO hero.

## CONFIRMED asset → section mapping (Venkat GO)
Heroes: cover=A10 · 01=A01 · 02=A16 · 03=A04 · 04=A06 · 05=A05 · 06=A15 · 09=A02 · 10=A08 · 11=A03 · 12=A09 · 14=A07 · 16=A11 · 17=A14 · 18=A12 · 21=A13.
Personas → §06 cards: ①=P03 ②=P01 ③=P02 ④=P04 ⑤=P05.
Drivers B01–B07 → **both** §18 and §19. Vectors C01–C09 → §14 (Trial/Repeat/Switch), §10 (Night, Day/Outing), §11 (Mother/Father/Grandparent/Maalish). Logos → §17 + §18 + footer(rspl,blustream) + cover.

## Optimization budget (Agent 1)
A-series → WebP q80, max 1600w. B/C → WebP 640px. P → WebP q80, 900w. Logos → WebP lossless (alpha preserved). **`assets/` ≤ 8MB total.** Print a size table.
