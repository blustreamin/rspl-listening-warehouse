/* ============================================================================
   LOCAL REPRO HARNESS — 11-Jul server-side assemble fix (V-01 India gate,
   V-02 date window, atomic persist).

   Run:  npx tsx scripts/repro-assemble.ts            (full: ~143k scale)
         npx tsx scripts/repro-assemble.ts --fast     (regression bundle only)

   Entirely in-memory. Drives the REAL runAssembly/assembleProject with
   synthetic datasets and a mock Supabase client — no network, no backend,
   no environment variables. Every synthetic row records the classification
   it was CONSTRUCTED to receive; the harness asserts the gate audit matches
   that constructed truth exactly, then exercises the persistence ordering
   (blob -> verify -> row LAST) and both induced failure paths.
   ============================================================================ */
import { runAssembly, assembleProject, AssembleError } from "../api/_lib/assemble.js";
import type { DatasetMeta } from "../api/_lib/assemble.js";

type Row = Record<string, any>;
type Truth = "IN_PLATFORM" | "IN_GEO" | "IN_SIGNAL" | "NON_IN" | "UNKNOWN_GLOBAL";

// Fixed clock so cutoffs are deterministic: cutoff = 2023-07-11, trend
// window = 2021-08 .. 2026-07.
const NOW_MS = Date.UTC(2026, 6, 11, 12, 0, 0);
const CUTOFF_MS = (() => { const d = new Date(NOW_MS); d.setUTCMonth(d.getUTCMonth() - 36); return d.getTime(); })();

// Deterministic PRNG (mulberry32) — reproducible runs.
const rng = (() => {
  let a = 0x9e3779b9;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

// Dates: 'inWindow' also feeds the trend series; 'preWindow' is before the
// 36-month cutoff; 'undated' has no parseable date; 'serialIn/serialPre'
// exercise the Excel-serial parser through the SAME gate path as the ingest.
const DATES = {
  inWindow: () => pick(["2024-03-15", "2025-01-20", "2025-11-02", "2023-09-30", "2026-05-14"]),
  preWindow: () => pick(["2022-01-15", "2021-06-10", "2020-11-05"]),
  undated: () => "",
  serialIn: () => "45500.25",   // ≈ 2024-07-27 (in window)
  serialPre: () => "41000.5",   // ≈ 2012-03-27 (pre window)
};

const IN_TEXTS = [
  "Best diaper brand in India for newborns, worth every rupee",
  "Ordered from Mumbai, delivery was quick and pants fit well",
  "बच्चे के लिए बहुत अच्छा डायपर है, रैशेज़ नहीं होते",
  "Price dropped to Rs 899 for the jumbo pack, great deal",
  "My pediatrician in Bengaluru recommended pant style diapers",
];
const GLOBAL_TEXTS = [
  "These diapers leak overnight every single time, switching brands",
  "Great absorbency and the wetness indicator is genuinely useful",
  "My toddler gets a rash with every other brand we have tried",
  "Subscribe and save makes these way cheaper per count",
  "The sizing runs small compared to the previous generation",
];
const SEA_QUERIES = ["nanaybeauty", "askph", "shopeeph", "adviceph", "bolehland", "malaysiababies", "singaporeparents"];
const NON_IN_GEOS = ["United States", "England", "Colorado", "Australia", "Philippines"];

interface SynthRow { raw: Row; truth: Truth; preWindow: boolean; dated: boolean; dateStr: string }
interface SynthDataset { meta: DatasetMeta; rows: SynthRow[] }

let dsCounter = 0;
const mkMeta = (name: string, tag: string, rowCount: number, columns: string[]): DatasetMeta => ({
  id: `00000000-0000-4000-8000-${String(++dsCounter).padStart(12, "0")}`,
  name, source_tag: tag, columns, row_count: rowCount,
  uploaded_at: new Date(NOW_MS - dsCounter * 60000).toISOString(),
  storage_path: `synth/${name}.json`,
});

// --- commerce (amazon/flipkart/firstcry): always IN_PLATFORM; only the date
// window can drop these rows.
const commerceDataset = (tag: "amazon" | "flipkart" | "firstcry", n: number, preWindowShare: number): SynthDataset => {
  const rows: SynthRow[] = [];
  for (let i = 0; i < n; i++) {
    const pre = rng() < preWindowShare;
    const undated = !pre && rng() < 0.2;
    const dateStr = pre ? (rng() < 0.3 ? DATES.serialPre() : DATES.preWindow())
      : undated ? "" : (rng() < 0.3 ? DATES.serialIn() : DATES.inWindow());
    rows.push({
      raw: {
        reviewDescription: pick(GLOBAL_TEXTS),
        reviewText: pick(GLOBAL_TEXTS),
        rating: String(1 + Math.floor(rng() * 5)),
        date: dateStr,
        reviewerName: `user_${i}`,
        productTitle: "Lovingle Baby Diaper Pants M 72",
      },
      truth: "IN_PLATFORM", preWindow: pre, dated: !undated, dateStr,
    });
  }
  const cols = ["reviewDescription", "reviewText", "rating", "date", "reviewerName", "productTitle"];
  return { meta: mkMeta(`${tag}_${dsCounter + 1}`, tag, n, cols), rows };
};

// --- awario (global social): mixes all five classes via Country/text/url.
const awarioDataset = (n: number): SynthDataset => {
  const rows: SynthRow[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    let truth: Truth; const raw: Row = {
      "Post Snippet": pick(GLOBAL_TEXTS), Title: "", "Author Name": `handle_${i}`,
      Source: pick(["YouTube", "Twitter", "Vimeo"]), "Mention URL": "https://youtube.com/watch?v=x", Country: "",
    };
    if (r < 0.30) { truth = "IN_GEO"; raw.Country = pick(["India", "india"]); }
    else if (r < 0.42) { truth = "NON_IN"; raw.Country = pick(NON_IN_GEOS); }
    else if (r < 0.70) {
      truth = "IN_SIGNAL";
      if (rng() < 0.5) raw["Post Snippet"] = pick(IN_TEXTS);
      else raw["Mention URL"] = "https://www.amazon.in/product-reviews/B0XYZ";
    } else { truth = "UNKNOWN_GLOBAL"; }
    const kept = truth === "IN_GEO" || truth === "IN_SIGNAL";
    const pre = kept && rng() < 0.12;
    const undated = !pre && rng() < 0.25;
    const dateStr = pre ? DATES.preWindow() : undated ? "" : DATES.inWindow();
    raw["Mention Date"] = dateStr;
    rows.push({ raw, truth, preWindow: pre, dated: !undated, dateStr });
  }
  const cols = ["Post Snippet", "Title", "Author Name", "Source", "Mention URL", "Country", "Mention Date"];
  return { meta: mkMeta(`awario_${dsCounter + 1}`, "awario", n, cols), rows };
};

// --- 'other' (Reddit/Quora/forums): SEA rule, India signals, score column
// (must NOT enter ratings after the 11-Jul heuristic fix), undated rows.
const otherDataset = (n: number): SynthDataset => {
  const rows: SynthRow[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    let truth: Truth; const raw: Row = {
      platform: pick(["Reddit", "Quora", "Community Forum"]), content_type: "post",
      author: `u_${i}`, title: "", text: pick(GLOBAL_TEXTS),
      url: "https://reddit.com/r/daddit/x", score: String(1 + Math.floor(rng() * 5)),
      source_query: "r/daddit",
    };
    if (r < 0.18) { truth = "NON_IN"; raw.platform = "Reddit"; raw.source_query = pick(SEA_QUERIES); raw.text = pick(IN_TEXTS); /* SEA overrides India signal */ }
    else if (r < 0.28) { truth = "IN_PLATFORM"; raw.platform = pick(["Parentune", "IndusLadies", "IndiaParenting"]); }
    else if (r < 0.66) { truth = "IN_SIGNAL"; raw.text = pick(IN_TEXTS); }
    else { truth = "UNKNOWN_GLOBAL"; }
    const kept = truth !== "NON_IN" && truth !== "UNKNOWN_GLOBAL";
    const pre = kept && rng() < 0.10;
    const undated = !pre && rng() < 0.30;
    const dateStr = pre ? DATES.preWindow() : undated ? "" : DATES.inWindow();
    raw.date = dateStr;
    rows.push({ raw, truth, preWindow: pre, dated: !undated, dateStr });
  }
  const cols = ["platform", "content_type", "date", "author", "title", "text", "url", "score", "source_query"];
  return { meta: mkMeta(`other_${dsCounter + 1}`, "other", n, cols), rows };
};

// ---------------------------------------------------------------------------
const normalizeTag = (t: string): string => {
  const s = t.toLowerCase();
  if (s.includes("amazon")) return "amazon";
  if (s.includes("flipkart")) return "flipkart";
  if (s.includes("firstcry")) return "firstcry";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("facebook")) return "facebook";
  return "social";
};

let failures = 0;
const check = (cond: boolean, label: string, detail?: unknown) => {
  if (cond) { console.log(`  ✓ ${label}`); }
  else { failures++; console.error(`  ✗ FAIL ${label}`, detail ?? ""); }
};

async function runScenario(name: string, datasets: SynthDataset[]) {
  console.log(`\n=== ${name} ===`);
  const totalRows = datasets.reduce((s, d) => s + d.rows.length, 0);

  // Constructed truth tallies.
  const truthGeo: Record<Truth, number> = { IN_PLATFORM: 0, IN_GEO: 0, IN_SIGNAL: 0, NON_IN: 0, UNKNOWN_GLOBAL: 0 };
  let truthPreWindow = 0, truthUndatedKept = 0, truthDatedKept = 0;
  const truthByTagPost: Record<string, number> = {};
  for (const d of datasets) {
    const tag = normalizeTag(d.meta.source_tag || "other");
    for (const r of d.rows) {
      truthGeo[r.truth]++;
      const geoKept = r.truth === "IN_PLATFORM" || r.truth === "IN_GEO" || r.truth === "IN_SIGNAL";
      if (!geoKept) continue;
      if (r.preWindow) { truthPreWindow++; continue; }
      if (r.dated) truthDatedKept++; else truthUndatedKept++;
      truthByTagPost[tag] = (truthByTagPost[tag] || 0) + 1;
    }
  }
  const truthKept = truthGeo.IN_PLATFORM + truthGeo.IN_GEO + truthGeo.IN_SIGNAL - truthPreWindow;

  const rowsById = new Map(datasets.map((d) => [d.meta.id, d.rows.map((r) => r.raw)]));
  const t0 = performance.now();
  const heap0 = process.memoryUsage().heapUsed;
  const { graph, audit, preGateCount, keptCount } = await runAssembly(
    "baby-diapers",
    datasets.map((d) => d.meta),
    async (d) => rowsById.get(d.id)!,
    NOW_MS
  );
  const elapsed = Math.round(performance.now() - t0);
  const heapMB = Math.round((process.memoryUsage().heapUsed - heap0) / 1048576);
  const blob = Buffer.from(JSON.stringify(graph.events || []), "utf-8");
  console.log(`  rows=${totalRows.toLocaleString()} preGate=${preGateCount.toLocaleString()} kept=${keptCount.toLocaleString()} | ${elapsed}ms, Δheap=${heapMB}MB, blob=${(blob.length / 1048576).toFixed(1)}MB`);

  // (a) pre-gate reconstruction is lossless and reconciles.
  check(preGateCount === totalRows, `pre-gate == generated rows (${totalRows})`, { preGateCount });
  // (b) gate audit matches constructed truth EXACTLY, class by class.
  check(audit.geoClass.kept.IN_PLATFORM === truthGeo.IN_PLATFORM, `IN_PLATFORM ${truthGeo.IN_PLATFORM}`, audit.geoClass.kept);
  check(audit.geoClass.kept.IN_GEO === truthGeo.IN_GEO, `IN_GEO ${truthGeo.IN_GEO}`, audit.geoClass.kept);
  check(audit.geoClass.kept.IN_SIGNAL === truthGeo.IN_SIGNAL, `IN_SIGNAL ${truthGeo.IN_SIGNAL}`, audit.geoClass.kept);
  check(audit.geoClass.dropped.NON_IN === truthGeo.NON_IN, `NON_IN dropped ${truthGeo.NON_IN}`, audit.geoClass.dropped);
  check(audit.geoClass.dropped.UNKNOWN_GLOBAL === truthGeo.UNKNOWN_GLOBAL, `UNKNOWN_GLOBAL dropped ${truthGeo.UNKNOWN_GLOBAL}`, audit.geoClass.dropped);
  check(audit.dateWindow.droppedPreWindow === truthPreWindow, `pre-window dropped ${truthPreWindow}`, audit.dateWindow);
  check(audit.dateWindow.undatedKept === truthUndatedKept, `undated KEPT ${truthUndatedKept}`, audit.dateWindow);
  check(audit.dateWindow.datedKept === truthDatedKept, `dated kept ${truthDatedKept}`, audit.dateWindow);
  // (c) exact consistency: postGate == preGate - audited exclusions.
  check(keptCount === truthKept && audit.postGate.total === keptCount,
    `postGate == preGate - exclusions (${truthKept})`, { keptCount, post: audit.postGate.total });
  for (const [tag, n] of Object.entries(truthByTagPost)) {
    check((audit.postGate.byTag[tag] || 0) === n, `postGate byTag ${tag} == ${n}`, audit.postGate.byTag);
  }
  // Score column must NOT reach ratings ('other' datasets carry score 1-5;
  // only commerce 'rating' columns may count).
  const commercePostGate = Object.entries(truthByTagPost)
    .filter(([t]) => ["amazon", "flipkart", "firstcry"].includes(t))
    .reduce((s, [, n]) => s + n, 0);
  const rs = graph.aggregations?.ratingSummary;
  check((rs?.count || 0) <= commercePostGate, `ratingSummary.count (${rs?.count}) <= commerce post-gate (${commercePostGate}) — no score pollution`, rs);
  if (commercePostGate === 0) check((rs?.count || 0) === 0, "zero ratings on social-only corpus (score not mapped)", rs);
  // Trend series shape + sum == dated geo-kept rows inside the 60-month range
  // (pre-window rows from 2020-2022 ARE in range: trend is date-UNwindowed).
  const trend = graph.aggregations?.trendMonthly;
  const trendStart = (() => { const d = new Date(NOW_MS); d.setUTCMonth(d.getUTCMonth() - 59); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d.getTime(); })();
  let truthTrend = 0;
  for (const d of datasets) for (const r of d.rows) {
    const geoKept = r.truth !== "NON_IN" && r.truth !== "UNKNOWN_GLOBAL";
    if (!geoKept || !r.dated || !r.dateStr) continue;
    const ms = /^\d+(\.\d+)?$/.test(r.dateStr)
      ? Date.UTC(1899, 11, 30) + Math.round(parseFloat(r.dateStr) * 86400000)
      : new Date(r.dateStr).getTime();
    if (ms >= trendStart && ms <= NOW_MS) truthTrend++;
  }
  check(trend?.series.length === 60, "trend series has 60 months", trend?.series.length);
  const trendSum = (trend?.series || []).reduce((s, m) => s + m.count, 0);
  check(trendSum === truthTrend, `trend sum ${trendSum} == dated geo-kept in range ${truthTrend}`);
  check(!!graph.aggregations?.gateAudit, "gateAudit attached to aggregations");
  check(((graph as any).__datasetIds || []).length === datasets.length, "graph carries all dataset ids");
  // Analyses layer (AMENDMENT v2): versioned bundle present over the kept corpus.
  const an = graph.aggregations?.analyses;
  check(an?.version === "analyses_v1", "aggregations.analyses present (analyses_v1)", an?.version);
  check(an?.corpusN === keptCount, `analyses.corpusN == post-gate kept (${keptCount})`, an?.corpusN);
  check(Object.keys(an?.analyses || {}).length > 0, "analyses bundle carries N-ID outputs");
  return { graph, audit };
}

// --------------------------------------------------------------------------
// Mock Supabase client: in-memory registry + storage + table, records the op
// order so the harness can assert the row insert is LAST, and supports
// induced failures.
function mockAdmin(datasets: SynthDataset[], opts: { failUpload?: boolean; failInsert?: boolean } = {}) {
  const ops: string[] = [];
  const storage: Record<string, Buffer> = {};
  for (const d of datasets) {
    storage[d.meta.storage_path!] = Buffer.from(JSON.stringify(d.rows.map((r) => r.raw)));
  }
  const inserted: any[] = [];
  const removed: string[] = [];
  const metas = datasets.map((d) => ({ ...d.meta }));

  const datasetQuery = () => {
    let ids: string[] | null = null;
    const builder: any = {
      eq: () => builder,
      in: (_col: string, v: string[]) => { ids = v; return builder; },
      then: (resolve: any) =>
        resolve({ data: metas.filter((m) => !ids || ids.includes(m.id)), error: null }),
    };
    return builder;
  };

  const admin: any = {
    from: (table: string) => ({
      select: () => (table === "datasets" ? datasetQuery() : undefined),
      insert: (row: any) => ({
        select: () => ({
          maybeSingle: async () => {
            ops.push("insert");
            if (opts.failInsert) return { data: null, error: { message: "induced insert failure" } };
            inserted.push(row);
            return { data: { id: row.id }, error: null };
          },
        }),
      }),
    }),
    storage: {
      getBucket: async () => ({ data: { id: "warehouse-datasets" }, error: null }),
      createBucket: async () => ({ error: null }),
      from: () => ({
        download: async (path: string) => {
          ops.push(`download:${path}`);
          const buf = storage[path];
          return buf
            ? { data: { text: async () => buf.toString("utf-8") }, error: null }
            : { data: null, error: { message: "not found" } };
        },
        upload: async (path: string, bytes: Buffer) => {
          ops.push("upload");
          if (opts.failUpload) return { error: { message: "induced upload failure" } };
          storage[path] = Buffer.from(bytes);
          return { error: null };
        },
        list: async (_dir: string, o: any) => {
          ops.push("list");
          const hits = Object.keys(storage)
            .filter((p) => p.includes(o?.search || ""))
            .map((p) => ({ name: p.split("/").pop(), metadata: { size: storage[p].length } }));
          return { data: hits, error: null };
        },
        remove: async (paths: string[]) => { ops.push("remove"); removed.push(...paths); paths.forEach((p) => delete storage[p]); return { error: null }; },
        getBucket: async () => ({ data: { id: "warehouse-datasets" }, error: null }),
        createBucket: async () => ({ error: null }),
      }),
    },
  };
  return { admin, ops, inserted, removed, metas };
}

// --- Handcrafted gate edge cases, one per review finding. Truth encodes the
// FIXED behavior (author-location break, homonym veto, trailing-punct URLs,
// text-rescue parity, SEA 'indonesia', BabyChakra platform).
const edgeCaseDatasets = (): SynthDataset[] => {
  const mk = (raw: Row, truth: Truth, dateStr: string, preWindow: boolean): SynthRow =>
    ({ raw, truth, preWindow, dated: !!dateStr, dateStr });
  const otherRows: SynthRow[] = [
    // author_location non-India must NOT short-circuit to NON_IN: India text wins
    mk({ platform: "Quora", author: "u1", title: "", text: "shipping Pampers pants to my sister in Mumbai", url: "", score: "3", source_query: "diapers", author_location: "Dubai", date: DATES.inWindow() }, "IN_SIGNAL", "x", false),
    // ...and with no other signal it lands UNKNOWN_GLOBAL, not NON_IN
    mk({ platform: "Quora", author: "u2", title: "", text: GLOBAL_TEXTS[0], url: "", score: "2", source_query: "diapers", author_location: "Dubai", date: DATES.inWindow() }, "UNKNOWN_GLOBAL", "x", false),
    // trailing sentence punctuation must not defeat the .in host check
    mk({ platform: "Reddit", author: "u3", title: "", text: "Deal here: https://www.amazon.in/dp/B0XYZ.", url: "", score: "4", source_query: "r/india_deals_x", date: DATES.inWindow() }, "IN_SIGNAL", "x", false),
    // text living in an unmapped fallback column ('caption') must still be seen
    mk({ platform: "Reddit", author: "u4", title: "", caption: "best diaper brand in India hands down", url: "", score: "1", source_query: "r/daddit", date: DATES.inWindow() }, "IN_SIGNAL", "x", false),
    // SEA typo token: r/indonesia is SEA -> NON_IN even with India text
    mk({ platform: "Reddit", author: "u5", title: "", text: IN_TEXTS[0], url: "", score: "5", source_query: "r/indonesia", date: DATES.inWindow() }, "NON_IN", "x", false),
    // SEA precedence over India signal (owner rule)
    mk({ platform: "Reddit", author: "u6", title: "", text: IN_TEXTS[1], url: "", score: "3", source_query: "nanaybeauty", date: DATES.inWindow() }, "NON_IN", "x", false),
    // BabyChakra is NOT an IN_PLATFORM token (owner decision 11-Jul): a
    // signal-less BabyChakra row conservatively drops...
    mk({ platform: "BabyChakra", author: "u7", title: "", text: GLOBAL_TEXTS[1], url: "", score: "2", source_query: "", date: DATES.inWindow() }, "UNKNOWN_GLOBAL", "x", false),
    // ...while one carrying its own India signal stays via IN_SIGNAL.
    mk({ platform: "BabyChakra", author: "u9", title: "", text: IN_TEXTS[3], url: "", score: "4", source_query: "", date: DATES.inWindow() }, "IN_SIGNAL", "x", false),
    // Devanagari content on a global platform
    mk({ platform: "Reddit", author: "u8", title: "", text: "यह डायपर बहुत अच्छा है", url: "", score: "4", source_query: "r/daddit", date: "" }, "IN_SIGNAL", "", false),
  ];
  const awarioRows: SynthRow[] = [
    // Pakistani homonyms must veto the India gazetteer match
    mk({ "Post Snippet": GLOBAL_TEXTS[2], Title: "", "Author Name": "a1", Source: "YouTube", "Mention URL": "https://youtube.com/1", Country: "Hyderabad, Pakistan", "Mention Date": DATES.inWindow() }, "NON_IN", "x", false),
    mk({ "Post Snippet": GLOBAL_TEXTS[3], Title: "", "Author Name": "a2", Source: "Twitter", "Mention URL": "https://x.com/2", Country: "Lahore, Punjab", "Mention Date": DATES.inWindow() }, "NON_IN", "x", false),
    // ...while the bare homonym stays India (majority assumption, documented)
    mk({ "Post Snippet": GLOBAL_TEXTS[4], Title: "", "Author Name": "a3", Source: "YouTube", "Mention URL": "https://youtube.com/3", Country: "Hyderabad", "Mention Date": DATES.inWindow() }, "IN_GEO", "x", false),
    // geo-kept but pre-window -> date-window drop
    mk({ "Post Snippet": GLOBAL_TEXTS[0], Title: "", "Author Name": "a4", Source: "YouTube", "Mention URL": "https://youtube.com/4", Country: "India", "Mention Date": DATES.preWindow() }, "IN_GEO", "pre", true),
  ];
  // Fix dated flags: 'x' marker above means dated in-window; recompute cleanly.
  const fixDates = (rows: SynthRow[]) => rows.map((r) => {
    const dateStr = r.preWindow ? DATES.preWindow() : (r.dateStr === "" ? "" : DATES.inWindow());
    const key = "Mention Date" in r.raw ? "Mention Date" : "date";
    r.raw[key] = dateStr;
    return { ...r, dateStr, dated: !!dateStr };
  });
  const o = fixDates(otherRows);
  const a = fixDates(awarioRows);
  return [
    { meta: mkMeta("edge_other", "other", o.length, ["platform", "date", "author", "title", "text", "caption", "url", "score", "source_query", "author_location"]), rows: o },
    { meta: mkMeta("edge_awario", "awario", a.length, ["Post Snippet", "Title", "Author Name", "Source", "Mention URL", "Country", "Mention Date"]), rows: a },
  ];
};

async function main() {
  const fast = process.argv.includes("--fast");

  // --- Scenario 0: handcrafted edge cases (one per review finding).
  dsCounter = 500;
  await runScenario("GATE EDGE CASES (review findings)", edgeCaseDatasets());

  // --- Scenario 0b: month-end trend window (review finding: setUTCMonth
  // before setUTCDate shifted the 60-month window forward on month-end days).
  {
    const nowEom = Date.UTC(2026, 0, 31, 12); // Jan 31 — the pathological day
    dsCounter = 600;
    const ds = commerceDataset("amazon", 5, 0);
    // Pin one dated row into what must be the FIRST bucket (2021-02).
    ds.rows.forEach((r, i) => {
      const dateStr = i === 0 ? "2021-02-15" : "2025-06-15";
      r.raw.date = dateStr;
      (r as any).dateStr = dateStr; r.dated = true;
      r.preWindow = new Date(dateStr).getTime() < Date.UTC(2023, 0, 31, 12);
    });
    const { graph } = await runAssembly("baby-diapers", [ds.meta],
      async () => ds.rows.map((r) => r.raw), nowEom);
    const series = graph.aggregations?.trendMonthly?.series || [];
    console.log("\n=== MONTH-END TREND WINDOW (nowMs = 2026-01-31) ===");
    check(series.length === 60, "60 buckets at month-end assemble");
    check(series[0]?.month === "2021-02", `first bucket is 2021-02 (got ${series[0]?.month})`);
    check(series[59]?.month === "2026-01", `last bucket is the current month 2026-01 (got ${series[59]?.month})`);
    check(series[0]?.count === 1, `2021-02 row counted in the first bucket (got ${series[0]?.count})`);
  }

  // --- Scenario 1: canonical-shaped regression bundle (~1.4k, 'other' only).
  dsCounter = 0;
  const regression = [otherDataset(285), otherDataset(128), otherDataset(996)];
  await runScenario("REGRESSION ~1.4k ('other' Reddit/Quora bundle)", regression);

  // --- Scenario 2: 143k-scale mixed corpus.
  if (!fast) {
    dsCounter = 100;
    const scale: SynthDataset[] = [];
    for (let i = 0; i < 8; i++) scale.push(commerceDataset("amazon", 5200, 0.08));
    for (let i = 0; i < 7; i++) scale.push(commerceDataset("flipkart", 5000, 0.08));
    for (let i = 0; i < 4; i++) scale.push(commerceDataset("firstcry", 2600, 0.05));
    for (let i = 0; i < 12; i++) scale.push(awarioDataset(3400));
    for (let i = 0; i < 6; i++) scale.push(otherDataset(2200));
    await runScenario(`SCALE ~${scale.reduce((s, d) => s + d.rows.length, 0).toLocaleString()} rows`, scale);
  }

  // --- Scenario 3: end-to-end persist ordering via assembleProject (mock client).
  console.log("\n=== E2E persist (mock Supabase client) ===");
  dsCounter = 300;
  const e2e = [otherDataset(400), awarioDataset(300), commerceDataset("amazon", 500, 0.05)];
  {
    const { admin, ops, inserted } = mockAdmin(e2e);
    const res = await assembleProject(admin, { project_id: "baby-diapers" });
    check(res.ok === true, "assemble returns ok");
    check(inserted.length === 1, "exactly one graph row inserted");
    check(ops[ops.length - 1] === "insert", "row insert is the LAST operation", ops.slice(-4));
    check(ops.indexOf("upload") < ops.indexOf("list") && ops.indexOf("list") < ops.indexOf("insert"),
      "order: upload -> verify(list) -> insert");
    check((inserted[0].dataset_ids || []).length === 3, "row carries dataset_ids for all assembled datasets");
    check(inserted[0].event_count === res.event_count, "row event_count matches response");
    check(typeof res.evidence_hash === "string" && res.evidence_hash.length === 40, "40-hex evidence hash");
    check(!!inserted[0].aggregations?.gateAudit, "row aggregations carry gateAudit");
    // AMENDMENT v2: the persisted analyses bundle is versioned by the exact
    // graph row and evidence hash it shipped with.
    const rowAnalyses = inserted[0].aggregations?.analyses;
    check(rowAnalyses?.version === "analyses_v1", "row aggregations carry analyses bundle");
    check(rowAnalyses?.graphId === inserted[0].id, "analyses.graphId == inserted row id", { graphId: rowAnalyses?.graphId, rowId: inserted[0].id });
    check(rowAnalyses?.evidenceHash === res.evidence_hash, "analyses.evidenceHash == row evidence_hash", { bundle: rowAnalyses?.evidenceHash, row: res.evidence_hash });
    check(rowAnalyses?.corpusN === res.event_count, "analyses.corpusN == persisted event_count");
  }
  // Induced upload failure -> AssembleError, NO row.
  {
    const { admin, inserted } = mockAdmin(e2e, { failUpload: true });
    let err: any = null;
    try { await assembleProject(admin, { project_id: "baby-diapers" }); } catch (e) { err = e; }
    check(err instanceof AssembleError && err.statusCode === 500 && err.message === "events_blob_upload_failed",
      "induced upload failure -> AssembleError 500", err?.message);
    check(inserted.length === 0, "no row inserted on upload failure");
  }
  // Induced insert failure -> AssembleError + blob cleaned up.
  {
    const { admin, removed } = mockAdmin(e2e, { failInsert: true });
    let err: any = null;
    try { await assembleProject(admin, { project_id: "baby-diapers" }); } catch (e) { err = e; }
    check(err instanceof AssembleError && err.message === "graph_row_insert_failed",
      "induced insert failure -> AssembleError 500", err?.message);
    check(removed.length === 1 && removed[0].includes("/evidence/"), "orphan blob removed on insert failure", removed);
  }
  // Explicit dataset_ids: subset works, unknown id -> 400.
  {
    const { admin, inserted } = mockAdmin(e2e);
    const res = await assembleProject(admin, { project_id: "baby-diapers", dataset_ids: [e2e[0].meta.id, e2e[2].meta.id] });
    check(res.dataset_count === 2 && inserted[0].dataset_ids.length === 2, "explicit dataset_ids subset assembles");
    let err: any = null;
    try { await assembleProject(admin, { project_id: "baby-diapers", dataset_ids: ["11111111-0000-4000-8000-000000000000"] }); }
    catch (e) { err = e; }
    check(err instanceof AssembleError && err.statusCode === 400 && err.message === "unknown_dataset_ids",
      "unknown dataset id -> 400");
  }
  // Reconciliation guard: inflate registry row_count -> 422, nothing persisted.
  {
    const { admin, metas, inserted } = mockAdmin(e2e);
    metas.forEach((m) => { m.row_count = Math.round((m.row_count || 0) * 1.15); });
    let err: any = null;
    try { await assembleProject(admin, { project_id: "baby-diapers" }); } catch (e) { err = e; }
    check(err instanceof AssembleError && err.statusCode === 422 && err.message === "pre_gate_reconciliation_failed",
      "inflated registry -> 422 reconciliation failure", err?.message);
    check(inserted.length === 0, "no row inserted on reconciliation failure");
  }
  // Unsupported (non-lossless) project -> 400.
  {
    const { admin } = mockAdmin(e2e);
    let err: any = null;
    try { await assembleProject(admin, { project_id: "adult-diapers" }); } catch (e) { err = e; }
    check(err instanceof AssembleError && err.statusCode === 400 && err.message === "assemble_unsupported_project",
      "non-lossless project refused with 400");
  }

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("HARNESS CRASH", e); process.exit(1); });
