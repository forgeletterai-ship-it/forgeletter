"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { FormEvent } from "react"
import { Brand } from "@/components/Brand"

type SignupClientProps = {
  googleEnabled?: boolean
  facebookEnabled?: boolean
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

export default function SignupClient({
  googleEnabled = false,
  facebookEnabled = false,
}: SignupClientProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<"" | "google" | "facebook">("")
  const [error, setError] = useState("")
  const router = useRouter()

  function requireTerms(): boolean {
    if (termsAccepted) return true
    setError("Please accept the Terms of Service and Privacy Policy to create an account.")
    return false
  }

  async function handleSocialSignup(provider: "google" | "facebook") {
    if (!requireTerms()) return
    try {
      setError("")
      setLoadingProvider(provider)
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingProvider("")
    }
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!requireTerms()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLoading(false)
        setError(data.error || "Failed to create account.")
        return
      }

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      setLoading(false)

      if (loginRes?.error) {
        // Account was created but auto-login failed — say so instead
        // of silently bouncing to a login form.
        router.push("/auth/login?error=CredentialsSignin")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setLoading(false)
      setError("Something went wrong. Please try again.")
    }
  }

  const busy = loading || loadingProvider !== ""

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand dark />
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Free workspace
          </span>
          <h1>Start writing cover letters that actually get responses.</h1>
          <p>
            Create your free account. No credit card required.
          </p>
        </div>
        <p>Write stronger applications with a focused, premium workflow.</p>
      </section>

      <section className="auth-content">
        <div className="auth-card">
          <h2>Create account</h2>
          <p>Your account is ready in 30 seconds.</p>

          {/* OAuth parity with the login page — OAuth-first users
              previously hit signup and found only the email form. */}
          <div className="form-stack">
            {googleEnabled ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => handleSocialSignup("google")}
                disabled={busy}
                style={{ width: "100%" }}
              >
                <GoogleIcon />
                {loadingProvider === "google" ? "Connecting..." : "Sign up with Google"}
              </button>
            ) : null}

            {facebookEnabled ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => handleSocialSignup("facebook")}
                disabled={busy}
                style={{ width: "100%" }}
              >
                {loadingProvider === "facebook" ? "Connecting..." : "Sign up with Facebook"}
              </button>
            ) : null}
          </div>

          {googleEnabled || facebookEnabled ? (
            <div className="auth-divider">or use email</div>
          ) : null}

          {error ? <div className="alert">{error}</div> : null}

          <form className="form-stack" onSubmit={handleSignup}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
                placeholder="At least 8 characters"
              />
            </div>

            {/* Clickwrap: browsewrap ("by creating an account you
                agree…") is weakly enforceable — an explicit checkbox
                creates a real record of acceptance. Gates BOTH the
                email form and the OAuth buttons. */}
            <label
              htmlFor="accept-terms"
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
                id="accept-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked)
                  if (e.target.checked) setError("")
                }}
                style={{ marginTop: 3 }}
              />
              <span>
                I agree to the <Link href="/terms">Terms of Service</Link> and
                the <Link href="/privacy">Privacy Policy</Link>.
              </span>
            </label>

            <button
              className="button"
              type="submit"
              disabled={busy}
              style={{ width: "100%" }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="muted-link" style={{ marginTop: 18 }}>
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
