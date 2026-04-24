import { NextRequest, NextResponse } from "next/server"
import {
  getApplicationBriefs,
  getCurrentAppUser,
  isMissingTableError,
  setupMessage,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

const allowedTones = new Set(["Professional", "Warm", "Direct", "Executive"])

function statusForBrief(role: string, jobDescription: string, experience: string) {
  return role && jobDescription && experience ? "brief_ready" : "draft"
}

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { briefs, setupError } = await getApplicationBriefs(user.id)
  return NextResponse.json({ briefs, setupError })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    role?: string
    company?: string
    tone?: string
    job_description?: string
    candidate_experience?: string
  }

  const role = String(body.role || "").trim()
  const company = String(body.company || "").trim()
  const tone = allowedTones.has(String(body.tone)) ? String(body.tone) : "Professional"
  const job_description = String(body.job_description || "").trim()
  const candidate_experience = String(body.candidate_experience || "").trim()

  if (!role && !company && !job_description && !candidate_experience) {
    return NextResponse.json(
      { error: "Add at least one detail before saving a brief." },
      { status: 400 }
    )
  }

  const { data, error: saveError } = await supabaseAdmin
    .from("application_briefs")
    .insert({
      user_id: user.id,
      role,
      company,
      tone,
      job_description,
      candidate_experience,
      status: statusForBrief(role, job_description, candidate_experience),
    })
    .select("*")
    .single()

  if (saveError) {
    return NextResponse.json(
      {
        error: isMissingTableError(saveError)
          ? setupMessage("application_briefs")
          : saveError.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ brief: data })
}
