import { SimplePage } from "@/components/SimplePage"

export default function BillingCancelPage() {
  return (
    <SimplePage
      kicker="Billing"
      title="Checkout cancelled"
      intro="The customer left Stripe Checkout before completing the subscription."
      ctaLabel="Back to billing"
      ctaHref="/dashboard/billing"
      cards={[
        {
          title: "No charge made",
          body: "Stripe cancelled checkout sessions do not create an active paid subscription.",
        },
        {
          title: "Next integration",
          body: "Add checkout sessions, customer portal links, and webhook handling before enabling paid plans.",
        },
      ]}
    />
  )
}
