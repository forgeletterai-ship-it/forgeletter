/**
 * Phrases the Quality Gate refuses to ship. Adding to this list is how you
 * raise the floor on output quality — if a real letter would never start
 * with these words, they belong here.
 */
export const BANNED_OPENINGS = [
  "i am writing to express my interest",
  "i am writing to apply for",
  "i hope this email finds you well",
  "to whom it may concern",
  "dear hiring manager,\n\ni am writing",
  "please find attached",
  "i would like to take this opportunity",
  "as a [adjective]",
] as const

export const BANNED_PHRASES = [
  "team player",
  "hit the ground running",
  "think outside the box",
  "synergy",
  "go-getter",
  "results-oriented",
  "detail-oriented",
  "highly motivated individual",
  "passionate about",
  "rockstar",
  "ninja",
  "guru",
  "in today's fast-paced world",
  "perfect candidate",
  "i am confident that",
  "tldr",
  "as an ai",
  "as a language model",
] as const

export interface BannedPhraseMatch {
  phrase: string
  location: "opening" | "body"
}

export function detectBannedPhrases(letter: string): BannedPhraseMatch[] {
  const normalized = letter.toLowerCase()
  const matches: BannedPhraseMatch[] = []

  // Check first 200 chars for banned openings — these kill the letter on sight.
  const opening = normalized.slice(0, 220)
  for (const phrase of BANNED_OPENINGS) {
    if (opening.includes(phrase)) {
      matches.push({ phrase, location: "opening" })
    }
  }

  for (const phrase of BANNED_PHRASES) {
    if (normalized.includes(phrase)) {
      matches.push({ phrase, location: "body" })
    }
  }

  return matches
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface WithRetryOptions {
  attempts?: number
  baseDelayMs?: number
  onAttempt?: (attemptNumber: number, error: unknown) => void
}

/**
 * Retry an async fn with exponential backoff. We catch every error — the
 * Anthropic SDK already retries on transient network failures, so anything
 * that reaches us is more likely a parse / validation problem.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: WithRetryOptions = {}
): Promise<T> {
  const attempts = opts.attempts ?? 3
  const base = opts.baseDelayMs ?? 750
  let lastErr: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      opts.onAttempt?.(i + 1, err)
      if (i < attempts - 1) {
        await sleep(base * Math.pow(2, i))
      }
    }
  }
  throw lastErr
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function safeSlice(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + "\n... [truncated]"
}

/**
 * Strip "dashes for effect" from generated prose.
 *
 * The 50 gold-standard letters never use an em-dash or en-dash as a
 * rhetorical device — the source document is explicit: "None uses a
 * dash for effect." A stray em-dash (—) is one of the strongest tells
 * that a letter was machine-written, so customers read it as "this was
 * written by AI". This deterministic scrubber is the last line of
 * defence behind the Writer / Final Editor prompt instructions.
 *
 * It converts em-dashes (—), en-dashes (–), horizontal bars, figure
 * dashes, double-hyphen runs, and spaced single hyphens used as dashes
 * into commas — or into a plain hyphen for numeric ranges — then tidies
 * the punctuation collisions that creates.
 *
 * Left untouched: word-internal hyphens ("data-driven", "first-class")
 * and numeric ranges already written with a hyphen ("5-10"), since
 * neither reads as an AI tell.
 */
export function scrubDashes(text: string): string {
  let out = text

  // 1. Numeric ranges expressed with en/em dashes → hyphen.
  //    "2019 – 2023" / "10—20%" → "2019-2023" / "10-20%"
  out = out.replace(/(\d)\s*[—–―‒]\s*(\d)/g, "$1-$2")

  // 2. Em / en / horizontal-bar / figure / multi-em dashes used as a
  //    clause separator → comma.
  out = out.replace(/\s*[—–―‒⸺⸻]\s*/g, ", ")

  // 3. Double (or longer) hyphen runs used as an em-dash → comma.
  out = out.replace(/\s*-{2,}\s*/g, ", ")

  // 4. A single hyphen padded by spaces used as a dash for effect.
  //    Requires a non-digit before and after so date/number ranges
  //    written with a spaced hyphen ("2019 - 2023") survive untouched.
  out = out.replace(/([^\d\s])\s+-\s+(?=\D)/g, "$1, ")

  // 5. Tidy the punctuation collisions the substitutions can create.
  out = out
    .replace(/ {2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ", ")
    .replace(/,\s*([.!?;:])/g, "$1")
    .replace(/([.!?;:])\s*,\s*/g, "$1 ")

  return out
}
