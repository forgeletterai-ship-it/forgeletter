import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  getCurrentAppUser,
} from "@/lib/app-data"
import { checkRateLimit, clientIpFrom, rateLimitKey } from "@/lib/rate-limit"
import { supabaseAdmin } from "@/lib/supabase"

const allowedTopics = new Set(["support", "billing", "partnerships", "security"])
const MAX_MESSAGE_LENGTH = 5000

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
      // Single support mailbox until the custom domain lands — must
      // match the address published on the legal pages.
      to: process.env.SUPPORT_EMAIL || "forgeletterai@gmail.com",
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
  if (payload.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 }
    )
  }

  // Rate limit: 5 messages per IP per hour — an open unauthenticated
  // insert + outbound email is otherwise a spam sink.
  const limit = await checkRateLimit({
    key: rateLimitKey("contact-ip", clientIpFrom(req.headers)),
    max: 5,
    windowSeconds: 60 * 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many messages from this network. Please try again later." },
      { status: 429 }
    )
  }

  try {
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      user_id: user?.id || null,
      ...payload,
    })

    if (error) {
      return NextResponse.json(
        { error: dataErrorMessage(error, "contact_messages") },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "contact_messages") },
      { status: 500 }
    )
  }

  await sendContactEmail(payload).catch(() => null)

  return NextResponse.json({ ok: true })
}
