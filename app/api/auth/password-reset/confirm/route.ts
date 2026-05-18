import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { hash } from "bcryptjs"
import { dataErrorMessage } from "@/lib/app-data"
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
  try {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password: hashedPassword, provider: "email" })
      .eq("id", resetToken.user_id)

    if (updateError) {
      return NextResponse.json(
        { error: dataErrorMessage(updateError, "users") },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "users") },
      { status: 500 }
    )
  }

  try {
    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id)
  } catch {
    // The password is already updated; token cleanup should not block success.
  }

  return NextResponse.json({ ok: true })
}
