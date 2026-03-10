import { SectionOutput, EvidenceGraph, ProjectId } from '../types';
import { normalizeAdultDiapersData } from './normalizers/normalizeAdultDiapers';

/**
 * UTILITY: Ensure a value is an array.
 * Robustly handles objects wrapping arrays, single items, or strings.
 */
export const ensureArray = <T = any>(input: any, defaultKey: string = 'text'): T[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  
  if (typeof input === 'object') {
    // Check for common wrapper keys (LLM hallucinations)
    if (Array.isArray(input.items)) return input.items;
    if (Array.isArray(input.list)) return input.list;
    if (Array.isArray(input.data)) return input.data;
    if (Array.isArray(input.values)) return input.values;
    if (Array.isArray(input.cards)) return input.cards;
    
    // Check if it's a "values" object map that should be list
    const values = Object.values(input);
    if (values.length > 0 && typeof values[0] === 'object') {
        return values as T[];
    }

    // It's a single object, wrap it
    return [input] as T[];
  }

  if (typeof input === 'string') {
     try {
         const parsed = JSON.parse(input);
         if (Array.isArray(parsed)) return parsed;
         if (typeof parsed === 'object') return [parsed];
     } catch (e) {
         return [{ [defaultKey]: input }] as unknown as T[];
     }
  }

  return [];
};

/**
 * Normalize Chart Data using REAL Evidence Stats if available
 * This prevents the LLM from hallucinating "N=11" when we have 5000 records.
 */
const normalizeChartData = (input: any, evidenceGraph?: EvidenceGraph): { data: any[], total: number } => {
    // If we have real evidence stats, PREFER those for the Volume Chart
    if (evidenceGraph && evidenceGraph.events) {
         const events = evidenceGraph.events;
         const total = events.length;
         
         const sources: Record<string, number> = {};
         events.forEach(e => {
             // Normalized source tag logic
             let tag = (e.sourceTag || e.commerce?.platform || 'Other').toLowerCase();
             if (tag.includes('amazon')) tag = 'Amazon';
             else if (tag.includes('flipkart')) tag = 'Flipkart';
             else if (tag.includes('nykaa')) tag = 'Nykaa';
             else if (tag.includes('awario') || tag.includes('social')) tag = 'Social';
             else tag = 'Other';
             
             sources[tag] = (sources[tag] || 0) + 1;
         });
         
         const data = Object.entries(sources).map(([source, count]) => ({
             source,
             count,
             pct: Math.round((count / total) * 100)
         })).sort((a,b) => b.count - a.count);
         
         return { data, total };
    }

    // Fallback to LLM output if no graph provided (rare)
    const arr = ensureArray(input);
    const data = arr.map(item => ({
        source: item.source || item.label || item.platform || 'Unknown',
        count: typeof item.count === 'number' ? item.count : (item.value || 0),
        pct: typeof item.pct === 'number' ? item.pct : (item.percentage || item.share || 0)
    }));
    
    const total = data.reduce((acc: number, curr: any) => acc + curr.count, 0);
    return { data, total };
};

// Common Segmentation Normalization (Used in Sec 8 & 9)
const normalizeSegmentation = (segData: any) => {
    if (!segData) return { lifestage: [], geography: [], by_lifestage: [], by_geography: [] };

    // Legacy Lists
    const lifestage = ensureArray(segData.lifestage || segData.lifestages);
    const geography = ensureArray(segData.geography || segData.regions);

    // Enhanced Lists (New Schema)
    const by_lifestage = ensureArray(segData.by_lifestage, 'segment_name').map((s: any) => ({
        segment_name: s.segment_name || s.segment || "Unknown Segment",
        size_signal: s.size_signal || "Medium",
        adoption_drivers: ensureArray(s.adoption_drivers),
        core_tension: s.core_tension || "Unspecified Tension",
        functional_expectations: ensureArray(s.functional_expectations),
        emotional_drivers: ensureArray(s.emotional_drivers),
        barriers: ensureArray(s.barriers),
        switching_triggers: ensureArray(s.switching_triggers),
        brand_signals: ensureArray(s.brand_signals),
        price_sensitivity: s.price_sensitivity || "Medium",
        consumer_evidence: ensureArray(s.consumer_evidence || s.evidence, 'quote').map((e: any) => ({
            quote: e.quote || e.text || "Dataset signal",
            source: e.source || "Dataset"
        })),
        commercial_implication: s.commercial_implication || "Investigate further",
        confidence: s.confidence || "Medium"
    }));

    const by_geography = ensureArray(segData.by_geography, 'region_type').map((g: any) => ({
        region_type: g.region_type || g.region || "Unknown Region",
        behavioral_pattern: g.behavioral_pattern || "Standard",
        adoption_triggers: ensureArray(g.adoption_triggers),
        infrastructure_factor: g.infrastructure_factor || "N/A",
        affordability_dynamic: g.affordability_dynamic || "Standard",
        brand_exposure_pathway: ensureArray(g.brand_exposure_pathway),
        barriers: ensureArray(g.barriers),
        consumer_evidence: ensureArray(g.consumer_evidence || g.evidence, 'quote').map((e: any) => ({
            quote: e.quote || e.text || "Dataset signal",
            source: e.source || "Dataset"
        })),
        commercial_implication: g.commercial_implication || "Expand presence",
        confidence: g.confidence || "Medium"
    }));

    return { lifestage, geography, by_lifestage, by_geography };
};

/**
 * MAIN NORMALIZER DISPATCHER
 * Strictly routes based on templateId (primary) and projectId (secondary) to prevent contamination.
 */
export const normalizeSectionData = (
    sectionId: string, 
    rawData: any, 
    evidenceGraph?: EvidenceGraph, 
    projectId?: ProjectId,
    templateId?: string
): any => {
    // 1. Handle Raw Parse Failures
    if (!rawData) return { __isEmpty: true };
    let data = rawData;

    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            return { __rawText: data, __parseError: true };
        }
    }
    
    // Safety check for empty objects
    if (Object.keys(data).length === 0) return { __isEmpty: true };

    // --- STRICT DISPATCHER ---
    
    // GUARD: Adult Diapers Isolation
    if ((projectId as string) === 'adult-diapers') {
        if (templateId && !templateId.startsWith('adult_diapers_v')) {
            throw new Error(`[Normalization] Critical Project/Template Mismatch: ${projectId} cannot use ${templateId}`);
        }
        // Strip prefix if present (compatibility)
        const cleanSectionId = sectionId.startsWith('ad_') ? sectionId.replace('ad_', '') : sectionId;
        // DIRECT ROUTE - DO NOT FALL THROUGH
        return normalizeAdultDiapersData(cleanSectionId, data);
    }

    // GUARD: Legacy projects attempting to use Adult Diapers logic
    if (templateId?.startsWith('adult_diapers_v') && (projectId as string) !== 'adult-diapers') {
         throw new Error(`[Normalization] Critical: Legacy project ${projectId} attempting to use Adult Diapers template.`);
    }

    // --- FEMCARE / LEGACY NORMALIZATION ---
    switch (sectionId) {
        // --- FEMCARE SECTIONS ---
        case '1': // Menstruation Context
            return {
                ...data,
                cards: ensureArray(data.cards || data.menstruation_context?.cards || data.content)
            };
        
        case 'sub_categories': // Sanitary Pads Sub-Category Landscape
            return {
                ...data,
                cards: ensureArray(data.cards || data.taxonomy_cards || data.landscape),
                taxonomy: data.taxonomy || null
            };

        case 'gap_analysis': // NEW: Gap Analysis
            const normalizeGapBlock = (block: any, defaultHeading: string) => {
                const b = block || {};
                return {
                    heading: b.heading || defaultHeading,
                    bullets: ensureArray(b.bullets || b.points || b.challenges, 'claim').map((item: any) => ({
                        claim: item.claim || item.text || "Unspecified Challenge",
                        explanation: item.explanation || item.description || "No detail provided.",
                        consumer_evidence: ensureArray(item.consumer_evidence || item.evidence, 'quote'),
                        evidence_ids: ensureArray(item.evidence_ids || [], 'id'),
                        severity: item.severity || "MED",
                        impacted_occasions: ensureArray(item.impacted_occasions || [], 'occasion')
                    }))
                };
            };
            
            const normalizeNeeds = (block: any) => {
                 const b = block || {};
                 return {
                     heading: b.heading || "What is the Need Gap",
                     need_statements: ensureArray(b.need_statements || b.needs, 'need').map((item: any) => ({
                         need: item.need || "Unspecified Need",
                         why_now: item.why_now || "Relevance unclear",
                         who: item.who || "General User",
                         measurable_proxy: item.measurable_proxy,
                         consumer_evidence: ensureArray(item.consumer_evidence || item.evidence, 'quote'),
                         evidence_ids: ensureArray(item.evidence_ids || [], 'id'),
                         priority: item.priority || "P1"
                     }))
                 };
            };

            return {
                current_challenges: normalizeGapBlock(data.current_challenges || data.challenges, "Current Challenges"),
                resolved_challenges: normalizeGapBlock(data.resolved_challenges || data.resolved, "Resolved Challenges"),
                unresolved_challenges: normalizeGapBlock(data.unresolved_challenges || data.unresolved, "Unresolved Challenges"),
                need_gap: normalizeNeeds(data.need_gap || data.needs)
            };

        case '2': // Behavioural Landscape (Triggers & Barriers)
            const root2 = data.behavioural_landscape || data;
            
            let barrierGroups = root2.barrier_groups || root2.barriers;
            if (Array.isArray(barrierGroups)) {
                 const groupMap: any = {};
                 barrierGroups.forEach((g: any) => {
                     if (g.title) groupMap[g.title] = ensureArray(g.bullets || g.items);
                     else if (typeof g === 'string') groupMap['General'] = [...(groupMap['General']||[]), g];
                 });
                 if (Object.keys(groupMap).length > 0) barrierGroups = groupMap;
                 else barrierGroups = { "Barriers": [] }; 
            } else if (!barrierGroups) {
                barrierGroups = { "Barriers": [] };
            }
            
            // Fix "Unknown -> Target" labels in Switching
            let switching = ensureArray(root2.switching_dynamics || root2.switching, 'pathway');
            switching = switching.map((s: any) => ({
                ...s,
                from: (s.from && s.from !== 'Unknown') ? s.from : 'Traditional Method',
                to: (s.to && s.to !== 'Target') ? s.to : 'New Solution'
            }));

            return {
                trigger_clusters: ensureArray(root2.trigger_clusters || root2.triggers || root2.cluster_name, 'title'),
                barrier_groups: barrierGroups,
                switching_dynamics: switching,
                brand_switching: ensureArray(root2.brand_switching, 'from_brand')
            };

        case '3': // Proof Points
            return {
                proof_points: ensureArray(data.proof_points || data.working || data.proof)
            };

        case '4': // Roles
            return {
                roles: ensureArray(data.roles || data.product_roles),
                segmentation: normalizeSegmentation(data.segmentation)
            };

        case '5': // Ecosystem (Formats)
             const rootEco5 = data.product_ecosystem || data;
             const rawFormats = rootEco5.formats || rootEco5.format_landscape || rootEco5.product_formats || rootEco5.ecosystem || rootEco5.format_cards || data.formats;
             return {
                 formats: ensureArray(rawFormats, 'format'),
             };

        case '6': // Attribute Trade-off Matrix
             const rootEco6 = data.product_ecosystem || data;
             return {
                 tradeoff_matrix: ensureArray(rootEco6.tradeoff_matrix || rootEco6.matrix || data.tradeoff_matrix, 'attribute')
             };
        
        case '7': // Brand Performance
             return {
                 brand_performance: ensureArray(data.brand_performance || data.brands, 'brand')
             };

        case '8': // Awareness
             const root8 = data.awareness_channels || data;
             return {
                 ...root8,
                 search_intent_clusters: ensureArray(root8.search_intent_clusters || root8.search_clusters, 'cluster_name'),
                 discovery_sources: ensureArray(root8.discovery_sources || root8.sources, 'source'),
                 segmentation: normalizeSegmentation(root8.segmentation)
             };
        
        case '9': // Deep Dives
             const rootDD = data.deep_dive_disposable || data.deep_dive_reusable || data;
             const users = rootDD.users || {};
             const nonUsers = rootDD.non_users || {};

             return {
                 ...rootDD,
                 users: {
                     ...users,
                     triggers: ensureArray(users.triggers),
                     discovery_sources: ensureArray(users.discovery_sources),
                     experience_parameters: ensureArray(users.experience_parameters, 'parameter')
                 },
                 non_users: {
                     ...nonUsers,
                     barriers_to_try: ensureArray(nonUsers.barriers_to_try, 'title')
                 },
                 segmentation: normalizeSegmentation(rootDD.segmentation || rootDD)
             };

        case '10': // Visuals
             const root10 = data.visuals || data;
             
             // Normalize Source Chart using EVIDENCE GRAPH STATS (Priority)
             const rawChart = root10.sources_chart || root10.source_breakdown || root10.source_volume;
             const normalizedChart = normalizeChartData(rawChart?.data || rawChart, evidenceGraph);

             // Normalize Word Clouds
             let themes = root10.word_cloud_themes || root10.themes;
             if (themes && !Array.isArray(themes.tokens)) {
                 if (Array.isArray(themes)) {
                     themes = { tokens: themes.map((t: any) => typeof t === 'string' ? {term: t, weight: 5} : t) };
                 } else {
                     themes = { tokens: ensureArray(themes, 'term') };
                 }
             }

             return {
                 sources_chart: normalizedChart,
                 word_cloud_themes: themes
             };

        default:
            return data;
    }
};