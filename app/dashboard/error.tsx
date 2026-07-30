"use client"

import Link from "next/link"
import { useEffect } from "react"

/**
 * Error boundary for the authenticated dashboard segment.
 *
 * A logged-out visitor never reaches here — the layout redirects them
 * to /auth/login first, and requireAppUser() redirects again as a
 * backstop. This boundary catches the genuinely exceptional case: a
 * valid session whose account data couldn't be loaded (a Supabase
 * fault, or a rare rowless session). It shows an honest, recoverable
 * message instead of rendering stub data behind a scary banner.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard] render error", error)
  }, [error])

  return (
    <div className="dashboard-error" role="alert">
      <div className="dashboard-error__card">
        <h1 className="dashboard-error__title">
          We couldn&apos;t load your account
        </h1>
        <p className="dashboard-error__copy">
          Your session is valid, but we hit a problem loading your data. This is
          usually temporary — try again in a moment. If it keeps happening, sign
          out and back in.
        </p>
        <div className="dashboard-error__actions">
          <button
            type="button"
            className="dashboard-error__btn dashboard-error__btn--primary"
            onClick={reset}
          >
            Try again
          </button>
          <Link className="dashboard-error__btn" href="/auth/login">
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
