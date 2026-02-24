
// ANALYST-GRADE SEED PACK: ADULT DIAPERS (INDIA)
// Source: Market Norms & category heuristics for fallback/enrichment.

export interface SeedQuote {
    id: string;
    text: string;
    profile: "self_use" | "decider" | "caregiver" | "overall";
    context: string;
    pain_point: string;
}

export const INDIA_MARKET_QUOTES: SeedQuote[] = [
    // SELF USE - ACTIVE
    { id: "SEED_AD_001", text: "I can sit through a 3-hour wedding reception without panic now.", profile: "self_use", context: "Social Event", pain_point: "Social Anxiety" },
    { id: "SEED_AD_002", text: "On the train to Shirdi, toilets are dirty. This is my safety net.", profile: "self_use", context: "Travel", pain_point: "Hygiene/Access" },
    { id: "SEED_AD_003", text: "My son thinks I don't need it, but I wear it for my own peace of mind.", profile: "self_use", context: "Dignity", pain_point: "Stigma" },
    { id: "SEED_AD_004", text: "Pant-style is just like underwear, nobody notices under my saree.", profile: "self_use", context: "Discretion", pain_point: "Visibility" },
    { id: "SEED_AD_005", text: "I stop drinking water after 6 PM to save money on diapers.", profile: "self_use", context: "Cost Management", pain_point: "Cost" },
    { id: "SEED_AD_006", text: "During monsoon, drying cloth pads is impossible, so I switch to pants.", profile: "self_use", context: "Weather", pain_point: "Hygiene" },
    { id: "SEED_AD_007", text: "I only wear it when I go to the market, at home I manage.", profile: "self_use", context: "Occasion", pain_point: "Cost" },
    
    // CAREGIVER - BEDRIDDEN
    { id: "SEED_AD_010", text: "Changing sheets everyday was breaking my back. This saved us.", profile: "caregiver", context: "Physical Strain", pain_point: "Labor" },
    { id: "SEED_AD_011", text: "We use the expensive one only for night, cheap one for day.", profile: "caregiver", context: "Cost Optimization", pain_point: "Price" },
    { id: "SEED_AD_012", text: "The tape-style leakage from the side is a headache.", profile: "caregiver", context: "Product Failure", pain_point: "Leakage" },
    { id: "SEED_AD_013", text: "Bedsores reduced after we switched to the aloe-vera brand.", profile: "caregiver", context: "Medical Benefit", pain_point: "Skin Health" },
    { id: "SEED_AD_014", text: "We buy in bulk from the wholesale market, chemist is too costly.", profile: "caregiver", context: "Purchase Channel", pain_point: "Cost" },
    { id: "SEED_AD_015", text: "Home nurse insisted on this brand for better absorption.", profile: "caregiver", context: "Influencer", pain_point: "Trust" },

    // DECIDER - FAMILY
    { id: "SEED_AD_020", text: "Father refuses to wear it, says it is for babies.", profile: "decider", context: "Parental Resistance", pain_point: "Dignity" },
    { id: "SEED_AD_021", text: "₹40 a piece is heavy on our monthly budget.", profile: "decider", context: "Budgeting", pain_point: "Cost" },
    { id: "SEED_AD_022", text: "The smell in the room was embarrassing when guests came.", profile: "decider", context: "Social Shame", pain_point: "Odour" },
    { id: "SEED_AD_023", text: "It took 3 months to convince mom to try just one.", profile: "decider", context: "Adoption Barrier", pain_point: "Stigma" },
    
    // GENERAL / MARKET NORM
    { id: "SEED_AD_030", text: "Plastic feel causes sweating in this humid weather.", profile: "overall", context: "Climate", pain_point: "Comfort" },
    { id: "SEED_AD_031", text: "Disposing of it is a nightmare, neighbors watch.", profile: "overall", context: "Disposal", pain_point: "Stigma" },
    { id: "SEED_AD_032", text: "Amazon delivery comes in a brown box, so neighbors don't know.", profile: "overall", context: "Privacy", pain_point: "Stigma" }
];

export const ARCHETYPE_TEMPLATES = {
    users: [
        {
            profile_name: "The Night-Time Guardian",
            who_they_are: "Active senior using products only for sleep assurance.",
            trigger_event: "Waking up to wet sheets twice in a week.",
            first_experience: "Relief from sleep interruption, but complained of heat.",
            retention_intent: "High - Sleep is non-negotiable.",
            verbatims: ["I finally slept for 6 hours straight.", "Just for the night, I can afford it."]
        },
        {
            profile_name: "The Travel Pragmatist",
            who_they_are: "Users who wear only during transit (bus/train/flight).",
            trigger_event: "Upcoming pilgrimage or family visit.",
            first_experience: "Felt bulky but necessary for the 8-hour bus ride.",
            retention_intent: "Medium - Occasion based only.",
            verbatims: ["Train toilets are filthy, I prefer this.", "It's my travel insurance."]
        },
        {
            profile_name: "The Post-Op Recoverer",
            who_they_are: "Temporary usage following surgery or hospitalization.",
            trigger_event: "Hospital discharge kit recommendation.",
            first_experience: "Medical necessity, eager to stop.",
            retention_intent: "Low - Wants to exit category ASAP.",
            verbatims: ["Doctor said I need it for 2 weeks.", "Can't wait to be normal again."]
        },
        {
            profile_name: "The Dignity Keeper",
            who_they_are: "Socially active elder fearful of public accidents.",
            trigger_event: "Near-miss incident at a social function.",
            first_experience: "Pant-style offered discretion under clothes.",
            retention_intent: "High - Social confidence enabler.",
            verbatims: ["I can go to the temple without worry.", "Nobody knows I'm wearing it."]
        },
        {
            profile_name: "The Bedridden Manager",
            who_they_are: "Caregiver managing total incontinence for a parent.",
            trigger_event: "Caregiver burnout from laundry load.",
            first_experience: "Tape-style learning curve was steep.",
            retention_intent: "Critical - Cannot manage without it.",
            verbatims: ["It saved my back from washing sheets.", "We buy the bulk pack."]
        }
    ],
    non_users: [
        {
            profile_name: "The Denialist",
            who_they_are: "Refuses to accept incontinence as a permanent condition.",
            primary_barrier: "Psychological Stigma",
            verbatims: ["I am not a baby.", "I can control it if I try."]
        },
        {
            profile_name: "The Cost-Conscious Resister",
            who_they_are: "Cannot justify ₹1200/month expense.",
            primary_barrier: "Economic Priority",
            verbatims: ["We have other bills to pay.", "Cloth is free to wash."]
        },
        {
            profile_name: "The Cloth Loyalist",
            who_they_are: "Believes cloth is healthier/more breathable.",
            primary_barrier: "Product Trust / Hygiene Myth",
            verbatims: ["Plastic causes cancer/rashes.", "Cotton is pure."]
        },
        {
            profile_name: "The Low Awareness Elder",
            who_they_are: "Thinks diapers are only for hospitals.",
            primary_barrier: "Category Literacy",
            verbatims: ["Is it for walking people?", "I don't know where to buy."]
        },
        {
            profile_name: "The Disposal Worrier",
            who_they_are: "Live in areas without waste collection privacy.",
            primary_barrier: "Social Logistics",
            verbatims: ["Where will I throw it?", "Neighbors will see."]
        }
    ]
};

export const BRAND_SEED_LANDSCAPE = [
    { 
        brand: "Friends", 
        share_of_voice: { mentions: 45, share_pct: 40 },
        overall_sentiment: "POS",
        attribute_scale: [
            { attribute: "availability", score_0_5: 5, rationale: "Available in every chemist." },
            { attribute: "value", score_0_5: 4, rationale: "Good price point for daily use." },
            { attribute: "absorption", score_0_5: 4, rationale: "Reliable for overnight." }
        ],
        key_associations: ["Reliable", "Old", "Standard", "Chemist"],
        verbatims: ["Standard choice for years.", "Easy to find."]
    },
    { 
        brand: "Lifree", 
        share_of_voice: { mentions: 35, share_pct: 30 },
        overall_sentiment: "POS",
        attribute_scale: [
            { attribute: "comfort", score_0_5: 5, rationale: "Pant style is very soft." },
            { attribute: "absorption", score_0_5: 4, rationale: "Lasts all night." },
            { attribute: "fit", score_0_5: 5, rationale: "Fits like underwear." }
        ],
        key_associations: ["Soft", "Pant", "Japanese", "Premium"],
        verbatims: ["Much softer than others.", "Easy to pull up."]
    },
    { 
        brand: "Teddyy", 
        share_of_voice: { mentions: 10, share_pct: 10 },
        overall_sentiment: "MIX",
        attribute_scale: [
            { attribute: "price", score_0_5: 5, rationale: "Cheapest option." },
            { attribute: "leakage", score_0_5: 2, rationale: "Leaks if used too long." },
            { attribute: "value", score_0_5: 5, rationale: "Best for budget." }
        ],
        key_associations: ["Cheap", "Bulk", "Day-use"],
        verbatims: ["Good for day, not night.", "Price is right."]
    },
    { 
        brand: "KareIn", 
        share_of_voice: { mentions: 5, share_pct: 5 },
        overall_sentiment: "POS",
        attribute_scale: [
            { attribute: "value", score_0_5: 4, rationale: "Good balance of price/quality." },
            { attribute: "absorption", score_0_5: 3, rationale: "Decent for day use." }
        ],
        key_associations: ["Online", "Budget", "Adult Pads"],
        verbatims: ["Found on Amazon, good price.", "Soft enough."]
    },
    { 
        brand: "TENA", 
        share_of_voice: { mentions: 3, share_pct: 3 },
        overall_sentiment: "POS",
        attribute_scale: [
            { attribute: "comfort", score_0_5: 5, rationale: "Very high quality material." },
            { attribute: "price", score_0_5: 1, rationale: "Very expensive." }
        ],
        key_associations: ["Global", "Premium", "Hospital"],
        verbatims: ["Best quality but too costly.", "Hospital used this."]
    },
    { 
        brand: "Dignity", 
        share_of_voice: { mentions: 2, share_pct: 2 },
        overall_sentiment: "MIX",
        attribute_scale: [
            { attribute: "value", score_0_5: 4, rationale: "Legacy brand, widely available." },
            { attribute: "bulkiness", score_0_5: 2, rationale: "Feels thick." }
        ],
        key_associations: ["Thick", "Hospital", "Old"],
        verbatims: ["Classic brand.", "A bit thick to wear."]
    }
];

export const PRICING_HEURISTICS = {
    economy: "₹8 - ₹12 per piece",
    mid_market: "₹15 - ₹22 per piece",
    premium: "₹30 - ₹45 per piece",
    pack_sizes: ["Trial (2-3)", "Weekly (10)", "Monthly (30)"]
};
