"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { Brand } from "@/components/Brand"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand dark />
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Account recovery
          </span>
          <h1>Reset flow prepared for production wiring.</h1>
          <p>
            This screen gives users a polished recovery path. Connect it to
            Supabase or NextAuth email reset logic when you are ready.
          </p>
        </div>
        <p>For now, the page confirms the request without sending email.</p>
      </section>

      <section className="auth-content">
        <div className="auth-card">
          <h2>Forgot password</h2>
          <p>Enter your email and we will prepare the reset flow.</p>

          {submitted ? (
            <div className="alert" style={{ color: "var(--green)", borderColor: "#a8d7c5", background: "#f0fbf6" }}>
              If this were connected, a secure reset link would be sent now.
            </div>
          ) : null}

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" required placeholder="you@example.com" />
            </div>
            <button className="button" type="submit" style={{ width: "100%" }}>
              Prepare reset
            </button>
          </form>

          <p className="muted-link" style={{ marginTop: 18 }}>
            Remembered it? <Link href="/auth/login">Back to login</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
