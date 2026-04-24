import { LegalPage } from "@/components/LegalPage"

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="A clean cookie policy shell for authentication, analytics, and billing integrations."
      sections={[
        {
          title: "Essential cookies",
          body: "Essential cookies may be used for authentication, security, and session continuity.",
        },
        {
          title: "Analytics cookies",
          body: "Analytics should be added only after deciding what events are useful and privacy-safe.",
        },
        {
          title: "Payment cookies",
          body: "Stripe may use cookies or similar technologies during checkout once billing is connected.",
        },
        {
          title: "Control",
          body: "Users can manage cookies through their browser settings. Add a consent banner if your legal review requires it.",
        },
      ]}
    />
  )
}
