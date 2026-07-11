# QA Harness — Register N-61 (Agent E)

The automated gate that runs **after every synthesis** and **before any export**.
It reads `section_outputs.content` (the exact jsonb the app renders — via the
committed share snapshot or a read-only Supabase SELECT), runs the register
checks, prints a pass/fail table keyed to register IDs, writes a JSON artifact,
and **exits non-zero on any FAIL** so it can gate exports in CI or a pre-export hook.

```bash
npm run qa:report                 # default: baby-diapers, committed snapshot
QA_PROJECT=baby-diapers npm run qa:report
QA_SOURCE=supabase   npm run qa:report   # read section_outputs live (read-only)
QA_OUT=.qa           npm run qa:report   # where the qa_report_<ts>.json lands
QA_N18_STRICT=1      npm run qa:report   # escalate the N-18 warn to a gating FAIL
```

## Data source (read-only)

The harness never re-synthesises. Precedence:

1. **`QA_SOURCE=supabase`** — a read-only `SELECT` on `section_outputs` (the same
   table `api/cache.ts` serves). Picks the newest `(evidence_hash, provider)`
   group that covers the whole template, mirroring `scripts/export-share-snapshot.ts`.
   Needs `SUPABASE_URL` + a `SUPABASE_*` key in the env. **SELECT only.**
2. **snapshot (default)** — `share/snapshot.<project>.json`, the credential-free
   serialization of those same rows that the read-only share deployment renders.
   Override with `QA_SNAPSHOT=<file>`.

## Checks

| ID | What it asserts | Method |
|----|-----------------|--------|
| N-02 | ≤5 verbatims per slide | max verbatim-bearing cards in any single sibling group |
| N-03 | cross-section repetition | 3-shingle containment ≥0.7 between insight sentences of different sections — **guards verbatim restatement only; thematic repetition remains a human review item** |
| N-07/N-09 | banned strings absent | `corpus`, `evidence graph`, `corpus is diaper`, `keyword-weighted`, `capsule` in client-facing copy (internal keys `prov`/`_*` skipped) |
| N-11 | basis where a % renders | section that renders a % must carry a basis/footnote field; `data_foundation` (the methodology section) is exempt |
| N-13 | coverage ≥75 | numeric coverage/`evidencePct` field; ≥80 pass · 75–80 warn · <75 fail · absent → fail |
| N-14 | verbatims ASCII-English or `(translated)` | flags non-Latin Indic script **or** ≥2 romanized-Indic tokens (Hinglish dict); typographic Unicode/emoji do **not** trip it |
| N-15 | S02 role %s sum to 100 ±1 | `family_roles_babycare`; warns when roles carry counts but no % |
| N-17 | %-ranked lists non-increasing (ties allowed) | structured `share_pct`/`pct`/… arrays + persona `pool_estimate` %s; equal consecutive values (e.g. trailing rounding-zeros) pass — only a strict increase fails |
| N-18 | margin-box PDF orientation upright | **DOM-in-print static check** — see below |
| N-53 | S18 no finding <5% | `shopping_search_terms` cluster share = `data_points` / section total |
| N-56 | no "% of corpus voices" | literal-phrase sweep |
| N-59 | S20 geo total == S15 geo total | sum of `regional_differences` region counts vs state counts parsed from `data_foundation` "Geographic tagging" |

### N-18 method (stated explicitly)

The PDF export (`components/report/ExportBar.tsx`) rasterises the report with
`html2canvas` + `jsPDF`, adding `.pdf-export` to the **clone only**, so the PDF
renders with screen CSS — **not** `@media print`. The margin-box band/tier labels
(`.bk-band-label span`, `.bk-tier-label span` in `styles/booklet.css`) are laid out
with `writing-mode: vertical-rl; transform: rotate(180deg)`, which html2canvas
rasterises unreliably. A true pixel assertion needs a headless browser (not
available offline), so this check statically verifies (a) the labels are
transform/writing-mode rotated and (b) whether a `.pdf-export` upright override
exists for the capture. No override → **WARN** (pixel-unverified; needs a visual
confirmation). `QA_N18_STRICT=1` escalates it to a gating **FAIL**.

## S-number map

Register S-numbers are 0-indexed into the template order
(`templates/baby_diapers_template.ts` → `docs/section_mapping_v2.md`):
`S02 = family_roles_babycare`, `S15 = regional_differences`,
`S18 = shopping_search_terms`, `S20 = data_foundation`. Verified against real
section content in the snapshot.

## Standing gate — operating note

This harness is the **standing export gate**: re-run `npm run qa:report` after
every synthesis and before any export. Flip `QA_N18_STRICT=1` (making N-18 a
gating FAIL) **once Agent D's N-18 fix is paper-verified** — until then N-18 stays
a WARN so it doesn't block on an unverified margin-box render.

## Baseline

`qa_report_baseline_jul6.json` is the committed acceptance run against the
current (Jul-6) sections: **50 FAIL / 2 WARN / 100 PASS**, gate = BLOCK, failing
registers `N-02, N-09, N-13, N-14, N-17, N-53, N-56, N-59` — proving the checks bite.
