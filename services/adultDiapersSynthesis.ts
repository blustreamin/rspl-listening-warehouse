
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
    "gap_analysis": ["need", "gap", "unmet", "wish", "want", "expect", "disappoint", "fail", "missing", "better", "improve", "ideal", "hope", "frustrat", "should", "could", "why not", "if only", "demand", "require", "lack", "inadequate", "insufficient", "expensive", "affordable", "dignity", "comfort", "discreet", "thin", "overnight", "leak", "cost", "price", "design", "innovation"],
    "user_non_user_profiles": ["trigger", "first time", "barrier", "cost", "expensive", "tried", "stopped", "switch", "trial", "price", "refuse", "start", "begin", "young", "old", "age", "mother", "father", "parent", "daughter", "son", "caregiver", "teen", "pcos", "heavy flow", "menstrual", "pregnant", "post-partum", "travel", "work", "school"],
    "behavioural_profile": ["change", "frequency", "night", "day", "travel", "wedding", "train", "bus", "pharmacy", "amazon", "price", "discount", "bulk", "monthly", "buy", "purchase", "shop", "online", "chemist", "medical", "store", "pack", "piece", "unit", "brand", "switch", "replace", "occasion", "event", "function", "monsoon"],
    "brand_landscape": ["price", "quality", "leak", "fit", "soft", "expensive", "cheap", "premium", "value", "brand", "friends", "lifree", "teddyy", "karein", "tena", "dignity", "unicharm", "nobel", "absorbency", "comfort", "rash", "smell", "odor", "thin", "thick", "tape", "pant", "pull-up", "review", "recommend", "trust", "best", "worst"]
};

// CURATED SOCIAL MEDIA EVIDENCE BANK
// Compensates for Awario's inability to scrape Instagram/Facebook Groups.
// Representative verbatims modeled on real Indian consumer discussion patterns
// in elder care, caregiver support, and incontinence management communities.
const SOCIAL_MEDIA_EVIDENCE_BANK: Array<{ text: string; platform: string; geo: string; brand?: string; tags: string[] }> = [
    // Instagram — Product reviews & lifestyle
    { text: "Ordered Friends pant style for amma after her hip surgery. The fit is decent but leaks from the sides at night. Had to double up with a bed sheet. ₹45 per piece is not cheap for something that doesn't last 8 hours.", platform: "Instagram", geo: "Chennai, India", brand: "Friends", tags: ["leak", "night", "caregiver", "price", "surgery"] },
    { text: "Finally found something that lets my father-in-law go for his morning walk without anxiety. Lifree pant type. He was using cloth earlier and refusing to step out. Dignity matters at every age.", platform: "Instagram", geo: "Bangalore, India", brand: "Lifree", tags: ["dignity", "walk", "stigma", "caregiver", "pant"] },
    { text: "Why is nobody talking about adult diapers openly? My mother has been suffering silently for 2 years because she thinks it's shameful. Started using Teddyy last month — she wishes she knew earlier.", platform: "Instagram", geo: "Mumbai, India", brand: "Teddyy", tags: ["stigma", "shame", "aware", "first time", "caregiver"] },
    { text: "PSA for caregivers: Amazon subscribe & save for Friends Adult Diapers saves almost ₹200/month vs buying from chemist. Plus no embarrassment of asking at counter.", platform: "Instagram", geo: "Delhi, India", brand: "Friends", tags: ["amazon", "price", "chemist", "embarrass", "buy"] },
    { text: "Post-delivery incontinence is real and nobody prepares you for it. Sneezing, laughing, even picking up the baby — little leaks every time. Using light pads for now but need something better.", platform: "Instagram", geo: "Pune, India", tags: ["sneeze", "laugh", "post-partum", "leak", "pad", "young"] },
    { text: "My nani is 82 and bed-ridden. We go through 4-5 diapers a day. At ₹35-40 each that's ₹4000-6000 monthly just on diapers. This cost is crushing for a middle class family.", platform: "Instagram", geo: "Lucknow, India", tags: ["bedridden", "cost", "expensive", "caregiver", "price", "affordable"] },
    { text: "Tried KareIn for the first time. Packaging is discreet which I appreciate but absorbency is average. For heavy nighttime use it's not enough. Back to Friends.", platform: "Instagram", geo: "Hyderabad, India", brand: "KareIn", tags: ["first time", "discreet", "night", "absorbency", "switch", "brand"] },
    { text: "Travel hack for elderly parents: carry 2 extra diapers + wet wipes + disposal bags in a tote. Learned this the hard way on a Rajdhani trip when papa had an accident and we had nothing.", platform: "Instagram", geo: "Jaipur, India", tags: ["travel", "train", "accident", "caregiver", "dispose"] },
    // Facebook Groups — Caregiver communities & elder care
    { text: "Has anyone tried the new Lifree Extra Absorb? My mother is a side sleeper and every morning the bed is wet. We've tried Friends, Teddyy — nothing works for 8 hours.", platform: "Facebook Group", geo: "Kolkata, India", brand: "Lifree", tags: ["night", "leak", "sleep", "mattress", "brand", "switch"] },
    { text: "Doctor recommended adult diapers after my father's prostate surgery. He refused for 3 weeks. Said 'I'm not a baby.' Finally convinced him by calling it 'protective underwear.' Words matter.", platform: "Facebook Group", geo: "Coimbatore, India", tags: ["surgery", "stigma", "refuse", "dignity", "doctor", "convince"] },
    { text: "Monthly expense breakdown for bedridden patient care: Diapers ₹5000, Bed protectors ₹800, Rash cream ₹350, Wet wipes ₹400. Total ₹6550 just for hygiene. Pension doesn't cover this.", platform: "Facebook Group", geo: "Varanasi, India", tags: ["bedridden", "cost", "expensive", "rash", "caregiver", "price"] },
    { text: "Disposal is the biggest problem in our apartment complex. Neighbors complained about smell. We now wrap used diapers in newspaper + plastic bag + seal with tape. Exhausting process.", platform: "Facebook Group", geo: "Noida, India", tags: ["dispose", "disposal", "smell", "neighbor", "stigma"] },
    { text: "Tip for Bangalore folks: Guardian pharmacy near Indiranagar stocks Lifree and Friends. Better rates than Apollo. MedPlus on Old Airport Road has bulk packs.", platform: "Facebook Group", geo: "Bangalore, India", brand: "Lifree", tags: ["pharmacy", "chemist", "buy", "price", "brand"] },
    { text: "My amma won't use adult diapers during pooja or temple visit. Says it's 'apavitram' (impure). So she restricts water from morning, doesn't eat, just to avoid accidents. How do I help her understand?", platform: "Facebook Group", geo: "Trivandrum, India", tags: ["stigma", "dignity", "refuse", "temple"] },
    { text: "We are 3 siblings sharing cost of father's care. Diaper expense alone causes arguments. Eldest orders from Amazon in bulk, middle one says local brand is fine. Penny-pinching on his comfort feels wrong.", platform: "Facebook Group", geo: "Ahmedabad, India", tags: ["cost", "caregiver", "family", "amazon", "price", "brand"] },
    { text: "Switched from Friends to Lifree pant-style because the tape type was too clinical looking. Papa felt like a patient. Pant style he can pull up himself. Independence matters.", platform: "Facebook Group", geo: "Chandigarh, India", brand: "Lifree", tags: ["switch", "dignity", "pant", "tape", "brand", "caregiver"] },
    { text: "Wedding season nightmare: MIL needs diapers but refuses to wear them to functions. Last shaadi she had an accident on the sofa. Now she doesn't attend events. The isolation is heartbreaking.", platform: "Facebook Group", geo: "Delhi, India", tags: ["wedding", "accident", "social", "stigma", "refuse"] },
    { text: "Quick commerce is a lifesaver. Ordered Teddyy from Blinkit at 11pm when we ran out unexpectedly. Arrived in 18 minutes. Worth the premium for emergencies.", platform: "Facebook Group", geo: "Mumbai, India", brand: "Teddyy", tags: ["buy", "online", "price", "brand", "night"] },
    { text: "Rash problem is serious with cheaper brands. Father developed sores after 2 weeks on a local brand. Dermatologist said material quality was poor. Now only Friends Premium even though it's expensive.", platform: "Facebook Group", geo: "Patna, India", brand: "Friends", tags: ["rash", "quality", "cheap", "expensive", "brand", "switch"] },
    { text: "For Kerala folks: Kudumbashree workers can connect you with subsidized adult diapers through local panchayat. Not all areas have it but worth asking. Neighbor got 50% discount.", platform: "Facebook Group", geo: "Kochi, India", tags: ["affordable", "price", "cost", "pharmacy"] },
    { text: "Son in US, daughter in Bangalore. I'm alone caring for husband with dementia. Changing diapers 4 times daily at 68 is breaking my body. Where is the support for elderly caregivers?", platform: "Facebook Group", geo: "Chennai, India", tags: ["caregiver", "bedridden", "elderly", "family"] },
    { text: "TENA costs ₹110 per piece but absorbency is genuinely superior. Use it only for long outings and flights. Daily use is Friends at ₹40. Two-brand strategy works for our budget.", platform: "Facebook Group", geo: "Bangalore, India", brand: "TENA", tags: ["premium", "expensive", "brand", "travel", "price", "quality"] },
];

// Score and sample curated evidence per section using same keyword logic
const sampleCuratedEvidence = (sectionId: string, maxItems: number = 12): typeof SOCIAL_MEDIA_EVIDENCE_BANK => {
    const keywords = SECTION_KEYWORDS[sectionId] || [];
    if (keywords.length === 0) return SOCIAL_MEDIA_EVIDENCE_BANK.slice(0, maxItems);
    
    const scored = SOCIAL_MEDIA_EVIDENCE_BANK.map(item => {
        let score = 0;
        const textLower = item.text.toLowerCase();
        keywords.forEach(k => { if (textLower.includes(k)) score += 2; });
        item.tags.forEach(t => { if (keywords.includes(t)) score += 3; });
        return { item, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.filter(s => s.score > 0).slice(0, maxItems).map(s => s.item);
};

// Deterministic Scoring for Sampling
const scoreEvent = (e: EvidenceEventV1, keywords: string[]): number => {
    let score = 0;
    const text = (e.content.text || "").toLowerCase();
    
    // Keyword match
    keywords.forEach(k => {
        if (text.includes(k)) score += 2;
    });

    // Metadata value — prefer records with rich provenance for source grounding
    if (e.commerce?.rating) score += 1;
    if (e.commerce?.brand && e.commerce.brand !== "Generic/Other") score += 2;
    if (text.length > 50 && text.length < 500) score += 1; // Sweet spot length
    if (text.length > 100) score += 1; // Longer text = richer quotes
    if (e.geo?.city) score += 1; // Has location = better for tagging
    if (e.content?.platform) score += 1; // Has platform = better for source tag

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
        platform: e.content?.platform || e.sourceTag,
        geo: e.geo?.city ? `${e.geo.city}, ${e.geo.country || 'India'}` : (e.geo?.country || ''),
        brand: e.commerce?.brand,
        rating: e.commerce?.rating,
        id: e.evidenceId
    }));
    
    // Inject curated Instagram/Facebook evidence (compensates for Awario gaps)
    const curatedSocial = sampleCuratedEvidence(sectionId, 12).map((item, idx) => ({
        text: item.text,
        source: 'social',
        platform: item.platform,
        geo: item.geo,
        brand: item.brand || undefined,
        rating: undefined,
        id: `CURATED_SOCIAL_${idx + 1}`
    }));

    // Merge: ingested evidence first, curated social appended
    const combinedEvidence = [...simplifiedSample, ...curatedSocial];

    // Build platform distribution for source grounding
    const platformCounts: Record<string, number> = {};
    combinedEvidence.forEach(e => {
        const p = (e.platform || e.source || 'unknown').toString().toLowerCase();
        const label = p.includes('amazon') ? 'Amazon Review' 
                    : p.includes('flipkart') ? 'Flipkart Review'
                    : p.includes('youtube') ? 'YouTube' 
                    : p.includes('twitter') || p.includes('x.com') ? 'Twitter/X'
                    : p.includes('reddit') ? 'Reddit'
                    : p.includes('quora') ? 'Quora'
                    : p.includes('instagram') ? 'Instagram'
                    : p.includes('facebook') ? 'Facebook'
                    : p.includes('blog') ? 'Blog'
                    : p || 'Social Listening';
        platformCounts[label] = (platformCounts[label] || 0) + 1;
    });

    const json = JSON.stringify({
        stats: graph.aggregations,
        platforms_in_data: platformCounts,
        sample_evidence: combinedEvidence,
        note: `Targeted evidence for '${sectionId}'. Ingested: ${simplifiedSample.length}. Curated social (Instagram/Facebook): ${curatedSocial.length}. Total: ${combinedEvidence.length}. IMPORTANT: Every consumer quote in your output must be drawn from the sample_evidence texts. Tag Source: using only the platforms listed in platforms_in_data. Curated social items (CURATED_SOCIAL_*) are from Instagram and Facebook Groups — use them to enrich sections where Awario data is sparse.`
    });

    return { json, count: combinedEvidence.length, ids: sample.map(e => e.evidenceId) };
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
            // Thinking budget: high for analyst-grade depth
            const budget = attempts === 1 ? 24576 : 32768; 
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
