"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { signIn } from "next-auth/react"

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

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="white"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.438H7.078v-3.489h3.047V9.41c0-3.017 1.792-4.683 4.533-4.683 1.312 0 2.686.236 2.686.236v2.963H15.83c-1.49 0-1.955.931-1.955 1.887v2.26h3.328l-.532 3.489h-2.796V24C19.612 23.094 24 18.099 24 12.073z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loadingProvider, setLoadingProvider] = useState<"" | "google" | "facebook">("")
  const [loadingCredentials, setLoadingCredentials] = useState(false)

  async function handleSocialLogin(provider: "google" | "facebook") {
    try {
      setError("")
      setLoadingProvider(provider)
      await signIn(provider, { callbackUrl })
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingProvider("")
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
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f4f2f7 0%, #f7f3ef 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: 6 }}>
            <span
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "#111633",
              }}
            >
              Letter<span style={{ color: "#f0a500" }}>Forge</span>
            </span>
          </Link>

          <p
            style={{
              margin: 0,
              color: "#65748b",
              fontSize: "clamp(15px, 2vw, 18px)",
              lineHeight: 1.35,
            }}
          >
            Welcome back — sign in
          </p>
        </div>

        <div
          style={{
            width: "100%",
            background: "#ffffffcc",
            backdropFilter: "blur(8px)",
            border: "1px solid #e5e7ef",
            borderRadius: 22,
            boxShadow: "0 14px 38px rgba(17, 22, 51, 0.07)",
            padding: "28px 24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              margin: "0 auto",
              display: "grid",
              gap: 14,
            }}
          >
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              disabled={loadingProvider !== "" || loadingCredentials}
              style={{
                width: "100%",
                minHeight: 54,
                borderRadius: 14,
                border: "1px solid #d9d9e8",
                background: "#ffffff",
                color: "#111633",
                fontSize: 15,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 12,
                padding: "0 18px",
                cursor: "pointer",
              }}
            >
              <GoogleIcon />
              <span>{loadingProvider === "google" ? "Connecting..." : "Continue with Google"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("facebook")}
              disabled={loadingProvider !== "" || loadingCredentials}
              style={{
                width: "100%",
                minHeight: 54,
                borderRadius: 14,
                border: "none",
                background: "#1877F2",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 12,
                padding: "0 18px",
                cursor: "pointer",
              }}
            >
              <FacebookIcon />
              <span>{loadingProvider === "facebook" ? "Connecting..." : "Continue with Facebook"}</span>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                margin: "4px 0 2px",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#d9d9e8" }} />
              <span
                style={{
                  color: "#65748b",
                  fontSize: 14,
                  whiteSpace: "nowrap",
                }}
              >
                or with email
              </span>
              <div style={{ flex: 1, height: 1, background: "#d9d9e8" }} />
            </div>

            {error ? (
              <div
                style={{
                  background: "#fff2f2",
                  color: "#b42318",
                  border: "1px solid #f3b0b0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            ) : null}

            <form
              onSubmit={handleCredentialsLogin}
              style={{
                display: "grid",
                gap: 14,
                marginTop: 2,
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <label
                  htmlFor="email"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#111633",
                  }}
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: "100%",
                    minHeight: 54,
                    borderRadius: 14,
                    border: "1px solid #d9d9e8",
                    background: "#fff",
                    padding: "0 16px",
                    fontSize: 15,
                    color: "#111633",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#111633",
                  }}
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    minHeight: 54,
                    borderRadius: 14,
                    border: "1px solid #d9d9e8",
                    background: "#fff",
                    padding: "0 16px",
                    fontSize: 15,
                    color: "#111633",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loadingCredentials || loadingProvider !== ""}
                style={{
                  width: "100%",
                  minHeight: 56,
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(135deg, #f0b02d 0%, #ff9900 100%)",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 10px 24px rgba(240, 165, 0, 0.2)",
                  marginTop: 2,
                }}
              >
                {loadingCredentials ? "Signing In..." : "Sign In →"}
              </button>
            </form>
          </div>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: "#65748b",
            textAlign: "center",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            style={{
              color: "#f0a500",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  )
}