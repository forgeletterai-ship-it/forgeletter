import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExperienceBlock } from "@/lib/experience-types"
import { runATSAgentTiered } from "./agents/ats"
import { runExampleRetrieval } from "./agents/example-retrieval"
import { runFinalEditor } from "./agents/final-editor"
import { runHMCritic } from "./agents/hm-critic"
import { runHallucinationDetector } from "./agents/hallucination-detector"
import { runInputCleaner, scanProfileForInjection } from "./agents/input-cleaner"
import { runJobAnalyst } from "./agents/job-analyst"
import { runMatchAnalyst } from "./agents/match-analyst"
import { runProfileAnalyst } from "./agents/profile-analyst"
import { runQualityGate } from "./agents/quality-gate"
import { runRewriteAgent } from "./agents/rewrite"
import { runWriterAgent } from "./agents/writer"
import { getTierConfig } from "./tiers"
import type {
  AgentName,
  AgentRunLog,
  ATSOutput,
  HMCritique,
  HallucinationCheck,
  JobAnalysis,
  LegacyPipelineInput,
  MatchAnalysis,
  MatchBlueprint,
  PipelineInput,
  PipelineProfile,
  PipelineResult,
  ProfileAnalysis,
  ProgressCallback,
  QualityVerdict,
  RetrievedExample,
  Tier,
  Tone,
} from "./types"

/**
 * Orchestrator — implements the Definitive Engine Blueprint
 * Section 4 workflow.
 *
 * Stages (in order):
 *   1. Pre-flight: deterministic input cleaning + Ultra-only LLM
 *      injection scan.
 *   2. ProfileAnalyst + JobAnalyst (parallel).
 *   3. ExampleRetrieval (gold-base waterfall, every paid tier).
 *   4. MatchAnalyst (every paid tier, gold-blueprint extractor).
 *   5. Writer (300-380 words, blueprint-driven).
 *   6. ATS (deterministic Starter / Haiku Pro+Ultra).
 *   7. HMCritic (Ultra only, BARS framework).
 *   8. HallucinationCheck pre-edit (every tier, win-mapping).
 *   9. FinalEditor (every tier, 300-380 band guardian).
 *  10. HallucinationCheck post-edit (Ultra only — the "×2 on Ultra"
 *      rule).
 *  11. QualityGate (every tier, manipulation-proof).
 *  12. If pass=true AND hallucination.risk !== "high" → DELIVER.
 *      Else → RewriteAgent loop (caps 1 / 2 / 2). Ship best-not-last
 *      (highest-scoring draft across all cycles).
 *
 * Failure modes:
 *   - Writer crash is fatal (no draft → no letter).
 *   - All other agents fall back into typed defaults and the
 *     pipeline continues.
 *   - If the rewrite budget is exhausted and the score is still
 *     below threshold, we still return the best draft and mark
 *     status='failed'.
 */

const PROGRESS_WEIGHTS: Record<AgentName | "Complete", number> = {
  InputCleaner: 4,
  ProfileAnalyst: 8,
  ResumeAnalyst: 8, // legacy alias — never emitted by the new flow
  JobAnalyst: 8,
  MatchAnalyst: 8,
  ExampleRetrieval: 3,
  Writer: 22,
  ATSAgent: 4,
  HMCritic: 10,
  FinalEditor: 8,
  HallucinationCheck: 6,
  HallucinationDetector: 6, // legacy alias
  QualityGate: 5,
  RewriteAgent: 4, // small slice — most of the visible rewrite time goes to Writer
  Complete: 2,
}

// ─────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────

/**
 * Run the pipeline on a structured PipelineInput (blueprint shape).
 * This is the primary entry point — /api/generate switches to this
 * once the dashboard sends structured profile + selectedIds.
 */
export async function generateCoverLetter(
  input: PipelineInput | LegacyPipelineInput,
  supabase: SupabaseClient | null,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  // Adapt legacy shape silently — synthesize a qualifications-only
  // profile so the blueprint pipeline still runs end-to-end.
  const structured: PipelineInput = isPipelineInput(input)
    ? input
    : adaptLegacyInput(input)
  return runBlueprintPipeline(structured, supabase, onProgress)
}

function isPipelineInput(
  input: PipelineInput | LegacyPipelineInput
): input is PipelineInput {
  return "profile" in input && "selectedExperienceIds" in input
}

function adaptLegacyInput(legacy: LegacyPipelineInput): PipelineInput {
  const synthBlock: ExperienceBlock = {
    id: "legacy:resume",
    type: "employer",
    company: legacy.companyName ?? "Past role",
    title: legacy.jobTitle ?? "Candidate",
    employmentType: "",
    sector: "",
    size: "",
    role: legacy.jobTitle ?? "",
    duration: "",
    name: "",
    degree: "",
    achievements: [],
  }
  return {
    profile: {
      qualifications: legacy.resumeText,
      strengths: "",
      notes: "",
      keyAchievements: legacy.resumeText,
      experienceBlocks: [synthBlock],
    },
    selectedExperienceIds: [],
    alwaysIncludeQualifications: true,
    jobDescription: legacy.jobDescription,
    targetRole: legacy.jobTitle,
    companyName: legacy.companyName,
    tone: legacy.tone,
    tier: legacy.tier,
    userId: legacy.userId,
    generationId: legacy.generationId,
  }
}

// ─────────────────────────────────────────────────────────────────
// Blueprint pipeline
// ─────────────────────────────────────────────────────────────────

async function runBlueprintPipeline(
  input: PipelineInput,
  supabase: SupabaseClient | null,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const start = Date.now()
  const tier: Tier = input.tier
  const config = getTierConfig(tier)
  const tone: Tone = input.tone ?? "professional"
  const agentsRun: AgentName[] = []
  const runLogs: AgentRunLog[] = []
  let progress = 0

  const emit = async (
    agent: AgentName | "Complete",
    status: "pending" | "running" | "done" | "failed",
    increment = 0,
    message?: string
  ) => {
    if (status === "done") progress += increment
    if (!onProgress) return
    try {
      await onProgress({
        generationId: input.generationId,
        percent: Math.min(99, Math.max(0, Math.round(progress))),
        agent,
        status,
        message,
      })
    } catch (err) {
      console.warn("[orchestrator] progress callback threw:", err)
    }
  }

  const recordLog = (log: AgentRunLog) => {
    runLogs.push(log)
    if (!agentsRun.includes(log.agent)) agentsRun.push(log.agent)
  }

  try {
    // ── 1. Pre-flight: deterministic input clean ────────────
    await emit("InputCleaner", "running")
    const cleanedDeterministic = runInputCleaner({
      resumeText: collectResumeTextForVerifier(input.profile),
      jobDescription: input.jobDescription,
      jobTitle: input.targetRole,
      companyName: input.companyName,
    })
    recordLog({
      agent: "InputCleaner",
      cycle: 0,
      outputJson: {
        warnings: cleanedDeterministic.warnings,
        resumeChars: cleanedDeterministic.resumeText.length,
        jdChars: cleanedDeterministic.jobDescription.length,
      },
      modelUsed: "deterministic",
      durationMs: 0,
      tokensInput: 0,
      tokensOutput: 0,
      fallbackTriggered: false,
    })

    // Ultra-only: LLM injection scan over JD + profile notes.
    let sanitizedJobDescription = cleanedDeterministic.jobDescription
    if (tier === "ultra") {
      const scan = await scanProfileForInjection({
        profile: synthProfileForScan(input.profile),
        jobDescription: sanitizedJobDescription,
        cycleNumber: 0,
      })
      if (!scan.log.fallbackTriggered) {
        sanitizedJobDescription =
          scan.data.sanitizedJobDescription || sanitizedJobDescription
      }
      recordLog(scan.log)
    }
    await emit("InputCleaner", "done", PROGRESS_WEIGHTS.InputCleaner)

    // ── 2. ProfileAnalyst + JobAnalyst in parallel ──────────
    await emit("ProfileAnalyst", "running")
    await emit("JobAnalyst", "running")

    const profilePromise = runProfileAnalyst({
      profile: input.profile,
      selectedExperienceIds: input.selectedExperienceIds,
      alwaysIncludeQualifications: input.alwaysIncludeQualifications,
      cycleNumber: 0,
    })
    const jobPromise = runJobAnalyst({
      jobDescription: sanitizedJobDescription,
      jobTitle: input.targetRole,
      companyName: input.companyName,
      cycleNumber: 0,
    })

    const [profileRes, jobRes] = await Promise.all([profilePromise, jobPromise])
    recordLog(profileRes.log)
    recordLog(jobRes.log)
    await emit("ProfileAnalyst", "done", PROGRESS_WEIGHTS.ProfileAnalyst)
    await emit("JobAnalyst", "done", PROGRESS_WEIGHTS.JobAnalyst)

    const profile: ProfileAnalysis = profileRes.data
    const job: JobAnalysis = jobRes.data

    // ── 3. Example retrieval (every paid tier) ──────────────
    let examples: RetrievedExample[] = []
    if (config.enableExampleRetrieval) {
      await emit("ExampleRetrieval", "running")
      examples = await runExampleRetrieval({
        supabase,
        job,
        userId: input.userId,
        limit: 3,
      })
      recordLog({
        agent: "ExampleRetrieval",
        cycle: 0,
        outputJson: {
          examplesUsed: examples.map((e) => e.id),
          userOffersIncluded: examples.filter((e) => e.source === "user_offer").length,
          userInterviewsIncluded: examples.filter((e) => e.source === "user_interview").length,
          curatedIncluded: examples.filter((e) => e.source === "curated").length,
        },
        modelUsed: "supabase",
        durationMs: 0,
        tokensInput: 0,
        tokensOutput: 0,
        fallbackTriggered: false,
      })
      await emit(
        "ExampleRetrieval",
        "done",
        PROGRESS_WEIGHTS.ExampleRetrieval,
        examplesMessage(examples)
      )
    }

    // ── 4. MatchAnalyst (every paid tier) ───────────────────
    let match: MatchAnalysis | null = null
    let blueprint: MatchBlueprint | null = null
    if (shouldRun(config, "MatchAnalyst")) {
      await emit("MatchAnalyst", "running")
      const matchRes = await runMatchAnalyst({ profile, job, cycleNumber: 0 })
      match = matchRes.data
      blueprint = matchRes.blueprint
      recordLog(matchRes.log)
      await emit("MatchAnalyst", "done", PROGRESS_WEIGHTS.MatchAnalyst)
    }

    // ── 5. Writer ────────────────────────────────────────────
    await emit("Writer", "running")
    let writerRes
    try {
      writerRes = await runWriterAgent({
        profile,
        job,
        match,
        blueprint,
        examples,
        tone,
        cycleNumber: 0,
      })
    } catch (err) {
      await emit("Writer", "failed", 0, err instanceof Error ? err.message : String(err))
      return failedResult({
        input,
        agentsRun,
        start,
        reason: err instanceof Error ? err.message : "Writer agent failed",
      })
    }
    recordLog(writerRes.log)
    await emit("Writer", "done", PROGRESS_WEIGHTS.Writer)

    // ── Post-write loop (ATS → HMCritic → FinalEditor →
    //    Hallucination → QualityGate → maybe rewrite) ────────
    let currentLetter = writerRes.data.letter
    let bestLetter = currentLetter
    let bestScore = 0
    let bestATS: ATSOutput | null = null
    let bestHallucination: HallucinationCheck | null = null

    for (let cycle = 0; cycle <= config.maxRewriteCycles; cycle += 1) {
      // ── 6. ATS — tier-aware ───────────────────────────────
      const atsRes = await runATSAgentTiered({
        letter: currentLetter,
        job,
        useLLM: config.enableATS,
        cycleNumber: cycle,
      })
      const atsResult = atsRes.data
      recordLog(atsRes.log)
      if (cycle === 0) await emit("ATSAgent", "done", PROGRESS_WEIGHTS.ATSAgent)

      // ── 7. HMCritic (Ultra only) ──────────────────────────
      let critique: HMCritique | null = null
      if (shouldRun(config, "HMCritic")) {
        if (cycle === 0) await emit("HMCritic", "running")
        const critRes = await runHMCritic({ letter: currentLetter, job })
        critique = critRes.data
        recordLog(toRunLog(critRes, "HMCritic", cycle))
        if (cycle === 0) await emit("HMCritic", "done", PROGRESS_WEIGHTS.HMCritic)
      }

      // ── 8. HallucinationCheck pre-edit (every tier) ───────
      const preEditHal = await runHallucinationDetector({
        letter: currentLetter,
        profile,
        jobDescription: sanitizedJobDescription,
        cycleNumber: cycle,
      })
      let hallucinationCheck: HallucinationCheck = preEditHal.data
      recordLog(preEditHal.log)
      if (cycle === 0)
        await emit("HallucinationCheck", "done", PROGRESS_WEIGHTS.HallucinationCheck)

      // ── 9. FinalEditor (every tier) ───────────────────────
      if (cycle === 0) await emit("FinalEditor", "running")
      const editRes = await runFinalEditor({
        letter: currentLetter,
        tone,
        cycleNumber: cycle,
      })
      currentLetter = editRes.data.letter
      recordLog(editRes.log)
      if (cycle === 0) await emit("FinalEditor", "done", PROGRESS_WEIGHTS.FinalEditor)

      // ── 10. HallucinationCheck post-edit (Ultra only) ─────
      if (tier === "ultra") {
        const postEditHal = await runHallucinationDetector({
          letter: currentLetter,
          profile,
          jobDescription: sanitizedJobDescription,
          cycleNumber: cycle + 0.5,
        })
        // The post-edit check supersedes the pre-edit one — Final
        // Editor may have removed offending sentences.
        hallucinationCheck = postEditHal.data
        recordLog(postEditHal.log)
      }

      // ── 11. QualityGate (every tier) ──────────────────────
      if (cycle === 0) await emit("QualityGate", "running")
      const gateRes = await runQualityGate({
        letter: currentLetter,
        threshold: config.qualityThreshold,
        critique,
        hallucinationCheck,
        cycleNumber: cycle,
      })
      const verdict: QualityVerdict = gateRes.data
      recordLog(gateRes.log)
      if (cycle === 0) await emit("QualityGate", "done", PROGRESS_WEIGHTS.QualityGate)

      // Ship best-not-last: track the highest-scoring draft across
      // every cycle.
      if (verdict.score > bestScore) {
        bestScore = verdict.score
        bestLetter = currentLetter
        bestATS = atsResult
        bestHallucination = hallucinationCheck
      }

      // ── 12. Gate decision ─────────────────────────────────
      const deliverable = verdict.pass && hallucinationCheck.risk !== "high"
      if (deliverable) {
        bestLetter = currentLetter
        bestScore = verdict.score
        bestATS = atsResult
        bestHallucination = hallucinationCheck
        break
      }

      // Out of rewrite budget OR gate says not salvageable.
      if (cycle >= config.maxRewriteCycles || !verdict.recommendRewrite) {
        break
      }

      // ── Rewrite ────────────────────────────────────────────
      await emit("RewriteAgent", "running", 0, `Rewrite cycle ${cycle + 1}`)
      try {
        const rewriteRes = await runRewriteAgent({
          profile,
          job,
          match,
          blueprint,
          examples,
          tone,
          previousLetter: currentLetter,
          verdict,
          critique,
          cycleNumber: cycle + 1,
        })
        currentLetter = rewriteRes.data.letter
        recordLog(rewriteRes.log)
        await emit("RewriteAgent", "done", PROGRESS_WEIGHTS.RewriteAgent)
      } catch (err) {
        console.warn("[orchestrator] rewrite failed:", err)
        await emit("RewriteAgent", "failed", 0, err instanceof Error ? err.message : String(err))
        break
      }
    }

    const totalDuration = Date.now() - start
    const passed = bestScore >= config.qualityThreshold
    const rewriteCycles = runLogs.filter((l) => l.agent === "RewriteAgent").length

    await emit(
      "Complete",
      "done",
      PROGRESS_WEIGHTS.Complete,
      passed ? "Letter ready" : "Best-effort delivered"
    )

    if (supabase) {
      await persistAgentOutputs(supabase, input.generationId, runLogs).catch((err) =>
        console.warn("[orchestrator] failed to persist agent_outputs:", err)
      )
    }

    return {
      generationId: input.generationId,
      finalLetter: bestLetter,
      finalScore: Math.round(bestScore),
      hallucinationRisk: bestHallucination?.risk ?? "none",
      atsScore: bestATS?.score,
      atsVerdict: bestATS?.verdict,
      atsCoveredKeywords: bestATS?.coveredKeywords,
      atsMissingKeywords: bestATS?.missingKeywords,
      rewriteCycles,
      agentsRun,
      status: passed ? "passed" : "failed",
      failureReason: passed
        ? undefined
        : `Score ${Math.round(bestScore)} below threshold ${config.qualityThreshold}`,
      totalDurationMs: totalDuration,
    }
  } catch (err) {
    console.error("[orchestrator] unrecoverable error:", err)
    return failedResult({
      input,
      agentsRun,
      start,
      reason: err instanceof Error ? err.message : "Pipeline failed",
    })
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function shouldRun(
  config: { agents: ReadonlyArray<AgentName> },
  agent: AgentName
): boolean {
  return config.agents.includes(agent)
}

/**
 * Build the free-form resume text view used only by the deterministic
 * InputCleaner — for char-count warnings and LinkedIn-UI sniffing.
 */
function collectResumeTextForVerifier(profile: PipelineProfile): string {
  const bits: string[] = []
  if (profile.professionalHeadline) bits.push(profile.professionalHeadline)
  if (profile.qualifications) bits.push(profile.qualifications)
  if (profile.strengths) bits.push(profile.strengths)
  if (profile.notes) bits.push(profile.notes)
  for (const block of profile.experienceBlocks) {
    const head = [block.company, block.title, block.role, block.duration]
      .filter(Boolean)
      .join(" · ")
    if (head) bits.push(head)
    for (const a of block.achievements) {
      bits.push([a.col0, a.col1, a.col2].filter(Boolean).join(" — "))
    }
  }
  return bits.join("\n")
}

/** Lightweight ProfileAnalysis for the injection scanner. */
function synthProfileForScan(profile: PipelineProfile): ProfileAnalysis {
  return {
    candidateName: "Candidate",
    seniority: "mid",
    industries: [],
    wins: [],
    qualifications: profile.qualifications ?? "",
    skills: (profile.strengths ?? "")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

function examplesMessage(examples: RetrievedExample[]): string | undefined {
  const offers = examples.filter((e) => e.source === "user_offer").length
  const interviews = examples.filter((e) => e.source === "user_interview").length
  const personal = offers + interviews
  if (personal > 0) {
    const parts: string[] = []
    if (offers > 0) parts.push(`${offers} offer-winning`)
    if (interviews > 0) parts.push(`${interviews} interview-winning`)
    const noun = personal === 1 ? "letter" : "letters"
    return `Conditioning on ${parts.join(" + ")} of your ${noun}`
  }
  if (examples.length > 0) {
    return `Drawing on ${examples.length} curated ${
      examples.length === 1 ? "example" : "examples"
    }`
  }
  return undefined
}

/**
 * The HMCritic still returns the legacy { data, meta, fallback }
 * shape because it was rebuilt in Phase B before the runAgent()
 * migration completed. Convert to AgentRunLog here so the
 * persistence layer is uniform.
 */
function toRunLog(
  res: { data: unknown; meta: { modelUsed: string; tokensInput: number; tokensOutput: number; durationMs: number }; fallback: boolean },
  agent: AgentName,
  cycle: number
): AgentRunLog {
  return {
    agent,
    cycle,
    outputJson: res.data,
    modelUsed: res.meta.modelUsed,
    durationMs: res.meta.durationMs,
    tokensInput: res.meta.tokensInput,
    tokensOutput: res.meta.tokensOutput,
    fallbackTriggered: res.fallback,
  }
}

function failedResult(args: {
  input: PipelineInput
  agentsRun: AgentName[]
  start: number
  reason: string
}): PipelineResult {
  return {
    generationId: args.input.generationId,
    finalLetter: "",
    finalScore: 0,
    hallucinationRisk: "none",
    rewriteCycles: 0,
    agentsRun: args.agentsRun,
    status: "failed",
    failureReason: args.reason,
    totalDurationMs: Date.now() - args.start,
  }
}

async function persistAgentOutputs(
  supabase: SupabaseClient,
  generationId: string,
  logs: AgentRunLog[]
): Promise<void> {
  if (logs.length === 0) return
  const rows = logs.map((log) => ({
    generation_id: generationId,
    agent_name: log.agent,
    cycle_number: log.cycle,
    output_json: log.outputJson,
    model_used: log.modelUsed,
    duration_ms: log.durationMs,
    tokens_input: log.tokensInput,
    tokens_output: log.tokensOutput,
    fallback_triggered: log.fallbackTriggered,
  }))
  const { error } = await supabase.from("agent_outputs").insert(rows)
  if (error) {
    throw new Error(`agent_outputs insert failed: ${error.message}`)
  }
}
