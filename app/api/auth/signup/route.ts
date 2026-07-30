import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { dataErrorMessage } from '@/lib/app-data'
import { checkRateLimit, clientIpFrom, rateLimitKey } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase'

// bcrypt truncates input at 72 bytes silently — cap explicitly so two
// different >72-byte passwords can't collide without the user knowing.
const MAX_PASSWORD_LENGTH = 72
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const { email, password, name } = (await req.json().catch(() => ({}))) as {
    email?: string
    password?: string
    name?: string
  }
  const normalizedEmail = String(email || "").trim().toLowerCase()

  if (!normalizedEmail || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Email and password (8+ chars) required' },
      { status: 400 }
    )
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` },
      { status: 400 }
    )
  }
  if (!EMAIL_SHAPE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: 'Enter a valid email address.' },
      { status: 400 }
    )
  }

  // Rate limit: 10 signups per IP per hour. Each signup costs a
  // cost-12 bcrypt hash — without a limit this endpoint is a CPU
  // amplifier and a mass-account factory.
  const limit = await checkRateLimit({
    key: rateLimitKey("signup-ip", clientIpFrom(req.headers)),
    max: 10,
    windowSeconds: 60 * 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many signups from this network. Try again later.' },
      { status: 429 }
    )
  }

  try {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: dataErrorMessage(existingError, 'users') },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const hashed = await hash(password, 12)

    const { error } = await supabaseAdmin.from('users').insert({
      email: normalizedEmail,
      name: String(name || normalizedEmail.split('@')[0]).trim(),
      password: hashed,
      provider: 'email',
      plan: 'free',
    })

    if (error) {
      // 23505 = unique violation — a concurrent signup for the same
      // email won the check-then-insert race. Same outcome as the
      // pre-check, not a server error.
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: dataErrorMessage(error, 'users') },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, 'users') },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
