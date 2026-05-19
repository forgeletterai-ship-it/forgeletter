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
