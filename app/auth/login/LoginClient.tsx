"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"
import { signIn } from "next-auth/react"
import { Brand } from "@/components/Brand"

type LoginClientProps = {
  googleEnabled: boolean
  facebookEnabled: boolean
  autoProvider?: "google" | "facebook" | null
  initialCallbackUrl?: string
  /** Human-readable message derived from Auth.js's ?error= code. */
  initialError?: string
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.244 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.436 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.145 0 9.823-1.977 13.356-5.197l-6.169-5.221C29.143 35.091 26.715 36 24 36c-5.223 0-9.617-3.317-11.283-7.946l-6.522 5.025C9.41 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.793 2.799-2.552 5.27-4.946 6.981l.003-.002 6.169 5.221C36.092 39.857 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export default function LoginClient({
  googleEnabled,
  facebookEnabled,
  autoProvider = null,
  initialCallbackUrl,
  initialError = "",
}: LoginClientProps) {
  const router = useRouter()
  const callbackUrl = useMemo(
    () => normalizeCallbackUrl(initialCallbackUrl),
    [initialCallbackUrl]
  )

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(initialError)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<
    "" | "google" | "facebook"
  >("")
  const [loadingCredentials, setLoadingCredentials] = useState(false)

  // NOTE: autoProvider deliberately no longer auto-fires the OAuth
  // flow. A first-time "Continue with Google" CREATES an account, and
  // account creation without explicit terms acceptance is a legal
  // gap — the customer must tick the checkbox and click the button
  // themselves.
  void autoProvider

  function requireTerms(): boolean {
    if (termsAccepted) return true
    setError(
      "Please accept the Terms of Service and Privacy Policy to continue."
    )
    return false
  }

  async function handleSocialLogin(provider: "google" | "facebook") {
    if (!requireTerms()) return
    try {
      setError("")
      setLoadingProvider(provider)
      await signIn(provider, { callbackUrl })
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingProvider("")
      router.replace("/auth/login")
    }
  }

  async function handleCredentialsLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoadingCredentials(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError("Invalid email or password.")
        setLoadingCredentials(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingCredentials(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand dark />
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Secure workspace
          </span>
          <h1>Welcome back.</h1>
          <p>
            Your letters, your profile, and your application history - all in
            one place.
          </p>
        </div>
        <p>Your letters. Your profile. Your applications. All in one place.</p>
      </section>

      <section className="auth-content">
        <div className="auth-card">
          <h2>Sign in</h2>
          <p>Continue to your dashboard.</p>

          <div className="form-stack">
            {/* Clickwrap on login too: a first-time "Continue with
                Google" creates an account, so acceptance must be
                recorded here as well — not only on the signup page. */}
            {googleEnabled || facebookEnabled ? (
              <label
                htmlFor="login-accept-terms"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 13,
                  lineHeight: 1.5,
                  cursor: "pointer",
                }}
              >
                <input
                  id="login-accept-terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked)
                    if (e.target.checked) setError("")
                  }}
                  style={{ marginTop: 3 }}
                />
                <span>
                  I agree to the <Link href="/terms">Terms of Service</Link>{" "}
                  and the <Link href="/privacy">Privacy Policy</Link>.
                </span>
              </label>
            ) : null}

            {googleEnabled ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={loadingProvider !== "" || loadingCredentials}
                style={{ width: "100%" }}
              >
                <GoogleIcon />
                {loadingProvider === "google"
                  ? "Connecting..."
                  : "Continue with Google"}
              </button>
            ) : null}

            {facebookEnabled ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => handleSocialLogin("facebook")}
                disabled={loadingProvider !== "" || loadingCredentials}
                style={{ width: "100%" }}
              >
                {loadingProvider === "facebook"
                  ? "Connecting..."
                  : "Continue with Facebook"}
              </button>
            ) : null}
          </div>

          {googleEnabled || facebookEnabled ? (
            <div className="auth-divider">or use email</div>
          ) : null}

          {error ? <div className="alert">{error}</div> : null}

          <form className="form-stack" onSubmit={handleCredentialsLogin}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <Link
              href="/auth/forgot-password"
              style={{
                color: "var(--muted)",
                fontSize: 13,
                fontWeight: 800,
                textAlign: "right",
              }}
            >
              Forgot password?
            </Link>

            <button
              className="button"
              type="submit"
              disabled={loadingCredentials || loadingProvider !== ""}
              style={{ width: "100%" }}
            >
              {loadingCredentials ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="muted-link" style={{ marginTop: 18 }}>
            New to ForgeLetter? <Link href="/auth/signup">Create account</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

function normalizeCallbackUrl(value?: string) {
  if (!value) return "/dashboard"

  // Same-site relative path only. Reject "//" (protocol-relative) AND
  // any backslash — browsers normalize "/\evil.com" to "//evil.com",
  // which would turn this into an open redirect for phishing.
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return value
  }

  try {
    const url = new URL(value)
    // Accept absolute callback URLs only for our own origins — the
    // canonical domain plus the Vercel alias during the transition.
    const OWN_ORIGINS = [
      "https://forgeletter.com",
      "https://www.forgeletter.com",
      "https://forgeletter.vercel.app",
    ]
    if (OWN_ORIGINS.includes(url.origin)) {
      return `${url.pathname}${url.search}${url.hash}` || "/dashboard"
    }
  } catch {
    return "/dashboard"
  }

  return "/dashboard"
}
