import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import { dataErrorMessage } from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function appUrl(origin: string) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    origin
  ).replace(/\/$/, "")
}

/**
 * Send the reset email via Resend. Returns true only when Resend
 * accepted the message. Failing LOUD here matters: silently returning
 * while the UI says "check your inbox" strands a locked-out user with
 * no recovery path — the exact production dead-end this replaces.
 */
async function sendResetEmail(email: string, resetUrl: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.error(
      "[password-reset] RESEND_API_KEY / RESEND_FROM_EMAIL not configured — reset emails CANNOT be delivered."
    )
    return false
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: "Reset your ForgeLetter password",
        text: `Use this secure link to reset your ForgeLetter password:\n\n${resetUrl}\n\nThis link expires in 45 minutes.`,
      }),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error(
        `[password-reset] Resend rejected the email (HTTP ${response.status}): ${body.slice(0, 300)}`
      )
      return false
    }
    return true
  } catch (error) {
    console.error("[password-reset] Resend request failed:", error)
    return false
  }
}

export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string }
  const normalizedEmail = String(email || "").trim().toLowerCase()

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Config check BEFORE the user lookup so the failure is uniform for
  // every request (no account-existence oracle). In development the
  // dev-only resetUrl below still makes the flow usable without email.
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
  )
  if (!emailConfigured && process.env.NODE_ENV === "production") {
    console.error(
      "[password-reset] Email delivery is not configured in production — refusing to pretend an email was sent."
    )
    return NextResponse.json(
      {
        error:
          "Password reset email delivery is temporarily unavailable. Please contact support to regain access.",
      },
      { status: 503 }
    )
  }

  let user: { id: string; email: string } | null = null

  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: dataErrorMessage(error, "users") },
        { status: 500 }
      )
    }

    user = data
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "users") },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString()
  const resetUrl = `${appUrl(req.nextUrl.origin)}/auth/reset-password?token=${token}`

  try {
    const { error } = await supabaseAdmin.from("password_reset_tokens").insert({
      user_id: user.id,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    })

    if (error) {
      return NextResponse.json(
        { error: dataErrorMessage(error, "password_reset_tokens") },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "password_reset_tokens") },
      { status: 500 }
    )
  }

  const delivered = await sendResetEmail(user.email, resetUrl)

  // In production a failed send must NOT masquerade as success — the
  // UI would tell the user to check an inbox that will stay empty.
  if (!delivered && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "We couldn't send the reset email right now. Please try again in a few minutes or contact support.",
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    ok: true,
    resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  })
}
