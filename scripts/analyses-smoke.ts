/* Synthetic smoke test for the New Analyses layer. No DB, no LLM, no network.
 * Fabricated rows only — produces NO report number. Run: npx tsx scripts/analyses-smoke.ts */
import { computeBabyDiapersAnalyses } from '../services/analyses/babyDiapersAnalyses';
import { INSUFFICIENT_SIGNAL } from '../services/analyses/analysisTypes';
import type { AnalysisInputRow } from '../services/analyses/analysisTypes';
import { EXPECTED_ANALYSIS_IDS } from '../services/analyses/register';

const FIELD_MAP = { text: 'text', brand: 'brand', product: 'product', variant: 'variant', price: 'price', rating: 'rating', createdAtISO: 'date', state: 'state', language: 'lang' };

const TEXTS = [
  { t: 'My newborn had a rash with Pampers, switched from Pampers to MamyPoko at night, no leak now', brand: 'MamyPoko', rating: 5, state: 'Maharashtra', price: '399', product: 'MamyPoko Pants 72 pcs' },
  { t: 'Dadi insists on langot at home during summer, we use tape diapers only for travel', brand: 'Huggies', rating: 4, state: 'Delhi', price: '', product: '' },
  { t: 'As a first time mom I bought Huggies pant from Amazon, soft and good absorption', brand: 'Huggies', rating: 5, state: 'Karnataka', price: '499', product: 'Huggies Wonder Pants' },
  { t: 'My 6 month old crawler, husband changes diaper at daycare, ran out so ordered from blinkit urgently', brand: 'Supples', rating: 3, state: 'Telangana', price: '99', product: 'Supples 40 count' },
  { t: 'maalish wali suggested Bumtum, value for money, repeat buy every month from kirana', brand: 'Bumtum', rating: 4, state: 'Uttar Pradesh', price: '', product: '' },
  { t: 'second baby now, potty training my toddler, wetness indicator helps a lot', brand: 'Pampers', rating: 5, state: 'Tamil Nadu', price: '', product: '' },
  { t: 'Little Angels pant too costly, expensive, prefer cloth to save money, avoid diapers in monsoon', brand: 'Little Angels', rating: 2, state: 'West Bengal', price: '', product: '' },
  { t: 'grandmother recommends, breathable and no rash, my 3 months old infant sleeps all night', brand: 'MamyPoko', rating: 5, state: 'Gujarat', price: '', product: '' },
];

const rows: AnalysisInputRow[] = [];
let i = 0;
for (let k = 0; k < 60; k++) {
  for (const s of TEXTS) {
    const dateMs = Date.UTC(2024 + (k % 2), (i % 12), 1 + (i % 27));
    rows.push({
      raw: { text: s.t, brand: s.brand, product: s.product, price: s.price, rating: String(s.rating), date: new Date(dateMs).toISOString(), state: s.state, lang: 'en' },
      fieldMap: FIELD_MAP as any,
      sourceTag: i % 3 === 0 ? 'amazon' : i % 3 === 1 ? 'flipkart' : 'instagram',
      event: {
        evidenceId: `bd_${i}`,
        eventType: i % 3 === 2 ? 'SOCIAL_MENTION' : 'COMMERCE_REVIEW',
        sourceTag: i % 3 === 0 ? 'amazon' : i % 3 === 1 ? 'flipkart' : 'instagram',
        content: { text: s.t, platform: i % 3 === 0 ? 'Amazon' : i % 3 === 1 ? 'Flipkart' : 'Instagram' },
        commerce: { brand: s.brand, rating: s.rating, platform: i % 3 === 0 ? 'Amazon' : 'Flipkart' },
        geo: { country: 'IN', state: s.state },
        time: { createdAtISO: new Date(dateMs).toISOString() },
        derived: { tokens: s.product.toLowerCase().includes('pant') ? ['style:pant_disposable'] : [] },
      } as any,
      // half the rows carry no gate → exercises the real docking path
      // (datednessOf recomputes from raw.date via parseRowDate, positional zip)
      ...(i % 2 === 0 ? { gate: { dated: true, dateMs, geoClass: 'IN_GEO' as const } } : {}),
    });
    i++;
  }
}

const bundle = computeBabyDiapersAnalyses(rows, {
  projectId: 'baby-diapers', graphId: 'SMOKE', assembledAtISO: new Date(0).toISOString(),
  cutoffISO: new Date(Date.UTC(2023, 0, 1)).toISOString(), windowMonths: 36,
});

const fail: string[] = [];
const assert = (c: boolean, msg: string) => { if (!c) fail.push(msg); };

assert(bundle.version === 'analyses_v1', 'version');
assert(bundle.corpusN === rows.length, `corpusN ${bundle.corpusN} !== ${rows.length}`);

// every expected id present
for (const id of EXPECTED_ANALYSIS_IDS) assert(!!bundle.analyses[id], `missing analysis ${id}`);

// contract + insufficient-signal law: no cell may carry a number below MIN_CELL_N
const MIN = bundle.meta.thresholds.MIN_CELL_N;
const walk = (o: any) => {
  if (!o) return;
  assert(typeof o.basis === 'string' && o.basis.length > 0, `${o.id} missing basis`);
  assert(Array.isArray(o.source_ids), `${o.id} missing source_ids`);
  assert(typeof o.confidence === 'string', `${o.id} missing confidence`);
  for (const c of o.values || []) {
    if (c.kind === 'count') continue; // census counts (series/coverage) are exempt from the estimate-masking law
    if (typeof c.value === 'number') assert(c.n >= MIN, `${o.id}/${c.label} numeric estimate with n=${c.n} < MIN_CELL_N ${MIN} (FABRICATION)`);
    if (c.n < MIN) assert(c.value === INSUFFICIENT_SIGNAL, `${o.id}/${c.label} thin estimate not masked (n=${c.n})`);
  }
  for (const sp of Object.values(o.splits || {})) for (const sub of Object.values(sp as any)) walk(sub);
};
for (const o of Object.values(bundle.analyses)) walk(o);

// blocked analyses must be insufficient
for (const id of ['N-35', 'N-36', 'N-44']) assert(bundle.analyses[id].confidence === 'INSUFFICIENT', `${id} should be INSUFFICIENT`);

// N-15 caregiver roles should have fired (father, dadi, maalish wali, grandmother all present)
assert((bundle.analyses['N-15'].values || []).length >= 3, 'N-15 too few roles detected');

// N-27 seasonality should be a month series
assert((bundle.analyses['N-27'].values || []).length > 0, 'N-27 empty series');

console.log(`analyses: ${Object.keys(bundle.analyses).length} · corpusN ${bundle.corpusN}`);
console.log(`N-15 roles: ${bundle.analyses['N-15'].values.map((v: any) => `${v.label}=${v.value}`).join(', ')}`);
console.log(`N-37 note: ${bundle.analyses['N-37'].note || bundle.analyses['N-37'].values[0]?.note}`);
console.log(`warnings: ${bundle.meta.warnings.join(' | ')}`);
if (fail.length) { console.error(`\nSMOKE FAIL (${fail.length}):`); for (const f of fail) console.error(' - ' + f); process.exit(1); }
console.log('\nSMOKE PASS — contract + insufficient-signal law hold on synthetic data.');
