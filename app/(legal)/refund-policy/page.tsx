import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Refund policy — ForgeLetter",
  description:
    "When ForgeLetter refunds subscriptions, how to request one, EU/UK 14-day withdrawal rights, and what happens to unused credits.",
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund policy"
      intro="This policy explains when ForgeLetter refunds subscriptions and how to request one. It forms part of our Terms of Service and is in addition to — not in place of — your statutory rights as a consumer. Last updated: 2026-05-24."
      sections={[
        {
          title: "1. Scope",
          body: "This policy applies to monthly and annual subscriptions purchased directly from forgeletter.app. Purchases made through an app-store, reseller, or enterprise contract are governed by the refund rules of that provider or the relevant order form.",
        },
        {
          title: "2. EU and UK 14-day right of withdrawal",
          body: "If you are a consumer resident in the European Union or the United Kingdom you normally have 14 days from the date of purchase to withdraw from a distance contract for a digital subscription, without giving a reason. To exercise this right, contact us using the details in section 9 within the 14-day window. We will reimburse the price paid, using the same payment method, within 14 days of receiving your withdrawal notice.",
        },
        {
          title: "3. Waiver for immediately-delivered digital content",
          body: "Subscriptions to ForgeLetter give you immediate access to the AI generation features. When you tick the checkbox at checkout (or otherwise confirm immediate start), you expressly consent to the service starting before the 14-day withdrawal period ends and you acknowledge that you lose the right of withdrawal once the service has been fully performed. ForgeLetter will only consider the service \"fully performed\" if you have used a generation feature; otherwise we will honour the 14-day right.",
        },
        {
          title: "4. Outside the EU and UK",
          body: "Customers outside the EU and UK do not have a statutory 14-day withdrawal right. We may still grant a refund on a discretionary basis where the circumstances warrant it (for example, the service was unavailable for a sustained period, or a duplicate charge was made in error).",
        },
        {
          title: "5. Subscription cancellations",
          body: "You can cancel a subscription at any time from the billing portal. Cancellation stops the next renewal; you retain access until the end of the current billing period. We do not provide pro-rata refunds for the unused portion of a paid period, unless a statutory right requires us to.",
        },
        {
          title: "6. Annual plans",
          body: "Annual plans are paid up-front and are non-refundable beyond the EU/UK 14-day window described above, except where a serious or sustained service failure makes it inequitable to retain the fee. We will not unreasonably refuse refunds in those cases.",
        },
        {
          title: "7. Failed payments and dunning",
          body: "If a renewal payment fails, Stripe will retry the charge for up to seven days. During this period your account may be downgraded to the free tier and saved drafts remain accessible. After seven days of unresolved non-payment the subscription is cancelled automatically.",
        },
        {
          title: "8. Chargebacks",
          body: "Disputing a charge with your card issuer instead of contacting support can lead to account suspension while the dispute is resolved. If the chargeback is upheld in your favour and we later determine the charge was legitimate, we reserve the right to recover the amount through other lawful means and to deny re-subscription.",
        },
        {
          title: "9. Taxes",
          body: "Where VAT, GST, sales tax, or equivalent is shown at checkout, refunds are calculated on the tax-inclusive amount and are reimbursed in the original currency. We are unable to refund tax that has already been remitted to a tax authority if the refund request falls outside the relevant return period.",
        },
        {
          title: "10. How to request a refund",
          body: "Email billing@forgeletter.app (or use the contact form) with your account email, the invoice number from Stripe, and a brief reason. We aim to acknowledge requests within two working days and to process eligible refunds within five further working days. The refund is returned to the original payment method; clearing time depends on your card issuer (typically 3-10 working days).",
        },
        {
          title: "11. Exceptions",
          body: "We may decline a refund where there is reasonable evidence of abuse of the refund process, repeated requests after sustained use, or where issuing the refund would itself violate applicable law (for example sanctions screening).",
        },
        {
          title: "12. Changes",
          body: "We may update this policy from time to time. The latest version is always at this URL with a refreshed \"Last updated\" date. Material changes do not apply retroactively to subscriptions purchased before the change.",
        },
      ]}
    />
  )
}
