import { LegalPage } from "@/components/LegalPage"

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="How ForgeLetter uses cookies and similar technologies for login, security, and checkout."
      sections={[
        {
          title: "Essential cookies",
          body: "Essential cookies may be used for authentication, security, and session continuity.",
        },
        {
          title: "Analytics cookies",
          body: "Analytics cookies are used only for privacy-conscious product improvement and do not store application content.",
        },
        {
          title: "Payment cookies",
          body: "Stripe may use cookies or similar technologies during secure checkout.",
        },
        {
          title: "Control",
          body: "Users can manage cookies through browser settings and privacy controls where available.",
        },
      ]}
    />
  )
}
