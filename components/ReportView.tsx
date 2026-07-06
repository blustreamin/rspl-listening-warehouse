
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ProjectId, RunInspectorData, SectionOutput, EvidenceGraph } from '../types';
import { TEMPLATE_REGISTRY } from '../constants/templates';
import {
  runPipelineForSection, resolveEvidenceForProject, computeEvidenceHashKey,
  resolveRunProvider, readCachedSection, buildEvidenceRef,
} from '../services/pipeline';
import { SectionRenderer } from './SectionRenderer';
import { ModernSectionRenderer } from './report/ModernSectionRenderer';
import { RunInspector } from './RunInspector';
import { ExportBar } from './report/ExportBar';
import { RunBar, PROVIDER_LABELS } from './report/RunBar';
import { BookletCover, BookletTOC } from './report/blocks/BookletChrome';
import { DataIngestionInfographic } from './report/DataIngestionInfographic';
import { beginRun, completeRun, abandonRun, reportRunProgress, setRunEvidenceHash, isRunActive, useRunState } from '../lib/runState';
import { useProviderId, ensureProviderStatus } from '../lib/llmSettings';
import { ensureEvidencePersisted } from '../lib/persistence';
import { assembleGraphFromRegistry } from '../services/graphAssembly';
import { apiGet } from '../lib/api';
import { isRegistryBacked } from '../constants/projectConfig';
import { graphProvenance, sameIdSet } from '../lib/graphProvenance';

interface Props {
  projectId: ProjectId;
  injectedEvidence?: EvidenceGraph | null;
  /** Registry assembly during a run hands the graph up so App state, the
   *  ingestion panel and post-run hydration all see the same corpus. */
  onEvidenceAssembled?: (graph: EvidenceGraph) => void;
}

interface CacheProbe {
  /** provider the probe (and the next run) is scoped to */
  provider: string;
  /** section ids cached for the current evidence hash (status != PENDING) */
  cachedIds: string[];
  probed: boolean;
  /** corpus hash changed since the last recorded run on this engine */
  stale: boolean;
  /** registered datasets for this project — the registry-rebuild source */
  registryCount: number;
}

export const ReportView: React.FC<Props> = ({ projectId, injectedEvidence, onEvidenceAssembled }) => {
  // STATE GUARD: Track projectId with ref for synchronous invalidation of stale renders
  const lastProjectIdRef = useRef<ProjectId | null>(null);

  // Guard: If we are rendering a new project, immediately update the ref.
  // This allows us to synchronously filter out stale sections in the render pass below.
  if (lastProjectIdRef.current !== projectId) {
      console.debug(`[ReportView] Project switch detected: ${lastProjectIdRef.current} -> ${projectId}. Invalidating previous sections.`);
      lastProjectIdRef.current = projectId;
      // Note: State 'sections' will be cleared by the new component instance mounting (via key in App.tsx),
      // but if the parent ever removes the key, this ref ensures we don't render stale data.
  }

  const [inspectorData, setInspectorData] = useState<RunInspectorData>({
    templateId: '', promptVersion: '', schemaVersion: '', evidenceHash: '',
    perSectionStatus: {}, validatorFailures: [], retryLog: []
  });

  const [sections, setSections] = useState<SectionOutput[]>([]);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [cacheProbe, setCacheProbe] = useState<CacheProbe>({ provider: 'seed', cachedIds: [], probed: false, stale: false, registryCount: 0 });

  // The evidence hash the RunBar probed — a click-run executes against exactly this.
  const hashKeyRef = useRef<string>('');
  // Monotonic run token: bumping it kills any in-flight run loop.
  const runSeq = useRef(0);
  // Mirror of `sections` readable inside async hydrate without effect-dep loops.
  const sectionsRef = useRef<SectionOutput[]>([]);
  // Scope (hash + provider) of the last completed probe — in-memory carry-over
  // of synthesised-but-uncached sections is only valid within the same scope.
  const probeScopeRef = useRef<{ hash: string; provider: string }>({ hash: '', provider: '' });

  const provider = useProviderId();
  const run = useRunState();
  const runActiveHere = run.phase === 'running' && run.projectId === projectId;

  useEffect(() => { sectionsRef.current = sections; }, [sections]);

  // FEATURE FLAG: Enable modern renderer for specific projects
  const useModernRenderer = ['disposable-period-panties', 'reusable-period-panties', 'adult-diapers', 'sanitary-pads', 'baby-diapers'].includes(projectId);

  // GUARD: Ensure injected evidence belongs to current project if present
  const validEvidence = (injectedEvidence && injectedEvidence.projectId === projectId) ? injectedEvidence : null;

  const template = TEMPLATE_REGISTRY[projectId];
  const isFemcare = ['disposable-period-panties', 'reusable-period-panties'].includes(projectId);
  // Registry section ids a run covers (femcare skips the retired Visual Synthesis '10').
  const expectedIds = useMemo(
    () => (template?.sections || [])
      .filter(s => !(isFemcare && s.sectionId === '10'))
      .map(s => s.sectionId),
    [template, isFemcare]
  );

  // N7 — client-facing browser-tab title for the baby-diapers report.
  useEffect(() => {
    if (projectId !== 'baby-diapers') return;
    const prev = document.title;
    document.title = 'Baby Diaper — Category and Consumer Understanding';
    return () => { document.title = prev; };
  }, [projectId]);

  // ── EXPLICIT RUN GATE — navigation hydrates from CACHE ONLY ───────────────
  // Opening a project, switching projects or provider, returning from Data
  // Studio, reloading: all of it lands here, and none of it synthesises.
  // Missing sections stay inert (Awaiting panels); the RunBar is the only
  // path into the synthesis loop below.
  useEffect(() => {
    let alive = true;

    const hydrate = async () => {
      if (!template) {
        console.error(`No template found for project: ${projectId}`);
        return;
      }
      // Never clobber a live run's state from a background re-probe.
      if (isRunActive()) return;

      setCacheProbe(p => ({ ...p, probed: false }));
      await ensureProviderStatus();
      if (!alive) return;

      const graph = resolveEvidenceForProject(projectId, validEvidence || undefined);
      // A registry-backed project with no TRUSTED registry graph in memory has
      // no knowable corpus hash until run-time assembly. Do NOT probe the cache
      // under the mock placeholder hash — it would surface demo-hash rows and
      // stamp a mock hash on the run. Show an assemble-on-run state instead.
      const registryBackedNoGraph =
        isRegistryBacked(projectId) && graphProvenance(validEvidence || undefined) !== 'registry';
      const hashKey = registryBackedNoGraph ? '' : await computeEvidenceHashKey(graph);
      if (!alive) return;
      hashKeyRef.current = hashKey;
      const wantProvider = resolveRunProvider();

      // Provider-scoped, hash-scoped cache reads — the only network activity
      // navigation is allowed. Zero synthesis API calls. Skipped when the corpus
      // hash is not yet knowable (registry-backed, pre-assembly).
      const rows = registryBackedNoGraph
        ? []
        : await Promise.all(
            expectedIds.map(id => readCachedSection(projectId, id, hashKey, wantProvider))
          );
      if (!alive) return;

      const evidenceRef = buildEvidenceRef(graph);
      const outs: SectionOutput[] = [];
      const cachedIds: string[] = [];
      const statuses: Record<string, SectionOutput['status']> = {};
      // Same corpus + same engine → sections synthesised this session whose
      // cache write didn't land (backend offline) are carried over instead of
      // wiping a report the user just generated. Any scope change drops them.
      const sameScope = probeScopeRef.current.hash === hashKey && probeScopeRef.current.provider === wantProvider;
      const prevById = new Map<string, SectionOutput>(
        sectionsRef.current.filter(s => !!s.sectionId).map(s => [s.sectionId as string, s])
      );

      expectedIds.forEach((id, i) => {
        const row = rows[i]?.row;
        const title = template.sections.find(s => s.sectionId === id)?.title || 'Unknown';
        const carried = sameScope ? prevById.get(id) : undefined;
        if (row && row.content && row.status !== 'PENDING') {
          outs.push({
            status: (row.status as SectionOutput['status']) || 'OK',
            title, content: row.content, fallbacksUsed: row.status !== 'OK',
            evidenceRef, templateId: template.templateId, sectionId: id, projectId,
          });
          cachedIds.push(id);
          statuses[id] = (row.status as SectionOutput['status']) || 'OK';
        } else if (carried && carried.status !== 'PENDING' && carried.status !== 'FAILED') {
          outs.push(carried);
          cachedIds.push(id);
          statuses[id] = carried.status;
        } else {
          statuses[id] = 'PENDING';
          if (projectId === 'baby-diapers') {
            // Inert awaiting-generation panel (§9 — no seeds, no auto-run).
            outs.push({
              status: 'PENDING', title, content: {}, fallbacksUsed: true,
              evidenceRef, templateId: template.templateId, sectionId: id, projectId,
            });
          }
        }
      });

      // Evidence-hash freshness: nothing cached under the current hash, but a
      // prior run is recorded on this engine → the corpus changed (or the
      // cache was cleared) since that run. Badge it; never silently re-run.
      let stale = false;
      if (cachedIds.length === 0) {
        try {
          const r = await apiGet('/api/runs', { project_id: projectId });
          stale = (r?.runs || []).some((x: any) => x.provider === wantProvider && (x.sections_ok ?? 0) > 0);
        } catch { /* no backend — no badge */ }
      }
      // Registry size — with no graph in memory, a click-run reassembles the
      // corpus from these registrations (metadata read only, no row download).
      // Only relevant when no graph is loaded; skip the GET otherwise.
      let registryCount = 0;
      if (!validEvidence) {
        try {
          const reg = await apiGet('/api/datasets', { project_id: projectId });
          registryCount = Array.isArray(reg?.datasets) ? reg.datasets.length : 0;
        } catch { /* registry unknown — assembly self-guards at run time */ }
      }
      if (!alive) return;

      setSections(outs);
      setInspectorData({
        templateId: template.templateId,
        promptVersion: template.versionPolicy.version,
        schemaVersion: 'v1.0',
        evidenceHash: hashKey.substring(0, 8) + '...',
        perSectionStatus: statuses,
        validatorFailures: [],
        retryLog: [`[${projectId}] Hydrated ${cachedIds.length}/${expectedIds.length} sections from cache (${wantProvider}) — no synthesis triggered.`],
      });
      setCacheProbe({ provider: wantProvider, cachedIds, probed: true, stale, registryCount });
      probeScopeRef.current = { hash: hashKey, provider: wantProvider };
    };

    void hydrate().catch((err) => {
      console.error(`[ReportView] Cache probe failed for ${projectId}:`, err);
      // Fail open on the UI, never on spend: the button unfreezes as a plain
      // "Run Report" and the confirm dialog still gates any synthesis.
      if (alive) setCacheProbe({ provider: resolveRunProvider(), cachedIds: [], probed: true, stale: false, registryCount: 0 });
    });
    return () => { alive = false; };
    // runActiveHere: a hydrate skipped during a live run re-fires on run end,
    // so RunBar/hash state can never stay stale after evidence lands mid-run.
  }, [projectId, validEvidence, provider, template, expectedIds, runActiveHere]);

  // Unmount mid-run (guarded project switch / teardown) abandons the run so
  // the half-run is recorded as partial_failed, never silent.
  useEffect(() => {
    return () => {
      runSeq.current++;
      abandonRun();
      console.debug(`[ReportView] UNMOUNTING ${projectId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertSection = (result: SectionOutput) => {
    setSections(prev => [...prev.filter(s => s.sectionId !== result.sectionId), result]);
  };

  // ── THE SYNTHESIS LOOP — reachable ONLY from startRun (click + confirm) ────
  const executeRun = async (targets: string[], force: boolean) => {
    if (!template) return;
    const seq = ++runSeq.current;
    const alive = () => runSeq.current === seq && projectId === lastProjectIdRef.current;

    // Run-state lock: freezes exports, the engine choice, uploads for this
    // project, and guards project switch / tab close until the run resolves.
    // The probed provider rides along so the run record credits the engine
    // that actually ran ('seed' included) — the freshness probe matches on it.
    beginRun(projectId, targets.length, hashKeyRef.current, cacheProbe.provider);
    let resolvedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    // The graph this run executes against. For a registry-backed project this
    // is ALWAYS a registry-derived corpus (a trusted loaded graph or a fresh
    // assembly) — never the demo/mock corpus. For a demo project it may be the
    // injected graph, an assembly, or (permitted) the built-in sample corpus.
    let graph: EvidenceGraph | null = validEvidence;
    let hashKey = hashKeyRef.current;
    const registryBacked = isRegistryBacked(projectId);

    const logAssembly = (msg: string) => {
      if (alive()) setInspectorData(prev => ({ ...prev, retryLog: [...prev.retryLog, `[assembly] ${msg}`] }));
    };
    // Abort the run loudly WITHOUT calling any provider, persisting a graph, or
    // writing any section cache. Leaves the run FAILED (never falsely complete).
    const abortRun = (msg: string) => {
      console.error(`[ReportView] ABORT ${projectId}: ${msg}`);
      if (alive()) {
        setInspectorData(prev => ({ ...prev, retryLog: [...prev.retryLog, `CRITICAL ABORT: ${msg}`] }));
        reportRunProgress(0, targets.length, undefined, 0); // done=0, failed=all → partial_failed (pill red)
      }
    };

    try {
      if (registryBacked) {
        // ── AUTHORITATIVE REGISTRY READ (run time, never the probe closure) ──
        // Gaps 1/2/A3: a transient or failed cache probe must not disarm the
        // guard, so the registry is re-read HERE and the run aborts loudly on
        // an empty or unreachable registry — it never falls back to mock.
        let registryIds: string[] = [];
        let registryReadable = true;
        try {
          const reg = await apiGet('/api/datasets', { project_id: projectId });
          if (reg?.persistence === false) registryReadable = false;
          registryIds = Array.isArray(reg?.datasets)
            ? reg.datasets.map((d: any) => d?.id).filter(Boolean)
            : [];
        } catch {
          registryReadable = false;
        }
        if (!alive()) return;

        if (!registryReadable) {
          abortRun(`Dataset registry unreachable (persistence off or fetch failed) for ${projectId} — refusing to fall back to the demo corpus. No provider called, nothing persisted. Re-run once the backend is reachable.`);
          return;
        }
        if (registryIds.length === 0) {
          abortRun(`Dataset registry is EMPTY for ${projectId} (0 datasets) — a registry-backed project never falls back to the demo/mock corpus. Run aborted before any synthesis; zero provider spend.`);
          return;
        }

        // Trust an injected/loaded graph as the corpus ONLY if it is
        // registry-derived AND its dataset links match the CURRENT registry.
        // A stale pre-rebuild graph (empty/mismatched dataset_ids — the 35,254
        // demo corpus) is NOT trusted and is re-assembled from the registry.
        const injectedIds = validEvidence?.__datasetIds ?? [];
        const injectedTrusted = !!validEvidence
          && graphProvenance(validEvidence) === 'registry'
          && (validEvidence.events?.length ?? 0) > 0
          && sameIdSet(injectedIds, registryIds);

        if (injectedTrusted) {
          graph = validEvidence;             // reuse the pinned hash → cache hits
        } else {
          if (validEvidence) logAssembly(`injected graph not trusted (provenance=${graphProvenance(validEvidence)}, ${injectedIds.length} links vs ${registryIds.length} registered) — re-assembling from the registry.`);
          const assembled = await assembleGraphFromRegistry(projectId, logAssembly);
          if (!alive()) return;
          if (!assembled || (assembled.events?.length ?? 0) === 0) {
            abortRun(`Evidence-graph assembly from ${registryIds.length} registered datasets FAILED — run aborted before any synthesis. No provider called, nothing persisted. See [assembly] lines above; re-run to retry transient errors.`);
            return;
          }
          graph = assembled;
          hashKey = await computeEvidenceHashKey(assembled);
          if (!alive()) return;
          hashKeyRef.current = hashKey;
          setRunEvidenceHash(hashKey);       // run record carries the REAL hash
          onEvidenceAssembled?.(assembled);  // App state → panel + post-run hydrate
        }
      } else if (!graph) {
        // ── DEMO PROJECT ── no injected graph: assemble from a registry if one
        // exists, else the built-in sample corpus is permitted (graph stays
        // null → the pipeline resolves the demo corpus for this demo project).
        const assembled = await assembleGraphFromRegistry(projectId, logAssembly);
        if (!alive()) return;
        if (assembled && (assembled.events?.length ?? 0) > 0) {
          graph = assembled;
          hashKey = await computeEvidenceHashKey(assembled);
          if (!alive()) return;
          hashKeyRef.current = hashKey;
          setRunEvidenceHash(hashKey);
          onEvidenceAssembled?.(assembled);
        }
      }

      // PERSIST-AT-ASSEMBLY: write the graph to evidence_graphs BEFORE the
      // first section synthesizes. Real corpora only — persistEvidence itself
      // refuses a mock graph, so a demo project's sample-corpus run (graph
      // null) persists nothing. Idempotent per (project, hash).
      if (graph) {
        const persisted = await ensureEvidencePersisted(graph, hashKey);
        if (!persisted && alive()) {
          // Persist failure must never again be invisible (the 05-Jul lesson).
          setInspectorData(prev => ({
            ...prev,
            retryLog: [...prev.retryLog, `[persist] evidence graph NOT persisted (hash ${hashKey.substring(0, 8)}…) — synthesis continues; persistence retries at the next run start.`],
          }));
        }
      }

      for (const sectionId of targets) {
        if (!alive()) break;

        setInspectorData(prev => ({
          ...prev,
          perSectionStatus: { ...prev.perSectionStatus, [sectionId]: 'PENDING' }
        }));

        try {
          const result = await runPipelineForSection(
            projectId,
            sectionId,
            (update) => {
              // HARDENED CALLBACK: ignore updates for a stale project context;
              // retryLog APPENDS — a per-section replace would wipe prior logs.
              if (alive()) setInspectorData(prev => ({
                ...prev,
                ...update,
                retryLog: update.retryLog ? [...prev.retryLog, ...update.retryLog] : prev.retryLog,
              }));
            },
            graph || undefined,
            { force }
          );

          if (!alive()) break;

          upsertSection(result);
          resolvedCount++;
          if (result.status === 'FAILED') failedCount++;
          if (result.status === 'PENDING') pendingCount++;
          reportRunProgress(resolvedCount, failedCount, undefined, pendingCount);

          setInspectorData(prev => ({
            ...prev,
            perSectionStatus: { ...prev.perSectionStatus, [sectionId]: result.status }
          }));

          // Keep the RunBar honest as sections land in the cache.
          if (result.status !== 'PENDING' && result.status !== 'FAILED') {
            setCacheProbe(p => p.probed
              ? { ...p, stale: false, cachedIds: p.cachedIds.includes(sectionId) ? p.cachedIds : [...p.cachedIds, sectionId] }
              : p);
          }
        } catch (err) {
          console.error(`Pipeline failed for ${sectionId}`, err);
          if (alive()) {
            resolvedCount++;
            failedCount++;
            reportRunProgress(resolvedCount, failedCount);
            setInspectorData(prev => ({
              ...prev,
              perSectionStatus: { ...prev.perSectionStatus, [sectionId]: 'FAILED' },
              retryLog: [...prev.retryLog, `CRITICAL FAIL ${sectionId}: ${err}`]
            }));
          }
        }
      }
    } catch (err: any) {
      // A run must NEVER resolve 'complete' off an unexpected exception: the
      // guard/abort paths above all return cleanly with failed>0, but a throw
      // (e.g. a malformed blob row inside assembly) would otherwise reach the
      // finally with failed=0 and record a falsely-successful run.
      console.error(`[ReportView] Unexpected run error for ${projectId}:`, err);
      if (alive()) {
        setInspectorData(prev => ({
          ...prev,
          retryLog: [...prev.retryLog, `CRITICAL ABORT: unexpected run error — ${err?.message || err}. Run recorded as failed.`],
        }));
        reportRunProgress(resolvedCount, Math.max(1, targets.length - resolvedCount), undefined, pendingCount);
      }
    } finally {
      // Natural end → complete (or partial_failed if any section FAILED);
      // an aborted loop → abandoned, recorded as partial_failed so the
      // half-run is visible in the runs table instead of silent.
      if (alive()) completeRun();
      else abandonRun();
    }
  };

  // The gate's trigger: RunBar click → THIS confirm dialog → locked run.
  const startRun = () => {
    if (!template || !cacheProbe.probed || isRunActive()) return;
    const missing = expectedIds.filter(id => !cacheProbe.cachedIds.includes(id));
    // Registry assembly means the run executes under a NEW hash — the probe's
    // cachedIds are mock-hash-scoped and must not shrink the target list.
    const willAssemble = !validEvidence && cacheProbe.registryCount > 0;
    const regenerate = missing.length === 0 || cacheProbe.stale;
    const targets = (regenerate || willAssemble) ? expectedIds : missing;
    if (targets.length === 0) return;

    const engine = PROVIDER_LABELS[cacheProbe.provider] || cacheProbe.provider;
    // No graph in memory + a populated registry → the run starts by
    // reassembling the corpus from the registered datasets. Say so.
    const assemblyNote = !validEvidence && cacheProbe.registryCount > 0
      ? `The evidence graph will first be assembled from ${cacheProbe.registryCount} registered datasets (no re-upload). `
      : '';
    const message = cacheProbe.provider === 'seed'
      ? `${assemblyNote}Run ${targets.length} sections in seed mode? No provider API is configured — this costs nothing.`
      : `${assemblyNote}Run ${targets.length} sections on ${engine}? This calls the provider API.`;
    if (!window.confirm(message)) return;

    void executeRun(targets, regenerate);
  };

  return (
    // id anchors the inspector-drawer content shift (booklet.css, ≥1280px)
    <div id="lovingle-page" className="max-w-5xl mx-auto px-6 py-12 pb-32">
      {/* EXPLICIT RUN GATE — the only way synthesis starts */}
      <RunBar
        projectId={projectId}
        provider={cacheProbe.provider}
        cached={cacheProbe.cachedIds.length}
        total={expectedIds.length}
        probed={cacheProbe.probed}
        stale={cacheProbe.stale}
        onRun={startRun}
      />
      {projectId === 'baby-diapers' && <ExportBar sections={sections.filter(s => s.status !== 'PENDING')} />}
      {/* Baby-diapers leads with the warm exec_summary cover; hide the slate report header. */}
      {projectId !== 'baby-diapers' && <header className="mb-12 lv-no-print">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    {TEMPLATE_REGISTRY[projectId]?.templateId.toUpperCase().replace(/_/g, ' ') || "LOADING..."}
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-500 font-mono">
                    <span>PROJECT: {projectId}</span>
                    <span>|</span>
                    <span>VERSION: {TEMPLATE_REGISTRY[projectId]?.versionPolicy.version}</span>
                    <span>|</span>
                    <span className={TEMPLATE_REGISTRY[projectId]?.versionPolicy.locked ? "text-emerald-600 flex items-center gap-1" : "text-red-500"}>
                        {TEMPLATE_REGISTRY[projectId]?.versionPolicy.locked && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        )}
                        LOCKED
                    </span>
                    {useModernRenderer && (
                        <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded ml-2">MODERN UI</span>
                    )}
                </div>
            </div>
            {validEvidence && (
                <button
                    onClick={() => setShowEvidenceModal(!showEvidenceModal)}
                    className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-xs font-bold border border-indigo-100 flex items-center gap-2 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    CUSTOM DATA LOADED · VIEW EVIDENCE
                </button>
            )}
        </div>
      </header>}

      {/* Evidence Repository & Data Ingestion Analysis */}
      {validEvidence && showEvidenceModal && (
          <div className="mb-6">
              <DataIngestionInfographic evidence={validEvidence} projectId={projectId} />
          </div>
      )}

      {/* N15 — html2pdf capture root: Cover → TOC → sections 00–20 all live
          inside this container so the downloaded PDF captures the full booklet. */}
      <div className="space-y-2" id="lovingle-report-container">
        {projectId === 'baby-diapers' && (
          <>
            <BookletCover />
            <BookletTOC />
          </>
        )}
        {sections
            .filter(section => {
                if (section.projectId && section.projectId !== projectId) {
                    console.warn(`[ReportView] Render blocked for stale section from ${section.projectId}`);
                    return false;
                }
                // Only render sections that exist in the current project's template
                const tpl = TEMPLATE_REGISTRY[projectId];
                if (tpl && section.sectionId) {
                    const validIds = tpl.sections.map(s => s.sectionId);
                    if (!validIds.includes(section.sectionId)) {
                        console.warn(`[ReportView] Section ${section.sectionId} not in ${projectId} template, filtering out`);
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => {
                // Sort by template section order to guarantee correct sequence
                const tpl = TEMPLATE_REGISTRY[projectId];
                if (!tpl) return 0;
                const order = tpl.sections.map(s => s.sectionId);
                const aIdx = order.indexOf(a.sectionId || '');
                const bIdx = order.indexOf(b.sectionId || '');
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            })
            .filter(section => {
                // Remove Visual Synthesis section for femcare projects
                if (isFemcare) {
                    if (section.sectionId === '10' || (section.title && section.title.toLowerCase().includes('visual synthesis'))) {
                        return false;
                    }
                }
                return true;
            })
            .map(section => {
            return useModernRenderer ? (
                <ModernSectionRenderer key={section.sectionId || section.title} data={section} projectId={projectId} />
            ) : (
                <SectionRenderer key={section.sectionId || section.title} data={section} projectId={projectId} />
            );
        })}
        {/* Progress spinner ONLY while a click-started run is live — an idle
            report with missing sections shows inert Awaiting panels instead. */}
        {run.phase === 'running' && run.projectId === projectId && (
             <div className="text-center py-12 lv-no-print">
                 <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full mb-4"></div>
                 <p className="text-slate-400 font-mono text-sm">Synthesizing… {run.done}/{run.total} sections</p>
             </div>
        )}
      </div>

      <div className="lv-no-print">
        <RunInspector data={inspectorData} projectId={projectId} />
      </div>
    </div>
  );
};
