import { NextRequest } from "next/server"
import { generateCoverLetter } from "@/lib/agents"
import type { Tier, Tone } from "@/lib/agents"
import {
  dataErrorMessage,
  getCurrentAppUser,
  getSupabaseSchemaCapabilities,
  resetSchemaCapabilitiesCache,
} from "@/lib/app-data"
import {
  getBasePlan,
  getBillingPeriod,
  getCurrentPlanPeriodStart,
  getPlanUsageDetails,
} from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"

// Inline pipeline streams its progress as SSE. Function runs until the
// stream is closed (i.e. until the pipeline finishes), so we ask Vercel
// for the maximum allowed duration on our plan.
export const maxDuration = 300
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIN_RESUME_CHARS = 200
const MIN_JD_CHARS = 200
const ALLOWED_TONES: Tone[] = ["professional", "confident", "warm", "concise"]

function normalizeTone(input: unknown): Tone {
  const lower = String(input || "").trim().toLowerCase()
  if (lower === "direct") return "confident"
  if (lower === "professional" || lower === "confident" || lower === "warm" || lower === "concise") {
    return lower
  }
  return "professional"
}

function planToTier(plan: string): Tier {
  const base = getBasePlan(plan)
  if (base === "free" || base === "starter" || base === "pro" || base === "ultra") {
    return base
  }
  return "starter"
}

function sseError(message: string, status: number): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message, status })}\n\n`)
      )
      controller.close()
    },
  })
  return new Response(stream, {
    status,
    headers: sseHeaders(),
  })
}

function sseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const { user, error } = await getCurrentAppUser()
  if (!user) {
    return sseError(error ?? "Authentication required", 401)
  }

  // 2. Parse + validate body
  const body = (await req.json().catch(() => ({}))) as {
    resumeText?: unknown
    jobDescription?: unknown
    jobTitle?: unknown
    companyName?: unknown
    tone?: unknown
    selectedExperienceIds?: unknown
  }

  const resumeText = String(body.resumeText || "").trim()
  const jobDescription = String(body.jobDescription || "").trim()
  const jobTitle = body.jobTitle ? String(body.jobTitle).trim() : undefined
  const companyName = body.companyName ? String(body.companyName).trim() : undefined
  const tone = normalizeTone(body.tone)
  const selectedExperienceIds: string[] = Array.isArray(body.selectedExperienceIds)
    ? (body.selectedExperienceIds as unknown[])
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 40)
    : []

  if (resumeText.length < MIN_RESUME_CHARS) {
    return sseError(`Resume must be at least ${MIN_RESUME_CHARS} characters.`, 400)
  }
  if (jobDescription.length < MIN_JD_CHARS) {
    return sseError(`Job description must be at least ${MIN_JD_CHARS} characters.`, 400)
  }

  // 3. Quota check. Counts only rows that represent a real consumed
  // letter (passed) or one currently being generated (running). A
  // failed generation refunds the slot automatically because failed
  // rows are not included.
  try {
    const period = getBillingPeriod(user.plan)
    const periodStart = getCurrentPlanPeriodStart(period).toISOString()
    const { count, error: countError } = await supabaseAdmin
      .from("generated_letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", periodStart)
      .in("generation_status", ["passed", "running"])

    if (countError) {
      return sseError(dataErrorMessage(countError, "generated_letters"), 500)
    }

    const usage = getPlanUsageDetails(user.plan, count || 0)
    if ((count || 0) >= usage.limit) {
      return sseError(
        `You have used all ${usage.limit} letters for this ${usage.periodNoun}. Upgrade your plan or wait until your allowance resets.`,
        402
      )
    }
  } catch (err) {
    return sseError(dataErrorMessage(err, "generated_letters"), 500)
  }

  // 4. Insert the generation row up front.
  const tier = planToTier(user.plan)
  const capabilities = await getSupabaseSchemaCapabilities()
  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    resume_text: resumeText,
    job_description: jobDescription,
    job_title: jobTitle ?? null,
    company_name: companyName ?? null,
    tone,
    tier,
    generation_status: "running",
  }
  if (capabilities.generatedLettersSelectedExperienceIds) {
    insertPayload.selected_experience_ids = selectedExperienceIds
  }

  let insertResult = await supabaseAdmin
    .from("generated_letters")
    .insert(insertPayload)
    .select("id")
    .single()

  // Race recovery: capabilities said the column exists but insert disagrees.
  if (
    insertResult.error &&
    (insertResult.error.code === "42703" ||
      insertResult.error.code === "PGRST204" ||
      /column .* does not exist/i.test(insertResult.error.message || ""))
  ) {
    console.warn(
      "[POST /api/generate] selected_experience_ids missing at write; retrying without it:",
      insertResult.error
    )
    resetSchemaCapabilitiesCache()
    delete insertPayload.selected_experience_ids
    insertResult = await supabaseAdmin
      .from("generated_letters")
      .insert(insertPayload)
      .select("id")
      .single()
  }

  if (insertResult.error || !insertResult.data) {
    return sseError(dataErrorMessage(insertResult.error, "generated_letters"), 500)
  }

  const generationId = insertResult.data.id as string

  // 5. Stream the pipeline progress as SSE.
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        } catch {
          // controller closed mid-write — pipeline keeps running and persists results
        }
      }

      send({ type: "init", generationId, tier, tone })

      try {
        const result = await generateCoverLetter(
          {
            resumeText,
            jobDescription,
            jobTitle,
            companyName,
            tone,
            tier,
            userId: user.id,
            generationId,
          },
          supabaseAdmin,
          async (event) => {
            send({ type: "progress", ...event })
          }
        )

        const { error: updateError } = await supabaseAdmin
          .from("generated_letters")
          .update({
            final_cover_letter: result.finalLetter,
            final_score: result.finalScore,
            hallucination_risk: result.hallucinationRisk,
            ats_score: result.atsScore ?? null,
            ats_verdict: result.atsVerdict ?? null,
            ats_covered_keywords: result.atsCoveredKeywords ?? [],
            ats_missing_keywords: result.atsMissingKeywords ?? [],
            rewrite_cycles: result.rewriteCycles,
            agents_run: result.agentsRun,
            generation_status: result.status,
            failure_reason: result.failureReason ?? null,
            total_duration_ms: result.totalDurationMs,
            completed_at: new Date().toISOString(),
          })
          .eq("id", generationId)

        if (updateError) {
          console.warn("[/api/generate] persist failed:", updateError)
        }

        // Recount after the row's status is finalised so the client
        // sees the real post-generation usage (failed generations
        // refund the slot, passed ones consume it).
        let usagePayload: ReturnType<typeof getPlanUsageDetails> | null = null
        try {
          const period = getBillingPeriod(user.plan)
          const periodStart = getCurrentPlanPeriodStart(period).toISOString()
          const { count: postCount } = await supabaseAdmin
            .from("generated_letters")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", periodStart)
            .in("generation_status", ["passed", "running"])

          usagePayload = getPlanUsageDetails(user.plan, postCount || 0)
        } catch {
          // non-fatal: client can fall back to /api/account/usage
        }

        send({
          type: "complete",
          generationId,
          status: result.status,
          finalLetter: result.finalLetter,
          finalScore: result.finalScore,
          atsScore: result.atsScore,
          atsVerdict: result.atsVerdict,
          atsCoveredKeywords: result.atsCoveredKeywords,
          atsMissingKeywords: result.atsMissingKeywords,
          hallucinationRisk: result.hallucinationRisk,
          rewriteCycles: result.rewriteCycles,
          agentsRun: result.agentsRun,
          durationMs: result.totalDurationMs,
          failureReason: result.failureReason,
          usage: usagePayload,
        })
      } catch (err) {
        await supabaseAdmin
          .from("generated_letters")
          .update({
            generation_status: "failed",
            failure_reason: err instanceof Error ? err.message : "Pipeline crashed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", generationId)
          .then(
            () => undefined,
            () => undefined
          )

        const message =
          err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
            ? "AI engine is not configured. Please contact support."
            : "Your letter could not be completed. Please try again — your quota has not been used."

        send({ type: "error", message, generationId })
      } finally {
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      }
    },

    cancel() {
      // Client disconnected. Mark closed so we stop writing; the pipeline
      // continues until the orchestrator finishes, and the row is updated
      // when it does — the user can still find the result on their dashboard.
      closed = true
    },
  })

  return new Response(stream, { headers: sseHeaders() })
}
