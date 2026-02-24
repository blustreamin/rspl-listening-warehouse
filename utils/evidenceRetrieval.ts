
import { EvidenceGraph, EvidenceEventV1 } from '../types';

/**
 * simple fuzzy search for evidence in the graph
 */
export const searchEvidence = (graph: EvidenceGraph, query: string, limit: number = 3): EvidenceEventV1[] => {
    if (!graph.events || graph.events.length === 0) return [];
    
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 3 && !['evidence', 'dataset', 'explicit', 'data'].includes(t));
    if (terms.length === 0) return [];

    const candidates = graph.events.map(e => {
        const text = (e.content?.text || '').toLowerCase();
        let score = 0;
        terms.forEach(t => {
            if (text.includes(t)) score++;
        });
        return { event: e, score };
    });

    return candidates
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(c => c.event);
};

/**
 * Generates a structured inference object when no evidence is found.
 * This replaces the "No explicit evidence" string.
 */
export const generateInferenceFallback = (context: string, topic: string) => {
    return {
        text: `Likely ${topic} factor based on category norms.`,
        insight: `While specific mentions are low, ${topic} is a standard category driver.`,
        isInference: true,
        confidence: "LOW",
        reason: `Inferred from general ${context} patterns absent explicit signals.`
    };
};

/**
 * Detects if a string is the "lazy" LLM output we want to ban.
 */
export const isLazyOutput = (text: any): boolean => {
    if (typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    return lower.includes('no explicit evidence') || 
           lower.includes('insufficient data') || 
           lower.includes('data limitation');
};
