import type { Metadata } from "next"
import { SimplePage } from "@/components/SimplePage"

export const metadata: Metadata = {
  title: "Cover letter tips",
  description:
    "Practical writing rules for cover letters that get read: open with relevance, prove with a metric, mirror the job language, close with confidence.",
  alternates: {
    canonical: "/cover-letter-tips",
  },
}

export default function CoverLetterTipsPage() {
  return (
    <SimplePage
      kicker="Guide"
      title="Cover letter tips"
      intro="Practical writing rules that separate letters that get read from letters that get skipped."
      cards={[
        {
          title: "Open with relevance",
          body: "Mention the role, company, and one reason the opportunity fits your experience. Avoid vague enthusiasm.",
        },
        {
          title: "Prove with one metric",
          body: "One concrete outcome is stronger than a paragraph of adjectives. Use numbers whenever you can.",
        },
        {
          title: "Mirror the job language",
          body: "Borrow important terms from the posting, but keep the writing natural and specific to your background.",
        },
        {
          title: "Close with confidence",
          body: "End by connecting your strengths to the team's goals and inviting a focused conversation.",
        },
      ]}
    />
  )
}
