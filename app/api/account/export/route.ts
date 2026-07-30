import { NextResponse } from "next/server"
import {
  getApplicationBriefs,
  getCurrentAppUser,
  getUserProfile,
  getUserSettings,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * GDPR Art. 15 / Art. 20 export. Must cover EVERYTHING we hold about
 * the user — a previous version omitted generated_letters (the user's
 * core content), feedback, contact messages, and the consent log,
 * while the Privacy Policy promised full access/portability.
 *
 * Tables that may not exist yet (partial migrations) export as empty
 * arrays rather than failing the whole download.
 */
async function safeRows(
  table: string,
  column: string,
  value: string
): Promise<unknown[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq(column, value)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const [
    { profile },
    { briefs },
    { settings },
    letters,
    feedback,
    contactMessages,
    consentLog,
  ] = await Promise.all([
    getUserProfile(user.id),
    getApplicationBriefs(user.id),
    getUserSettings(user.id),
    safeRows("generated_letters", "user_id", user.id),
    safeRows("user_feedback", "user_id", user.id),
    safeRows("contact_messages", "email", user.email),
    safeRows("consent_log", "user_id", user.id),
  ])

  // Letters can reference agent traces; include them keyed by letter.
  const letterIds = (letters as Array<{ id?: string }>)
    .map((l) => l.id)
    .filter((id): id is string => typeof id === "string")
  let agentOutputs: unknown[] = []
  if (letterIds.length > 0) {
    try {
      const { data } = await supabaseAdmin
        .from("agent_outputs")
        .select("*")
        .in("generation_id", letterIds)
      agentOutputs = data ?? []
    } catch {
      agentOutputs = []
    }
  }

  const exportedAt = new Date().toISOString()

  return NextResponse.json(
    {
      exportedAt,
      account: {
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      profile,
      settings,
      briefs,
      letters,
      agentOutputs,
      feedback,
      contactMessages,
      consentLog,
      note: "Stripe invoices and payment methods live in the Stripe customer portal (Billing page → Manage billing).",
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="ForgeLetter-export-${exportedAt.slice(0, 10)}.json"`,
      },
    }
  )
}
