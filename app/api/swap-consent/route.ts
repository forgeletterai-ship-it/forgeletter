import { NextRequest, NextResponse } from "next/server"
import { getCurrentAppUser } from "@/lib/app-data"
import { swapLogError } from "@/lib/swap/logscrub"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Post-results consent (results order item 8): account holders who
 * didn't tick a box at signup can grant it here. Explicit action
 * only; revocation goes through the outcome email's unsubscribe.
 */

const KINDS = new Set(["outcome_email", "research_copy"])

export async function POST(req: NextRequest) {
  const { user } = await getCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  }
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string }
  if (!kind || !KINDS.has(kind)) {
    return NextResponse.json({ error: "Unknown consent kind." }, { status: 400 })
  }
  try {
    const { data: existing } = await supabaseAdmin
      .from("swap_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", kind)
      .is("revoked_at", null)
      .maybeSingle()
    if (!existing) {
      await supabaseAdmin.from("swap_consents").insert({ user_id: user.id, kind })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    swapLogError("consent.insert", { message: (error as Error).message })
    return NextResponse.json({ error: "Could not record consent." }, { status: 500 })
  }
}
