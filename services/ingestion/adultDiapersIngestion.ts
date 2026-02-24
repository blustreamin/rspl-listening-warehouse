
import { IngestRequestV1, EvidenceGraph, EvidenceEventV1 } from '../../types';

// Helper to create a stable hash for text content to prevent duplicates across files
const cyrb53 = (str: string, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// INDIA MARKET BRAND LIST FOR FALLBACK EXTRACTION
const INDIA_BRANDS = [
    "TENA", "Friends", "Seni", "Dignity", "Pampers", "Huggies", 
    "Molicare", "DispoVan", "Lifree", "KareIn", "Teddyy", 
    "Romsons", "Superio", "Wetex", "Aveda", "Liberty", "Vissco", "KosmoCare",
    "Nobel Hygiene", "Myra", "Bella", "Glider", "Sathi"
];

const extractBrandFromText = (text: string): string => {
    const lower = text.toLowerCase();
    // Sort by length desc to match "Pee Safe" before "Pee" if applicable, though list is specific
    for (const b of INDIA_BRANDS) {
        // Simple inclusion check is robust enough for ingestion heuristics
        if (lower.includes(b.toLowerCase())) return b;
    }
    return "Generic/Other";
};

// Deterministic Ingestion for Adult Diapers
// Processes ALL rows from ALL files to ensure full dataset coverage with deduplication.
export const adultDiapersIngestion = (request: IngestRequestV1): EvidenceGraph => {
    const events: EvidenceEventV1[] = [];
    const brandCounts: Record<string, number> = {};
    const ratings: number[] = [];
    
    // Deduplication Set: Store hashes of "normalized_text|brand|source"
    const seenHashes = new Set<string>();

    request.inputs.forEach(input => {
        const sourceTag = input.sourceTag.toLowerCase();
        
        input.rows.forEach(row => {
            const raw = row.raw;
            // Map via Canonical Field Map
            const textField = input.mapping.canonicalFieldMap.text;
            
            // Handle array based row (XLSX) or object based row (JSON/CSV)
            let text = '';
            if (Array.isArray(raw) && typeof textField === 'number') {
                text = raw[textField];
            } else if (!Array.isArray(raw) && typeof textField === 'string') {
                text = raw[textField];
            }

            // Filter garbage / short text
            if (!text || typeof text !== 'string' || text.length < 5) return;
            
            // Clean text for hashing
            const cleanText = text.trim().toLowerCase();

            // Brand Extraction
            let brand = "Generic/Other";
            const brandField = input.mapping.canonicalFieldMap.brand;
            if (brandField) {
                if (Array.isArray(raw) && typeof brandField === 'number') brand = raw[brandField] || brand;
                else if (!Array.isArray(raw) && typeof brandField === 'string') brand = raw[brandField] || brand;
            }

            // Fallback Extraction: If brand is generic but text mentions a top brand
            if ((!brand || brand === "Generic/Other") && cleanText) {
                const extracted = extractBrandFromText(cleanText);
                if (extracted !== "Generic/Other") {
                    brand = extracted;
                }
            }
            
            // Normalize Brand (India Market Context)
            const txtLower = (cleanText + " " + brand).toLowerCase();
            if (txtLower.includes("whisper")) brand = "Whisper";
            else if (txtLower.includes("nua")) brand = "Nua";
            else if (txtLower.includes("plush")) brand = "Plush";
            else if (txtLower.includes("evereve")) brand = "Evereve";
            else if (txtLower.includes("sirona")) brand = "Sirona";
            else if (txtLower.includes("pee safe") || txtLower.includes("peesafe")) brand = "Pee Safe";
            else if (txtLower.includes("carmesi")) brand = "Carmesi";
            else if (txtLower.includes("friends")) brand = "Friends";
            else if (txtLower.includes("teddyy")) brand = "Teddyy";
            else if (txtLower.includes("nobel")) brand = "Friends"; // Parent company
            else if (txtLower.includes("lifree")) brand = "Lifree";
            else if (txtLower.includes("dignity")) brand = "Dignity";
            else if (txtLower.includes("karein")) brand = "KareIn";
            else if (txtLower.includes("elderease")) brand = "ElderEase";
            else if (txtLower.includes("seniors")) brand = "Generic Senior";

            // CHECK DEDUPLICATION
            const eventHash = `${cyrb53(cleanText)}|${brand}|${sourceTag}`;
            if (seenHashes.has(eventHash)) {
                return; // Skip duplicate
            }
            seenHashes.add(eventHash);

            brandCounts[brand] = (brandCounts[brand] || 0) + 1;

            // Rating Extraction
            let rating = 0;
            const ratingField = input.mapping.canonicalFieldMap.rating;
            if (ratingField) {
                let val: any;
                if (Array.isArray(raw) && typeof ratingField === 'number') val = raw[ratingField];
                else if (!Array.isArray(raw) && typeof ratingField === 'string') val = raw[ratingField];
                
                if (val) {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                        rating = parsed;
                        ratings.push(rating);
                    }
                }
            }

            // Construct Event
            const event: EvidenceEventV1 = {
                evidenceId: `ev_${events.length}_${Date.now().toString(36)}`,
                eventType: sourceTag.includes('amazon') || sourceTag.includes('flipkart') ? 'COMMERCE_REVIEW' : 'SOCIAL_MENTION',
                sourceTag: sourceTag.includes('amazon') ? 'amazon' : sourceTag.includes('flipkart') ? 'flipkart' : 'social',
                content: { text: text.trim() }, // Keep original casing
                commerce: {
                    brand,
                    platform: sourceTag,
                    rating,
                    currency: 'INR'
                },
                geo: { country: 'IN' },
                time: { createdAtISO: new Date().toISOString() } // simplified
            };
            events.push(event);
        });
    });

    // Stats
    const avgRating = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0;

    return {
        schemaVersion: "evidence_graph_v1",
        projectId: request.projectId,
        generatedAtISO: new Date().toISOString(),
        events,
        aggregations: {
            brandCounts: Object.entries(brandCounts).map(([k,v]) => ({ brand: k, count: v })),
            ratingSummary: { count: ratings.length, avg: avgRating, p50: 0, p90: 0 },
            languageCounts: [{ lang: 'en', count: events.length }]
        }
    };
};
