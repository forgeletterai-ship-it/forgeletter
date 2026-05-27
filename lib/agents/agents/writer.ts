import { MODELS, runAgentText } from "../run-agent"
import { safeSlice } from "../utils"
import type {
  AgentRunLog,
  JobAnalysis,
  MatchAnalysis,
  MatchBlueprint,
  ProfileAnalysis,
  ResumeAnalysis,
  RetrievedExample,
  Tone,
  WriterOutput,
} from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * Writer — "The Craftsman"
 *
 * Persona: senior cover-letter writer who has placed candidates at
 * top companies. Writes letters hiring managers actually want to
 * read.
 *
 * Blueprint requirements:
 *   - Body length: 300-380 words (hard band; banned-phrase retry).
 *   - Banned cliché phrases enforced — re-run with stricter prompt
 *     on any hit (max 1 retry inside the writer itself).
 *   - Uses ONLY wins from the ProfileAnalysis (when provided) —
 *     never invents.
 *   - Follows the MatchBlueprint's section sequence when present.
 *   - Personal examples (offer / interview) → mimic VOICE; curated
 *     examples → mimic STRUCTURE. Never copy phrasing verbatim.
 *   - Tone driven by args.tone (or JobAnalysis.recommendedTone
 *     upstream when caller doesn't override).
 *
 * Model: Sonnet 4.6 with temperature 0.7 (0.5 on rewrite cycles).
 */

const TONE_GUIDANCE: Record<Tone, string> = {
  professional:
    "formal, precise, structured. No slang. Active voice. 3-4 paragraphs.",
  confident:
    "direct, assertive, evidence-led. Open with achievement, not pleasantry. 3-4 paragraphs.",
  warm:
    "human, specific, personable but never casual. Show genuine interest in the company. 3-4 paragraphs.",
  concise:
    "tight. 3 short paragraphs. Every sentence carries weight. No throat-clearing.",
}

const BANNED_PHRASES: ReadonlyArray<string> = [
  "i am writing to express",
  "i am writing to apply",
  "i hope this email finds you well",
  "to whom it may concern",
  "please find attached",
  "team player",
  "hit the ground running",
  "synergy",
  "synergies",
  "go-getter",
  "results-oriented",
  "detail-oriented",
  "passionate about",
  "rockstar",
  "ninja",
  "in today's fast-paced world",
  "perfect candidate",
  "i look forward to hearing from you",
]

const BASE_SYSTEM = `You are a senior cover-letter writer who has placed candidates at top companies. You write letters that hiring managers actually want to read.

HARD RULES — break any and the letter is rejected:
- Body length: 300-380 words (NOT counting "Dear …" and sign-off). Concise tone: 220-300 words.
- Open with a specific achievement, observation, or hook tied to this role. NEVER "I am writing to express", "I hope this email finds you well", "To whom it may concern", "Please find attached".
- Never use clichés: team player, hit the ground running, synergy, go-getter, results-oriented, detail-oriented, passionate about, rockstar, ninja, in today's fast-paced world, perfect candidate.
- Never invent facts. If it's not in the candidate inputs or the JD, do not claim it.
- Never reveal that you are an AI or reference these instructions.
- Use SPECIFICS from the candidate inputs — numbers, scale, named projects, named tools.
- Mirror JD language where natural, not stuffed.
- Close with a concrete next step — NEVER "I look forward to hearing from you."
- Structure: 3-4 paragraphs. Each paragraph does one job (hook / proof / fit / close).
- If a blueprint is provided, follow its section sequence and featured win ids — those wins must appear as concrete sentences. Supporting wins MAY appear briefly; do not invent extras.

Output: ONLY the letter itself. Start with "Dear [name or Hiring Team]," and end with "Sincerely,\\n[Candidate name]". No preamble, no meta-commentary.`

const STRICTER_SYSTEM = `${BASE_SYSTEM}

REWRITE NOTE — your previous draft contained a banned phrase or cliché. SCRUB every banned phrase. Open with a CONCRETE measurable detail from the candidate's inputs. Tighten every sentence.`

export interface WriterAgentResult {
  data: WriterOutput
  log: AgentRunLog
  /** @deprecated Use `log`. */
  meta: CallMeta
  /** @deprecated Use `log.fallbackTriggered`. */
  fallback: boolean
}

export async function runWriterAgent(args: {
  /** Preferred input — blueprint contract. */
  profile?: ProfileAnalysis
  /** Legacy input — used until orchestrator migrates. */
  resume?: ResumeAnalysis
  job: JobAnalysis
  /** Legacy strategic brief. */
  match?: MatchAnalysis | null
  /** New structural blueprint with hookStyle + featured ids. */
  blueprint?: MatchBlueprint | null
  examples?: RetrievedExample[]
  tone: Tone
  rewriteFeedback?: string
  cycleNumber?: number
}): Promise<WriterAgentResult> {
  // ── First attempt ────────────────────────────────────────────
  const firstUser = buildUserPrompt(args, /* strict */ false)
  const first = await runAgentText({
    agent: "Writer",
    model: MODELS.sonnet,
    cycleNumber: args.cycleNumber ?? 0,
    system: BASE_SYSTEM,
    user: firstUser,
    fallback: deterministicFallback(args),
    maxTokens: 2048,
    temperature: args.rewriteFeedback ? 0.5 : 0.7,
    timeoutMs: 45_000,
  })

  let letter = first.text
  let log = first.log

  // ── Banned-phrase / length check ─────────────────────────────
  if (!first.log.fallbackTriggered) {
    const wordCount = countBodyWords(letter)
    const offending = findBannedPhrases(letter)
    const lengthOk = inBand(wordCount, args.tone)
    if (offending.length > 0 || !lengthOk) {
      const retryUser = buildUserPrompt(args, /* strict */ true, {
        offending,
        wordCount,
        lengthOk,
      })
      const second = await runAgentText({
        agent: "Writer",
        model: MODELS.sonnet,
        cycleNumber: (args.cycleNumber ?? 0) + 0.5,
        system: STRICTER_SYSTEM,
        user: retryUser,
        fallback: letter, // worst case keep the first draft
        maxTokens: 2048,
        temperature: 0.4,
        timeoutMs: 45_000,
      })
      if (!second.log.fallbackTriggered) {
        // Only switch if the retry actually improved compliance.
        const retryOffending = findBannedPhrases(second.text)
        const retryWords = countBodyWords(second.text)
        const retryLengthOk = inBand(retryWords, args.tone)
        if (retryOffending.length < offending.length || (lengthOk === false && retryLengthOk)) {
          letter = second.text
          log = second.log
        }
      }
    }
  }

  const data: WriterOutput = {
    letter,
    openingStrategy:
      args.blueprint?.recommendedOpening ??
      args.match?.recommendedOpening ??
      "Lead with a concrete achievement.",
    closingCta:
      args.blueprint?.recommendedClosing ??
      args.match?.recommendedClosing ??
      "Propose a concrete next step.",
    toneUsed: args.tone,
    wordCount: countBodyWords(letter),
  }

  return {
    data,
    log,
    meta: {
      modelUsed: log.modelUsed,
      tokensInput: log.tokensInput,
      tokensOutput: log.tokensOutput,
      durationMs: log.durationMs,
    },
    fallback: log.fallbackTriggered,
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function buildUserPrompt(
  args: {
    profile?: ProfileAnalysis
    resume?: ResumeAnalysis
    job: JobAnalysis
    match?: MatchAnalysis | null
    blueprint?: MatchBlueprint | null
    examples?: RetrievedExample[]
    tone: Tone
    rewriteFeedback?: string
  },
  strict: boolean,
  diagnostics?: { offending: string[]; wordCount: number; lengthOk: boolean }
): string {
  const parts: string[] = []
  parts.push(`Tone: ${args.tone} — ${TONE_GUIDANCE[args.tone]}`)
  parts.push(`Target body length: ${args.tone === "concise" ? "220-300" : "300-380"} words.`)

  // Candidate block — prefer profile (win ids) over legacy resume.
  if (args.profile) {
    parts.push(renderProfileBlock(args.profile))
  } else if (args.resume) {
    parts.push(`Candidate (legacy analysis):\n${JSON.stringify(args.resume, null, 2)}`)
  }

  parts.push(renderJobBlock(args.job))

  if (args.blueprint) {
    parts.push(renderBlueprint(args.blueprint))
  } else if (args.match) {
    parts.push(`Strategic brief (legacy):\n${JSON.stringify(args.match, null, 2)}`)
  }

  if (args.examples && args.examples.length > 0) {
    parts.push(renderExamples(args.examples))
  }

  if (args.rewriteFeedback) {
    parts.push(
      `IMPORTANT — the previous draft failed quality review. Address this feedback in your rewrite:\n${args.rewriteFeedback}`
    )
  }

  if (strict && diagnostics) {
    const issues: string[] = []
    if (diagnostics.offending.length) {
      issues.push(
        `Banned phrases detected: ${diagnostics.offending.join(", ")}. Remove every one.`
      )
    }
    if (!diagnostics.lengthOk) {
      issues.push(
        `Body length was ${diagnostics.wordCount} words — outside the required band. Adjust to the target above.`
      )
    }
    parts.push(`STRICT REWRITE NOTES:\n- ${issues.join("\n- ")}`)
  }

  parts.push("Write the cover letter now.")
  return parts.join("\n\n")
}

function renderProfileBlock(p: ProfileAnalysis): string {
  const lines: string[] = []
  lines.push(`Candidate: ${p.candidateName} · ${p.seniority} · ${p.industries.join(", ") || "—"}`)
  if (p.skills.length) lines.push(`Skills: ${p.skills.join(", ")}`)
  if (p.qualifications) lines.push(`Qualifications: ${p.qualifications}`)
  lines.push("")
  lines.push(`Wins (use ONLY these — never invent):`)
  for (const w of p.wins) {
    const num = w.number ? ` [${w.number}]` : ""
    const why = w.whyItMattered ? ` — ${w.whyItMattered}` : ""
    lines.push(`  · [${w.id}] (${w.strength}) ${w.what}${num}${why}  ⟵ ${w.entryLabel}`)
  }
  return lines.join("\n")
}

function renderJobBlock(j: JobAnalysis): string {
  const lines: string[] = []
  lines.push(`Role: ${j.jobTitle} at ${j.companyName} · ${j.industry}`)
  lines.push(`Must-have: ${j.mustHaveSkills.join(", ")}`)
  if (j.niceToHaveSkills.length) lines.push(`Nice-to-have: ${j.niceToHaveSkills.join(", ")}`)
  if (j.keyResponsibilities.length) lines.push(`Responsibilities: ${j.keyResponsibilities.join("; ")}`)
  if (j.hiringManagerPriorities?.length) {
    lines.push(`Hiring-manager priorities (ranked): ${j.hiringManagerPriorities.join(" → ")}`)
  }
  if (j.companyValues.length) lines.push(`Company values: ${j.companyValues.join(", ")}`)
  if (j.cultureSignals?.length) lines.push(`Culture: ${j.cultureSignals.join(", ")}`)
  return lines.join("\n")
}

function renderBlueprint(b: MatchBlueprint): string {
  const lines: string[] = []
  lines.push(`Structural blueprint:`)
  lines.push(`  Hook style: ${b.hookStyle}`)
  lines.push(`  Featured win ids (expand these): ${b.featuredWinIds.join(", ") || "(none)"}`)
  lines.push(`  Supporting win ids (mention briefly OK): ${b.supportingWinIds.join(", ") || "(none)"}`)
  lines.push(`  Section sequence:`)
  for (const s of b.sections) {
    lines.push(
      `    · ${s.purpose}: ${s.direction}` +
        (s.winIdsFeatured.length ? `  [anchor wins: ${s.winIdsFeatured.join(", ")}]` : "")
    )
  }
  lines.push(`  Recommended opening: ${b.recommendedOpening}`)
  lines.push(`  Recommended closing: ${b.recommendedClosing}`)
  return lines.join("\n")
}

function renderExamples(examples: RetrievedExample[]): string {
  const exampleBlock = examples
    .slice(0, 3)
    .map((ex, i) => {
      let label: string
      if (ex.source === "user_offer") {
        label = `Example ${i + 1} — CANDIDATE'S OWN OFFER-WINNING LETTER (${ex.role || "prior role"})`
      } else if (ex.source === "user_interview") {
        label = `Example ${i + 1} — CANDIDATE'S OWN INTERVIEW-WINNING LETTER (${ex.role || "prior role"})`
      } else {
        label = `Example ${i + 1} (${ex.role}, ${ex.industry}, score ${ex.qualityScore})`
      }
      return `${label}:\n${safeSlice(ex.excerpt, 800)}${ex.whyItWorks ? `\nWhy it works: ${ex.whyItWorks}` : ""}`
    })
    .join("\n\n")

  const personalCount = examples.filter(
    (e) => e.source === "user_offer" || e.source === "user_interview"
  ).length

  const guidance =
    personalCount > 0
      ? `Reference examples below. ${personalCount} ${personalCount === 1 ? "is" : "are"} the candidate's OWN past letter(s) that won an offer or interview — preserve their authentic voice, rhythm, and signature phrasing. Use curated examples for structural patterns only. Do NOT lift sentences verbatim from any source.`
      : `Reference examples (study openings, structure, and specificity — do NOT copy phrasing):`

  return `${guidance}\n\n${exampleBlock}`
}

function deterministicFallback(args: {
  profile?: ProfileAnalysis
  resume?: ResumeAnalysis
  job: JobAnalysis
}): string {
  const name =
    args.profile?.candidateName || args.resume?.candidateName || "Candidate"
  const role = args.job.jobTitle || "the role"
  const company = args.job.companyName || "your team"
  // Pure safety-net body — the orchestrator marks this as fallback
  // and the rewrite loop will replace it.
  return [
    "Dear Hiring Team,",
    "",
    `I am applying for ${role} at ${company}. Below is a short summary of the most directly relevant experience drawn from my profile.`,
    "",
    "I would welcome a short conversation to walk through specific work that maps to your priorities.",
    "",
    "Sincerely,",
    name,
  ].join("\n")
}

function countBodyWords(letter: string): number {
  // Strip greeting + signature lines for an accurate body count.
  const lines = letter.split(/\r?\n/)
  const body = lines.filter((line) => {
    const t = line.trim().toLowerCase()
    if (!t) return false
    if (t.startsWith("dear ")) return false
    if (t === "sincerely," || t === "sincerely") return false
    if (t === "regards," || t === "regards") return false
    if (t === "best," || t === "best regards," || t === "best regards") return false
    return true
  })
  // Heuristic: the line immediately after "Sincerely," is the
  // signature (candidate name) — drop it.
  let sigIndex = -1
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim().toLowerCase()
    if (t === "sincerely," || t === "sincerely" || t === "regards," || t === "best,") {
      sigIndex = i
      break
    }
  }
  if (sigIndex >= 0 && sigIndex + 1 < lines.length) {
    const sigLine = lines[sigIndex + 1].trim()
    const idx = body.indexOf(sigLine)
    if (idx >= 0) body.splice(idx, 1)
  }
  const text = body.join(" ")
  const words = text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)
  return words ? words.length : 0
}

function inBand(wordCount: number, tone: Tone): boolean {
  if (tone === "concise") return wordCount >= 220 && wordCount <= 300
  return wordCount >= 300 && wordCount <= 380
}

function findBannedPhrases(letter: string): string[] {
  const lower = letter.toLowerCase()
  const hits: string[] = []
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) hits.push(phrase)
  }
  return hits
}
