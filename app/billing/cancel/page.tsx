import { SimplePage } from "@/components/SimplePage"

export default function BillingCancelPage() {
  return (
    <SimplePage
      kicker="Billing"
      title="Checkout not connected yet"
      intro="This route stands in for Stripe cancel and preview states while billing is being prepared."
      ctaLabel="Back to billing"
      ctaHref="/dashboard/billing"
      cards={[
        {
          title: "No charge made",
          body: "Paid checkout is not active in this build. Pricing buttons safely route to placeholder pages or signup.",
        },
        {
          title: "Next integration",
          body: "Add checkout sessions, customer portal links, and webhook handling before enabling paid plans.",
        },
      ]}
    />
  )
}
