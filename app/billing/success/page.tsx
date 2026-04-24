import { SimplePage } from "@/components/SimplePage"

export default function BillingSuccessPage() {
  return (
    <SimplePage
      kicker="Billing"
      title="Subscription ready"
      intro="Stripe checkout redirects here after a successful subscription or one-time purchase. The webhook confirms the payment event."
      ctaLabel="Go to billing"
      ctaHref="/dashboard/billing"
      cards={[
        {
          title: "Checkout result",
          body: "The customer completed checkout. Subscription purchases update the user's plan in Supabase; one-time purchases can be stored in a purchases table later.",
        },
        {
          title: "Account sync",
          body: "Update the Supabase subscription record through Stripe webhooks, not only from the redirect page.",
        },
      ]}
    />
  )
}
