
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
        SECTION 7: BRAND PERFORMANCE
        Output Object: {
           "brand_performance": Array<{brand, key_strengths: string[], key_weaknesses: string[], attribute_verdict: string, brand_share_estimate: string, price_band: string, evidence_ids: []}>
        }
        
        STRATEGIC DIRECTIVE:
        Competitive Landscape Audit (India).
        MANDATORY BRANDS: Sirona, Carmesi, Nua, Plush, Pee Safe, Azah, Whisper, Always, Clovia, Rael.
        For each:
        - Attribute Leadership (e.g. "Owning Comfort", "Price Leader").
        - Price Band (Approx ₹ per unit).
        - Brand Share Estimate (% of voice from evidence data).
        - Vulnerability Risks.
        DO NOT include market_position labels like "Leader", "Challenger", "Niche", "Emerging".
        
        REQUIREMENTS:
        - "attribute_verdict": Concise strategic summary.
        - "brand_share_estimate": Estimated % share of mentions/reviews (e.g. "26% of mentions").
        - If emerging/no-data: "INFERRED: Low conversational salience relative to category leaders suggests weak visibility."
        - NO empty strengths/weaknesses.
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
      { sectionId: "sub_categories", title: "Sub-Category Landscape", uiSpec: "cards", schema: {} },
      { sectionId: "gap_analysis", title: "Gap Analysis: Premium & Super Premium Ultra", uiSpec: "gap-analysis", schema: { type: "object", required: ["current_challenges", "need_gap"] } },
      { sectionId: "2", title: "Switching Dynamics by Sub-Segment", uiSpec: "matrix", schema: { type: "object", required: ["trigger_clusters"] } },
      { sectionId: "3", title: "Attribute Performance by Sub-Category", uiSpec: "cards", schema: { type: "object", required: ["formats"] } },
      { sectionId: "4", title: "Purchase Behaviour & Channels", uiSpec: "funnel", schema: {} },
      { sectionId: "5", title: "Consumer Deep Dive: Premium & Super Premium Ultra", uiSpec: "text-list", schema: { type: "object", required: ["users"] } },
      { sectionId: "7", title: "Brand Performance by Sub-Category", uiSpec: "cards", schema: {} },
      { sectionId: "8", title: "Whisper Ultra Clean: Discontinued Product Feedback", uiSpec: "cards", schema: {} }
    ],
    promptPack: {
      systemPrompt: ANALYST_GRADE_SYSTEM_PROMPT + `
SANITARY PADS REPORT — ADDITIONAL MANDATORY RULES:
- CATEGORICALLY NEVER mention "Period Panties", "Disposable Period Panties", "Reusable Period Panties", or any form of "panties/panty" anywhere in the output. This report is EXCLUSIVELY about Sanitary Pads. If evidence data contains period panty mentions, IGNORE them completely.
- NEVER mention the brand "Always" — it is not sold in India. Remove any Always references.
- Focus sub-categories: Fluff Regular, Fluff XL, Fluff Night, Mid Ultra, Premium Ultra, Night Ultra, Super Premium Ultra.
- STRATEGIC FOCUS: Premium Ultra and Super Premium Ultra must receive 2x depth and detail.
`,
      sectionPrompts: {
        "1": `
        SECTION 1: MENSTRUATION CONTEXT BY SUB-CATEGORY (INDIA)
        Output Object: { "cards": Array<{boldTitle, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED", metrics: [{label, value, pct}]}> }
        
        Generate EXACTLY 7 cards — one per sanitary pad sub-category:
        
        1. **Fluff Regular**: Entry-level thick cottony pads. Who uses them (Tier 2/3, first-time users, price-conscious). 
           Brands: Whisper Choice Regular, Stayfree Secure Regular, Paree/Niine/Kotex/Comfy Snug Fit.
           Consumer reality: default option at local chemist, low awareness of alternatives.
        
        2. **Fluff XL**: Extended length thick pads. Upgrade from Regular for heavier flow days.
           Brands: Whisper Choice XL Cottony, Stayfree Secure XL, Sofy Bodyfit Extra Long/Pro XL, Sofy Anti Bacteria XL, Pro-ease Go XL.
           Consumer reality: Tier 2/3 users upgrade here first. Length = primary driver.
        
        3. **Fluff Night**: Thick overnight pads. Sleep protection focus.
           Brands: Whisper Choice Night, Stayfree Secure Nights Cottony Soft.
           Consumer reality: Stain anxiety on bedsheets drives adoption. Joint family privacy concerns.
        
        4. **Mid Ultra**: Entry-level thin pads. First step into Ultra from Fluff.
           Brands: Whisper Choice Ultra, Pro-ease Go Ultra XL+.
           Consumer reality: "Not as thick" is the appeal. Price-sensitive upgraders.
        
        5. **Premium Ultra**: Thin, high-performance pads. KEY STRATEGIC FOCUS.
           Brands: Whisper No Gap No Leaks XL, Whisper Ultra Soft (Skin Love), Sofy Anti Bacteria XL+.
           Consumer reality: Rash-free promise, discretion under clothing, confidence for long work/school hours.
        
        6. **Night Ultra**: Thin overnight pads. (Acknowledge but do NOT deep-dive — excluded from focus.)
           Brands: Whisper Bindazzz Nights, Stayfree Dry-Max All Night.
           Brief mention only.
        
        7. **Super Premium Ultra**: D2C premium thin pads. KEY STRATEGIC FOCUS.
           Brands: Nua, Plush, Everteen, Azah, Pee Safe, Carmesi.
           Consumer reality: Instagram-driven discovery, subscription models, eco/organic positioning, premium pricing ₹12-20/pad.
        
        DEPTH: Premium Ultra & Super Premium Ultra cards must be 2x longer than others.
        Include Tier 2/3 upgrade journey narrative: Regular Fluff → XL → Night Fluff → Mid Ultra → Premium Ultra.
        Each card: min 3 bullets + 2 consumer quotes starting with "📢".
        `,

        "sub_categories": `
        SECTION: SUB-CATEGORY LANDSCAPE (Brand-to-Segment Mapping)
        Output Object: {
            "cards": Array<{boldTitle: string, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED"}>,
            "taxonomy": {
                "fluff": {
                    "regular": Array<{brand: string, sku: string, price_per_pad: string}>,
                    "xl": Array<{brand, sku, price_per_pad}>,
                    "night": Array<{brand, sku, price_per_pad}>
                },
                "ultra": {
                    "mid": Array<{brand, sku, price_per_pad}>,
                    "premium": Array<{brand, sku, price_per_pad}>,
                    "night": Array<{brand, sku, price_per_pad}>,
                    "super_premium": Array<{brand, sku, price_per_pad}>
                }
            }
        }

        MAP THESE EXACT SKUs:
        FLUFF REGULAR: Whisper Choice Regular, Stayfree Secure Cottony Soft Regular, Paree/Niine/Kotex/Amrutanjan Comfy Snug Fit
        FLUFF XL: Whisper Choice XL Cottony, Stayfree Secure XL Cottony Soft, Stayfree Secure XL Dry Cover, Sofy Bodyfit Extra Long, Sofy Bodyfit Pro XL, Sofy Anti Bacteria XL, Pro-ease Go XL, Pro-ease XL Day & Night
        FLUFF NIGHT: Whisper Choice Night, Stayfree Secure Nights Cottony Soft
        MID ULTRA: Whisper Choice Ultra, Pro-ease Go Ultra XL+
        PREMIUM ULTRA: Whisper No Gap No Leaks XL, Whisper Ultra Soft (Skin Love), Sofy Anti Bacteria XL+
        NIGHT ULTRA: Whisper Bindazzz Nights, Stayfree Dry-Max All Night
        SUPER PREMIUM ULTRA: Nua, Plush, Everteen, Azah, Pee Safe, Carmesi

        Generate 2 summary cards: "Fluff Landscape" and "Ultra Landscape" with strategic bullets about market structure.
        Include Amazon/Flipkart pricing per pad where available.
        `,

        "gap_analysis": `
        SECTION: GAP ANALYSIS — PREMIUM ULTRA & SUPER PREMIUM ULTRA (INDIA)
        Output Object: {
          "current_challenges": { "heading": "What Premium Ultra & Super Premium Ultra Don't Solve", "bullets": Array<{claim, explanation, consumer_evidence: Array<{quote, source}>, evidence_ids: [], severity: "HIGH"|"MED"|"LOW", impacted_occasions: []}> },
          "resolved_challenges": { "heading": "What Ultra Pads Have Successfully Solved vs Fluff", "bullets": Array<same> },
          "unresolved_challenges": { "heading": "Persistent Pain Points in Premium Segment", "bullets": Array<same> },
          "need_gap": { "heading": "White Space: Super Premium at Premium Ultra Price Point", "need_statements": Array<{need, why_now, who, consumer_evidence: Array<{quote, source}>, evidence_ids: [], priority: "P0"|"P1"|"P2"}> }
        }

        STRATEGIC CONTEXT: The client wants to enter with a SUPER PREMIUM offering at a PREMIUM ULTRA price point.
        
        Current Challenges (min 7): Rash persistence even in Ultra, price barrier for Tier 2/3 upgraders, 
        availability of Premium Ultra outside metros, D2C trust gap, humidity/heat issues with Ultra thinness,
        disposal challenges, wing adhesion failures.
        
        Resolved (min 5): What Ultra solved vs Fluff — discretion, thinness, reduced bulk, better absorption tech.
        
        Unresolved (min 5): What even Super Premium D2C brands haven't cracked — Tier 2/3 distribution,
        chemist trust, price-to-value perception, night-time confidence, Indian body fit.
        
        Need Gap (min 6): Frame as opportunities for "super premium quality at premium ultra price".
        Include: Rash-free at ₹8-10/pad, Tier 2/3 accessible premium, Chemist-available ultra-thin,
        Humidity-optimized absorption, Indian body sizing, Combo/kit packaging for trial.
        EVERY bullet: min 2 consumer quotes. India only.
        `,

        "2": `
        SECTION 2: SWITCHING DYNAMICS BY SUB-SEGMENT
        Output Object: {
          "trigger_clusters": Array<{title, explanation, intensity: "HIGH"|"MED", evidence_ids: []}> (Min 6),
          "barrier_groups": Object { "Price": string[], "Availability": string[], "Awareness": string[], "Trust": string[], "Inertia": string[] },
          "switching_dynamics": Array<{pathway: "From -> To", insight, logic_bullets: string[], evidence_ids: []}>,
          "brand_switching": Array<{from_brand: string, to_brand: string, reason: string, trigger: string, evidence_ids: []}>
        }
        
        A. ADOPTION TRIGGERS per upgrade step:
           - Fluff Regular → Fluff XL: Length need, heavy flow days
           - Fluff XL → Mid Ultra: Bulk discomfort, wanting thinner
           - Mid Ultra → Premium Ultra: Rash-free promise, leak-proof claim
           - Premium Ultra → Super Premium Ultra: Instagram influence, organic/eco claim, subscription convenience
           - Tier 2/3 journey: Regular Fluff is starting point, XL is first upgrade, Ultra is aspirational
        
        B. BARRIERS to each upgrade step (differentiated per transition)
        
        C. SWITCHING DYNAMICS (min 8 pathways):
           Use EXACT sub-category names, not generic "Pads":
           "Fluff XL → Mid Ultra", "Fluff Night → Night Ultra", "Premium Ultra → Super Premium Ultra" etc.
           Include brand-level: "Whisper Choice XL [Fluff] → Whisper No Gap No Leaks [Premium Ultra]"
        
        D. BRAND SWITCHING (min 6):
           Within and across sub-categories. Include SKU names where possible.
           "Whisper Ultra Soft → Nua Ultra Thin", "Stayfree Secure XL → Sofy Anti Bacteria XL+" etc.
        `,
        
        "3": `
        SECTION 3: ATTRIBUTE PERFORMANCE BY SUB-CATEGORY
        Output Object: {
           "formats": Array<{format, role_in_lifecycle, functional_resolution[], emotional_resolution[]}>,
           "attribute_matrix": Array<{attribute, fluff_regular, fluff_xl, fluff_night, mid_ultra, premium_ultra, super_premium_ultra}>
        }
        
        Generate format cards for each sub-category (7 cards).
        Then generate an ATTRIBUTE MATRIX with these attributes (min 9 rows):
        - Absorption capacity
        - Rash-free / Skin comfort  
        - Leak protection (side + back)
        - Length adequacy
        - Wing adhesion
        - Thinness / Discretion
        - Odour control
        - Value for money (₹/pad)
        - Disposal ease
        
        Rate each attribute per sub-category: "Strong", "Adequate", "Weak", "N/A".
        Source ratings from Amazon/Flipkart reviews. Be differentiated — not all "Strong".
        `,

        "4": `
        SECTION 4: PURCHASE BEHAVIOUR & CHANNELS
        Output Object: {
           "discovery_sources": Array<{source, strength: "High"|"Med"}>,
           "purchase_channels": Array<{channel, role: "Primary"|"Secondary"|"Emerging", formats_sold: string[], consumer_evidence: Array<{quote, source}>}>,
           "search_intent_clusters": Array<{cluster_name, example_queries[]}>,
           "pricing_architecture": Array<{sub_category, price_range_per_pad, example_skus: string[]}>,
           "combos_and_kits": Array<{type, description, brands_offering: string[], consumer_appeal: string}>
        }
        
        CHANNELS per sub-category:
        - Fluff: Chemist/pharmacy dominant, supermarket secondary, minimal e-commerce
        - Mid Ultra: Chemist + supermarket, growing e-commerce
        - Premium Ultra: E-commerce (Amazon/Flipkart) + pharmacy, some D2C
        - Super Premium Ultra: D2C websites dominant, Amazon, Nykaa. Minimal offline.
        
        PRICING ARCHITECTURE (₹ per pad):
        - Fluff Regular: ₹3-5/pad
        - Fluff XL: ₹4-7/pad  
        - Mid Ultra: ₹6-9/pad
        - Premium Ultra: ₹8-12/pad
        - Super Premium Ultra: ₹12-20/pad
        Use actual Amazon/Flipkart pricing where available.
        
        COMBOS & KITS: Day+Night packs, Starter trial packs, Subscription boxes (D2C), Multi-size combo packs.
        `,

        "5": `
        SECTION 5: CONSUMER DEEP DIVE — PREMIUM ULTRA & SUPER PREMIUM ULTRA
        Output Object: {
           "role_summary": { boldTitle, bullets[], confidence },
           "users": { 
              "discovery_sources": string[], 
              "triggers": string[], 
              "experience_parameters": Array<{parameter, sentiment: "POS"|"NEG"|"MIX", insight}>,
              "delighters": string[],
              "failures": string[]
           },
           "non_users": { 
              "awareness_quality": string,
              "brands_aware": string[],
              "barriers_to_try": Array<{title, bullets[]}> 
           },
           "whisper_ultra_clean": {
              "product_context": string,
              "consumer_feedback": Array<{aspect, sentiment: "POS"|"NEG"|"MIX", insight}>,
              "discontinuation_impact": string,
              "consumer_quotes": string[]
           },
           ${SEGMENTATION_SCHEMA_DESCRIPTION}
        }
        
        PREMIUM ULTRA USER EXPERIENCE — 9 parameters:
        Absorption, Rash-free, Leak protection, Thinness, Wing adhesion, Length, Odour control, Comfort in humidity, Value for money.
        
        SUPER PREMIUM ULTRA (D2C) USER EXPERIENCE:
        Same 9 parameters but also: Packaging, Subscription convenience, Organic/eco claims, Brand trust.
        
        NON-USERS OF ULTRA (still on Fluff): Why haven't they upgraded? Barriers specific to Tier 2/3.
        
        WHISPER ULTRA CLEAN — DISCONTINUED PRODUCT:
        This was a Premium Ultra pad discontinued last year. Capture any residual consumer feedback:
        - What consumers liked about it
        - Why they miss it / what they switched to
        - Any Amazon/Flipkart reviews still referencing it
        If data is thin, explicitly state "Limited data available" and provide what exists.
        `,

        "7": `
        SECTION 7: BRAND PERFORMANCE BY SUB-CATEGORY
        Output Object: {
           "brand_performance": Array<{
              brand: string, 
              sub_categories: string[],
              skus: Array<{sku_name, sub_category, price_per_pad}>,
              key_strengths: string[], 
              key_weaknesses: string[], 
              attribute_verdict: string, 
              brand_share_estimate: string,
              evidence_ids: []
           }>
        }
        
        MANDATORY BRANDS (map each to their sub-categories):
        - Whisper: Fluff Regular/XL/Night + Mid Ultra + Premium Ultra + Night Ultra (full range leader)
        - Stayfree: Fluff Regular/XL/Night + Night Ultra
        - Sofy: Fluff XL + Premium Ultra
        - Paree/Niine/Kotex: Fluff Regular (value segment)
        - Pro-ease: Fluff XL + Mid Ultra
        - Nua: Super Premium Ultra (D2C)
        - Plush: Super Premium Ultra (D2C)
        - Carmesi: Super Premium Ultra (D2C)
        - Azah: Super Premium Ultra (D2C)
        - Pee Safe: Super Premium Ultra (D2C)
        - Everteen: Super Premium Ultra (D2C)
        
        For each brand:
        - List actual SKU names with sub-category and ₹/pad pricing
        - Strengths/weaknesses from Amazon/Flipkart reviews
        - Brand share estimate (% of voice in evidence)
        
        DO NOT include market_position labels like "Leader", "Challenger" etc.
        Source attribute performance from e-commerce reviews ONLY.
        `,

        "8": `
        SECTION 8: WHISPER ULTRA CLEAN — DISCONTINUED PRODUCT ANALYSIS
        Output Object: {
           "cards": Array<{boldTitle, bullets: string[], evidence_ids: [], confidence: "HIGH"|"MED"|"LOW"}>
        }
        
        Whisper Ultra Clean was a Premium Ultra sanitary pad that was DISCONTINUED in 2025.
        
        Generate 4 cards:
        1. "Product Profile": What Whisper Ultra Clean was — positioning, price point, target segment, how it compared to current Whisper Ultra Soft (Skin Love).
        2. "Consumer Sentiment (Pre-Discontinuation)": What consumers liked/disliked based on Amazon/Flipkart reviews. Key attributes: absorption, comfort, rash-free claim, value.
        3. "Post-Discontinuation Impact": What consumers switched to after it was discontinued. Any frustration or loyalty signals. Search for reviews mentioning "discontinued", "not available", "miss this product".
        4. "Strategic Implication": What the discontinuation gap means for a new entrant — is there an unserved segment that loved Ultra Clean's positioning?
        
        If consumer data is thin, be transparent: "Based on limited residual review data (N datapoints)".
        Do NOT fabricate quotes. Use "INFERRED from category patterns" if needed.
        `
      }
    },
    validators: {},
    fallbacks: {
        "1": { cards: [{ boldTitle: "Fluff Regular", bullets: ["SEED: Entry-level pad for Tier 2/3 consumers."], confidence: "LOW", evidence_ids: [] }, { boldTitle: "Premium Ultra", bullets: ["SEED: Thin, rash-free promise."], confidence: "LOW", evidence_ids: [] }] },
        "gap_analysis": FALLBACK_GAP_ANALYSIS,
        "5": FALLBACK_DEEP_DIVE
    }
  }
};
