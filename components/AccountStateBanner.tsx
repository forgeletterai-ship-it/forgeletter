import Link from "next/link"

type AccountState = {
  pastDueSince?: string | null
  disputedAt?: string | null
}

/**
 * Top-of-dashboard banner that surfaces account states we currently
 * track silently (failed renewal, open chargeback). Renders nothing
 * when both columns are null, so it's safe to drop into any layout.
 *
 * Disputed beats past-due — chargebacks are the harder problem and
 * we should not nudge the user to update their card while we're
 * still investigating the dispute.
 */
export function AccountStateBanner({ pastDueSince, disputedAt }: AccountState) {
  if (disputedAt) {
    return (
      <div className="account-banner account-banner--danger" role="alert">
        <div className="account-banner__icon" aria-hidden="true">
          ⚠
        </div>
        <div className="account-banner__copy">
          <strong>Charge dispute under review</strong>
          <p>
            We&apos;ve received a chargeback notice from your card issuer for a
            recent ForgeLetter payment. Your account remains accessible while
            we investigate. If this was a mistake, please contact us at{" "}
            <a href="mailto:billing@forgeletter.app">billing@forgeletter.app</a>{" "}
            so we can resolve it together — disputed charges that go through
            can result in account suspension.
          </p>
        </div>
      </div>
    )
  }

  if (pastDueSince) {
    return (
      <div className="account-banner account-banner--warning" role="alert">
        <div className="account-banner__icon" aria-hidden="true">
          !
        </div>
        <div className="account-banner__copy">
          <strong>Your latest renewal payment was declined</strong>
          <p>
            We tried to charge your card on file and Stripe returned a decline.
            Paid features are paused until the payment goes through — update
            your card and Stripe will retry automatically, restoring access
            right away.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="account-banner__cta"
          aria-label="Update payment method in billing settings"
        >
          Update card →
        </Link>
      </div>
    )
  }

  return null
}
