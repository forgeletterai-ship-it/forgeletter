import { LegalPage } from "@/components/LegalPage"

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="How LetterForge uses cookies and similar technologies for login, security, and checkout."
      sections={[
        {
          title: "Essential cookies",
          body: "Essential cookies may be used for authentication, security, and session continuity.",
        },
        {
          title: "Analytics cookies",
          body: "If analytics are added, they should be limited to privacy-conscious product improvement and should avoid storing application content.",
        },
        {
          title: "Payment cookies",
          body: "Stripe may use cookies or similar technologies during checkout once billing is connected.",
        },
        {
          title: "Control",
          body: "Users can manage cookies through browser settings. If optional analytics cookies are introduced, consent controls should be added before launch.",
        },
      ]}
    />
  )
}
