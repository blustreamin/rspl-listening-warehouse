
// ANALYST-GRADE SEED DATA FOR ADULT DIAPERS (INDIA)
// Strictly follows DTO schemas defined in types/adult_diapers.ts

export const AD_CONSTANTS = {
    CHANNELS: ["Local Chemist / Pharmacy", "Amazon India", "Flipkart", "Hospital Pharmacy", "Wholesale Market"],
    ATTRIBUTES: ["Leakage Protection", "Absorption Capacity", "Dryness", "Comfort (Rash-free)", "Odour Control", "Fit & Discretion", "Value for Money"],
    PRICE_BANDS: ["₹8–12 (Value)", "₹13–18 (Mid-tier)", "₹19–28 (Premium)", "₹29–40 (Night/Specialist)"],
    BRANDS: ["Friends", "Lifree", "Teddyy", "KareIn", "Dignity", "Depend", "Romsons", "Wetex"]
};

const createEvidence = (tag: string) => ({
    refs: { evidence_ids: [], source_mix: {}, total_n: 0 },
    quotes: []
});

const seedInsight = (headline: string, meaning: string, confidence: "HIGH"|"MED"|"LOW" = "HIGH") => ({
    headline,
    what_it_means: meaning,
    so_what: "Strategic Gap",
    evidence: createEvidence("seed"),
    confidence,
    tags: ["seed"]
});

export const AD_SEEDS_V1 = {
    // SECTION 1: INCONTINENCE MANAGEMENT
    incontinence_management: {
        profiles: {
            overall_category: {
                definition: [seedInsight("The Silent Epidemic", "Widespread issue hidden by social stigma and dignity concerns.")],
                incontinence_issue: [seedInsight("Urge & Stress Incontinence", "Ranging from travel-induced anxiety leaks to full bedridden dependency.")],
                worst_moments: [
                    seedInsight("Travel (Train/Bus)", "Long journeys with limited toilet access trigger severe anxiety."),
                    seedInsight("Social Gatherings", "Weddings/functions where exit is difficult and reputation is at stake.")
                ],
                life_impact: [
                    seedInsight("Social Withdrawal", "Refusal to leave home or attend family functions."),
                    seedInsight("Caregiver Burnout", "Physical and emotional toll on family members managing hygiene.")
                ],
                solutions: [
                    seedInsight("Product Mix", "Use of Pants for day/mobility and Tapes for night/bedridden."),
                    seedInsight("Improvised Hacks", "Layering with cloth or towels to extend life of disposable product.")
                ],
                satisfaction: [seedInsight("Functional but Costly", "Leakage is managed, but recurring monthly expense is a pain point.")],
                challenges: [
                    { challenge: "Disposal Stigma", severity: "P0", current_workarounds: ["Newspaper wrapping", "Public bin disposal"], evidence: createEvidence("seed") },
                    { challenge: "Rash in Humid Climate", severity: "P1", current_workarounds: ["Powder", "Creams"], evidence: createEvidence("seed") }
                ]
            },
            self_use: {
                definition: [seedInsight("The Active Senior", "Mobile users managing age-related bladder weakness while maintaining routine.")]
            },
            decider_for_others: {
                definition: [seedInsight("The Dutiful Child", "Son/Daughter purchasing in bulk for parents; driven by cost and skin safety.")]
            },
            caregiver_bedridden: {
                definition: [seedInsight("The Home Care Manager", "Managing full dependency; priority is absorption volume and ease of changing.")]
            }
        }
    },

    // SECTION 2: AWARENESS
    awareness_perception: {
        awareness_depth: [
            seedInsight("Low Category Literacy", "Confusion between 'Pants', 'Diapers', and 'Tape-style' persists."),
            seedInsight("Brand Recall", "Friends and Lifree are often used as generic terms for the category.")
        ],
        perceptions_and_stigma: [
            seedInsight("Infantilization", "The term 'Diaper' evokes baby care, hurting dignity."),
            seedInsight("Visibility Fear", "Concern that products will be visible under clothing (sarees/dhotis)."),
            seedInsight("Last Resort", "Viewed as a sign of giving up on health, rather than a management tool."),
            seedInsight("Hygiene Myth", "Belief that wearing a product is less hygienic than using the toilet.")
        ],
        misconceptions: [
            seedInsight("Only for Bedridden", "Active seniors believe products are only for paralysis/coma patients."),
            seedInsight("Causes Rashes Inevitably", "Product blamed for skin issues often caused by infrequent changing."),
            seedInsight("Too Expensive", "Perceived as luxury compared to cloth, ignoring laundry costs."),
            seedInsight("One Size Fits All", "Lack of awareness about S/M/L/XL nuances leading to leaks.")
        ],
        decision_journey: [
            seedInsight("Trigger Event", "A public accident or hospitalization often forces first consideration."),
            seedInsight("Chemist Consultation", "Reliance on local pharmacist for 'what is best'."),
            seedInsight("Trial Pack", "Buying smallest count (2-3) to test fit and skin reaction."),
            seedInsight("Brand Stabilization", "Sticking to one brand once leak-free night is achieved.")
        ]
    },

    // SECTION 3: USER PROFILES
    user_non_user_profiles: {
        users_trialists: {
            triggers_to_purchase: [
                seedInsight("The 'Wedding' Incident", "Fear of ruining a social event."),
                seedInsight("Doctor Mandate", "Post-surgery or prostate issue management."),
                seedInsight("Caregiver Exhaustion", "Family unable to manage frequent linen changes.")
            ],
            first_use_contexts: [
                seedInsight("Night Trial", "First usage often starts at night to ensure sleep."),
                seedInsight("Travel Safety", "Worn 'just in case' during long transits.")
            ],
            retention_intent: [
                seedInsight("High Retention", "Once barrier is broken, quality of life improvement drives loyalty."),
                seedInsight("Sleep Restoration", "Users (and caregivers) report returning to full night sleep.")
            ],
            failure_stories: [
                { story: "Wrong Size Leaks: Buying L instead of M causing side leakage.", evidence: createEvidence("seed") },
                { story: "Heat Rash: Plastic feel causing sweat and itch in Indian summer.", evidence: createEvidence("seed") }
            ]
        },
        non_users: {
            barriers_to_trial: [
                seedInsight("Cost Prohibitive", "Daily burn rate of ₹40-80 is high for pension-dependent seniors."),
                seedInsight("Deep Denial", "'I am not that old yet' - psychological rejection."),
                seedInsight("Store Embarrassment", "Buying bulky packs in public feels shameful.")
            ],
            cost_availability: [
                seedInsight("Tier 2/3 Availability", "Large sizes often out of stock in smaller towns."),
                seedInsight("Unit Price Shock", "Upfront pack cost seems high compared to loose cloth.")
            ],
            substitutions: [
                seedInsight("Cloth Layering", "Using old cotton sarees or towels."),
                seedInsight("Fluid Restriction", "Drinking less water to avoid toilet trips.")
            ]
        }
    },

    // SECTION 4: BEHAVIOURAL
    behavioural_profile: {
        occasions_of_use: [
            seedInsight("Overnight Sleep", "Primary use case for maximum absorption."),
            seedInsight("Long Distance Travel", "Train/Bus journeys where toilets are dirty or inaccessible."),
            seedInsight("Social Functions", "Weddings, Temple visits, Movies."),
            seedInsight("Winter/Monsoon", "Frequency increases due to cold; drying cloth is hard."),
            seedInsight("Post-Hospitalization", "Recovery weeks following surgery."),
            seedInsight("Daily Mobility", "Morning walks or market visits for confidence.")
        ],
        switching_patterns: [
            seedInsight("Cloth -> Pad -> Pant", "Evolution from homemade to professional solutions."),
            seedInsight("Tape -> Pant", "As patient regains some mobility or caregiver seeks ease."),
            seedInsight("Pant -> Tape", "If patient becomes fully bedridden or needs tighter leak control."),
            seedInsight("Economy -> Premium", "Switching up due to rash/comfort issues."),
            seedInsight("Pharmacy -> Online", "Switching channel for bulk discounts and privacy.")
        ],
        purchase_behaviour: {
            channels: [
                { channel: "pharmacy", why: "Immediate need, trust, credit availability.", evidence: createEvidence("seed") },
                { channel: "ecommerce", why: "Discretion (brown box), bulk discounts, size availability.", evidence: createEvidence("seed") }
            ],
            pack_sizes: [
                { pack: "trial_2_4", why: "Low risk trial for fit/comfort.", evidence: createEvidence("seed") },
                { pack: "medium_20_30", why: "Standard monthly replenishment.", evidence: createEvidence("seed") }
            ],
            price_points_inr: [
                { range_label: "Economy (₹8-12)", notes: "Entry level, often lacking indicators/softness.", evidence: createEvidence("seed") },
                { range_label: "Premium (₹25-40)", notes: "Soft materials, anti-bacterial, high absorbency.", evidence: createEvidence("seed") }
            ]
        }
    },

    // SECTION 5: BRAND LANDSCAPE
    brand_landscape: {
        market_structure: [
            seedInsight("Duopoly at Top", "Friends and Lifree dominate shelf space and mindshare."),
            seedInsight("Price Warriors", "Teddyy and local brands competing on per-piece cost."),
            seedInsight("Premium Niche", "TENA/Depend targeting high-income urban users."),
            seedInsight("Online Challengers", "Pee Safe, KareIn gaining share via D2C/Amazon.")
        ],
        brands: [
            {
                brand: "Friends",
                share_of_voice: { mentions: 0, share_pct: 0 },
                overall_sentiment: "POS",
                attribute_scale: [
                    { attribute: "value", score_0_5: 5, rationale: "Market leader in affordability and reach.", evidence: createEvidence("seed") },
                    { attribute: "absorption", score_0_5: 4, rationale: "Trusted for overnight use.", evidence: createEvidence("seed") }
                ],
                word_cloud_terms: ["Reliable", "Old Brand", "Chemist", "Economical", "Indian"],
                geo_notes_india: [],
                sku_insights: [],
                ratings: []
            },
            {
                brand: "Lifree",
                share_of_voice: { mentions: 0, share_pct: 0 },
                overall_sentiment: "POS",
                attribute_scale: [
                    { attribute: "comfort", score_0_5: 5, rationale: "Pioneer of soft, pant-style fit.", evidence: createEvidence("seed") },
                    { attribute: "thinness_thickness", score_0_5: 4, rationale: "Less bulky than competitors.", evidence: createEvidence("seed") }
                ],
                word_cloud_terms: ["Soft", "Pant Style", "Easy", "Japanese", "Premium"],
                geo_notes_india: [],
                sku_insights: [],
                ratings: []
            },
            {
                brand: "Teddyy",
                share_of_voice: { mentions: 0, share_pct: 0 },
                overall_sentiment: "MIX",
                attribute_scale: [
                    { attribute: "value", score_0_5: 5, rationale: "Aggressive pricing strategy.", evidence: createEvidence("seed") },
                    { attribute: "dryness", score_0_5: 3, rationale: "Good for short duration, mixed reviews on night.", evidence: createEvidence("seed") }
                ],
                word_cloud_terms: ["Cheap", "Bulk", "Acceptable", "Day Use"],
                geo_notes_india: [],
                sku_insights: [],
                ratings: []
            }
        ],
        visual_synthesis: {
            brand_word_cloud: { top_terms: ["Leakage", "Rash", "Sleep", "Travel", "Cost", "Dignity", "Softness", "Absorption"] }
        }
    }
};
