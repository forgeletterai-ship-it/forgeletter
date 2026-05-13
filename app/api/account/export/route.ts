import { NextResponse } from "next/server"
import {
  getApplicationBriefs,
  getCurrentAppUser,
  getUserProfile,
  getUserSettings,
} from "@/lib/app-data"

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const [{ profile }, { briefs }, { settings }] = await Promise.all([
    getUserProfile(user.id),
    getApplicationBriefs(user.id),
    getUserSettings(user.id),
  ])

  const exportedAt = new Date().toISOString()

  return NextResponse.json(
    {
      exportedAt,
      account: {
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      profile,
      settings,
      briefs,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="ForgeLetter-export-${exportedAt.slice(0, 10)}.json"`,
      },
    }
  )
}
