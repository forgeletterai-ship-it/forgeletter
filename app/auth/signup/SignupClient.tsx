"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { FormEvent } from "react"
import { Brand } from "@/components/Brand"

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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>

            <button
              className="button"
              type="submit"
              disabled={loading}
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
