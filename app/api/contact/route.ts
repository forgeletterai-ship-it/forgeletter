import { NextRequest, NextResponse } from "next/server"
import {
  getCurrentAppUser,
  isMissingTableError,
  setupMessage,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

const allowedTopics = new Set(["support", "billing", "partnerships", "security"])

async function sendContactEmail(payload: {
  name: string
  email: string
  topic: string
  message: string
}) {
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
      to: process.env.SUPPORT_EMAIL || "hello@forgeletter.io",
      subject: `ForgeLetter ${payload.topic} request`,
      reply_to: payload.email,
      text: [
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        `Topic: ${payload.topic}`,
        "",
        payload.message,
      ].join("\n"),
    }),
  })
}

export async function POST(req: NextRequest) {
  const { user } = await getCurrentAppUser()
  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    email?: string
    topic?: string
    message?: string
  }

  const payload = {
    name: String(body.name || user?.name || "").trim(),
    email: String(body.email || user?.email || "").trim(),
    topic: allowedTopics.has(String(body.topic)) ? String(body.topic) : "support",
    message: String(body.message || "").trim(),
  }

  if (!payload.email || !payload.message || payload.message.length < 12) {
    return NextResponse.json(
      { error: "Add your email and a clear message before sending." },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin.from("contact_messages").insert({
    user_id: user?.id || null,
    ...payload,
  })

  if (error && !isMissingTableError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (error && isMissingTableError(error)) {
    return NextResponse.json(
      { error: setupMessage("contact_messages") },
      { status: 500 }
    )
  }

  await sendContactEmail(payload).catch(() => null)

  return NextResponse.json({ ok: true })
}
