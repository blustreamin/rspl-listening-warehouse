
// Lightweight validation logic
const isArray = (v: any) => Array.isArray(v);
const hasLength = (v: any, min: number = 1) => isArray(v) && v.length >= min;

export const validateIncontinenceManagement = (data: any): boolean => {
    if (!data) return false;
    if (!data.profiles) {
        console.warn("[Validator][Sinco] Missing 'profiles' root key.");
        return false;
    }
    const { overall_category, self_use, decider_for_others, caregiver_bedridden } = data.profiles;
    
    const errors: string[] = [];
    if (!overall_category) errors.push("Missing overall_category");
    if (!self_use) errors.push("Missing self_use");
    if (!decider_for_others) errors.push("Missing decider_for_others");
    if (!caregiver_bedridden) errors.push("Missing caregiver_bedridden");

    if (errors.length > 0) {
        console.warn("[Validator][Sinco] Errors:", errors.join(", "));
        return false;
    }
    return true;
};

export const validateAwarenessPerception = (data: any): boolean => {
    const errors: string[] = [];
    if (!hasLength(data.awareness_depth, 1)) errors.push("awareness_depth empty");
    if (!hasLength(data.perceptions_and_stigma, 1)) errors.push("perceptions_and_stigma empty");
    
    if (errors.length > 0) {
        console.warn("[Validator][Awareness] Errors:", errors.join(", "));
        return false;
    }
    return true;
};

export const validateUserProfiles = (data: any): boolean => {
    if (!data) return false;
    const errors: string[] = [];
    
    const u = data.users_trialists;
    const n = data.non_users;
    
    if (!u) errors.push("Missing users_trialists");
    else {
        if (!hasLength(u.triggers_to_purchase, 1)) errors.push("users.triggers_to_purchase empty");
        if (!hasLength(u.retention_intent, 1)) errors.push("users.retention_intent empty");
    }
    
    if (!n) errors.push("Missing non_users");
    else {
        if (!hasLength(n.barriers_to_trial, 1)) errors.push("non_users.barriers_to_trial empty");
    }

    if (errors.length > 0) {
        console.warn("[Validator][UserProfiles] Errors:", errors.join(", "));
        return false;
    }
    return true;
};

export const validateBehavioural = (data: any): boolean => {
    if (!data) return false;
    const errors: string[] = [];
    
    if (!hasLength(data.occasions_of_use, 1)) errors.push("occasions_of_use empty");
    // V2: accept format_switching OR brand_switching OR legacy switching_patterns
    const hasSwitching = hasLength(data.format_switching, 1) || hasLength(data.brand_switching, 1) || hasLength(data.switching_patterns, 1);
    if (!hasSwitching) errors.push("no switching data");
    
    if (!data.purchase_behaviour) errors.push("purchase_behaviour missing");
    else {
        if (!hasLength(data.purchase_behaviour.channels, 1)) errors.push("purchase_behaviour.channels empty");
    }

    if (errors.length > 0) {
        console.warn("[Validator][Behavioural] Errors:", errors.join(", "));
        return false;
    }
    return true;
};

export const validateBrandLandscape = (data: any): boolean => {
    if (!data) return false;
    const errors: string[] = [];
    
    if (!hasLength(data.brands, 2)) errors.push("brands count < 2 (found " + (data.brands?.length || 0) + ")");
    
    if (errors.length > 0) {
        console.warn("[Validator][BrandLandscape] Errors:", errors.join(", "));
        return false;
    }
    return true;
};
