"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { FormEvent } from "react"

export default function SignupClient() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
        router.push("/auth/login")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setLoading(false)
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#fefefe,#f8f5ff,#fff8ec)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontWeight: 800,
              fontSize: 24,
              color: "#1a1a2e",
              textDecoration: "none",
            }}
          >
            Letter<span style={{ color: "#f0a500" }}>Forge</span>
          </Link>
          <p style={{ marginTop: 8, fontSize: 15, color: "#6b7280" }}>
            Create your account
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 36,
            boxShadow: "0 8px 48px rgba(26,26,46,.1)",
            border: "1px solid #e8e6f0",
          }}
        >
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#dc2626",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: 13 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1a1a2e",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e8e6f0",
                  outline: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "#1a1a2e",
                  background: "#fafaf9",
                }}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1a1a2e",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e8e6f0",
                  outline: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "#1a1a2e",
                  background: "#fafaf9",
                }}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1a1a2e",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e8e6f0",
                  outline: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "#1a1a2e",
                  background: "#fafaf9",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(135deg,#f0a500,#ff8c00)",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 18px rgba(240,165,0,.35)",
                marginTop: 6,
              }}
            >
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#f0a500", fontWeight: 700 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}