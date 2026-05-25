import type { SupabaseClient } from "@supabase/supabase-js"
import { runATSAgent } from "./agents/ats"
import { runExampleRetrieval } from "./agents/example-retrieval"
import { runFinalEditor } from "./agents/final-editor"
import { runHMCritic } from "./agents/hm-critic"
import { runHallucinationDetector } from "./agents/hallucination-detector"
import { runInputCleaner } from "./agents/input-cleaner"
import { runJobAnalyst } from "./agents/job-analyst"
import { runMatchAnalyst } from "./agents/match-analyst"
import { runQualityGate } from "./agents/quality-gate"
import type { CallMeta } from "./agents/resume-analyst"
import { runResumeAnalyst } from "./agents/resume-analyst"
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
  MatchAnalysis,
  PipelineInput,
  PipelineResult,
  ProgressCallback,
  QualityVerdict,
  ResumeAnalysis,
  RetrievedExample,
  Tone,
} from "./types"

const PROGRESS_WEIGHTS: Record<AgentName | "Complete", number> = {
  InputCleaner: 5,
  ResumeAnalyst: 10,
  JobAnalyst: 10,
  MatchAnalyst: 8,
  ExampleRetrieval: 3,
  Writer: 25,
  ATSAgent: 4,
  HMCritic: 10,
  FinalEditor: 10,
  HallucinationDetector: 8,
  QualityGate: 5,
  RewriteAgent: 0, // counted into Writer weight on rewrite
  Complete: 2,
}

/**
 * The orchestrator. Runs the pipeline appropriate to the tier, emits
 * progress events to `onProgress`, and writes every agent's output to
 * `agent_outputs` if a supabase client is provided.
 *
 * Failure modes:
 * - Writer agent failure is fatal (we can't recover without a draft).
 * - Any other agent failure triggers the fallback shape and continues.
 * - If Quality Gate fails and rewrite budget is exhausted, we still
 *   return the best draft we produced and mark status='failed'.
 */
export async function generateCoverLetter(
  input: PipelineInput,
  supabase: SupabaseClient | null,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const start = Date.now()
  const config = getTierConfig(input.tier)
  const tone: Tone = input.tone ?? "professional"
  const agentsRun: AgentName[] = []
  const runLogs: AgentRunLog[] = []
  let totalTokensInput = 0
  let totalTokensOutput = 0
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

  const recordRun = (log: AgentRunLog) => {
    runLogs.push(log)
    totalTokensInput += log.tokensInput
    totalTokensOutput += log.tokensOutput
  }

  const logAgent = (
    name: AgentName,
    cycle: number,
    output: unknown,
    meta: CallMeta,
    fallback: boolean
  ) => {
    recordRun({
      agent: name,
      cycle,
      outputJson: output,
      modelUsed: meta.modelUsed,
      durationMs: meta.durationMs,
      tokensInput: meta.tokensInput,
      tokensOutput: meta.tokensOutput,
      fallbackTriggered: fallback,
    })
    if (!agentsRun.includes(name)) agentsRun.push(name)
  }

  try {
    // 1. Input Cleaner (deterministic — no progress weight loss to call out)
    await emit("InputCleaner", "running")
    const cleaned = runInputCleaner({
      resumeText: input.resumeText,
      jobDescription: input.jobDescription,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
    })
    logAgent(
      "InputCleaner",
      0,
      { warnings: cleaned.warnings, resumeChars: cleaned.resumeText.length, jdChars: cleaned.jobDescription.length },
      { modelUsed: "deterministic", tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      false
    )
    await emit("InputCleaner", "done", PROGRESS_WEIGHTS.InputCleaner)

    // 2 & 3. Resume + Job analysts (parallel)
    await emit("ResumeAnalyst", "running")
    await emit("JobAnalyst", "running")
    const [resumeRes, jobRes] = await Promise.all([
      runResumeAnalyst(cleaned.resumeText),
      runJobAnalyst({
        jobDescription: cleaned.jobDescription,
        jobTitle: cleaned.jobTitle,
        companyName: cleaned.companyName,
      }),
    ])
    logAgent("ResumeAnalyst", 0, resumeRes.data, resumeRes.meta, resumeRes.fallback)
    logAgent("JobAnalyst", 0, jobRes.data, jobRes.meta, jobRes.fallback)
    await emit("ResumeAnalyst", "done", PROGRESS_WEIGHTS.ResumeAnalyst)
    await emit("JobAnalyst", "done", PROGRESS_WEIGHTS.JobAnalyst)

    const resume: ResumeAnalysis = resumeRes.data
    const job: JobAnalysis = jobRes.data

    // 4. Match Analyst (pro+ultra only)
    let match: MatchAnalysis | null = null
    if (shouldRun(config, "MatchAnalyst")) {
      await emit("MatchAnalyst", "running")
      const matchRes = await runMatchAnalyst({ resume, job })
      match = matchRes.data
      logAgent("MatchAnalyst", 0, matchRes.data, matchRes.meta, matchRes.fallback)
      await emit("MatchAnalyst", "done", PROGRESS_WEIGHTS.MatchAnalyst)
    }

    // 5. Example Retrieval (ultra only, gracefully empty in v1)
    let examples: RetrievedExample[] = []
    if (shouldRun(config, "ExampleRetrieval")) {
      await emit("ExampleRetrieval", "running")
      examples = await runExampleRetrieval({
        supabase,
        job,
        userId: input.userId,
        limit: 3,
      })
      logAgent(
        "ExampleRetrieval",
        0,
        {
          examplesUsed: examples.map((e) => e.id),
          userOffersIncluded: examples.filter((e) => e.source === "user_offer").length,
          userInterviewsIncluded: examples.filter((e) => e.source === "user_interview").length,
          curatedIncluded: examples.filter((e) => e.source === "curated").length,
        },
        { modelUsed: "supabase", tokensInput: 0, tokensOutput: 0, durationMs: 0 },
        false
      )
      const offersUsed = examples.filter((e) => e.source === "user_offer").length
      const interviewsUsed = examples.filter((e) => e.source === "user_interview").length
      const personalUsed = offersUsed + interviewsUsed
      let examplesMessage: string | undefined
      if (personalUsed > 0) {
        const parts: string[] = []
        if (offersUsed > 0) {
          parts.push(`${offersUsed} offer-winning`)
        }
        if (interviewsUsed > 0) {
          parts.push(`${interviewsUsed} interview-winning`)
        }
        const noun = personalUsed === 1 ? "letter" : "letters"
        examplesMessage = `Conditioning on ${parts.join(" + ")} of your ${noun}`
      } else if (examples.length > 0) {
        examplesMessage = `Drawing on ${examples.length} curated ${
          examples.length === 1 ? "example" : "examples"
        }`
      }
      await emit("ExampleRetrieval", "done", PROGRESS_WEIGHTS.ExampleRetrieval, examplesMessage)
    }

    // 6. Writer — the load-bearing call. Failure here is fatal.
    await emit("Writer", "running")
    let writerRes
    try {
      writerRes = await runWriterAgent({ resume, job, match, examples, tone })
    } catch (err) {
      await emit("Writer", "failed", 0, err instanceof Error ? err.message : String(err))
      return failedResult({
        input,
        agentsRun,
        runLogs,
        totalTokensInput,
        totalTokensOutput,
        start,
        reason: err instanceof Error ? err.message : "Writer agent failed",
      })
    }
    logAgent("Writer", 0, writerRes.data, writerRes.meta, writerRes.fallback)
    await emit("Writer", "done", PROGRESS_WEIGHTS.Writer)

    let currentLetter = writerRes.data.letter
    let bestLetter = currentLetter
    let bestScore = 0
    let bestATS: ATSOutput | null = null
    let bestHallucination: HallucinationCheck | null = null

    // The post-write loop: ATS → HM Critic → FinalEditor →
    // HallucinationDetector → QualityGate, with up to N rewrite cycles.
    for (let cycle = 0; cycle <= config.maxRewriteCycles; cycle++) {
      // 7. ATS scoring (pro+ultra) — deterministic, cheap, always re-run
      let atsResult: ATSOutput | null = null
      if (shouldRun(config, "ATSAgent")) {
        atsResult = runATSAgent({ letter: currentLetter, job })
        logAgent(
          "ATSAgent",
          cycle,
          atsResult,
          { modelUsed: "deterministic", tokensInput: 0, tokensOutput: 0, durationMs: 0 },
          false
        )
        if (cycle === 0) await emit("ATSAgent", "done", PROGRESS_WEIGHTS.ATSAgent)
      }

      // 8. HM Critic (pro+ultra)
      let critique: HMCritique | null = null
      if (shouldRun(config, "HMCritic")) {
        await emit("HMCritic", "running")
        const critRes = await runHMCritic({ letter: currentLetter, job })
        critique = critRes.data
        logAgent("HMCritic", cycle, critRes.data, critRes.meta, critRes.fallback)
        if (cycle === 0) await emit("HMCritic", "done", PROGRESS_WEIGHTS.HMCritic)
      }

      // 9. Final Editor (all tiers)
      if (shouldRun(config, "FinalEditor")) {
        await emit("FinalEditor", "running")
        const editRes = await runFinalEditor({ letter: currentLetter })
        currentLetter = editRes.data.letter
        logAgent("FinalEditor", cycle, editRes.data, editRes.meta, editRes.fallback)
        if (cycle === 0) await emit("FinalEditor", "done", PROGRESS_WEIGHTS.FinalEditor)
      }

      // 10. Hallucination Detector (pro+ultra)
      let hallucinationCheck: HallucinationCheck | null = null
      if (shouldRun(config, "HallucinationDetector")) {
        await emit("HallucinationDetector", "running")
        const halRes = await runHallucinationDetector({
          letter: currentLetter,
          resumeText: cleaned.resumeText,
          jobDescription: cleaned.jobDescription,
        })
        hallucinationCheck = halRes.data
        logAgent("HallucinationDetector", cycle, halRes.data, halRes.meta, halRes.fallback)
        if (cycle === 0)
          await emit("HallucinationDetector", "done", PROGRESS_WEIGHTS.HallucinationDetector)
      }

      // 11. Quality Gate (pro+ultra)
      let verdict: QualityVerdict | null = null
      if (shouldRun(config, "QualityGate")) {
        await emit("QualityGate", "running")
        const gateRes = await runQualityGate({
          letter: currentLetter,
          threshold: config.qualityThreshold,
          critique,
          hallucinationCheck,
        })
        verdict = gateRes.data
        logAgent("QualityGate", cycle, gateRes.data, gateRes.meta, gateRes.fallback)
        if (cycle === 0) await emit("QualityGate", "done", PROGRESS_WEIGHTS.QualityGate)
      }

      // Track best draft across cycles in case we exhaust the budget.
      const currentScore = verdict?.score ?? estimateScoreWithoutGate(currentLetter)
      if (currentScore > bestScore) {
        bestScore = currentScore
        bestLetter = currentLetter
        bestATS = atsResult
        bestHallucination = hallucinationCheck
      }

      // For starter/free tier there's no gate — first pass is the result.
      if (!verdict) {
        bestLetter = currentLetter
        bestScore = currentScore
        bestATS = atsResult
        bestHallucination = hallucinationCheck
        break
      }

      // Gate passed — done.
      if (verdict.pass) {
        bestLetter = currentLetter
        bestScore = verdict.score
        bestATS = atsResult
        bestHallucination = hallucinationCheck
        break
      }

      // Gate failed but no budget for another cycle, or gate said don't bother.
      if (cycle >= config.maxRewriteCycles || !verdict.recommendRewrite) {
        break
      }

      // 12. Rewrite — re-runs the writer with explicit feedback.
      await emit("RewriteAgent", "running", 0, `Rewrite cycle ${cycle + 1}`)
      let rewriteRes
      try {
        rewriteRes = await runRewriteAgent({
          resume,
          job,
          match,
          examples,
          tone,
          previousLetter: currentLetter,
          verdict,
          critique,
        })
      } catch (err) {
        // Couldn't rewrite — keep best draft.
        console.warn("[orchestrator] rewrite failed:", err)
        break
      }
      currentLetter = rewriteRes.data.letter
      logAgent("RewriteAgent", cycle + 1, rewriteRes.data, rewriteRes.meta, rewriteRes.fallback)
    }

    const totalDuration = Date.now() - start
    const passed = bestScore >= config.qualityThreshold
    const rewriteCycles = runLogs.filter((l) => l.agent === "RewriteAgent").length

    await emit("Complete", "done", PROGRESS_WEIGHTS.Complete, passed ? "Letter ready" : "Best-effort delivered")

    // Persist agent_outputs if we have a Supabase client.
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
      failureReason: passed ? undefined : `Score ${Math.round(bestScore)} below threshold ${config.qualityThreshold}`,
      totalDurationMs: totalDuration,
    }
  } catch (err) {
    console.error("[orchestrator] unrecoverable error:", err)
    return failedResult({
      input,
      agentsRun,
      runLogs,
      totalTokensInput,
      totalTokensOutput,
      start,
      reason: err instanceof Error ? err.message : "Pipeline failed",
    })
  }
}

function shouldRun(
  config: { agents: ReadonlyArray<AgentName> },
  agent: AgentName
): boolean {
  return config.agents.includes(agent)
}

/**
 * Rough heuristic when there's no Quality Gate (free/starter tiers).
 * Uses length + paragraph count + presence of numbers as proxies.
 */
function estimateScoreWithoutGate(letter: string): number {
  let score = 60
  const wordCount = letter.split(/\s+/).length
  if (wordCount >= 200 && wordCount <= 400) score += 15
  const paragraphs = letter.split(/\n\n+/).filter((p) => p.trim().length > 0).length
  if (paragraphs >= 3 && paragraphs <= 5) score += 10
  if (/\b\d+(\.\d+)?(%|x|k|m|\+| years?| million)\b/i.test(letter)) score += 10
  if (/\b(I am writing to|to whom it may concern|i hope this email)\b/i.test(letter)) score -= 20
  return Math.max(0, Math.min(100, score))
}

function failedResult(args: {
  input: PipelineInput
  agentsRun: AgentName[]
  runLogs: AgentRunLog[]
  totalTokensInput: number
  totalTokensOutput: number
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
