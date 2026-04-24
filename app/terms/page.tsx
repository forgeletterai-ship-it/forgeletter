import { LegalPage } from "@/components/LegalPage"

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="Plain-language terms shell for the product. Review before public launch."
      sections={[
        {
          title: "Use of the service",
          body: "Users are responsible for the accuracy of the information they enter and for reviewing any draft before submitting it to an employer.",
        },
        {
          title: "Accounts",
          body: "Users should keep login credentials secure and notify LetterForge if they suspect unauthorized access.",
        },
        {
          title: "Generated content",
          body: "When AI generation is connected, output should be treated as a draft aid. Users remain responsible for edits, truthfulness, and final submissions.",
        },
        {
          title: "Availability",
          body: "The service may change as features are added, refined, or removed during development.",
        },
      ]}
    />
  )
}
