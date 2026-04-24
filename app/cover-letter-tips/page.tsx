import { SimplePage } from "@/components/SimplePage"

export default function CoverLetterTipsPage() {
  return (
    <SimplePage
      kicker="Guide"
      title="Cover letter tips"
      intro="Practical writing rules that match the premium product direction."
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
