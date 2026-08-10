import { countWords } from "@/lib/swap/segment"
import type { SegmentedSentence, SentenceLabel } from "@/lib/swap/types"

/**
 * Appendix A — computed and verified demo data. DO NOT ALTER.
 * Drives the homepage demo (static, zero API calls) and the
 * mandatory scoring regression in tests/swap-score.test.ts:
 * letter 1 → 0 / 25 / FILLER · letter 2 → 24±2 / 100 / TARGETED.
 */

export interface DemoSentenceSpec {
  text: string
  structural?: boolean
  aboutThem?: boolean
  aboutYou?: boolean
  themPhrases?: string[]
  checkable?: boolean
  technique?: string | null
  failure?: string | null
}

export interface DemoLetter {
  id: "generic" | "targeted"
  title: string
  sentences: DemoSentenceSpec[]
  anchorBandLine: string
  proofBandLine: string
}

export const DEMO_LETTERS: DemoLetter[] = [
  {
    id: "generic",
    title: "ChatGPT · generic prompt",
    sentences: [
      { text: "Dear Hiring Manager,", structural: true },
      {
        text: "I'm excited to apply for the Senior Product Manager role at Chorusline.",
        aboutThem: true,
        themPhrases: ["the Senior Product Manager role at Chorusline"],
        failure: "F07",
      },
      {
        text: "As a product manager with over six years of experience in consumer subscription apps, I've led cross-functional teams through discovery, experimentation, and launch.",
        aboutYou: true,
        checkable: true,
        failure: "F04",
      },
      {
        text: "I admire how Chorusline's platform has made streaming more personal, and I'd love to bring my growth mindset to your conversion challenges.",
        aboutThem: true,
        themPhrases: ["Chorusline's platform", "your conversion challenges"],
        failure: "F03",
      },
      {
        text: "In my current role I improved onboarding, strengthened retention, and partnered closely with design and engineering.",
        aboutYou: true,
        failure: "F01",
      },
      {
        text: "Chorusline's commitment to putting artists first is something I deeply believe in.",
        aboutThem: true,
        themPhrases: ["Chorusline's commitment to putting artists first"],
        failure: "F03",
      },
      {
        text: "I'm a data-driven leader with a genuine passion for music and technology.",
        aboutYou: true,
        failure: "F02",
      },
      {
        text: "I'm confident my analytical approach and collaborative style would make an immediate impact in Berlin.",
        aboutYou: true,
        failure: "F02",
      },
      {
        text: "Throughout my career, I have successfully managed multiple projects at once while maintaining a strong attention to detail.",
        aboutYou: true,
        failure: "F08",
      },
      {
        text: "I thrive in fast-paced environments and always go the extra mile for my team.",
        aboutYou: true,
        failure: "F02",
      },
      {
        text: "I have followed Chorusline's journey for a long time and have always been impressed by your innovative culture.",
        aboutThem: true,
        themPhrases: ["Chorusline's journey", "your innovative culture"],
        failure: "F03",
      },
      {
        text: "At my previous company I was responsible for the customer journey across several digital touchpoints.",
        aboutYou: true,
        failure: "F01",
      },
      {
        text: "I also hold a bachelor's degree in business administration from a well-regarded university.",
        aboutYou: true,
        checkable: true,
        failure: "F04",
      },
      {
        text: "Thank you for your consideration, and I look forward to hearing from you soon.",
        structural: true,
      },
    ],
    anchorBandLine:
      "0 of 190 words are specific to this employer. It names Chorusline four times — none survive as employer-specific.",
    proofBandLine:
      "2 of 8 claims about you are checkable — a degree and 'six years of experience'.",
  },
  {
    id: "targeted",
    title: "ForgeLetter · built from a real profile",
    sentences: [
      { text: "Dear Hiring Manager,", structural: true },
      {
        text: "Chorusline's move to bundle Daily Mix with the family plan is exactly the conversion problem I've spent two years on.",
        aboutThem: true,
        themPhrases: ["move to bundle Daily Mix with the family plan"],
        technique: "T05",
      },
      {
        text: "I've also read how the Daily Mix rollout landed in your app-store reviews — the family-plan complaints cluster around discovery, not price.",
        aboutThem: true,
        themPhrases: ["the Daily Mix rollout", "your app-store reviews"],
        technique: "T06",
      },
      {
        text: "At my current app, I owned free-to-paid activation: 11 experiments over two quarters lifted trial starts from 6.1% to 8.4%.",
        aboutYou: true,
        checkable: true,
        technique: "T02",
      },
      {
        text: "The first three tests failed outright — the real win came from re-ordering the paywall, not redesigning it.",
        aboutYou: true,
        checkable: true,
        technique: "T03",
      },
      {
        text: "I also cut time-to-first-playlist from 4 days to 90 minutes, which doubled week-two retention on that cohort.",
        aboutYou: true,
        checkable: true,
        technique: "T02",
      },
      {
        text: "Before that, I spent 18 months running lifecycle email at a 40-person startup, where I owned the funnel from signup to renewal.",
        aboutYou: true,
        checkable: true,
        technique: "T10",
      },
      {
        text: "I also rebuilt our experiment review so every test ships with a pre-registered success metric — 31 tests last year, 9 wins.",
        aboutYou: true,
        checkable: true,
        technique: "T11",
      },
      {
        text: "My last two quarterly reviews credited the paywall work with €210k in incremental annual recurring revenue.",
        aboutYou: true,
        checkable: true,
        technique: "T01",
      },
      {
        text: "I'd bring that same evidence-first pace to your Berlin growth team.",
        aboutThem: true,
        themPhrases: ["your Berlin growth team"],
      },
    ],
    anchorBandLine:
      "Two passages — 41 words — could only have been written to this employer: 25% of the letter.",
    proofBandLine:
      "6 of 6 claims about you carry a number or named artefact a reader could check.",
  },
]

/** Appendix A homepage copy — verbatim. */
export const DEMO_COPY = {
  heroHeadline: "Letters a hiring manager can't send to anyone else.",
  heroSub:
    "Most cover letters — human or AI — work just as well at a competitor. That's how a reader knows it wasn't written for them.",
  sectionH2: "Remove everything about the employer. What's left?",
}

/** Expand a demo letter into the (segmented, labels) pair the
 *  scoring pipeline consumes. */
export function demoFixture(letter: DemoLetter): {
  segmented: SegmentedSentence[]
  labels: SentenceLabel[]
  fullText: string
} {
  const segmented = letter.sentences.map((s, index) => ({
    index,
    text: s.text,
    words: countWords(s.text),
  }))
  const labels = letter.sentences.map((s, index) => ({
    index,
    structural: Boolean(s.structural),
    aboutThem: Boolean(s.aboutThem),
    aboutYou: Boolean(s.aboutYou),
    themPhrases: s.themPhrases ?? [],
    checkable: Boolean(s.checkable),
    technique: s.technique ?? null,
    failure: s.failure ?? null,
  }))
  return { segmented, labels, fullText: letter.sentences.map((s) => s.text).join(" ") }
}
