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

COMPOSITION RULES — recombining true atoms into a false story is fabrication:
- TOOL-IN-STORY: a claim that a tool/skill was used IN a specific project or win ("I used SQL to validate the expense data") is FABRICATED unless that win's OWN text names the tool. The skills list only supports plain familiarity statements ("I work in SQL").
- INVENTED NARRATIVE: career stories, workflows, scenes, or collaborations assembled from skill keywords but present in NO win ("across my growth and lifecycle campaigns…" when no win describes campaigns) are FABRICATED, even if every noun appears somewhere in the inputs.
- IDENTITY INVERSION: the candidate's role/employer is shown on each win. A sentence that recasts them (a CFO "presenting a case to the CFO", a founder "reporting to leadership") CONTRADICTS the profile and is FABRICATED.

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
  // provided profile is reset to null (no fake mapping). When a
  // profile is supplied, an empty win inventory means NO winId is
  // valid — a model-invented id must never count as grounding.
  const knownWinIds = new Set(args.profile?.wins.map((w) => w.id) ?? [])
  const cleanedClaimMap = result.data.claimMap.map((c) => ({
    sentence: c.sentence,
    winId:
      c.winId && (args.profile ? knownWinIds.has(c.winId) : true)
        ? c.winId
        : null,
  }))

  // Deterministic TOOL-IN-STORY reconciliation. The screenshot-proven
  // failure mode: every atom is grounded (SQL is on the skills list,
  // the 45% win is real) but the composed sentence ("I used SQL to
  // validate the expense data") is fiction. The model verifier can
  // miss this, so it is enforced in code: a claim mapped to a win
  // whose own text does NOT name the tool the sentence cites is
  // demoted to unmapped — which the auto-cleaner then strips. The
  // qualifications virtual win is exempt (its text IS the skills and
  // tools list, so plain capability sentences legitimately map there).
  const skillTokens = (args.profile?.skills ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2)
  const winTextById = new Map<string, string>()
  const qualificationWinIds = new Set<string>()
  for (const w of args.profile?.wins ?? []) {
    winTextById.set(
      w.id,
      // Per-win skills/tools are part of the win's own record (profile
      // v3), so tools recorded on the win legitimately pass the
      // tool-in-story check for that win.
      `${w.what} ${w.number} ${w.whyItMattered} ${w.entryLabel} ${w.skills ?? ""} ${w.tools ?? ""}`.toLowerCase()
    )
    if (w.entryType === "qualifications") qualificationWinIds.add(w.id)
  }
  const compositionUnmapped: string[] = []
  const reconciledClaimMap = cleanedClaimMap.map((c) => {
    if (!c.winId || qualificationWinIds.has(c.winId)) return c
    const winText = winTextById.get(c.winId) ?? ""
    const sentence = c.sentence.toLowerCase()
    const offendingTool = skillTokens.find(
      (tok) => tokenAppears(sentence, tok) && !tokenAppears(winText, tok)
    )
    if (offendingTool) {
      compositionUnmapped.push(c.sentence)
      return { sentence: c.sentence, winId: null }
    }
    return c
  })

  // Never trust the model-emitted risk enum below what its own
  // evidence lists prove. A response of risk:"none" alongside a
  // non-empty fabricatedFacts list would otherwise ship flagged
  // content — the certification must be derived from the evidence,
  // not the summary field.
  const unmapped = [
    ...(result.data.unmappedClaims ?? []),
    ...compositionUnmapped,
  ]
  const evidenceRisk: HallucinationCheckFull["risk"] =
    result.data.fabricatedFacts.length > 0
      ? "high"
      : unmapped.length > 0 || reconciledClaimMap.some((c) => c.winId === null)
        ? "medium"
        : result.data.unverifiedClaims.length > 0
          ? "low"
          : "none"
  const risk = maxRisk(result.data.risk, evidenceRisk)

  const data: HallucinationCheck = {
    risk,
    unverifiedClaims: result.data.unverifiedClaims,
    fabricatedFacts: result.data.fabricatedFacts,
    claimMap: reconciledClaimMap,
    unmappedClaims: unmapped,
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
  /**
   * When true, also strip soft/unverified statements (the legacy
   * `unverifiedClaims` — interests, opinions, self-assessment) in
   * addition to fabricated + unmapped claims. Used by the final
   * grounding gate when the bar is strict "none" (no soft language
   * either), not just "no hard fabrication".
   */
  stripUnverified?: boolean
}): { letter: string; removed: string[]; skipped: string[]; reason?: string } {
  const offending = new Set<string>(
    [
      ...args.check.fabricatedFacts,
      ...(args.check.unmappedClaims ?? []),
      ...(args.stripUnverified ? args.check.unverifiedClaims ?? [] : []),
    ]
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
  // Protect abbreviation periods (Co., Inc., Ph.D., e.g.) so the sentence
  // splitter does not sever a claim mid-abbreviation — which would orphan a
  // grounded win into a fragment that the verifier then distrusts. The
  // sentinel is a NUL char so restoring it back to "." is always lossless.
  const ABBR_PLACEHOLDER = " "
  const protectedBody = protectAbbreviations(bodyText, ABBR_PLACEHOLDER)
  const sents: string[] = []
  const regex = /[^.!?]+[.!?]+(?=\s|$)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(protectedBody)) !== null) {
    sents.push(restoreAbbreviations(m[0], ABBR_PLACEHOLDER).trim())
  }
  if (sents.length === 0 && bodyText) sents.push(bodyText)
  return { greeting, bodySentences: sents, signoff }
}

/** Common abbreviations whose internal/trailing periods are NOT sentence ends. */
const KNOWN_ABBREVIATIONS = [
  "Co", "Inc", "Ltd", "Corp", "LLC", "LLP", "PLC",
  "Dr", "Mr", "Mrs", "Ms", "Prof", "Sr", "Jr", "St",
  "Dept", "Univ", "Assoc", "Bros", "No", "vs", "etc",
  "Ph.D", "M.D", "B.A", "B.S", "M.A", "M.S", "M.B.A",
  "e.g", "i.e", "U.S", "U.K", "a.m", "p.m",
]

function protectAbbreviations(text: string, placeholder: string): string {
  let out = text
  for (const abbr of KNOWN_ABBREVIATIONS) {
    const escaped = abbr.replace(/\./g, "\\.")
    // Match the abbreviation followed by a period; replace EVERY period in
    // the matched token (including internal ones like Ph.D.) so none are
    // treated as a sentence boundary.
    out = out.replace(new RegExp(`\\b${escaped}\\.`, "g"), (match) =>
      match.replace(/\./g, placeholder)
    )
  }
  return out
}

function restoreAbbreviations(text: string, placeholder: string): string {
  return text.split(placeholder).join(".")
}

/** Word-boundary containment for skill/tool tokens ("excel" must not
 *  match inside "excellent"; multi-word tokens match as phrases). */
function tokenAppears(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack)
}

const RISK_ORDER: HallucinationCheck["risk"][] = ["none", "low", "medium", "high"]

/** Return the stricter (higher) of two risk levels. */
function maxRisk(
  a: HallucinationCheck["risk"],
  b: HallucinationCheck["risk"]
): HallucinationCheck["risk"] {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b
}

function renderWinsForVerifier(p: ProfileAnalysis): string {
  const lines: string[] = []
  lines.push(`Candidate: ${p.candidateName} · ${p.seniority} · ${p.industries.join(", ") || "—"}`)
  if (p.skills.length)
    lines.push(
      `Skills & tools (familiarity ONLY — supports "I work in X" statements, NEVER that X was used in a specific win unless that win's own text names it): ${p.skills.join(", ")}`
    )
  if (p.qualifications) lines.push(`Qualifications (verifiable): ${p.qualifications}`)
  lines.push("")
  lines.push(
    `Wins (SOURCE OF TRUTH — every concrete claim must map to one of these). The "impact:" clause is the candidate's OWN statement of why the win mattered; it is candidate-supplied truth, so a claim that restates a win's impact IS grounded and maps to that winId:`
  )
  for (const w of p.wins) {
    const num = w.number ? ` [${w.number}]` : ""
    const why = w.whyItMattered ? ` — impact: ${w.whyItMattered}` : ""
    const caps = [
      w.skills?.trim() ? `skills used: ${w.skills.trim()}` : "",
      w.tools?.trim() ? `tools used: ${w.tools.trim()}` : "",
    ]
      .filter(Boolean)
      .join("; ")
    const capNote = caps ? ` (${caps} — claims that these were used in THIS win are grounded)` : ""
    lines.push(`  · winId=${w.id} ${w.what}${num}${why}${capNote}  ⟵ ${w.entryLabel}`)
  }
  return lines.join("\n")
}
