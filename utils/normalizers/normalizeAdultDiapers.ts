
import { AD_SEEDS_V1 } from '../../projects/adult-diapers/ad_seed_v1';
import { INDIA_MARKET_QUOTES, ARCHETYPE_TEMPLATES, BRAND_SEED_LANDSCAPE } from '../seeds/adultDiapersIndiaSeedpack';
import { fillIncontinenceGaps, fillUserProfileGaps } from '../fallbacks/adultDiapersMinFill';

const ensureArray = (v: any) => Array.isArray(v) ? v : (v ? [v] : []);

// Seed Merger Utility
const mergeWithSeed = (sectionId: string, data: any): any => {
    const seed = (AD_SEEDS_V1 as any)[sectionId];
    if (!seed) return data;

    // Helper to merge lists deeply
    const mergeList = (target: any[], source: any[]) => {
        const safeTarget = ensureArray(target);
        if (safeTarget.length >= source.length) return safeTarget;
        // Append seeds if target is short
        return [...safeTarget, ...source.slice(safeTarget.length)];
    };

    // Deep Merge Logic for Adult Diapers DTOs
    const merged = { ...data };
    
    // Explicit Seed Injection for Archetypes (Suser)
    if (sectionId === 'user_non_user_profiles') {
        merged.user_profiles = mergeList(merged.user_profiles, ARCHETYPE_TEMPLATES.users);
        merged.non_user_profiles = mergeList(merged.non_user_profiles, ARCHETYPE_TEMPLATES.non_users);
    }
    
    // Explicit Seed Injection for Brands (Sbran)
    if (sectionId === 'brand_landscape') {
        // If no brands or only unknown, overwrite with seed
        if (!merged.brands || !Array.isArray(merged.brands) || merged.brands.length < 2) {
            merged.brands = BRAND_SEED_LANDSCAPE;
        } else {
            // Append missing seed brands if not present
            const currentNames = merged.brands.map((b:any) => {
                if (typeof b === 'string') return b.toLowerCase();
                return (b?.brand || "").toLowerCase();
            });
            
            BRAND_SEED_LANDSCAPE.forEach(sb => {
                if (!currentNames.includes(sb.brand.toLowerCase())) {
                    merged.brands.push(sb);
                }
            });
        }
    }

    return merged;
};

// Root unwrapper
const unwrapLLMRoot = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    // Check for common wrappers
    if (data.user_non_user_profiles) return data.user_non_user_profiles;
    if (data.profiles && data.profiles.profiles) return data.profiles; // Double nesting
    return data;
};

export const normalizeAdultDiapersData = (sectionId: string, rawData: any): any => {
    let data = unwrapLLMRoot(rawData);
    
    // 1. Structure Adaptation
    let adapted: any = {};
    if (sectionId === 'incontinence_management') {
        adapted = fillIncontinenceGaps(data); // Uses existing minfill
    }
    else if (sectionId === 'user_non_user_profiles') {
        // Map old DTO style to new flat style if needed
        const u = data.users_trialists?.detailed_profiles || data.user_profiles;
        const n = data.non_users?.detailed_profiles || data.non_user_profiles;
        adapted = { 
            ...data, 
            user_profiles: u, 
            non_user_profiles: n,
            // Preserve failure/delight stories (new fields)
            failure_stories: ensureArray(data.failure_stories || data.users_trialists?.failure_stories),
            delight_stories: ensureArray(data.delight_stories || data.users_trialists?.delight_stories),
        };
        adapted = fillUserProfileGaps(adapted);

        // Normalize switching_trigger field name (was trigger_event)
        if (adapted.user_profiles) {
            adapted.user_profiles = ensureArray(adapted.user_profiles).map((p: any) => ({
                ...p,
                switching_trigger: p.switching_trigger || p.trigger_event || p.trigger || '',
            }));
        }
    }
    else if (sectionId === 'awareness_perception') {
        adapted = { ...data };

        // Normalize awareness_sources (new field)
        if (!adapted.awareness_sources) {
            const sourcesData = adapted.information_sources || adapted.awareness_channels || adapted.discovery_sources || adapted.awareness_depth;
            if (sourcesData) {
                adapted.awareness_sources = ensureArray(sourcesData).map((s: any) => {
                    if (typeof s === 'string') return { headline: s, what_it_means: '' };
                    return {
                        headline: s.headline || s.source || s.channel || s.title || '',
                        what_it_means: s.what_it_means || s.description || s.detail || s.impact || '',
                    };
                });
            }
        } else {
            adapted.awareness_sources = ensureArray(adapted.awareness_sources).map((s: any) => {
                if (typeof s === 'string') return { headline: s, what_it_means: '' };
                return {
                    headline: s.headline || s.source || s.channel || s.title || '',
                    what_it_means: s.what_it_means || s.description || s.detail || '',
                };
            });
        }

        // Fix Stigma Drivers key mismatch
        if (!adapted.perceptions_and_stigma) {
            const stigmaSource = adapted.stigma_drivers || adapted.stigma || adapted.perceptions || adapted.stigma_factors;
            if (stigmaSource) {
                adapted.perceptions_and_stigma = ensureArray(stigmaSource).map((s: any) => {
                    if (typeof s === 'string') return { headline: s, what_it_means: '' };
                    return {
                        headline: s.headline || s.driver || s.stigma || s.factor || s.title || '',
                        what_it_means: s.what_it_means || s.description || s.detail || s.impact || '',
                    };
                });
            }
        }

        // Fix Decision Journey: normalize strings/varied objects to { headline, what_it_means }
        if (adapted.decision_journey) {
            adapted.decision_journey = ensureArray(adapted.decision_journey).map((step: any, i: number) => {
                if (typeof step === 'string') return { headline: step, what_it_means: '' };
                return {
                    headline: step.headline || step.step || step.stage || step.phase || step.title || `Step ${i + 1}`,
                    what_it_means: step.what_it_means || step.detail || step.description || step.behaviour || '',
                };
            });
        }

        // Defensive: normalize misconceptions too
        if (adapted.misconceptions) {
            adapted.misconceptions = ensureArray(adapted.misconceptions).map((m: any) => {
                if (typeof m === 'string') return { headline: m, what_it_means: '' };
                return {
                    headline: m.headline || m.misconception || m.myth || m.title || '',
                    what_it_means: m.what_it_means || m.reality || m.correction || m.description || '',
                };
            });
        }
    }
    else if (sectionId === 'gap_analysis') {
        adapted = { ...data };
        // Normalize emotional/functional needs arrays defensively
        ['emotional_needs', 'functional_needs', 'unmet_expectations', 'non_user_gaps'].forEach(key => {
            if (adapted[key]) {
                adapted[key] = ensureArray(adapted[key]).map((item: any) => {
                    if (typeof item === 'string') return { need: item, who_feels_it: '', current_gap: '', consumer_quotes: [], opportunity: '' };
                    // Normalize consumer_quote (singular) to consumer_quotes (array)
                    if (item.consumer_quote && !item.consumer_quotes) {
                        item.consumer_quotes = [item.consumer_quote];
                    }
                    if (item.consumer_quotes) {
                        item.consumer_quotes = ensureArray(item.consumer_quotes);
                    }
                    return item;
                });
            }
        });
    }
    else if (sectionId === 'behavioural_profile') {
        adapted = { ...data };

        // Fix Switching Patterns: convert {from_product, to_product, trigger} → readable string
        if (adapted.switching_patterns) {
            adapted.switching_patterns = ensureArray(adapted.switching_patterns).map((sw: any) => {
                if (typeof sw === 'string') return { headline: sw };
                const from = sw.from_product || sw.from || '';
                const to = sw.to_product || sw.to || '';
                if (from && to) {
                    const trigger = sw.trigger ? ` — ${sw.trigger}` : '';
                    return { headline: `${from} → ${to}${trigger}` };
                }
                return { headline: sw.headline || sw.pattern || sw.description || '' };
            });
        }

        // Normalize brand_switching (new field)
        if (adapted.brand_switching) {
            adapted.brand_switching = ensureArray(adapted.brand_switching).map((bs: any) => {
                if (typeof bs === 'string') return { headline: bs };
                const from = bs.from_brand || bs.from || '';
                const to = bs.to_brand || bs.to || '';
                if (from && to) {
                    const reason = bs.reason ? ` — ${bs.reason}` : '';
                    return { headline: `${from} → ${to}${reason}` };
                }
                return { headline: bs.headline || bs.reason || '' };
            });
        }

        // Normalize occasions (defensive)
        if (adapted.occasions_of_use) {
            adapted.occasions_of_use = ensureArray(adapted.occasions_of_use).map((occ: any) => {
                if (typeof occ === 'string') return { headline: occ };
                return {
                    headline: occ.headline || occ.occasion || occ.use_case || occ.title || '',
                    what_it_means: occ.what_it_means || occ.description || occ.detail || '',
                };
            });
        }

        // Fix Purchase Behaviour sub-fields
        if (adapted.purchase_behaviour) {
            // ===== Fix Channels (UPDATED LOGIC) =====
            let rawChannels = adapted.purchase_behaviour.channels
                || adapted.purchase_behaviour.purchase_channels
                || adapted.purchase_behaviour.retail_channels
                || adapted.purchase_behaviour.distribution_channels
                || adapted.purchase_behaviour.buying_channels
                || adapted.purchase_behaviour.where_they_buy
                || adapted.channels
                || adapted.distribution_channels
                || adapted.retail_channels;

            // If still nothing, extract from pack_sizes channel_focus fields
            if (!rawChannels || ensureArray(rawChannels).length === 0) {
                const packSizesRaw = adapted.purchase_behaviour.pack_sizes;
                if (packSizesRaw && Array.isArray(packSizesRaw)) {
                    const extracted = packSizesRaw
                        .map((p: any) => p.channel_focus || p.channel || p.retail_channel || '')
                        .filter((c: any) => typeof c === 'string' && c.length > 0);
                    
                    const unique = [...new Set(extracted)];
                    if (unique.length > 0) rawChannels = unique;
                }
            }

            // If STILL nothing, use hardcoded India-market seed
            if (!rawChannels || ensureArray(rawChannels).length === 0) {
                rawChannels = [
                    'Pharmacy / Chemist Counter',
                    'Supermarkets & Hypermarkets',
                    'E-commerce (Amazon, Flipkart, BigBasket)',
                    'Hospital & Institutional Supply'
                ];
            }

            // Assign back to structure and flatten to clean strings
            adapted.purchase_behaviour.channels = ensureArray(rawChannels).map((c: any) => {
                if (typeof c === 'string') return c;
                return c.channel || c.name || c.type || c.channel_focus || JSON.stringify(c);
            });

            // Fix Pack Sizes — preserve structured objects { headline, insight, consumer_quotes }, convert legacy to strings
            if (adapted.purchase_behaviour.pack_sizes) {
                adapted.purchase_behaviour.pack_sizes = ensureArray(adapted.purchase_behaviour.pack_sizes).map((p: any) => {
                    if (typeof p === 'string') return p;
                    if (p.headline && p.insight) return p; // new structured format — keep as-is
                    if (p.pack) return p.pack;
                    const name = p.size_type || p.name || p.label || '';
                    const count = p.count || p.units || '';
                    if (name && count) return `${name} (${count})`;
                    if (name) return name;
                    return JSON.stringify(p);
                });
            }

            // Pass through pack_sizes_by_brand (new structured sub-section)
            if (adapted.purchase_behaviour.pack_sizes_by_brand) {
                adapted.purchase_behaviour.pack_sizes_by_brand = ensureArray(adapted.purchase_behaviour.pack_sizes_by_brand);
            }

            // Defensive: normalize price_points_inr — preserve structured objects
            if (adapted.purchase_behaviour.price_points_inr) {
                adapted.purchase_behaviour.price_points_inr = ensureArray(adapted.purchase_behaviour.price_points_inr).map((pr: any) => {
                    if (typeof pr === 'string') return pr;
                    if (pr.headline && pr.insight) return pr; // new structured format — keep as-is
                    if (pr.range_label || pr.price) return pr;
                    const label = pr.tier || pr.segment || pr.category || '';
                    const range = pr.range || pr.price_range || pr.inr || '';
                    if (label && range) return { range_label: `${range} (${label})` };
                    return pr;
                });
            }

            // Pass through price_by_brand (new structured sub-section)
            if (adapted.purchase_behaviour.price_by_brand) {
                adapted.purchase_behaviour.price_by_brand = ensureArray(adapted.purchase_behaviour.price_by_brand);
            }

            // Normalize geographic_patterns — preserve structured objects with sub_factors
            if (adapted.purchase_behaviour.geographic_patterns) {
                adapted.purchase_behaviour.geographic_patterns = ensureArray(adapted.purchase_behaviour.geographic_patterns).map((gp: any) => {
                    if (typeof gp === 'string') return gp;
                    if (gp.headline && gp.sub_factors) return gp; // new structured format — keep as-is
                    if (gp.headline && gp.insight) return gp; // structured without sub_factors — still fine
                    return gp;
                });
            }
        }
    }
    else {
        adapted = data;
    }

    // 2. Seed Merging (The Safety Net)
    let merged = mergeWithSeed(sectionId, adapted);

    // 3. Inject Consumer Statements if missing (Global Fallback)
    // Add random verbatims from INDIA_MARKET_QUOTES if none exist at top level
    if (!merged.consumer_statements && !merged.verbatims) {
        // Deterministic slice based on section name length
        const start = sectionId.length % 10;
        merged.consumer_statements = INDIA_MARKET_QUOTES.slice(start, start + 3).map(q => q.text);
    }

    // 4. Synthesize Legacy Summary Fields for UI Compatibility (Suser)
    if (sectionId === 'user_non_user_profiles') {
        // Ensure legacy fields like 'triggers_to_purchase' exist for card renderer
        if (!merged.users_trialists) merged.users_trialists = {};
        if (!merged.users_trialists.triggers_to_purchase) {
            merged.users_trialists.triggers_to_purchase = merged.user_profiles?.map((p:any) => ({
                headline: p.trigger_event || "Trigger",
                what_it_means: p.profile_name
            }));
        }
        if (!merged.non_users) merged.non_users = {};
        if (!merged.non_users.barriers_to_trial) {
            merged.non_users.barriers_to_trial = merged.non_user_profiles?.map((p:any) => ({
                headline: p.primary_barrier || "Barrier",
                what_it_means: p.profile_name
            }));
        }
    }

    return merged;
};
