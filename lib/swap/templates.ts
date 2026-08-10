import type { Profile, SentenceClass } from "@/lib/swap/types"

/**
 * Every user-facing string the diagnostic renders (Rule 5: the model
 * emits identifiers, never prose — all reasoning language lives
 * here). F01/F03/F08 repair templates and all profile copy are
 * VERBATIM from MASTER_BUILD_SWAP_TEST.md Appendix B; the remaining
 * repairs are written in the same voice. Gold quotes come only from
 * the verified Appendix A letters until Phase 3 extraction supplies
 * anonymised alternatives (anonymisation CI covers them).
 */

export interface RepairTemplate {
  headline: string
  body: string
  goldQuote: string
  ask: string
}

export const REPAIRS: Record<string, RepairTemplate> = {
  F01: {
    headline: "A verb with no magnitude",
    body: "A reader can't tell a 2% lift from a 40% one, so they assume the smaller. The move that works is the before and the after.",
    goldQuote: "60-day retention moved from 12 percent to 54 percent",
    ask: "What was the number before, and what was it after?",
  },
  F02: {
    headline: "A grade you gave yourself",
    body: "\"Data-driven\" and \"collaborative\" are your opinion of you — the reader discounts them on arrival. The move that works is naming the method or result that earned the adjective.",
    goldQuote: "11 experiments over two quarters lifted trial starts from 6.1% to 8.4%",
    ask: "What did you do that earns the adjective?",
  },
  F03: {
    headline: "True of every company in the category",
    body: "This would survive unchanged at any competitor, so it tells the reader nothing about why you're writing to them. The move that works is naming a decision they actually made.",
    goldQuote: "your move to bundle Daily Mix with the family plan",
    ask: "What has this employer done that you have an opinion about?",
  },
  F04: {
    headline: "Years are not a result",
    body: "Tenure tells the reader how long you sat near the work, not what moved because of you. The move that works is stating your exact scope, then one before-and-after from it.",
    goldQuote: "I owned free-to-paid activation",
    ask: "What did you own, and what changed while you owned it?",
  },
  F05: {
    headline: "The posting, read back to them",
    body: "Restating a requirement proves you can read the ad — which every applicant can. The move that works is engaging one posting detail with something it doesn't already say.",
    goldQuote: "exactly the conversion problem I've spent two years on",
    ask: "What does the posting say that you can add something new to?",
  },
  F06: {
    headline: "An ending that asks for nothing",
    body: "\"I look forward to hearing from you\" leaves the reader with no move to make. The move that works is naming the concrete first step you'd take in the role.",
    goldQuote: "I'd bring that same evidence-first pace to your Berlin growth team",
    ask: "If they hired you Monday, what would you do first?",
  },
  F07: {
    headline: "An opener about your feelings",
    body: "\"I'm excited to apply\" is the sentence every other letter starts with, so the reader skips it. The move that works is opening on a decision they made or a number you own.",
    goldQuote: "Chorusline's move to bundle Daily Mix with the family plan is exactly the conversion problem I've spent two years on.",
    ask: "What do you know about them — or your results — that could be sentence one?",
  },
  F08: {
    headline: "Nothing went wrong anywhere",
    body: "An unbroken run of wins reads as a summary, not a memory. Naming what failed first is what makes the win credible.",
    goldQuote: "The first three tests failed outright",
    ask: "What did you try that didn't work before it did?",
  },
  // Deterministic fixes that aren't agent F-codes (fixes.ts rules).
  ENGAGE: {
    headline: "The employer never appears",
    body: "Nothing here engages with the company you're sending this to — not a decision, not a product, not the posting. The move that works is one sentence that could only be written to them.",
    goldQuote: "Chorusline's move to bundle Daily Mix with the family plan is exactly the conversion problem I've spent two years on.",
    ask: "What has this employer actually done that you can react to?",
  },
  TRADE: {
    headline: "The flattery trade",
    body: "Most of this letter is about the employer while your own claims go unchecked. Trade one research sentence for one result with a number attached — the reader needs both sides specific.",
    goldQuote: "11 experiments over two quarters lifted trial starts from 6.1% to 8.4%",
    ask: "Which employer sentence would you trade for your strongest number?",
  },
}

/** Hover/tap reason per sentence class (Rule 5: every explanation a
 *  user reads is template language, never model output). */
export const CLASS_REASON: Record<SentenceClass, string> = {
  structural: "Structural — greeting or sign-off; excluded from every score.",
  "distinctive-them":
    "Could only have been written to this employer — it survives the swap test.",
  "boilerplate-them":
    "About the employer, but it would survive unchanged at any competitor.",
  "checkable-you":
    "A claim about you an interviewer could probe and catch a wrong answer on.",
  "asserted-you": "A claim about you with no number, baseline, or named result.",
}

/** Class reason + the failure headline when the sentence commits one. */
export function sentenceReason(cls: SentenceClass, failure: string | null): string {
  const base = CLASS_REASON[cls]
  if (failure && REPAIRS[failure]) return `${base} ${REPAIRS[failure].headline}.`
  return base
}

export interface ProfileCopy {
  headline: string
  body: string
  beforeYouRewrite?: string
}

/** Appendix B profile copy — verbatim. */
export const PROFILE_COPY: Record<Profile, ProfileCopy> = {
  TEMPLATE_FILL: {
    headline: "This letter was built from the job posting.",
    body: "Two-thirds of your phrasing traces back to the ad itself, and there isn't a single number in it. That combination has one usual cause: whatever wrote this had the posting to work from and nothing about your actual results. The posting is the one input every other applicant also has. Your numbers are the input only you have, and they're missing.",
    beforeYouRewrite:
      "Before you rewrite: find three figures — what was it before you, what was it after, and over how long?",
  },
  BLANK_PAGE: {
    headline: "You wrote this from scratch, and left the evidence out.",
    body: "There's very little of the posting's language here, which means you weren't copying — you were composing. But most of your claims about yourself carry no number, no baseline, and no named result. \"I improved onboarding\" and \"I improved onboarding, cutting time-to-first-use from four days to ninety minutes\" describe the same work; only one survives a reader skimming eleven applications.",
    beforeYouRewrite:
      "The fastest fix: take your strongest sentence and add the before, the after, and the timeframe.",
  },
  CREDENTIALS: {
    headline: "Strong evidence. Wrong letter.",
    body: "Your claims about yourself hold up — most carry a number a reader could check. But nothing here is specific to this employer, so this letter would work unchanged at any of their competitors. You don't need more proof. You need one sentence that could only have been written to them.",
  },
  FLATTERY: {
    headline: "You researched them and said nothing about yourself.",
    body: "A large share of this letter is about the employer, but almost none of your own claims can be checked. The reader learns that you did your homework — and nothing about whether you can do the job. Trade one research sentence for one result with a number attached.",
  },
  TARGETED: {
    headline: "This one works.",
    body: "There's a passage that could only have been written to this employer, and your own claims carry numbers a reader could probe. Both sides are specific. The remaining question is whether it's the right evidence for this role — which is a judgment call, not something we can measure.",
  },
}

export const REDUCED_CONFIDENCE_SUFFIX =
  "Without the job posting we can't tell how this letter was assembled — paste it for the full read."

export const SCAN1_BANNER =
  "Two more scans free with an account — plus the full fix list."

export const ACCOUNT_GATE_COPY =
  "Two more scans, the full fix list, and — if you opt in — one email in 30 days asking whether you got the interview. We publish what we find."

export const OUTCOME_CHECKBOX_LABEL =
  "Email me once in 30 days to ask how it went. That's the whole deal."

export const RESEARCH_CHECKBOX_LABEL =
  "Keep an anonymised copy of my letter to improve the tool (optional — names, employers and figures are stripped first)."

export const JD_FIELD_DISCLOSURE =
  "Paste the job ad too (optional). With it we measure your letter against real postings for this role instead of a reference phrase list — it makes the Anchor score meaningfully more accurate. We store word counts from the posting, never the text."

export const INPUT_PRIVACY_LINE =
  "We don't store your letter — it's analysed and thrown away. One free scan without an account."

export const OUTCOME_EMAIL = {
  subject: "Did that cover letter get the interview?",
  body: "A month ago you scanned a cover letter with us. One question, three buttons — that's the whole email. [Got an interview] [No interview] [Didn't apply]. We publish what we learn, including if our scores turn out not to matter. — ForgeLetter",
}

export const GOLD_INVITE =
  "This is one of the best letters we've scanned. May we keep an anonymised copy in our reference library? Three months of Pro if yes — names, employers and figures are stripped first."

/** The verified single-example fallback until benchmark.json is
 *  measured (Rule 7 / Part I — never invent an average). */
export const BENCHMARK_FALLBACK_LINE =
  "The ForgeLetter example on this page scores Anchor 25 / Proof 100."

export function benchmarkLine(
  benchmark: { medianAnchor: number; medianProof: number; n: number } | null
): string {
  if (!benchmark) return BENCHMARK_FALLBACK_LINE
  return `Our letters score a median Anchor ${benchmark.medianAnchor} / Proof ${benchmark.medianProof} across ${benchmark.n} recent letters.`
}

/** The Wall (Part I §1.2 — verbatim skeleton with live values). */
export function wallCopy(values: {
  a1: number
  a3: number
  p1: number
  p3: number
  benchmark: { medianAnchor: number; medianProof: number; n: number } | null
}): { heading: string; trajectory: string; body: string; pitch: string; cta: string } {
  return {
    heading: "You've scanned three times. Here's the trajectory:",
    trajectory: `Anchor ${values.a1}% → ${values.a3}% · Proof ${values.p1}% → ${values.p3}%`,
    body: "The diagnosis won't change until the letter does — and the fix takes real numbers and real company research, per application.",
    pitch: `ForgeLetter builds letters that score in the healthy band, from your actual results. ${benchmarkLine(values.benchmark)}`,
    cta: "Build my letter →",
  }
}
