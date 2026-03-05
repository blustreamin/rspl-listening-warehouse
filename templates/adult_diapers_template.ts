
import { TemplatePack } from '../types';
import { validateIncontinenceManagement, validateAwarenessPerception, validateUserProfiles, validateBehavioural, validateBrandLandscape } from '../utils/validators/adultDiapersValidators';
import { AD_FALLBACKS } from '../utils/fallbacks/adultDiapersFallbacks';

const ADULT_DIAPERS_SYSTEM_PROMPT = `
ROLE: Lead Strategy Consultant (India Market) - Adult Care Sector. Senior Partner Level.
OBJECTIVE: Synthesize raw evidence into a Board-Level Strategic Report (McKinsey/BCG Style).
DEPTH: Every section must read like it was prepared by a team of 3 analysts over 2 weeks. No surface-level observations.

GLOBAL NON-NEGOTIABLES:
1.  **CONSULTING-GRADE STRUCTURE**: Every insight must follow: Headline -> Signal Summary -> Evidence (min 2 verbatims) -> Strategic Implication.
2.  **INDIA CONTEXT STRICTNESS**: Pricing in INR (₹). Channels: Chemist, Amazon India. Culture: Joint family, Dignity. Geography: Metro/Tier2/South/North/East/West.
3.  **CONSUMER STATEMENTS**: Every sub-insight MUST include minimum 2 specific consumer verbatims. Sound like real Indian consumers — mention ₹ amounts, specific situations, actual product names.
4.  **EVIDENCE LINKING**: Map insights to evidence_ids. Use real data point counts where available.
5.  **NO PLACEHOLDERS**: Do not use "Derived", "Insight", "N/A". Every field must have substantive content.
6.  **SOURCE PRIORITIZATION**: PRIMARY: Amazon.in and Flipkart verified reviews. SECONDARY: Reddit, Blogs. DEPRIORITIZE: Instagram/YouTube (paid media).
7.  **QUANTIFY EVERYTHING**: Every insight must include a data point count estimate. Use "Based on N data points" or "N mentions across sources".
8.  **VERBATIM DENSITY**: Minimum 2 consumer quotes per insight card. Minimum 4 per profile. Minimum 4 per brand. These must feel like you overheard them in Lucknow, Pune, or Chennai.
9.  **GEOGRAPHIC GRANULARITY**: Reference Metro vs Tier2/3, North/South/East/West differences wherever applicable.

OUTPUT FORMAT: Strict JSON. No Wrappers. Maximum depth and density.
`;

export const ADULT_DIAPERS_TEMPLATE: TemplatePack = {
    templateId: "adult_diapers_v2",
    versionPolicy: { locked: true, version: "2.1.0" },
    sections: [
        { sectionId: "incontinence_management", title: "Incontinence Management Profiles", uiSpec: "adult-profile", schema: {} },
        { sectionId: "gap_analysis", title: "Gap Analysis: Challenges & Need Gaps", uiSpec: "adult-gap", schema: {} },
        { sectionId: "awareness_perception", title: "Awareness & Perception", uiSpec: "adult-profile", schema: {} },
        { sectionId: "user_non_user_profiles", title: "User vs Non-User Profiles", uiSpec: "adult-profile", schema: {} },
        { sectionId: "behavioural_profile", title: "Behavioural Profile", uiSpec: "adult-profile", schema: {} },
        { sectionId: "brand_landscape", title: "Brand Landscape", uiSpec: "adult-brand", schema: {} }
    ],
    promptPack: {
        systemPrompt: ADULT_DIAPERS_SYSTEM_PROMPT,
        sectionPrompts: {
            "incontinence_management": `
        TASK: Generate 'AdultDiapersIncontinenceManagementSectionDTO'.
        
        PROFILES (Generate exactly 4 — each must be EXHAUSTIVE):
        1. **overall_category**: General market-level incontinence patterns in India.
        2. **self_use**: Active seniors/individuals managing their own condition.
        3. **decider_for_others**: Adult children buying for ageing parents.
        4. **caregiver_bedridden**: Full-time caregivers managing total dependency.

        FOR EACH PROFILE — MANDATORY DEPTH:
        - **incontinence_issue**: Array of min 3 triggers. Each = { "headline": "...", "what_it_means": "...", "data_points": N, "verbatims": ["quote1", "quote2"] }.
        - **worst_moments**: Array of min 5 suffering moments across emotional (shame), social (avoiding gatherings), practical (sleep disruption), financial (cost burden), hygiene (rash/infection). Each = { "headline": "...", "what_it_means": "...", "data_points": N, "verbatims": ["quote1", "quote2"] }.
        - **life_impact**: Array of min 4 impacts with severity rating. Each = { "headline": "...", "what_it_means": "...", "data_points": N, "verbatims": ["quote1", "quote2"] }.
        - **solutions**: Array of min 3 solutions (product + behavioral hacks). Each = { "headline": "...", "what_it_means": "...", "data_points": N, "verbatims": ["quote1", "quote2"] }.
        - **verbatims**: Array of min 5 quotes per profile. Real Indian consumers — mention ₹, brands, cities.
        - **satisfaction**: "High" | "Medium" | "Low"
        - **data_points**: Total data points used for this profile.

        DEPTH: Each profile = Kantar consumer deep-dive level. 
        DATA POINTS: Assign realistic, DIFFERENTIATED counts based on evidence density. NOT the same number for every insight.
        E.g., "overnight leakage" might have 340 data points while "temple visit anxiety" has 45.
        
        JSON: { "profiles": { "overall_category": {...}, "self_use": {...}, "decider_for_others": {...}, "caregiver_bedridden": {...} }, "consumer_statements": ["...", "...", "...", "..."] }
    `,
    "gap_analysis": `
        TASK: Generate Adult Diapers Gap Analysis (India Market).

        Output Object: {
          "current_challenges": { 
            "heading": "Current Challenges in Adult Diaper Category",
            "bullets": Array<{
              claim: string,
              explanation: string,
              consumer_evidence: Array<{quote: string, source: string}>,
              severity: "HIGH"|"MED"|"LOW",
              data_points: number,
              impacted_segments: string[]
            }>
          },
          "resolved_challenges": { "heading": "What the Category Has Solved", "bullets": Array<same schema> },
          "unresolved_challenges": { "heading": "Persistent Unresolved Pain Points", "bullets": Array<same schema> },
          "need_gap": { 
            "heading": "White Space & Need Gaps",
            "need_statements": Array<{
              need: string,
              why_now: string,
              who: string,
              data_points: number,
              consumer_evidence: Array<{quote: string, source: string}>,
              priority: "P0"|"P1"|"P2"
            }>
          }
        }

        REQUIREMENTS:
        - Current Challenges: Minimum 8 bullets. Cover: Leakage anxiety, Rash/skin issues, Disposal stigma, Cost burden, Fit problems for Indian body types, Odor, Night-time failure, Social embarrassment.
        - Resolved: Minimum 5. What adult diapers HAVE successfully fixed vs cloth/rags.
        - Unresolved: Minimum 6. What PERSISTS despite product availability.
        - Need Gaps: Minimum 6 P0/P1 statements. What no brand fully addresses.
        - EVERY bullet must have min 2 consumer_evidence quotes.
        - data_points must be DIFFERENTIATED — not the same number. High-frequency issues get 200+, niche issues get 20-50.
        - India Only. No foreign market references.
    `,
    "awareness_perception": `
        TASK: Generate 'AdultDiapersAwarenessPerceptionSectionDTO'.
        
        REQUIREMENTS — ANALYST GRADE DEPTH:

        **misconceptions** (Array, MINIMUM 7 items):
        Each = { "headline": "The misconception", "what_it_means": "The reality/correction with data", "data_points": N, "verbatims": ["quote1", "quote2"] }
        Cover: Cultural ("only for bedridden"), Quality ("all brands same"), Social ("giving up independence"), Economic ("too expensive"), Medical ("causes rash"), Age ("only for old"), Gender ("only for women").
        data_points must be DIFFERENTIATED per misconception.

        **perceptions_and_stigma** (Array, MINIMUM 6 items):
        Each = { "headline": "Stigma driver", "what_it_means": "Description", "data_points": N, "verbatims": ["quote1", "quote2"] }
        Cover: Infantilization, Family judgment, Purchase embarrassment, Disposal stigma, Self-image impact, Caregiver burden.

        **decision_journey** (Array, MINIMUM 6 stages):
        Each = { "headline": "Stage", "what_it_means": "Consumer mindset + dropout factors", "data_points": N, "verbatims": ["quote1", "quote2"] }
        Stages: Trigger Event → Information Search → Evaluation → First Purchase → First Use Experience → Adoption/Rejection.

        **consumer_statements** (Array, MINIMUM 6):
        Clean quotes. Sound like real Indian consumers speaking candidly.

        JSON: { "misconceptions": [...], "perceptions_and_stigma": [...], "decision_journey": [...], "consumer_statements": [...] }
    `,
    "user_non_user_profiles": `
        TASK: Generate 'AdultDiapersUserNonUserProfilesSectionDTO'.
        
        OBJECTIVE: 5 User Archetypes + 5 Non-User Archetypes. Each must feel like a REAL person.

        OUTPUT SCHEMA:
        {
          "user_profiles": [
            {
              "profile_name": "The [Descriptive Name]",
              "who_they_are": "3-4 sentences. Age, city tier, life stage, income, living situation, how they discovered product.",
              "trigger_event": "The specific moment that pushed them to try — be ULTRA specific",
              "first_experience": "Emotional reaction + product feedback on first use",
              "intention_to_continue": "Continue/Stop/Occasional — with detailed reason",
              "cost_sensitivity": "High/Medium/Low",
              "brand_affinity": "Which brand and WHY specifically",
              "unmet_need": "The gap no brand fills for them",
              "data_points": N,
              "verbatims": ["Quote 1", "Quote 2", "Quote 3", "Quote 4"]
            }
          ],
          "non_user_profiles": [same schema with primary_barrier and trigger_to_convert instead]
        }
        
        MANDATORY: 5 distinct user profiles + 5 distinct non-user profiles.
        MANDATORY: 4 verbatims per profile. DIFFERENTIATED data_points per profile.
        Users: young menstrual-overflow, travel-occasion, post-surgical, dignity-seeking elder, caregiver/bulk-buyer.
        Non-users: stigma resister, cost resister, cloth loyalist, low-awareness elder, disposal-logistics barrier.
    `,
    "behavioural_profile": `
        TASK: Generate 'AdultDiapersBehaviouralProfileSectionDTO' — EXPANDED V2.
        
        REQUIREMENTS — MAXIMUM DEPTH:

        **occasions_of_use** (Array, MINIMUM 7 items):
        Each = { "headline": "...", "what_it_means": "...", "data_points": N, "verbatims": ["q1", "q2"] }
        Must include: overnight/sleep, train/bus travel, heavy menstrual flow, post-surgical, weddings/temples, workplace/school, monsoon season.
        data_points DIFFERENTIATED per occasion.

        **format_switching** (Array, MINIMUM 5 items):
        Product FORMAT switching (not brand). Each = { "from_product": "...", "to_product": "...", "trigger": "...", "data_points": N, "verbatims": ["q1", "q2"] }
        Cover: cloth → disposable, pads → adult diapers, tape-style → pant-style, regular → overnight, single-use → reusable.

        **brand_switching** (Array, MINIMUM 5 items):
        Brand-to-brand switching. Each = { "from_brand": "...", "to_brand": "...", "reason": "...", "trigger": "...", "data_points": N, "verbatims": ["q1", "q2"] }
        Cover: Friends → Lifree, generic → premium, premium → value, online-discovered → pharmacy-available, Indian → imported.

        **purchase_behaviour**: {
          "channels": Array<{ "channel": "...", "detail": "...", "data_points": N, "verbatims": ["q1", "q2"] }>,
          "pack_sizes": Array<{ "size": "...", "who_buys": "...", "data_points": N }>,
          "price_points_inr": Array<{ "tier": "...", "range": "...", "per_piece": "...", "data_points": N }>,
          "pack_sizes_by_brand": Array<{ "brand": "...", "sizes": ["..."], "data_points": N }>,
          "price_by_brand": Array<{ "brand": "...", "price_range": "...", "per_piece": "...", "positioning": "Value|Mid|Premium", "data_points": N }>
        }

        **geographic_patterns**: {
          "metro": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] },
          "south": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] },
          "north": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] },
          "west": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] },
          "east": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] },
          "tier_2_3": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] },
          "rural": { "pattern": "...", "top_brands": ["..."], "channel_preference": "...", "data_points": N, "verbatims": ["q1", "q2"] }
        }

        **consumer_statements** (Array, MINIMUM 6):

        DATA POINTS: Must be DIFFERENTIATED. "Overnight use" might be 450 pts, "monsoon concerns" might be 35 pts. Do NOT use same number.

        JSON: { "occasions_of_use": [...], "format_switching": [...], "brand_switching": [...], "purchase_behaviour": {...}, "geographic_patterns": {...}, "consumer_statements": [...] }
    `,
    "brand_landscape": `
        TASK: Generate 'AdultDiapersBrandLandscapeSectionDTO'.
        
        CRITICAL SOURCE PRIORITIZATION:
        - PRIMARY: Amazon.in + Flipkart verified purchase reviews ONLY for attribute scores and verbatims.
        - DEPRIORITIZE: Instagram/YouTube (paid media). Label any social quote as "PROMOTIONAL CONTEXT".

        **brands** (Array, MINIMUM 8 brands):
        Must include: Friends, Lifree, Teddyy, KareIn, TENA, Dignity, Romsons, Flamingo.

        For EACH brand:
        {
          "brand": "...",
          "share_of_voice": { "share_pct": N },
          "overall_sentiment": "POS"|"MIX"|"NEG",
          "positioning_summary": "2-3 sentences. Consumer perception.",
          "attribute_scale": [{ "attribute": "...", "score_0_5": N }],
          "strengths": ["Specific from reviews"],
          "weaknesses": ["Specific from reviews"],
          "data_points": N,
          "verbatims": ["Quote 1 (Amazon)", "Quote 2 (Flipkart)", "Quote 3", "Quote 4", "Quote 5"]
        }

        Attributes (min 7 per brand): absorbency, skin_comfort, fit_for_indian_body, discretion_thinness, odor_control, value_for_money, availability, leak_protection, ease_of_disposal.
        Scores DIFFERENTIATED. data_points DIFFERENTIATED per brand.
        Min 5 verbatims per brand from e-commerce reviews.
        **market_structure**: Array of 5 strategic bullets.

        JSON: { "brands": [...], "market_structure": [...] }
    `
        }
    },
    validators: {
        "incontinence_management": validateIncontinenceManagement,
        "awareness_perception": validateAwarenessPerception,
        "user_non_user_profiles": validateUserProfiles,
        "behavioural_profile": validateBehavioural,
        "brand_landscape": validateBrandLandscape
    },
    fallbacks: AD_FALLBACKS
};
