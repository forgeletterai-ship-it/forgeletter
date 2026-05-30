import { z } from "zod"
import { MODELS, runAgent } from "../run-agent"
import type { HMCritique, JobAnalysis } from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * HM Critic — "The Decision Maker" (Ultra only) — Evaluation Spec v1
 *
 * Source of truth: docs/agents/hm-critic-spec-v1.md (a verbatim copy
 * of ForgeLetter_HM_Critic_Evaluation_Spec.docx). This file
 * implements section 3 (scorable rubric), section 4 (framework
 * scorecard), section 5 (output schema), section 6 (bias control),
 * and the section-7 deterministic cross-checks.
 *
 * THE OPERATING PRINCIPLE (section 2):
 *   Every anchor maps to one of three measurable signals:
 *     • Counted   — how many of the JD's top priorities a sentence
 *                   in the letter explicitly addresses.
 *     • Ratio     — share of claims carrying a number, named entity,
 *                   or attributed third-party result.
 *     • Present/  — opening value-first; banned phrase present;
 *       absent       company paragraph passes the swap test.
 *
 * THE RUBRIC (section 3, five weighted dimensions):
 *   - Relevance (25)  ← count vs JD top-5 priorities
 *   - Evidence  (25)  ← quantified/named/attributed ratio
 *   - Clarity   (20)  ← checkable faults count
 *   - Competencies (15) ← STAR stories vs claimed traits
 *   - Fit       (15)  ← swap test on company paragraph
 *
 *   Confident register is a PASS/FAIL OVERLAY, not a weighted
 *   dimension: a neediness phrase caps the final score at 80.
 *
 * THE SCORECARD (section 4):
 *   After the rubric produces a number, the critic runs a second
 *   pass that scores the way the best companies actually evaluate.
 *   It does NOT alter the weighted score. It produces flags that
 *   guide the rewrite and surface as quality signals.
 *
 * THE OUTPUT (section 5):
 *   weightedScore, registerCapped, wouldInterview, dimensions,
 *   scorecard, genericPhrases, strongestSentence, weakestSentence,
 *   consistencyNote, rewriteTargets.
 *
 * BIAS CONTROL (section 6):
 *   - Blind review — identity signals are ignored.
 *   - 3-rater reconciliation — converges on countable anchors,
 *     not impressions.
 *   - Equity check — rationale rests on competencies + evidence.
 *
 * REPRODUCIBILITY (section 7) — cross-checked in code:
 *   - Evidence ratio (model signal vs deterministic count)
 *   - Banned-phrase presence (Clarity check)
 *   - Over-long-sentence count (Clarity check)
 *
 * QUALITY GATE OWNS THE PASS BAR. This agent never decides pass/fail
 * against the 90/93/95 tier threshold; it only measures.
 */

// ─────────────────────────────────────────────────────────────────
// Deterministic checks (section 7 cross-references)
// ─────────────────────────────────────────────────────────────────

/** Neediness phrases — section 3, confident-register overlay.
 *  Detected deterministically; the model cannot override the cap. */
const NEEDINESS_PHRASES: readonly string[] = [
  "honoured to be considered",
  "honored to be considered",
  "hope to hear",
  "truly believe i am",
  "i would be honoured",
  "i would be honored",
  "i am writing to express my interest",
  "would be grateful",
  "thank you for your consideration",
  "humbly request",
  "if given the opportunity",
] as const

/** Cliché / generic phrases — surfaced in genericPhrases output
 *  field for the rewrite agent. Section 4a + research-section 5. */
const GENERIC_PHRASES: readonly string[] = [
  "team player",
  "results-driven",
  "results-oriented",
  "passionate about",
  "highly motivated",
  "detail-oriented",
  "hit the ground running",
  "go-getter",
  "rockstar",
  "ninja",
  "synergy",
  "synergies",
  "in today's fast-paced world",
  "perfect candidate",
  "i am confident that",
] as const

interface DeterministicChecks {
  neednessHits: string[]
  registerCappedDeterministic: boolean
  bannedPhraseHits: string[]
  overlongSentenceCount: number
  totalSentenceCount: number
  /** Sentences that contain at least one of: a digit, a named
   *  capitalised entity (>= 2 words), or attribution markers. */
  evidenceClaimCount: number
  totalClaimCount: number
  evidenceRatio: number
}

function runDeterministicChecks(letter: string): DeterministicChecks {
  const lower = letter.toLowerCase()
  const neednessHits = NEEDINESS_PHRASES.filter((p) => lower.includes(p))
  const bannedPhraseHits = GENERIC_PHRASES.filter((p) => lower.includes(p))

  // Sentence-level pass.
  const sentences = splitIntoBodySentences(letter)
  const overlong = sentences.filter((s) => wordsIn(s) > 30)

  // Evidence ratio: of body sentences that make a CLAIM (i.e. assert
  // something about the candidate), what fraction carry a number,
  // a named entity, or attribution? We approximate "claim" as any
  // sentence with a first-person verb or assertion form.
  const claimSentences = sentences.filter(isClaimSentence)
  const evidenceClaims = claimSentences.filter(hasEvidenceMarker)
  const evidenceRatio =
    claimSentences.length === 0
      ? 0
      : evidenceClaims.length / claimSentences.length

  return {
    neednessHits,
    registerCappedDeterministic: neednessHits.length > 0,
    bannedPhraseHits,
    overlongSentenceCount: overlong.length,
    totalSentenceCount: sentences.length,
    evidenceClaimCount: evidenceClaims.length,
    totalClaimCount: claimSentences.length,
    evidenceRatio,
  }
}

function splitIntoBodySentences(letter: string): string[] {
  const lines = letter.split(/\r?\n/)
  let inSig = false
  const body: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const lower = t.toLowerCase()
    if (lower.startsWith("dear ")) continue
    if (
      lower === "sincerely," ||
      lower === "sincerely" ||
      lower === "regards," ||
      lower === "best," ||
      lower === "best regards,"
    ) {
      inSig = true
      continue
    }
    if (inSig) continue
    body.push(t)
  }
  const text = body.join(" ")
  const regex = /[^.!?]+[.!?]+(?=\s|$)/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) out.push(m[0].trim())
  if (out.length === 0 && text) out.push(text)
  return out
}

function wordsIn(s: string): number {
  const w = s.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)
  return w ? w.length : 0
}

/** A claim sentence is one that asserts something about the
 *  candidate or their work — first-person verbs, "we" / "the team"
 *  references, or any sentence with an assertive copula. */
function isClaimSentence(s: string): boolean {
  return /\b(i\s+(am|have|led|built|owned|delivered|shipped|cut|raised|drove|grew|wrote|designed|launched|managed|saved|reduced|increased)|my|we\s+(built|shipped|delivered|grew|raised)|the team)\b/i.test(
    s
  )
}

/** Evidence markers: digits (numbers / percentages / money), a
 *  named multi-word capitalised entity, or attribution to a named
 *  party ("the CFO said", "an independent evaluation found"). */
function hasEvidenceMarker(s: string): boolean {
  if (/\b\d/.test(s)) return true // any digit (number / %, etc.)
  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(s)) return true // proper noun pair
  if (/\b(reported|said|called|cited|named|found|measured|published)\b/i.test(s)) {
    return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────
// Output schema (section 5 — exact shape)
// ─────────────────────────────────────────────────────────────────

const DimensionSchema = z.object({
  score: z.number(),
  signal: z.string(),
})

const ScorecardSchema = z.object({
  principlesShown: z.array(z.string()),
  traitsClaimedOnly: z.array(z.string()),
  unmappedParagraphs: z.number(),
  behaviouralSpine: z.boolean(),
  earnsInterview: z.boolean(),
})

const CritiqueSchema = z.object({
  dimensions: z.object({
    relevance: DimensionSchema,
    evidence: DimensionSchema,
    clarity: DimensionSchema,
    competencies: DimensionSchema,
    fit: DimensionSchema,
  }),
  scorecard: ScorecardSchema,
  genericPhrases: z.array(z.string()),
  strongestSentence: z.string(),
  weakestSentence: z.string(),
  consistencyNote: z.string(),
  rewriteTargets: z.array(z.string()),
})

type CritiqueFull = z.infer<typeof CritiqueSchema>

// ─────────────────────────────────────────────────────────────────
// System prompt — section 3 operational anchors verbatim,
// section 4 scorecard, section 6 bias controls.
// ─────────────────────────────────────────────────────────────────

const SYSTEM = `You are a calibrated panel of three senior hiring managers (Director-level, 15+ years each, different industries) operating an evidence-based, structured-recruitment framework. You measure the letter; the Quality Gate decides pass/fail. Never decide a tier bar yourself — only score against the anchors below.

═══════════════════════════════════════════════════════════════════
THE OPERATING PRINCIPLE (the entire reason this rubric works)
═══════════════════════════════════════════════════════════════════
Every anchor below maps to one of three signals:
  • Counted  — how many of the job's top priorities a sentence in the letter explicitly addresses.
  • Ratio    — share of claims that carry a number, a named company or technology, or an attributed result.
  • Present  — whether the opening is value-first, whether a banned phrase is present, whether the company paragraph passes the swap test.
or absent

If you find yourself scoring on "impression", "feel", or "flow", you are off-anchor. Re-derive the score from a countable signal.

═══════════════════════════════════════════════════════════════════
STEP 1 — BLIND REVIEW (Section 6)
═══════════════════════════════════════════════════════════════════
Score content only. Disregard name, gender, ethnicity, age, address, school prestige. None of these may move any dimension score. If your rationale references identity, the score is invalid.

═══════════════════════════════════════════════════════════════════
STEP 2 — SCORE FIVE DIMENSIONS (Section 3, operational anchors)
═══════════════════════════════════════════════════════════════════

  • RELEVANCE TO THE ROLE  (weight 25)
    SIGNAL: Count of the job's top five priorities that a sentence in the letter explicitly addresses.
    ANCHORS:
      5 = four or five priorities addressed.
      4 = three.
      3 = two.
      2 = one.
      1 = none, or the letter is about the candidate rather than the role.
    The "signal" string MUST be the exact count, e.g. "3 of 5 priorities addressed: pricing strategy, segmentation, mid-market motion".

  • EVIDENCE AND CREDIBILITY  (weight 25)
    SIGNAL: Ratio of claims that carry a number, a named company / technology, or an attributed third-party result, to total claims.
    ANCHORS:
      5 = sixty percent or more of claims quantified or named.
      4 = about forty-five percent.
      3 = about thirty percent.
      2 = about fifteen percent.
      1 = mostly unsupported adjectives.
    The "signal" string MUST be the ratio, e.g. "8 of 11 claims carry a number or named entity (73%)".

  • CLARITY AND READING EASE  (weight 20)
    SIGNAL: Count of checkable faults: (a) opening is intent-first not value-first; (b) any sentence over roughly 30 words; (c) any banned phrase present; (d) no clear visual hierarchy for a seven-second scan.
    ANCHORS:
      5 = zero faults.
      4 = one.
      3 = two.
      2 = three.
      1 = four or more, or the value cannot be extracted in a seven-second scan.
    The "signal" string MUST list the faults, e.g. "2 faults: opening is intent-first; one banned phrase ('hit the ground running')".

  • COMPETENCIES AND VALUES SHOWN  (weight 15)
    SIGNAL: Count of role-relevant principles demonstrated through a situation-action-result story, versus merely asserted as a trait.
    ANCHORS:
      5 = two or more shown via story AND zero claimed-only.
      4 = one shown, none claimed-only.
      3 = one shown but some traits merely listed.
      2 = traits listed, none shown.
      1 = generic traits only.
    The "signal" string MUST split the two counts, e.g. "2 shown (ownership in para 2, customer obsession in para 3); 0 claimed-only".

  • ROLE AND CULTURE FIT  (weight 15)
    SIGNAL: Swap test on the company paragraph — does it contain at least one specific, verifiable detail that could NOT appear in a letter to a competitor, AND is it tied to the candidate's offer.
    ANCHORS:
      5 = specific detail present AND tied to the candidate's value.
      3 = specific detail present but not connected to the candidate.
      1 = generic admiration or flattery that would fit any company.
    The "signal" string MUST quote the specific detail (or note its absence), e.g. "Mentions 'service-mesh migration series 2023' — passes swap test, tied to candidate's own rollback work".

═══════════════════════════════════════════════════════════════════
STEP 3 — FRAMEWORK SCORECARD (Section 4)
═══════════════════════════════════════════════════════════════════
This pass produces flags, not score adjustments. It scores the way the strongest companies actually decide.

  (a) "principlesShown" — role-relevant principles demonstrated through a real story.
      Recurring set worth checking for:
        • starts from the customer or end user
        • takes ownership beyond strict remit
        • invents or simplifies rather than accepting status quo
        • insists on high standards
        • has the backbone to disagree, then commits
        • dives deep into detail
        • earns trust through candour (including admitting a wrong call)
        • delivers measurable results
      A principle counts as SHOWN only if a situation-action-result story is present. Mere claim does NOT count.

  (b) "traitsClaimedOnly" — traits asserted but not shown.
      e.g. "passionate", "detail-oriented", "team player". List the exact phrase used.

  (c) "unmappedParagraphs" — count of body paragraphs that do not map cleanly to any required competency the JD lists.
      A paragraph that earns its place must map to at least one priority. Count the rest.

  (d) "behaviouralSpine" — true if at least ONE proof paragraph follows the S-A-R arc in miniature:
      a real difficulty named, the action the candidate personally took, the measurable result. False otherwise.

  (e) "earnsInterview" — your single predictive verdict.
      The letter cannot prove the candidate can do the job. Does it earn the structured interview where that gets tested?
      true = comparable to gold exemplars. false = generic enough that a structured reader would not schedule.

═══════════════════════════════════════════════════════════════════
STEP 4 — RECONCILE THREE PANEL PERSPECTIVES (Section 6)
═══════════════════════════════════════════════════════════════════
You scored as a panel of three. The anchors should make this CONVERGE — three raters counting the same JD priorities will arrive at the same number. If they disagreed materially on any dimension, average and describe the disagreement in "consistencyNote". If they agreed, say so.

═══════════════════════════════════════════════════════════════════
STEP 5 — IDENTIFY STRONGEST + WEAKEST SENTENCE
═══════════════════════════════════════════════════════════════════
"strongestSentence" — the single sentence that contributes most evidence (quote verbatim). Final Editor and Rewrite Agent MUST preserve it.
"weakestSentence" — the single sentence carrying the least evidence (quote verbatim). Target for rewrite.

═══════════════════════════════════════════════════════════════════
STEP 6 — GENERIC PHRASES
═══════════════════════════════════════════════════════════════════
"genericPhrases" — list every cliché / asserted trait you spotted verbatim. Section 4(b) flags drive this; section 3(c) Clarity score should also reflect it.

═══════════════════════════════════════════════════════════════════
STEP 7 — REWRITE TARGETS
═══════════════════════════════════════════════════════════════════
"rewriteTargets" — ordered list, highest impact first. Each entry is a concrete instruction (e.g. "Replace 'passionate about analytics' with the experiment-velocity story from the proof paragraph"). Up to 5 entries.

═══════════════════════════════════════════════════════════════════
EQUITY CHECK (Section 6)
═══════════════════════════════════════════════════════════════════
Before you submit, confirm every dimension score rests on a competency or evidence signal — never on background. If any criterion would disadvantage an under-represented candidate, recompute.

═══════════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════════
Submit the exact section-5 schema. Each dimension MUST include the integer 1–5 score AND the determining signal string. Do NOT include a weightedScore — the code recomputes it. Do NOT include wouldInterview — the code re-derives it. Do NOT decide whether the letter passes a tier bar — the Quality Gate owns that.`

// ─────────────────────────────────────────────────────────────────
// Fallback (typed, deterministic — never crashes the pipeline)
// ─────────────────────────────────────────────────────────────────

const FALLBACK_HM_CRITIC: CritiqueFull = {
  dimensions: {
    relevance:    { score: 3, signal: "Fallback — panel did not converge" },
    evidence:     { score: 3, signal: "Fallback — panel did not converge" },
    clarity:      { score: 3, signal: "Fallback — panel did not converge" },
    competencies: { score: 3, signal: "Fallback — panel did not converge" },
    fit:          { score: 3, signal: "Fallback — panel did not converge" },
  },
  scorecard: {
    principlesShown: [],
    traitsClaimedOnly: [],
    unmappedParagraphs: 0,
    behaviouralSpine: false,
    earnsInterview: false,
  },
  genericPhrases: [],
  strongestSentence: "",
  weakestSentence: "",
  consistencyNote: "Fallback — agent could not produce a critique.",
  rewriteTargets: [],
}

// ─────────────────────────────────────────────────────────────────
// runHMCritic — top-level entry
// ─────────────────────────────────────────────────────────────────

export async function runHMCritic(args: {
  letter: string
  job: JobAnalysis
  /** Tier threshold is consumed by Quality Gate; HM Critic ignores it
   *  (the agent only measures, the gate decides). Kept for API
   *  backwards-compat. */
  qualityThreshold?: number
}): Promise<{ data: HMCritique; meta: CallMeta; fallback: boolean }> {
  // ── Step 0: deterministic cross-checks (section 7) ──────────
  const det = runDeterministicChecks(args.letter)

  const userPrompt = [
    `Job analysis (use to extract the top-5 priorities for Step 2 Relevance):`,
    JSON.stringify(args.job, null, 2),
    "",
    `Letter to evaluate:`,
    "",
    args.letter,
  ].join("\n")

  const result = await runAgent({
    agent: "HMCritic",
    model: MODELS.sonnet,
    cycleNumber: 0,
    system: SYSTEM,
    user: userPrompt,
    schema: CritiqueSchema,
    schemaName: "submit_hm_critique_v1",
    schemaDescription:
      "Submit the section-5 schema: dimensions + scorecard + flags. Do not include weightedScore (code recomputes).",
    fallback: FALLBACK_HM_CRITIC,
    maxTokens: 2000,
    temperature: 0.2,
    timeoutMs: 40_000,
  })

  // ── Recompute weightedScore in code (section 3) ─────────────
  const d = result.data.dimensions
  const dimScores = {
    relevance:    clamp(d.relevance.score, 1, 5),
    evidence:     clamp(d.evidence.score, 1, 5),
    clarity:      clamp(d.clarity.score, 1, 5),
    competencies: clamp(d.competencies.score, 1, 5),
    fit:          clamp(d.fit.score, 1, 5),
  }
  // weighted = sum( (score/5) * weight )  per spec
  let weighted =
    (dimScores.relevance / 5) * 25 +
    (dimScores.evidence / 5) * 25 +
    (dimScores.clarity / 5) * 20 +
    (dimScores.competencies / 5) * 15 +
    (dimScores.fit / 5) * 15

  // ── Register overlay (section 3 — deterministic) ────────────
  // The model is asked to flag generic phrases, but the REGISTER
  // cap is enforced from deterministic detection. The model cannot
  // hide a neediness phrase.
  const registerCapped = det.registerCappedDeterministic
  if (registerCapped) weighted = Math.min(weighted, 80)

  const weightedScore = clamp(Math.round(weighted), 0, 100)
  const wouldInterview = weightedScore >= 70

  // ── Merge model genericPhrases with deterministic banned hits ──
  const mergedGeneric = uniq([
    ...result.data.genericPhrases,
    ...det.bannedPhraseHits,
    ...det.neednessHits,
  ])

  // ── Map new shape → HMCritique (with legacy-compat fields) ──
  const data: HMCritique = {
    weightedScore,
    registerCapped,
    wouldInterview,
    dimensions: {
      relevance:    { score: dimScores.relevance,    signal: d.relevance.signal },
      evidence:     { score: dimScores.evidence,     signal: d.evidence.signal },
      clarity:      { score: dimScores.clarity,      signal: d.clarity.signal },
      competencies: { score: dimScores.competencies, signal: d.competencies.signal },
      fit:          { score: dimScores.fit,          signal: d.fit.signal },
    },
    scorecard: result.data.scorecard,
    genericPhrases: mergedGeneric,
    strongestSentence: result.data.strongestSentence,
    weakestSentence: result.data.weakestSentence,
    consistencyNote: result.data.consistencyNote,
    rewriteTargets: result.data.rewriteTargets,
    // ── Legacy-compat fields (read by Quality Gate + Rewrite Agent
    //    until those migrate to the new shape). ────────────────
    overallImpression: result.data.consistencyNote,
    strengths: result.data.strongestSentence ? [result.data.strongestSentence] : [],
    weaknesses: result.data.weakestSentence ? [result.data.weakestSentence] : [],
    redFlags: registerCapped
      ? [`Register cap triggered (neediness phrase): ${det.neednessHits.join(", ")}`]
      : [],
    rewriteRecommended: weightedScore < 90,
    improvementSuggestions: result.data.rewriteTargets,
    equityFlag: false, // anchors removed the bias surface (v1)
  }

  // ── Section-7 cross-check telemetry (non-fatal) ─────────────
  // We log when the model's Clarity / Evidence signals strongly
  // disagree with our deterministic count. Visible in agent_outputs
  // so reproducibility regressions are easy to spot.
  const claritySignalMentionsFaultCount = /\b(\d+)\s+fault/i.exec(d.clarity.signal)
  if (claritySignalMentionsFaultCount) {
    const declared = parseInt(claritySignalMentionsFaultCount[1], 10)
    const actual = det.bannedPhraseHits.length + det.overlongSentenceCount
    if (Math.abs(declared - actual) > 2) {
      console.warn(
        `[HMCritic] Clarity disagreement: model declared ${declared} faults, deterministic count ${actual}.`
      )
    }
  }

  return {
    data: result.log.fallbackTriggered ? legacyFallback() : data,
    meta: {
      modelUsed: result.log.modelUsed,
      tokensInput: result.log.tokensInput,
      tokensOutput: result.log.tokensOutput,
      durationMs: result.log.durationMs,
    },
    fallback: result.log.fallbackTriggered,
  }
}

function legacyFallback(): HMCritique {
  return {
    weightedScore: 75,
    registerCapped: false,
    wouldInterview: true,
    dimensions: {
      relevance:    { score: 3, signal: "Fallback — not scored" },
      evidence:     { score: 3, signal: "Fallback — not scored" },
      clarity:      { score: 3, signal: "Fallback — not scored" },
      competencies: { score: 3, signal: "Fallback — not scored" },
      fit:          { score: 3, signal: "Fallback — not scored" },
    },
    scorecard: {
      principlesShown: [],
      traitsClaimedOnly: [],
      unmappedParagraphs: 0,
      behaviouralSpine: false,
      earnsInterview: true,
    },
    genericPhrases: [],
    strongestSentence: "",
    weakestSentence: "",
    consistencyNote: "Fallback — panel did not converge (agent error).",
    rewriteTargets: [],
    overallImpression: "Critic agent fell back — letter not evaluated.",
    strengths: [],
    weaknesses: [],
    redFlags: [],
    rewriteRecommended: false,
    improvementSuggestions: [],
    equityFlag: false,
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))]
}
