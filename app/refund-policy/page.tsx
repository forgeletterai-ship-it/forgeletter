import { LegalPage } from "@/components/LegalPage"

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund policy"
      intro="How subscription cancellations and refund requests are handled."
      sections={[
        {
          title: "Subscriptions",
          body: "Subscriptions renew monthly unless cancelled before the next billing period. Users can manage subscriptions through the billing portal.",
        },
        {
          title: "Refund requests",
          body: "Refund requests are reviewed case by case. If a charge was accidental or a technical issue prevented access, contact support with the account email and invoice details.",
        },
        {
          title: "Support",
          body: "Billing questions can be sent through the contact page.",
        },
      ]}
    />
  )
}
