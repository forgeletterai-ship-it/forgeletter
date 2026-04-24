import { LegalPage } from "@/components/LegalPage"

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund policy"
      intro="A billing policy placeholder for the moment Stripe subscriptions go live."
      sections={[
        {
          title: "Before billing is connected",
          body: "No payments are collected in this build, so no refunds are processed yet.",
        },
        {
          title: "Subscriptions",
          body: "Once paid plans are live, define cancellation timing, renewal rules, and refund eligibility clearly.",
        },
        {
          title: "Support",
          body: "Billing questions should route to hello@letterforge.io until a dedicated support workflow exists.",
        },
      ]}
    />
  )
}
