
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
    let totalReceived = 0;
    let totalDropped = 0;
    
    // Deduplication Set: Store hashes of "normalized_text|brand|source"
    const seenHashes = new Set<string>();

    request.inputs.forEach(input => {
        const sourceTag = input.sourceTag.toLowerCase();
        
        // Debug: log what we're receiving
        const firstRow = input.rows[0]?.raw;
        const isArr = Array.isArray(firstRow);
        console.log(`[ingestion] File: ${input.fileMeta?.fileName || sourceTag}, rows: ${input.rows.length}, isArray: ${isArr}, sample keys: ${!isArr && firstRow ? Object.keys(firstRow).slice(0, 5).join(', ') : 'N/A'}, textField: ${input.mapping.canonicalFieldMap.text}`);
        
        input.rows.forEach(row => {
            totalReceived++;
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
            
            // FALLBACK: If text field mapping failed, try common column names directly
            if (!text && !Array.isArray(raw)) {
                text = raw['Post Snippet'] || raw['post snippet'] || raw['Snippet'] || 
                       raw['reviewDescription'] || raw['review'] || raw['text'] || 
                       raw['content'] || raw['body'] || raw['comment'] || raw['description'] || '';
            }

            // Filter garbage / short text
            if (!text || typeof text !== 'string' || text.trim().length < 5) {
                totalDropped++;
                return;
            }
            
            // Clean text for hashing
            const cleanText = text.trim().toLowerCase();

            // Platform extraction from Source column (Awario data has Source = "youtube.com", "amazon.in", etc.)
            let platformSource = '';
            if (!Array.isArray(raw)) {
                platformSource = (raw['Source'] || raw['source'] || raw['platform'] || raw['network'] || '').toString().toLowerCase();
            }

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
            const isCommerce = sourceTag.includes('amazon') || sourceTag.includes('flipkart') || 
                               platformSource.includes('amazon') || platformSource.includes('flipkart');
            const resolvedPlatform = platformSource || sourceTag;
            
            // Geo extraction from Awario data (City, State, Country columns)
            let city = '';
            let country = 'IN';
            if (!Array.isArray(raw)) {
                const cityVal = raw['City'] || raw['city'] || '';
                const stateVal = raw['State'] || raw['state'] || '';
                const countryVal = raw['Country'] || raw['country'] || raw['location'] || raw['Location'] || '';
                
                city = cityVal.toString().trim();
                if (!city && stateVal) city = stateVal.toString().trim();
                if (countryVal && countryVal.toString().toLowerCase().includes('india')) country = 'IN';
                else if (countryVal) country = countryVal.toString().trim();
            }
            
            // Date extraction — try direct column names first, then canonical map
            let dateISO = new Date().toISOString();
            if (!Array.isArray(raw)) {
                const directDate = raw['Mention Date'] || raw['date'] || raw['Date'] || raw['publishedAt'] || '';
                if (directDate) {
                    try { dateISO = new Date(directDate).toISOString(); } catch {}
                }
            }
            if (dateISO === new Date().toISOString()) {
                const dateField = input.mapping.canonicalFieldMap.createdAtISO;
                if (dateField) {
                    let dateVal: any;
                    if (Array.isArray(raw) && typeof dateField === 'number') dateVal = raw[dateField];
                    else if (!Array.isArray(raw) && typeof dateField === 'string') dateVal = raw[dateField];
                    if (dateVal) {
                        try { dateISO = new Date(dateVal).toISOString(); } catch {}
                    }
                }
            }

            const event: EvidenceEventV1 = {
                evidenceId: `ev_${events.length}_${Date.now().toString(36)}`,
                eventType: isCommerce ? 'COMMERCE_REVIEW' : 'SOCIAL_MENTION',
                sourceTag: isCommerce ? (platformSource.includes('flipkart') ? 'flipkart' : 'amazon') : (platformSource || 'social'),
                content: { text: text.trim(), title: (!Array.isArray(raw) ? (raw['Title'] || raw['title'] || raw['reviewTitle'] || '') : '').toString() },
                commerce: {
                    brand,
                    platform: resolvedPlatform,
                    rating,
                    currency: 'INR'
                },
                geo: { country, city: city || undefined },
                time: { createdAtISO: dateISO }
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
        qualityReport: {
            status: events.length > 50 ? 'ok' : events.length > 10 ? 'partial' : 'failed',
            rowCounts: {
                received: totalReceived,
                accepted: events.length,
                dropped: totalDropped + (totalReceived - events.length - totalDropped) // deduped
            },
            warnings: totalDropped > totalReceived * 0.1 ? [{ code: 'HIGH_DROP', message: `${totalDropped} rows dropped (empty/short text)` }] : []
        },
        events,
        aggregations: {
            brandCounts: Object.entries(brandCounts).map(([k,v]) => ({ brand: k, count: v })),
            ratingSummary: { count: ratings.length, avg: avgRating, p50: 0, p90: 0 },
            languageCounts: [{ lang: 'en', count: events.length }]
        }
    };
};
