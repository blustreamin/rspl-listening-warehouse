
import { TemplatePack, ProjectId } from '../types';
import { ADULT_DIAPERS_TEMPLATE } from '../templates/adult_diapers_template';

const ANALYST_GRADE_SYSTEM_PROMPT = `
SYSTEM OVERRIDE: STRATEGIC BOARD-LEVEL SYNTHESIS MODE (McKinsey/BCG Style) - INDIA MARKET FOCUS
You are the Lead Strategy Consultant for RSPL (India). 
Input data includes an 'evidence_summary' and a list of 'events' from Indian e-commerce (Amazon.in, Flipkart, Nykaa) and social platforms.

GLOBAL NON-NEGOTIABLE RULES:
1. EXECUTIVE TONE: Use precise, analytical, non-emotional language. 
   - AVOID: "Users like", "Consumers feel", "There are mentions of", "Maybe", "Possibly".
   - USE: "Mentions cluster around", "Evidence indicates", "Adoption is triggered when", "Category substitution observable in", "Elasticity is constrained by", "The dominant failure mode is".
2. INDIA CONTEXT ONLY: 
   - CURRENCY: All pricing must be in INR (₹). Convert USD to INR (~₹83) if found.
   - GEOGRAPHY: Tier 1/Metro, Tier 2, Tier 3. NO mentions of US, UK, Europe, China.
   - PLATFORMS: Amazon.in, Flipkart, Nykaa, Blinkit, Zepto. NO TikTok.
3. STRUCTURED ARGUMENTATION: Every insight must follow: Headline -> Signal Summary -> Evidence -> Strategic Implication.
4. EVIDENCE ANCHORING: Every major insight block MUST be backed by 3-5 distinct consumer quotes.
   - For List Fields (e.g. bullets): Add quotes as distinct items prefixed with "📢 ".
   - For Text Fields: Append "\n\nCONSUMER EVIDENCE:\n• \"Quote\" (Source)\n• \"Quote\" (Source)" to the field.
5. QUANTIFY EVERYTHING: Use counts/percentages/share estimates where available (e.g. "High dominance", "65% of mentions").
   - If N is low (<10), explicitly state: "Signal size limited; directional only."
6. NO BULLET DUMPS: Cluster bullets logically (e.g. "Reliability Factors", "Cost Perception").
7. SOURCE TRANSPARENCY: Label quotes with source (Amazon, Flipkart, Social).
8. DATA GAPS: Do NOT output "No explicit evidence". Use structured inference based on Indian category norms labeled "INFERRED: [Rationale]".
9. CROSS-FILE SYNTHESIS: Aggregate insights across ALL provided input files. Do not bias towards the first file.
`;

// Validation Helpers
const hasMinItems = (arr: any[], min: number) => Array.isArray(arr) && arr.length >= min;

const FALLBACK_GAP_ANALYSIS = {
    current_challenges: {
        heading: "Current Challenges of Period Management",
        bullets: [
            { claim: "Leakage Anxiety", explanation: "Fear of staining during sleep/travel.", consumer_evidence: [], evidence_ids: [], severity: "HIGH" },
            { claim: "Rash & Irritation", explanation: "Humidity-induced friction from synthetic pads.", consumer_evidence: [], evidence_ids: [], severity: "HIGH" },
            { claim: "Disposal Logistics", explanation: "Lack of private disposal methods in shared restrooms.", consumer_evidence: [], evidence_ids: [], severity: "MED" }
        ]
    },
    resolved_challenges: { heading: "Which Challenges are Resolved?", bullets: [] },
    unresolved_challenges: { heading: "Which Challenges are Un-Resolved?", bullets: [] },
    need_gap: { heading: "What is the Need Gap", need_statements: [] }
};

const FALLBACK_DEEP_DIVE = {
  role_summary: { 
    boldTitle: "Role in Lifecycle", 
    bullets: [
        "SEED: Primary usage driver is travel/convenience to avoid washing logistics.",
        "SEED: Secondary driver is 'backup' protection alongside tampons.",
        "📢 \"Used these for my 12hr flight and it was a lifesaver.\" (Amazon)",
        "📢 \"Good backup for heavy days but wouldn't trust alone.\" (Flipkart)"
    ], 
    evidence_ids: [], 
    confidence: "MED" 
  },
  users: {
    discovery_sources: ["SEED: Instagram/TikTok Ads", "SEED: Peer Recommendation"],
    triggers: ["SEED: Upcoming vacation/travel logistics", "SEED: Recurring rash from synthetic pads"],
    experience_parameters: [
      { parameter: "Comfort", insight: "SEED: Rated significantly higher than pads.\n\nCONSUMER EVIDENCE:\n• \"Softer than any pad I've used.\" (Amazon)", sentiment: "POS", evidence_ids: [] },
      { parameter: "Absorption", insight: "SEED: Sufficient for medium flow.\n\nCONSUMER EVIDENCE:\n• \"Holds up well for 4-5 hours.\" (Social)", sentiment: "MIX", evidence_ids: [] },
      { parameter: "Price", insight: "SEED: High unit cost limits adoption.\n\nCONSUMER EVIDENCE:\n• \"Too expensive for daily use.\" (Flipkart)", sentiment: "NEG", evidence_ids: [] }
    ],
    brands: [{ brand: "Brand X", sentiment: "Neutral", share: { count: 0, pct: 0 }, evidence_ids: [] }]
  },
  non_users: {
    barriers_to_try: [
        { title: "Price Barrier", bullets: ["SEED: Upfront cost per unit is perceived as high."] },
        { title: "Hygiene Doubt", bullets: ["SEED: Concerns about sitting in blood."] }
    ]
  },
  segmentation: { lifestage: [], geography: [] }
};

const FALLBACK_VISUALS = {
  sources_chart: { data: [{source: "Amazon", count: 45, pct: 42}, {source: "Flipkart", count: 30, pct: 28}, {source: "Social", count: 32, pct: 30}] },
  word_cloud_themes: { tokens: [{term: "Leakage", weight: 10}, {term: "Rash", weight: 9}, {term: "Comfort", weight: 8}, {term: "Sleep", weight: 7}, {term: "Travel", weight: 6}, {term: "Eco-friendly", weight: 5}] },
  word_cloud_sizes_brands: { tokens: [{term: "L", weight: 5}, {term: "XL", weight: 5}, {term: "M", weight: 4}] }
};

const GAP_ANALYSIS_PROMPT = `
SECTION: GAP ANALYSIS (INDIA MARKET)
Output Object: {
  "current_challenges": { "heading": "Current Challenges of Period Management", "bullets": Array<{claim, explanation, consumer_evidence: Array<{quote, source}>, evidence_ids: [], severity: "HIGH"|"MED"|"LOW", impacted_occasions: []}> },
  "resolved_challenges": { "heading": "Which Challenges are Resolved?", "bullets": Array<GapBullet> },
  "unresolved_challenges": { "heading": "Which Challenges are Un-Resolved?", "bullets": Array<GapBullet> },
  "need_gap": { "heading": "What is the Need Gap", "need_statements": Array<{need, why_now, who, measurable_proxy, consumer_evidence: Array<{quote, source}>, evidence_ids: [], priority: "P0"|"P1"|"P2"}> }
}

STRATEGIC DIRECTIVE:
1. "Current Challenges": Identify persistent pain points in India (e.g. Rash from humidity, disposal stigma, staining anxiety in school/work, sleep disruption).
2. "Resolved": Identify what the current product format has successfully solved based on positive evidence (e.g. "Sleep leakage solved by Panties").
3. "Unresolved": Identify what persists despite the product (e.g. "Cost barrier", "Disposal in public toilets", "Sweat/Heat issues").
4. "Need Gap": Synthesize the white space. What is the user screaming for that no product fully addresses?

REQUIREMENTS:
- Minimum 7 bullets for Current Challenges.
- Minimum 5 bullets each for Resolved/Unresolved.
- Minimum 6 Need Statements.
- EVIDENCE: Use whatever quotes exist. If evidence is thin (<3 quotes), use "Paraphrased from dataset signals" as the quote text.
- STRICTLY NO FOREIGN MARKETS. India Only.
- STRICTLY NO RAW JSON IN OUTPUT.
`;

const SEGMENTATION_SCHEMA_DESCRIPTION = `
"segmentation": {
    "by_lifestage": Array<{
        segment_name: "Teenagers (12–17)" | "Young Adults (18–25)" | "Working Women" | "Postpartum Women" | "Perimenopausal",
        size_signal: "High"|"Medium"|"Low" (share of voice),
        adoption_drivers: string[],
        core_tension: string,
        functional_expectations: string[],
        emotional_drivers: string[],
        barriers: string[],
        switching_triggers: string[],
        brand_signals: string[],
        price_sensitivity: "High"|"Medium"|"Low",
        consumer_evidence: Array<{quote, source}>,
        commercial_implication: string,
        confidence: "High"|"Medium"|"Low"
    }>,
    "by_geography": Array<{
        region_type: "Metro India" | "Tier 2/3 Cities" | "E-commerce Native" | "Offline-led" | "Price-Sensitive",
        behavioral_pattern: string,
        adoption_triggers: string[],
        infrastructure_factor: string,
        affordability_dynamic: string,
        brand_exposure_pathway: string[],
        barriers: string[],
        consumer_evidence: Array<{quote, source}>,
        commercial_implication: string,
        confidence: "High"|"Medium"|"Low"
    }>
}
`;

export const TEMPLATE_REGISTRY: Record<ProjectId, TemplatePack> = {
  "adult-diapers": ADULT_DIAPERS_TEMPLATE,
  "disposable-period-panties": {
    templateId: "femcare_disposable_v3_1",
    versionPolicy: { locked: true, version: "3.1.0" },
    sections: [
      { sectionId: "1", title: "Menstruation Context & Trends", uiSpec: "cards", schema: { type: "object", required: ["cards"] } },
      { sectionId: "gap_analysis", title: "Gap Analysis", uiSpec: "gap-analysis", schema: { type: "object", required: ["current_challenges", "need_gap"] } },
      { sectionId: "2", title: "Behavioural: Triggers & Barriers", uiSpec: "matrix", schema: { type: "object", required: ["trigger_clusters", "barrier_groups"] } },
      { sectionId: "3", title: "What's Working: Proof Points", uiSpec: "cards", schema: { type: "object", required: ["proof_points"] } },
      { sectionId: "4", title: "Role of Product & Lifestage", uiSpec: "cards", schema: { type: "object", required: ["roles"] } },
      { sectionId: "5", title: "Product Ecosystem (Formats)", uiSpec: "cards", schema: { type: "object", required: ["formats"] } },
      { sectionId: "6", title: "Attribute Trade-off Matrix", uiSpec: "matrix", schema: { type: "object", required: ["tradeoff_matrix"] } },
      { sectionId: "7", title: "Brand Performance", uiSpec: "matrix", schema: { type: "object", required: ["brand_performance"] } },
      { sectionId: "8", title: "Awareness & Purchase Channels", uiSpec: "funnel", schema: { type: "object", required: ["discovery_sources"] } },
      { sectionId: "9", title: "Deep Dive: Disposable Panties", uiSpec: "text-list", schema: { type: "object", required: ["users", "non_users"] } },
      { sectionId: "10", title: "Visual Synthesis", uiSpec: "cards", schema: { type: "object", required: ["word_cloud_themes"] } },
      { sectionId: "11", title: "Geographic & Regional Insights", uiSpec: "cards", schema: { type: "object", required: ["cards"] } }
    ],
    promptPack: {
      systemPrompt: ANALYST_GRADE_SYSTEM_PROMPT + `
DISPOSABLE PERIOD PANTIES — ADDITIONAL RULES:
- BRAND NAME IN VERBATIMS: For Amazon.in and Flipkart sourced quotes, the "source" field MUST include the brand variant being reviewed. Format: "Amazon.in · Whisper Pants L", "Flipkart · Nua Disposable M-L", "Amazon.in · Sirona Disposable XL". This is NON-NEGOTIABLE.
- CONSUMER DESCRIPTION: Every verbatim must include consumer description with age, role, city/tier. E.g. "25F, College student, Bangalore", "32F, Working mother, Tier 2 Lucknow".
`,
      sectionPrompts: {
        "1": `
        SECTION 1: MENSTRUATION CONTEXT & TRENDS (INDIA FOCUS)
        Output Object: { "cards": Array<{boldTitle, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED", metrics: [{label, value, pct}]}> }
        
        STRATEGIC DIRECTIVE:
        Construct a 3-Layer Contextual Analysis specific to the Indian consumer:
        1. Macro Trend Layer: Premiumization in Tier 1 vs Value-seeking in Tier 2; Sustainability narrative among elite urban circles.
        2. Behavioral Reality Layer: Coping mechanisms (doubling pads), Product layering, Flow management in humid conditions.
        3. Emotional Impact Layer: Anxiety triggers (staining in school/office), Sleep disruption, Social withdrawal.

        REQUIREMENTS:
        - Generate Minimum 8 cards covering these layers.
        - "boldTitle": Must be a strategic headline (e.g., "Premiumization of Pain Management").
        - "bullets": Synthesize evidence. MUST include 3 quotes starting with "📢 ".
        - "metrics": Estimate prevalence if possible.
        - SEGMENTATION: Explicitly mention differences between Teens vs Adults vs Postpartum.
        `,
        "gap_analysis": GAP_ANALYSIS_PROMPT,
        "2": `
        SECTION 2: BEHAVIOURAL LANDSCAPE (TRIGGERS & BARRIERS)
        Output Object: {
          "trigger_clusters": Array<{title, explanation, intensity: "HIGH"|"MED", evidence_ids: []}> (Min 6),
          "barrier_groups": Object { "Economic": string[], "Psychological": string[], "Product_Trust": string[], "Cultural": string[] },
          "switching_dynamics": Array<{pathway: "From -> To", insight, logic_bullets: string[], evidence_ids: []}>,
          "brand_switching": Array<{from_brand: string, to_brand: string, reason: string, trigger: string, evidence_ids: []}>
        }
        
        STRATEGIC DIRECTIVE:
        A. Adoption Triggers: Cluster into Fear-driven (leakage anxiety), Occasion-driven (travel/weddings/exams), and Identity-driven (modernity).
        B. Barriers: 
           - Economic: Price sensitivity (₹ per unit).
           - Psychological: "Diaper stigma" is critical in India.
           - Product Trust: Hygiene concerns, rash fears.
           - Cultural: Disposal taboos (how to throw away bulky items).
        C. Switching Logic: Map pathways with GRANULAR pad type bifurcation. Do NOT use generic "Sanitary Pads".
           Instead, specify the pad FORMAT being switched FROM:
           - Fluff Pads: Fluff Regular, Fluff XL, Night Fluff
           - Ultra Pads: Mid Ultra, Premium Ultra, Night Ultra
           Minimum pathways: "Fluff XL → Disposable Panties (Night)", "Night Ultra → Disposable Panties (Heavy Flow)",
           "Fluff Regular → Disposable Panties (Travel)", "Premium Ultra → Disposable Panties (Confidence)".
           If exact pad type data is unavailable, use at minimum "Fluff Pads → Disposable Panties" and "Ultra Pads → Disposable Panties" 
           as the two categories. NEVER just say "Sanitary Pads" or "Pads".
        D. Brand Switching: Why do users switch FROM one brand TO another within disposable period panties?
           - Map specific brand-to-brand switches (e.g. "Whisper → Carmesi", "Sirona → Azah").
           - IMPORTANT: For each brand mention, include the BRAND VARIANT or product line where possible.
             E.g. "Whisper Ultra Night XL" not just "Whisper". "Carmesi Disposable Period Panty M-L" not just "Carmesi".
           - Clarify whether each brand name refers to a DISPOSABLE PERIOD PANTY brand or a SANITARY PAD brand.
             Label explicitly: "(Pad Brand)" or "(Period Panty Brand)" after each brand name.
           - For each: What triggered the switch? (Price, rash, availability, influencer, better absorption).
           - Minimum 5 brand switching pathways.

        REQUIREMENTS:
        - SEPARATION: 'trigger_clusters' = drivers; 'barrier_groups' = frictions.
        - Barrier Groups: Do not leave empty. Infer from Indian category norms if data missing.
        `,
        
        "3": `
        SECTION 3: WHAT'S WORKING (PROOF POINTS)
        Output Object: {
           "proof_points": Array<{title, insight, quote: "Verbatim...", evidence_ids: []}> (Min 6)
        }
        
        STRATEGIC DIRECTIVE:
        Identify "Delighters" and "Sticky Features" that drive retention in the Indian market.
        Focus on:
        - Functional Resolution: "Zero-leakage sleep" (critical for joint families/shared spaces).
        - Emotional Resolution: "Anxiety-free travel" (trains/long commutes).
        - "Aha!" Moments: The first night of uninterrupted sleep.
        `,
        
        "4": `
        SECTION 4: ROLE OF PRODUCT & LIFESTAGE
        Output Object: {
            "roles": Array<{format_name, job_to_be_done, lifestage_fit: string, evidence_ids: []}>
        }
        
        STRATEGIC DIRECTIVE:
        Map the "Job to be Done" for each format across the lifecycle in India:
        - Menarche (Ease of use vs Pads).
        - College/Workforce (Long commute protection).
        - Postpartum (Heavy flow management - Lochia).
        - Perimenopause (Unpredictability management).
        `,

        "5": `
        SECTION 5: PRODUCT ECOSYSTEM
        Output Object: {
           "formats": Array<{format, role_in_lifecycle, functional_resolution[], emotional_resolution[]}>
        }
        
        STRATEGIC DIRECTIVE:
        Analyze the ecosystem as a complementary portfolio.
        For each format (Pads, Disposables, Reusables, Cups):
        - Define specific role (e.g. "Backup", "Primary Night", "Travel Only").
        - Functional Win vs Limitation (Humidity/Rash).
        - Emotional Payoff (Confidence).
        - Situational Dominance (e.g., Heavy Flow Nights).
        `,

        "6": `
        SECTION 6: ATTRIBUTE TRADE-OFF MATRIX
        Output Object: {
           "tradeoff_matrix": Array<{attribute, pads, disposable_panties, reusable_panties, winner}> (Min 8 attributes)
        }
        
        STRATEGIC DIRECTIVE:
        Comparative Analysis across: 
        - Leak Protection (Critical)
        - Absorption Duration
        - Comfort (Chaffing/Rash in humidity)
        - Cost Efficiency (₹)
        - Sustainability Perception
        - Disposal Convenience (India specific context)
        - Teen Suitability
        - Heavy Flow Management
        
        REQUIREMENTS:
        - "winner": Explicitly state the winning format.
        - Populate ALL attributes.
        - India contextual note for Cost and Disposal.
        `,

        "7": `
        SECTION 7: BRAND PERFORMANCE + DRIVER ANALYSIS
        Output Object: {
           "brand_performance": Array<{
              brand: string, 
              attribute_scale: Array<{attribute: string, score_0_5: number, pct_of_reviews_mentioning: number}>,
              key_strengths: string[], 
              key_weaknesses: string[], 
              attribute_verdict: string, 
              brand_share_estimate: string, 
              price_band: string, 
              evidence_ids: [],
              verbatims: Array<{quote: string, source: string, consumer: string}>
           }>,
           "driver_analysis": {
              "category_drivers": {
                "heading": "Disposable Period Panty Category — Attribute Driver Hierarchy",
                "attribute_hierarchy": Array<{attribute: string, pct_of_reviews: number, impact: "HIGH"|"MED"|"LOW", sentiment_split: {positive_pct: number, negative_pct: number}, insight: string, verbatims: Array<{quote, source, consumer}>}>
              },
              "brand_drivers": Array<{
                brand: string,
                attribute_hierarchy: Array<{attribute: string, pct_of_reviews: number, impact: "HIGH"|"MED"|"LOW", sentiment_split: {positive_pct: number, negative_pct: number}, insight: string}>,
                net_sentiment_driver: string
              }>
           }
        }
        
        STRATEGIC DIRECTIVE:
        Competitive Landscape Audit (India) + Attribute Driver Analysis from Amazon.in & Flipkart reviews ONLY.

        MANDATORY BRANDS FOR DRIVER ANALYSIS (focus brands):
        Whisper, Nua, Evereve, Plush, Pee Safe, Sirona.
        
        ADDITIONAL BRANDS (include in brand_performance but not detailed driver analysis):
        Carmesi, Azah, Clovia, Always.

        For EACH brand in brand_performance:
        - attribute_scale: Min 8 attributes rated 0-5 (from e-commerce reviews). Scores MUST be differentiated across brands.
        - attribute_verdict: Concise strategic summary.
        - brand_share_estimate: Estimated % share of mentions/reviews.
        - price_band: Approx ₹ per unit.
        - Min 3 verbatims per brand with source including brand variant: "Amazon.in · Whisper Pants L", "Flipkart · Nua Disposable".
        - NO empty strengths/weaknesses.
        DO NOT include market_position labels like "Leader", "Challenger", "Niche", "Emerging".

        ATTRIBUTE LIST (use these consistently across all brands):
        comfort, softness, dryness, wetness_control, leak_protection, fit, absorption, rash_free, odour_control, ease_of_use, discretion, value_for_money, disposal_ease, breathability
        
        DRIVER ANALYSIS (MANDATORY):
        
        A. CATEGORY-LEVEL ATTRIBUTE HIERARCHY:
        Rank ALL 14 attributes by % of reviews mentioning them for the entire Disposable Period Panty category.
        Example: comfort: 68% of reviews, leak_protection: 62%, fit: 55%, dryness: 48%...
        For each: sentiment split (what % mention it positively vs negatively), insight on WHY it matters.
        Min 2 verbatims per top-5 attribute.
        
        B. BRAND-LEVEL ATTRIBUTE HIERARCHY (for 6 focus brands ONLY):
        For each of Whisper, Nua, Evereve, Plush, Pee Safe, Sirona:
        Rank their top attributes by % of THAT BRAND's reviews.
        Show where each brand over-indexes vs category average.
        net_sentiment_driver: "What single attribute most drives this brand's rating?"
        
        SOURCE: Amazon.in and Flipkart verified reviews ONLY for scores, %, and driver analysis.
        `,
        
        "8": `
        SECTION 8: AWARENESS & PURCHASE CHANNELS
        Output Object: {
           "discovery_sources": Array<{source, strength: "High"|"Med"}>,
           "purchase_channels": Array<{channel, role: "Primary"|"Secondary"|"Emerging", formats_sold: string[], consumer_evidence: Array<{quote, source}>}>,
           "search_intent_clusters": Array<{cluster_name, example_queries[]}> (Min 5),
           ${SEGMENTATION_SCHEMA_DESCRIPTION}
        }
        
        STRATEGIC DIRECTIVE:
        Full Funnel Analysis: Discovery -> Validation -> Purchase.
        
        A. SOURCE OF AWARENESS per format:
        - How do consumers first hear about Disposable Panties vs Pads vs Cups?
        - Dominant discovery: Influencers (Insta/YouTube) vs Search vs Peer vs TVC.
        
        B. PURCHASE CHANNELS per format:
        - Online: Amazon.in, Flipkart, Nykaa, Brand D2C, Quick Commerce (Blinkit/Zepto/Instamart).
        - Offline: Pharmacy/Chemist, Supermarket/DMart, General Store.
        - Which channel dominates for which format?
        
        C. VALIDATION: Reviews on Amazon/Nykaa vs Chemist trust vs Peer recommendation.

        SEGMENTATION REQUIREMENT (STRICT):
        - You MUST generate detailed profiles for all 5 Lifestage Cohorts: Teenagers, Young Adults, Working Women, Postpartum, Perimenopause.
        - You MUST generate detailed profiles for all 5 Geography Cohorts: Metro, Tier 2/3, E-commerce Native, Offline-led, Price-Sensitive.
        - Populate ALL fields (core_tension, adoption_drivers, commercial_implication) with deep strategic insight.
        `,
        
        "9": `
        SECTION 9: DEEP DIVE - DISPOSABLE PERIOD PANTIES
        Output Object: {
           "role_summary": { boldTitle, bullets[], confidence },
           "users": { 
              "discovery_sources": string[], 
              "triggers": string[], 
              "experience_parameters": Array<{parameter, sentiment: "POS"|"NEG"|"MIX", insight}>,
              "delighters": string[],
              "failures": string[],
              "brands": Array<{brand, sentiment: "POS"|"NEG"|"MIX", share: {count, pct}, evidence_ids: []}>
           },
           "non_users": { 
              "awareness_quality": string,
              "brands_aware": string[],
              "barriers_to_try": Array<{title, bullets[]}> 
           },
           "future_intent": { 
              "repurchase_signals": string[],
              "switching_risk": string[],
              "growth_vectors": string[]
           },
           ${SEGMENTATION_SCHEMA_DESCRIPTION}
        }
        
        STRATEGIC DIRECTIVE:
        Comprehensive Category Audit mapping to CLIENT BRIEF.
        
        A. AMONG USERS:
        1. Product Discovery — how did they first hear about it?
        2. What Triggered Usage — occasion, need, influence?
        3. Product Experience — MANDATORY 9 PARAMETERS (rate each POS/NEG/MIX with evidence):
           a) Comfort  b) Long lasting  c) No leakage  d) Absorption  
           e) Dryness  f) Softness  g) Malodour control  h) Freshness  i) Thickness/Thinness
        4. What the product SOLVED (delighters) and where it FAILED.
        5. Key brand players — overall sentiment per brand, brand share estimate.
        6. Future disposition — repurchase intent, switching risk.

        B. AMONG NON-USERS:
        1. Quality & source of awareness.
        2. Brands they are aware of (even if not tried).
        3. Barriers to try (if aware).

        SEGMENTATION REQUIREMENT (STRICT):
        - You MUST generate detailed profiles for all 5 Lifestage Cohorts: Teenagers, Young Adults, Working Women, Postpartum, Perimenopause.
        - You MUST generate detailed profiles for all 5 Geography Cohorts: Metro, Tier 2/3, E-commerce Native, Offline-led, Price-Sensitive.
        - Populate ALL fields (core_tension, adoption_drivers, commercial_implication) with deep strategic insight.
        `,
        
        "10": `
        SECTION 10: VISUAL SYNTHESIS
        Output Object: {
           "sources_chart": { "data": Array<{source, count, pct}> },
           "word_cloud_themes": { "tokens": Array<{term, weight}> }
        }
        
        REQUIREMENTS:
        - Source Volume: ALWAYS render full distribution. Include Flipkart.
        - Themes: Extract high-impact strategic themes (e.g. "Travel Freedom", "Sleep Security", "Rash Relief").
        `,

        "11": `
        SECTION 11: GEOGRAPHIC & REGIONAL INSIGHTS
        Output Object: { "cards": Array<{boldTitle: string, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED"|"LOW", metrics: Array<{label: string, value: string}>}> }
        
        STRATEGIC DIRECTIVE:
        Extract geographic and regional trends from the evidence base. Analyze how disposable period panty adoption, brand preference, channel usage, and consumer sentiment vary by geography.
        
        MANDATORY CARDS (min 6):
        
        1. "Metro vs Tier 2/3 Adoption Gap":
        - Metro cities (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata): adoption rate, brand preferences, purchase channel (D2C/Quick Commerce dominant?)
        - Tier 2/3 cities: awareness levels, barriers, which brands penetrate, chemist vs online
        - Data points count for each tier
        
        2. "North India Regional Trends":
        - Delhi NCR, UP, Punjab, Rajasthan patterns
        - Brand preferences, price sensitivity, channel (pharmacy vs Amazon)
        - Cultural factors affecting adoption
        
        3. "South India Regional Trends":
        - Bangalore, Chennai, Hyderabad, Kerala patterns
        - Higher health awareness? Different brand preferences?
        - Language/content consumption patterns affecting discovery
        
        4. "East & Northeast India":
        - Kolkata, Assam, Odisha patterns
        - Availability gaps, awareness levels
        - Any emerging adoption signals?
        
        5. "West India Regional Trends":
        - Mumbai, Pune, Gujarat, Goa patterns
        - Quick commerce penetration (Blinkit/Zepto), D2C adoption
        - Price elasticity differences
        
        6. "E-Commerce Geography: Where Orders Ship":
        - Pin code concentration from Amazon/Flipkart review data
        - Which cities dominate verified purchase reviews?
        - Metro vs non-metro ordering patterns
        
        7. "Regional Brand Dominance Map":
        - Which brand dominates which region/city?
        - Whisper (national) vs D2C brands (metro-concentrated)?
        - Any regional brands or local preferences?
        
        For EACH card:
        - Include brand names in verbatim sources: "Amazon.in · Whisper Pants L"
        - Include consumer description with city/region
        - metrics: [{label: "Data Points", value: "N"}, {label: "Key City", value: "CityName"}]
        - Confidence: HIGH if supported by review location data, MED if inferred from language/context, LOW if thin data
        
        If geographic data is sparse for a region, explicitly state the data limitation and provide whatever signals exist.
        `
      }
    },
    validators: {
      "1": (d: any) => hasMinItems(d.cards, 8),
      "gap_analysis": (d: any) => hasMinItems(d.current_challenges?.bullets, 1) && hasMinItems(d.need_gap?.need_statements, 1),
      "2": (d: any) => hasMinItems(d.trigger_clusters, 6) && d.barrier_groups && Object.keys(d.barrier_groups).length >= 4,
      "3": (d: any) => hasMinItems(d.proof_points, 6),
      "4": (d: any) => hasMinItems(d.roles, 3),
      "6": (d: any) => hasMinItems(d.tradeoff_matrix, 8),
      "7": (d: any) => hasMinItems(d.brand_performance, 5),
      "9": (d: any) => d.users && hasMinItems(d.users.experience_parameters, 8),
      "11": (d: any) => hasMinItems(d.cards, 4)
    },
    fallbacks: {
      "1": { cards: [
          { boldTitle: "Comfort Demand", bullets: ["SEED: Users prioritize skin-feel.", "📢 \"Softer than pads.\" (Amazon)"], confidence: "MED", evidence_ids: [] }, 
          { boldTitle: "Leakage Anxiety", bullets: ["SEED: Night use is primary driver.", "📢 \"No leaks all night.\" (Flipkart)"], confidence: "MED", evidence_ids: [] }
      ]},
      "gap_analysis": FALLBACK_GAP_ANALYSIS,
      "2": { 
          trigger_clusters: [{ title: "Travel/Vacation", explanation: "SEED: Need for hassle-free management.\n\nCONSUMER EVIDENCE:\n• \"Packed for my trip.\" (Social)", evidence_ids: [] }],
          barrier_groups: { "Economic": ["SEED: High cost per unit"], "Psychological": ["SEED: Diaper-like feel"] },
          switching_dynamics: [{ pathway: "Pads -> Disposable Panties", logic_bullets: ["SEED: Better coverage/sleep"], evidence_ids: [] }],
          brand_switching: [{ from_brand: "Whisper", to_brand: "Carmesi", reason: "SEED: Better softness and less rash", trigger: "Instagram review", evidence_ids: [] }]
      },
      "3": { proof_points: [{ title: "Sleep Assurance", insight: "Users can sleep without staining sheets.", quote: "Best sleep in years.", evidence_ids: [] }] },
      "4": { roles: [{ format_name: "Disposable Panties", job_to_be_done: "Overnight Security", lifestage_fit: "Teens/Adults", evidence_ids: [] }] },
      "5": { formats: [{ format: "Disposable Panties", role_in_lifecycle: "SEED: Night/Travel", evidence_ids: [] }, { format: "Pads", role_in_lifecycle: "SEED: Daily Default", evidence_ids: [] }] },
      "6": { tradeoff_matrix: [{attribute: "Cost", winner: "Pads", pads: "Low", disposable_panties: "High", reusable_panties: "Med"}] },
      "7": { brand_performance: [{ brand: "Whisper", key_strengths: ["Availability"], key_weaknesses: ["Price"], attribute_verdict: "Leader in reach.", evidence_ids: [] }] },
      "8": { discovery_sources: [{source: "Instagram Ads", strength: "High"}, {source: "Influencer Reel", strength: "High"}], search_intent_clusters: [{cluster_name: "Heavy Flow Solutions", example_queries: ["best pads for heavy flow"]}], segmentation: { lifestage: [], geography: [] } },
      "9": FALLBACK_DEEP_DIVE,
      "10": FALLBACK_VISUALS
    }
  },
  "reusable-period-panties": {
    templateId: "femcare_reusable_v3_1",
    versionPolicy: { locked: true, version: "3.1.0" },
    sections: [
      { sectionId: "1", title: "Menstruation Context & Trends", uiSpec: "cards", schema: { type: "object", required: ["cards"] } },
      { sectionId: "gap_analysis", title: "Gap Analysis", uiSpec: "gap-analysis", schema: { type: "object", required: ["current_challenges", "need_gap"] } },
      { sectionId: "2", title: "Behavioural: Triggers & Barriers", uiSpec: "matrix", schema: { type: "object", required: ["trigger_clusters", "barrier_groups"] } },
      { sectionId: "3", title: "What's Working: Proof Points", uiSpec: "cards", schema: { type: "object", required: ["proof_points"] } },
      { sectionId: "4", title: "Role of Product & Lifestage", uiSpec: "cards", schema: { type: "object", required: ["roles"] } },
      { sectionId: "5", title: "Product Ecosystem (Formats)", uiSpec: "cards", schema: { type: "object", required: ["formats"] } },
      { sectionId: "6", title: "Attribute Trade-off Matrix", uiSpec: "matrix", schema: { type: "object", required: ["tradeoff_matrix"] } },
      { sectionId: "7", title: "Brand Performance", uiSpec: "matrix", schema: { type: "object", required: ["brand_performance"] } },
      { sectionId: "8", title: "Awareness & Purchase Channels", uiSpec: "funnel", schema: { type: "object", required: ["discovery_sources"] } },
      { sectionId: "9", title: "Deep Dive: Reusable Panties", uiSpec: "text-list", schema: { type: "object", required: ["users", "non_users"] } },
      { sectionId: "10", title: "Visual Synthesis", uiSpec: "cards", schema: { type: "object", required: ["word_cloud_themes"] } }
    ],
    promptPack: {
      systemPrompt: ANALYST_GRADE_SYSTEM_PROMPT,
      sectionPrompts: {
        "1": `
        SECTION 1: MENSTRUATION CONTEXT & TRENDS (INDIA FOCUS)
        Output Object: { "cards": Array<{boldTitle, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED", metrics: [{label, value, pct}]}> }
        
        STRATEGIC DIRECTIVE:
        Construct a 3-Layer Contextual Analysis specific to the Indian consumer:
        1. Macro Trend Layer: Sustainability shift in Urban India, Eco-consciousness among millennials, Reusable movement.
        2. Behavioral Reality Layer: Washing logistics (joint families, hostels, PG rooms), Drying taboo (hanging in open), Monsoon/Humidity factor.
        3. Emotional Impact Layer: Eco-guilt vs convenience trade-off, Investment mindset ("₹ per cycle" vs "₹ per unit").

        REQUIREMENTS:
        - Generate Minimum 8 cards covering these layers.
        - "boldTitle": Must be a strategic headline.
        - "bullets": Synthesize evidence. MUST include 3 quotes starting with "📢 ".
        - SEGMENTATION: Explicitly mention differences between Teens vs Adults vs Postpartum.
        `,
        "gap_analysis": GAP_ANALYSIS_PROMPT,
        "2": `
        SECTION 2: BEHAVIOURAL LANDSCAPE (TRIGGERS & BARRIERS)
        Output Object: {
          "trigger_clusters": Array<{title, explanation, intensity: "HIGH"|"MED", evidence_ids: []}> (Min 6),
          "barrier_groups": Object { "Economic": string[], "Psychological": string[], "Product_Trust": string[], "Cultural": string[], "Logistical": string[] },
          "switching_dynamics": Array<{pathway: "From -> To", insight, logic_bullets: string[], evidence_ids: []}>,
          "brand_switching": Array<{from_brand: string, to_brand: string, reason: string, trigger: string, evidence_ids: []}>
        }
        
        STRATEGIC DIRECTIVE:
        A. Adoption Triggers: Eco-conscious guilt, Rash-prevention from disposables, Long-term cost savings, Influencer persuasion.
        B. Barriers: 
           - Economic: High upfront cost (₹500-1500 per unit).
           - Psychological: "Ick factor" of washing blood.
           - Product Trust: Absorbency doubts, stain permanence fears.
           - Cultural: Drying taboo (hanging period underwear in open/shared spaces).
           - Logistical: Washing without running water, drying time (monsoon), travel inconvenience.
        C. Switching Logic: Map pathways (Pads -> Reusable Panties, Disposable Panties -> Reusable).
        D. Brand Switching: Why do users switch FROM one reusable brand TO another?
           - Map specific brand-to-brand switches (e.g. "SuperBottoms -> Clovia", "Adira -> Stonesoup").
           - For each: What triggered the switch? (Absorbency, drying time, fit, price, availability).
           - Include evidence from reviews/social where users mention trying multiple brands.
           - Minimum 5 brand switching pathways.
        `,
        
        "3": `
        SECTION 3: WHAT'S WORKING (PROOF POINTS)
        Output Object: {
           "proof_points": Array<{title, insight, quote: "Verbatim...", evidence_ids: []}> (Min 6)
        }
        
        STRATEGIC DIRECTIVE:
        Identify "Delighters" and "Sticky Features" for reusable panties in India.
        - Functional: Rash elimination, Softness, Breathability in humidity.
        - Emotional: Eco-pride, Investment satisfaction ("saved ₹X over 6 months").
        - Aha Moments: First wash being easier than expected, Stain actually coming out.
        `,
        
        "4": `
        SECTION 4: ROLE OF PRODUCT & LIFESTAGE
        Output Object: {
            "roles": Array<{format_name, job_to_be_done, lifestage_fit: string, evidence_ids: []}>
        }
        
        STRATEGIC DIRECTIVE:
        Map the "Job to be Done" for each format across the lifecycle in India:
        - Menarche (Comfort introduction, parent-led adoption).
        - College/Hostel (Washing logistics, shared drying spaces).
        - Workforce (Daily wear under formals, commute comfort).
        - Postpartum (Heavy flow management, sensitivity).
        - Perimenopause (Unpredictable flow, daily backup).
        `,

        "5": `
        SECTION 5: PRODUCT ECOSYSTEM
        Output Object: {
           "formats": Array<{format, role_in_lifecycle, functional_resolution[], emotional_resolution[]}>
        }
        
        STRATEGIC DIRECTIVE:
        Analyze the ecosystem as a complementary portfolio.
        For each format (Reusable Panties, Disposable Panties, Pads, Cups):
        - Define specific role.
        - Functional Win vs Limitation (Drying time, Absorbency duration).
        - Emotional Payoff (Eco-satisfaction, Convenience).
        - Situational Dominance (e.g., Daily Light Flow vs Heavy Night).
        `,

        "6": `
        SECTION 6: ATTRIBUTE TRADE-OFF MATRIX
        Output Object: {
           "tradeoff_matrix": Array<{attribute, pads, disposable_panties, reusable_panties, winner}> (Min 8 attributes)
        }
        
        STRATEGIC DIRECTIVE:
        Comparative Analysis:
        - Leak Protection, Absorption Duration, Comfort (Breathability)
        - Cost Efficiency (₹ per cycle vs per unit), Sustainability
        - Washing/Maintenance Effort, Drying Time
        - Longevity (uses per unit), Teen Suitability, Heavy Flow Management
        `,

        "7": `
        SECTION 7: BRAND PERFORMANCE
        Output Object: {
           "brand_performance": Array<{brand, key_strengths: string[], key_weaknesses: string[], attribute_verdict: string, brand_share_estimate: string, price_band: string, evidence_ids: []}>
        }
        
        STRATEGIC DIRECTIVE:
        Competitive Landscape Audit for Reusable Period Panties (India).
        MANDATORY BRANDS: Healthfab, Mahina, Avni, Soch, Sirona, PeeSafe, Lavos, SuperBottoms, Clovia, Adira.
        NOTE: "Proof" and "Thinx" are NOT available in India — do NOT include them.
        For each: Attribute Leadership, Price Band (₹), Brand Share Estimate, Vulnerability.
        DO NOT include market_position labels like "Leader", "Challenger", "Niche", "Emerging".
        `,
        
        "8": `
        SECTION 8: AWARENESS & PURCHASE CHANNELS
        Output Object: {
           "discovery_sources": Array<{source, strength: "High"|"Med"}>,
           "purchase_channels": Array<{channel, role: "Primary"|"Secondary"|"Emerging", formats_sold: string[], consumer_evidence: Array<{quote, source}>}>,
           "search_intent_clusters": Array<{cluster_name, example_queries[]}> (Min 5),
           ${SEGMENTATION_SCHEMA_DESCRIPTION}
        }
        
        STRATEGIC DIRECTIVE:
        Full Funnel: Discovery -> Validation -> Purchase.
        A. AWARENESS: Sustainability influencers, Instagram eco-content, Peer recommendation, Brand D2C sites.
        B. PURCHASE CHANNELS: D2C websites, Amazon, Nykaa, Offline (limited). Which channel dominates?
        C. VALIDATION: Reviews vs Community trust vs Influencer endorsement.

        SEGMENTATION REQUIREMENT (STRICT):
        - You MUST generate detailed profiles for all 5 Lifestage Cohorts.
        - You MUST generate detailed profiles for all 5 Geography Cohorts.
        `,
        
        "9": `
        SECTION 9: DEEP DIVE - REUSABLE PERIOD PANTIES
        Output Object: {
           "role_summary": { boldTitle, bullets[], confidence },
           "users": { 
              "discovery_sources": string[], 
              "triggers": string[], 
              "experience_parameters": Array<{parameter, sentiment: "POS"|"NEG"|"MIX", insight}>,
              "delighters": string[],
              "failures": string[],
              "brands": Array<{brand, sentiment: "POS"|"NEG"|"MIX", share: {count, pct}, evidence_ids: []}>
           },
           "non_users": { 
              "awareness_quality": string,
              "brands_aware": string[],
              "barriers_to_try": Array<{title, bullets[]}> 
           },
           "future_intent": { 
              "repurchase_signals": string[],
              "switching_risk": string[],
              "growth_vectors": string[]
           },
           ${SEGMENTATION_SCHEMA_DESCRIPTION}
        }
        
        STRATEGIC DIRECTIVE:
        Comprehensive Category Audit for REUSABLE Period Panties.
        
        A. AMONG USERS:
        1. Product Discovery — sustainability content, peer recommendation, brand advertising.
        2. What Triggered Usage — eco-guilt, rash from pads, cost savings calculation.
        3. Product Experience — MANDATORY 9 PARAMETERS (rate each POS/NEG/MIX with evidence):
           a) Comfort  b) Absorbency  c) No leakage  d) Drying time  
           e) Wash ease  f) Softness  g) Malodour control  h) Longevity  i) Fit/Sizing
        4. What the product SOLVED (delighters) and where it FAILED.
        5. Key brand players — sentiment per brand, share estimate.
        6. Future disposition — repurchase intent, recommend to others, switching risk.

        B. AMONG NON-USERS:
        1. Quality & source of awareness.
        2. Brands they are aware of.
        3. Barriers to try (washing, hygiene concern, upfront cost, doubt about absorbency).

        SEGMENTATION REQUIREMENT (STRICT):
        - You MUST generate profiles for all 5 Lifestage and 5 Geography Cohorts.
        `,
        
        "10": `
        SECTION 10: VISUAL SYNTHESIS
        Output Object: {
           "sources_chart": { "data": Array<{source, count, pct}> },
           "word_cloud_themes": { "tokens": Array<{term, weight}> }
        }
        
        REQUIREMENTS:
        - Source Volume: Full distribution including D2C, Amazon, Social.
        - Themes: Strategic themes (e.g. "Eco-Investment", "Wash Anxiety", "Rash Freedom", "Monsoon Challenge", "Soft Comfort").
        `
      }
    },
    validators: {
      "1": (d: any) => hasMinItems(d.cards, 8),
      "gap_analysis": (d: any) => hasMinItems(d.current_challenges?.bullets, 1) && hasMinItems(d.need_gap?.need_statements, 1),
      "2": (d: any) => hasMinItems(d.trigger_clusters, 6) && d.barrier_groups && Object.keys(d.barrier_groups).length >= 4,
      "3": (d: any) => hasMinItems(d.proof_points, 6),
      "4": (d: any) => hasMinItems(d.roles, 3),
      "6": (d: any) => hasMinItems(d.tradeoff_matrix, 8),
      "7": (d: any) => hasMinItems(d.brand_performance, 5),
      "9": (d: any) => d.users && hasMinItems(d.users.experience_parameters, 8)
    },
    fallbacks: {
      "1": { cards: [
          { boldTitle: "Eco-Shift", bullets: ["SEED: Shift away from single-use plastics among urban millennials.", "📢 \"Switched to save the planet.\" (Social)"], confidence: "MED", evidence_ids: [] },
          { boldTitle: "Wash Anxiety", bullets: ["SEED: Washing logistics remain primary barrier.", "📢 \"Hostel drying is impossible.\" (Reddit)"], confidence: "MED", evidence_ids: [] }
      ]},
      "gap_analysis": FALLBACK_GAP_ANALYSIS,
      "2": { 
          trigger_clusters: [{ title: "Eco-Guilt", explanation: "SEED: Environmental consciousness drives trial.", evidence_ids: [] }],
          barrier_groups: { "Economic": ["SEED: High upfront cost ₹500-1500"], "Psychological": ["SEED: Washing discomfort"], "Product_Trust": ["SEED: Absorbency doubts"], "Cultural": ["SEED: Drying taboo"] },
          switching_dynamics: [{ pathway: "Pads -> Reusable Panties", logic_bullets: ["SEED: Eco-motivation + rash prevention"], evidence_ids: [] }],
          brand_switching: [{ from_brand: "SuperBottoms", to_brand: "Clovia", reason: "SEED: Better fit and faster drying", trigger: "Peer recommendation", evidence_ids: [] }]
      },
      "3": { proof_points: [{ title: "Rash Freedom", insight: "Users report elimination of rash from synthetic pads.", quote: "No more rashes since switching.", evidence_ids: [] }] },
      "4": { roles: [{ format_name: "Reusable Panties", job_to_be_done: "Sustainable Daily Wear", lifestage_fit: "Working Women/Eco-conscious", evidence_ids: [] }] },
      "5": { formats: [{ format: "Reusable Panties", role_in_lifecycle: "SEED: Daily/Light Flow", evidence_ids: [] }, { format: "Disposable Panties", role_in_lifecycle: "SEED: Heavy Night/Travel Backup", evidence_ids: [] }] },
      "6": { tradeoff_matrix: [{attribute: "Cost per Cycle", winner: "Reusable Panties", pads: "Med", disposable_panties: "High", reusable_panties: "Low"}] },
      "7": { brand_performance: [{ brand: "SuperBottoms", key_strengths: ["Brand awareness"], key_weaknesses: ["Price"], attribute_verdict: "Category leader.", evidence_ids: [] }] },
      "8": { discovery_sources: [{source: "Instagram Eco-Influencers", strength: "High"}, {source: "Brand D2C", strength: "High"}], purchase_channels: [{channel: "Brand Website", role: "Primary", formats_sold: ["Reusable Panties"]}], search_intent_clusters: [{cluster_name: "Sustainable Period Solutions", example_queries: ["best reusable period panties India"]}], segmentation: { lifestage: [], geography: [] } },
      "9": FALLBACK_DEEP_DIVE,
      "10": FALLBACK_VISUALS
    }
  },
  "sanitary-pads": {
    templateId: "femcare_pads_v4_0",
    versionPolicy: { locked: true, version: "4.0.0" },
    sections: [
      { sectionId: "1", title: "Menstruation Context by Sub-Category", uiSpec: "cards", schema: { type: "object", required: ["cards"] } },
      { sectionId: "2", title: "Adoption Drivers: Premium Ultra vs Super Premium Ultra", uiSpec: "matrix", schema: { type: "object", required: ["trigger_clusters"] } },
      { sectionId: "gap_analysis", title: "Gap Analysis: Premium Ultra vs Super Premium Ultra", uiSpec: "gap-analysis", schema: { type: "object", required: ["current_challenges", "need_gap"] } },
      { sectionId: "4", title: "Purchase Behaviour & Channels", uiSpec: "funnel", schema: {} },
      { sectionId: "5", title: "Consumer Deep Dive: Premium Ultra vs Super Premium Ultra", uiSpec: "text-list", schema: { type: "object" } },
      { sectionId: "7", title: "Brand Performance: Premium Ultra & Super Premium Ultra", uiSpec: "cards", schema: {} },
      { sectionId: "9", title: "Whisper Product Analysis: No Gap No Leaks vs Ultra Clean", uiSpec: "cards", schema: { type: "object", required: ["cards"] } }
    ],
    promptPack: {
      systemPrompt: ANALYST_GRADE_SYSTEM_PROMPT + `
SANITARY PADS REPORT — ADDITIONAL MANDATORY RULES:
- CATEGORICALLY NEVER mention "Period Panties", "Disposable Period Panties", "Reusable Period Panties", or any form of "panties/panty" anywhere in the output. This report is EXCLUSIVELY about Sanitary Pads. If evidence data contains period panty mentions, IGNORE them completely.
- NEVER mention the brand "Always" — it is not sold in India. Remove any Always references.
- Focus sub-categories: Fluff Regular, Fluff XL, Fluff Night, Mid Ultra, Premium Ultra, Night Ultra, Super Premium Ultra.
- STRATEGIC FOCUS: Premium Ultra and Super Premium Ultra must be analyzed SEPARATELY — do NOT combine them. They are distinct segments with different brands, price points, and consumer profiles.
- BRAND NAME IN VERBATIMS: For Amazon.in and Flipkart sourced quotes, the "source" field MUST include the brand variant being reviewed. Format: "Amazon.in · Whisper No Gap XL" or "Flipkart · Nua Ultra Thin". This is NON-NEGOTIABLE for understanding which brand the feedback relates to.
- CONSUMER DESCRIPTION: Every consumer quote/verbatim MUST include a short description of the consumer. Format: "Age, Role, City/Tier". NEVER leave consumer descriptions blank.
- SIZING CONTEXT: Every insight about product performance MUST mention the pad size/variant being discussed (Regular, XL, XXL, XXXL). Do NOT make generic statements without sizing context.
- NO INFERRED CONTENT: Do NOT use "INFERRED:" tags or "Consumer" as a source label. Every quote source must be specific: "Amazon.in · BrandVariant", "Flipkart · BrandVariant", "Instagram", "Reddit", "YouTube", "Social", "Awario".
- DATA POINT CALIBRATION: The total evidence base contains ~23,700 usable verbatims. data_points per insight MUST reflect this scale:
  HIGH frequency themes (rash, leakage, absorption, cost): 800-2500 data points
  MEDIUM frequency themes (comfort, sizing, brand switching, disposal): 300-800 data points  
  LOW frequency themes (fragrance, packaging, eco concerns): 100-300 data points
  NICHE themes (specific brand issues, regional patterns): 40-150 data points
  NEVER use data_points below 40. NEVER repeat the same number for adjacent insights.
- SKU ACCURACY: For Sofy Anti Bacteria XL+, this is the PREMIUM ULTRA variant only. Do NOT include Sofy Bodyfit, Sofy Night, or Sofy Overnight SKUs under this — those are separate Fluff products.
- BRAND CLASSIFICATION QC (NON-NEGOTIABLE):
  Whisper No Gap No Leaks XL = Premium Ultra
  Whisper Ultra Soft (Skin Love) XL = Premium Ultra  
  Whisper Bindazzz Nights = NIGHT ULTRA (never Premium Ultra)
  Whisper Choice Ultra = MID ULTRA (never Premium Ultra, never Fluff)
  Whisper Choice XL = FLUFF XL (never Premium Ultra)
  These are SEPARATE brand tiles in Section 7 — Whisper Ultra Soft and Whisper No Gap are different products.
- SWITCHING RULES: NEVER use generic "Standard Fluff" — always "Fluff Regular" or "Fluff XL" or "Fluff Night". ONE pathway card per unique From→To transition.
`,
      sectionPrompts: {
        "1": `
        SECTION 1: MENSTRUATION CONTEXT BY SUB-CATEGORY (INDIA)
        Output Object: { "cards": Array<{boldTitle, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED", metrics: [{label, value, pct}]}> }
        
        Generate 7 cards — one per sub-category:
        1. "Fluff Regular" — Entry-level, Tier 2/3 chemist dominant. Brands: Whisper Choice Regular, Stayfree Secure Regular, Paree, Niine.
        2. "Fluff XL" — First upgrade from Regular, heavy flow trigger. Brands: Whisper Choice XL, Stayfree Secure XL, Sofy Bodyfit XL.
        3. "Fluff Night" — Overnight specific, elongated. Brands: Whisper Choice Night, Stayfree Secure Nights.
        4. "Mid Ultra" — Bridge between Fluff and Premium. Brands: Whisper Choice Ultra, Pro-ease Go Ultra XL+.
        5. "Premium Ultra" — Rash-free promise, thin profile. Brands: Whisper No Gap No Leaks XL, Whisper Ultra Soft (Skin Love) XL, Sofy Anti Bacteria XL+.
        6. "Night Ultra" — Premium overnight. Brands: Whisper Bindazzz Nights, Stayfree Dry-Max All Night.
        7. "Super Premium Ultra" — D2C organic/cotton. Brands: Nua, Plush, Carmesi, Azah, Pee Safe, Everteen.
        
        Each card: boldTitle = sub-category name, min 3 insight bullets + min 2 consumer verbatims.
        metrics: [{label: "Data Points", value: "N"}, {label: "Key Brands", value: "brand1, brand2"}]
        BRAND NAME IN SOURCE for every Amazon/Flipkart verbatim.
        `,

        "2": `
        SECTION 2: ADOPTION DRIVERS — PREMIUM ULTRA vs SUPER PREMIUM ULTRA
        
        CRITICAL: Analyze Premium Ultra and Super Premium Ultra SEPARATELY. Do NOT combine.
        
        Output Object: {
          "trigger_clusters": Array<{title, explanation, segment: "Premium Ultra"|"Super Premium Ultra", intensity: "HIGH"|"MED", data_points: N, evidence_ids: []}> (Min 8),
          "barrier_groups": {
            "Premium Ultra": { "Price": string[], "Availability": string[], "Awareness": string[], "Trust": string[] },
            "Super Premium Ultra": { "Price": string[], "Availability": string[], "Awareness": string[], "Trust": string[], "D2C Friction": string[] }
          },
          "switching_dynamics": Array<{pathway: "From -> To", segment: "Premium Ultra"|"Super Premium Ultra", insight, logic_bullets: string[], evidence_ids: []}>,
          "brand_switching": Array<{from_brand: string, to_brand: string, reason: string, trigger: string, segment: "Premium Ultra"|"Super Premium Ultra", verbatims: Array<{quote: string, source: string}>, evidence_ids: []}>
        }
        
        A. ADOPTION DRIVERS FOR PREMIUM ULTRA (min 4):
           What triggers consumers to move TO Premium Ultra?
           - From Fluff XL: Rash from thick pads, leak anxiety on heavy days
           - From Mid Ultra: Want genuine rash-free, not just thin
           Key brands: Whisper No Gap No Leaks XL, Whisper Ultra Soft (Skin Love) XL, Sofy Anti Bacteria XL+
        
        B. ADOPTION DRIVERS FOR SUPER PREMIUM ULTRA (min 4):
           What triggers consumers to move TO Super Premium Ultra?
           - From Premium Ultra: Instagram influence, organic/eco claims, rash persists even in Premium Ultra
           - Direct entry: Health-conscious Gen Z, D2C discovery
           Key brands: Nua, Plush, Carmesi, Azah, Pee Safe, Everteen
        
        C. BARRIERS — SEPARATE for Premium Ultra and Super Premium Ultra
        
        D. SWITCHING PATHWAYS — STRICT RULES:
           NEVER use generic "Standard Fluff" or just "Fluff". ALWAYS specify exact sub-category: "Fluff Regular", "Fluff XL", "Fluff Night", "Mid Ultra".
           Do NOT create multiple pathways for the same transition. If the switch is Premium Ultra → Super Premium Ultra, combine ALL reasons (skin sensitivity, pack sizes, eco awareness) into ONE pathway card.
           Each unique From→To pair should appear EXACTLY ONCE.
           Min 4 distinct pathways for Premium Ultra, min 3 for Super Premium Ultra.
        
        E. BRAND SWITCHING — STRICT RULES:
           Whisper Bindazzz Nights is NIGHT ULTRA — NEVER include it under Premium Ultra brand switching.
           Whisper Choice Ultra is MID ULTRA — NEVER include it under Premium Ultra.
           Only these brands qualify for Premium Ultra switching: Whisper No Gap No Leaks XL, Whisper Ultra Soft (Skin Love) XL, Sofy Anti Bacteria XL+.
           Only these qualify for Super Premium Ultra switching: Nua, Plush, Carmesi, Azah, Pee Safe, Everteen, Sirona.
        
        EVERY verbatim must include brand variant in source. 
        QC: Whisper Premium Ultra variants = No Gap No Leaks XL, Ultra Soft (Skin Love) XL ONLY.
        Do NOT reference UK geography or non-India contexts.
        `,

        "gap_analysis": `
        SECTION: GAP ANALYSIS — PREMIUM ULTRA vs SUPER PREMIUM ULTRA (INDIA)
        
        CRITICAL: Analyze SEPARATELY. DO NOT include "Resolved/What Ultra Solved vs Fluff".
        
        Output Object: {
          "current_challenges": { "heading": "What Premium Ultra Doesn't Solve", "bullets": Array<{claim, explanation, segment: "Premium Ultra"|"Super Premium Ultra"|"Both", size_context: string, consumer_evidence: Array<{quote, source}>, evidence_ids: [], severity: "HIGH"|"MED"|"LOW", impacted_occasions: []}> },
          "unresolved_challenges": { "heading": "What Super Premium Ultra Still Can't Crack", "bullets": Array<same> },
          "need_gap": { "heading": "White Space: Super Premium at Premium Ultra Price Point", "need_statements": Array<{need, why_now, who, segment: "Premium Ultra"|"Super Premium Ultra"|"Entry Gap", consumer_evidence: Array<{quote, source}>, evidence_ids: [], priority: "P0"|"P1"|"P2"}> }
        }

        DO NOT OUTPUT resolved_challenges.
        
        Current Challenges — PREMIUM ULTRA (min 4):
        Brands: Whisper No Gap XL, Whisper Ultra Soft (Skin Love) XL, Sofy Anti Bacteria XL+.
        QC: Nua is NOT Premium Ultra. "Whisper Soft Blue" does NOT exist — never use this.
        QC: Every verbatim source MUST include correct brand variant.
        
        Unresolved — SUPER PREMIUM ULTRA (min 5):
        Brands: Nua, Plush, Carmesi, Azah, Pee Safe, Everteen.
        QC: Whisper is NOT Super Premium Ultra. No UK geography.
        
        Need Gap (min 6): "super premium quality at premium ultra price". India only.
        `,

        "4": `
        SECTION 4: PURCHASE BEHAVIOUR & CHANNELS — PREMIUM ULTRA & SUPER PREMIUM ULTRA ONLY
        Output Object: {
           "discovery_sources": Array<{source, strength: "High"|"Med", segment: "Premium Ultra"|"Super Premium Ultra"|"Both"}>,
           "purchase_channels": Array<{channel, role: "Primary"|"Secondary"|"Emerging", segment: "Premium Ultra"|"Super Premium Ultra", consumer_evidence: Array<{quote, source}>}>,
           "search_intent_clusters": Array<{cluster_name, example_queries[], segment: "Premium Ultra"|"Super Premium Ultra"}>,
           "pricing_architecture": Array<{sub_category, price_range_per_pad, example_skus: string[]}>,
           "combos_and_kits": Array<{type, description, brands_offering: string[], consumer_appeal: string}>
        }
        
        SPLIT channels by segment:
        Premium Ultra: Chemist/pharmacy (primary), Amazon/Flipkart (secondary), supermarket
        Super Premium Ultra: D2C websites (primary), Amazon (secondary), Nykaa, Quick Commerce (Blinkit/Zepto). Minimal offline.
        
        SEARCH INTENT CLUSTERS (MANDATORY — min 4 per segment):
        Premium Ultra search queries: "best rash-free pads XL", "Whisper No Gap review", "leak-proof ultra thin pads", "Sofy anti bacteria pads review", "pads for sensitive skin XL"
        Super Premium Ultra search queries: "organic cotton pads India", "Nua vs Plush review", "best D2C sanitary pads", "chemical free pads for periods", "Carmesi vs Azah"
        
        PRICING ARCHITECTURE — ONLY Premium Ultra and Super Premium Ultra:
        DO NOT include Fluff Regular, Fluff XL, Fluff Night, or Mid Ultra in pricing.
        - Premium Ultra: ₹8-14/pad. SKUs: Whisper No Gap No Leaks XL, Whisper Ultra Soft XL, Sofy Anti Bacteria XL+
        - Super Premium Ultra: ₹15-25/pad. SKUs: Nua Ultra Thin, Carmesi Sensitive XL, Plush 100% Pure US Cotton
        
        QC RULES:
        - Whisper Choice Ultra is MID ULTRA — do NOT include it under Premium Ultra or in pricing
        - Whisper Bindazzz Nights is NIGHT ULTRA — do NOT include
        - Only Premium Ultra and Super Premium Ultra brands/SKUs in this section
        `,

        "5": `
        SECTION 5: CONSUMER DEEP DIVE — PREMIUM ULTRA vs SUPER PREMIUM ULTRA (SEPARATE)
        
        Output Object: {
           "role_summary": { boldTitle, bullets[], confidence },
           "premium_ultra_users": { 
              "segment_label": "Premium Ultra Users",
              "brands_in_scope": ["Whisper No Gap XL", "Whisper Ultra Soft (Skin Love) XL", "Sofy Anti Bacteria XL+"],
              "who_they_are": "Profile description",
              "discovery_sources": string[], "triggers": string[], 
              "experience_parameters": Array<{parameter, sentiment: "POS"|"NEG"|"MIX", insight, size_context: string}>,
              "delighters": string[], "failures": string[]
           },
           "premium_ultra_non_users": {
              "segment_label": "Non-Users of Premium Ultra",
              "awareness_quality": string,
              "barriers_to_try": Array<{title, bullets[]}>
           },
           "super_premium_ultra_users": { 
              "segment_label": "Super Premium Ultra Users (D2C)",
              "brands_in_scope": ["Nua", "Plush", "Carmesi", "Azah", "Pee Safe", "Everteen"],
              "who_they_are": "Profile description",
              "discovery_sources": string[], "triggers": string[], 
              "experience_parameters": Array<{parameter, sentiment: "POS"|"NEG"|"MIX", insight, size_context: string}>,
              "delighters": string[], "failures": string[]
           },
           "super_premium_ultra_non_users": {
              "segment_label": "Non-Users of Super Premium Ultra",
              "awareness_quality": string,
              "barriers_to_try": Array<{title, bullets[]}>
           },
           "pain_point_summary": {
              "premium_ultra": {
                "functional": Array<{pain_point, detail, severity, data_points, verbatims: [{quote, source}]}>,
                "emotional": Array<{pain_point, detail, severity, data_points, verbatims: [{quote, source}]}>
              },
              "super_premium_ultra": {
                "functional": Array<{pain_point, detail, severity, data_points, verbatims: [{quote, source}]}>,
                "emotional": Array<{pain_point, detail, severity, data_points, verbatims: [{quote, source}]}>
              }
           }
        }
        
        Pain Points SEPARATE per segment. Brand variant in all verbatim sources.
        `,

        "7": `
        SECTION 7: BRAND PERFORMANCE — PREMIUM ULTRA & SUPER PREMIUM ULTRA ONLY
        Output Object: {
           "brand_performance": Array<{
              brand: string, segment: "Premium Ultra"|"Super Premium Ultra",
              skus: Array<{sku_name, sub_category, price_per_pad}>,
              attribute_scale: Array<{attribute: string, score_0_5: number}>,
              key_strengths: string[], key_weaknesses: string[], 
              attribute_verdict: string, brand_share_estimate: string,
              evidence_ids: [],
              verbatims: Array<{quote: string, source: string, consumer: string}>
           }>
        }
        
        ONLY Premium Ultra and Super Premium Ultra brands. NO Fluff/Mid Ultra/Night Ultra data.
        
        CRITICAL — WHISPER MUST BE SPLIT INTO TWO SEPARATE BRAND CARDS:
        1. "Whisper Ultra Soft (Skin Love) XL" — Premium Ultra. Separate attribute scores, strengths, weaknesses, verbatims for THIS variant ONLY.
        2. "Whisper No Gap No Leaks XL" — Premium Ultra. Separate attribute scores, strengths, weaknesses, verbatims for THIS variant ONLY.
        These are different products with different consumer sentiment. Do NOT combine them into one "Whisper" card.
        
        OTHER PREMIUM ULTRA BRANDS:
        3. Sofy Anti Bacteria XL+ (exclude Bodyfit/Night/Overnight)
        4. Everteen Ultra Thin XL (if data available)
        
        SUPER PREMIUM ULTRA BRANDS:
        5. Nua Ultra Thin
        6. Plush 100% Pure US Cotton
        7. Carmesi Sensitive
        8. Azah Organic
        9. Pee Safe Organic Cotton
        10. Sirona Natural Biodegradable
        
        CROSS-CHECK: 
        - Whisper Ultra Soft scores MUST NOT include No Gap No Leaks reviews, and vice versa.
        - Neither Whisper card should include Fluff/Mid Ultra/Night Ultra reviews.
        - Sofy scores MUST NOT include Bodyfit/Night/Overnight reviews.
        - Whisper Bindazzz Nights is NIGHT ULTRA — never include.
        - Whisper Choice Ultra is MID ULTRA — never include.
        
        Attributes: absorption, rash_free, leak_protection, thinness, wing_adhesion, odour_control, value_for_money, disposal_ease, softness.
        Min 3 verbatims per brand card with brand variant in source.
        `,

        "9": `
        SECTION 9: WHISPER PRODUCT ANALYSIS — NO GAP NO LEAKS vs ULTRA CLEAN
        Output Object: { "cards": Array<{boldTitle, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED"|"LOW", metrics: Array<{label, value}>}> }
        
        Generate 5 cards:
        
        1. "Whisper No Gap No Leaks XL — Consumer Backlash":
        Significant negative feedback on Instagram and Amazon. Key complaints: rash, synthetic top-sheet, sizing, wing adhesion.
        Compare consumer sentiment vs marketing claims. Include Instagram backlash verbatims.
        
        2. "Whisper Ultra Clean XL — Discontinued Product Profile":
        What it was, how it compared to Whisper Ultra Soft (Skin Love), key differentiator: dry-feel vs cottony-soft.
        
        3. "No Gap vs Ultra Clean — Consumer Comparison":
        Users who tried both — which they preferred. Did Ultra Clean users migrate to No Gap? Satisfaction levels.
        
        4. "Post-Discontinuation Migration":
        Where Ultra Clean loyalists went (Stayfree Dry Max? Sofy Anti Bacteria? Nua?). "Miss this product" signals.
        
        5. "Strategic Implication":
        Unserved dry-feel segment + No Gap trust vacuum = opportunity for new entrant.
        
        Use real consumer quotes. If data thin for Ultra Clean, state limitation. No INFERRED tags.
        `
      }
    },
    validators: {},
    fallbacks: {
        "1": { cards: [{ boldTitle: "Fluff Regular", bullets: ["SEED: Entry-level pad for Tier 2/3 consumers."], confidence: "LOW", evidence_ids: [] }, { boldTitle: "Premium Ultra", bullets: ["SEED: Thin, rash-free promise."], confidence: "LOW", evidence_ids: [] }] },
        "gap_analysis": FALLBACK_GAP_ANALYSIS,
        "5": { role_summary: { boldTitle: "Premium Ultra vs Super Premium Ultra Deep Dive", bullets: ["Re-run synthesis to generate segmented profiles."], confidence: "LOW", evidence_ids: [] }, premium_ultra_users: null, super_premium_ultra_users: null, pain_point_summary: null },
        "9": { cards: [{ boldTitle: "Whisper No Gap No Leaks — Consumer Analysis", bullets: ["Run synthesis to generate Whisper product comparison."], confidence: "LOW", evidence_ids: [] }] }
    }
  }
};
