
import { TemplatePack } from '../types';
import { validateIncontinenceManagement, validateAwarenessPerception, validateUserProfiles, validateBehavioural, validateBrandLandscape } from '../utils/validators/adultDiapersValidators';
import { AD_FALLBACKS } from '../utils/fallbacks/adultDiapersFallbacks';

const ADULT_DIAPERS_SYSTEM_PROMPT = `
ROLE: Lead Strategy Consultant (India Market) - Adult Care Sector.
OBJECTIVE: Synthesize raw evidence into a Board-Level Strategic Report (McKinsey/BCG Style).

GLOBAL NON-NEGOTIABLES:
1.  **CONSULTING-GRADE STRUCTURE**: Every insight must follow the logic: Headline -> Signal -> Evidence -> Implication.
2.  **INDIA CONTEXT STRICTNESS**: Pricing in INR (₹). Channels: Chemist, Amazon India. Culture: Joint family, Dignity.
3.  **CONSUMER STATEMENTS**: Every section MUST include specific "verbatims" or "consumer_statements" arrays.
4.  **EVIDENCE LINKING**: Map insights to \`evidence_ids\` from input or seed IDs (SEED_AD_###).
5.  **NO PLACEHOLDERS**: Do not use "Derived", "Insight", "N/A". Use "Market Observation" if needed.
6.  **SOURCE PRIORITIZATION**: 
    - PRIMARY: Amazon.in and Flipkart verified purchase reviews = genuine consumer voice.
    - SECONDARY: Reddit, Web forums, Blogs = organic consumer discussion.
    - DEPRIORITIZE: Instagram and YouTube = heavily influenced by paid media and brand promotions.
    - When using any quote, apply a HUMAN LENS: Is this a genuine consumer experience or paid/promotional content?
    - Indicators of paid content: brand tagging, promotional language, influencer partnerships, "use code", "link in bio".
    - ALWAYS prefer e-commerce reviews over social media for product attribute claims.

OUTPUT FORMAT: Strict JSON. No Wrappers.
`;

export const ADULT_DIAPERS_TEMPLATE: TemplatePack = {
    templateId: "adult_diapers_v2",
    versionPolicy: { locked: true, version: "2.0.0" },
    sections: [
        { sectionId: "incontinence_management", title: "Incontinence Management Profiles", uiSpec: "adult-profile", schema: {} },
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
        
        PROFILES (Generate exactly 4):
        1. **overall_category**: General market-level incontinence patterns.
        2. **self_use**: Active seniors/individuals managing their own condition.
        3. **decider_for_others**: Adult children buying for ageing parents.
        4. **caregiver_bedridden**: Full-time caregivers managing total dependency.

        FOR EACH PROFILE, you MUST provide ALL of the following:
        - **incontinence_issue**: Array of min 2 triggers. Each item = { "headline": "...", "what_it_means": "..." }. Be specific: "Stress incontinence triggered by sneezing/laughing" not just "Bladder weakness".
        - **worst_moments**: Array of min 4 suffering moments. Cover emotional (shame at family gatherings), social (avoiding temple visits), practical (sleep disruption, clothing limitations), and financial (cost burden impacting household budget). Each item = { "headline": "...", "what_it_means": "..." }.
        - **life_impact**: Array of min 3 life impacts. Each item = { "headline": "...", "what_it_means": "..." }. Include severity: social isolation, caregiver burnout, reduced mobility confidence.
        - **solutions**: Array of min 2 solutions. Each item = { "headline": "...", "what_it_means": "..." }. Include both product solutions AND behavioral hacks consumers actually use (e.g., fluid restriction, toilet-mapping routes).
        - **verbatims**: Array of min 3 specific consumer quotes per profile. These must sound like real Indian consumers — use colloquial language, mention specific situations (train journeys, wedding functions, monsoon season), reference real costs in ₹, mention actual brands or channels. EVERY verbatim must feel like you overheard it in a focus group in Lucknow or Pune.
        - **satisfaction**: "High" | "Medium" | "Low"

        DEPTH REQUIREMENT: Each profile should be as detailed as a Kantar consumer deep-dive. A product manager reading this should say "I didn't know that about our consumers."
        
        JSON: { "profiles": { "overall_category": {...}, "self_use": {...}, "decider_for_others": {...}, "caregiver_bedridden": {...} }, "consumer_statements": ["...", "...", "...", "..."] }
    `,
    "awareness_perception": `
        TASK: Generate 'AdultDiapersAwarenessPerceptionSectionDTO'.
        
        REQUIREMENTS:

        **misconceptions** (Array, MINIMUM 5 items):
        Each item = { "headline": "The misconception", "what_it_means": "The reality/correction" }
        Go beyond medical misconceptions. Include:
        - Cultural: "Only for bedridden patients" / "Only for old people"
        - Quality: "All brands are the same" / "Cloth is healthier"
        - Social: "Using diapers means giving up independence"
        - Economic: "Too expensive for regular use"
        - Environmental: "No eco-friendly options exist"
        Each misconception MUST include a consumer evidence quote inline in the what_it_means text.

        **perceptions_and_stigma** (Array, MINIMUM 4 items):
        Each item = { "headline": "Stigma driver name", "what_it_means": "Description with consumer evidence" }
        Cover:
        - Infantilization stigma ("It's for babies")
        - Family judgment in joint household settings
        - Purchase embarrassment at chemist counter
        - Disposal stigma in shared housing
        Each driver MUST include a consumer quote as evidence within the description.

        **decision_journey** (Array, MINIMUM 5 stages):
        Each item = { "headline": "Stage name", "what_it_means": "What happens at this stage with consumer mindset quote" }
        Stages must cover: Trigger Event → Information Search → Evaluation & Trial → First Experience → Adoption or Rejection
        Each stage MUST describe: what the consumer is thinking (include a mindset quote), where they drop off, and what converts them to the next stage. This should read like a McKinsey customer journey map.

        **consumer_statements** (Array, MINIMUM 4 items):
        Clean consumer quotes about awareness and stigma. NO source IDs. NO evidence IDs. Just the quote text as a string. These must sound like real Indian consumers speaking candidly.

        JSON: { "misconceptions": [...], "perceptions_and_stigma": [...], "decision_journey": [...], "consumer_statements": [...] }
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
              "trigger_event": "The specific moment that pushed them to try the product",
              "first_experience": "What their first usage was like — emotional reaction + product feedback",
              "intention_to_continue": "Continue/Stop/Occasional — with reason",
              "cost_sensitivity": "High/Medium/Low",
              "brand_affinity": "Which brand they use and WHY (e.g., 'Loyal to Friends — available at corner chemist' or 'No preference, buys whatever Amazon recommends')",
              "unmet_need": "What the category is NOT solving for them — the gap a brand could fill",
              "verbatims": ["Quote 1", "Quote 2", "Quote 3"]
            }
          ],
          "non_user_profiles": [
            {
              "profile_name": "The [Descriptive Name]",
              "who_they_are": "2-3 sentences with demographics and context",
              "primary_barrier": "The #1 reason they refuse — be specific",
              "cost_sensitivity": "High/Medium/Low",
              "trigger_to_convert": "What event or message COULD convert them",
              "verbatims": ["Quote 1", "Quote 2", "Quote 3"]
            }
          ]
        }
        
        MANDATORY: Return EXACTLY 5 distinct profiles for each list.
        MANDATORY: Each profile MUST have EXACTLY 3 verbatims. Not 1, not 2 — THREE.
        
        Profile diversity requirements:
        USERS must include: a young menstrual-overflow user, a travel-occasion user, a post-surgical user, a dignity-seeking elder, and a caregiver/bulk buyer.
        NON-USERS must include: a stigma resister, a cost resister, a cloth loyalist, a low-awareness elder, and a disposal/logistics barrier.
    `,
    "behavioural_profile": `
        TASK: Generate 'AdultDiapersBehaviouralProfileSectionDTO'.
        
        REQUIREMENTS:

        **occasions_of_use** (Array, MINIMUM 5 items):
        Each item = { "headline": "Occasion name", "what_it_means": "Description with frequency estimate and consumer quote" }
        Must include: overnight/sleep, long-distance travel (train/bus), heavy menstrual flow, post-surgical recovery, social events (weddings/temple), workplace/school use.
        Each occasion MUST include a consumer quote in the description.

        **switching_patterns** (Array, MINIMUM 4 items):
        Each item must use EXACTLY this schema:
        { "from_product": "What they switched FROM", "to_product": "What they switched TO", "trigger": "What caused the switch" }
        Must cover: cloth/rags → disposable, sanitary pads → adult diapers, tape-style → pant-style, generic brand → premium brand.
        Each pattern MUST include a consumer quote in the trigger field.

        **purchase_behaviour**:
        {
          "channels": ["Channel 1 with detail", "Channel 2 with detail", ...],  // Min 4: Pharmacy/Chemist, Supermarket, E-commerce (Amazon/Flipkart/BigBasket), Hospital/Institutional
          "pack_sizes": ["Size 1 description", "Size 2 description", ...],      // Min 3: Trial (2-5 units), Standard (10 units), Bulk/Monthly (30+ units)
          "price_points_inr": ["Tier 1", "Tier 2", "Tier 3"]                    // Min 3 tiers in INR with per-piece pricing
        }
        NOTE: channels, pack_sizes, and price_points_inr must be arrays of PLAIN STRINGS. Not objects. Just strings.

        **consumer_statements** (Array, MINIMUM 4 items):
        Consumer quotes about purchasing habits, usage frequency, brand switching. This section currently has ZERO consumer statements — you MUST fix this.

        JSON: { "occasions_of_use": [...], "switching_patterns": [...], "purchase_behaviour": {...}, "consumer_statements": [...] }
    `,
    "brand_landscape": `
        TASK: Generate 'AdultDiapersBrandLandscapeSectionDTO'.
        
        CRITICAL SOURCE PRIORITIZATION:
        - PRIMARY SOURCES for Attribute Performance, Strengths & Weaknesses: Amazon.in reviews and Flipkart reviews ONLY.
          These are verified purchase reviews = genuine consumer voice.
        - SECONDARY SOURCES (for sentiment context only): Reddit, Web forums, Blogs.
        - EXCLUDE or DEPRIORITIZE: Instagram and YouTube content — these are heavily influenced by paid media, 
          brand promotions, and influencer partnerships. Do NOT use Instagram/YouTube quotes as evidence 
          for product performance claims. If referencing social media, explicitly label as "PAID/PROMOTIONAL CONTEXT".
        - HUMAN LENS: When encountering any quote, assess: Is this a genuine consumer experience or an advertising statement?
          Advertising indicators: excessive brand tagging, promotional language ("use code", "link in bio"), 
          unnatural enthusiasm without specific product details. Filter these OUT.

        REQUIREMENTS:

        **brands** (Array, MINIMUM 6 brands):
        Must include: Friends, Lifree, Teddyy, KareIn, TENA, Dignity.
        Use the BRAND_SOV_STATS provided in context data for share_of_voice values.

        For EACH brand:
        {
          "brand": "Brand Name",
          "share_of_voice": { "share_pct": N },
          "overall_sentiment": "POS" | "MIX" | "NEG",
          "positioning_summary": "1-2 sentence consumer perception. E.g.: 'Friends is seen as the reliable, widely-available default.'",
          "attribute_scale": [
            { "attribute": "...", "score_0_5": N }
          ],
          "strengths": ["Specific strength from Amazon/Flipkart reviews"],
          "weaknesses": ["Specific weakness from Amazon/Flipkart reviews"],
          "verbatims": ["Quote 1 (Amazon)", "Quote 2 (Flipkart)", "Quote 3 (Amazon)", "Quote 4 (Flipkart)"]
        }

        ATTRIBUTE REQUIREMENTS (min 5 per brand):
        Use THESE specific attributes for consistency across brands:
        absorbency, skin_comfort, fit_for_indian_body, discretion_thinness, odor_control, value_for_money, availability, leak_protection, ease_of_disposal
        Score MUST be differentiated — not every brand gets 4-5 on everything. Show real gaps.

        VERBATIM REQUIREMENTS: Min 4 per brand from Amazon/Flipkart reviews ONLY. Mix positive AND negative.

        STRENGTH/WEAKNESS: Min 2 each per brand. Be specific and sourced from e-commerce reviews.

        **market_structure**: Array of 3 strategic bullets about the overall competitive landscape.

        This should read like a brand health tracker from Kantar or Ipsos.
        
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
