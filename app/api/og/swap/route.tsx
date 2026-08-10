import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * 1200×630 share card (Phase 6): THE SWAP TEST / ANCHOR n% /
 * PROOF n% / profile / one-line stat / URL. Reads the 30-day
 * snapshot; scores + profile only — no letter text exists here.
 */

export const runtime = "nodejs"

const PROFILE_LINE: Record<string, string> = {
  TARGETED: "Both sides specific. This one works.",
  FLATTERY: "All research, no evidence.",
  CREDENTIALS: "Strong evidence. Wrong letter.",
  TEMPLATE_FILL: "Built from the job posting.",
  BLANK_PAGE: "Written from scratch, evidence left out.",
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || ""
  let anchor = 0
  let proof = 0
  let profile = "FILLER"

  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await supabaseAdmin
      .from("swap_shares")
      .select("payload, expires_at")
      .eq("id", id)
      .maybeSingle()
    const payload = data?.payload as
      | { anchor?: number; proof?: number; profile?: string }
      | undefined
    if (payload && (!data?.expires_at || new Date(data.expires_at) > new Date())) {
      anchor = payload.anchor ?? 0
      proof = payload.proof ?? 0
      profile = payload.profile ?? "FILLER"
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#f6f4ee",
          color: "#14312f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 6, color: "#0C403E", fontWeight: 700 }}>
          THE SWAP TEST
        </div>
        <div style={{ display: "flex", gap: 80 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, letterSpacing: 3 }}>ANCHOR</div>
            <div
              style={{
                fontSize: 130,
                fontWeight: 800,
                color: anchor >= 12 && anchor <= 35 ? "#0C403E" : "#A03227",
              }}
            >
              {anchor}%
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, letterSpacing: 3 }}>PROOF</div>
            <div
              style={{
                fontSize: 130,
                fontWeight: 800,
                color: proof > 66 ? "#0C403E" : "#A03227",
              }}
            >
              {proof}%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>
            {PROFILE_LINE[profile] ?? "Scan a cover letter."}
          </div>
          <div style={{ fontSize: 26, color: "#4a5a58" }}>
            How much of a cover letter is really about the employer? · forgeletter.com/swap-test
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
