import { NextRequest, NextResponse } from "next/server"
import { dataErrorMessage, getCurrentAppUser } from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function authorizeLetter(letterId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("generated_letters")
    .select("id,user_id")
    .eq("id", letterId)
    .maybeSingle()

  if (error) {
    return { ok: false as const, status: 500, message: dataErrorMessage(error, "generated_letters") }
  }
  if (!data) {
    return { ok: false as const, status: 404, message: "Letter not found" }
  }
  if (data.user_id !== userId) {
    return { ok: false as const, status: 403, message: "Not your letter" }
  }
  return { ok: true as const }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { user, error } = await getCurrentAppUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })
  const { id } = await params

  const { data, error: fetchError } = await supabaseAdmin
    .from("generated_letters")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: dataErrorMessage(fetchError, "generated_letters") }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Letter not found" }, { status: 404 })
  }

  return NextResponse.json({ letter: data })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await getCurrentAppUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })
  const { id } = await params

  const authz = await authorizeLetter(id, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const body = (await req.json().catch(() => ({}))) as {
    finalCoverLetter?: unknown
    templateChosen?: unknown
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.finalCoverLetter === "string") {
    updates.final_cover_letter = body.finalCoverLetter
  }

  if (typeof body.templateChosen === "string") {
    if (!["teal_sidebar", "cream_floral"].includes(body.templateChosen)) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 })
    }
    updates.template_chosen = body.templateChosen
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from("generated_letters")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)

  if (updateError) {
    return NextResponse.json({ error: dataErrorMessage(updateError, "generated_letters") }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { user, error } = await getCurrentAppUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })
  const { id } = await params

  const authz = await authorizeLetter(id, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const { error: deleteError } = await supabaseAdmin
    .from("generated_letters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (deleteError) {
    return NextResponse.json({ error: dataErrorMessage(deleteError, "generated_letters") }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
