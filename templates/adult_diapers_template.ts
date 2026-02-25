
import { TemplatePack } from '../types';
import { validateIncontinenceManagement, validateAwarenessPerception, validateUserProfiles, validateBehavioural, validateBrandLandscape, validateGapAnalysis } from '../utils/validators/adultDiapersValidators';
import { AD_FALLBACKS } from '../utils/fallbacks/adultDiapersFallbacks';

const ADULT_DIAPERS_SYSTEM_PROMPT = `
ROLE: Lead Strategy Consultant (India Market) - Adult Care Sector.
OBJECTIVE: Synthesize raw evidence into a Board-Level Strategic Report (McKinsey/BCG Style).

GLOBAL NON-NEGOTIABLES:
1.  **CONSULTING-GRADE STRUCTURE**: Every insight must follow the logic: Headline -> Signal -> Evidence -> Implication.
2.  **INDIA CONTEXT STRICTNESS**: Pricing in INR (₹). Channels: Chemist, Amazon India. Culture: Joint family, Dignity.
3.  **CONSUMER STATEMENTS**: Every section MUST include specific "verbatims" or "consumer_statements" arrays. Each verbatim MUST tag the speaker profile in this format: "Quote text here" — Caregiver, Pune / "Quote text" — Active Senior, Delhi / "Quote text" — Non-User, Tier 2 City. Every sub-section must include at least 2 short consumer quotes that capture the essence of the insight.
4.  **EVIDENCE LINKING**: Map insights to \`evidence_ids\` from input or seed IDs (SEED_AD_###).
5.  **NO PLACEHOLDERS**: Do not use "Derived", "Insight", "N/A". Use "Market Observation" if needed.
6.  **HUMANIZED LANGUAGE**: Write in clear, relatable language. Avoid jargon. The report should be accessible to non-technical stakeholders. Prefer everyday terms over consulting-speak. E.g., say "people stop going out" not "social withdrawal behavior observed".
7.  **CLEAR TERMINOLOGY DISTINCTIONS**: Strictly differentiate between: (a) Switching Triggers = moments that cause consumers to try/switch products, (b) Barriers = obstacles preventing adoption (stigma, cost, logistics), (c) Suffering Moments = acute difficulty occasions due to incontinence (distinct from stigma). Never conflate these terms.

OUTPUT FORMAT: Strict JSON. No Wrappers.
`;

export const ADULT_DIAPERS_TEMPLATE: TemplatePack = {
    templateId: "adult_diapers_v1",
    versionPolicy: { locked: true, version: "1.1.0" },
    sections: [
        { sectionId: "incontinence_management", title: "Incontinence Management Profiles", uiSpec: "adult-profile", schema: {} },
        { sectionId: "awareness_perception", title: "Awareness & Perception", uiSpec: "adult-profile", schema: {} },
        { sectionId: "gap_analysis", title: "Gap Analysis", uiSpec: "adult-profile", schema: {} },
        { sectionId: "user_non_user_profiles", title: "User vs Non-User Profiles", uiSpec: "adult-profile", schema: {} },
        { sectionId: "behavioural_profile", title: "Behavioural Profile", uiSpec: "adult-profile", schema: {} },
        { sectionId: "brand_landscape", title: "Brand Landscape", uiSpec: "adult-brand", schema: {} }
    ],
    promptPack: {
        systemPrompt: ADULT_DIAPERS_SYSTEM_PROMPT,
        sectionPrompts: {
            "incontinence_management": `
        TASK: Generate 'AdultDiapersIncontinenceManagementSectionDTO'.
        
        PROFILES (Generate exactly 4):
        1. **overall_category**: General market-level incontinence patterns.
        2. **self_use**: Active seniors/individuals managing their own condition.
        3. **decider_for_others**: Adult children buying for ageing parents.
        4. **caregiver_bedridden**: Full-time caregivers managing total dependency.

        FOR EACH PROFILE, you MUST provide ALL of the following:
        - **incontinence_issue**: Array of min 2 items. Each item = { "headline": "...", "what_it_means": "..." }. Be specific: "Stress incontinence triggered by sneezing/laughing" not just "Bladder weakness".
        - **worst_moments**: Array of MINIMUM 6 suffering moments. These are occasions of acute difficulty DUE TO INCONTINENCE — NOT stigma, NOT barriers. Cover: emotional (shame at family gatherings), social (avoiding temple visits, skipping weddings), practical (sleep disruption, clothing limitations, monsoon-season challenges), financial (cost burden impacting household budget), travel-related (long train/bus journeys without toilet access), and daily routine (morning walks, grocery runs). Each item = { "headline": "...", "what_it_means": "..." }. Each MUST include a specific situational example. Include at least 2 consumer quotes within this section.
        - **life_impact**: Array of min 3 life impacts. Each item = { "headline": "...", "what_it_means": "..." }. Include severity: social isolation, caregiver burnout, reduced mobility confidence. IMPORTANT: Each impact description MUST identify the speaker profile — e.g., "For caregivers, this means..." or "Active seniors report...".
        - **solutions**: Array of MINIMUM 8 solutions. Each item = { "headline": "...", "what_it_means": "..." }. MUST cover ALL of the following: (a) product types — light pads vs. heavy tape-style vs. pant-style, (b) behavioral hacks — fluid restriction, toilet-mapping routes, double-layering, (c) routines — day vs. night usage patterns, pre-travel prep rituals, (d) satisfaction level for each solution — state whether users find it adequate or a compromise, (e) channel-based solutions — pharmacy-led vs. e-commerce subscription vs. hospital supply, (f) caregiver-specific solutions — bed protectors, quick-change techniques, odor management. Each solution needs a 2-3 sentence description with real consumer context.
        - **verbatims**: Array of min 3 specific consumer quotes per profile. EVERY verbatim MUST tag the speaker: "Quote text" — [Profile Type], [City/Context]. E.g.: "Main raat ko 3 baar uthti hoon check karne" — Self-Use Senior, Lucknow. These must sound like real Indian consumers — use colloquial language, mention specific situations (train journeys, wedding functions, monsoon season), reference real costs in ₹, mention actual brands or channels.
        - **satisfaction**: "High" | "Medium" | "Low"

        DEPTH REQUIREMENT: Each profile should be as detailed as a Kantar consumer deep-dive. A product manager reading this should say "I didn't know that about our consumers."
        
        JSON: { "profiles": { "overall_category": {...}, "self_use": {...}, "decider_for_others": {...}, "caregiver_bedridden": {...} }, "consumer_statements": ["...", "...", "...", "..."] }
    `,
    "awareness_perception": `
        TASK: Generate 'AdultDiapersAwarenessPerceptionSectionDTO'.
        
        REQUIREMENTS:

        **awareness_sources** (Array, MINIMUM 4 items):
        Each item = { "headline": "Source name", "what_it_means": "Description of how consumers discover adult diapers through this source, quality of information received, and impact on behavior" }
        MUST cover: (a) informal sources — friends, family observations, neighbor word-of-mouth, (b) medical — doctor recommendations, hospital exposure post-surgery, (c) retail — chemist counter suggestions, seeing product on shelf, (d) digital — Amazon search, YouTube reviews, WhatsApp forwards.
        IMPORTANT: Many consumers discover adult diapers through indirect, informal channels — NOT advertising. Capture the QUALITY of awareness, not just the source. E.g., "Daughter saw it at a chemist and bought for mother without asking" is very different from "Doctor prescribed after surgery."
        Each source MUST include a consumer quote showing how they first learned about the product.

        **misconceptions** (Array, MINIMUM 5 items):
        Each item = { "headline": "The misconception", "what_it_means": "The reality/correction" }
        Go beyond medical misconceptions. Include:
        - Cultural: "Only for bedridden patients" / "Only for old people"
        - Quality: "All brands are the same" / "Cloth is healthier"
        - Social: "Using diapers means giving up independence"
        - Economic: "Too expensive for regular use"
        - Environmental: "No eco-friendly options exist"
        Each misconception MUST include a consumer evidence quote inline in the what_it_means text.
        IMPORTANT: Misconceptions are DISTINCT from stigma. Misconceptions = factual misunderstandings. Stigma = social/emotional judgment. Do NOT conflate them.

        **perceptions_and_stigma** (Array, MINIMUM 6 items):
        Each item = { "headline": "Stigma driver name", "what_it_means": "DETAILED 3-4 sentence description with consumer evidence" }
        DEPTH REQUIREMENT: Each stigma driver must be a MINI CASE STUDY — not a one-liner. Describe WHO feels it most, WHERE it manifests (specific settings like joint family dining, public transport, chemist counter), HOW it affects purchasing/usage behavior, and include a REAL consumer quote as evidence.
        Cover:
        - Infantilization stigma ("It's for babies") — how the very word "diaper" triggers resistance in seniors who see it as regression. Include the cultural context of Indian family hierarchy where elders command respect.
        - Joint family visibility — the logistics of hiding, storing, and disposing diapers in a 3-generation household where privacy is scarce. Cover the role of daughters-in-law.
        - Purchase embarrassment at chemist counter ("black bag shame") — the gendered dynamics (who buys), the whispering, asking for it by pointing rather than saying the name.
        - Disposal stigma in shared housing — garbage collectors, neighbors, apartment building dustbins. The fear of being "found out."
        - Family burden guilt — seniors feeling they are a financial/physical burden, leading to self-rationing or refusing to use.
        - Spousal/partner dynamics — how incontinence affects the marital relationship, sleeping arrangements, intimacy.
        IMPORTANT: These are social/emotional barriers — NOT the same as misconceptions. Each driver MUST include a direct consumer quote embedded in the description with speaker tag.

        **decision_journey** (Array, EXACTLY 5 stages):
        Each item = { "headline": "Stage name", "what_it_means": "DETAILED 4-5 sentence description with at least 2 consumer mindset quotes from different archetypes" }
        Stages must cover: Trigger Event → Information Search → Evaluation & Trial → First Experience → Adoption or Rejection
        DEPTH REQUIREMENT: Each stage must describe:
        (a) What the consumer is FEELING — the emotional state, not just the action
        (b) Who influences them at this stage (doctor? daughter? chemist? Amazon review?)
        (c) Where they commonly DROP OFF and why (each stage has a dropout reason)
        (d) What CONVERTS them to the next stage
        (e) At least 2 quotes from DIFFERENT archetypes — e.g., active senior vs. caregiver vs. young PCOS user
        Each stage description should be 4-5 rich sentences. Think Kantar qualitative depth — a strategist reading this should understand the emotional texture of each stage.

        **consumer_statements** (Array, MINIMUM 4 items):
        Clean consumer quotes about awareness and stigma. NO source IDs. NO evidence IDs. Just the quote text as a string with speaker tag — e.g., "Quote" — Non-User, Tier 2 City. These must sound like real Indian consumers speaking candidly.

        JSON: { "awareness_sources": [...], "misconceptions": [...], "perceptions_and_stigma": [...], "decision_journey": [...], "consumer_statements": [...] }
    `,
    "gap_analysis": `
        TASK: Generate 'AdultDiapersGapAnalysisSectionDTO'.
        
        OBJECTIVE: Identify unmet emotional and functional needs across both users and non-users of adult diapers in India. This section should clearly highlight WHERE current products and market offerings FAIL to meet consumer expectations — creating opportunities for innovation, better messaging, and product development.

        This structure was successfully used for period panties research and is now adapted for adult diapers.

        OUTPUT SCHEMA:
        {
          "emotional_needs": [
            {
              "need": "The emotional need — e.g., 'Dignity in social settings'",
              "who_feels_it": "Which consumer segments feel this most acutely — e.g., 'Active seniors attending family functions, caregivers managing parents in joint families'",
              "current_gap": "How current products/messaging FAIL to address this need",
              "consumer_quotes": ["Quote 1 — tagged", "Quote 2 — tagged", "Quote 3 — tagged"],
              "opportunity": "What a brand could do to address this — product, messaging, or service innovation"
            }
          ],
          "functional_needs": [
            {
              "need": "The functional need — e.g., 'Overnight protection without bulk'",
              "who_feels_it": "Which segments",
              "current_gap": "Where products fall short",
              "consumer_quotes": ["Quote 1 — tagged", "Quote 2 — tagged", "Quote 3 — tagged"],
              "opportunity": "Innovation opportunity"
            }
          ],
          "unmet_expectations": [
            {
              "expectation": "What consumers expected vs. what they got — e.g., 'Expected all-night dryness, got 4-hour max'",
              "segment": "User / Non-User / Both",
              "severity": "HIGH / MEDIUM / LOW",
              "consumer_quotes": ["Quote 1 — tagged", "Quote 2 — tagged", "Quote 3 — tagged"],
              "brand_implication": "What this means for product teams"
            }
          ],
          "non_user_gaps": [
            {
              "gap": "What would need to change for non-users to consider trying",
              "barrier_type": "stigma / cost / awareness / logistics / product_design",
              "consumer_quotes": ["Quote 1 from non-user — tagged", "Quote 2 — tagged", "Quote 3 — tagged"],
              "conversion_lever": "The specific change that could flip this non-user"
            }
          ],
          "consumer_statements": ["Quote 1 — [Profile], [City]", "Quote 2", "Quote 3", "Quote 4"]
        }

        REQUIREMENTS:
        - emotional_needs: MINIMUM 4 items
        - functional_needs: MINIMUM 4 items
        - unmet_expectations: MINIMUM 3 items
        - non_user_gaps: MINIMUM 3 items
        - Every item MUST include a consumer_quote tagged with speaker profile
        - Cover BOTH user AND non-user perspectives
        - Be specific to India market context (pricing in ₹, cultural references, channel realities)

        JSON: { "emotional_needs": [...], "functional_needs": [...], "unmet_expectations": [...], "non_user_gaps": [...], "consumer_statements": [...] }
    `,
    "user_non_user_profiles": `
        TASK: Generate 'AdultDiapersUserNonUserProfilesSectionDTO'.
        
        OBJECTIVE: 5 User Archetypes + 5 Non-User Archetypes. Each must feel like a real person a media planner could target.

        OUTPUT SCHEMA:
        {
          "user_profiles": [
            {
              "profile_name": "The [Descriptive Name]",
              "who_they_are": "2-3 sentences with age range, city tier, life stage, income context, living situation. E.g.: 'Women 25-35 in Tier 1-2 cities with PCOS or post-partum heavy flow. Middle income, living in nuclear families. First introduced to adult diapers by peer groups on WhatsApp.'",
              "awareness_source": "HOW they first learned about adult diapers — be specific (e.g., 'Chemist recommended when buying sanitary pads', 'Saw on Amazon while searching for bed protectors', 'Daughter read about it on a caregiving WhatsApp group')",
              "awareness_quality": "HIGH / MEDIUM / LOW — and WHY. E.g., 'LOW — learned from neighbor gossip, had many misconceptions about sizing'",
              "switching_trigger": "The specific moment that pushed them to try/switch to this product. This is a SWITCHING TRIGGER — the event that caused product trial or product-to-product switch. NOT the same as a barrier.",
              "first_experience": "What their first usage was like — emotional reaction + product feedback",
              "product_experience": "Which product types they've tried, what worked, what failed. Include failure stories (leakage, rash, wrong size) and delight stories (first dry night, confidence at a wedding).",
              "intention_to_continue": "Continue/Stop/Occasional — with reason",
              "cost_sensitivity": "High/Medium/Low",
              "brand_affinity": "Which brand they use and WHY (e.g., 'Loyal to Friends — available at corner chemist' or 'No preference, buys whatever Amazon recommends')",
              "unmet_need": "What the category is NOT solving for them — the gap a brand could fill",
              "verbatims": ["Quote 1 — [Profile], [City]", "Quote 2 — [Profile], [City]", "Quote 3 — [Profile], [City]"]
            }
          ],
          "non_user_profiles": [
            {
              "profile_name": "The [Descriptive Name]",
              "who_they_are": "2-3 sentences with demographics and context",
              "awareness_source": "How they know (or don't know) about adult diapers",
              "awareness_quality": "HIGH / MEDIUM / LOW — capturing quality of their knowledge",
              "primary_barrier": "The #1 reason they refuse — be specific. This is a BARRIER — an obstacle preventing adoption. NOT a trigger.",
              "skepticism_quote": "A direct quote showing their disinterest, doubt, or resistance — e.g., 'Mere papa ko ye sab nahi chahiye, wo theek hain' or 'Itna mehnga? Kapda lagake kaam chal raha hai'",
              "cost_sensitivity": "High/Medium/Low",
              "trigger_to_convert": "What event or message COULD convert them — the potential SWITCHING TRIGGER",
              "verbatims": ["Quote 1 — [Profile], [City]", "Quote 2 — [Profile], [City]", "Quote 3 — [Profile], [City]"]
            }
          ],
          "failure_stories": [
            { "story": "A specific story of product failure — leakage at a wedding, rash from wrong brand, wrong size ordered online. Include brand name, situation, and emotional impact. Tag the speaker." }
          ],
          "delight_stories": [
            { "story": "A specific story of product success — first dry night, confidence to travel, caregiver relief. Include brand name, situation, and emotional reaction. Tag the speaker." }
          ]
        }
        
        MANDATORY: Return EXACTLY 5 distinct profiles for each list (users and non-users).
        MANDATORY: Each profile MUST have EXACTLY 3 verbatims. Not 1, not 2 — THREE.
        MANDATORY: Return at least 3 failure_stories and 3 delight_stories.
        
        Profile diversity requirements:
        USERS must include: a young menstrual-overflow user, a travel-occasion user, a post-surgical user, a dignity-seeking elder, and a caregiver/bulk buyer.
        NON-USERS must include: a stigma resister, a cost resister, a cloth loyalist, a low-awareness elder, and a disposal/logistics barrier.
        
        NON-USER DEPTH: Non-user profiles are just as important as user profiles. Capture their skepticism, misconceptions, and resistance with the same depth. Include direct quotes showing disbelief, disinterest, or active refusal.
    `,
    "behavioural_profile": `
        TASK: Generate 'AdultDiapersBehaviouralProfileSectionDTO'.
        
        REQUIREMENTS:

        **occasions_of_use** (Array, MINIMUM 8 items):
        Each item = { "headline": "Occasion name", "what_it_means": "DETAILED 3-4 sentence description with frequency estimate, who uses it for this occasion, and consumer quote", "consumer_quotes": ["Quote 1 — tagged", "Quote 2 — tagged", "Quote 3 — tagged"] }
        DEPTH REQUIREMENT: Each occasion must feel like a mini ethnographic observation — not a bullet point. Describe the SETTING, the ANXIETY, the WORKAROUND, and the PRODUCT BEHAVIOR for that occasion.
        Must include: (a) overnight/sleep — the 3 AM bedsheet check, caregiver sleep disruption, double-layering rituals, (b) long-distance travel — train/bus journeys 12+ hours, unhygienic public toilets, pre-travel preparation, (c) post-partum/heavy menstrual flow — younger women using for lochia or PCOS flooding, (d) post-surgical recovery — hospital discharge, catheter removal transition, (e) social events — weddings 4-6 hours, temple visits, family functions where sitting/standing alternates, (f) pilgrimage treks — Vaishno Devi, Char Dham, Sabarimala where facilities are scarce, (g) monsoon/traffic — urban commuters stuck 3+ hours, wet clothing compounding, (h) workplace/daily routine — morning walks abandoned, grocery runs timed around bladder.
        Each occasion MUST include at least 2 consumer quotes tagged with speaker profile.

        **switching_patterns** (Array, MINIMUM 5 items):
        IMPORTANT: "Switching" means PRODUCT-TO-PRODUCT transitions between COMMERCIALLY AVAILABLE products only. Do NOT include cotton cloth, rags, old sarees, or any non-commercial homemade solution. Only commercially sold products: sanitary pads, adult diapers, pull-ups, underpads, liners, etc.
        Each item must use EXACTLY this schema:
        { "from_product": "What they switched FROM", "to_product": "What they switched TO", "trigger": "The SWITCHING TRIGGER with consumer quote" }
        Must cover: sanitary pads to adult diapers, tape-style to pant-style, generic brand to premium brand, premium to value brand (cost downgrade), underpad-only to diaper+underpad combo.
        Each pattern MUST include a consumer quote in the trigger field.

        **brand_switching** (Array, MINIMUM 4 items):
        Why consumers switch between BRANDS specifically. Separate from product-type switching.
        Each item = { "from_brand": "Brand A", "to_brand": "Brand B", "reason": "Why they switched with consumer quote" }
        Must cover: availability-driven (chemist stock), price-driven, quality-driven (leakage/rash), recommendation-driven (doctor/family).
        Each reason MUST include a consumer quote.

        **purchase_behaviour**:
        {
          "channels": ["Channel with DETAILED 3-4 sentence description", ...],
          "pack_sizes": ["Pack size with detailed context", ...],
          "price_points_inr": ["Price tier with per-piece pricing and consumer perception", ...],
          "geographic_patterns": ["Regional pattern with behavioral context", ...]
        }
        DEPTH REQUIREMENTS for each sub-field:
        CHANNELS (MINIMUM 6): Each must be 3-4 sentences. Cover: (a) Local Chemist/Pharmacy — why it remains dominant, the trust factor, black bag culture, chemist recommendations influencing brand choice, (b) E-commerce (Amazon/Flipkart) — growth driver for discreet delivery, subscription models, how reviews influence first purchase, price comparison behavior, (c) BigBasket/Quick Commerce (Blinkit/Zepto) — the new discreet channel, impulse vs. planned, (d) Modern Trade (Big Bazaar/Reliance Smart) — self-checkout preference, normalization effect of seeing on shelf, (e) Hospital Pharmacies — point of discharge capture, doctor prescription influence, first-time buyer channel, (f) Wholesale/Medical Supply — institutional buyers, NGO/old age homes, bulk pricing.
        Each channel MUST include consumer context with quote.
        
        PACK SIZES (MINIMUM 4): Each must be 2-3 sentences. Cover: Trial (2-3 units) — the critical first buy, price point, where purchased; Standard (10 units) — weekly replenishment, the most common; Economy/Jumbo (30+ units) — monthly bulk, per-piece savings; Night-specific packs — specialized overnight SKUs. Include pricing context in INR.
        
        PRICE POINTS (MINIMUM 4 tiers): Each must be 2-3 sentences with per-piece pricing AND consumer perception. Cover: Budget (below ₹25/piece), Economy (₹25-40/piece), Mid-market (₹40-65/piece), Premium (₹65-110+/piece). Include what the consumer gets at each tier (basic tape vs. pant style vs. overnight premium).
        
        GEOGRAPHIC PATTERNS (MINIMUM 5): Each must be 2-3 sentences. Cover: (a) Metros (Mumbai/Delhi/Bangalore) — e-commerce penetration, pant-style preference, willingness to pay premium, (b) South India (Kerala/TN/Karnataka) — pharmacy network strength, higher geriatric awareness, (c) Tier 2 cities (Jaipur/Lucknow/Coimbatore) — chemist-dominant, price sensitivity, brand loyalty, (d) Tier 3/Rural — near-zero penetration, awareness gap, kirana channel, (e) East India (Kolkata/Bhubaneswar) — emerging market dynamics.
        
        NOTE: All values must be arrays of PLAIN STRINGS with rich detail. Not objects.

        **consumer_statements** (Array, MINIMUM 4 items):
        Consumer quotes about purchasing habits, usage frequency, brand switching. EVERY quote MUST tag the speaker — e.g., "Quote" — Caregiver, Mumbai.

        JSON: { "occasions_of_use": [...], "switching_patterns": [...], "purchase_behaviour": {...}, "consumer_statements": [...] }
    `,
    "brand_landscape": `
        TASK: Generate 'AdultDiapersBrandLandscapeSectionDTO'.
        
        REQUIREMENTS:

        **brands** (Array, MINIMUM 6 brands):
        Must include: Friends, Lifree, Teddyy, KareIn, TENA, Dignity.
        Use the BRAND_SOV_STATS provided in context data for share_of_voice values.

        For EACH brand:
        {
          "brand": "Brand Name",
          "share_of_voice": { "share_pct": N },
          "overall_sentiment": "POS" | "MIX" | "NEG",
          "positioning_summary": "1-2 sentence consumer perception of this brand. E.g.: 'Friends is seen as the reliable, widely-available default — the Parle-G of adult diapers. Consumers trust it but don't love it.'",
          "attribute_scale": [
            { "attribute": "...", "score_0_5": N }
          ],
          "strengths": ["Specific strength 1 with consumer quote", "Specific strength 2 with consumer quote"],
          "weaknesses": ["Specific weakness 1 with consumer quote", "Specific weakness 2 with consumer quote"],
          "pricing_insight": "Specific pricing commentary — per-piece cost in INR, how consumers perceive value, pack-level pricing comparison",
          "packaging_insight": "Consumer feedback on packaging — discretion, resealability, disposal ease, shelf visibility, bulk vs single",
          "geographic_strength": "Where this brand is strongest — regional dominance, channel preference by city tier, e.g., 'Dominates South India pharmacy channel' or 'Strong on Amazon in metro cities'",
          "sku_highlights": ["Top-performing SKU with why", "Underperforming SKU with why"],
          "verbatims": ["Quote 1 — [User Type], [City]", "Quote 2", "Quote 3", "Quote 4"]
        }

        ATTRIBUTE REQUIREMENTS (min 5 per brand):
        Use THESE specific attributes for consistency across brands:
        absorbency, skin_comfort, fit_for_indian_body, discretion_thinness, odor_control, value_for_money, availability, leak_protection, ease_of_disposal
        Score MUST be differentiated — not every brand gets 4-5 on everything. Show real gaps.
        E.g., Teddyy should score high on value but low on absorbency. TENA high on comfort but low on value.

        STRENGTHS/WEAKNESSES REQUIREMENTS:
        Present as a SWOT-style analysis. Min 2 strengths and 2 weaknesses per brand.
        MUST be specific with consumer evidence — "Good absorption" is too vague. "Handles 8-hour overnight without side-leakage — 'Raat bhar sukha rehta hai'" is specific.
        Include consumer quotes WITHIN the strength/weakness text itself.
        Cover product attributes (absorbency, fit, comfort), commercial factors (pricing, availability, pack sizes), AND perception factors (brand trust, word-of-mouth).

        **market_structure**: Array of 3 strategic bullets about the overall competitive landscape.

        NOTE: Do NOT include word_cloud_terms. Focus on structured attribute analysis, pricing, packaging, and geographic insights instead. Word clouds add no analytical value.

        This should read like a brand health tracker from Kantar or Ipsos.
        
        JSON: { "brands": [...], "market_structure": [...] }
    `
        }
    },
    validators: {
        "incontinence_management": validateIncontinenceManagement,
        "awareness_perception": validateAwarenessPerception,
        "gap_analysis": validateGapAnalysis,
        "user_non_user_profiles": validateUserProfiles,
        "behavioural_profile": validateBehavioural,
        "brand_landscape": validateBrandLandscape
    },
    fallbacks: AD_FALLBACKS
};
