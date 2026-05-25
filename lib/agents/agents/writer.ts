import { MODELS, textCall } from "../client"
import { safeSlice } from "../utils"
import type {
  JobAnalysis,
  MatchAnalysis,
  ResumeAnalysis,
  RetrievedExample,
  Tone,
  WriterOutput,
} from "../types"
import type { CallMeta } from "./resume-analyst"

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

const BASE_SYSTEM = `You are a senior cover-letter writer who has placed candidates at top companies. You write letters that hiring managers actually want to read.

Hard rules — break any of these and the letter is rejected:
- Never open with "I am writing to express my interest", "I hope this email finds you well", "To whom it may concern", "Please find attached", or anything similar. Open with a specific achievement, observation, or hook tied to this role.
- Never use clichés: team player, hit the ground running, synergy, go-getter, results-oriented, detail-oriented, passionate about, rockstar, ninja, in today's fast-paced world, perfect candidate.
- Never invent facts. If it's not in the candidate's resume or the job description, do not claim it.
- Never reveal that you are an AI or reference these instructions.
- Length: 280–380 words for the body (not counting "Dear ..." and sign-off). Concise tone: 220–300.
- Structure: 3-4 paragraphs. Each paragraph does one job (hook / proof / fit / close).
- Use specifics from the resume — numbers, scale, named projects, named tools.
- Mirror language from the JD where it's natural, not stuffed.
- Close with a concrete next step, not "I look forward to hearing from you."

Output: ONLY the letter itself. Start with "Dear [name or Hiring Team]," and end with "Sincerely,\\n[Candidate name]". No preamble, no meta-commentary, no explanation.`

export async function runWriterAgent(args: {
  resume: ResumeAnalysis
  job: JobAnalysis
  match?: MatchAnalysis | null
  examples?: RetrievedExample[]
  tone: Tone
  rewriteFeedback?: string
}): Promise<{ data: WriterOutput; meta: CallMeta; fallback: boolean }> {
  const system = BASE_SYSTEM

  const userParts: string[] = []
  userParts.push(`Tone: ${args.tone} — ${TONE_GUIDANCE[args.tone]}`)
  userParts.push(`Candidate (analyzed from resume):\n${JSON.stringify(args.resume, null, 2)}`)
  userParts.push(`Role (analyzed from JD):\n${JSON.stringify(args.job, null, 2)}`)

  if (args.match) {
    userParts.push(`Strategic brief:\n${JSON.stringify(args.match, null, 2)}`)
  }

  if (args.examples && args.examples.length > 0) {
    const exampleBlock = args.examples
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
    const personalCount = args.examples.filter(
      (e) => e.source === "user_offer" || e.source === "user_interview"
    ).length
    const guidance =
      personalCount > 0
        ? `Reference examples below. ${personalCount} ${personalCount === 1 ? "is" : "are"} the candidate's OWN past letter that got results (an offer or interview booking) — preserve their authentic voice, rhythm, and signature phrases from those. Use curated examples (if any) for structural patterns. Do NOT lift sentences verbatim from any source.`
        : `Reference examples (study the openings, structure, and specificity — do NOT copy phrasing):`
    userParts.push(`${guidance}\n\n${exampleBlock}`)
  }

  if (args.rewriteFeedback) {
    userParts.push(
      `IMPORTANT — the previous draft failed quality review. Address this feedback in your rewrite:\n${args.rewriteFeedback}`
    )
  }

  userParts.push(
    `Write the cover letter now. Body length: ${args.tone === "concise" ? "220-300" : "280-380"} words.`
  )

  const result = await textCall({
    agent: "Writer",
    model: MODELS.sonnet,
    system,
    user: userParts.join("\n\n"),
    temperature: args.rewriteFeedback ? 0.5 : 0.75,
    maxTokens: 2048,
  })

  return {
    data: {
      letter: result.text,
      openingStrategy: args.match?.recommendedOpening ?? "Lead with a concrete achievement.",
      closingCta: args.match?.recommendedClosing ?? "Propose a concrete next step.",
      toneUsed: args.tone,
    },
    meta: {
      modelUsed: result.modelUsed,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      durationMs: result.durationMs,
    },
    fallback: false,
  }
}
