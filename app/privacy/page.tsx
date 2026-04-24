import { LegalPage } from "@/components/LegalPage"

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="A launch-ready privacy page shell. Have a qualified professional review the final wording before taking payments or storing sensitive documents."
      sections={[
        {
          title: "Information we collect",
          body: "LetterForge may collect account details, profile inputs, job descriptions, draft letters, usage events, and billing status when those features are connected.",
          points: [
            "Account data such as name and email address.",
            "Application content the user chooses to save.",
            "Billing identifiers from Stripe, not raw card data.",
          ],
        },
        {
          title: "How we use information",
          body: "Information is used to provide the workspace, save drafts, manage subscriptions, improve reliability, and support users.",
        },
        {
          title: "Data protection",
          body: "Secrets must stay server-side. Supabase row level security should restrict every user-owned row to the authenticated owner.",
        },
        {
          title: "Contact",
          body: "Questions can be sent to hello@letterforge.io until a dedicated privacy inbox is created.",
        },
      ]}
    />
  )
}
