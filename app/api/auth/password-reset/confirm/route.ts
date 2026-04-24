import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { hash } from "bcryptjs"
import { isMissingTableError, setupMessage } from "@/lib/app-data"
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

  const { data: resetToken, error } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id,user_id,expires_at,used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle()

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
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ password: hashedPassword, provider: "email" })
    .eq("id", resetToken.user_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", resetToken.id)

  return NextResponse.json({ ok: true })
}
