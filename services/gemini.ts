
import { ProjectId, TemplatePack, EvidenceGraph, IngestRequestV1 } from "../types";
import { INGESTION_SYSTEM_PROMPT } from "./prompts";
import { adultDiapersIngestion } from "./ingestion/adultDiapersIngestion";
import { babyDiapersIngestion } from "./ingestion/babyDiapersIngestion";
import { disposablePeriodPantiesIngestion } from "./ingestion/disposablePeriodPantiesIngestion";
import { callLLM } from "../lib/llmClient";

// LLM calls now go through the server-side proxy (/api/llm); no client-side key.

// UTILS
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanAndParseJSON = (text: string): any => {
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.trim();

  // 1. Try Parse As Is
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // 2. Try Extracting JSON Object or Array
  try {
      const firstCurly = cleaned.indexOf('{');
      const firstSquare = cleaned.indexOf('[');
      
      let start = -1;
      let end = -1;

      // Determine if it looks more like an object or array based on what comes first
      if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
          start = firstCurly;
          end = cleaned.lastIndexOf('}');
      } else if (firstSquare !== -1) {
          start = firstSquare;
          end = cleaned.lastIndexOf(']');
      }

      if (start !== -1 && end !== -1 && end > start) {
          const candidate = cleaned.substring(start, end + 1);
          return JSON.parse(candidate);
      }
  } catch (e) {
      // Continue
  }

  console.warn("JSON Parse Failed, returning raw text wrapper");
  return { __rawText: text }; // Special fallback contract
};

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await fn();
        } catch (error: any) {
            // Robust check for 429 (Too Many Requests) or 503 (Service Unavailable / High Demand)
            const errStr = JSON.stringify(error || {});
            const isRetryable = 
                error?.status === 429 || 
                error?.status === 503 || 
                errStr.includes('429') || 
                errStr.includes('503') || 
                errStr.includes('UNAVAILABLE') || 
                errStr.includes('high demand');

            if (isRetryable) {
                attempt++;
                if (attempt > retries) throw error;
                const wait = Math.pow(2, attempt) * baseDelay + Math.random() * 1000;
                console.warn(`[Gemini] Retryable Error (${attempt}/${retries}). Waiting ${wait.toFixed(0)}ms...`);
                await delay(wait);
            } else {
                throw error;
            }
        }
    }
    throw new Error("Max retries exceeded");
};

export const ingestRawData = async (ingestRequest: string | IngestRequestV1): Promise<EvidenceGraph | null> => {
  const requestObj = typeof ingestRequest === 'string' ? JSON.parse(ingestRequest) : ingestRequest;
  
  // BRANCH: Adult Diapers Deterministic Ingestion
  if (requestObj.projectId === 'adult-diapers') {
      console.log("Using Deterministic Ingestion for Adult Diapers");
      return adultDiapersIngestion(requestObj);
  }

  // BRANCH: Baby Diapers (Lovingle) Deterministic Ingestion
  if (requestObj.projectId === 'baby-diapers') {
      console.log("Using Deterministic Ingestion for Baby Diapers");
      return babyDiapersIngestion(requestObj);
  }

  // BRANCH: Disposable Period Panties Deterministic Ingestion
  if (requestObj.projectId === 'disposable-period-panties') {
      console.log("Using Deterministic Ingestion for Disposable Period Panties");
      return disposablePeriodPantiesIngestion(requestObj);
  }

  // BRANCH: Reusable Period Panties — same data format, reuse femcare ingestion
  if (requestObj.projectId === 'reusable-period-panties') {
      console.log("Using Deterministic Ingestion for Reusable Period Panties");
      return disposablePeriodPantiesIngestion(requestObj);
  }

  // BRANCH: Sanitary Pads — same Awario/Apify data format, reuse femcare ingestion
  if (requestObj.projectId === 'sanitary-pads') {
      console.log("Using Deterministic Ingestion for Sanitary Pads");
      return disposablePeriodPantiesIngestion(requestObj);
  }

  const requestString = JSON.stringify(requestObj, null, 2);

  // AUDIT FIX: Increased limit from 30k to 1MB to ensure ALL files are processed.
  const payload = requestString.length > 1000000 
    ? requestString.substring(0, 1000000) + "\n...[TRUNCATED_SAFETY_LIMIT]..." 
    : requestString;

  try {
    return await retryWithBackoff(async () => {
        const text = await callLLM({
            system: INGESTION_SYSTEM_PROMPT,
            prompt: `INGEST REQUEST V1:\n${payload}`,
            jsonMode: true,
        });
        if (text === null) return null; // no provider configured -> caller handles
        return cleanAndParseJSON(text || "{}");
    });
  } catch (error) {
    console.error("Ingestion Error:", error);
    throw error;
  }
};

export const generateSectionContent = async (
  template: TemplatePack,
  sectionId: string,
  evidenceJson: string,
  modelName?: string
): Promise<any> => {
  const sectionPrompt = template.promptPack.sectionPrompts[sectionId] || "";
  const systemPrompt = template.promptPack.systemPrompt;

  // Strict schema enforcement injection
  const strictEnforcement = `
    CRITICAL OUTPUT RULES:
    1. Output strictly valid JSON.
    2. Do NOT wrap in markdown \`\`\`json blocks.
    3. For any list fields (e.g. 'switching_dynamics', 'trigger_clusters'), ALWAYS return an ARRAY []. 
       Never return a single object. If only one item, wrap it in [].
    4. DATA COMPLETENESS: You are provided with a large evidence set. Use it. Do not return empty lists.
    5. EVIDENCE: Every insight must have "evidence_ids" linked to the provided events.
  `;

  const fullPrompt = `
    ${systemPrompt}
    ${strictEnforcement}
    
    SECTION TASK: ${sectionPrompt}
    
    DATA CONTEXT:
    ${evidenceJson}
  `;

  try {
    return await retryWithBackoff(async () => {
        const text = await callLLM({
            prompt: fullPrompt,
            jsonMode: true,
            model: modelName,
            gemini: { thinkingBudget: 2048 },
        });
        if (text === null) return null; // no provider -> seed upstream
        const parsed = cleanAndParseJSON(text || "{}");
        if (parsed.__rawText) throw new Error("Model returned non-JSON text");
        return parsed;
    });
  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
};

export const repairSectionContent = async (
    brokenContent: any, 
    validationError: string, 
    template: TemplatePack, 
    sectionId: string
): Promise<any> => {
    const repairPrompt = `
        FIX MALFORMED JSON/CONTENT.
        Original Task: ${template.promptPack.sectionPrompts[sectionId]}
        Error: ${validationError}
        
        INSTRUCTION: Return FIXED, VALID JSON matching the schema. 
        Ensure no fields are undefined/null if they are required arrays.
    `;

    try {
        const text = await callLLM({ prompt: repairPrompt, jsonMode: true });
        if (text === null) return null;
        return cleanAndParseJSON(text || "{}");
    } catch (e) {
        return null;
    }
};
