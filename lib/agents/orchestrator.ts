import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExperienceBlock } from "@/lib/experience-types"
import { runATSAgentTiered } from "./agents/ats"
import { runExampleRetrieval } from "./agents/example-retrieval"
import { runFinalEditor } from "./agents/final-editor"
import { runHMCritic } from "./agents/hm-critic"
import { autoCleanHallucinations, runHallucinationDetector } from "./agents/hallucination-detector"
import { runInputCleaner, scanProfileForInjection } from "./agents/input-cleaner"
import { runJobAnalyst } from "./agents/job-analyst"
import { runMatchAnalyst } from "./agents/match-analyst"
import { runProfileAnalyst } from "./agents/profile-analyst"
import { runQualityGate } from "./agents/quality-gate"
import { runRewriteAgent } from "./agents/rewrite"
import { buildGroundedLetter, runWriterAgent } from "./agents/writer"
import { getTierConfig } from "./tiers"
import { scrubDashes } from "./utils"
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
      const matchRes = await runMatchAnalyst({
        profile,
        job,
        examples,
        cycleNumber: 0,
      })
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

      // ── 8. HallucinationCheck pre-edit (Ultra only) ───────
      // The "×2 on Ultra" rule: Ultra runs an extra pre-FinalEditor
      // pass for telemetry. The AUTHORITATIVE check for every tier
      // runs post-edit (step 10) against the ACTUAL delivered text, so
      // the cleaner + gate never reason about stale pre-edit content.
      if (tier === "ultra") {
        const preEditHal = await runHallucinationDetector({
          letter: currentLetter,
          profile,
          jobDescription: sanitizedJobDescription,
          cycleNumber: cycle,
        })
        recordLog(preEditHal.log)
      }

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

      // ── 10. HallucinationCheck post-edit (every tier) ─────
      // Authoritative check: runs on the post-FinalEditor text so the
      // cleaner + gate reason about exactly what would ship. On Ultra
      // this is the second of the "×2" checks.
      const postEditHal = await runHallucinationDetector({
        letter: currentLetter,
        profile,
        jobDescription: sanitizedJobDescription,
        cycleNumber: cycle + 0.5,
      })
      let hallucinationCheck: HallucinationCheck = postEditHal.data
      recordLog(postEditHal.log)
      if (cycle === 0)
        await emit("HallucinationCheck", "done", PROGRESS_WEIGHTS.HallucinationCheck)

      // ── 10b. Hallucination auto-cleaner (every tier) ──────
      // If the verifier flagged fabricated or unmapped claims, try
      // to strip them deterministically — with a hard 3-sentence
      // floor. The cleaner refuses to drop if doing so would leave
      // <3 body sentences. If something was scrubbed, we re-verify
      // before continuing so the orchestrator's downstream
      // decisions reflect the cleaned text.
      if (
        hallucinationCheck.fabricatedFacts.length > 0 ||
        (hallucinationCheck.unmappedClaims?.length ?? 0) > 0
      ) {
        const cleaned = autoCleanHallucinations({
          letter: currentLetter,
          check: hallucinationCheck,
        })
        recordLog({
          agent: "HallucinationCheck",
          cycle: cycle + 0.75,
          outputJson: {
            cleanerRan: true,
            removed: cleaned.removed,
            skipped: cleaned.skipped,
            reason: cleaned.reason,
          },
          modelUsed: "deterministic",
          durationMs: 0,
          tokensInput: 0,
          tokensOutput: 0,
          fallbackTriggered: false,
        })
        if (cleaned.removed.length > 0) {
          currentLetter = cleaned.letter
          // Re-verify the cleaned letter so downstream gate sees the
          // accurate post-clean risk.
          const reVerify = await runHallucinationDetector({
            letter: currentLetter,
            profile,
            jobDescription: sanitizedJobDescription,
            cycleNumber: cycle + 0.85,
          })
          hallucinationCheck = reVerify.data
          recordLog(reVerify.log)
        }
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

      // ── 11b. Coverage check (every tier) ──────────────────
      // Verify every SELECTED experience block is reflected in the
      // letter. If not, the letter is incomplete — flip the verdict
      // and trigger a rewrite. We never silently ship a letter that
      // drops one of the user's chosen experiences.
      const coverage = computeExperienceCoverage(currentLetter, profile, input.selectedExperienceIds)
      if (coverage.missing.length > 0 && verdict.pass) {
        verdict.pass = false
        verdict.recommendRewrite = true
        verdict.reasoning = `${verdict.reasoning} (Coverage gap: ${coverage.missing.length} selected experience(s) missing from the letter — ${coverage.missing.slice(0, 3).join("; ")}.)`
      }
      recordLog({
        agent: "QualityGate",
        cycle: cycle + 0.5,
        outputJson: {
          coverage: {
            selectedCount: coverage.selectedCount,
            referencedCount: coverage.referenced.length,
            missing: coverage.missing,
          },
        },
        modelUsed: "deterministic",
        durationMs: 0,
        tokensInput: 0,
        tokensOutput: 0,
        fallbackTriggered: false,
      })

      // Ship best-not-last: track the highest-scoring draft across
      // every cycle. Penalise missing-coverage drafts so a fully-
      // covered lower-score draft beats a higher-score draft that
      // dropped an experience. Also penalise ungrounded drafts so a
      // clean lower-score draft always beats a dirty higher-score one:
      // a fabricated claim (high) is effectively disqualified, and an
      // unmapped hard claim (medium) is heavily penalised. "low" (soft
      // language only) and "none" carry no penalty.
      const riskPenalty =
        hallucinationCheck.risk === "high"
          ? 100
          : hallucinationCheck.risk === "medium"
            ? 40
            : hallucinationCheck.risk === "low"
              ? 10
              : 0
      const effectiveScore = Math.max(
        0,
        verdict.score - coverage.missing.length * 8 - riskPenalty
      )
      if (effectiveScore > bestScore) {
        bestScore = effectiveScore
        bestLetter = currentLetter
        bestATS = atsResult
        bestHallucination = hallucinationCheck
      }

      // ── 12. Gate decision ─────────────────────────────────
      // A letter is deliverable only if it is FULLY GROUNDED: risk must
      // be exactly "none" — every concrete claim maps to a win AND
      // there is no unmapped soft/aspirational language either. "low"
      // (soft self-claims unmapped), "medium" (an unmapped hard claim),
      // and "high" (a fabrication) all block delivery and trigger a
      // rewrite. Facts come only from the candidate's profile; the JD
      // wanting a skill is never licence to claim it.
      const deliverable =
        verdict.pass &&
        hallucinationCheck.risk === "none" &&
        coverage.missing.length === 0
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

    // ── FINAL GROUNDING GATE (every tier, deterministic) ─────────
    // The bar is strict "none": every concrete claim maps to a win and
    // there is no unmapped soft language either. The in-loop gate
    // enforces this too, but the loop can exit on exhausted rewrite
    // budget carrying `bestLetter` at "low"/"medium"/"high". This gate
    // is the hard guarantee. It NEVER reports a risk it did not
    // re-measure on the actual delivered text — so the pipeline can
    // never claim "none" while shipping a flagged claim.
    //
    // certifyGrounded: run the authoritative check on `letter`; if it
    // is not "none", deterministically strip EVERY flagged sentence
    // (fabricated, unmapped, AND soft/unverified) and re-check once.
    // Returns the possibly-trimmed letter and its measured verdict.
    const certifyGrounded = async (
      letter: string,
      cycleBase: number
    ): Promise<{ letter: string; check: HallucinationCheck }> => {
      const first = await runHallucinationDetector({
        letter,
        profile,
        jobDescription: sanitizedJobDescription,
        cycleNumber: cycleBase,
      })
      recordLog(first.log)
      let check = first.data
      let out = letter
      if (check.risk !== "none") {
        const cleaned = autoCleanHallucinations({
          letter: out,
          check,
          stripUnverified: true,
        })
        recordLog({
          agent: "HallucinationCheck",
          cycle: cycleBase + 0.25,
          outputJson: {
            finalGate: true,
            stripped: cleaned.removed,
            skipped: cleaned.skipped,
            reason: cleaned.reason,
          },
          modelUsed: "deterministic",
          durationMs: 0,
          tokensInput: 0,
          tokensOutput: 0,
          fallbackTriggered: false,
        })
        if (cleaned.removed.length > 0) {
          out = cleaned.letter
          const second = await runHallucinationDetector({
            letter: out,
            profile,
            jobDescription: sanitizedJobDescription,
            cycleNumber: cycleBase + 0.5,
          })
          recordLog(second.log)
          check = second.data
        }
      }
      return { letter: out, check }
    }

    // (1) Certify the best LLM draft on the ACTUAL delivered text.
    const primary = await certifyGrounded(bestLetter, 99)
    bestLetter = primary.letter
    let finalGroundingCheck: HallucinationCheck = primary.check

    // (2) If the LLM draft still cannot be certified "none", fall back
    // to a letter built ONLY from the candidate's wins (grounded by
    // construction) and certify THAT too. A plainer fully-grounded
    // letter always beats a polished letter that implies experience
    // the candidate does not have.
    if (finalGroundingCheck.risk !== "none") {
      const grounded = scrubDashes(buildGroundedLetter({ profile, job }))
      const fallback = await certifyGrounded(grounded, 97)
      bestLetter = fallback.letter
      finalGroundingCheck = fallback.check
      recordLog({
        agent: "HallucinationCheck",
        cycle: 98.5,
        outputJson: {
          finalGate: true,
          groundedFallbackUsed: true,
          resultingRisk: finalGroundingCheck.risk,
          reason:
            "Best draft could not be certified strictly grounded; replaced with a letter built only from the candidate's own wins and re-verified.",
        },
        modelUsed: "deterministic",
        durationMs: 0,
        tokensInput: 0,
        tokensOutput: 0,
        fallbackTriggered: false,
      })
    }
    bestHallucination = finalGroundingCheck

    const totalDuration = Date.now() - start
    const passed = bestScore >= config.qualityThreshold
    const rewriteCycles = runLogs.filter((l) => l.agent === "RewriteAgent").length

    // Final coverage snapshot for the delivered letter.
    const finalCoverage = computeExperienceCoverage(
      bestLetter,
      profile,
      input.selectedExperienceIds
    )
    const finalWordCount = countDeliveredWords(bestLetter)

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
      // Final dash scrub on the delivered letter — bulletproofs the
      // "no dash for effect" guarantee regardless of which path produced
      // bestLetter (clean writer draft, rewrite, or deterministic
      // fallback). Word/coverage stats above are unaffected by dash→comma
      // substitution, so they remain valid against this string.
      finalLetter: scrubDashes(bestLetter),
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
      coverageMissing: finalCoverage.missing,
      wordCount: finalWordCount,
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
 * Coverage check: does the final letter reference every SELECTED
 * experience block? We treat an experience as "referenced" if any
 * of these signals match in the letter (case-insensitive):
 *   • The block's display label tokens (company / institution name).
 *   • Any role token from the block (job title / role text).
 *   • Any number from any win in the block.
 *
 * "Qualifications" pseudo-blocks are exempted (they fold in as
 * background facts rather than being explicitly cited).
 *
 * Returns the list of missing display labels — used by the
 * orchestrator to flip the verdict and trigger a targeted rewrite.
 */
function countDeliveredWords(letter: string): number {
  // Same algorithm as the Writer's body counter; lifted here so the
  // orchestrator can surface it on PipelineResult.
  const lines = letter.split(/\r?\n/)
  const body: string[] = []
  let inSignature = false
  for (const line of lines) {
    const t = line.trim()
    const lower = t.toLowerCase()
    if (!t) continue
    if (lower.startsWith("dear ")) continue
    if (
      lower === "sincerely," || lower === "sincerely" ||
      lower === "regards," || lower === "regards" ||
      lower === "best," || lower === "best regards," || lower === "best regards"
    ) {
      inSignature = true
      continue
    }
    if (inSignature) continue
    body.push(t)
  }
  const words = body.join(" ").match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)
  return words ? words.length : 0
}

function computeExperienceCoverage(
  letter: string,
  profile: ProfileAnalysis,
  selectedExperienceIds: string[]
): { selectedCount: number; referenced: string[]; missing: string[] } {
  const lower = letter.toLowerCase()
  // Group wins by entryId so we know per-experience which signals apply.
  const winsByEntry = new Map<string, typeof profile.wins>()
  for (const w of profile.wins) {
    if (w.entryType === "qualifications") continue
    if (!winsByEntry.has(w.entryId)) winsByEntry.set(w.entryId, [])
    winsByEntry.get(w.entryId)!.push(w)
  }
  // The selected set is the source of truth — but if the upstream
  // adapted the legacy input shape (selectedExperienceIds = []), fall
  // back to "every entryId with wins" so we still check coverage.
  const selected =
    selectedExperienceIds.length > 0
      ? selectedExperienceIds.filter((id) => winsByEntry.has(id))
      : Array.from(winsByEntry.keys())

  const referenced: string[] = []
  const missing: string[] = []
  for (const entryId of selected) {
    const wins = winsByEntry.get(entryId) ?? []
    if (wins.length === 0) continue
    const label = wins[0].entryLabel || ""
    const labelTokens = label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)
    const labelHit = labelTokens.some((t) => lower.includes(t))
    const numberHit = wins.some(
      (w) => w.number && lower.includes(w.number.toLowerCase())
    )
    if (labelHit || numberHit) referenced.push(label || entryId)
    else missing.push(label || entryId)
  }
  return { selectedCount: selected.length, referenced, missing }
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
  if (profile.tools) bits.push(profile.tools)
  if (profile.notes) bits.push(profile.notes)
  for (const block of profile.experienceBlocks) {
    const head = [block.company, block.title, block.role, block.duration]
      .filter(Boolean)
      .join(" · ")
    if (head) bits.push(head)
    for (const a of block.achievements) {
      bits.push([a.what, a.number, a.whyItMattered].filter(Boolean).join(" — "))
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
    skills: [profile.strengths ?? "", profile.tools ?? ""]
      .join(", ")
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
