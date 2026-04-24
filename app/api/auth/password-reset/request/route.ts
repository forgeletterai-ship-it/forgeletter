import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import { isMissingTableError, setupMessage } from "@/lib/app-data"
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

async function sendResetEmail(email: string, resetUrl: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: "Reset your LetterForge password",
      text: `Use this secure link to reset your LetterForge password:\n\n${resetUrl}\n\nThis link expires in 45 minutes.`,
    }),
  })
}

export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string }
  const normalizedEmail = String(email || "").trim().toLowerCase()

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id,email")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString()
  const resetUrl = `${appUrl(req.nextUrl.origin)}/auth/reset-password?token=${token}`

  const { error } = await supabaseAdmin.from("password_reset_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: expiresAt,
  })

  if (error) {
    return NextResponse.json(
      {
        error: isMissingTableError(error)
          ? setupMessage("password_reset_tokens")
          : error.message,
      },
      { status: 500 }
    )
  }

  await sendResetEmail(user.email, resetUrl).catch(() => null)

  return NextResponse.json({
    ok: true,
    resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  })
}
