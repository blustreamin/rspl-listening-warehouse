
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
};
