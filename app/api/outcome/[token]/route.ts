import { NextRequest, NextResponse } from "next/server"
import { swapLogError } from "@/lib/swap/logscrub"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * One-tap outcome links from the 30-day email (Phase 2).
 * `?r=interview|none|noapply` writes the boolean triplet to
 * swap_outcomes; `?r=unsub` revokes the consent. UUID token per stat
 * row, single-use for answers, no auth side-effects beyond the
 * boolean write (Part V).
 */

const RESPONSES: Record<
  string,
  { got_interview: boolean | null; applied_after_scan: boolean }
> = {
  interview: { got_interview: true, applied_after_scan: true },
  none: { got_interview: false, applied_after_scan: true },
  noapply: { got_interview: null, applied_after_scan: false },
}

function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;background:#f6f4ee;color:#1f3a39;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}main{max-width:420px;text-align:center}h1{font-size:22px}p{line-height:1.6;color:#4a5a58}</style>
</head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params
  const response = req.nextUrl.searchParams.get("r") || ""

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return page("Link not recognised", "This outcome link is not valid.")
  }

  try {
    const { data: stat } = await supabaseAdmin
      .from("swap_stats")
      .select("id, user_id")
      .eq("outcome_token", token)
      .maybeSingle()

    if (!stat) {
      return page(
        "Link expired",
        "We couldn't match this link to a scan — it may have been removed."
      )
    }

    if (response === "unsub") {
      if (stat.user_id) {
        await supabaseAdmin
          .from("swap_consents")
          .update({ revoked_at: new Date().toISOString() })
          .eq("user_id", stat.user_id)
          .eq("kind", "outcome_email")
          .is("revoked_at", null)
      }
      await supabaseAdmin.from("swap_outcome_queue").delete().eq("stat_id", stat.id)
      return page(
        "Unsubscribed",
        "No more outcome emails. Thanks for trying the swap test."
      )
    }

    const values = RESPONSES[response]
    if (!values) {
      return page("Link not recognised", "This outcome link is not valid.")
    }

    // Single-use: the first answer wins.
    const { data: existing } = await supabaseAdmin
      .from("swap_outcomes")
      .select("id")
      .eq("stat_id", stat.id)
      .maybeSingle()

    if (!existing) {
      await supabaseAdmin.from("swap_outcomes").insert({
        stat_id: stat.id,
        got_interview: values.got_interview,
        got_offer: null,
        applied_after_scan: values.applied_after_scan,
      })
    }

    // The queued plaintext address is deleted on first touch either
    // way — its job (one send) is done.
    await supabaseAdmin.from("swap_outcome_queue").delete().eq("stat_id", stat.id)

    return page(
      "Recorded — thank you",
      "That's the whole survey. We publish what we learn, including if our scores turn out not to matter."
    )
  } catch (error) {
    swapLogError("outcome.error", { message: (error as Error).message })
    return page("Something went wrong", "Please try the link again later.")
  }
}
