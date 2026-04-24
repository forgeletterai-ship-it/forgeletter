import { LegalPage } from "@/components/LegalPage"

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="The basic terms for using LetterForge to prepare application materials."
      sections={[
        {
          title: "Use of the service",
          body: "Users are responsible for the accuracy of the information they enter and for reviewing any draft before submitting it to an employer or career partner.",
        },
        {
          title: "Accounts",
          body: "Users should keep login credentials secure and notify LetterForge if they suspect unauthorized access.",
        },
        {
          title: "Generated content",
          body: "Generated or assisted content should be treated as draft support. Users remain responsible for truthfulness, edits, and final submissions.",
        },
        {
          title: "Billing",
          body: "Paid subscriptions are processed by Stripe. Users can manage invoices, payment methods, and cancellation through the billing portal when available.",
        },
        {
          title: "Availability",
          body: "The service may change as features are added, refined, or removed. LetterForge aims to communicate material changes clearly.",
        },
      ]}
    />
  )
}
