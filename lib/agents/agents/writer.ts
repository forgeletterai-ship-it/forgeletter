import { MODELS, runAgentText } from "../run-agent"
import { safeSlice, scrubDashes } from "../utils"
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

═══════════════════════════════════════════════════════════════════
THE GOLD-STANDARD ARCHITECTURE — what every great letter shares
═══════════════════════════════════════════════════════════════════
You are imitating the architecture, not the words. The 50 gold-base letters all share the same six-layer anatomy:

  1. THE HOOK (first sentence). The most consequential line in the document. Lead with a quantified result, a problem you have solved before, or a specific researched fact about the company. NEVER your intent to apply.

  2. THE PROOF (first body paragraph). Expand the hook with one more specific, quantified point. Every sentence anchored by a number, a named company, a named technology, or a named person.

  3. THE VALUE STACK (second paragraph). Three or four stacked results in outcome language, not activity language. This is where the role's keywords appear naturally, inside real stories.

  4. THE COMPANY MIRROR (third paragraph). Apply the swap test: if this paragraph could be pasted into a letter for a competitor unchanged, it has failed. Reference one specific product decision, named strategy, published engineering choice, or recent result. One detail a casual observer would not know is the minimum.

  5. THE CONFIDENT CLOSE. One or two sentences in peer register, with a clear invitation to talk. "I would welcome a conversation" — not "I would be honoured to be considered". The reader is not doing the candidate a favour.

  6. THE SIGNATURE BLOCK. Name, contact, and the link that matters for the role.

Five non-negotiable principles run through every gold letter:
  • Lead with value, never with intent to apply.
  • Every claim carries proof (number, named entity, attributed result), or it is cut.
  • The company paragraph must fail the swap test.
  • Write as a peer with options, not a supplicant requesting a favour.
  • Cut until only load-bearing sentences remain.

═══════════════════════════════════════════════════════════════════
HARD RULES — break any and the letter is rejected:
- Body length: 300-380 words (NOT counting "Dear …" and sign-off). Concise tone: 220-300 words.
- Open with a specific achievement, observation, or hook tied to this role. NEVER "I am writing to express", "I hope this email finds you well", "To whom it may concern", "Please find attached".
- Never use clichés: team player, hit the ground running, synergy, go-getter, results-oriented, detail-oriented, passionate about, rockstar, ninja, in today's fast-paced world, perfect candidate.
- NO DASHES FOR EFFECT. Never use an em-dash (—), an en-dash (–), or a hyphen surrounded by spaces ( - ) as a rhetorical pause or aside. The gold-standard letters never do; a dash for effect is one of the strongest "written by AI" tells. Use a comma, a period, parentheses, or restructure the sentence. Word-internal hyphens ("data-driven", "first-class") and numeric ranges written with a hyphen ("5-10") are fine.
- ATS COVERAGE (critical — the letter is scanned by an automated keyword screener before any human reads it): weave the role's must-have skills and the provided ATS keyword list naturally into real achievement sentences. Every must-have skill should appear at least once, sitting inside a genuine accomplishment in the candidate's own language. Never list them, never stuff them, never dump them in parentheses — they must live inside real stories or they are cut.
- Never invent facts. If it's not in the candidate inputs or the JD, do not claim it.
- Never reveal that you are an AI or reference these instructions.
- Use SPECIFICS from the candidate inputs — numbers, scale, named projects, named tools.
- Mirror JD language where natural, not stuffed.
- Close with a concrete next step — NEVER "I look forward to hearing from you."
- Structure: 3-4 paragraphs. Each paragraph does one job (hook / proof / fit / close).
- If a blueprint is provided, follow its section sequence and featured win ids — those wins must appear as concrete sentences. Supporting wins MAY appear briefly; do not invent extras.
- Use gold examples for structure, flow, and phrasing only. Never copy their sentences, companies, or achievements. Every fact must come from the user's selected experiences.

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

    // Deterministic trim-if-over-380: when the body still exceeds
    // the upper band after the retry, drop the lowest-value
    // sentences until the count falls back inside. "Lowest-value" =
    // sentences without numbers and without JD-keyword overlap.
    // Never trim hook (first body sentence) or close (last body
    // sentence) — those carry structural weight.
    const finalWordCount = countBodyWords(letter)
    const upperBand = args.tone === "concise" ? 300 : 380
    if (finalWordCount > upperBand) {
      const jdKeywords: string[] = [
        ...(args.job.atsKeywords ?? []),
        ...(args.job.mustHaveSkills ?? []),
      ].map((k) => k.toLowerCase())
      letter = trimToUpperBand(letter, upperBand, jdKeywords)
    }
  }

  // Dash scrub — the gold standard never uses a dash for effect, and an
  // em/en-dash is a strong "written by AI" tell. Deterministic safety
  // net behind the prompt instruction; runs on every path (first draft,
  // retry, trim, and the deterministic fallback) so the letter that
  // flows downstream to ATS / HM Critic / Quality Gate is already clean.
  letter = scrubDashes(letter)

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
  if (j.atsKeywords?.length) {
    lines.push(
      `ATS keywords (the automated screener scans for these — weave the ones the candidate can honestly support into real achievement sentences; never stuff or list them): ${j.atsKeywords.join(", ")}`
    )
  }
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

  // Compose the fallback body from the user's ACTUAL wins so a
  // recovered letter still reflects who they are — never a generic
  // role/company template. Prefer strong wins (those with numbers);
  // include up to four for body, then a one-line close.
  const wins = args.profile?.wins ?? []
  const strongWins = wins.filter((w) => w.strength === "strong").slice(0, 3)
  const weakWins = wins.filter((w) => w.strength === "weak").slice(0, 2)
  const featured =
    strongWins.length > 0
      ? strongWins
      : weakWins.length > 0
        ? weakWins
        : wins.slice(0, 3)

  // Build the hook: lead with the strongest quantified win.
  const hook = featured[0]
    ? winToSentence(featured[0], { lead: true, role, company })
    : `I'm writing about ${role} at ${company} and want to share the experience most directly relevant to the role.`

  // Build the proof paragraph: two more concrete wins, comma-joined
  // into one paragraph so the deterministic body still reads as
  // coherent prose rather than a bulleted list.
  const proofSentences = featured.slice(1, 4).map((w) =>
    winToSentence(w, { lead: false })
  )

  // Fit sentence: surface qualifications when present so the letter
  // still feels grounded in the user's claims.
  const fit = args.profile?.qualifications
    ? `My background also includes ${truncate(args.profile.qualifications.replace(/\s+/g, " ").trim(), 180)}.`
    : ""

  const close = `I'd welcome a short conversation about how this maps to your priorities for ${role}${args.job.companyName ? ` at ${args.job.companyName}` : ""}.`

  return [
    "Dear Hiring Team,",
    "",
    hook,
    "",
    proofSentences.length > 0 ? proofSentences.join(" ") : "",
    "",
    fit,
    "",
    close,
    "",
    "Sincerely,",
    name,
  ]
    .filter((line) => line !== "" || true) // keep paragraph spacing
    .join("\n")
}

function winToSentence(
  w: { what: string; number: string; whyItMattered: string; entryLabel: string },
  ctx: { lead?: boolean; role?: string; company?: string }
): string {
  const what = w.what.replace(/\.$/, "").trim()
  const num = w.number ? ` (${w.number})` : ""
  const why = w.whyItMattered ? `, ${w.whyItMattered.replace(/\.$/, "").trim()}` : ""
  const at = w.entryLabel ? ` at ${w.entryLabel}` : ""
  if (ctx.lead) {
    return `In my work${at}, I ${lowerFirst(what)}${num}${why}, which is the kind of impact I'd bring to ${ctx.role || "this role"}${ctx.company ? ` at ${ctx.company}` : ""}.`
  }
  return `${capFirst(what)}${num}${why}${at}.`
}

function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s
}
function capFirst(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s
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

/**
 * Deterministic over-band trimmer. Splits the letter into greeting +
 * body paragraphs + sign-off, scores each body sentence by
 * "tradability" (no number AND no JD-keyword overlap = most
 * tradable), and drops the most tradable sentences until the body
 * word count falls under the upper band. Hook (first body sentence)
 * and close (last body sentence) are never trimmed.
 *
 * Used as a fallback when the Writer's banned-phrase / band retry
 * still leaves the body too long.
 */
function trimToUpperBand(letter: string, upperBand: number, jdKeywords: string[]): string {
  const lines = letter.split(/\r?\n/)
  // Identify greeting (first non-empty line starting with "Dear") and
  // sign-off block (first "Sincerely" / "Regards" line onwards).
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

  const greeting = lines.slice(0, greetingEnd + 1)
  const signoff = lines.slice(signoffStart)
  const bodyLines = lines.slice(greetingEnd + 1, signoffStart)

  // Split body into sentences while preserving paragraph boundaries.
  // Each "node" is either a paragraph break (blank line) or a sentence.
  type Node =
    | { kind: "break" }
    | { kind: "sent"; text: string; tradability: number; isHook: boolean; isClose: boolean }
  const nodes: Node[] = []
  const paragraphs = bodyLines.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  let sentenceCount = 0
  paragraphs.forEach((para, pIdx) => {
    if (pIdx > 0) nodes.push({ kind: "break" })
    const sents = splitSentences(para)
    for (const s of sents) {
      nodes.push({
        kind: "sent",
        text: s,
        tradability: scoreTradability(s, jdKeywords),
        isHook: false,
        isClose: false,
      })
      sentenceCount += 1
    }
  })
  // Mark hook + close.
  let firstSentIdx = -1
  let lastSentIdx = -1
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i].kind === "sent") {
      if (firstSentIdx === -1) firstSentIdx = i
      lastSentIdx = i
    }
  }
  if (firstSentIdx >= 0) (nodes[firstSentIdx] as Extract<Node, { kind: "sent" }>).isHook = true
  if (lastSentIdx >= 0) (nodes[lastSentIdx] as Extract<Node, { kind: "sent" }>).isClose = true

  // Refuse to trim if we have <=3 trimmable sentences (need to keep
  // at least hook + middle + close).
  const trimmable = nodes.filter(
    (n) => n.kind === "sent" && !n.isHook && !n.isClose
  ) as Array<Extract<Node, { kind: "sent" }>>
  if (trimmable.length === 0) return letter

  // Repeatedly drop the highest-tradability sentence until we're
  // under the band, or we run out of trimmable middle sentences.
  let currentWordCount = wordCountOfNodes(nodes)
  while (currentWordCount > upperBand) {
    const candidates = nodes
      .map((n, idx) => ({ n, idx }))
      .filter(
        (x) => x.n.kind === "sent" && !(x.n as Extract<Node, { kind: "sent" }>).isHook &&
          !(x.n as Extract<Node, { kind: "sent" }>).isClose
      ) as Array<{ n: Extract<Node, { kind: "sent" }>; idx: number }>
    if (candidates.length === 0) break
    candidates.sort((a, b) => b.n.tradability - a.n.tradability)
    nodes.splice(candidates[0].idx, 1)
    currentWordCount = wordCountOfNodes(nodes)
  }

  // Rebuild the letter.
  const rebuiltBody = nodes
    .map((n) => (n.kind === "break" ? "" : n.text))
    .join(" ")
    .replace(/\s+\.\s*/g, ". ") // tidy punctuation
    .replace(/\s+,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim()
  // Re-paragraph: break on the "break" nodes by walking again.
  const paragraphsOut: string[] = []
  let buf: string[] = []
  for (const n of nodes) {
    if (n.kind === "break") {
      if (buf.length) paragraphsOut.push(buf.join(" ").trim())
      buf = []
    } else {
      buf.push(n.text)
    }
  }
  if (buf.length) paragraphsOut.push(buf.join(" ").trim())

  return [
    ...greeting,
    "",
    ...paragraphsOut.flatMap((p, i) => (i === 0 ? [p] : ["", p])),
    "",
    ...signoff,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim() + (rebuiltBody ? "" : "")
}

function splitSentences(paragraph: string): string[] {
  // Split on .!? followed by whitespace + capital, keeping the
  // punctuation. Conservative — better to under-split than to
  // shred a quote.
  const out: string[] = []
  const regex = /[^.!?]+[.!?]+(?=\s|$)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(paragraph)) !== null) {
    out.push(m[0].trim())
  }
  // If nothing matched (no terminal punctuation), keep the whole para.
  if (out.length === 0 && paragraph.trim()) out.push(paragraph.trim())
  return out
}

function scoreTradability(sentence: string, jdKeywords: string[]): number {
  const lower = sentence.toLowerCase()
  const hasNumber = /\b\d+(\.\d+)?(%|x|k|m|\+|\b)/.test(lower)
  const keywordHits = jdKeywords.filter((k) => k && lower.includes(k)).length
  // Lower tradability = MORE valuable / less safe to drop.
  // We DROP the highest-tradability sentence first.
  let score = 1.0
  if (hasNumber) score -= 0.6
  // Heavier keyword weighting protects ATS-relevant sentences from the
  // trimmer — dropping a keyword-bearing sentence is what tanks the ATS
  // score, so a sentence carrying JD keywords is treated as near-untradable.
  score -= 0.2 * Math.min(keywordHits, 5)
  return score
}

function wordCountOfNodes(nodes: Array<{ kind: "break" } | { kind: "sent"; text: string }>): number {
  const text = nodes.filter((n) => n.kind === "sent").map((n) => (n as { text: string }).text).join(" ")
  const words = text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)
  return words ? words.length : 0
}
