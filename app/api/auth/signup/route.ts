import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { dataErrorMessage } from '@/lib/app-data'
import { supabaseAdmin } from '@/lib/supabase'

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
