import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { hash } from "bcryptjs"
import { dataErrorMessage } from "@/lib/app-data"
import { checkRateLimit, clientIpFrom, rateLimitKey } from "@/lib/rate-limit"
import { supabaseAdmin } from "@/lib/supabase"

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(req: NextRequest) {
  const { token, password } = (await req.json().catch(() => ({}))) as {
    token?: string
    password?: string
  }

  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: "A valid token and password of 8+ characters are required." },
      { status: 400 }
    )
  }
  if (password.length > 72) {
    return NextResponse.json(
      { error: "Password must be 72 characters or fewer." },
      { status: 400 }
    )
  }

  // Rate limit: 10 confirm attempts per IP per 15 minutes — the token
  // space is 256-bit so brute force is hopeless anyway, but there is
  // no reason to serve a guessing loop.
  const limit = await checkRateLimit({
    key: rateLimitKey("reset-confirm-ip", clientIpFrom(req.headers)),
    max: 10,
    windowSeconds: 15 * 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    )
  }

  let resetToken:
    | {
        id: string
        user_id: string
        expires_at: string
        used_at: string | null
      }
    | null = null

  try {
    const { data, error } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id,user_id,expires_at,used_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: dataErrorMessage(error, "password_reset_tokens") },
        { status: 500 }
      )
    }

    resetToken = data
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "password_reset_tokens") },
      { status: 500 }
    )
  }

  if (
    !resetToken ||
    resetToken.used_at ||
    new Date(resetToken.expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or expired." },
      { status: 400 }
    )
  }

  const hashedPassword = await hash(password, 12)
  const now = new Date().toISOString()
  try {
    // password_changed_at is the session-revocation anchor: bumping it
    // invalidates every previously-issued session on its next request
    // (checked in getCurrentAppUser). If the column migration hasn't
    // run yet, retry without it so the reset still succeeds.
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        password: hashedPassword,
        provider: "email",
        password_changed_at: now,
      })
      .eq("id", resetToken.user_id)

    if (updateError) {
      const code = (updateError as { code?: string }).code
      if (code !== "42703" && code !== "PGRST204") {
        return NextResponse.json(
          { error: dataErrorMessage(updateError, "users") },
          { status: 500 }
        )
      }
      const retry = await supabaseAdmin
        .from("users")
        .update({ password: hashedPassword, provider: "email" })
        .eq("id", resetToken.user_id)
      if (retry.error) {
        return NextResponse.json(
          { error: dataErrorMessage(retry.error, "users") },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "users") },
      { status: 500 }
    )
  }

  try {
    // Void EVERY outstanding token for this user, not just the one
    // redeemed — a second live token issued before the reset must not
    // survive as a backdoor for its remaining 45-minute window.
    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: now })
      .eq("user_id", resetToken.user_id)
      .is("used_at", null)
  } catch {
    // The password is already updated; token cleanup should not block success.
  }

  return NextResponse.json({ ok: true })
}
