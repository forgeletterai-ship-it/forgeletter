import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  getCurrentAppUser,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

const allowedStatuses = new Set(["draft", "brief_ready", "generated", "archived"])
const allowedTones = new Set(["Professional", "Warm", "Direct"])

type BriefRouteProps = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, { params }: BriefRouteProps) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  for (const field of [
    "role",
    "company",
    "job_description",
    "candidate_experience",
    "generated_letter",
  ]) {
    if (field in body) {
      updates[field] = String(body[field] || "").trim()
    }
  }

  if ("tone" in body && allowedTones.has(String(body.tone))) {
    updates.tone = body.tone
  }

  if ("status" in body && allowedStatuses.has(String(body.status))) {
    updates.status = body.status
  }

  try {
    const { data, error: saveError } = await supabaseAdmin
      .from("application_briefs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: dataErrorMessage(saveError, "application_briefs") },
        { status: 500 }
      )
    }

    return NextResponse.json({ brief: data })
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "application_briefs") },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: BriefRouteProps) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { id } = await params
  try {
    const { error: deleteError } = await supabaseAdmin
      .from("application_briefs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: dataErrorMessage(deleteError, "application_briefs") },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "application_briefs") },
      { status: 500 }
    )
  }
}
