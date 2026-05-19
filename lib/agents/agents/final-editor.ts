import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import { detectBannedPhrases } from "../utils"
import type { FinalEdit } from "../types"
import type { CallMeta } from "./resume-analyst"

const FinalEditSchema = z.object({
  letter: z.string(),
  changesMade: z.array(z.string()),
  bannedPhrasesRemoved: z.array(z.string()),
})

const SYSTEM = `You are a copy editor finalizing a cover letter. Make precise, surgical edits. Do not rewrite the letter — improve it.

Your job:
1. Remove any banned cliché phrases without changing meaning. Banned list: "team player", "hit the ground running", "synergy", "go-getter", "results-oriented", "detail-oriented", "passionate about", "rockstar", "ninja", "in today's fast-paced world", "perfect candidate", "I am confident that", "I am writing to express my interest", "I hope this email finds you well", "To whom it may concern", "as a [adjective]".
2. Replace any vague claim with a concrete one if the surrounding context supports it. If not, tighten the sentence.
3. Fix any awkward phrasing or grammar.
4. Ensure the opening hook is specific and the closing has a concrete next step.
5. Keep the same overall structure, tone, and length (±10%).

Output:
- "letter": the edited letter, ready to send. Start with "Dear ..." and end with sign-off.
- "changesMade": one short line per change you made. Up to 6.
- "bannedPhrasesRemoved": exact phrases you stripped from the original.

Never invent new facts or specifics. If a banned phrase has no clean replacement using existing material, delete the sentence rather than fabricate.`

export async function runFinalEditor(args: {
  letter: string
}): Promise<{ data: FinalEdit; meta: CallMeta; fallback: boolean }> {
  try {
    const result = await structuredCall({
      agent: "FinalEditor",
      model: MODELS.sonnet,
      system: SYSTEM,
      user: `Edit this letter:\n\n${args.letter}`,
      schema: FinalEditSchema,
      schemaName: "submit_final_edit",
      schemaDescription: "Submit the surgically edited letter.",
      temperature: 0.3,
      maxTokens: 2048,
    })

    // Belt-and-braces: even if the editor missed something, we run a
    // deterministic check on the final output. If a banned opening
    // survived, that's a signal something went wrong upstream.
    const surviving = detectBannedPhrases(result.data.letter)
    const survivingPhrases = surviving.map((s) => s.phrase)

    return {
      data: {
        ...result.data,
        bannedPhrasesRemoved: dedupe([
          ...result.data.bannedPhrasesRemoved,
          ...survivingPhrases.map((p) => `WARNING: still present after edit: ${p}`),
        ]),
      },
      meta: {
        modelUsed: result.modelUsed,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        durationMs: result.durationMs,
      },
      fallback: false,
    }
  } catch (err) {
    console.warn("[FinalEditor] falling back to original:", err)
    return {
      data: { letter: args.letter, changesMade: [], bannedPhrasesRemoved: [] },
      meta: { modelUsed: MODELS.sonnet, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}
