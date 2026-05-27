import { z } from "zod"
import { MODELS, runAgent } from "../run-agent"
import { safeSlice } from "../utils"
import type {
  AgentRunLog,
  HallucinationCheck,
  ProfileAnalysis,
} from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * Hallucination Check — "The Grounding Verifier"
 *
 * Persona: fact-checker who treats the candidate's input as the
 * only source of truth. Job description is allowed context but
 * never a source of candidate facts.
 *
 * Blueprint requirements:
 *   - Runs on EVERY tier (all paid plans).
 *   - Runs ×2 on Ultra: once BEFORE Final Editor and once AFTER.
 *   - Exact win-mapping: each concrete claim sentence MUST map to
 *     a specific winId from the ProfileAnalysis. Unmapped → risk.
 *   - Outputs both legacy fields (fabricatedFacts, unverifiedClaims)
 *     and new claimMap[] for downstream Rewrite Agent precision.
 *
 * Model: Haiku 4.5. Verification is matching, not reasoning — Haiku
 * handles it well at ~5× lower cost than Sonnet. Per blueprint.
 */

const HallucinationCheckSchema = z.object({
  risk: z.enum(["none", "low", "medium", "high"]),
  unverifiedClaims: z.array(z.string()),
  fabricatedFacts: z.array(z.string()),
  claimMap: z.array(
    z.object({
      sentence: z.string(),
      winId: z.string().nullable(),
    })
  ),
  unmappedClaims: z.array(z.string()),
})

type HallucinationCheckFull = z.infer<typeof HallucinationCheckSchema>

const SYSTEM = `You are a fact-checker verifying that every concrete claim in a cover letter is grounded in the candidate's own inputs. The candidate's wins (each with a stable winId) are your ONLY source of truth for candidate facts. The job description is context, NOT a source.

For each sentence that makes a concrete claim (number, scale, named tool, named project, employer, certification, duration, scope), do this:
1. Find the winId from the candidate's wins that supports the claim.
2. If no winId supports it, the claim is UNMAPPED.
3. If the claim contradicts a win or invents a specific (employer, number, language not on the candidate's profile), it is FABRICATED.

Output:
- "risk":
  - "none" — every concrete claim maps to a winId, no fabrications
  - "low" — only soft/unverified statements (interests, opinions), no hard claims unmapped
  - "medium" — at least one HARD claim (number/tool/scope) unmapped to a win
  - "high" — at least one FABRICATED claim (contradicts wins or invents a specific)
- "claimMap": every concrete-claim sentence in the letter, paired with the supporting winId (or null if unmapped). Quote the sentence verbatim.
- "unmappedClaims": the sentences from claimMap that have winId=null AND make a hard specific claim. Up to 8.
- "unverifiedClaims": LEGACY field — up to 5 soft/unverified statements (kept for downstream compatibility).
- "fabricatedFacts": up to 5 sentences that CONTRADICT a win or invent a hard specific. Empty if none.

Be strict — false positives are better than false negatives. Always quote letter sentences verbatim.`

const FALLBACK_HALLUCINATION_CHECK: HallucinationCheckFull = {
  risk: "low",
  unverifiedClaims: [],
  fabricatedFacts: [],
  claimMap: [],
  unmappedClaims: [],
}

export interface HallucinationDetectorResult {
  data: HallucinationCheck
  log: AgentRunLog
  /** @deprecated Use `log`. */
  meta: CallMeta
  /** @deprecated Use `log.fallbackTriggered`. */
  fallback: boolean
}

export async function runHallucinationDetector(args: {
  letter: string
  /** Preferred — gives the verifier exact win ids to map against. */
  profile?: ProfileAnalysis
  /** Legacy — used when the orchestrator still passes free-text resume. */
  resumeText?: string
  jobDescription: string
  cycleNumber?: number
}): Promise<HallucinationDetectorResult> {
  const sourceBlock = args.profile
    ? renderWinsForVerifier(args.profile)
    : `Resume (legacy free-text source of truth):\n${safeSlice(args.resumeText ?? "", 8000)}`

  const result = await runAgent({
    agent: "HallucinationCheck",
    model: MODELS.haiku,
    cycleNumber: args.cycleNumber ?? 0,
    system: SYSTEM,
    user: [
      sourceBlock,
      "",
      `Job description (context only — NEVER a source of candidate facts):\n${safeSlice(args.jobDescription, 6000)}`,
      "",
      `Letter to verify:\n\n${args.letter}`,
    ].join("\n"),
    schema: HallucinationCheckSchema,
    schemaName: "submit_hallucination_check",
    schemaDescription:
      "Submit the grounding check for the cover letter, including per-sentence winId mapping.",
    fallback: FALLBACK_HALLUCINATION_CHECK,
    maxTokens: 1800,
    temperature: 0.1,
    timeoutMs: 25_000,
  })

  // Enforce a hard guarantee: any winId returned that isn't in the
  // provided profile is reset to null (no fake mapping).
  const knownWinIds = new Set(args.profile?.wins.map((w) => w.id) ?? [])
  const cleanedClaimMap = result.data.claimMap.map((c) => ({
    sentence: c.sentence,
    winId: c.winId && (knownWinIds.size === 0 || knownWinIds.has(c.winId)) ? c.winId : null,
  }))

  const data: HallucinationCheck = {
    risk: result.data.risk,
    unverifiedClaims: result.data.unverifiedClaims,
    fabricatedFacts: result.data.fabricatedFacts,
    claimMap: cleanedClaimMap,
    unmappedClaims: result.data.unmappedClaims,
  }

  return {
    data,
    log: result.log,
    meta: {
      modelUsed: result.log.modelUsed,
      tokensInput: result.log.tokensInput,
      tokensOutput: result.log.tokensOutput,
      durationMs: result.log.durationMs,
    },
    fallback: result.log.fallbackTriggered,
  }
}

/**
 * Deterministic hallucination auto-cleaner.
 *
 * Strips any sentence that the HallucinationCheck flagged as
 * fabricated OR unmapped. Hard guard: NEVER reduce the body to
 * fewer than 3 sentences — if doing so would, leave the letter
 * untouched and let the rewrite loop handle it.
 *
 * Returns { letter, removed } so the orchestrator can persist what
 * was scrubbed in agent_outputs.
 */
export function autoCleanHallucinations(args: {
  letter: string
  check: HallucinationCheck
}): { letter: string; removed: string[]; skipped: string[]; reason?: string } {
  const offending = new Set<string>(
    [...args.check.fabricatedFacts, ...(args.check.unmappedClaims ?? [])]
      .map((s) => s.trim())
      .filter(Boolean)
  )
  if (offending.size === 0) {
    return { letter: args.letter, removed: [], skipped: [] }
  }

  // Split into greeting / body sentences / signoff.
  const { greeting, bodySentences, signoff } = splitLetter(args.letter)
  const total = bodySentences.length
  if (total <= 3) {
    return {
      letter: args.letter,
      removed: [],
      skipped: Array.from(offending),
      reason: `Body has only ${total} sentence(s); cannot trim without dropping below the 3-sentence floor.`,
    }
  }

  const removed: string[] = []
  const skipped: string[] = []
  const kept: string[] = []
  let remaining = total
  for (const s of bodySentences) {
    const isOffending = offending.has(s.trim()) ||
      Array.from(offending).some((o) => s.includes(o))
    if (isOffending && remaining - 1 >= 3) {
      removed.push(s)
      remaining -= 1
    } else if (isOffending) {
      // Hit the floor — keep the rest.
      skipped.push(s)
      kept.push(s)
    } else {
      kept.push(s)
    }
  }

  if (removed.length === 0) {
    return {
      letter: args.letter,
      removed: [],
      skipped,
      reason: skipped.length > 0 ? "Would have dropped below 3-sentence floor." : undefined,
    }
  }

  const rebuiltBody = kept.join(" ")
  const out = [
    greeting,
    "",
    rebuiltBody,
    "",
    signoff,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return { letter: out, removed, skipped }
}

function splitLetter(letter: string): {
  greeting: string
  bodySentences: string[]
  signoff: string
} {
  const lines = letter.split(/\r?\n/)
  let greetingEnd = -1
  let signoffStart = -1
  for (let i = 0; i < lines.length; i += 1) {
    const lower = lines[i].trim().toLowerCase()
    if (greetingEnd === -1 && lower.startsWith("dear ")) {
      greetingEnd = i
    }
    if (
      signoffStart === -1 &&
      (lower === "sincerely," || lower === "sincerely" ||
       lower === "regards," || lower === "best,")
    ) {
      signoffStart = i
      break
    }
  }
  if (greetingEnd === -1) greetingEnd = 0
  if (signoffStart === -1) signoffStart = lines.length

  const greeting = lines.slice(0, greetingEnd + 1).join("\n").trim()
  const signoff = lines.slice(signoffStart).join("\n").trim()
  const bodyText = lines.slice(greetingEnd + 1, signoffStart).join(" ").trim()
  const sents: string[] = []
  const regex = /[^.!?]+[.!?]+(?=\s|$)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(bodyText)) !== null) sents.push(m[0].trim())
  if (sents.length === 0 && bodyText) sents.push(bodyText)
  return { greeting, bodySentences: sents, signoff }
}

function renderWinsForVerifier(p: ProfileAnalysis): string {
  const lines: string[] = []
  lines.push(`Candidate: ${p.candidateName} · ${p.seniority} · ${p.industries.join(", ") || "—"}`)
  if (p.skills.length) lines.push(`Skills (verifiable): ${p.skills.join(", ")}`)
  if (p.qualifications) lines.push(`Qualifications (verifiable): ${p.qualifications}`)
  lines.push("")
  lines.push(`Wins (SOURCE OF TRUTH — every concrete claim must map to one of these):`)
  for (const w of p.wins) {
    const num = w.number ? ` [${w.number}]` : ""
    lines.push(`  · winId=${w.id} ${w.what}${num}  ⟵ ${w.entryLabel}`)
  }
  return lines.join("\n")
}
