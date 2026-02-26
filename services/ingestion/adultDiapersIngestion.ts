
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
    "Nobel Hygiene", "Myra", "Bella", "Glider", "Sathi", "b fit", "Tulips"
];

const extractBrandFromText = (text: string): string => {
    const lower = text.toLowerCase();
    for (const b of INDIA_BRANDS) {
        if (lower.includes(b.toLowerCase())) return b;
    }
    return "Generic/Other";
};

// Helper: safely get a value from a row using the canonical field map
const getField = (raw: any, fieldName: string | undefined): string => {
    if (!fieldName) return '';
    if (Array.isArray(raw)) return '';  // Array rows don't use string field names
    const val = raw[fieldName];
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

// Deterministic Ingestion for Adult Diapers
// Processes ALL rows from ALL files to ensure full dataset coverage with deduplication.
export const adultDiapersIngestion = (request: IngestRequestV1): EvidenceGraph => {
    const events: EvidenceEventV1[] = [];
    const brandCounts: Record<string, number> = {};
    const ratings: number[] = [];
    
    // Deduplication Set: Store hashes of "normalized_text" (text-only dedup for max coverage)
    const seenTextHashes = new Set<number>();

    request.inputs.forEach(input => {
        const sourceTag = input.sourceTag.toLowerCase();
        const fieldMap = input.mapping.canonicalFieldMap;
        
        input.rows.forEach(row => {
            const raw = row.raw;
            
            // ── TEXT EXTRACTION ──────────────────────────────────────────────
            let text = getField(raw, fieldMap.text);
            
            // Fallback: try common field names if mapping missed
            if (!text || text.length < 5) {
                for (const fallback of ['Post Snippet', 'reviewDescription', 'review_text', 'text', 'caption', 'content']) {
                    const val = raw[fallback];
                    if (val && String(val).trim().length >= 5) {
                        text = String(val).trim();
                        break;
                    }
                }
            }

            // Filter garbage / short text
            if (!text || text.length < 5) return;
            
            // Clean text for hashing
            const cleanText = text.trim().toLowerCase();

            // ── DEDUP ────────────────────────────────────────────────────────
            const textHash = cyrb53(cleanText);
            if (seenTextHashes.has(textHash)) return;
            seenTextHashes.add(textHash);

            // ── BRAND EXTRACTION ─────────────────────────────────────────────
            let brand = getField(raw, fieldMap.brand) || "Generic/Other";
            
            // Product name can hint at brand (Flipkart/Amazon)
            if (brand === "Generic/Other") {
                const product = getField(raw, fieldMap.product);
                if (product) {
                    const extracted = extractBrandFromText(product);
                    if (extracted !== "Generic/Other") brand = extracted;
                }
            }

            // Fallback: text-based brand extraction
            if (brand === "Generic/Other") {
                brand = extractBrandFromText(cleanText);
            }
            
            // Normalize brand names
            const txtLower = (cleanText + " " + brand).toLowerCase();
            if (txtLower.includes("friends")) brand = "Friends";
            else if (txtLower.includes("teddyy")) brand = "Teddyy";
            else if (txtLower.includes("nobel")) brand = "Friends";
            else if (txtLower.includes("lifree")) brand = "Lifree";
            else if (txtLower.includes("dignity")) brand = "Dignity";
            else if (txtLower.includes("karein")) brand = "KareIn";
            else if (txtLower.includes("tena")) brand = "TENA";
            else if (txtLower.includes("b fit") || txtLower.includes("bfit")) brand = "B Fit";
            else if (txtLower.includes("tulips")) brand = "Tulips";
            else if (txtLower.includes("romsons")) brand = "Romsons";
            else if (txtLower.includes("flamingo")) brand = "Flamingo";

            brandCounts[brand] = (brandCounts[brand] || 0) + 1;

            // ── RATING ───────────────────────────────────────────────────────
            let rating = 0;
            const ratingVal = getField(raw, fieldMap.rating);
            if (ratingVal) {
                const parsed = parseFloat(ratingVal);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
                    rating = parsed;
                    ratings.push(rating);
                }
            }

            // ── GEOGRAPHY ────────────────────────────────────────────────────
            // Extract city, state, country from the row data
            let country = getField(raw, fieldMap.location) || 'IN';
            let city = getField(raw, fieldMap.city) || '';
            let state = getField(raw, fieldMap.state) || '';
            
            // Normalize country codes
            if (country === 'India' || country === 'IN' || country === 'in') country = 'IN';
            
            // Clean city/state (remove empty/garbage)
            if (city && city.length < 2) city = '';
            if (state && state.length < 2) state = '';

            // ── PLATFORM DETECTION ───────────────────────────────────────────
            const isCommerce = sourceTag.includes('amazon') || sourceTag.includes('flipkart');
            const isSocial = sourceTag.includes('instagram') || sourceTag.includes('facebook') || sourceTag.includes('awario');
            
            // For Awario records, use the 'Source' column for sub-platform detection
            let platformName = '';
            if (isCommerce) {
                platformName = sourceTag.includes('amazon') ? 'Amazon' : 'Flipkart';
            } else if (sourceTag.includes('instagram')) {
                platformName = 'Instagram';
            } else if (sourceTag.includes('facebook')) {
                platformName = 'Facebook';
            } else {
                // Awario: try to read the Source column for accurate platform
                const awarioSource = getField(raw, fieldMap.platform) || '';
                const srcLower = awarioSource.toLowerCase();
                if (srcLower.includes('youtube')) platformName = 'YouTube';
                else if (srcLower.includes('reddit')) platformName = 'Reddit';
                else if (srcLower.includes('twitter') || srcLower === 'x') platformName = 'Twitter/X';
                else if (srcLower.includes('instagram')) platformName = 'Instagram';
                else if (srcLower.includes('facebook')) platformName = 'Facebook';
                else if (srcLower.includes('quora')) platformName = 'Quora';
                else if (srcLower.includes('news') || srcLower.includes('blog')) platformName = 'News & Blogs';
                else if (srcLower.includes('web')) platformName = 'Web';
                else if (srcLower.includes('vimeo')) platformName = 'Vimeo';
                else platformName = awarioSource || 'Social Listening';
            }

            // ── DATE ─────────────────────────────────────────────────────────
            const dateStr = getField(raw, fieldMap.createdAtISO);
            let createdAt = new Date().toISOString();
            if (dateStr) {
                try {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) createdAt = d.toISOString();
                } catch { /* keep default */ }
            }

            // ── CONSTRUCT EVENT ──────────────────────────────────────────────
            const event: EvidenceEventV1 = {
                evidenceId: `ev_${events.length}_${Date.now().toString(36)}`,
                eventType: isCommerce ? 'COMMERCE_REVIEW' : 'SOCIAL_MENTION',
                sourceTag: sourceTag.includes('amazon') ? 'amazon' 
                         : sourceTag.includes('flipkart') ? 'flipkart' 
                         : sourceTag.includes('instagram') ? 'instagram'
                         : sourceTag.includes('facebook') ? 'facebook'
                         : 'social',
                content: { 
                    text: text.trim(),
                    platform: platformName
                },
                commerce: {
                    brand,
                    platform: platformName,
                    rating,
                    currency: 'INR'
                },
                geo: { 
                    country: country || 'IN',
                    city: city || undefined,
                    state: state || undefined
                },
                time: { createdAtISO: createdAt }
            };
            events.push(event);
        });
    });

    // Stats
    const avgRating = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0;
    
    // Geography summary
    const cityCounts: Record<string, number> = {};
    events.forEach(e => {
        if (e.geo?.city) cityCounts[e.geo.city] = (cityCounts[e.geo.city] || 0) + 1;
    });
    const geoTagged = events.filter(e => e.geo?.city).length;
    
    console.log(`[adultDiapersIngestion] ${events.length} events, ${Object.keys(brandCounts).length} brands, ${Object.keys(cityCounts).length} cities (${geoTagged} geo-tagged)`);

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
