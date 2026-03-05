
// ANALYST GRADE QUALITY GATE (Adult Diapers Only)

export interface QualityResult {
    ok: boolean;
    failures: string[];
    score: number;
}

const checkArray = (arr: any[], min: number, name: string, failures: string[]) => {
    if (!Array.isArray(arr) || arr.length < min) {
        failures.push(`${name} count < ${min} (found ${Array.isArray(arr) ? arr.length : 0})`);
        return false;
    }
    return true;
};

// --- SECTION EVALUATORS ---

const evalSinco = (data: any, failures: string[]) => {
    const profiles = data.profiles || {};
    const keys = ['overall_category', 'self_use', 'decider_for_others', 'caregiver_bedridden'];
    
    keys.forEach(key => {
        const p = profiles[key];
        if (!p) {
            failures.push(`Missing profile: ${key}`);
            return;
        }
        checkArray(p.incontinence_issue, 2, `${key}.triggers`, failures);      // was 1, now 2
        checkArray(p.worst_moments, 3, `${key}.suffering_moments`, failures);   // was 1, now 3
        checkArray(p.life_impact, 2, `${key}.life_impact`, failures);           // NEW CHECK
        checkArray(p.solutions, 1, `${key}.solutions`, failures);              // NEW CHECK
        checkArray(p.verbatims, 3, `${key}.verbatims`, failures);              // was 1, now 3
    });
};

const evalSawar = (data: any, failures: string[]) => {
    checkArray(data.misconceptions, 5, "misconceptions", failures);             // was 3, now 5
    checkArray(data.perceptions_and_stigma, 4, "stigma_drivers", failures);     // was 2, now 4
    checkArray(data.decision_journey, 5, "decision_journey", failures);         // NEW CHECK
    const statements = data.consumer_statements || data.section_summary?.consumer_statements;
    if (statements) checkArray(statements, 4, "consumer_statements", failures); // was 1, now 4
};

const evalSuser = (data: any, failures: string[]) => {
    const u = data.user_profiles || data.users_trialists?.detailed_profiles || [];
    const n = data.non_user_profiles || data.non_users?.detailed_profiles || [];
    
    checkArray(u, 5, "user_profiles", failures);
    checkArray(n, 5, "non_user_profiles", failures);

    // Deep check per profile — require 3 verbatims each
    u.forEach((p: any, i: number) => {
        if (!p.verbatims || p.verbatims.length < 3) failures.push(`user_profiles[${i}].verbatims < 3`);
    });
    n.forEach((p: any, i: number) => {
        if (!p.verbatims || p.verbatims.length < 3) failures.push(`non_user_profiles[${i}].verbatims < 3`);
    });
};

const evalSbeha = (data: any, failures: string[]) => {
    checkArray(data.occasions_of_use, 5, "usage_occasions", failures);

    // V2: format_switching + brand_switching replace legacy switching_patterns
    const hasSwitching = (data.format_switching?.length > 0) || (data.brand_switching?.length > 0) || (data.switching_patterns?.length > 0);
    if (!hasSwitching) failures.push("no switching data (format_switching/brand_switching/switching_patterns)");
    
    const pb = data.purchase_behaviour || {};
    checkArray(pb.channels, 3, "purchase.channels", failures);
    checkArray(pb.pack_sizes, 2, "purchase.pack_sizes", failures);

    // Consumer statements
    const statements = data.consumer_statements;
    checkArray(statements, 3, "behavioural.consumer_statements", failures);
};

const evalSbran = (data: any, failures: string[]) => {
    checkArray(data.brands, 6, "brands", failures);                             // was 3, now 6
    
    (data.brands || []).forEach((b: any, i: number) => {
        if (!b.brand || b.brand.includes("Unknown")) failures.push(`Brand[${i}] is Unknown`);
        checkArray(b.attribute_scale, 5, `Brand[${b.brand}].attributes`, failures);  // was 3, now 5
        checkArray(b.verbatims, 4, `Brand[${b.brand}].verbatims`, failures);         // NEW: require 4
    });
};

// --- MAIN EXPORT ---

export const evaluateAdultDiapersQuality = (sectionId: string, normalizedData: any): QualityResult => {
    const failures: string[] = [];
    
    if (sectionId === 'incontinence_management') evalSinco(normalizedData, failures);
    else if (sectionId === 'awareness_perception') evalSawar(normalizedData, failures);
    else if (sectionId === 'user_non_user_profiles') evalSuser(normalizedData, failures);
    else if (sectionId === 'behavioural_profile') evalSbeha(normalizedData, failures);
    else if (sectionId === 'brand_landscape') evalSbran(normalizedData, failures);

    const score = Math.max(0, 100 - (failures.length * 10));
    
    return {
        ok: failures.length === 0,
        failures,
        score
    };
};
