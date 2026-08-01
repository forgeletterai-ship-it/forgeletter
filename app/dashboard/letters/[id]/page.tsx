import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentAppUser } from "@/lib/app-data"
import { getBasePlan } from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"
import { LetterDetailClient } from "./LetterDetailClient"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LetterDetailPage({ params }: PageProps) {
  const { user } = await getCurrentAppUser()
  if (!user) redirect("/auth/login")

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("generated_letters")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("generation_status", "deleted")
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  // Same crash recovery the letters list runs, scoped to this row —
  // without it, a letter whose pipeline died mid-run showed "still
  // generating, refresh in a moment" forever on the detail URL (the
  // sweep only ran on the list page).
  const TEN_MINUTES = 10 * 60 * 1000
  if (
    ["running", "queued"].includes(data.generation_status) &&
    Date.now() - new Date(data.created_at).getTime() > TEN_MINUTES
  ) {
    data.generation_status = "failed"
    data.failure_reason =
      "Pipeline timed out — function exceeded the runtime limit. Try again."
    await supabaseAdmin
      .from("generated_letters")
      .update({
        generation_status: "failed",
        failure_reason: data.failure_reason,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .in("generation_status", ["running", "queued"])
  }

  const basePlan = getBasePlan(user.plan)

  return (
    <LetterDetailClient
      letter={{
        id: data.id,
        finalCoverLetter: data.final_cover_letter ?? "",
        finalScore: data.final_score ?? 0,
        atsScore: data.ats_score,
        atsVerdict: data.ats_verdict,
        atsCoveredKeywords: data.ats_covered_keywords ?? [],
        atsMissingKeywords: data.ats_missing_keywords ?? [],
        hallucinationRisk: data.hallucination_risk,
        rewriteCycles: data.rewrite_cycles ?? 0,
        agentsRun: data.agents_run ?? [],
        jobTitle: data.job_title,
        companyName: data.company_name,
        tier: data.tier,
        tone: data.tone ?? "professional",
        toneRewriteCount: data.tone_rewrite_count ?? 0,
        generationStatus: data.generation_status,
        failureReason: data.failure_reason,
        createdAt: data.created_at,
        applicationStatus: data.application_status ?? "not_submitted",
        submittedAt: data.submitted_at ?? null,
        outcomeAt: data.outcome_at ?? null,
        outcomeNotes: data.outcome_notes ?? "",
      }}
      basePlan={basePlan}
      userName={user.name ?? null}
      userEmail={user.email ?? null}
    />
  )
}
