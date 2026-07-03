# Section Mapping v2 — 25-section registry → 21-section RSPL structure

> Phase 0 deliverable of the 02 Jul 2026 restructure brief.
> Old registry: `templates/baby_diapers_template.ts` (25 sections, F3 Gate 3 + Stream C).
> New registry: the 21-section architecture from `Report_Structure_Baby_Diaper_Social_Listening.docx`,
> re-skinned to the Face Care booklet design language.

## 1. Old registry as found (verified, not assumed)

| # | Old key | Old title | Renderer (LovingleSections) |
|---|---------|-----------|------------------------------|
| 01 | `exec_summary` | Executive Summary | `LovingleExecSummary` |
| 02 | `category_context` | Category Context & Cultural Trends | `LovingleCategoryContext` |
| 03 | `seasonality` | Seasonality & Demand Rhythm | `LovingleSeasonality` |
| 04 | `target_group` | Target Group & Segments | `LovingleTargetGroup` |
| 05 | `babys_world_journey` | The Baby's World — Needs Across the Journey | `LovingleJourney` |
| 06 | `needs_triggers_pains` | Needs, Triggers & Pain Points | `LovingleNeeds` |
| 07 | `consumer_language` | Consumer Language | `LovingleConsumerLanguage` |
| 08 | `behaviour_usage` | Behaviour & Usage Mapping | `LovingleBehaviour` |
| 09 | `diaper_avoidance` | When Diapers Are Avoided | `LovingleDiaperAvoidance` |
| 10 | `diaper_styles` | Diaper Styles & Format Interaction | `LovingleStyles` |
| 11 | `style_switch_journey` | Style Switch Journey | `LovingleStyleSwitchJourney` |
| 12 | `pack_architecture` | Pack Architecture — Laddi vs Non-Laddi | `LovinglePack` |
| 13 | `consumer_personas` | Consumer Personas | `LovinglePersonas` |
| 14 | `channel_retail` | Channel & Retail Architecture | `LovingleChannel` |
| 15 | `geography_regional` | Geography & Regional Patterns | `LovingleGeography` |
| 16 | `decision_influencers` | Decision-Making, Buyer-vs-Decider & Influencer Roles | `LovingleDecision` |
| 17 | `decision_journey_stages` | Decision Journey by Lifestage | `LovingleDecisionJourney` |
| 18 | `influencer_community` | Influencer & Community Ecosystem | `LovingleInfluencer` |
| 19 | `attribute_drivers` | Product Attribute Drivers | `LovingleAttributes` |
| 20 | `price_pack_signals` | Price–Pack & Premiumisation Signals | `LovinglePricePackSection` |
| 21 | `brand_landscape` | Competitive Brand Landscape | `LovingleBrand` |
| 22 | `lovingle_diagnostic` | Lovingle Brand Diagnostic | `LovingleDiagnostic` |
| 23 | `gap_analysis` | Gap Analysis: Challenges & Need Gaps | `LovingleGap` |
| 24 | `whitespace_recommendations` | White Space & Recommendations | `LovingleWhitespace` |
| 25 | `methodology_evidence` | Methodology & Evidence Base | `LovingleMethodology` → `DataIngestionAnalysis` |

## 2. Old → new mapping

Legend: **keep-logic** = prompt/renderer logic carries (re-skinned) · **merge** = folds into a new section ·
**split** = content divides across new sections · **retire** = removed from registry, code kept unrouted ·
**fresh** = new section with no old counterpart.

| Old section | New section(s) | Disposition |
|---|---|---|
| `exec_summary` | `exec_summary` (00) | keep-logic — N1/N2/N3 spec carries; theme enum re-mapped to `parenting_category`→`product`→`shopping`→`brand` |
| `category_context` | `decision_journey` (06) partial + `competitive_landscape` (12) partial | merge — cultural/discovery layers absorbed; no 1:1 successor |
| `seasonality` | `usage_occasions` (07) | merge — 12-month rhythm + N9 data-source annotation fold in as the seasonality band |
| `target_group` | `consumer_personas` (19) partial + system-prompt segment lens | merge — segment cuts become the `segment_lens` mandate |
| `babys_world_journey` | `needs_by_lifestage` (04) | keep-logic — journey-spine renderer carries as the lifestage evolution read |
| `needs_triggers_pains` | `babycare_needs` (03) + `diaper_needs_fes` (05) | split — F/E/S + MET/UNMET machinery reused by both (03 = babycare-wide, 05 = diaper-specific) |
| `consumer_language` | `consumer_vocabulary` (17) | keep-logic, **fresh schema** — `emotional_meaning`/`pack_implication` canonical; `emotional_charge`/`recommended_use_in` mismatch closed by construction |
| `behaviour_usage` | `usage_occasions` (07) | merge — occasion cards carry |
| `diaper_avoidance` | `usage_occasions` (07) | merge — "situations where diapers are avoided" is an explicit coverage cell of 07 |
| `diaper_styles` | `usage_occasions` (07) + `features_benefits` (09) | split — style-by-occasion → 07; tape-vs-pant feature specificity → 09 |
| `style_switch_journey` | `usage_occasions` (07) | merge — developmental transitions coverage cell |
| `pack_architecture` | `pricing_dynamics` (14) + `features_benefits` (09) | split — tier pills / price rungs → 14; format tiers → 09 |
| `consumer_personas` | `consumer_personas` (19) | keep-logic — MAX 5, `pool_estimate` sizing, new locus-of-control field, ≤1 verbatim/persona; barrier table carries |
| `channel_retail` | `channel_dynamics` (11) | keep-logic — 2-row physical/digital channel renderer carries re-skinned |
| `geography_regional` | `regional_differences` (15) + `usage_occasions` (07) mini-strip | keep-logic — becomes the N/W/S/E/Central 5-card read |
| `decision_influencers` | `decision_journey` (06) + `family_roles_diapering` (08) + `shopper_roles` (10) | split — discovery/trust → 06; father/grandparent roles → 08; buyer-vs-decider → 10 |
| `decision_journey_stages` | `decision_journey` (06) | merge — per-lifestage buyer/decider map becomes 06's lifestage lens |
| `influencer_community` | `decision_journey` (06) | merge — trust-source hierarchy coverage cell |
| `attribute_drivers` | `features_benefits` (09) | keep-logic — Must-Have/Good-to-Have/Delighter tiering carries into `TierLadder` |
| `price_pack_signals` | `pricing_dynamics` (14) | keep-logic — ceilings/promos/premiumisation carry; ladder re-skinned to stat-callouts |
| `brand_landscape` | `competitive_landscape` (12) | keep-logic — SOV callout + cross-brand chart carry re-skinned; adds perception cards |
| `lovingle_diagnostic` | `lovingle_journey` (13) | keep-logic — triggers / ANT barriers / trier-working carry; switch stories fold in; N8 strips chrome only |
| `gap_analysis` | `babycare_needs` (03) + `diaper_needs_fes` (05) | merge — unmet-need machinery → `GapBlock` renders inside the needs sections |
| `whitespace_recommendations` | — | **retire** — strategy layer absent from Nikita's structure; `MatrixQuadrant`/`SynthesisMoves` kept in-tree, unrouted (§10.3 Venkat confirms) |
| `methodology_evidence` | `data_foundation` (20) | keep-logic — `DataIngestionAnalysis` panel re-chromed as appendix (§10.2 Venkat confirms) |
| — | `parenting_rituals` (01) | fresh — Part A; `RitualPanel` |
| — | `family_roles_babycare` (02) | fresh — Part A (babycare-wide; distinct from 08's diaper-specific read) |
| — | `first_vs_second_time_moms` (16) | fresh — parity cut existed only as a system-prompt lens; now a section |
| — | `shopping_search_terms` (18) | fresh — `GapBlock` signal-keyword treatment with literal search terms |

## 3. Layer-3 renderer carry/retire matrix

| Renderer / mechanism | Fate |
|---|---|
| `JourneySpine` (lanes + spine) | carries → `needs_by_lifestage` via `LifestageStepper` re-skin |
| `WaveChart` (12-month SVG) | carries → seasonality band inside `usage_occasions` (N9 note attached) |
| MET/UNMET pills (`MET_META`) | carries → `babycare_needs` + `diaper_needs_fes` |
| `ChannelFlow` 2-row | carries → `channel_dynamics` |
| `CrossBrandBars` + SOV callout | carries → `competitive_landscape` |
| `SovBars` | carries → `competitive_landscape` |
| `SwitchStories` | carries → `lovingle_journey` (what triggered / what's working) |
| Language matrix (term table) | carries → `consumer_vocabulary` (fresh field names) |
| `PriceLadder` / pack tier pills | carries → `pricing_dynamics` (stat-callout restyle) |
| `RankedBars` (attribute tiers) | carries → `features_benefits` via `TierLadder` |
| `DataIngestionAnalysis` | carries → `data_foundation` (booklet chrome) |
| `EvidenceShare` / `evidencePct` (N5/N13) | carries into every booklet component; `n=0` → `—` fix applied |
| `VerbatimChip` + N12 attribution formatter | carries → `QuoteChip` (booklet visual, N12 content) |
| `sanitiseConsumerText` (N4) | carries, with the §8.2 `consumer_vocabulary` term-cell carve-out |
| `InsightCardGrid` / `LabeledCardGroups` | carries as generic fallback treatment inside booklet sections |
| `MatrixQuadrant` (effort×impact) | **retired from routing** — kept in `LovingleBlocks.tsx` |
| `SynthesisMoves` | **retired from routing** (strategy moves) — kept in `LovingleBlocks.tsx` |
| `NetworkDiagram` | retired from routing (influencer ecosystem folded into 06 as trust cards) — kept in-tree |
| `RegionMap` | superseded by `RegionalSplitCards` (5-card variant) — kept in-tree |
| `HeadlineStatBand` | superseded by `StatCardRow` — kept in-tree |
| Lovingle giraffe / logo lockup | retired from chrome (N8) — kept in-tree |

## 4. Pipeline notes discovered in Phase 0

- `utils/normalizers/normalizeBabyDiapers.ts` falls through to `default:` for unknown section IDs and
  returns raw model output (no seed exists for new keys) — new sections flow through untouched, so the
  booklet renderers normalise defensively.
- `services/babyDiapersQualityGate.ts` passes unknown section IDs — light structural checks added for the
  new keys must stay lenient (a hard fail after retry blanks the section to `{}`/SEEDED).
- `services/babyDiapersSynthesis.ts` `SECTION_KEYWORDS` and `HEAVY_SECTIONS` are keyed by old IDs —
  re-keyed to the new registry in Phase 3a (targeted evidence selection is load-bearing).
- Seeds (`projects/baby-diapers/bd_seed_v1.ts` + the 245 Supabase seed rows) are keyed to old IDs and are
  left untouched per §9 — rollback insurance. New sections render an intentional absent state instead.
- PDF capture root is `#lovingle-report-container` in `components/ReportView.tsx`; Cover + TOC mount
  inside it so html2pdf captures them (Phase 4).
