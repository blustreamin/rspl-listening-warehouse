
// ============================================================================
// ANALYST-GRADE SEED DATA — BABY DIAPERS (LOVINGLE, INDIA)
// Strictly follows DTO schemas in types/baby_diapers.ts.
// Renders the full report before any live synthesis runs, and acts as the
// seed-merge fallback when synthesis is unavailable or fails the quality gate.
// All verbatims are representative, modelled on real Indian parent discussion
// patterns — they are SEED placeholders, replaced by real evidence on ingest.
// ============================================================================

export const BD_CONSTANTS = {
  BRANDS: ["Lovingle", "Pampers", "MamyPoko", "Huggies", "Little Angels"],
  STYLES: ["Cloth", "Tape-style disposable", "Pant-style disposable", "Reusable"],
  PACKS: ["Laddi (single)", "Laddi (twin)", "Non-laddi ₹99", "Non-laddi ₹399", "Non-laddi ₹999"],
  LIFESTAGES: ["Expecting (3rd tri)", "<3m", "3–6m", "7–11m", "1–2y", "2–3y"],
  CHANNELS: ["General Trade", "Modern Trade", "Online"],
  SEC: ["A", "B", "C"],
};

const v = (quote: string, source: string, consumer: string) => ({ quote, source, consumer });

export const BD_SEEDS_V1: Record<string, any> = {

  // ── 1. CATEGORY CONTEXT & CULTURAL TRENDS ──────────────────────────────
  category_context: {
    cards: [
      {
        headline: "From Penetration to Choice-Differentiation",
        what_it_means: "The category has matured past the 'use a disposable at all' question. Conversation now clusters around which brand, style, pack and price point — not whether to switch from cloth.",
        data_points: 1180,
        confidence: "HIGH",
        verbatims: [
          v("Earlier we just wanted any diaper, now I research which one is best for my baby's skin and which pack is value for money.", "Instagram", "29F, Mother of 11-month-old, Pune"),
          v("So many options now — tape, pant, this brand that brand. Decision fatigue is real.", "Reddit", "32F, Second-time mother, Bangalore"),
        ],
      },
      {
        headline: "Seasonality Drives Sharp Demand Spikes",
        what_it_means: "Monsoon rash anxiety, summer heat, and festive/travel periods create predictable conversation and purchase spikes — especially around overnight and travel use.",
        data_points: 640,
        confidence: "HIGH",
        verbatims: [
          v("Monsoon is the worst — rashes flare up and I change brands looking for something more breathable.", "BabyChakra", "27F, First-time mother of 6-month-old, Kochi"),
          v("Festival travel means stocking up on pant-style — easy changes on the go.", "Amazon.in · MamyPoko Extra Absorb", "34F, Mother of 2, Tier 2 Lucknow"),
        ],
      },
      {
        headline: "Paediatrician & Influencer as Norm-Setters",
        what_it_means: "Doctors anchor the first decision (hospital kit, post-natal advice); mommy-influencers and peer communities shape ongoing brand norms and 'good parenting' signals.",
        data_points: 520,
        confidence: "MED",
        verbatims: [
          v("Our paediatrician told us to avoid scented ones for the newborn — I followed that completely.", "Quora", "30F, First-time mother, Delhi"),
          v("I picked the brand my favourite parenting influencer kept using in her reels.", "Instagram", "26F, Expecting (3rd trimester), Hyderabad"),
        ],
      },
      {
        headline: "Premiumisation Concentrated in Metro & Online",
        what_it_means: "Step-ups to premium variants (overnight, dermatologically-tested, pant-style) cluster in metros and on online/modern trade, while value laddi packs hold general trade.",
        data_points: 410,
        confidence: "MED",
        verbatims: [
          v("For night I buy the premium pack online, for daytime the local shop laddi is fine.", "Amazon.in · Pampers Premium Care", "31F, Mother of 1, Mumbai"),
        ],
      },
    ],
  },

  // ── 2. THE BABY'S WORLD — JOURNEY (the spine) ──────────────────────────
  babys_world_journey: {
    lanes: [
      {
        lifestage: "expecting_3rd_tri", age_band: "3rd trimester", size_signal: "Research-heavy, low volume",
        headline: "Anticipation & First Shortlisting",
        needs: ["Build the newborn kit", "Decide first brand", "Understand sizes"],
        mindset: "Anxious, research-led, seeking expert validation",
        dominant_style: "tape_disposable",
        switch_triggers: ["Hospital kit contents", "Paediatrician advice", "Baby shower gifts"],
        verbatims: [
          v("Making my hospital bag list — confused between tape and pant for a newborn.", "BabyChakra", "28F, Expecting, Chennai"),
          v("Which newborn size lasts longest? Don't want to over-buy before delivery.", "Reddit", "30F, Expecting, Pune"),
        ],
      },
      {
        lifestage: "newborn_lt_3m", age_band: "<3 months", size_signal: "High volume, high frequency",
        headline: "Frequent Changes, Delicate Skin, Fit Anxiety",
        needs: ["Gentle on delicate skin", "Frequent leak-free changes", "Snug newborn fit"],
        mindset: "Overwhelmed, safety-first, guilt-prone over any rash",
        dominant_style: "tape_disposable",
        switch_triggers: ["First rash", "Umbilical-cord fit issues", "Night leaks"],
        verbatims: [
          v("Newborn skin is so delicate — one rash and I panic and switch brands.", "Instagram", "27F, First-time mother of 6-week-old, Jaipur"),
          v("Changing 10-12 times a day, the cost adds up fast at this stage.", "Amazon.in · Huggies", "29F, First-time mother, Tier 2 Kanpur"),
        ],
      },
      {
        lifestage: "3_to_6m", age_band: "3–6 months", size_signal: "High volume",
        headline: "Routines Settle, Night-Sleep Emerges",
        needs: ["Overnight absorbency", "Consistent fit as baby grows", "Fewer night changes"],
        mindset: "Seeking reliability and uninterrupted sleep",
        dominant_style: "tape_disposable",
        switch_triggers: ["Overnight leak", "Move to a dedicated night variant"],
        verbatims: [
          v("Finally sleeping longer stretches — I need a diaper that lasts the whole night.", "BabyChakra", "31F, Mother of 4-month-old, Bangalore"),
        ],
      },
      {
        lifestage: "7_to_11m", age_band: "7–11 months", size_signal: "Medium-high volume",
        headline: "Solids & Crawling Shift the Needs",
        needs: ["Handle changed stool from solids", "Fit on a moving baby", "Leak control during crawling"],
        mindset: "Adapting to a more active, messier baby",
        dominant_style: "pant_disposable",
        switch_triggers: ["Crawling begins", "Tape no longer fits a wriggler", "Starting solids changes stool"],
        verbatims: [
          v("Once she started crawling, tape diapers became a wrestling match — moved to pant style.", "Instagram", "30F, Mother of 9-month-old, Mumbai"),
        ],
      },
      {
        lifestage: "1_to_2y", age_band: "1–2 years", size_signal: "Medium volume",
        headline: "Walking Toddler — Pant-Style Rises",
        needs: ["Easy pull-up changes", "Active-fit that won't sag", "Daycare-friendly convenience"],
        mindset: "Convenience-led; child resists being changed",
        dominant_style: "pant_disposable",
        switch_triggers: ["Daycare enrolment", "Child resists lying down for changes"],
        verbatims: [
          v("He won't lie still anymore — pant style I can change him standing up.", "Reddit", "33F, Mother of 16-month-old, Delhi"),
        ],
      },
      {
        lifestage: "2_to_3y", age_band: "2–3 years", size_signal: "Declining volume",
        headline: "Pre-School & Potty-Training Transition",
        needs: ["Daytime vs night-time split", "Training-friendly pull-ups", "Dignity for an aware toddler"],
        mindset: "Transitioning out; day/night divergence",
        dominant_style: "pant_disposable",
        switch_triggers: ["Potty training starts", "Daytime diapers dropped, night retained"],
        verbatims: [
          v("Day time we're potty training, but night time still needs a diaper for accidents.", "BabyChakra", "34F, Mother of 2.5-year-old, Hyderabad"),
        ],
      },
    ],
    spine_summary: [
      "Needs are not static — they reset at every developmental milestone, which is what actually moves a parent between styles, packs and brands.",
      "The tape→pant handoff is the single biggest style switch, triggered by mobility (crawling/walking) around 8–14 months.",
      "Night-sleep (3–6m) and daycare (1–2y) are the two strongest premiumisation and convenience triggers in the journey.",
    ],
  },

  // ── 3. DIAPER STYLES & FORMAT INTERACTION (style axis) ─────────────────
  diaper_styles: {
    styles: [
      {
        style: "cloth", typical_occasion: "Home, daytime, cost-saving", lifestage_skew: "Newborn, home-bound",
        key_challenge: "Laundry load, leakage, frequent changes",
        switch_triggers: ["Outings", "Night leaks", "Time pressure"],
        functional_notes: ["Lowest cost per use", "Reusable, eco-aligned", "Frequent changes needed"],
        emotional_notes: ["Traditional / grandparent comfort", "Eco-guilt relief"],
        verbatims: [
          v("Cloth at home to save money, but for going out I switch to disposable.", "Reddit", "28F, Mother of 5-month-old, Tier 2 Indore"),
        ],
      },
      {
        style: "tape_disposable", typical_occasion: "Newborn, lying-down, overnight", lifestage_skew: "Newborn → ~1yr",
        key_challenge: "Fit on a wriggling baby, tape redness",
        switch_triggers: ["Baby becomes mobile", "Tape marks / redness"],
        functional_notes: ["Adjustable snug fit for newborns", "Good for lying-down changes", "Overnight variants available"],
        emotional_notes: ["Control and reassurance for new parents"],
        verbatims: [
          v("Tape is great for the newborn but the tabs leave marks if I pull too tight.", "Amazon.in · Pampers", "27F, First-time mother, Pune"),
        ],
      },
      {
        style: "pant_disposable", typical_occasion: "Mobile baby, outings, daycare", lifestage_skew: "Crawler → toddler",
        key_challenge: "Cost per use, removal when soiled",
        switch_triggers: ["Mobility (crawl/walk)", "Daycare", "Potty training pull-ups"],
        functional_notes: ["Easy pull-up changes", "Active fit", "Higher cost per piece"],
        emotional_notes: ["Convenience and independence", "Less change-time conflict"],
        verbatims: [
          v("Pant style is a lifesaver at daycare — they can change him so quickly.", "Instagram", "31F, Mother of 14-month-old, Bangalore"),
        ],
      },
      {
        style: "reusable", typical_occasion: "Eco-led households, home", lifestage_skew: "Varies",
        key_challenge: "Drying time, hygiene anxiety, upfront cost",
        switch_triggers: ["Eco motivation", "Cost of disposables over time"],
        functional_notes: ["Lowest long-run cost", "Eco-friendly", "Drying-time dependent"],
        emotional_notes: ["Eco-pride", "Hygiene anxiety in humid climate"],
        verbatims: [
          v("Tried reusable for the environment but drying in monsoon is impossible.", "BabyChakra", "30F, Mother of 1, Kochi"),
        ],
      },
    ],
    interaction_matrix: {
      columns: ["Cloth", "Tape disposable", "Pant disposable", "Reusable"],
      rows: [
        { label: "Owns occasion", cells: ["Home daytime", "Newborn / overnight", "Outings / daycare", "Eco home use"] },
        { label: "Lifestage skew", cells: ["Newborn home", "Newborn→1yr", "Crawler→toddler", "Varies"] },
        { label: "Key challenge", cells: ["Laundry", "Fit on wriggler", "Cost per use", "Drying time"] },
        { label: "Switch trigger", cells: ["Outings", "Mobility", "Potty training", "Cost over time"] },
      ],
    },
    interaction_notes: [
      "The same household mixes styles by occasion — e.g. cloth at home + disposable for outings; tape for newborn shifting to pant as baby becomes mobile.",
      "Style switching is driven mostly by the baby's mobility and the occasion, not by brand dissatisfaction.",
    ],
  },

  // ── 4. PACK ARCHITECTURE — LADDI vs NON-LADDI (pack axis) ──────────────
  pack_architecture: {
    laddi: [
      {
        pack: "laddi_single", who_buys: "Price-sensitive, top-up buyers", occasion: "Impulse / emergency top-up",
        channel_context: "Kirana / general trade dominant",
        role_in_portfolio: "Trial + emergency top-up format",
        verbatims: [
          v("I grab a single piece from the kirana when I run out at night.", "Reddit", "29F, Mother of 7-month-old, Tier 2 Patna"),
        ],
      },
      {
        pack: "laddi_twin", who_buys: "Daily value seekers", occasion: "Short-cycle replenishment",
        channel_context: "General trade",
        role_in_portfolio: "Low-ticket daily affordability",
        verbatims: [
          v("Twin packs from the local shop fit my daily budget better than big packs.", "Amazon.in · Little Angels", "31F, Mother of 1, Tier 2 Varanasi"),
        ],
      },
    ],
    non_laddi: [
      {
        pack: "non_laddi_99", who_buys: "Entry planned-purchase", occasion: "Weekly stock-up",
        channel_context: "Modern trade + online",
        role_in_portfolio: "Entry into planned, larger-count buying",
        verbatims: [
          v("The ₹99 pack is my weekly buy — better value than buying loose.", "Amazon.in · MamyPoko", "30F, Mother of 9-month-old, Bangalore"),
        ],
      },
      {
        pack: "non_laddi_399", who_buys: "Mid-premium planners", occasion: "Monthly stock-up",
        channel_context: "Online / modern trade",
        role_in_portfolio: "Value-per-count sweet spot",
        verbatims: [
          v("Monthly I order the ₹399 pack online — cost per diaper works out cheapest.", "Flipkart · Pampers", "33F, Mother of 1, Mumbai"),
        ],
      },
      {
        pack: "non_laddi_999", who_buys: "Premium bulk buyers", occasion: "Bulk monthly / subscription",
        channel_context: "Online (subscribe & save)",
        role_in_portfolio: "Premiumisation + bulk-value engine",
        verbatims: [
          v("Jumbo ₹999 box on subscription — never run out and best per-piece price.", "Amazon.in · Pampers Premium Care", "32F, Mother of 1, Delhi"),
        ],
      },
    ],
    ladder_dynamics: [
      "Movement UP the ladder is driven by planned purchase, online/modern-trade access, and perceived per-piece value at larger counts.",
      "Movement DOWN to laddi is driven by cash-flow tightness, emergencies, and kirana convenience — not brand rejection.",
      "Laddi and non-laddi co-exist within the same household across the month — pack architecture is an occasion question, not a loyalty question.",
    ],
  },

  // ── 5. BEHAVIOUR & USAGE MAPPING ───────────────────────────────────────
  behaviour_usage: {
    occasions: [
      { headline: "Overnight / Sleep", what_it_means: "Highest-stakes occasion — leak fear disrupts both baby and parent sleep; the strongest premiumisation trigger.", data_points: 720, verbatims: [v("Night is when I'll pay extra — one leak and nobody sleeps.", "Amazon.in · MamyPoko All Night Absorb", "30F, Mother of 5-month-old, Pune")] },
      { headline: "Daytime at Home", what_it_means: "Cost-led; cloth or value laddi often chosen to manage frequent changes economically.", data_points: 380, verbatims: [v("Daytime at home I'm relaxed about brand, I just change often.", "Reddit", "28F, Mother of 1, Tier 2 Indore")] },
      { headline: "Travel", what_it_means: "Pant-style and larger packs preferred for easy changes and stocking up before journeys.", data_points: 420, verbatims: [v("Before any train trip I stock pant-style — quick changes anywhere.", "Instagram", "34F, Mother of 2, Lucknow")] },
      { headline: "Daycare", what_it_means: "Convenience and quick-change drive pant-style adoption; caregivers prefer easy formats.", data_points: 260, verbatims: [v("Daycare insists on pant style — faster for the staff.", "BabyChakra", "31F, Mother of 18-month-old, Bangalore")] },
      { headline: "Outings", what_it_means: "Disposable chosen over cloth for convenience; absorbency for longer gaps between changes.", data_points: 240, verbatims: [v("Going out means disposable, no question — can't manage cloth outside.", "Reddit", "29F, Mother of 8-month-old, Chennai")] },
      { headline: "Monsoon / Rash Season", what_it_means: "Breathability and rash-prevention dominate; parents actively trial brands seeking relief.", data_points: 310, verbatims: [v("Monsoon I keep switching looking for the most breathable option.", "BabyChakra", "27F, First-time mother, Kochi")] },
    ],
    usage_notes: [
      "Usage is occasion-driven, layered on top of the style and journey frameworks — a single household runs different formats for night, day, travel and daycare.",
    ],
  },

  // ── 6. NEEDS, TRIGGERS & PAIN POINTS (3-layer) ─────────────────────────
  needs_triggers_pains: {
    functional: [
      { headline: "Leakage Protection by Time of Day", what_it_means: "Overnight leakage is the single most-cited functional failure; daytime tolerance is higher.", data_points: 680, verbatims: [v("Daytime it's fine but the same diaper leaks by morning.", "Amazon.in · Huggies", "30F, Mother of 4-month-old, Pune")] },
      { headline: "Skin Health & Rash", what_it_means: "Rash is the top safety anxiety and the most common brand-switch trigger, especially in humid regions.", data_points: 640, verbatims: [v("Any redness and I immediately stop that brand.", "Instagram", "28F, First-time mother, Jaipur")] },
      { headline: "Fit Across Sizes", what_it_means: "Size transitions cause gaps and leaks; parents struggle to time the move up a size.", data_points: 290, verbatims: [v("Between sizes is the worst — too tight leaks, too loose leaks.", "Reddit", "31F, Mother of 1, Mumbai")] },
    ],
    emotional: [
      { headline: "Peace of Mind on Baby Safety", what_it_means: "Parents pay for reassurance — 'will my baby be safe and dry' outweighs price at key moments.", data_points: 520, verbatims: [v("I just want to know she's safe and comfortable, that's worth the cost.", "BabyChakra", "29F, First-time mother, Bangalore")] },
      { headline: "Parental Guilt", what_it_means: "Rashes trigger guilt; plastic-waste guilt nudges some toward cloth/reusable.", data_points: 280, verbatims: [v("When he got a rash I felt like I'd failed him.", "Reddit", "30F, Mother of 6-month-old, Delhi")] },
      { headline: "Overwhelm at Brand Choice", what_it_means: "The sheer number of brands/variants creates decision fatigue, raising the value of expert validation.", data_points: 240, verbatims: [v("Too many choices — I just want someone to tell me which is best.", "Quora", "27F, Expecting, Hyderabad")] },
    ],
    social: [
      { headline: "Peer Validation in Mom Groups", what_it_means: "Brand choices are socially validated; recommendations in communities carry strong weight.", data_points: 320, verbatims: [v("I posted in my mom group and went with what most mothers recommended.", "Instagram", "31F, Mother of 1, Pune")] },
      { headline: "Brand as Social Signal", what_it_means: "Premium brands signal 'choosing the best' for the baby; value brands carry no stigma in private use.", data_points: 210, verbatims: [v("For gifting I always pick the premium brand — it shows you care.", "Reddit", "33F, Mother of 2, Mumbai")] },
      { headline: "Doctor / Influencer as Social Currency", what_it_means: "Paediatrician and influencer endorsement is shared as proof of a 'good' decision.", data_points: 190, verbatims: [v("'My doctor recommended it' ends every debate in our family.", "BabyChakra", "30F, First-time mother, Chennai")] },
    ],
  },

  // ── 7. DECISION-MAKING & INFLUENCER ROLES ──────────────────────────────
  decision_influencers: {
    buyer_vs_decider: [
      { headline: "Mother Decides, Multiple Buyers", what_it_means: "Mothers dominate the brand decision; fathers and grandparents often execute the purchase.", data_points: 360, verbatims: [v("I decide the brand, my husband just buys whatever I message him.", "Reddit", "29F, Mother of 1, Bangalore")] },
      { headline: "Rising Father Involvement", what_it_means: "Fathers increasingly co-decide and shop online, especially for stock-ups and subscriptions.", data_points: 180, verbatims: [v("My husband manages the Amazon subscription now, I just approve the brand.", "Instagram", "31F, Mother of 8-month-old, Mumbai")] },
    ],
    support_system_roles: [
      { headline: "Nanny in Nuclear Families", what_it_means: "In nuclear households the nanny's ease-of-use preference (pant style) influences format choice.", data_points: 150, verbatims: [v("Our nanny prefers pant style, says it's easier, so that's what we buy.", "Reddit", "33F, Working mother, Delhi")] },
      { headline: "Grandparents in Joint Families", what_it_means: "In joint families grandparents push cloth/traditional options and weigh in on cost.", data_points: 170, verbatims: [v("My mother-in-law insists cloth is better for the baby — constant negotiation.", "BabyChakra", "28F, First-time mother, Tier 2 Kanpur")] },
    ],
    discovery_hierarchy: [
      { headline: "Hospital Kit Sets the First Brand", what_it_means: "The brand in the hospital discharge kit becomes the default first purchase for many.", data_points: 230, verbatims: [v("Whatever the hospital gave us, we just continued for the first month.", "Reddit", "30F, First-time mother, Pune")] },
      { headline: "Paediatrician → Influencer → Search → Store → Family", what_it_means: "Trust descends from doctor to influencer to search to in-store to family, varying by platform.", data_points: 200, verbatims: [v("Doctor first, then I cross-check on YouTube reviews before buying.", "YouTube", "29F, First-time mother, Hyderabad")] },
    ],
  },

  // ── 8. PRODUCT ATTRIBUTE DRIVERS ───────────────────────────────────────
  attribute_drivers: {
    drivers: [
      { attribute: "Leakage Protection", tier: "must_have", importance: "HIGH", insight: "Non-negotiable; the default reason to stay or switch. Weighted hardest overnight.", verbatims: [v("If it leaks once, I'm done with it.", "Amazon.in · MamyPoko", "30F, Mother of 1, Pune")] },
      { attribute: "Soft / Irritation-free Inner Layer", tier: "must_have", importance: "HIGH", insight: "Directly tied to rash anxiety; 'soft' and 'rash-free' are the most emotionally loaded benefits.", verbatims: [v("Softness against her skin is the first thing I check.", "Instagram", "28F, First-time mother, Jaipur")] },
      { attribute: "Secure Fit & Adjustable Tabs", tier: "must_have", importance: "MED", insight: "Fit failures cause leaks and gaps; adjustability matters most for newborns.", verbatims: [v("The fit has to be snug or it just slides and leaks.", "Reddit", "31F, Mother of 1, Mumbai")] },
      { attribute: "Breathable Cover", tier: "good_to_have", importance: "MED", insight: "Strong driver in humid/monsoon regions; linked to rash prevention.", verbatims: [v("Breathable is a must in our Kerala humidity.", "BabyChakra", "27F, Mother of 6-month-old, Kochi")] },
      { attribute: "Extended Overnight Absorption", tier: "good_to_have", importance: "HIGH", insight: "The premiumisation hook — parents trade up specifically for night protection.", verbatims: [v("I bought the premium one only for its overnight claim.", "Amazon.in · Pampers Premium Care", "32F, Mother of 1, Delhi")] },
      { attribute: "Wetness / Change Indicator", tier: "delighter", importance: "LOW", insight: "Appreciated by first-time parents; reduces guesswork but rarely a switch driver.", verbatims: [v("The wetness line is so helpful for a first-time mom like me.", "Instagram", "26F, First-time mother, Hyderabad")] },
      { attribute: "Biodegradable / Eco Materials", tier: "delighter", importance: "LOW", insight: "Niche but rising among eco-led metro households; carries pride, not yet mass demand.", verbatims: [v("I'd love a truly eco option that actually works.", "Reddit", "30F, Mother of 1, Bangalore")] },
    ],
  },

  // ── 9. PRICE–PACK & PREMIUMISATION SIGNALS ─────────────────────────────
  price_pack_signals: {
    price_awareness: [
      { headline: "Price-per-Diaper is the Mental Unit", what_it_means: "Parents convert pack prices to per-piece cost and compare across packs and channels.", data_points: 410, verbatims: [v("I always calculate cost per piece — the big pack online wins.", "Flipkart · Pampers", "33F, Mother of 1, Mumbai")] },
      { headline: "Channel Price Gaps are Known", what_it_means: "Online/modern-trade per-piece pricing is understood to beat kirana for large counts.", data_points: 230, verbatims: [v("Local shop is fine for emergencies but online is cheaper per piece.", "Reddit", "29F, Mother of 1, Tier 2 Patna")] },
    ],
    price_ceilings: [
      { sec: "A", ceiling_inr: "₹18–25 / piece (premium overnight tolerated)", notes: "Will pay premium for night and skin-safety claims." },
      { sec: "B", ceiling_inr: "₹10–15 / piece", notes: "Trades up selectively for night; value packs for day." },
      { sec: "C", ceiling_inr: "₹6–10 / piece", notes: "Laddi-led; premium reserved for emergencies or gifting." },
    ],
    premiumisation_triggers: [
      { headline: "Overnight Protection Justifies the Step-Up", what_it_means: "Night leak fear is the clearest reason a parent moves to a premium variant.", data_points: 350, verbatims: [v("I trade up only for the night diaper, daytime stays value.", "Amazon.in · MamyPoko All Night Absorb", "30F, Mother of 5-month-old, Pune")] },
      { headline: "Skin-Safety / Rash Relief", what_it_means: "Persistent rash pushes parents up the ladder seeking dermatologically-tested options.", data_points: 280, verbatims: [v("After repeated rashes I moved to the premium 'dermatologically tested' one.", "Instagram", "28F, First-time mother, Jaipur")] },
    ],
    promo_response: [
      { headline: "Subscribe-and-Save Locks in Premium Bulk", what_it_means: "Online subscriptions convert premium trial into repeat at the jumbo pack.", data_points: 190, verbatims: [v("The subscription discount is why I stick to the premium box.", "Amazon.in · Pampers Premium Care", "32F, Mother of 1, Delhi")] },
      { headline: "Festive / Bulk Offers Drive Stock-Up", what_it_means: "Festival and bulk-deal periods trigger trading up to larger counts.", data_points: 160, verbatims: [v("Big Billion Days is when I stock the jumbo packs.", "Flipkart · MamyPoko", "31F, Mother of 1, Bangalore")] },
    ],
    pack_vs_unit_tradeoff: [
      { headline: "Larger Count Wins on Per-Piece, Loses on Cash Outlay", what_it_means: "Parents know jumbo is cheaper per piece but laddi protects monthly cash flow.", data_points: 240, verbatims: [v("Jumbo is cheaper per piece but ₹999 at once is a lot — so I mix.", "Reddit", "30F, Mother of 1, Tier 2 Lucknow")] },
    ],
  },

  // ── 10. GAP ANALYSIS ───────────────────────────────────────────────────
  gap_analysis: {
    current_challenges: {
      heading: "Current Challenges in the Baby Diaper Category",
      bullets: [
        { claim: "Overnight Leakage", explanation: "Most-cited failure; disrupts baby and parent sleep across brands.", severity: "HIGH", data_points: 720, consumer_evidence: [v("Every brand leaks by morning eventually.", "Amazon.in · Huggies", "30F, Mother of 4-month-old, Pune")] },
        { claim: "Rash in Humid Climate", explanation: "Monsoon and southern humidity drive recurrent rash and constant brand-switching.", severity: "HIGH", data_points: 640, consumer_evidence: [v("Rashes every monsoon no matter the brand.", "BabyChakra", "27F, Mother of 6-month-old, Kochi")] },
        { claim: "Size-Transition Gaps", explanation: "Leaks and discomfort during the move up a size; poor guidance on timing.", severity: "MED", data_points: 290, consumer_evidence: [v("Sizing up always means a week of leaks.", "Reddit", "31F, Mother of 1, Mumbai")] },
        { claim: "Decision Overwhelm", explanation: "Too many brands/variants; first-time parents lack a trusted shortcut.", severity: "MED", data_points: 240, consumer_evidence: [v("I wish someone just told me which one to buy.", "Quora", "26F, Expecting, Hyderabad")] },
      ],
    },
    resolved_challenges: {
      heading: "What the Category Has Solved",
      bullets: [
        { claim: "Daytime Convenience", explanation: "Pant-style has largely solved quick, mess-free daytime and daycare changes.", severity: "LOW", data_points: 180, consumer_evidence: [v("Pant style made daytime changes effortless.", "Instagram", "31F, Mother of 14-month-old, Bangalore")] },
      ],
    },
    unresolved_challenges: {
      heading: "Persistent Unresolved Pain Points",
      bullets: [
        { claim: "True Overnight Dryness at Value Price", explanation: "Reliable all-night protection still feels premium-only; value seekers under-served.", severity: "HIGH", data_points: 310, consumer_evidence: [v("Why can't a normal-priced diaper last the whole night?", "Reddit", "29F, Mother of 1, Tier 2 Indore")] },
        { claim: "Genuinely Breathable & Rash-Free", explanation: "Rash-free + breathable in humidity remains an unmet promise across price points.", severity: "HIGH", data_points: 280, consumer_evidence: [v("Still searching for one that's truly rash-free in summer.", "BabyChakra", "28F, First-time mother, Chennai")] },
      ],
    },
    need_gap: {
      heading: "White Space & Need Gaps",
      need_statements: [
        { need: "Affordable all-night protection", why_now: "Night leakage is the top pain and the top premiumisation trigger; a value night option is open white space.", who: "SEC B/C parents of 3–11 month babies", priority: "P0", consumer_evidence: [v("Give me a night diaper I can actually afford daily.", "Reddit", "29F, Mother of 5-month-old, Tier 2 Patna")] },
        { need: "Monsoon-grade breathability", why_now: "Recurrent humid-climate rash drives churn; a credible breathable claim could anchor loyalty.", who: "South & coastal parents", priority: "P1", consumer_evidence: [v("Something built for our humidity, please.", "BabyChakra", "27F, Mother of 6-month-old, Kochi")] },
      ],
    },
  },

  // ── 11. LOVINGLE BRAND DIAGNOSTIC ──────────────────────────────────────
  // LOCK: dominant aware-non-trier barrier cluster = RASH / SKIN-SAFETY.
  lovingle_diagnostic: {
    spontaneous_awareness: [
      { headline: "Value-Led, Regionally Concentrated Awareness", what_it_means: "Lovingle surfaces as a value/availability brand in general trade; lower spontaneous recall vs Pampers/MamyPoko.", data_points: 210, verbatims: [v("I've seen Lovingle at my local shop but didn't know much about it.", "Reddit", "29F, Mother of 1, Tier 2 Kanpur")] },
    ],
    consideration_drivers: [
      { headline: "Price & Availability", what_it_means: "Affordability and easy kirana availability are the primary reasons parents consider Lovingle.", data_points: 180, verbatims: [v("It's cheaper and always available at my kirana, that's why I tried it.", "Amazon.in · Lovingle", "30F, Mother of 8-month-old, Tier 2 Lucknow")] },
    ],
    consideration_barriers: [
      { headline: "Skin-Safety & Rash Concern", what_it_means: "The dominant barrier cluster is rash / skin-safety doubt — parents worry it is gentle enough for delicate skin. This is Lovingle's core objection to overcome.", data_points: 240, verbatims: [v("I'm not sure if a budget brand is safe enough for newborn skin.", "BabyChakra", "27F, First-time mother, Pune"), v("Worried it might cause rashes, so I stick to the brand I trust.", "Reddit", "28F, Mother of 1, Bangalore")] },
    ],
    aware_non_trier: [
      { headline: "Trust Hesitation Despite Awareness", what_it_means: "Aware non-triers hold back primarily on skin-safety reassurance, not on price or availability.", data_points: 160, verbatims: [v("I know Lovingle exists but I haven't risked it on my baby's skin yet.", "Reddit", "31F, First-time mother, Tier 2 Indore")] },
    ],
    trier_working: [
      { headline: "Value-for-Money Satisfies Daytime Use", what_it_means: "Triers are positive on value and daytime performance; reassurance grows with repeat use.", data_points: 140, verbatims: [v("For daytime it does the job and saves money — pleasantly surprised.", "Amazon.in · Lovingle", "30F, Mother of 1, Tier 2 Varanasi")] },
    ],
    switch_stories: [
      { direction: "to_lovingle", from_brand: "Little Angels", to_brand: "Lovingle", trigger: "Better value at similar performance for daytime use", verbatims: [v("Switched from Little Angels to Lovingle for daytime, similar feel cheaper price.", "Reddit", "29F, Mother of 1, Tier 2 Patna")] },
      { direction: "from_lovingle", from_brand: "Lovingle", to_brand: "MamyPoko", trigger: "Rash concern / wanted a more trusted skin-safety claim", verbatims: [v("Moved off Lovingle to MamyPoko after a rash scare, wanted to be safe.", "BabyChakra", "28F, First-time mother, Chennai")] },
    ],
  },

  // ── 12. COMPETITIVE BRAND LANDSCAPE ────────────────────────────────────
  brand_landscape: {
    market_structure: [
      "Pampers and MamyPoko anchor mind-share and premium; Huggies holds a strong mid-premium position.",
      "Little Angels and Lovingle compete on value and availability in general trade.",
      "Premiumisation conversation (overnight, dermatologically-tested) concentrates around Pampers and MamyPoko's top variants.",
      "Lovingle's opportunity is a credible skin-safety / value-night position to convert price-led triers into loyalists.",
      "Pant-style adoption is reshaping share as babies become mobile — brands strong in pant variants gain in the 7m+ cohort.",
    ],
    brands: [
      { brand: "Pampers", tier: "premium", share_of_voice: { share_pct: 30 }, overall_sentiment: "POS", positioning_summary: "Premium, paediatrician-trusted, strong on overnight and skin-safety claims. Aspirational default for many first-time parents.", attribute_scale: [{ attribute: "Leak protection", score_0_5: 4.3 }, { attribute: "Skin comfort", score_0_5: 4.4 }, { attribute: "Overnight", score_0_5: 4.3 }, { attribute: "Value", score_0_5: 3.2 }, { attribute: "Availability", score_0_5: 4.2 }], strengths: ["Overnight absorbency", "Skin softness", "Trust"], weaknesses: ["Price per piece"], data_points: 980, verbatims: [v("Pampers Premium Care is the only one that lasts the night for us.", "Amazon.in · Pampers Premium Care", "32F, Mother of 1, Delhi")] },
      { brand: "MamyPoko", tier: "mid_premium", share_of_voice: { share_pct: 27 }, overall_sentiment: "POS", positioning_summary: "Strong on absorbency and pant-style; 'Extra Absorb' and 'All Night' variants well-regarded for value-premium balance.", attribute_scale: [{ attribute: "Leak protection", score_0_5: 4.2 }, { attribute: "Skin comfort", score_0_5: 4.0 }, { attribute: "Overnight", score_0_5: 4.2 }, { attribute: "Value", score_0_5: 3.6 }, { attribute: "Availability", score_0_5: 4.1 }], strengths: ["Absorbency", "Pant-style range", "Night variant"], weaknesses: ["Occasional fit complaints"], data_points: 870, verbatims: [v("MamyPoko Extra Absorb pant is our daytime default.", "Amazon.in · MamyPoko Extra Absorb", "30F, Mother of 9-month-old, Bangalore")] },
      { brand: "Huggies", tier: "mid_premium", share_of_voice: { share_pct: 18 }, overall_sentiment: "MIX", positioning_summary: "Solid mid-premium presence; praised for softness, mixed on overnight performance.", attribute_scale: [{ attribute: "Leak protection", score_0_5: 3.9 }, { attribute: "Skin comfort", score_0_5: 4.1 }, { attribute: "Overnight", score_0_5: 3.7 }, { attribute: "Value", score_0_5: 3.4 }, { attribute: "Availability", score_0_5: 3.9 }], strengths: ["Softness", "Fit"], weaknesses: ["Overnight leaks reported"], data_points: 540, verbatims: [v("Huggies is soft but leaked overnight for us.", "Amazon.in · Huggies", "30F, Mother of 4-month-old, Pune")] },
      { brand: "Little Angels", tier: "mass", share_of_voice: { share_pct: 13 }, overall_sentiment: "MIX", positioning_summary: "Value brand with general-trade strength; acceptable daytime performance, weaker premium perception.", attribute_scale: [{ attribute: "Leak protection", score_0_5: 3.4 }, { attribute: "Skin comfort", score_0_5: 3.3 }, { attribute: "Overnight", score_0_5: 3.1 }, { attribute: "Value", score_0_5: 4.0 }, { attribute: "Availability", score_0_5: 3.8 }], strengths: ["Price", "Availability"], weaknesses: ["Overnight", "Skin-safety perception"], data_points: 360, verbatims: [v("Little Angels works for daytime and is easy on the pocket.", "Amazon.in · Little Angels", "31F, Mother of 1, Tier 2 Varanasi")] },
      { brand: "Lovingle", tier: "mass", share_of_voice: { share_pct: 12 }, overall_sentiment: "MIX", positioning_summary: "RSPL's value/availability entrant. Daytime value appreciated; key objection cluster is rash / skin-safety reassurance. Headroom to own an affordable skin-safety / value-night position.", attribute_scale: [{ attribute: "Leak protection", score_0_5: 3.3 }, { attribute: "Skin comfort", score_0_5: 3.2 }, { attribute: "Overnight", score_0_5: 3.0 }, { attribute: "Value", score_0_5: 4.1 }, { attribute: "Availability", score_0_5: 3.9 }], strengths: ["Value", "Kirana availability"], weaknesses: ["Skin-safety perception", "Overnight"], data_points: 320, verbatims: [v("Lovingle is good value for daytime, I just want more reassurance on rashes.", "Amazon.in · Lovingle", "30F, Mother of 8-month-old, Tier 2 Lucknow")] },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // F3 GATE 3 — NEW SECTIONS (INDICATIVE seed; analyst-grade, India-grounded).
  // Marked "indicative" in-render; replaced by live corpus when synthesis runs.
  // ════════════════════════════════════════════════════════════════════════

  // ── EXEC SUMMARY (lead / cover) ────────────────────────────────────────
  exec_summary: {
    stats: [
      { stat: "36m+", label: "Listening window · 6 source layers triangulated" },
      { stat: "~3,800", label: "Indexed parent verbatims & evidence points" },
      { stat: "₹399", label: "The considered-mid rung where premiumisation unlocks" },
    ],
    north_star: "Win the ₹399 considered-mid rung with an affordable overnight, skin-safe pant — converting value-led daytime buyers into premium-night loyalists.",
    insights: [
      { headline: "Premiumisation is occasion-led, not income-led", what_it_means: "The same household trades up for night and travel while staying value for daytime — the step-up is triggered by the occasion, not the wallet.", verbatims: [v("Night I buy the premium pack, daytime the local laddi is fine.", "Amazon.in · Pampers Premium Care", "31F, Mother of 1, Mumbai")] },
      { headline: "Rash / skin-safety is Lovingle's locked objection", what_it_means: "Aware non-triers hold back on skin-safety reassurance — not price or availability. Resolving it is the single biggest conversion lever.", verbatims: [v("I'm not sure a budget brand is safe enough for newborn skin, so I haven't risked it.", "BabyChakra", "27F, First-time mother, Pune")] },
      { headline: "The tape→pant handoff is the biggest style switch", what_it_means: "Mobility around 8–14 months forces the move to pant-style — the moment to capture an active-baby buyer.", verbatims: [v("Once she started crawling, tape became a wrestling match — moved to pant style.", "Instagram", "30F, Mother of 9-month-old, Mumbai")] },
      { headline: "Overnight protection is the #1 trade-up trigger", what_it_means: "One leak wakes the whole family; night is where parents will pay extra, making it the gateway from value to mid.", verbatims: [v("Night is when I'll pay extra — one leak and nobody sleeps.", "Amazon.in · MamyPoko All Night Absorb", "30F, Mother of 5-month-old, Pune")] },
      { headline: "Channel maps to pack: kirana=laddi, online=jumbo", what_it_means: "Laddi trial happens in general trade; planned premium bulk happens online via subscribe-and-save — the premiumisation funnel runs left to right.", verbatims: [v("The subscription discount is why I stick to the premium box online.", "Amazon.in · Pampers Premium Care", "32F, Mother of 1, Delhi")] },
      { headline: "Affordable all-night dryness is open white space", what_it_means: "Value seekers feel reliable overnight protection is premium-only — a credible value-night option is unclaimed territory for Lovingle.", verbatims: [v("Why can't a normal-priced diaper last the whole night?", "Reddit", "29F, Mother of 1, Tier 2 Indore")] },
    ],
    moves: [
      { n: 1, title: "Own the ₹399 considered-mid rung", rationale: "Lead with an overnight-protection pant SKU — overnight is the #1 trade-up trigger." },
      { n: 2, title: "Turn rash-anxiety into a premium claim", rationale: "A skin-safe line at ₹399–₹999 converts the locked objection into a reason to pay more." },
      { n: 3, title: "Use gifting to seed ₹999+ trial", rationale: "Festive & baby-shower packs are the cheapest entry into the premium buyer — push MT & online." },
      { n: 4, title: "Hold laddi as defence, not anchor", rationale: "Keep a kirana single/twin for trial & repeat, but don't position the brand at the entry rung." },
    ],
  },

  // ── SEASONALITY & DEMAND RHYTHM ────────────────────────────────────────
  seasonality: {
    monthly: [54, 50, 60, 78, 90, 74, 96, 92, 70, 84, 88, 66], // Jan→Dec relative demand index
    spikes: [
      { month: "Jul–Aug", label: "Monsoon rash-anxiety", verbatim: v("Every monsoon the rashes come back and I start trying breathable brands again.", "BabyChakra", "27F, Mother of 6-month-old, Kochi") },
      { month: "Apr–May", label: "Summer heat & sweat", verbatim: v("In peak summer I change far more often and look for the thinnest, most breathable one.", "Reddit", "29F, Mother of 1, Nagpur") },
      { month: "Oct–Nov", label: "Festive & travel stock-up", verbatim: v("Before Diwali travel I stock the jumbo pant packs — quick changes on the road.", "Flipkart · MamyPoko", "34F, Mother of 2, Tier 2 Lucknow") },
    ],
    occasions: [
      { headline: "Monsoon: breathability & rash-relief peak", what_it_means: "Humid months drive active brand trial seeking rash relief — the window to win switchers with a skin-safe claim.", data_points: 360, verbatims: [v("Monsoon I keep switching looking for the most breathable option.", "BabyChakra", "27F, First-time mother, Kochi")] },
      { headline: "Summer: thinness & frequent changes", what_it_means: "Heat raises change frequency and per-piece cost salience; value packs and breathable thin variants both rise.", data_points: 240, verbatims: [v("Summer means more changes, so cost per piece really starts to matter.", "Reddit", "28F, Mother of 8-month-old, Ahmedabad")] },
      { headline: "Festive & travel: non-laddi bulk stock-up", what_it_means: "Festival travel triggers trade-up to larger pant packs and gifting — the cheapest route into premium trial.", data_points: 300, verbatims: [v("Festival season I gift premium packs and stock up for the trips.", "Instagram", "33F, Mother of 1, Mumbai")] },
    ],
  },

  // ── TARGET GROUP & SEGMENTS ────────────────────────────────────────────
  target_group: {
    segments: [
      { segment: "Parents of 0–3y (baby-age anchored)", definition: "The core buyer across the full diaper journey; segmented by the baby's lifestage, never the parent's age. Needs reset at each milestone.", behaviours: ["Run different formats by occasion — night vs day vs travel.", "Trade up on a reason (overnight, rash); stay value for routine daytime."], verbatims: [v("I decide the brand by what stage she's in — newborn tape, now pant for my crawler.", "Reddit", "30F, Mother of 9-month-old, Bangalore")] },
      { segment: "Third-trimester expecting mothers", definition: "Research-heavy, anticipation-led first-time deciders building the newborn kit and shortlisting the first brand before delivery.", behaviours: ["Lean on paediatrician advice and the hospital discharge kit.", "Anxious about size and skin-safety; high influencer/community exposure."], verbatims: [v("Making my hospital bag list — confused between tape and pant for a newborn.", "BabyChakra", "28F, Expecting (3rd trimester), Chennai")] },
      { segment: "Family structure: nuclear+nanny vs joint+grandparents", definition: "Household structure shapes who influences format and cost — the nanny's convenience preference vs the grandparent's cloth/value pressure.", behaviours: ["Nuclear+nanny → pant-style convenience wins.", "Joint+grandparents → cloth/value negotiation and cost scrutiny."], verbatims: [v("My mother-in-law insists cloth is better — it's a constant negotiation at home.", "BabyChakra", "28F, First-time mother, Tier 2 Kanpur")] },
    ],
  },

  // ── CHANNEL & RETAIL ARCHITECTURE ──────────────────────────────────────
  channel_retail: {
    nodes: [
      { node: "General Trade / Kirana", share: 48, maps_to_pack: "Laddi · single / twin", note: "Impulse & emergency top-up; value-led; the trial & repeat engine. Defends volume, not margin.", verbatims: [v("I grab a single piece from the kirana when I run out at night.", "Reddit", "29F, Mother of 7-month-old, Tier 2 Patna")] },
      { node: "Modern Trade", share: 22, maps_to_pack: "Non-Laddi · ₹99–₹399", note: "Planned weekly/monthly stock-up; mid-premium discovery; value-pack sweet spot.", verbatims: [v("At the supermarket I pick the value pack for the month, it's easier to plan.", "Flipkart · MamyPoko", "31F, Mother of 1, Pune")] },
      { node: "Online", share: 30, maps_to_pack: "Non-Laddi · ₹399–₹999 + subscribe", note: "The premiumisation engine — best per-piece value, jumbo boxes and subscribe-and-save.", verbatims: [v("Jumbo box on subscription — never run out and best per-piece price.", "Amazon.in · Pampers Premium Care", "32F, Mother of 1, Delhi")] },
    ],
    flow_notes: [
      "Premiumisation flows left → right: kirana laddi trial → modern-trade value packs → online jumbo & subscription.",
      "Pack architecture maps cleanly onto channel — laddi is a general-trade format, non-laddi is a modern-trade/online format.",
      "Online subscriptions are the strongest mechanism for locking a premium buyer into repeat.",
    ],
  },

  // ── GEOGRAPHY & REGIONAL PATTERNS ──────────────────────────────────────
  geography_regional: {
    regions: [
      { name: "Metro", intensity: 90, note: "Premiumisation is the default — overnight & skin-safe are baseline, not splurge; online-led, subscription-friendly.", verbatims: [v("In the city everyone I know uses premium pant style now, it's just normal.", "Instagram", "31F, Mother of 1, Mumbai")] },
      { name: "Tier 2 / 3", intensity: 55, note: "Value-led; laddi & kirana dominate; premium reserved for night packs or received gifts. Rupees-per-piece governs.", verbatims: [v("Here we mostly buy the laddi from the shop; premium only for night sometimes.", "Reddit", "29F, Mother of 1, Tier 2 Indore")] },
      { name: "South & coastal", intensity: 70, note: "High humidity makes breathability & rash-relief the dominant claim; active brand trial through monsoon.", verbatims: [v("In our Kerala humidity breathable is the first thing I check.", "BabyChakra", "27F, Mother of 6-month-old, Kochi")] },
      { name: "North & West", intensity: 66, note: "Strong festive & gifting culture; bulk stock-up seeds premium trial; pant-style adoption rising fast.", verbatims: [v("Festive season we gift the premium packs and stock up the big boxes.", "Flipkart · Pampers", "33F, Mother of 2, Delhi")] },
      { name: "East", intensity: 48, note: "Most value-sensitive; higher cloth co-use; availability gaps in smaller towns keep laddi central.", verbatims: [v("Good packs aren't always in stock nearby, so I keep cloth as backup.", "Reddit", "30F, Mother of 1, Tier 2 Patna")] },
    ],
    summary: [
      "Metro premiumisation vs Tier 2/3 value-seeking is the sharpest geographic split in the category.",
      "Climate is a real driver: humid South skews to breathability; festive North/West skews to bulk & gifting.",
    ],
  },

  // ── INFLUENCER & COMMUNITY ECOSYSTEM ───────────────────────────────────
  influencer_community: {
    center: "Parent (mother-led, father increasingly co-deciding)",
    nodes: [
      { name: "Paediatricians", role: "Anchor the first decision", weight: 92, verbatim: v("Our paediatrician told us to avoid scented ones for the newborn — I followed that completely.", "Quora", "30F, First-time mother, Delhi") },
      { name: "Mommy-influencers", role: "Set ongoing brand norms", weight: 76, verbatim: v("I picked the brand my favourite parenting influencer kept using in her reels.", "Instagram", "26F, Expecting (3rd trimester), Hyderabad") },
      { name: "Mothers'-group communities", role: "Peer validation (unbranded)", weight: 70, verbatim: v("I posted in my mom group and went with what most mothers recommended.", "BabyChakra", "31F, Mother of 1, Pune") },
      { name: "Review communities", role: "Pre-purchase cross-check", weight: 58, verbatim: v("Doctor first, then I cross-check YouTube and Amazon reviews before buying.", "YouTube", "29F, First-time mother, Hyderabad") },
    ],
    excluded: ["WhatsApp groups — closed / end-to-end encrypted; not part of the deliverable and never cited."],
    notes: [
      "Trust descends doctor → influencer → peer community → reviews → family, varying by platform.",
      "Closed Facebook groups are best-effort/manual only; WhatsApp is explicitly out of scope.",
    ],
  },

  // ── WHITE SPACE & RECOMMENDATIONS (decision-ready payoff) ───────────────
  whitespace_recommendations: {
    xAxis: { low: "Low effort", high: "High effort" },
    yAxis: { low: "Low impact", high: "High impact" },
    points: [
      { label: "Affordable all-night pant", x: 58, y: 92, quadrant: "Big bet", note: "Value-night white space for SEC B/C — the clearest unclaimed territory." },
      { label: "Skin-safe / rash-free claim", x: 34, y: 86, quadrant: "Quick win", note: "Directly converts Lovingle's locked objection into a reason to pay more." },
      { label: "Festive gifting packs", x: 26, y: 62, quadrant: "Quick win", note: "Cheapest route into ₹999+ premium trial." },
      { label: "Monsoon breathability line", x: 62, y: 72, quadrant: "Big bet", note: "South & coastal loyalty anchor against recurrent rash churn." },
      { label: "Kirana laddi defence", x: 22, y: 38, quadrant: "Maintain", note: "Hold trial/repeat volume; do not anchor the brand here." },
    ],
    moves: [
      { n: 1, title: "Launch an affordable overnight pant at ₹399", rationale: "Plant the flag on value-night white space before a competitor does — the top-right big bet." },
      { n: 2, title: "Lead communication with skin-safety proof", rationale: "Dermatologically-tested / rash-free messaging unlocks the aware non-trier at low effort." },
      { n: 3, title: "Build a festive gifting SKU", rationale: "Seed premium trial cheaply via baby-shower & festive packs through MT and online." },
      { n: 4, title: "Re-mix the portfolio across the ladder", rationale: "Laddi defends trial; non-laddi ₹399–₹999 carries the margin and the premium story." },
    ],
  },

  // ── METHODOLOGY & EVIDENCE BASE (credibility appendix) ─────────────────
  methodology_evidence: {
    sources: ["Social platforms", "E-commerce reviews", "Content communities", "Influencer ecosystem", "Vernacular & search"],
    excluded: ["WhatsApp groups (closed / end-to-end encrypted)", "Closed Facebook groups (best-effort / manual only)"],
    window: "A multi-year historical listening window — long enough to observe a baby's full diaper journey end-to-end.",
    coverage: [
      { label: "Geography", detail: "Metro, Tier 2 and Tier 3; North, South, East, West & Central India." },
      { label: "Lifestage", detail: "Expecting (3rd trimester) through 2–3y, anchored to the baby's age." },
      { label: "Channels", detail: "General Trade (kirana/chemist), Modern Trade, and Online (Amazon.in, Flipkart, FirstCry)." },
      { label: "Verbatim hygiene", detail: "Every quote carries source + baby-age-anchored consumer descriptor; no duplicate text." },
    ],
    confidence: "Medium-High — multiple corroborating source layers per signal.",
    disclaimer: "Indicative worked example — figures and verbatims demonstrate the report's format, density and visual system. Production sections render verbatims and evidence weights directly from the live Urchin corpus.",
  },

  // ─── Stream C: NEW SECTIONS — indicative seeds (replaced by live corpus on re-synthesis) ───

  consumer_personas: {
    personas: [
      {
        name: "The Anxious Newborn Researcher",
        lifestage: "newborn_lt_3m", family_structure: "nuclear", mother_type: "first_time",
        segment: "mid_premium",
        demographic: "27F, First-time mother of 6-week-old, Tier 1 Pune",
        channel_posture: "Online research → Amazon.in subscribe-save", price_posture: "Pays for safety; reads every review",
        style_preference: "tape_disposable",
        signature_behaviours: ["Reads 30+ reviews before first purchase", "Joins 2-3 mom WhatsApp groups in pregnancy", "Asks paediatrician about every rash"],
        triggers: ["First rash panic → brand switch", "3am leak → midnight Amazon order"],
        pain_points: ["Information overload across brands", "Cost of frequent newborn changes", "Distrust of unverified labels"],
        unmet_needs: ["Doctor-endorsed reassurance on Indian-made brands", "Smaller trial-pack at premium tier"],
        barrier_to_lovingle: "RASH/SKIN reassurance — unknown brand for premium-curious first-time mothers",
        data_points: 612,
        verbatims: [
          v("I read every single review on Amazon before I bought my first pack. Pampers had so many 5-stars I just trusted it.", "Amazon.in · Pampers Premium Care", "27F, First-time mother of 6-week-old, Tier 1 Pune"),
          v("My doctor said Pampers is fine but I still googled every alternative. I just wanted someone to tell me what's safe.", "Reddit · r/BabyBumpsIndia", "26F, First-time mother of 5-week-old, Mumbai"),
          v("Cost is killing me — 12 changes a day for ₹35 each. But I won't switch to a cheaper brand without a doctor's nod.", "Instagram comment · @mommyworld", "29F, First-time mother of 8-week-old, Bangalore"),
          v("3am leak. Switched brands at midnight via Amazon. Pampers Premium has not failed since.", "Amazon.in · Pampers Premium Care", "28F, First-time mother of 7-week-old, Delhi"),
          v("Indian brands sound cheaper but I'm scared. What if it gives my baby rash? Better to stick to what doctor knows.", "BabyChakra forum", "27F, First-time mother of 4-week-old, Hyderabad"),
        ],
      },
      {
        name: "The Established Mother of Two",
        lifestage: "1_to_2y", family_structure: "joint", mother_type: "second_time",
        segment: "mass",
        demographic: "32F, Mother of 2 (16-month-old + 5y), Joint family, Tier 2 Kanpur",
        channel_posture: "Kirana + monthly bulk online", price_posture: "Value-pragmatic; knows per-piece cost",
        style_preference: "pant_disposable",
        signature_behaviours: ["Buys ₹399 non-laddi packs monthly online", "Picks up laddi from kirana when running short", "Tells first-time mothers in family what to buy"],
        triggers: ["Festive bulk-buy", "Daycare days needing pant-style", "Grandmother's leak complaint"],
        pain_points: ["MIL pushes cloth for daytime", "Cost-per-piece anxiety vs MNC brands"],
        unmet_needs: ["Trusted Indian brand at MamyPoko price point", "Pack-size variety in laddi"],
        barrier_to_lovingle: "Awareness, not concern — would try if visible in her kirana repertoire",
        data_points: 487,
        verbatims: [
          v("MamyPoko is what we use. Tried Lovingle once for daytime but went back to MamyPoko — the brand is what my MIL trusts.", "Flipkart · MamyPoko Extra Absorb XL", "32F, Mother of 2, Kanpur"),
          v("I keep one laddi from kirana for backup and order a ₹399 pack online for the month — that's the system.", "Amazon.in · MamyPoko Extra Absorb", "33F, Mother of 2, Tier 2 Lucknow"),
          v("My MIL says diaper for daytime is barbaad. So we use cloth at home, diaper for outings and night.", "Reddit · r/IndianParenting", "31F, Mother of 2, Joint family, Patna"),
          v("Lovingle? My kirana wala had it once. Looked okay but I didn't risk it — child is sensitive.", "Instagram comment · @desimomspeaks", "32F, Mother of 2, Allahabad"),
          v("Festive sale — bought a jumbo ₹999 pack. Per piece comes to ₹7. That's value.", "Flipkart · MamyPoko Extra Absorb Jumbo", "34F, Mother of 2, Tier 2 Indore"),
        ],
      },
      {
        name: "The Working Metro Mother",
        lifestage: "7_to_11m", family_structure: "nuclear", mother_type: "first_time",
        segment: "premium",
        demographic: "31F, First-time mother of 9-month-old, Nuclear with nanny, Mumbai",
        channel_posture: "Online only; subscribe-and-save", price_posture: "Time > money; premium without hesitation",
        style_preference: "pant_disposable",
        signature_behaviours: ["Subscribe-save on Amazon for primary brand", "Pant-style only — no time for tape", "Nanny does the changes; brief on which brand and where"],
        triggers: ["Daycare days needing leak-proof 8-hour pant", "Conference travel → trust + portability", "Skin-rash → instant premium upgrade"],
        pain_points: ["Subscription packs sometimes off-stock", "Nanny mismatches brands when she runs out"],
        unmet_needs: ["Office-bag-friendly travel pack", "Built-in wetness indicator (less guesswork for nanny)"],
        barrier_to_lovingle: "Brand prestige + nanny's preference for what she knows (MNC)",
        data_points: 423,
        verbatims: [
          v("I'm on subscribe-and-save for Pampers Premium. I don't have time to think about diapers — they arrive monthly. Done.", "Amazon.in · Pampers Premium Care", "31F, First-time mother of 9-month-old, Mumbai"),
          v("Daycare needs a diaper that can hold 8 hours. Tested 3 brands. Pampers Premium and MamyPoko Extra Absorb only.", "Reddit · r/MumbaiMoms", "30F, First-time mother of 10-month-old, Mumbai"),
          v("My nanny grabs MamyPoko when she runs out — she doesn't even check the brand I bought. So I keep both on hand.", "Instagram · @workingmom_mumbai", "32F, First-time mother of 11-month-old, Mumbai"),
          v("I'd never try a brand my paediatrician hasn't heard of. Not at this premium price. Risk is not worth it.", "Quora · best baby diapers", "31F, First-time mother of 8-month-old, Mumbai"),
          v("Travel pack matters more than people think. I need 10 in my office bag, not 30.", "Amazon.in · Pampers Premium Care", "31F, First-time mother of 9-month-old, Bandra Mumbai"),
        ],
      },
      {
        name: "The Tier-2 Joint-Family Mother",
        lifestage: "1_to_2y", family_structure: "joint", mother_type: "first_time",
        segment: "mass",
        demographic: "26F, First-time mother of 15-month-old, Joint family with grandparents, Tier 2 Varanasi",
        channel_posture: "Kirana primary + occasional Flipkart on family member's account", price_posture: "Tight; grandparents fund big purchases",
        style_preference: "tape_disposable",
        signature_behaviours: ["Buys laddi twin-packs from kirana 2-3x a week", "Grandmother decides bulk buys", "Influenced by sister-in-law in the same household"],
        triggers: ["Grandmother's recommendation", "Sister-in-law's switch", "Doctor visit recommendation"],
        pain_points: ["Grandparents resist diaper for daytime", "Cost vs household total spend"],
        unmet_needs: ["Family-trusted Indian brand at laddi price", "Doctor-endorsed safety messaging in vernacular"],
        barrier_to_lovingle: "Family inertia — grandparents already trust MamyPoko or Pampers from the elder cousin",
        data_points: 356,
        verbatims: [
          v("Saas-maa decides what we buy in bulk. She says MamyPoko since my jethani used it for her son.", "Reddit · r/IndianParenting (Hindi)", "26F, First-time mother of 15-month-old, Varanasi"),
          v("Kirana wala gives me a 2-piece laddi when I'm short. ₹38. Pampers laddi is ₹45 — too much.", "WhatsApp public group (sanitised)", "27F, First-time mother of 16-month-old, Tier 2 Allahabad"),
          v("Dadaji says cloth is best for the day. We compromise — diaper at night, cloth in afternoon nap.", "Facebook · Indian moms group", "26F, First-time mother of 14-month-old, Patna"),
          v("Doctor said the rash on baby was from staying in same diaper too long. Now I change every 3 hours — costs more.", "BabyChakra forum (Hindi)", "27F, First-time mother of 17-month-old, Varanasi"),
          v("Flipkart bulk pack — bhaiya orders for me from his account. I don't have my own.", "Flipkart · MamyPoko Standard", "26F, First-time mother of 15-month-old, Varanasi"),
        ],
      },
      {
        name: "The Expecting Shortlister",
        lifestage: "expecting_3rd_tri", family_structure: "nuclear", mother_type: "first_time",
        segment: "mid_premium",
        demographic: "29F, 3rd-trimester first-time expecting mother, Nuclear, Tier 1 Ahmedabad",
        channel_posture: "Research-heavy: Instagram + Reddit + YouTube reviews", price_posture: "Still flexible; pre-purchase mode",
        style_preference: "tape_disposable (planning)",
        signature_behaviours: ["Watches haul/review videos weekly", "Joins 'expecting mothers' groups", "Influenced by hospital kit & gynaec recommendations", "Saves Amazon wishlist for after-delivery"],
        triggers: ["Baby shower gifts", "Gynaecologist recommendation", "Influencer 'newborn essentials' video"],
        pain_points: ["Overwhelm — which brand for size 1?", "Stockpiling anxiety — how many to buy"],
        unmet_needs: ["Honest newborn-pack reviews from real Indian parents", "Sample/trial packs before commitment"],
        barrier_to_lovingle: "Lovingle is not in the 'newborn essentials' content circuit — invisible to expecting mothers",
        data_points: 289,
        verbatims: [
          v("32 weeks. Watching every diaper review video. My gyn said start with newborn size 1 — small pack first.", "YouTube comment · Diaper haul India", "29F, 3rd-trimester, first-time, Ahmedabad"),
          v("Influencer said don't buy more than 1 pack newborn — baby grows fast. So I'm starting with size 1 trial.", "Instagram comment · @indianmommyguide", "30F, 3rd-trimester, Tier 1 Chandigarh"),
          v("Hospital bag list — Pampers newborn or Huggies. That's what my friend used. Will decide closer to delivery.", "Reddit · r/IndianBabies", "28F, 3rd-trimester, Tier 1 Coimbatore"),
          v("Baby shower mein log Pampers gift karte hain. So I have 100 newborn already!", "Facebook · expecting moms group", "29F, 3rd-trimester, Ahmedabad"),
          v("Looked at FirstCry's 'first-month checklist' — Pampers and MamyPoko are featured. No mention of any Indian brand for newborn.", "FirstCry review · Pampers Premium Care", "30F, 3rd-trimester, Tier 1 Surat"),
        ],
      },
      {
        name: "The Budget-Conscious RSPL-Adjacent Mother",
        lifestage: "3_to_6m", family_structure: "nuclear", mother_type: "second_time",
        segment: "mass",
        demographic: "30F, Mother of 5-month-old + 4y, Nuclear, Tier 2 Bhopal",
        channel_posture: "Kirana + Flipkart bulk for value packs", price_posture: "Per-piece optimiser; buys Ghadi already",
        style_preference: "tape_disposable",
        signature_behaviours: ["Already an RSPL household (Ghadi detergent)", "Compares per-piece cost across brands", "Open to trying Indian challenger brands"],
        triggers: ["Per-piece price drop", "RSPL family trust (Ghadi reliable, why not Lovingle)", "Friend recommendation"],
        pain_points: ["MamyPoko Standard quality 'just okay'", "Price creeps up; subscribe & save sometimes ends"],
        unmet_needs: ["A reliable mid-tier Indian brand at ₹6-7 per piece", "Pack-size flexibility (₹99 trial → ₹399 monthly)"],
        barrier_to_lovingle: "Awareness — has not seen Lovingle in her kirana repertoire yet",
        data_points: 398,
        verbatims: [
          v("MamyPoko Standard does the job, just about. At ₹8 per piece I want a bit more — but Pampers is too costly.", "Flipkart · MamyPoko Standard", "30F, Mother of 2, Tier 2 Bhopal"),
          v("Ghadi is in our house since forever. If RSPL makes diapers, why not? But I haven't seen them in any shop yet.", "Reddit · r/IndianParenting (Hindi)", "31F, Mother of 2, Tier 2 Raipur"),
          v("₹6.50 a diaper — that's my ceiling. Below that, any decent brand and I'll try.", "Amazon.in · MamyPoko Standard XL", "30F, Mother of 2, Tier 2 Jabalpur"),
          v("Tried a small Lovingle laddi from kirana last month — surprisingly okay. Will try a bigger pack next time.", "BabyChakra forum (Hindi)", "31F, Mother of 2, Tier 2 Indore"),
          v("Subscribe-save price went up by ₹50 this month. I'm reconsidering — kirana is back in play.", "Amazon review · MamyPoko Extra Absorb", "30F, Mother of 2, Tier 2 Bhopal"),
        ],
      },
      {
        name: "The Premium Aspirant Climber",
        lifestage: "7_to_11m", family_structure: "nuclear", mother_type: "first_time",
        segment: "mid_premium",
        demographic: "28F, First-time mother of 8-month-old, Nuclear, TC1 Jaipur, SEC B climbing",
        channel_posture: "Online discovery → Modern Trade purchase", price_posture: "Climbing the ladder — trading up by SKU not by brand",
        style_preference: "transitioning tape → pant",
        signature_behaviours: ["Started with MamyPoko Standard; moved to Extra Absorb at 6 months", "Researches each upgrade", "Discusses with peer group in office WhatsApp (sanitised)"],
        triggers: ["Baby grows: same brand, bigger pack", "Peer mother's premium switch", "Sale price drop on next-tier SKU"],
        pain_points: ["Premium tier feels 'aspirational not justified' yet", "Anxiety about being a 'cheap mother' in peer groups"],
        unmet_needs: ["A bridge SKU between MamyPoko Standard and Extra Absorb", "Social validation that mid-tier = good-enough mother"],
        barrier_to_lovingle: "Social signal — Lovingle isn't yet 'premium-coded' for the climber audience",
        data_points: 312,
        verbatims: [
          v("Started with MamyPoko Standard. Moved to Extra Absorb when baby crossed 6 months. That's the journey.", "Flipkart · MamyPoko Extra Absorb L", "28F, First-time mother of 8-month-old, TC1 Jaipur"),
          v("My friend uses Pampers Premium. I feel guilty using MamyPoko Standard. Am I being a cheap mother?", "Reddit · r/IndianParenting", "29F, First-time mother of 7-month-old, TC1 Lucknow"),
          v("Big Sale on Flipkart — Extra Absorb XL came down to ₹6.30/piece. Switched.", "Flipkart · MamyPoko Extra Absorb XL", "28F, First-time mother of 9-month-old, TC1 Surat"),
          v("Lovingle? Never tried. Doesn't feel premium enough for my baby's stage.", "Instagram comment · @indianmoms_jaipur", "29F, First-time mother of 8-month-old, TC1 Jaipur"),
          v("I'd try a ₹450 SKU between MamyPoko Standard and Extra Absorb. The jump from ₹350 to ₹550 is too much.", "Amazon.in · MamyPoko Extra Absorb", "28F, First-time mother of 10-month-old, TC1 Vadodara"),
        ],
      },
      {
        name: "The Father as Co-Decider",
        lifestage: "1_to_2y", family_structure: "nuclear", mother_type: "second_time (wife)",
        segment: "mid_premium",
        demographic: "34M, Father of 18-month-old + 5y, Nuclear, Metro Bangalore, NCCS A",
        channel_posture: "Online primary — Amazon & Blinkit", price_posture: "Convenience > price; willing to trade up",
        style_preference: "pant_disposable",
        signature_behaviours: ["Initiates Amazon orders", "Reads reviews on his phone during commute", "Picks up emergency laddi from Blinkit / Zepto"],
        triggers: ["Wife's frustration with current brand", "Late-night Blinkit emergency", "Recommendation from another dad in office"],
        pain_points: ["Doesn't know baby's size confidently", "Forgets to re-subscribe; runs out mid-week"],
        unmet_needs: ["Simpler size guidance on pack", "Quick-commerce-friendly pack sizes"],
        barrier_to_lovingle: "Has never been told to buy Lovingle — diapers are 'wife's call'",
        data_points: 234,
        verbatims: [
          v("I order the diapers, wife decides the brand. She switches every few months — I just type it into Amazon.", "Reddit · r/IndianFathers", "34M, Father of 18-month-old, Metro Bangalore"),
          v("11pm. Out of diapers. Blinkit had MamyPoko in 10 mins. Saved my night.", "Twitter/X", "33M, Father of 16-month-old, Metro Mumbai"),
          v("My size on Amazon shows L but I don't actually know if 18 months is L or XL. Wife handles this.", "Amazon.in · MamyPoko Extra Absorb L", "34M, Father of 18-month-old, Metro Bangalore"),
          v("Office buddy uses Pampers Premium. I switched last month. Honestly can't tell the difference but wife says baby is happier.", "Quora · Best diaper India 2025", "35M, Father of 20-month-old, Metro Hyderabad"),
          v("Subscribe & Save sometimes doesn't auto-ship. I keep forgetting until 8pm when wife asks 'where are the diapers'.", "Amazon.in · MamyPoko Extra Absorb", "34M, Father of 18-month-old, Metro Bangalore"),
        ],
      },
    ],
  },

  style_switch_journey: {
    switches: [
      {
        from_style: "cloth", to_style: "tape_disposable",
        trigger: "Newborn frequent-change reality — cloth laundry load becomes unsustainable",
        lifestage: "newborn_lt_3m",
        friction: ["Grandmother's 'cloth is best' belief", "Per-piece cost shock", "Disposal anxiety in flats with shared bins"],
        enabler: ["Hospital kit contained tape disposables", "Sleep deprivation tipping point", "Paediatrician 'use a disposable at night' permission"],
        data_points: 312,
        verbatims: [
          v("Hospital gave us 5 newborn diapers. After that we kept buying — cloth changes 14 times a day is impossible.", "BabyChakra forum", "26F, First-time mother of 3-week-old, Tier 1 Pune"),
          v("MIL wanted only cloth. After 2 nights of zero sleep I bought disposables online while she was asleep.", "Reddit · r/IndianParenting", "27F, First-time mother of 4-week-old, Joint family Patna"),
          v("Doctor said 'use disposable at night, cloth in day — that's the Indian compromise'. Changed everything.", "Instagram comment · @paediatrician_ind", "28F, First-time mother of 5-week-old, Tier 2 Lucknow"),
          v("We tried only cloth for 2 weeks. Baby got a horrible rash. Switched to Pampers newborn and the rash went in 3 days.", "Amazon.in · Pampers Premium Care Newborn", "26F, First-time mother, Tier 1 Indore"),
          v("Cost was the worry. But cloth means 8-10 changes a day plus laundry detergent plus heating water in winter. Disposable is actually cheaper if you count time.", "Quora · cloth vs disposable", "29F, First-time mother of 7-week-old, Metro Chennai"),
        ],
      },
      {
        from_style: "tape_disposable", to_style: "pant_disposable",
        trigger: "Baby starts crawling/wriggling (~6-9 months) — tape becomes a struggle to put on",
        lifestage: "7_to_11m",
        friction: ["Pant-style ₹2-3/piece costlier", "Removing soiled pant requires technique", "Some kiranas don't stock pant in newborn-toddler sizes"],
        enabler: ["Practical demonstration by another mother", "First pant-style sample in big packs", "Daycare 'pant only' requirement"],
        data_points: 487,
        verbatims: [
          v("From 7 months it became impossible to put a tape on. He wriggles like a fish. Switched to pant — life saver.", "Flipkart · MamyPoko Extra Absorb Pants M", "29F, First-time mother of 8-month-old, Metro Pune"),
          v("Pant is ₹2 more per piece. But the time saved is worth it — and fewer leaks.", "Amazon.in · Pampers All-Round Pants", "30F, Mother of 2, Tier 2 Kanpur"),
          v("Daycare said only pant-style. So we switched at 6 months. Now we don't go back even for sleep.", "Reddit · r/MumbaiMoms", "31F, First-time mother of 7-month-old, Metro Mumbai"),
          v("First tried MamyPoko Standard Pants — works fine. Didn't need premium pants for the transition.", "Flipkart · MamyPoko Standard Pants", "27F, First-time mother of 9-month-old, TC1 Surat"),
          v("Pampers tape was great till 6 months. Now Pampers Pants — same brand, just the format change.", "Amazon.in · Pampers Premium Care Pants L", "30F, First-time mother of 10-month-old, Metro Delhi"),
        ],
      },
      {
        from_style: "tape_disposable", to_style: "cloth",
        trigger: "Cost cutting OR rash flare OR family pressure during 3-6m lull",
        lifestage: "3_to_6m",
        friction: ["Laundry resurgence", "Night-time leaks return", "Social signal of 'going backward'"],
        enabler: ["Working from home phase makes cloth viable", "Eco-guilt", "Family income shock"],
        data_points: 156,
        verbatims: [
          v("Tried only cloth for daytime for a month. Cost saved was ₹2000. But night was still disposable.", "Reddit · r/IndianParenting", "30F, First-time mother of 5-month-old, Tier 2 Coimbatore"),
          v("Baby got rash on the cheap brand we used. Doctor said back to cloth for 2 weeks to heal. So we reversed.", "BabyChakra forum", "28F, First-time mother of 4-month-old, Joint family Tier 2 Patna"),
          v("Eco-guilt hit me hard. Switched to cloth + disposable at night. Mixed system works.", "Instagram · @greenmom_india", "32F, Mother of 2, Tier 1 Bangalore"),
        ],
      },
      {
        from_style: "pant_disposable", to_style: "pant_disposable_other_brand",
        trigger: "Repeat leak or rash with current pant — direct switch within same format",
        lifestage: "1_to_2y",
        friction: ["Sunk-cost on existing stock", "Trust-rebuild with new brand", "Sister/MIL recommendation pull"],
        enabler: ["Big sale on alternate brand", "Online review that matches her exact pain", "Doctor recommendation"],
        data_points: 421,
        verbatims: [
          v("Pampers leaked 2 nights in a row at 14 months. Switched to MamyPoko Extra Absorb. No leaks since.", "Flipkart · MamyPoko Extra Absorb Pants XL", "30F, Mother of 2, Tier 2 Lucknow"),
          v("Rash kept coming back on Huggies. Mother said try MamyPoko. Switched. Rash gone in 4 days.", "Amazon.in · MamyPoko Extra Absorb", "27F, First-time mother of 15-month-old, TC1 Jaipur"),
          v("Big Billion Day — Pampers Premium was 35% off. Switched from MamyPoko just for the sale. Now permanent.", "Flipkart · Pampers Premium Care Pants L", "29F, Mother of 2, Metro Hyderabad"),
          v("Daughter would not wear MamyPoko anymore — she said it was uncomfortable. Switched to Pampers, no complaints.", "BabyChakra forum", "33F, Mother of 2, Metro Delhi"),
          v("Tried Lovingle when MamyPoko was out of stock. Surprisingly okay. Will buy again at the right price.", "Flipkart · Lovingle Premium Pant", "28F, First-time mother of 18-month-old, Tier 2 Kanpur"),
        ],
      },
      {
        from_style: "pant_disposable", to_style: "underwear (potty trained)",
        trigger: "Pre-school enrollment forces potty training (~24-30 months)",
        lifestage: "2_to_3y",
        friction: ["Night-time accidents continue 6+ months past day training", "Daycare not always supportive", "Travel days regress"],
        enabler: ["Pre-school readiness deadline", "Peer-mother solidarity in same age cohort", "'Training pants' as bridge"],
        data_points: 198,
        verbatims: [
          v("Pre-school admission said 'must be potty trained' — gave us a hard deadline. Started potty training at 24 months.", "Reddit · r/IndianParenting", "32F, Mother of 2, Metro Delhi"),
          v("Day trained at 26 months. Night diaper continued till 32 months. Two different journeys.", "BabyChakra forum", "30F, Mother of 2, TC1 Coimbatore"),
          v("Used training pants (Huggies Pull-Ups equivalent) for 6 months as bridge. Worth it.", "Amazon.in · Huggies Wonder Pants", "31F, Mother of 2, Metro Bangalore"),
        ],
      },
      {
        from_style: "any_disposable", to_style: "reusable_cloth_modern",
        trigger: "Eco-awareness + family income shock + community of practice",
        lifestage: "any",
        friction: ["Upfront cost ₹3000-5000", "Drying time (esp. monsoon)", "Hygiene anxiety on reuse"],
        enabler: ["Influencer endorsement", "Community group of cloth-diaper mothers", "Inserts work like disposable"],
        data_points: 87,
        verbatims: [
          v("Modern cloth diapers with disposable inserts — best of both. ₹4000 once vs ₹3000/month forever.", "Instagram · @clothmom_india", "31F, First-time mother of 9-month-old, Tier 1 Pune"),
          v("Started during 2nd lockdown. Saved a lot. But monsoon — three days to dry. Back to disposable for 2 months.", "Reddit · r/IndianMomsWhoMatter", "30F, Mother of 2, Metro Bangalore"),
          v("Mother-in-law refused to handle reusables. So I use them only when I'm with baby. Mixed system.", "Facebook · Indian Cloth Diaper Moms", "32F, First-time mother of 11-month-old, Joint family Tier 1 Chandigarh"),
        ],
      },
    ],
    interaction_notes: [
      "The TAPE→PANT switch around 6-9 months is the single largest behavioural movement in the journey — for most households it's permanent.",
      "Reverse switches (back to cloth or to a cheaper brand) happen during 3-6m lulls or rash episodes, but rarely persist beyond 3 weeks.",
      "Within-pant brand switches are the dominant brand-loyalty contest — Pampers ↔ MamyPoko is where Lovingle's competitive battle actually plays.",
      "Mixed-system households (cloth at home + disposable for outings/night) are far more common in joint families and Tier 2/3 than nuclear/metro.",
    ],
  },

  decision_journey_stages: {
    stages: [
      {
        lifestage: "expecting_3rd_tri", age_band: "3rd trimester",
        who_buys: "Mother (with partner present for some purchases)",
        who_decides: "Mother — primary; gynaecologist + 1-2 close friends second",
        support_system_role: "MIL/grandmother gives directional input but doesn't decide first brand",
        top_influencer: "Gynaecologist + maternity hospital kit",
        trust_hierarchy: ["Gynaecologist", "Hospital kit contents", "Mommy influencer", "Online reviews (Amazon/Flipkart)", "Baby shower gifts", "MIL recommendation", "Husband's preference"],
        data_points: 312,
        verbatims: [
          v("My gyn said start with Pampers newborn — and that's what I bought. Didn't second-guess.", "Reddit · r/IndianBabies", "29F, 3rd-trimester, Tier 1 Ahmedabad"),
          v("Hospital kit had a 5-pack of Pampers. That became my anchor.", "BabyChakra forum", "30F, 3rd-trimester, Metro Chennai"),
          v("Followed 3 mommy influencers. Watched 4 'newborn essentials' videos. Final list — Pampers + Mamy Poko.", "YouTube comment", "28F, 3rd-trimester, Tier 1 Coimbatore"),
        ],
      },
      {
        lifestage: "newborn_lt_3m", age_band: "<3 months",
        who_buys: "Mother (mostly online) — emergency runs by father",
        who_decides: "Mother (stress-tested by first rash or first leak)",
        support_system_role: "Grandmother active in nuclear-with-grandparent-visits and joint families; emotional support more than purchase",
        top_influencer: "Paediatrician — first visit is decisive for brand legitimacy",
        trust_hierarchy: ["Paediatrician", "Real-time WhatsApp friend group", "Amazon reviews", "Mommy influencer", "Husband / family"],
        data_points: 487,
        verbatims: [
          v("First rash and I called my paediatrician at midnight. He said try a softer brand. Switched the next morning.", "Instagram comment", "27F, First-time mother of 5-week-old, Metro Pune"),
          v("My WhatsApp group of first-time moms shared which brand worked. That's where I got Pampers.", "Reddit · r/BabyBumpsIndia", "26F, First-time mother of 6-week-old, Tier 1 Bangalore"),
          v("Husband does the Amazon order, but I tell him what brand. He doesn't read reviews.", "BabyChakra forum", "28F, First-time mother of 4-week-old, Metro Delhi"),
        ],
      },
      {
        lifestage: "3_to_6m", age_band: "3–6 months",
        who_buys: "Mother online + Father emergency Blinkit/Zepto",
        who_decides: "Mother — confidence growing; first proper brand switch happens here",
        support_system_role: "Nanny (in nuclear urban) starts asserting preference; MIL recedes",
        top_influencer: "Mother's own experience now > external voices",
        trust_hierarchy: ["Own experience", "Nanny preference", "Peer mother group", "Paediatrician (for rash issues)", "Mommy influencer", "Promo / sale price"],
        data_points: 398,
        verbatims: [
          v("By 4 months I knew what worked. Stopped reading reviews. Just kept ordering Pampers.", "Amazon.in · Pampers Premium Care", "29F, First-time mother of 5-month-old, Metro Mumbai"),
          v("Nanny said 'this brand smell bad' and refused to use it. I had to switch. She's with baby 8 hours a day.", "Reddit · r/MumbaiMoms", "31F, First-time mother of 4-month-old, Metro Mumbai"),
          v("My friend group switched together — we discovered MamyPoko Extra Absorb during a Flipkart sale.", "Instagram comment", "28F, First-time mother of 6-month-old, TC1 Pune"),
        ],
      },
      {
        lifestage: "7_to_11m", age_band: "7–11 months",
        who_buys: "Mother online primary; Father runs emergencies; daycare may dictate brand",
        who_decides: "Mother + daycare (if applicable)",
        support_system_role: "Daycare can override brand preference (especially metro daycares with 'we recommend X' lists)",
        top_influencer: "Daycare staff + peer mother network in same daycare",
        trust_hierarchy: ["Daycare 'recommended' list", "Own experience", "Peer daycare-mother", "Paediatrician", "Online reviews", "MIL"],
        data_points: 423,
        verbatims: [
          v("Daycare gave us a list of 3 brands they prefer. We picked Pampers from that list. Stopped researching.", "Reddit · r/MumbaiMoms", "30F, First-time mother of 9-month-old, Metro Mumbai"),
          v("Other moms in daycare asked which diaper. We compared notes. Switched together within the same month.", "BabyChakra forum", "31F, First-time mother of 10-month-old, Metro Bangalore"),
          v("Daycare didn't allow tape — must be pant. So we shifted to pant + a brand the daycare staff trusted.", "Amazon.in · Pampers Premium Care Pants", "32F, First-time mother of 8-month-old, Metro Pune"),
        ],
      },
      {
        lifestage: "1_to_2y", age_band: "1–2 years",
        who_buys: "Mother bulk online; Father quick-commerce backup; kirana for laddi top-ups",
        who_decides: "Mother — but increasingly co-decided with toddler (preferences emerge!) + father in metro",
        support_system_role: "Sister-in-law in joint families becomes peer influencer; grandparents largely accept by now",
        top_influencer: "Toddler's own comfort signals + 'value' calculus",
        trust_hierarchy: ["Toddler's tolerance", "Own track record", "Sale price / value per piece", "Peer mother", "Online reviews"],
        data_points: 487,
        verbatims: [
          v("My toddler now actively resists certain diapers — she pulls them off. So we go with what she'll keep on.", "Reddit · r/IndianParenting", "32F, Mother of 2, Tier 2 Kanpur"),
          v("Per-piece price decides at 18 months. Brand matters less when she's an active toddler.", "Flipkart · MamyPoko Extra Absorb XL", "33F, Mother of 2, Tier 2 Lucknow"),
          v("Husband orders during sales. He compares brands in his head — he's become the discount-hunter.", "Amazon.in · Pampers Premium Care", "31F, Mother of 18-month-old, Metro Hyderabad"),
        ],
      },
      {
        lifestage: "2_to_3y", age_band: "2–3 years",
        who_buys: "Mother + daycare/pre-school staff in transition phase",
        who_decides: "Mother + pre-school readiness pressure",
        support_system_role: "Pre-school becomes a stakeholder — 'must be potty trained by X date'",
        top_influencer: "Pre-school deadline + paediatrician for night-time concerns",
        trust_hierarchy: ["Pre-school timeline", "Paediatrician", "Own experience", "Peer mother (same pre-school)", "Cost"],
        data_points: 256,
        verbatims: [
          v("Pre-school admission deadline forced potty training. We dropped daytime diaper at 26 months.", "Reddit · r/IndianParenting", "32F, Mother of 2, Metro Delhi"),
          v("Night diaper continued. Pre-school doesn't see night. But we transitioned to training pants for daytime.", "BabyChakra forum", "31F, Mother of 2-year-old, Metro Bangalore"),
          v("Doctor said night-time bladder control comes by 32-36 months. So we kept night-pant going.", "Amazon.in · Huggies Wonder Pants L", "30F, Mother of 2, TC1 Coimbatore"),
        ],
      },
    ],
    cross_stage_notes: [
      "The buyer-vs-decider split is genuinely fluid — fathers buy more than they decide; mothers decide more than they buy.",
      "The support system's role peaks in the first 3-6 months then recedes — grandmother is loudest in expecting/newborn, near-silent by 1-2y.",
      "Daycare emerges as a decisive new stakeholder from 7-11m onwards in metro nuclear households.",
      "Pre-school deadline (~24m) is the strongest external forcing function in the entire decision journey.",
    ],
  },

  diaper_avoidance: {
    moments: [
      {
        moment: "Home daytime, baby in mother's lap — cloth chosen",
        alternative_chosen: "Cloth nappy + frequent changes",
        why_avoided: "Cost optimisation + grandmother's belief 'skin needs to breathe' + low-leak-risk environment",
        lifestage: "newborn_lt_3m through 3_to_6m",
        typical_segment: "mass + mid-premium joint families",
        data_points: 287,
        verbatims: [
          v("At home, on my lap — cloth works. Diaper only when we step out or at night.", "BabyChakra forum (Hindi)", "27F, First-time mother of 4-month-old, Joint family Tier 2 Patna"),
          v("Saas says skin needs to breathe. So daytime is cloth, night is diaper. That's the compromise.", "Reddit · r/IndianParenting", "26F, First-time mother of 5-month-old, Joint family Tier 2 Allahabad"),
          v("Why pay ₹35 a piece when I can change a cloth in 30 seconds and wash it?", "Instagram comment · @desimomspeaks", "28F, Mother of 2, Tier 2 Bhopal"),
        ],
      },
      {
        moment: "Hot summer afternoons — bare-bottom time",
        alternative_chosen: "Nothing — bare bottom on a waterproof mat",
        why_avoided: "Rash prevention + heat + cultural practice ('khulla rakho')",
        lifestage: "newborn_lt_3m through 1_to_2y",
        typical_segment: "all segments — strongest in joint families",
        data_points: 312,
        verbatims: [
          v("In summer afternoons we keep baby khulla on a chatai. No diaper. Cools the skin, no rash.", "Reddit · r/IndianParenting (Hindi)", "30F, Mother of 2, Tier 2 Jaipur"),
          v("My paediatrician said 2 hours bare-bottom every day is good for skin. We do it post-bath.", "Instagram · @paediatrician_ind", "28F, First-time mother of 6-month-old, Metro Bangalore"),
          v("Diaper is for outings and night. The afternoon nap is bare-bottom on a old saree. Indian way.", "BabyChakra forum (Hindi)", "32F, Mother of 2, Joint family Tier 2 Lucknow"),
        ],
      },
      {
        moment: "Potty training transition phase — undies adopted early",
        alternative_chosen: "Training pants or padded underwear",
        why_avoided: "Active push to potty train; diaper would 'confuse the child'",
        lifestage: "2_to_3y",
        typical_segment: "all — strongest in metro pre-school cohort",
        data_points: 198,
        verbatims: [
          v("Pre-school deadline. Doctor said no daytime diaper from 24 months. Just accept the accidents.", "Reddit · r/IndianParenting", "32F, Mother of 2, Metro Delhi"),
          v("Used training pants for 2 months as bridge. Then plain undies. Diaper only at night.", "BabyChakra forum", "30F, Mother of 27-month-old, TC1 Pune"),
          v("My MIL said put diaper, save the floor. I said no — she's old enough to learn. The accidents are part of it.", "Instagram comment", "31F, Mother of 28-month-old, Metro Hyderabad"),
        ],
      },
      {
        moment: "Festival days / family gatherings — sustained bare-or-cloth display",
        alternative_chosen: "Cloth dhoti or ceremonial cloth nappy",
        why_avoided: "Cultural — diaper feels 'modern' and 'not for samskara moments'",
        lifestage: "newborn_lt_3m through 1_to_2y",
        typical_segment: "all — strongest in joint families across all segments",
        data_points: 134,
        verbatims: [
          v("Annaprashan (rice-eating ceremony) — we used a small cloth dhoti, not a diaper. Tradition.", "Facebook · Indian moms group", "29F, First-time mother of 6-month-old, Joint family Tier 2 Kolkata"),
          v("For mundan ceremony I used the cloth my mother had used for me. No diaper.", "BabyChakra forum", "30F, First-time mother of 12-month-old, Joint family Tier 1 Chennai"),
          v("Bhai-dooj — relatives coming. MIL said put cloth, not diaper. We agreed.", "Reddit · r/IndianParenting", "27F, First-time mother of 9-month-old, Joint family Tier 2 Patna"),
        ],
      },
      {
        moment: "Travel days where disposal is hard",
        alternative_chosen: "Limited diaper use + bare bottom + cloth backup",
        why_avoided: "No bin access (long train journey, remote travel)",
        lifestage: "all",
        typical_segment: "all",
        data_points: 167,
        verbatims: [
          v("Train journey to my parents'. No bin between stations. I rationed diapers — used 2 for the 12-hour trip.", "Reddit · r/IndianParenting", "29F, Mother of 14-month-old, Tier 2 Indore"),
          v("Trekking trip with toddler — used 4 diapers for the whole day. Cloth for the rest. Carried it back home in a sealed bag.", "Instagram · @travellingmom_india", "30F, Mother of 2-year-old, Metro Bangalore"),
        ],
      },
      {
        moment: "Heavy rash flare — disposable causes the problem",
        alternative_chosen: "Cloth + medicated cream + bare-bottom periods",
        why_avoided: "Specific diaper brand triggered rash; cloth chosen as healing phase",
        lifestage: "any",
        typical_segment: "all",
        data_points: 145,
        verbatims: [
          v("Bad rash. Doctor said no diaper for 4 days. We managed with cloth and bare bottom — rash gone, then switched brand.", "BabyChakra forum", "28F, First-time mother of 5-month-old, Metro Mumbai"),
          v("Switched to cloth completely for a week. Bought new brand of diaper after that. Started fresh.", "Reddit · r/IndianParenting", "30F, Mother of 8-month-old, Tier 2 Bhopal"),
        ],
      },
    ],
    summary: [
      "Diaper avoidance is NOT diaper rejection — it's contextual non-use that co-exists with diaper purchase. Most households are mixed-system.",
      "Home-daytime, summer afternoons, potty-training transition, festival days, travel constraints and rash recovery are the six dominant avoidance contexts.",
      "Joint families avoid more than nuclear families; Tier 2/3 avoid more than metro; mass segment avoids more than premium.",
      "Avoidance moments are also OPPORTUNITY moments — a 'rash-recovery-friendly' positioning could win cloth-leaning households for Lovingle.",
    ],
  },

  consumer_language: {
    terms: [
      {
        term: "Soft / Mulayam",
        vernacular_variants: ["mulayam (Hindi)", "naram (Urdu/Hindi)", "softu (Tamil + English code-switch)", "soft cottony"],
        emotional_meaning: "Maternal reassurance — 'I'm being gentle to my baby'",
        functional_meaning: "Inner-layer fabric feels like cotton, not plastic-y",
        pack_implication: "The word 'SOFT' on pack carries more weight than 'comfort'; vernacular 'मुलायम' could be added to multilingual SKUs",
        comms_implication: "Lead claim for skin-anxiety segments — 'Mulayam jaisa maa ka pyaar'-type framing tested in joint-family Tier 2",
        verbatims: [
          v("Pampers ka touch mulayam hai — bachhe ko irritation nahi hota.", "Amazon.in · Pampers Premium Care", "28F, First-time mother of 6-month-old, Tier 2 Lucknow"),
          v("I want a SOFT diaper — that's it. The rest I figure out.", "BabyChakra forum", "30F, First-time mother of 4-month-old, Metro Bangalore"),
          v("MamyPoko inner layer feels naram. Pampers also. Cheap brands ka plastic feel hota hai.", "Reddit · r/IndianParenting", "29F, Mother of 2, Tier 2 Kanpur"),
        ],
      },
      {
        term: "Dry / Sukha",
        vernacular_variants: ["sukha (Hindi)", "khushk (Urdu)", "ulartha (Tamil)", "stays dry"],
        emotional_meaning: "Peace of mind — 'I'm not failing my baby'",
        functional_meaning: "Surface stays dry to touch even after several hours; baby doesn't feel wet",
        pack_implication: "'STAYS DRY 12 HOURS' / 'सूखा 12 घंटे' is a tested winning claim",
        comms_implication: "Pair with night-sleep imagery; works hardest with 7-11m and 1-2y mothers (overnight pain)",
        verbatims: [
          v("Sukha rehna chahiye sabse important hai. Geela hua to baby uthegi.", "Amazon.in · MamyPoko Extra Absorb", "29F, First-time mother of 8-month-old, Tier 2 Jaipur"),
          v("Pampers Premium stays dry the whole night. I checked at 3am — still dry. Worth the price.", "Flipkart · Pampers Premium Care", "31F, First-time mother of 9-month-old, Metro Pune"),
          v("Cheap diaper khushk nahi rehta. 4 ghante mein hi baby ka kapda gila ho jata hai.", "BabyChakra forum (Hindi)", "27F, First-time mother of 5-month-old, Tier 2 Bhopal"),
        ],
      },
      {
        term: "Rash-free / Daane nahi",
        vernacular_variants: ["daane nahi (Hindi)", "ratti nahi (Punjabi)", "rashes-free", "skin friendly"],
        emotional_meaning: "Guilt avoidance + good-mother validation",
        functional_meaning: "Skin stays clean and rash-free over weeks of consistent use",
        pack_implication: "'RASH FREE' carries more weight than 'dermatologically tested' for mass/mid-premium",
        comms_implication: "FOR LOVINGLE — this is THE category battlefield word. The barrier RSPL must intervene on.",
        verbatims: [
          v("Lovingle? Pata nahi daane aayenge ya nahi. MamyPoko safe lagti hai.", "Reddit · r/IndianParenting (Hindi)", "28F, First-time mother of 7-month-old, Tier 2 Kanpur"),
          v("Pampers ne mere bachhe ko rash nahi diya kabhi. Brand loyal hoon.", "Amazon.in · Pampers Premium Care", "29F, Mother of 2, Tier 1 Indore"),
          v("Daane aa gaye Huggies se. Switch kar diya MamyPoko. 4 din mein theek.", "Flipkart · MamyPoko Extra Absorb", "30F, First-time mother of 6-month-old, Tier 2 Bhopal"),
          v("My baby has sensitive skin. Only Pampers Premium Care doesn't give rashes. We don't experiment.", "Reddit · r/IndianBabies", "32F, First-time mother of 10-month-old, Metro Hyderabad"),
          v("Doctor said try Indian brand for daytime. But rash-free guarantee chahiye. Tab try karungi.", "BabyChakra forum (Hindi)", "27F, First-time mother of 5-month-old, Tier 2 Patna"),
        ],
      },
      {
        term: "Leak-proof / Leak nahi karta",
        vernacular_variants: ["leak nahi karta", "no leakage", "spillage-free", "guaranteed dry"],
        emotional_meaning: "Sleep + clean linen + 'reliable mother' identity",
        functional_meaning: "Holds liquid even at high volume; gusset/fit doesn't fail at night or during long stretches",
        pack_implication: "'NO LEAK' guarantee — backed by visual of full diaper holding its shape",
        comms_implication: "Critical for overnight + travel + daycare comms; pair with specific hour-claim ('12-hour leak guarantee')",
        verbatims: [
          v("Pampers Premium 12 hours no leak. MamyPoko Standard at 6 hours starts leaking. That's the difference.", "Amazon.in · Pampers Premium Care", "30F, First-time mother of 9-month-old, Metro Mumbai"),
          v("Night leak = bedsheet change + bath. 11pm. That's why I pay for premium.", "Reddit · r/IndianParenting", "31F, Mother of 2, TC1 Pune"),
          v("Travel ke time leak-proof zaruri hai. Train mein change karna mushkil hota hai.", "BabyChakra forum (Hindi)", "29F, Mother of 14-month-old, Tier 2 Lucknow"),
        ],
      },
      {
        term: "Overnight / Raat bhar",
        vernacular_variants: ["raat bhar (Hindi)", "puri raat", "full night", "12 hour"],
        emotional_meaning: "Parent's sleep / unbroken night",
        functional_meaning: "Single diaper holds from 9pm to 7am without leak or full saturation",
        pack_implication: "Dedicated 'overnight' SKU at premium tier is a proven format — Lovingle could own a ₹399 overnight pant",
        comms_implication: "Overnight is the single most premium-justifying use-case; ₹3 more per piece is acceptable for overnight",
        verbatims: [
          v("Raat ke liye Pampers premium. Din ke liye MamyPoko Standard. Cost bachata hai.", "Reddit · r/IndianParenting", "31F, Mother of 2, Tier 2 Lucknow"),
          v("Overnight diaper — that's the only place I won't compromise. Even ₹10 extra per piece is fine.", "Amazon.in · Pampers Premium Care", "30F, First-time mother of 11-month-old, Metro Bangalore"),
          v("MamyPoko 'All Night Absorb' specifically for night. Daytime alag brand. Yeh humara system hai.", "Flipkart · MamyPoko All Night Absorb", "32F, Mother of 2, TC1 Jaipur"),
        ],
      },
      {
        term: "Value-for-money / Paise vasool",
        vernacular_variants: ["paise vasool", "value for money", "worth it", "per piece cost"],
        emotional_meaning: "Smart-mother identity, not cheap-mother",
        functional_meaning: "Quality vs price per piece is justified — usually calculated explicitly by the mother",
        pack_implication: "Per-piece cost on pack ('₹6.50 PER DIAPER') resonates strongly in mass + mid-premium tier",
        comms_implication: "'Premium quality, value price' positioning is Lovingle's most natural territory",
        verbatims: [
          v("Per piece ₹6 ka diaper chahiye. Aur quality acchi. Yeh combination dhundh rahi hoon.", "Reddit · r/IndianParenting (Hindi)", "29F, First-time mother of 7-month-old, Tier 2 Bhopal"),
          v("MamyPoko Extra Absorb at ₹7/piece is paise vasool. Pampers at ₹12 — premium but worth only at night.", "Amazon.in · MamyPoko Extra Absorb", "30F, Mother of 2, Tier 2 Kanpur"),
          v("Big sale day — buy at ₹5.50/piece for the month. Bulk pack worth it.", "Flipkart · MamyPoko Extra Absorb Jumbo", "31F, Mother of 18-month-old, Tier 2 Lucknow"),
        ],
      },
      {
        term: "Doctor-recommended / Doctor ne bola",
        vernacular_variants: ["doctor ne bola", "paediatrician approved", "DR ne kaha"],
        emotional_meaning: "Decision-anxiety relief — 'I'm not deciding alone'",
        functional_meaning: "Brand was specifically mentioned by paediatrician or hospital",
        pack_implication: "If Lovingle can claim 'paediatrician-approved' (with proof), it shortcuts the entire trust journey",
        comms_implication: "Doctor-endorsement is the single highest-trust pathway — DTC paediatrician influencer programmes are the right channel",
        verbatims: [
          v("Doctor ne bola Pampers — wahi le rahi hoon. Apne se decision nahi le sakti is age mein.", "BabyChakra forum (Hindi)", "26F, First-time mother of 3-week-old, Tier 1 Pune"),
          v("My paediatrician recommended MamyPoko Extra Absorb when my baby got a rash from Huggies. Wahi follow kar rahi hoon.", "Reddit · r/IndianParenting", "28F, First-time mother of 6-month-old, Tier 2 Kanpur"),
          v("Hospital kit mein Pampers tha. Doctor ne kaha continue karo. So we did.", "Amazon.in · Pampers Premium Care Newborn", "27F, First-time mother of 8-week-old, Metro Chennai"),
        ],
      },
    ],
  },
};
