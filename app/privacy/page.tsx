import { LegalPage } from "@/components/LegalPage"

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="How ForgeLetter handles account, application, and billing-related data."
      sections={[
        {
          title: "Information we collect",
          body: "ForgeLetter collects the information needed to run the workspace and billing experience.",
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
          body: "Application content is stored securely and payment details are handled by our payment provider. Raw card details are not stored by ForgeLetter.",
        },
        {
          title: "Data rights",
          body: "Users can export workspace data from account settings and request deletion of saved application content.",
        },
        {
          title: "Contact",
          body: "Privacy questions can be sent through the contact page.",
        },
      ]}
    />
  )
}
