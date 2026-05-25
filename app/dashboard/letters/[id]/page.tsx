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
    .maybeSingle()

  if (error || !data) {
    notFound()
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
        generationStatus: data.generation_status,
        failureReason: data.failure_reason,
        createdAt: data.created_at,
        applicationStatus: data.application_status ?? "not_submitted",
        submittedAt: data.submitted_at ?? null,
        outcomeAt: data.outcome_at ?? null,
        outcomeNotes: data.outcome_notes ?? "",
      }}
      basePlan={basePlan}
    />
  )
}
