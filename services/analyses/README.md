# New Analyses Layer (`services/analyses/`)

Deterministic, assemble-time analyses **N-15 … N-58** (Agent C). Pure, Node-safe,
no browser / LLM / DB / network deps — mirrors `services/ingestion/babyDiapersIngestion.ts`.

## Why it lives here and runs at assemble time
The assembled `EvidenceEventV1` is **lossy** — it drops `price`, `product`, `variant`,
`sku`, and fakes `lang` (`babyDiapersIngestion.ts:254,276`). Half the register needs exactly
those fields. So the layer runs over the **India-gated + windowed RAW ROWS** (the same input
the gate consumes), where those fields still exist. Its output is written to
`aggregations.analyses`, versioned by graph ID, so **synthesis and the UI read the same frozen
numbers** — never a string literal in a prompt. Full rationale: `ANALYSES-PHASE-A-REPORT.md`.

## Files
- `analysisTypes.ts` — the output contract (`{ value(s), n, basis, confidence, source_ids }`),
  `AnalysesBundleV1`, thresholds, input-row shape, the `INSUFFICIENT_SIGNAL` sentinel.
- `classifiers.ts` — pure text/field classifiers (caregiver role, lifestage, occasion, format,
  segment, channel, urgency, drivers, switch, mom-stage, pack-size, price, organic brand scan).
- `babyDiapersAnalyses.ts` — `computeBabyDiapersAnalyses(rows, ctx) → AnalysesBundleV1`.
- `register.ts` — canonical N-ID register + feasibility.

## The insufficient-signal law
Any cell below `MIN_CELL_N` carries the literal `"insufficient signal"` — never an invented
number. Any analysis whose backing field is absent (SKU/variant/structured price) is emitted as
`INSUFFICIENT` with an honest `basis`. This is enforced structurally: a below-threshold cell
*cannot* carry a value.

## Docking into the real `api/_lib/assemble.ts` (verified against that file)
The two-pass assemble builds `keptInputs` (kept rows per input) and PASS-2 `postGraph`
(`postGraph.events` is 1:1 positional to the flattened kept rows — the ingest is lossless, no
dedup, in order). It attaches gate outputs at `assemble.ts:307`
(`postGraph.aggregations = { ...postGraph.aggregations, gateAudit, trendMonthly }`). Add the
layer there — a positional zip; **no gate-decision plumbing needed** (the layer recomputes
datedness via the same `parseRowDate`):

```ts
import { computeBabyDiapersAnalyses } from "../../services/analyses/babyDiapersAnalyses.js";
import type { AnalysisInputRow } from "../../services/analyses/analysisTypes.js";

// flatten kept rows in event order, zip with postGraph.events (1:1, positional)
const flatKept = keptInputs.flatMap((inp) =>
  inp.rows.map((r) => ({ raw: r.raw, fieldMap: inp.mapping.canonicalFieldMap, sourceTag: inp.sourceTag })));
const analysisRows: AnalysisInputRow[] = (postGraph.events || []).map((event, i) => ({
  raw: flatKept[i].raw, fieldMap: flatKept[i].fieldMap, sourceTag: flatKept[i].sourceTag, event,
}));

postGraph.aggregations = {
  ...postGraph.aggregations,
  analyses: computeBabyDiapersAnalyses(analysisRows, {
    projectId, graphId: id, evidenceHash: postGraph.evidenceHash,
    assembledAtISO: new Date(nowMs).toISOString(),
    cutoffISO: cutoff.toISOString(), windowMonths: WINDOW_MONTHS, // the V-02 window
  }),
};
```

Then add one line to `types.ts` (currently owner-dirty — see BLOCKED-DECISIONS B-3):

```ts
// EvidenceGraph.aggregations:
analyses?: import('./services/analyses/analysisTypes').AnalysesBundleV1;
```

## Gates (do not cross without owner GO)
Computed **but not run** against production. No DB writes, no synthesis, no schema migration.
`n` and confidence are final only against the canonical post-FREEZE graph (BLOCKED-DECISIONS B-1).

## Local check (no prod)
`npx tsx scripts/analyses-smoke.ts` — runs the layer over synthetic rows and asserts the contract
+ the insufficient-signal law. Produces no report number.
