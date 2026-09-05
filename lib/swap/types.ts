/**
 * Swap Test — shared contracts.
 *
 * Source of truth: MASTER_BUILD_SWAP_TEST.md. The swap stack is a
 * standalone diagnostic: nothing here imports from lib/agents/ and
 * letter text never leaves request memory (Rule 1).
 */

/** Technique codes T01–T12, validated against the active catalogue. */
export type TechniqueCode = string
/** Failure codes F01–F08, validated against the active catalogue. */
export type FailureCode = string

/** The four visible sentence classes plus structural (Part III). */
export type SentenceClass =
  | "structural"
  | "distinctive-them"
  | "boilerplate-them"
  | "checkable-you"
  | "asserted-you"

export interface SegmentedSentence {
  index: number
  text: string
  words: number
}

/** One sentence's labels as emitted by the agent (long-key form —
 *  the parser expands the wire short keys). */
export interface SentenceLabel {
  index: number
  structural: boolean
  aboutThem: boolean
  aboutYou: boolean
  themPhrases: string[]
  checkable: boolean
  technique: TechniqueCode | null
  failure: FailureCode | null
}

/** A sentence with labels + resolved distinctiveness + display class. */
export interface ClassifiedSentence extends SegmentedSentence, SentenceLabel {
  /** Distinctiveness of the them-claim (false for non-them sentences). */
  distinct: boolean
  cls: SentenceClass
  /** True when redaction lifts this sentence out (distinctive-them). */
  removed: boolean
}

export type Quadrant = "TARGETED" | "FLATTERY" | "CREDENTIALS" | "FILLER"

export type Profile =
  | "TARGETED"
  | "FLATTERY"
  | "CREDENTIALS"
  | "TEMPLATE_FILL"
  | "BLANK_PAGE"

export type ProfileConfidence = "full" | "reduced"

export interface Scores {
  /** % of non-structural words inside distinctive-them sentences. */
  anchor: number
  /** % of aboutYou claims that are checkable. */
  proof: number
  quadrant: Quadrant
  nonStructuralWords: number
  distinctiveWords: number
  youClaims: number
  checkableClaims: number
}

export interface Signals {
  /** Content-trigram overlap letter↔JD; null without a JD. */
  echo: number | null
  affectCount: number
  affectRatio: number
  /** Sentence-length coefficient of variation; null under 4 sentences.
   *  NEVER surfaced in UI, never verdict-bearing alone (Phase 1 ⚙). */
  cv: number | null
}

/** Deterministic fix card (content from lib/swap/templates.ts). */
export interface Fix {
  key: string
  headline: string
  body: string
  goldQuote: string
  ask: string
  quotedSentence?: string
  count?: number
}

/** Distinctiveness resolution mode (results disclosure, §3.3 item 7). */
export type DistinctMode = "corpus" | "stoplist"

/** Calibrated thresholds — exists only after Phase 5 (Rule 7). */
export interface SwapThresholds {
  version: string
  basis: string
  echoHigh: number | null
  affectHigh: number | null
  cvLow: number | null
}

export interface LadderDecision {
  allowed: boolean
  /** 1..3 ladder position; null for paying customers. */
  ordinal: number | null
  tier: "anon" | "account" | "paying"
  reason?: "anon_limit" | "acct_limit" | "rate" | "turnstile" | "circuit"
}

/** The API response. Contains markup + numbers only — never stored. */
export interface ScanResult {
  rubricVersion: string
  thresholdsVersion: string | null
  sentences: ClassifiedSentence[]
  scores: Scores
  signals: Omit<Signals, "cv">
  profile: Profile
  confidence: ProfileConfidence
  redactionSummary: string
  fixes: Fix[]
  fixesShown: number
  distinctMode: DistinctMode
  corpusSize: number
  ordinal: number | null
  tier: LadderDecision["tier"]
  cached: boolean
  outcomeToken: string | null
}
