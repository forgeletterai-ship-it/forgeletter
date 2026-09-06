import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, clientIpFrom, rateLimitKey } from "@/lib/rate-limit"
import { isDisposableEmail } from "@/lib/swap/disposable-domains"
import { supabaseAdmin } from "@/lib/supabase"

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Pre-launch waitlist signup ("Express your interest" box on the
 * splash). Stores the address in launch_signups; lib/launch-notify.ts
 * mails everyone once at launch. Duplicates are silently fine — the
 * caller just sees ok:true either way.
 */
export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as {
    email?: string
  }
  const normalizedEmail = String(email || "").trim().toLowerCase()

  if (!normalizedEmail || !EMAIL_SHAPE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    )
  }
  if (normalizedEmail.length > 254) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    )
  }
  if (isDisposableEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Use a real inbox — that's where the launch email goes." },
      { status: 400 }
    )
  }

  // 10 per IP per hour: an open unauthenticated insert is otherwise a
  // list-stuffing sink.
  const limit = await checkRateLimit({
    key: rateLimitKey("launch-interest-ip", clientIpFrom(req.headers)),
    max: 10,
    windowSeconds: 60 * 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts from this network. Try again later." },
      { status: 429 }
    )
  }

  const { error } = await supabaseAdmin
    .from("launch_signups")
    .upsert(
      { email: normalizedEmail },
      { onConflict: "email", ignoreDuplicates: true }
    )

  if (error) {
    return NextResponse.json(
      { error: "Could not save your email right now. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
