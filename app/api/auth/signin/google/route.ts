import { handlers } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

export const POST = handlers.POST

export async function GET(req: NextRequest) {
  const url = new URL("/auth/login", req.nextUrl.origin)
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl")

  url.searchParams.set("provider", "google")
  if (callbackUrl) {
    url.searchParams.set("callbackUrl", callbackUrl)
  }

  return NextResponse.redirect(url)
}
