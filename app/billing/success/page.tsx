import { SimplePage } from "@/components/SimplePage"

export default function BillingSuccessPage() {
  return (
    <SimplePage
      kicker="Billing"
      title="Subscription ready"
      intro="This success page is ready for Stripe checkout redirects once payments are connected."
      ctaLabel="Go to billing"
      ctaHref="/dashboard/billing"
      cards={[
        {
          title: "Checkout result",
          body: "Show the selected plan, invoice status, and next billing date after webhook confirmation.",
        },
        {
          title: "Account sync",
          body: "Update the Supabase subscription record through Stripe webhooks, not only from the redirect page.",
        },
      ]}
    />
  )
}
