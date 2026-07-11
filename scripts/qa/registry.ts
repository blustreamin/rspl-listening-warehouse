/* ============================================================================
   RSPL Warehouse — QA Harness · shared registry & constants
   Register: N-61 (Agent E). This module is the single source of truth for the
   section ordering, the S-number → section-id map, the banned-copy lists, and
   the romanized-Indic heuristic dictionary the checks lean on.

   Section order mirrors templates/baby_diapers_template.ts:148-170 EXACTLY and
   is 0-indexed to match the "new section" numbering in docs/section_mapping_v2.md
   (exec_summary = S00 … data_foundation = S20). The register's S-numbers
   (S02/S15/S18/S20) are 0-indexed into this array — verified against the actual
   section content shapes in share/snapshot.baby-diapers.json.
   ============================================================================ */

export type Status = 'PASS' | 'WARN' | 'FAIL';

export interface Finding {
  register_id: string;   // e.g. "N-09"
  section: string;       // section id, or 'cross-section' / 'ALL' for global checks
  status: Status;
  evidence: string;      // human-readable proof; empty-ish for PASS
}

export interface LoadedSection {
  id: string;
  status: string;        // synthesis status carried in the row (OK / PENDING / …)
  content: any;          // section_outputs.content jsonb, verbatim
}

export type Sections = Record<string, LoadedSection>;

export interface SourceInfo {
  kind: 'snapshot' | 'supabase';
  ref: string;           // file path or supabase url
  projectId: string;
  evidenceHash?: string;
  provider?: string;
}

// 0-indexed canonical order — S<nn> = SECTION_ORDER[nn].
export const SECTION_ORDER: readonly string[] = [
  'exec_summary',              // S00
  'parenting_rituals',         // S01
  'family_roles_babycare',     // S02  ← N-15 (role %s)
  'babycare_needs',            // S03  ← N-18 margin-box (FourBandMatrix)
  'needs_by_lifestage',        // S04
  'diaper_needs_fes',          // S05  ← margin-box (FourBandMatrix)
  'decision_journey',          // S06
  'usage_occasions',           // S07
  'family_roles_diapering',    // S08
  'features_benefits',         // S09  ← margin-box (TierLadder)
  'shopper_roles',             // S10
  'channel_dynamics',          // S11
  'competitive_landscape',     // S12  ← N-17 (sov share_pct)
  'lovingle_journey',          // S13
  'pricing_dynamics',          // S14
  'regional_differences',      // S15  ← N-59 (geo total)
  'first_vs_second_time_moms', // S16
  'consumer_vocabulary',       // S17
  'shopping_search_terms',     // S18  ← N-53 (finding <5%)
  'consumer_personas',         // S19  ← N-56 (pool_estimate % of corpus voices)
  'data_foundation',           // S20  ← N-59 (geo total), N-13 coverage array
];

/** S-number ("S02") or bare number (2) → section id. */
export const sectionOf = (s: number | string): string => {
  const n = typeof s === 'number' ? s : parseInt(String(s).replace(/^S/i, ''), 10);
  return SECTION_ORDER[n];
};

// Named handles for the sections the register calls out explicitly.
export const S02 = sectionOf('S02'); // family_roles_babycare
export const S15 = sectionOf('S15'); // regional_differences
export const S18 = sectionOf('S18'); // shopping_search_terms
export const S20 = sectionOf('S20'); // data_foundation

// N-09 / N-07 — jargon that must never reach client-facing copy.
export const BANNED_STRINGS: readonly string[] = [
  'corpus',
  'evidence graph',
  'corpus is diaper',
  'keyword-weighted',
  'capsule',
];

// N-56 — the specific phrase that must appear nowhere.
export const CORPUS_VOICES = '% of corpus voices';

// Keys that carry pipeline-internal metadata (never rendered to the client).
// Copy/percentage checks skip these so we don't flag e.g. a verbatim's
// provenance tag ({ prov: "corpus" }) as a client-facing banned string.
export const INTERNAL_KEYS = new Set<string>(['prov', '_verbatim_audit']);
export const isInternalKey = (k: string): boolean => INTERNAL_KEYS.has(k) || k.startsWith('_');

// N-14 — romanized Indic (Hinglish) heuristic dictionary. Common Devanagari
// function words + everyday consumer terms transliterated to Latin. A verbatim
// with >=2 distinct hits (or >=15% token hit-rate) and no "(translated)" marker
// is flagged as untranslated romanized Indic text.
export const ROMANIZED_INDIC = new Set<string>([
  'mein', 'me', 'hai', 'hain', 'nahi', 'nahin', 'ke', 'ka', 'ki', 'ko', 'kya',
  'kyun', 'kyunki', 'bhi', 'aur', 'phir', 'par', 'magar', 'lekin', 'raat',
  'bhar', 'din', 'subah', 'sham', 'achha', 'accha', 'acha', 'bahut', 'bohot',
  'thoda', 'zyada', 'jyada', 'itna', 'utna', 'kitna', 'kaisa', 'kaise', 'kaisi',
  'matlab', 'wala', 'waala', 'wali', 'wale', 'hota', 'hoti', 'hote', 'hone',
  'karo', 'karna', 'karta', 'karti', 'kiya', 'kiye', 'liye', 'sirf', 'pura',
  'poora', 'sara', 'saara', 'sab', 'kuch', 'gaya', 'gaye', 'gayi', 'gyi', 'lag',
  'laga', 'lagta', 'lagti', 'chahiye', 'mera', 'meri', 'mere', 'apna', 'apni',
  'apne', 'unka', 'unki', 'iska', 'uska', 'isko', 'usko', 'tha', 'thi',
  'hoga', 'hogi', 'honge', 'rakhna', 'rakho', 'rakhta', 'diya', 'dena', 'lena',
  'jaisa', 'jaise', 'kam', 'mast', 'ghar', 'paisa', 'paise', 'mehnga',
  'mehanga', 'sasta', 'saste', 'haan', 'beta', 'baccha', 'bacche', 'bacchon',
  'doodh', 'susu', 'sona', 'soya', 'khana', 'waste', // 'waste' kept out below
]);
// 'waste' is English — remove it so it never false-positives.
ROMANIZED_INDIC.delete('waste');
ROMANIZED_INDIC.delete('me'); // ambiguous with English pronoun

// The margin-box (vertical rotated band label) selectors N-18 inspects, and the
// stylesheet they live in. Kept here so the source of truth is one place.
export const MARGIN_BOX = {
  cssFile: 'styles/booklet.css',
  labelSelectors: ['.bk-band-label span', '.bk-tier-label span'],
  // The sections that render a FourBandMatrix / TierLadder margin-box.
  sections: ['babycare_needs', 'diaper_needs_fes', 'features_benefits'] as const,
};
