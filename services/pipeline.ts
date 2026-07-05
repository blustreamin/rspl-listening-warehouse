
import { EvidenceGraph, ProjectId, Quote, RunInspectorData, SectionOutput, EvidenceEventV1, TemplatePack } from '../types';
import { TEMPLATE_REGISTRY } from '../constants/templates';
import { RAW_MENTIONS } from '../constants/mockData';
import { generateSectionContent, repairSectionContent } from './gemini';
import { synthesizeAdultDiapersSection } from './adultDiapersSynthesis';
import { synthesizeBabyDiapersSection } from './babyDiapersSynthesis';
import { normalizeSectionData } from '../utils/normalization';
import { normalizeAdultDiapersData } from '../utils/normalizers/normalizeAdultDiapers';
import { normalizeBabyDiapers } from '../utils/normalizers/normalizeBabyDiapers';
import { searchEvidence, isLazyOutput, generateInferenceFallback } from '../utils/evidenceRetrieval';
import { evaluateAdultDiapersQuality } from './adultDiapersQualityGate';
import { evaluateBabyDiapersQuality } from './babyDiapersQualityGate';
import { DiagnosticTrace } from '../utils/diagnostics';
import { apiGet, apiPost } from '../lib/api';
import { getProvider, getStatus as getProviderStatus } from '../lib/llmSettings';
import { isRegistryBacked } from '../constants/projectConfig';
import { isMockGraph } from '../lib/graphProvenance';

// --- A. Evidence Engine (Legacy/Default) ---
const computeEvidenceGraph = (mentions: Quote[], projectId: ProjectId): EvidenceGraph => {
  const events: EvidenceEventV1[] = mentions.map(m => ({
      evidenceId: m.quoteId,
      eventType: m.sourceType === 'review' ? 'COMMERCE_REVIEW' : 'SOCIAL_MENTION',
      sourceTag: 'mock',
      content: { text: m.text },
      time: { createdAtISO: m.timestamp },
      commerce: { 
          platform: 'mock',
          brand: m.brand,
          rating: 0 
      }
  }));

  return {
    projectId,
    events,
    stats: { totalMentions: mentions.length },
    evidence_graph_v1: { events },
    // Tag the built-in demo corpus so the persist/cache/synthesis paths can
    // refuse it for registry-backed projects (mock-corpus guard).
    __provenance: 'mock',
  };
};

const computeEvidenceHash = async (graph: EvidenceGraph): Promise<string> => {
  const str = JSON.stringify(graph);
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ── EXPLICIT-RUN-GATE HELPERS ────────────────────────────────────────────────
// The run bar (ReportView) reads cache state WITHOUT starting synthesis. These
// share the exact evidence-resolution / hashing / provider-scoping code paths
// the pipeline itself uses, so a probe and a run always agree on the key.

/** The evidence graph a run for this project would use (injected, else the
 *  built-in demo corpus). The demo corpus it returns for a registry-backed
 *  project is tagged 'mock' and is REFUSED downstream — callers (executeRun,
 *  runPipelineForSection) must never synthesize/persist/cache it. It remains a
 *  usable placeholder only for the hydrate hash probe and for demo projects. */
export const resolveEvidenceForProject = (
  projectId: ProjectId,
  injectedEvidence?: EvidenceGraph
): EvidenceGraph => {
  if (injectedEvidence && (!injectedEvidence.projectId || injectedEvidence.projectId === projectId)) {
    return injectedEvidence;
  }
  return computeEvidenceGraph(RAW_MENTIONS, projectId);
};

/** The 40-char evidence hash key that scopes cache rows.
 *  A graph loaded from persistence carries its STORED hash (loadEvidence pins
 *  meta.evidence_hash onto it) — reuse it, never recompute: the reconstructed
 *  graph is not byte-identical to the one that ran (generated_at comes from
 *  the DB row, jsonb reorders keys), so recomputing would orphan every cached
 *  section and force a full paid re-run on each reload. */
export const computeEvidenceHashKey = async (graph: EvidenceGraph): Promise<string> => {
  const pinned = (graph as any)?.evidenceHash;
  if (typeof pinned === 'string' && pinned.length >= 16) return pinned;
  const hash = await computeEvidenceHash(graph);
  return hash.substring(0, 40);
};

/** Which provider a run would execute on right now ('seed' when unconfigured). */
export const resolveRunProvider = (): string => {
  const pStatus = getProviderStatus();
  return (pStatus.any && pStatus.providers[getProvider()]) ? getProvider() : 'seed';
};

/** Read-only cache probe — never writes, never generates. Null on any error. */
export const readCachedSection = async (
  projectId: ProjectId,
  sectionId: string,
  hashKey: string,
  provider: string
): Promise<{ hit: boolean; row: any } | null> => {
  try {
    const cached = await apiGet('/api/cache', {
      project_id: projectId, section_id: sectionId, evidence_hash: hashKey, provider,
    });
    return { hit: !!cached?.hit, row: cached?.row ?? null };
  } catch {
    return null;
  }
};

/** Map the evidence graph to the Quote[] every SectionOutput carries. */
export const buildEvidenceRef = (evidence: EvidenceGraph): Quote[] => {
  const sourceEvents = evidence.events || evidence.evidence_graph_v1?.events || [];
  if (sourceEvents.length === 0) {
    // A registry-backed project never DISPLAYS the demo corpus as its evidence
    // (its runs abort before reaching an empty/mock graph anyway).
    return (evidence.projectId && isRegistryBacked(evidence.projectId as ProjectId)) ? [] : RAW_MENTIONS;
  }
  return sourceEvents.map(e => ({
    quoteId: e.evidenceId || e.evidence_id || 'unknown',
    text: e.content?.text || (e.text as any)?.raw || '',
    sourceType: e.eventType === 'COMMERCE_REVIEW' ? 'review' : 'social',
    timestamp: e.time?.createdAtISO || e.timestamp_iso || '',
    language: e.lang || 'en',
    location: e.geo?.country || 'Unknown',
    brand: e.commerce?.brand
  }));
};

const computeEvidenceSummary = (events: EvidenceEventV1[]) => {
  const total = events.length;
  const amazon = events.filter(e => e.sourceTag?.toLowerCase() === 'amazon' || e.commerce?.platform?.toLowerCase() === 'amazon').length;
  const flipkart = events.filter(e => e.sourceTag?.toLowerCase() === 'flipkart' || e.commerce?.platform?.toLowerCase() === 'flipkart').length;
  const social = events.filter(e => e.eventType === 'SOCIAL_MENTION' || e.sourceTag === 'awario' || e.sourceTag?.toLowerCase().includes('social')).length;
  
  const brands: Record<string, number> = {};
  events.forEach(e => {
      const b = e.commerce?.brand || 'Unknown';
      brands[b] = (brands[b] || 0) + 1;
  });

  return {
    total_records: total,
    sources: {
        amazon,
        flipkart,
        social,
        other: total - (amazon + flipkart + social)
    },
    brands,
    message: total < 10 ? "WARNING: LIMITED DATA BASE" : "DATA SUFFICIENT"
  };
};

const applyFallback = (template: TemplatePack, sectionId: string): any => {
    const fallback = template.fallbacks[sectionId];
    if (fallback) return fallback;
    return [{ 
        headline: "Data Coverage Notice", 
        bullets: [{ 
            text: "No fallback data available for this section.", 
            quoteIds: [], 
            isSeeded: true, 
            stats: { confidenceScore: 0.0 } 
        }] 
    }];
};

const getStratifiedContext = (events: EvidenceEventV1[], limit: number = 800): EvidenceEventV1[] => {
    if (events.length <= limit) return events;

    const buckets: Record<string, EvidenceEventV1[]> = {};
    events.forEach(e => {
        const brand = e.commerce?.brand || 'Generic';
        const source = e.sourceTag || 'Other';
        const key = `${brand}|${source}`;
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(e);
    });

    const bucketKeys = Object.keys(buckets);
    const result: EvidenceEventV1[] = [];
    let itemsPerBucket = Math.ceil(limit / bucketKeys.length);
    
    bucketKeys.forEach(key => {
        result.push(...buckets[key].slice(0, itemsPerBucket));
    });

    if (result.length < limit) {
        const remaining = limit - result.length;
        const pool = events.filter(e => !result.includes(e));
        result.push(...pool.slice(0, remaining));
    }

    return result.slice(0, limit);
};

// --- BACKFILL LOGIC ---
const enrichContentWithBackfill = (sectionId: string, content: any, graph: EvidenceGraph) => {
    if (!content) return content;
    
    // Deep traverse and replace lazy strings
    const traverse = (obj: any, parentKey: string = ''): any => {
        if (typeof obj === 'string') {
            if (isLazyOutput(obj)) {
                const hits = searchEvidence(graph, parentKey || 'general', 1);
                if (hits.length > 0) {
                    return {
                        text: hits[0].content.text.substring(0, 150) + "...",
                        insight: `Evidence suggests: ${hits[0].content.text.substring(0, 50)}...`,
                        evidence_ids: [hits[0].evidenceId],
                        isInference: false
                    };
                }
                return generateInferenceFallback(parentKey, parentKey || 'Category');
            }
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => traverse(item, parentKey));
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const newObj: any = {};
            for (const key in obj) {
                newObj[key] = traverse(obj[key], key);
            }
            return newObj;
        }
        
        return obj;
    };

    return traverse(content);
};

// ── JOB-LEVEL IN-FLIGHT DEDUPE ───────────────────────────────────────────────
// One live job per (project, section, evidence_hash, provider). A double
// trigger (StrictMode remount, racing effects, a double click) JOINS the
// in-flight promise instead of burning a second synthesis call.
const inFlightJobs = new Map<string, Promise<SectionOutput>>();

export interface PipelineOptions {
  /** Skip the cache read — an explicit Regenerate re-runs synthesis and upserts over the cached row. */
  force?: boolean;
}

export const runPipelineForSection = async (
  projectId: ProjectId,
  sectionId: string,
  inspectorCallback: (data: Partial<RunInspectorData>) => void,
  injectedEvidence?: EvidenceGraph,
  opts?: PipelineOptions
): Promise<SectionOutput> => {
  const evidence = resolveEvidenceForProject(projectId, injectedEvidence);
  if (injectedEvidence && evidence !== injectedEvidence) {
      console.warn(`[Pipeline] Evidence graph mismatch. Expected ${projectId}, got ${injectedEvidence.projectId}. Recomputing mock.`);
  }
  // MOCK-CORPUS GUARD (defense in depth): a registry-backed project must never
  // synthesize against the demo/mock corpus. executeRun aborts the whole run
  // before this loop, so reaching here with mock evidence means an unexpected
  // caller — fail the section loudly rather than burn provider spend on mock.
  if (isRegistryBacked(projectId) && isMockGraph(evidence)) {
      throw new Error(`REGISTRY_GUARD: refusing to synthesize registry-backed ${projectId}/${sectionId} against the demo/mock corpus — no registry-derived evidence graph was provided.`);
  }
  const hashKey = await computeEvidenceHashKey(evidence);
  const wantProvider = resolveRunProvider();

  const force = opts?.force === true;
  // force is part of the key: an explicit Regenerate must never join a
  // lingering cache-read job and be handed the row it asked to replace.
  const jobKey = `${projectId}|${sectionId}|${hashKey}|${wantProvider}|${force ? 'f' : 'c'}`;
  const existing = inFlightJobs.get(jobKey);
  if (existing) {
    console.debug(`[Synthesis] dedupe {projectId: ${projectId}, sectionId: ${sectionId}} — identical job already in flight, joining it`);
    return existing;
  }
  const job = executeSectionJob(
    projectId, sectionId, inspectorCallback, evidence, hashKey, wantProvider, force
  );
  inFlightJobs.set(jobKey, job);
  try {
    return await job;
  } finally {
    inFlightJobs.delete(jobKey);
  }
};

const executeSectionJob = async (
  projectId: ProjectId,
  sectionId: string,
  inspectorCallback: (data: Partial<RunInspectorData>) => void,
  evidence: EvidenceGraph,
  hashKey: string,
  wantProvider: string,
  force: boolean
): Promise<SectionOutput> => {

  console.debug(`[Synthesis] start {projectId: ${projectId}, sectionId: ${sectionId}}`);
  const runId = `run_${Date.now()}`;
  if (projectId === 'adult-diapers') {
      DiagnosticTrace.start(runId, projectId, sectionId);
  }

  const template = TEMPLATE_REGISTRY[projectId];
  if (!template) throw new Error(`CRITICAL: No template found for project ${projectId}`);

  if (projectId === 'adult-diapers' && !template.templateId.startsWith('adult_diapers_v')) {
      throw new Error(`CONFIGURATION ERROR: Adult Diapers mapped to wrong template ${template.templateId}`);
  }

  inspectorCallback({
    templateId: template.templateId,
    evidenceHash: hashKey.substring(0, 8) + "...",
    promptVersion: template.versionPolicy.version,
    schemaVersion: "v1.0"
  });

  let content: any = null;
  let status: 'OK' | 'PARTIAL' | 'FAILED' | 'SEEDED' | 'PENDING' = 'OK';
  let logs: string[] = [];
  const logPrefix = `[${projectId}][${template.templateId}]`;

  // ── PERSISTENCE: section-output cache ───────────────────────────────────
  // Key by (project, section, evidence_hash, provider). A refresh that hits the
  // cache returns instantly and re-burns no LLM spend. Degrades to a miss if the
  // backend / Supabase is unavailable. `force` (explicit Regenerate) skips the
  // read so the run genuinely re-synthesises; the upsert below overwrites.
  let cacheHit = false;
  if (!force) {
  try {
    const cached = await apiGet('/api/cache', {
      project_id: projectId, section_id: sectionId, evidence_hash: hashKey, provider: wantProvider,
    });
    // PENDING rows are awaiting-generation stubs, never a servable cache hit —
    // treating one as a hit would permanently block the section's generation.
    if (cached?.hit && cached.row?.content && cached.row.status !== 'PENDING') {
      content = cached.row.content;
      status = (cached.row.status as any) || 'OK';
      cacheHit = true;
      logs.push(`${logPrefix} Cache hit (${wantProvider}). Skipping synthesis.`);
    }
  } catch { /* no backend -> treat as miss */ }
  }

  if (!cacheHit) {
  try {
    const events = evidence.events || evidence.evidence_graph_v1?.events || [];
    const stats = computeEvidenceSummary(events);
    if (projectId === 'adult-diapers') {
        DiagnosticTrace.mark(projectId, sectionId, "EvidenceSummary", stats);
    }

    // --- ADULT DIAPERS EXECUTION BRANCH ---
    if (projectId === 'adult-diapers') {
        logs.push(`${logPrefix} Running Adult Diapers Synthesis for S${sectionId}...`);
        
        // 1. Synthesis
        content = await synthesizeAdultDiapersSection(sectionId, evidence, template, (msg) => logs.push(`${logPrefix} ${msg}`));
        if (!content) throw new Error("Synthesis returned null content");
        
        DiagnosticTrace.mark(projectId, sectionId, "RawSynthesisResult", content);

        // 2. Normalization & Sanitization
        content = normalizeAdultDiapersData(sectionId, content);
        DiagnosticTrace.mark(projectId, sectionId, "NormalizedResult", content);
        
        // 3. Quality Gate
        let quality = evaluateAdultDiapersQuality(sectionId, content);
        DiagnosticTrace.mark(projectId, sectionId, "QualityCheck1", quality);
        
        if (!quality.ok) {
            logs.push(`${logPrefix} Quality Gate Failed (Score ${quality.score}). Failures: ${quality.failures.join(', ')}`);
            logs.push(`${logPrefix} Triggering Deterministic Repair...`);
            
            // 4. Deterministic Repair
            let repairInstructions = `
                CRITICAL FIX REQUIRED: The previous output failed quality checks.
                FAILURES: ${quality.failures.join('; ')}
                
                MANDATORY ACTIONS:
                1. Fix JSON structure. Remove any markdown code blocks.
                2. Remove placeholder tokens like "Insight", "N/A", "Derived".
                3. Ensure ALL arrays have minimum required items.
                4. Include consumer statements/quotes.
            `;

            // Specific instructions for Incontinence Management to prevent empty arrays
            if (sectionId === 'incontinence_management') {
                repairInstructions += `
                
                SPECIFIC SCHEMA REQUIREMENT:
                Output object MUST have "profiles" key containing: "overall_category", "self_use", "decider_for_others", "caregiver_bedridden".
                EACH profile MUST have non-empty arrays for:
                - incontinence_issue (min 1)
                - worst_moments (min 1)
                - life_impact (min 2)
                - solutions (min 1)
                
                DO NOT RETURN EMPTY ARRAYS. Use "Inferred from category norms" if specific data is missing.
                `;
            }
            
            const repaired = await repairSectionContent(content, repairInstructions, template, sectionId);
            
            if (repaired) {
                // Re-normalize repaired content
                // NOTE: This call now includes fillIncontinenceGaps for safety
                content = normalizeAdultDiapersData(sectionId, repaired);
                
                // Re-evaluate
                quality = evaluateAdultDiapersQuality(sectionId, content);
                DiagnosticTrace.mark(projectId, sectionId, "QualityCheck2_AfterRepair", quality);
                
                if (quality.ok) {
                    logs.push(`${logPrefix} Repair Successful. Quality OK.`);
                } else {
                    logs.push(`${logPrefix} Repair Failed (Score ${quality.score}). Failures: ${quality.failures.join(', ')}`);
                    logs.push(`${logPrefix} Applying SEEDED OVERRIDE.`);
                    // 5. Seeded Override (Force Seed Data)
                    // Passing empty object forces `normalizeAdultDiapersData` to merge full seed set + fill gaps
                    content = normalizeAdultDiapersData(sectionId, {}); 
                    status = 'SEEDED';
                    DiagnosticTrace.mark(projectId, sectionId, "SeededOverrideApplied", content);
                }
            } else {
                logs.push(`${logPrefix} Repair Model returned null. Applying SEEDED OVERRIDE.`);
                content = normalizeAdultDiapersData(sectionId, {});
                status = 'SEEDED';
                DiagnosticTrace.mark(projectId, sectionId, "SeededOverrideApplied", content);
            }
        } else {
            logs.push(`${logPrefix} Quality Gate Passed (Score ${quality.score}).`);
        }

    } else if (projectId === 'baby-diapers') {
        // --- BABY DIAPERS EXECUTION BRANCH (v2 registry — bare section keys) ---
        logs.push(`${logPrefix} Running Baby Diapers Synthesis for ${sectionId}...`);

        // 1. Synthesis (returns null when no API key — awaiting-stub below)
        content = await synthesizeBabyDiapersSection(sectionId, evidence, template, (msg) => logs.push(`${logPrefix} ${msg}`));

        if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
            // v2: no seeds for the new registry — persist an awaiting-generation
            // stub (status PENDING, empty content) so the section is visible in
            // Supabase and regenerates on the next provider-configured run.
            logs.push(`${logPrefix} No synthesis output — writing PENDING stub for ${sectionId}.`);
            content = {};
            status = 'PENDING';
        } else {
            // 2. Normalize (pass-through in v2; renderers normalise defensively)
            content = normalizeBabyDiapers(sectionId, content);

            // 3. Quality Gate (synthesis already self-repairs; a hard fail leaves the PENDING stub)
            const quality = evaluateBabyDiapersQuality(sectionId, content);
            if (!quality.ok) {
                logs.push(`${logPrefix} Quality Gate soft-fail (Score ${quality.score}: ${quality.failures.join(', ')}).`);
                if (!content || Object.keys(content).length === 0) {
                    content = {};
                    status = 'PENDING';
                }
            } else {
                logs.push(`${logPrefix} Quality Gate Passed (Score ${quality.score}).`);
            }
        }

    } else {
        // --- LEGACY FEMCARE FLOW (UNTOUCHED) ---
        const contextSlice = getStratifiedContext(events, 800);
        const evidencePackage = {
            manifest: {
                project: projectId,
                total_evidence_pool: stats.total_records,
                source_breakdown: stats.sources,
                brand_presence: stats.brands,
                note: "Use this full distribution for Visual Synthesis / Volume charts."
            },
            events: contextSlice
        };

        logs.push(`${logPrefix} Attempt 1: Synthesizing S${sectionId} (Pool=${stats.total_records})...`);
        
        content = await generateSectionContent(
          template, 
          sectionId, 
          JSON.stringify(evidencePackage)
        );
        
        if (!content) throw new Error("Empty content generated");

        content = enrichContentWithBackfill(sectionId, content, evidence);
        content = normalizeSectionData(sectionId, content, evidence, projectId, template.templateId);
        
        if (template.validators && template.validators[sectionId]) {
            if (!template.validators[sectionId](content)) {
                logs.push(`${logPrefix} Validation Failed. Attempting Repair...`);
                const repaired = await repairSectionContent(content, "Missing required fields.", template, sectionId);
                if (repaired) {
                    content = enrichContentWithBackfill(sectionId, repaired, evidence);
                    content = normalizeSectionData(sectionId, content, evidence, projectId, template.templateId);
                    if (template.validators[sectionId](content)) logs.push(`${logPrefix} Repair Successful.`);
                }
            }
        }
    }

    if (content.__parseError) throw new Error("JSON Parse Error in response");

  } catch (e) {
    logs.push(`${logPrefix} Generation Failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    console.error(`[Pipeline] Error in generation for ${sectionId}:`, e);

    if (projectId === 'adult-diapers') {
        // Explicit seeded override for adult diapers on catastrophic failure
        logs.push(`${logPrefix} Applying SEEDED Fallback.`);
        content = normalizeAdultDiapersData(sectionId, {});
        status = 'SEEDED';
    } else if (projectId === 'baby-diapers') {
        // v2: no seeds for the new registry — a failed section stays an
        // awaiting-generation stub and retries on the next run.
        logs.push(`${logPrefix} Writing PENDING stub for ${sectionId}.`);
        content = {};
        status = 'PENDING';
    } else {
        logs.push(`${logPrefix} Applying SEEDED Fallback.`);
        content = applyFallback(template, sectionId);
        content = normalizeSectionData(sectionId, content, evidence, projectId, template.templateId);
        status = 'SEEDED';
    }
  }

  // ── PERSISTENCE: write the produced section to the cache ────────────────
  // The write key MUST match the read/dedupe key (wantProvider), or seed-mode
  // rows land under an engine that never ran and probes permanently miss them.
  const resultProvider: string = status === 'SEEDED' ? 'seed' : wantProvider;
  // CACHE VETO (mock-corpus guard): never persist output produced against the
  // demo/mock corpus for a registry-backed project under a real provider+hash —
  // such a row rehydrates as a "complete" report forever. Registry-backed runs
  // abort before synthesis, so this is a backstop; demo projects cache normally.
  if (isRegistryBacked(projectId) && isMockGraph(evidence)) {
    logs.push(`${logPrefix} CACHE VETO — mock-provenance output for registry-backed ${projectId} NOT written to cache.`);
  } else {
  try {
    await apiPost('/api/cache', {
      project_id: projectId,
      section_id: sectionId,
      template_id: template.templateId,
      evidence_hash: hashKey,
      provider: resultProvider,
      status,
      content,
    });
  } catch { /* no backend -> skip persistence */ }
  }
  } // end if(!cacheHit)

  if (projectId === 'adult-diapers') {
      DiagnosticTrace.end(projectId, sectionId, status);
      logs.push(...DiagnosticTrace.getLog(projectId, sectionId));
  }

  inspectorCallback({ retryLog: logs });

  const evidenceRef: Quote[] = buildEvidenceRef(evidence);

  console.debug(`[Synthesis] finish {projectId: ${projectId}, sectionId: ${sectionId}, status: ${status}}`);

  return {
    status,
    title: template.sections.find(s => s.sectionId === sectionId)?.title || "Unknown",
    content,
    fallbacksUsed: status !== 'OK',
    evidenceRef,
    templateId: template.templateId,
    sectionId: sectionId,
    projectId: projectId
  };
};
