"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { signIn } from "next-auth/react"
import { Brand } from "@/components/Brand"

type LoginClientProps = {
  googleEnabled: boolean
  facebookEnabled: boolean
  autoProvider?: "google" | "facebook" | null
  initialCallbackUrl?: string
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
}: LoginClientProps) {
  const router = useRouter()
  const callbackUrl = useMemo(
    () => normalizeCallbackUrl(initialCallbackUrl),
    [initialCallbackUrl]
  )

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loadingProvider, setLoadingProvider] = useState<
    "" | "google" | "facebook"
  >("")
  const [loadingCredentials, setLoadingCredentials] = useState(false)
  const [autoStarted, setAutoStarted] = useState(false)

  useEffect(() => {
    if (autoStarted || loadingProvider || loadingCredentials) return
    if (autoProvider === "google" && googleEnabled) {
      setAutoStarted(true)
      void handleSocialLogin("google")
    }
    if (autoProvider === "facebook" && facebookEnabled) {
      setAutoStarted(true)
      void handleSocialLogin("facebook")
    }
  }, [
    autoProvider,
    autoStarted,
    facebookEnabled,
    googleEnabled,
    loadingCredentials,
    loadingProvider,
  ])

  async function handleSocialLogin(provider: "google" | "facebook") {
    try {
      setError("")
      setLoadingProvider(provider)
      await signIn(provider, { callbackUrl })
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingProvider("")
      setAutoStarted(false)
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

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value
  }

  try {
    const url = new URL(value)
    if (url.origin === "https://forgeletter.vercel.app") {
      return `${url.pathname}${url.search}${url.hash}` || "/dashboard"
    }
  } catch {
    return "/dashboard"
  }

  return "/dashboard"
}
