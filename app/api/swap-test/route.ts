import { existsSync, readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { resolve } from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentAppUser } from "@/lib/app-data"
import { getBasePlan } from "@/lib/plans"
import stoplistJson from "@/config/boilerplate-stoplist.json"
import { classifyWithAgent, AgentParseError } from "@/lib/swap/agent"
import { buildFixes } from "@/lib/swap/fixes"
import {
  CORPUS_SWITCHOVER,
  inferCompanyTokens,
  resolveMode,
  roleFamily,
  type Stoplist,
} from "@/lib/swap/idf"
import { fingerprintFrom } from "@/lib/swap/fingerprint"
import { checkLadder, commitScan } from "@/lib/swap/ladder"
import { swapLog, swapLogError } from "@/lib/swap/logscrub"
import { resolveProfile } from "@/lib/swap/profile"
import {
  circuitBreakerCount,
  dailyBudget,
  getSwapKV,
  slidingWindowAllow,
} from "@/lib/swap/ratelimit"
import { applyRedaction, redactionSummary } from "@/lib/swap/redact"
import { classifySentences, RUBRIC_VERSION, scoreLetter } from "@/lib/swap/score"
import { countWords, segmentSentences } from "@/lib/swap/segment"
import { affectSignal } from "@/lib/swap/signals/affect"
import { echoOverlap } from "@/lib/swap/signals/echo"
import { rhythmCv } from "@/lib/swap/signals/rhythm"
import {
  DUPLICATE_WINDOW_SECONDS,
  isDuplicate,
  simhash64,
  simhashFromHex,
  simhashHex,
} from "@/lib/swap/simhash"
import type {
  ClassifiedSentence,
  ScanResult,
  SwapThresholds,
} from "@/lib/swap/types"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * POST /api/swap-test — the scan pipeline (§3.1):
 * validate → ladder → Turnstile (scan ≥2) → duplicate window →
 * segment → agent (one Haiku call, Rule 3) → distinctiveness →
 * score → signals → profile → redact → fixes → respond.
 * Side-effects: swap_stats row (numbers only), jd term-frequency
 * upsert, outcome queue for consented accounts. The letter itself
 * is never persisted and never logged (Rules 1 & 2).
 */

const MIN_CHARS = 300
const MAX_CHARS = 8000

const stoplist = stoplistJson as unknown as Stoplist

function loadThresholds(): SwapThresholds | null {
  try {
    const p = resolve(process.cwd(), "config/swap-thresholds.json")
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, "utf-8")) as SwapThresholds
  } catch {
    return null
  }
}
const thresholds = loadThresholds()

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    // DEV ONLY — production requires Turnstile from scan 2 (Part V).
    return process.env.NODE_ENV !== "production"
  }
  if (!token) return false
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  return (fwd ? fwd.split(",")[0] : "").trim() || "0.0.0.0"
}

const CLASS_CODES: Record<ClassifiedSentence["cls"], string> = {
  structural: "ST",
  "distinctive-them": "TD",
  "boilerplate-them": "TB",
  "checkable-you": "YC",
  "asserted-you": "YA",
}

function histogram(codes: (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of codes) if (c) out[c] = (out[c] ?? 0) + 1
  return out
}

/** JD side-effect (Rule 1b): term frequencies only, never raw text. */
async function upsertJdTerms(jd: string, family: string): Promise<void> {
  const tokens = new Set(
    (jd.toLowerCase().match(/[a-z]{3,30}/g) || []).filter(
      (t) => /^[a-z]+$/.test(t)
    )
  )
  if (tokens.size === 0) return
  const rows = [...tokens, "__docs__"].map((gram) => ({ gram, role_family: family }))
  // Increment via RPC-free two-step: fetch existing, then upsert.
  const { data: existing } = await supabaseAdmin
    .from("vocab_counts")
    .select("gram, cnt")
    .eq("role_family", family)
    .in("gram", rows.map((r) => r.gram))
  const counts = new Map((existing ?? []).map((r) => [r.gram, r.cnt]))
  await supabaseAdmin.from("vocab_counts").upsert(
    rows.map((r) => ({
      gram: r.gram,
      role_family: family,
      cnt: (counts.get(r.gram) ?? 0) + 1,
    })),
    { onConflict: "gram,role_family" }
  )
}

async function loadDocFreqs(
  family: string,
  phraseTokens: string[]
): Promise<{ docFreqs: Map<string, number> | null; corpusSize: number }> {
  const { data: docsRow } = await supabaseAdmin
    .from("vocab_counts")
    .select("cnt")
    .eq("role_family", family)
    .eq("gram", "__docs__")
    .maybeSingle()
  const corpusSize = docsRow?.cnt ?? 0
  if (corpusSize < CORPUS_SWITCHOVER || phraseTokens.length === 0) {
    return { docFreqs: null, corpusSize }
  }
  const { data } = await supabaseAdmin
    .from("vocab_counts")
    .select("gram, cnt")
    .eq("role_family", family)
    .in("gram", phraseTokens)
  return {
    docFreqs: new Map((data ?? []).map((r) => [r.gram, r.cnt])),
    corpusSize,
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  const body = (await req.json().catch(() => ({}))) as {
    letter?: string
    jd?: string
    company?: string
    timezone?: string
    turnstileToken?: string
  }

  const letter = String(body.letter || "")
  if (letter.length < MIN_CHARS || letter.length > MAX_CHARS) {
    return NextResponse.json(
      {
        error: `Paste the full letter — between ${MIN_CHARS} and ${MAX_CHARS.toLocaleString()} characters.`,
      },
      { status: 400 }
    )
  }
  const jd = body.jd ? String(body.jd).slice(0, 20000) : null

  const ip = clientIp(req)
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 24)
  const fingerprint = fingerprintFrom({
    ip,
    userAgent: req.headers.get("user-agent"),
    platform: req.headers.get("sec-ch-ua-platform"),
    timezone: body.timezone,
  })

  const kv = getSwapKV()

  // Fast sliding window per fingerprint before anything costly.
  if (!(await slidingWindowAllow(kv, `swap:win:${fingerprint.slice(0, 24)}`, 6, 60))) {
    swapLog("scan_blocked", { reason: "rate" })
    return NextResponse.json({ error: "Slow down a moment.", reason: "rate" }, { status: 429 })
  }

  const { user } = await getCurrentAppUser()
  const paying = user ? getBasePlan(user.plan) !== "free" : false

  let accountScansUsed = 0
  if (user && !paying) {
    const { count } = await supabaseAdmin
      .from("swap_stats")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
    accountScansUsed = count ?? 0
  }

  const ladder = await checkLadder({
    kv,
    fingerprint,
    ipHash,
    userId: user?.id ?? null,
    paying,
    accountScansUsed,
  })

  if (!ladder.allowed) {
    swapLog("scan_blocked", { reason: ladder.reason })
    if (ladder.reason === "acct_limit") {
      // The Wall: trajectory from their own stats (Part I §1.2).
      const { data: history } = await supabaseAdmin
        .from("swap_stats")
        .select("anchor_score, proof_score")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
      const first = history?.[0]
      const last = history?.[history.length - 1]
      return NextResponse.json(
        {
          reason: "acct_limit",
          wall: {
            a1: first?.anchor_score ?? 0,
            a3: last?.anchor_score ?? 0,
            p1: first?.proof_score ?? 0,
            p3: last?.proof_score ?? 0,
          },
        },
        { status: 402 }
      )
    }
    const status = ladder.reason === "rate" ? 429 : 403
    return NextResponse.json({ reason: ladder.reason }, { status })
  }

  // Turnstile from scan 2 upward (Part V).
  if (ladder.tier !== "paying" && (ladder.ordinal ?? 1) >= 2) {
    const human = await verifyTurnstile(body.turnstileToken, ip)
    if (!human) {
      swapLog("scan_blocked", { reason: "turnstile" })
      return NextResponse.json({ reason: "turnstile" }, { status: 403 })
    }
  }

  // Circuit breaker: over the global daily budget the anonymous tier
  // requires hard Turnstile (Part V) — and the alert fires.
  const globalCount = await circuitBreakerCount(kv)
  if (globalCount > dailyBudget()) {
    swapLogError("circuit_breaker", { count: globalCount, budget: dailyBudget() })
    if (ladder.tier === "anon") {
      const human = await verifyTurnstile(body.turnstileToken, ip)
      if (!human) {
        swapLog("scan_blocked", { reason: "circuit" })
        return NextResponse.json({ reason: "circuit" }, { status: 503 })
      }
    }
  }

  // Resubmit window: identical/near-identical within 10 minutes does
  // not burn a scan. Only hash + timestamp live in KV (never text),
  // so the classification re-runs (cached prefix makes it cheap) —
  // the LADDER is what the duplicate must not consume.
  const hash = simhash64(letter)
  const dupKey = `swap:dup:${user?.id ?? fingerprint.slice(0, 24)}`
  const prevHex = await kv.get(dupKey)
  const duplicate = prevHex ? isDuplicate(hash, simhashFromHex(prevHex)) : false

  // Segment + classify (the one LLM call).
  const segmented = segmentSentences(letter)
  if (segmented.length === 0) {
    return NextResponse.json({ error: "Could not read any sentences." }, { status: 400 })
  }

  let agent
  try {
    agent = await classifyWithAgent(segmented)
  } catch (error) {
    if (error instanceof AgentParseError) {
      swapLogError("agent.malformed", { message: error.message })
      return NextResponse.json(
        { error: "The classifier returned an unreadable result. Try again." },
        { status: 502 }
      )
    }
    swapLogError("agent.call", { message: (error as Error).message })
    return NextResponse.json(
      { error: "Scan temporarily unavailable." },
      { status: 502 }
    )
  }

  // Distinctiveness context (corpus vs stoplist).
  const family = roleFamily(jd, letter)
  const phraseTokens = [
    ...new Set(
      agent.labels
        .flatMap((l) => l.themPhrases)
        .flatMap((p) => p.toLowerCase().match(/[a-z]{3,30}/g) || [])
    ),
  ]
  const { docFreqs, corpusSize } = await loadDocFreqs(family, phraseTokens)
  const ctx = {
    companyName: body.company || null,
    extraCompanyTokens: inferCompanyTokens(letter, stoplist),
    docFreqs,
    corpusSize,
    stoplist,
  }

  const classified = applyRedaction(
    classifySentences(segmented, agent.labels, ctx)
  )
  const scores = scoreLetter(classified)

  const live = classified.filter((s) => !s.structural)
  const nonStructuralText = live.map((s) => s.text).join(" ")
  const echo = echoOverlap(nonStructuralText, jd)
  const affect = affectSignal(nonStructuralText, scores.checkableClaims)
  const cv = rhythmCv(live.map((s) => s.words))
  const signals = { echo, affectCount: affect.affectCount, affectRatio: affect.ratio, cv }

  const { profile, confidence } = resolveProfile(scores.quadrant, signals, Boolean(jd), thresholds)
  const fixes = buildFixes(classified, scores)
  const fixesShown = ladder.ordinal === 1 ? Math.min(1, fixes.length) : fixes.length

  let outcomeToken: string | null = null

  if (!duplicate) {
    // swap_stats row — numbers only (Rule 1).
    const paragraphCount = letter.split(/\n\s*\n/).filter((p) => p.trim()).length
    const { data: statRow } = await supabaseAdmin
      .from("swap_stats")
      .insert({
        user_id: user?.id ?? null,
        scan_ordinal: ladder.ordinal,
        anchor_score: scores.anchor,
        proof_score: scores.proof,
        quadrant: scores.quadrant,
        profile,
        profile_confidence: confidence,
        word_count: countWords(letter),
        sentence_count: segmented.length,
        paragraph_count: paragraphCount,
        role_family: family,
        had_jd: Boolean(jd),
        mode: resolveMode(ctx),
        echo,
        affect_ratio: affect.ratio,
        affect_count: affect.affectCount,
        cv,
        label_sequence: classified.map((s) => CLASS_CODES[s.cls]).join(","),
        technique_hist: histogram(classified.map((s) => s.technique)),
        failure_hist: histogram(classified.map((s) => s.failure)),
        opening_code: live[0]?.technique ?? live[0]?.failure ?? null,
        closing_code:
          live[live.length - 1]?.technique ?? live[live.length - 1]?.failure ?? null,
        rubric_version: RUBRIC_VERSION,
        thresholds_version: thresholds?.version ?? null,
      })
      .select("id, outcome_token")
      .single()

    outcomeToken = statRow?.outcome_token ?? null

    // Outcome queue for consented account holders (30-day email).
    if (user && statRow?.id) {
      const { data: consent } = await supabaseAdmin
        .from("swap_consents")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", "outcome_email")
        .is("revoked_at", null)
        .maybeSingle()
      if (consent && user.email) {
        await supabaseAdmin.from("swap_outcome_queue").insert({
          stat_id: statRow.id,
          consent_id: consent.id,
          email: user.email,
        })
      }
    }

    // JD term frequencies (never the text) grow the corpus.
    if (jd) {
      await upsertJdTerms(jd, family).catch((err) =>
        swapLogError("jd.upsert", { message: (err as Error).message })
      )
    }

    await commitScan({ kv, fingerprint, ipHash, tier: ladder.tier })
    await kv.set(dupKey, simhashHex(hash), DUPLICATE_WINDOW_SECONDS)
  }

  const result: ScanResult = {
    rubricVersion: RUBRIC_VERSION,
    thresholdsVersion: thresholds?.version ?? null,
    sentences: classified,
    scores,
    signals: { echo, affectCount: affect.affectCount, affectRatio: affect.ratio },
    profile,
    confidence,
    redactionSummary: redactionSummary(classified),
    fixes: fixes.slice(0, fixesShown),
    fixesShown,
    distinctMode: resolveMode(ctx),
    corpusSize,
    ordinal: ladder.ordinal,
    tier: ladder.tier,
    cached: duplicate,
    outcomeToken,
  }

  swapLog("scan_completed", {
    ordinal: ladder.ordinal,
    anchor: scores.anchor,
    proof: scores.proof,
    quadrant: scores.quadrant,
    profile,
    confidence,
    mode: result.distinctMode,
    role_family: family,
    had_jd: Boolean(jd),
    latency_ms: Date.now() - started,
    cache_hit: agent.cacheReadTokens > 0,
    cache_read: agent.cacheReadTokens,
    cache_creation: agent.cacheCreationTokens,
    output_tokens: agent.outputTokens,
    letter: undefined,
  })

  return NextResponse.json(result)
}
