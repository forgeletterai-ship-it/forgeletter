import Anthropic from "@anthropic-ai/sdk"
import {
  buildAgentPrefix,
  FAILURE_CODES,
  TECHNIQUE_CODES,
} from "@/lib/swap/agent-prefix"
import { swapLog, swapLogError } from "@/lib/swap/logscrub"
import type { SegmentedSentence, SentenceLabel } from "@/lib/swap/types"

/**
 * The one LLM call per scan (Rule 3). Runtime model is PINNED to
 * Haiku 4.5 — do not upgrade it (Part I builder note; the Part VII
 * cost guardrails depend on it). temperature 0 (Rule 4); the prefix
 * block carries a 1-hour ephemeral cache_control and the hourly warm
 * cron keeps it hot.
 *
 * The model emits identifiers only (Rule 5). The parser validates
 * short keys strictly against the catalogue: unknown codes are
 * dropped and logged; malformed JSON gets exactly one retry, then a
 * typed failure the route maps to 502.
 */

export const SCAN_MODEL = "claude-haiku-4-5-20251001"
export const MAX_OUTPUT_TOKENS = 1200

export class AgentParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AgentParseError"
  }
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

interface WireSentence {
  i?: unknown
  st?: unknown
  tm?: unknown
  yu?: unknown
  tp?: unknown
  ck?: unknown
  t?: unknown
  f?: unknown
}

function parseWire(raw: string, sentenceCount: number): SentenceLabel[] {
  let parsed: { s?: WireSentence[] }
  try {
    // Tolerate accidental fencing; nothing else.
    const cleaned = raw.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new AgentParseError("malformed JSON")
  }
  if (!parsed || !Array.isArray(parsed.s)) {
    throw new AgentParseError("missing s array")
  }

  const labels: SentenceLabel[] = []
  for (const row of parsed.s) {
    const index = typeof row.i === "number" ? row.i : -1
    if (index < 0 || index >= sentenceCount) continue

    const structural = row.st === true
    let technique = typeof row.t === "string" ? row.t : null
    let failure = typeof row.f === "string" ? row.f : null
    if (technique && !TECHNIQUE_CODES.has(technique)) {
      swapLog("agent.unknown_code", { code: technique, kind: "technique" })
      technique = null
    }
    if (failure && !FAILURE_CODES.has(failure)) {
      swapLog("agent.unknown_code", { code: failure, kind: "failure" })
      failure = null
    }

    const themPhrases = Array.isArray(row.tp)
      ? row.tp.filter((p): p is string => typeof p === "string").slice(0, 4)
      : []

    labels.push({
      index,
      structural,
      aboutThem: !structural && row.tm === true,
      aboutYou: !structural && row.yu === true,
      themPhrases: structural ? [] : themPhrases,
      checkable: !structural && row.ck === true,
      technique: structural ? null : technique,
      failure: structural ? null : failure,
    })
  }
  if (labels.length === 0) throw new AgentParseError("no valid sentence rows")
  return labels
}

export interface AgentResult {
  labels: SentenceLabel[]
  cacheReadTokens: number
  cacheCreationTokens: number
  outputTokens: number
}

async function callOnce(numbered: string): Promise<{ text: string; usage: AgentResult }> {
  const response = await getClient().messages.create({
    model: SCAN_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0,
    system: [
      {
        type: "text",
        text: buildAgentPrefix(),
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: numbered }],
  })
  const block = response.content[0]
  const text = block && block.type === "text" ? block.text : ""
  const u = response.usage as unknown as {
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
    output_tokens?: number
  }
  return {
    text,
    usage: {
      labels: [],
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
    },
  }
}

export async function classifyWithAgent(
  sentences: SegmentedSentence[]
): Promise<AgentResult> {
  const numbered = sentences.map((s) => `${s.index}. ${s.text}`).join("\n")

  let attempt = await callOnce(numbered)
  try {
    return { ...attempt.usage, labels: parseWire(attempt.text, sentences.length) }
  } catch (first) {
    swapLogError("agent.parse_retry", { message: (first as Error).message })
    // Exactly one retry (Phase 4), then the typed error surfaces.
    attempt = await callOnce(numbered)
    return { ...attempt.usage, labels: parseWire(attempt.text, sentences.length) }
  }
}
