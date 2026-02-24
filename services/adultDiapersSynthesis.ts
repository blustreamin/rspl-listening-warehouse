
import { EvidenceGraph, TemplatePack, EvidenceEventV1 } from '../types';
import { GoogleGenAI } from "@google/genai";
import { normalizeAdultDiapersData } from '../utils/normalizers/normalizeAdultDiapers';
import { evaluateAdultDiapersQuality } from './adultDiapersQualityGate';
import { repairSectionContent } from './gemini';

const API_KEY = process.env.API_KEY || "";

// BANNED PHRASES FOR QUALITY GATE
const BANNED_PHRASES = [
    /no textual insights/i,
    /no explicit evidence/i,
    /insufficient data/i,
    /"derived"/i,
    /"inferred"/i,
    /"n\/a"/i,
    /"psy"/i
];

// SECTION KEYWORD MAP for Targeted Evidence
const SECTION_KEYWORDS: Record<string, string[]> = {
    "incontinence_management": ["leak", "smell", "social", "travel", "night", "sleep", "rash", "heavy", "light", "bedridden", "caregiver", "accident", "wet", "sheet", "mattress", "toilet", "bathroom", "urgency", "control", "pad", "cloth", "diaper", "incontinence", "urine", "bladder", "surgery", "hospital", "recovery", "strain", "sneeze", "laugh", "exercise", "walk"],
    "awareness_perception": ["stigma", "shame", "dignity", "doctor", "shop", "chemist", "embarrass", "myth", "hide", "diaper", "baby", "old", "perception", "judge", "family", "neighbor", "dispose", "disposal", "refuse", "deny", "accept", "realize", "aware", "know", "discover", "learn", "first time", "convince", "resist"],
    "user_non_user_profiles": ["trigger", "first time", "barrier", "cost", "expensive", "tried", "stopped", "switch", "trial", "price", "refuse", "start", "begin", "young", "old", "age", "mother", "father", "parent", "daughter", "son", "caregiver", "teen", "pcos", "heavy flow", "menstrual", "pregnant", "post-partum", "travel", "work", "school"],
    "behavioural_profile": ["change", "frequency", "night", "day", "travel", "wedding", "train", "bus", "pharmacy", "amazon", "price", "discount", "bulk", "monthly", "buy", "purchase", "shop", "online", "chemist", "medical", "store", "pack", "piece", "unit", "brand", "switch", "replace", "occasion", "event", "function", "monsoon"],
    "brand_landscape": ["price", "quality", "leak", "fit", "soft", "expensive", "cheap", "premium", "value", "brand", "friends", "lifree", "teddyy", "karein", "tena", "dignity", "unicharm", "nobel", "absorbency", "comfort", "rash", "smell", "odor", "thin", "thick", "tape", "pant", "pull-up", "review", "recommend", "trust", "best", "worst"]
};

// Deterministic Scoring for Sampling
const scoreEvent = (e: EvidenceEventV1, keywords: string[]): number => {
    let score = 0;
    const text = (e.content.text || "").toLowerCase();
    
    // Keyword match
    keywords.forEach(k => {
        if (text.includes(k)) score += 2;
    });

    // Metadata value
    if (e.commerce?.rating) score += 1;
    if (e.commerce?.brand && e.commerce.brand !== "Generic/Other") score += 2;
    if (text.length > 50 && text.length < 500) score += 1; // Sweet spot length

    return score;
};

// Helper to stringify evidence for the model with TARGETED SAMPLING & BACKFILL
const prepareTargetedEvidence = (graph: EvidenceGraph, sectionId: string): { json: string, count: number, ids: string[] } => {
    const events = graph.events || [];
    
    // 1. Keyword Filtering
    const keywords = SECTION_KEYWORDS[sectionId] || [];
    
    // 2. Deterministic Sort & Sample
    const scoredEvents = events.map(e => ({ event: e, score: scoreEvent(e, keywords) }));
    
    // Sort by Score Descending, then EvidenceID Ascending (Stable)
    scoredEvents.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score; 
        return a.event.evidenceId.localeCompare(b.event.evidenceId);
    });

    const TARGET_SIZE = 150;
    let sample = scoredEvents.filter(x => x.score > 0).slice(0, TARGET_SIZE).map(x => x.event);

    // 3. Backfill if sample is too small (AGGRESSIVE — never send empty evidence)
    const MIN_EVIDENCE = Math.min(20, events.length);  // Always try to send at least 20 items or all available
    if (sample.length < MIN_EVIDENCE) {
        const needed = MIN_EVIDENCE - sample.length;
        if (needed > 0) {
            const existingIds = new Set(sample.map(e => e.evidenceId));
            // Get high quality fallback: Longest text first (more signal)
            const fallbackPool = events
                .filter(e => !existingIds.has(e.evidenceId))
                .sort((a, b) => (b.content.text.length - a.content.text.length))
                .slice(0, needed);
            
            sample = [...sample, ...fallbackPool];
        }
    }
    
    const simplifiedSample = sample.map(e => ({
        text: e.content.text,
        source: e.sourceTag,
        brand: e.commerce?.brand,
        rating: e.commerce?.rating,
        id: e.evidenceId
    }));
    
    const json = JSON.stringify({
        stats: graph.aggregations,
        sample_evidence: simplifiedSample,
        note: `Targeted evidence for '${sectionId}'. Pool: ${events.length}. Sampled: ${simplifiedSample.length}.`
    });

    return { json, count: sample.length, ids: sample.map(e => e.evidenceId) };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBrandSOV = (graph: EvidenceGraph) => {
    const counts = graph.aggregations?.brandCounts || [];
    const total = counts.reduce((sum, b) => sum + b.count, 0);
    return counts.map(b => ({
        brand: b.brand,
        mentions: b.count,
        share_pct: total > 0 ? Math.round((b.count / total) * 100) : 0
    })).sort((a,b) => b.mentions - a.mentions);
};

const cleanAndParseJSON = (text: string): any => {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    cleaned = cleaned.trim();
    try { return JSON.parse(cleaned); } catch (e) {}
    try {
        const s = cleaned.indexOf('{');
        const e = cleaned.lastIndexOf('}');
        if (s !== -1 && e !== -1) return JSON.parse(cleaned.substring(s, e + 1));
    } catch(e) {}
    return { __rawText: text }; 
};

export const synthesizeAdultDiapersSection = async (
    sectionId: string,
    evidenceGraph: EvidenceGraph,
    template: TemplatePack,
    logger?: (msg: string) => void
): Promise<any> => {
    if (!API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const systemPrompt = template.promptPack.systemPrompt;
    const sectionPrompt = template.promptPack.sectionPrompts[sectionId];
    
    const evidenceCapsule = prepareTargetedEvidence(evidenceGraph, sectionId);
    const brandSov = calculateBrandSOV(evidenceGraph);

    // Diagnostics
    logger?.(`[Diagnostics] S${sectionId} Evidence: ${evidenceCapsule.count} items. Token est: ${evidenceCapsule.json.length / 4}`);

    const buildPrompt = (tierInstruction: string, isRepair = false) => `
    ${systemPrompt}
    
    ${tierInstruction}
    ${isRepair ? "CRITICAL: Previous output failed quality gate. You MUST use Search Grounding + Category Norms to fill gaps. Do not leave arrays empty." : ""}

    SECTION TASK: ${sectionPrompt}
    
    CONTEXT DATA:
    BRAND_SOV_STATS: ${JSON.stringify(brandSov)}
    EVIDENCE_CAPSULE: ${evidenceCapsule.json}
    
    OUTPUT JSON SCHEMA RULES:
    1. **STRICT JSON**: Output must be valid JSON. No wrappers.
    2. **NO EMPTY FIELDS**: Arrays must not be empty.
    3. **VERBATIMS**: Include 'consumer_statements' array or 'verbatims' fields as per schema.
    4. **EVIDENCE**: Reference 'evidence_ids' from the capsule OR use seed ids like 'SEED_AD_###'.
    5. **INDIA ONLY**: Do not reference US/EU. Use INR pricing.
    `;

    const callModel = async (model: string, config: any, tierInstruction: string, isRepair = false) => {
        const start = Date.now();
        const res = await ai.models.generateContent({
            model,
            contents: buildPrompt(tierInstruction, isRepair),
            config: {
                responseMimeType: "application/json",
                tools: [{googleSearch: {}}], 
                ...config
            }
        });
        logger?.(`[Diagnostics] Gen Time: ${Date.now() - start}ms`);
        return res;
    };

    let response;
    let attempts = 0;
    
    // --- ATTEMPT LOOP ---
    while (attempts < 2) {
        attempts++;
        try {
            // Updated thinking budget to max for deep analyst work
            const budget = attempts === 1 ? 32768 : 32768; 
            logger?.(`Tier 1 (Attempt ${attempts}): Synthesis with ${budget} budget...`);
            
            response = await callModel(
                "gemini-3-pro-preview", 
                { thinkingConfig: { thinkingBudget: budget } },
                `MODE: STRATEGIC SYNTHESIS (Attempt ${attempts})`,
                attempts > 1
            );
            
            const parsed = cleanAndParseJSON(response?.text || "{}");
            if (parsed.__rawText) throw new Error("Model returned non-JSON text");
            
            // Normalize & Merge Seeds (First Pass)
            const normalized = normalizeAdultDiapersData(sectionId, parsed);
            logger?.(`[Diagnostics] Normalized Keys: ${Object.keys(normalized).join(', ')}`);

            // Strict Analyst Gate
            const quality = evaluateAdultDiapersQuality(sectionId, normalized);
            logger?.(`[Diagnostics] Quality Score: ${quality.score}. Failures: ${quality.failures.join('|')}`);
            
            if (!quality.ok) {
                if (attempts === 1) {
                    logger?.(`Quality Failed. Retrying with Repair Prompt...`);
                    continue; 
                }
                logger?.(`Quality Failed Final. Applying Hard Seed Override.`);
                // If repair failed, force seeds via normalizer on empty object
                return normalizeAdultDiapersData(sectionId, {}); 
            }
            
            return normalized;

        } catch (e: any) {
            console.warn(`Synthesis Attempt ${attempts} Failed:`, e);
            if (attempts >= 2) break;
            await delay(1000);
        }
    }

    logger?.("Generation failed. Returning Seeded Fallback.");
    return normalizeAdultDiapersData(sectionId, {});
};
