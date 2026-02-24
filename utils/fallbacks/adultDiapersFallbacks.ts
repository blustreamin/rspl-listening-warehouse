
export const AD_FALLBACKS = {
    "incontinence_management": {
        section_id: "incontinence_management",
        profiles: {
            overall_category: { 
                definition: [{ headline: "The Silent Epidemic", what_it_means: "Widespread issue hidden by stigma.", so_what: "Massive latent demand.", confidence: "HIGH", evidence: { quotes: [] } }],
                incontinence_issue: [{ headline: "Urge Incontinence", what_it_means: "Sudden need to go.", confidence: "HIGH", evidence: { quotes: [] } }],
                worst_moments: [{ headline: "Social Gatherings", what_it_means: "Fear of smell/leak in public.", confidence: "HIGH", evidence: { quotes: [] } }],
                life_impact: [
                    { headline: "Psychological Isolation", what_it_means: "Withdrawal from family events.", confidence: "HIGH", evidence: { quotes: [] } },
                    { headline: "Economic Burden", what_it_means: "Recurring monthly cost ~₹2000.", confidence: "HIGH", evidence: { quotes: [] } }
                ],
                solutions: [{ headline: "Improvised Cloth", what_it_means: "Old sarees used as layers.", confidence: "HIGH", evidence: { quotes: [] } }],
                challenges: [{ challenge: "Disposal Stigma", current_workarounds: ["Wrapping in newspaper", "Throwing in distant bins"], severity: "P0", evidence: { quotes: [] } }]
            },
            self_use: { definition: [{ headline: "The Active Senior", what_it_means: "Mobile but anxious.", confidence: "MED", evidence: { quotes: [] } }] },
            decider_for_others: { definition: [{ headline: "The Dutiful Son", what_it_means: "Buys in bulk for parents.", confidence: "MED", evidence: { quotes: [] } }] },
            caregiver_bedridden: { definition: [{ headline: "The Home Nurse", what_it_means: "Manages heavy flow/bedsores.", confidence: "MED", evidence: { quotes: [] } }] }
        }
    },
    "awareness_perception": {
        section_id: "awareness_perception",
        awareness_depth: [{ headline: "Brand = Friends", what_it_means: "Friends is the generic trademark.", so_what: "First mover advantage.", confidence: "HIGH", evidence: { quotes: [] } }],
        perceptions_and_stigma: [{ headline: "Diaper = Baby", what_it_means: "Infantilizing terminology hurts dignity.", so_what: "Need for 'Pant' positioning.", confidence: "HIGH", evidence: { quotes: [] } }],
        misconceptions: [{ headline: "Only for Bedridden", what_it_means: "Active seniors don't think it's for them.", confidence: "HIGH", evidence: { quotes: [] } }],
        decision_journey: [{ headline: "Doctor Initiated", what_it_means: "First trial often prescribed.", confidence: "HIGH", evidence: { quotes: [] } }]
    },
    "user_non_user_profiles": {
        section_id: "user_non_user_profiles",
        users_trialists: { 
            awareness_sources: [{ headline: "Chemist Recommendation", confidence: "HIGH", evidence: { quotes: [] } }],
            triggers_to_purchase: [{ headline: "The 'Wedding' Incident", what_it_means: "Specific social event trigger.", confidence: "HIGH", evidence: { quotes: [] } }],
            first_use_contexts: [{ headline: "Night Time Trial", confidence: "MED", evidence: { quotes: [] } }],
            benefits_vs_challenges: [{ headline: "Sleep Restored", confidence: "HIGH", evidence: { quotes: [] } }]
        },
        non_users: { 
            barriers_to_trial: [{ headline: "Cost Prohibitive", what_it_means: "Daily use too expensive.", confidence: "HIGH", evidence: { quotes: [] } }],
            cost_availability: [{ headline: "Tier 2 Gap", what_it_means: "Hard to find large sizes locally.", confidence: "MED", evidence: { quotes: [] } }]
        }
    },
    "behavioural_profile": {
        section_id: "behavioural_profile",
        heaviness_of_use: [{ headline: "Night Only", what_it_means: "1 pad per day usage pattern.", confidence: "HIGH", evidence: { quotes: [] } }],
        occasions_of_use: [{ headline: "Travel (Train/Bus)", what_it_means: "Usage spikes during long journeys.", confidence: "HIGH", evidence: { quotes: [] } }],
        switching_patterns: [{ headline: "Cloth -> Pad -> Pant", what_it_means: "Evolution of usage.", confidence: "MED", evidence: { quotes: [] } }],
        purchase_behaviour: {
            channels: [{ channel: "pharmacy", why: "Immediate need & Trust", evidence: { quotes: [] } }],
            pack_sizes: [{ pack: "small_6_10", why: "Low cash outlay", evidence: { quotes: [] } }],
            sizing: [],
            price_points_inr: []
        }
    },
    "brand_landscape": {
        section_id: "brand_landscape",
        market_structure: [{ headline: "Duopoly", what_it_means: "Friends vs Lifree dominate.", confidence: "HIGH", evidence: { quotes: [] } }],
        brands: [
            { 
                brand: "Friends", 
                share_of_voice: { mentions: 50, share_pct: 45 }, 
                overall_sentiment: "POS", 
                attribute_scale: [{ attribute: "value", score_0_5: 4.5, rationale: "Legacy leader", evidence: { quotes: [] } }],
                geo_notes_india: [],
                sku_insights: [],
                word_cloud_terms: ["Trust", "Old", "Chemist"],
                ratings: []
            },
            { 
                brand: "Lifree", 
                share_of_voice: { mentions: 40, share_pct: 35 }, 
                overall_sentiment: "POS", 
                attribute_scale: [{ attribute: "comfort", score_0_5: 4.8, rationale: "Pant style leader", evidence: { quotes: [] } }],
                geo_notes_india: [],
                sku_insights: [],
                word_cloud_terms: ["Pant", "Soft", "Easy"],
                ratings: []
            }
        ],
        overall_attribute_heatmap: [],
        visual_synthesis: { source_volume: { total_n: 0, by_source: [] }, brand_word_cloud: { top_terms: [] } },
        section_summary: { boardroom_takeaways: ["Market is consolidating around pant-style."] }
    }
};
