import { z } from "zod"
import { MODELS, runAgent } from "../run-agent"
import { detectBannedPhrases, scrubDashes } from "../utils"
import type { AgentRunLog, FinalEdit, Tone } from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * Final Editor — "The Copy Editor"
 *
 * Persona: a senior magazine copy editor making surgical edits, not
 * a rewriter. Belt-and-braces enforcer of the blueprint's hard
 * rules: 300-380 word band, banned-phrase scrub, concrete-only
 * specifics.
 *
 * Blueprint requirements:
 *   - Length guardian for the 300-380 band (220-300 for concise tone).
 *   - Banned-phrase scrub — deterministic post-check.
 *   - Never invents new specifics — deletes a sentence rather than
 *     fabricate.
 *   - Returns the edited letter + a list of every change made.
 *
 * Model: Sonnet 4.6, temperature 0.3. Editing benefits from
 * higher reasoning capacity than extraction.
 */

const FinalEditSchema = z.object({
  letter: z.string(),
  changesMade: z.array(z.string()),
  bannedPhrasesRemoved: z.array(z.string()),
})

type FinalEditFull = z.infer<typeof FinalEditSchema>

const SYSTEM = `You are a senior copy editor finalizing a cover letter. You make precise, surgical edits — never rewrite. You preserve voice while enforcing hard quality rules.

YOUR JOB:
1. Remove every banned cliché without changing the candidate's meaning:
   "team player", "hit the ground running", "synergy" / "synergies", "go-getter", "results-oriented", "detail-oriented", "passionate about", "rockstar", "ninja", "in today's fast-paced world", "perfect candidate", "I am confident that", "I am writing to express my interest", "I am writing to apply", "I hope this email finds you well", "To whom it may concern", "Please find attached", "I look forward to hearing from you", "as a [adjective]".
2. Replace vague claims with concrete ones IF the surrounding context already supports it. If not, tighten or delete the sentence — NEVER invent a new specific.
3. Fix awkward phrasing or grammar without changing tone.
4. Ensure the opening is a concrete hook (achievement, observation, or specific connection) — not boilerplate.
5. Ensure the close proposes a concrete next step — not "I look forward to hearing from you".
6. Remove every dash used for effect: em-dashes (—), en-dashes (–), and any hyphen surrounded by spaces ( - ). Replace with a comma, a period, parentheses, or restructure the sentence. The gold standard never uses a dash for effect — it reads as AI-written. Keep word-internal hyphens ("data-driven") and numeric ranges ("5-10").
7. ENFORCE THE LENGTH BAND given to you in the user message. Trim or expand using existing material only.
8. Preserve structure, paragraph count, tone, and voice within ±10%.

OUTPUT:
- "letter": the edited letter, ready to send. Start with "Dear …" and end with sign-off.
- "changesMade": one short line per change, up to 8.
- "bannedPhrasesRemoved": the exact phrases you stripped.

If you cannot replace a banned phrase with concrete material from the letter itself, DELETE the offending sentence rather than fabricate.`

export interface FinalEditorResult {
  data: FinalEdit
  log: AgentRunLog
  /** @deprecated Use `log`. */
  meta: CallMeta
  /** @deprecated Use `log.fallbackTriggered`. */
  fallback: boolean
}

export async function runFinalEditor(args: {
  letter: string
  /** Tone — gives the editor the right length band (300-380 vs 220-300). */
  tone?: Tone
  cycleNumber?: number
}): Promise<FinalEditorResult> {
  const tone: Tone = args.tone ?? "professional"
  const band = tone === "concise" ? "220-300" : "300-380"

  const fallbackData: FinalEditFull = {
    letter: args.letter,
    changesMade: [],
    bannedPhrasesRemoved: [],
  }

  const result = await runAgent({
    agent: "FinalEditor",
    model: MODELS.sonnet,
    cycleNumber: args.cycleNumber ?? 0,
    system: SYSTEM,
    user: [
      `Target body length: ${band} words (excluding "Dear …" and sign-off).`,
      `Tone: ${tone}.`,
      "",
      "Edit this letter:",
      "",
      args.letter,
    ].join("\n"),
    schema: FinalEditSchema,
    schemaName: "submit_final_edit",
    schemaDescription: "Submit the surgically edited letter with change list.",
    fallback: fallbackData,
    maxTokens: 2048,
    temperature: 0.3,
    timeoutMs: 45_000,
  })

  // Belt-and-braces post-check: if banned phrases survived the
  // model's pass, surface them as warnings — orchestrator can
  // decide to push another quality cycle.
  const surviving = detectBannedPhrases(result.data.letter).map((s) => s.phrase)
  const editedWordCount = countBodyWords(result.data.letter)
  const originalWordCount = countBodyWords(args.letter)

  // Revert guard: if the Final Editor's output is suspicious, return
  // the original draft unchanged. Triggers when:
  //   • edited word count falls outside the tier's tone band, OR
  //   • edited word count grew more than 20% (expansion attack), OR
  //   • the body shrank by more than 35% (over-cutting / corruption)
  // The deliberate exception is when the original was ALSO out-of-band
  // and the editor pulled it back inside — that's the editor doing
  // its job; we keep that result.
  const [bandLo, bandHi] = tone === "concise" ? [220, 300] : [300, 380]
  const editedInBand = editedWordCount >= bandLo && editedWordCount <= bandHi
  const originalInBand =
    originalWordCount >= bandLo && originalWordCount <= bandHi
  const expandedSuspiciously = editedWordCount > originalWordCount * 1.2
  const shrankSuspiciously = editedWordCount < originalWordCount * 0.65

  let finalLetter = result.data.letter
  let finalChanges = result.data.changesMade
  let revertReason: string | null = null

  if (result.log.fallbackTriggered) {
    // Already fell back inside runAgent; nothing extra to do.
  } else if (!editedInBand && originalInBand) {
    revertReason = `Reverted: edit moved word count from ${originalWordCount} (in band) to ${editedWordCount} (out of ${bandLo}-${bandHi} band).`
  } else if (expandedSuspiciously) {
    revertReason = `Reverted: edit expanded body from ${originalWordCount} to ${editedWordCount} words (>20% growth).`
  } else if (shrankSuspiciously) {
    revertReason = `Reverted: edit shrank body from ${originalWordCount} to ${editedWordCount} words (>35% loss).`
  }

  if (revertReason) {
    finalLetter = args.letter
    finalChanges = [revertReason]
  }

  const wordCount = revertReason ? originalWordCount : editedWordCount

  // Final deterministic dash scrub — the copy editor may reintroduce an
  // em/en-dash even when the Writer's output was clean. This is the last
  // pass before the letter is shipped, so guarantee it here too. Dash
  // substitution swaps "—" for ", " and never adds/removes words, so the
  // word count computed above stays valid.
  finalLetter = scrubDashes(finalLetter)

  const data: FinalEdit = {
    letter: finalLetter,
    changesMade: finalChanges,
    bannedPhrasesRemoved: dedupe([
      ...result.data.bannedPhrasesRemoved,
      ...surviving.map((p) => `WARNING: still present after edit: ${p}`),
    ]),
    wordCount,
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

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

function countBodyWords(letter: string): number {
  const lines = letter.split(/\r?\n/)
  const body: string[] = []
  let inSignature = false
  for (const line of lines) {
    const t = line.trim()
    const lower = t.toLowerCase()
    if (!t) continue
    if (lower.startsWith("dear ")) continue
    if (lower === "sincerely," || lower === "sincerely") {
      inSignature = true
      continue
    }
    if (lower === "regards," || lower === "best," || lower === "best regards,") {
      inSignature = true
      continue
    }
    if (inSignature) continue // skip name line after sign-off
    body.push(t)
  }
  const words = body.join(" ").match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)
  return words ? words.length : 0
}
