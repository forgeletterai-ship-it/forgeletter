import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Email and password (8+ chars) required' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  const hashed = await hash(password, 12)

  const { error } = await supabaseAdmin.from('users').insert({
    email,
    name: name || email.split('@')[0],
    password: hashed,
    provider: 'email',
    plan: 'free',
  })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}