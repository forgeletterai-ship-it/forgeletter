"use client"

import { FormEvent, useState } from "react"

export function ContactClient() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [topic, setTopic] = useState("support")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setSuccess("")
    setError("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not send message.")
      }

      setSuccess("Message sent. We will reply by email.")
      setMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="container contact-panel">
      <form className="dashboard-card form-stack" onSubmit={handleSubmit}>
        {success ? <div className="success-alert">{success}</div> : null}
        {error ? <div className="alert">{error}</div> : null}
        <div className="dashboard-form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="topic">Topic</label>
          <select
            id="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          >
            <option value="support">Support</option>
            <option value="billing">Billing</option>
            <option value="partnerships">Partnerships</option>
            <option value="security">Security</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what you need help with."
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send message"}
        </button>
      </form>
      <aside className="dashboard-card">
        <h3>Support expectations</h3>
        <p>
          Use the form for account questions, billing issues, partnerships, or
          security reports. Stripe handles card data directly, and ForgeLetter
          support will never ask for full card numbers or passwords.
        </p>
        <div className="insight-list">
          <div>
            <strong>Billing</strong>
            <span>subscriptions and invoices</span>
          </div>
          <div>
            <strong>Security</strong>
            <span>data or account concerns</span>
          </div>
          <div>
            <strong>Partners</strong>
            <span>career agencies and advisors</span>
          </div>
        </div>
      </aside>
    </section>
  )
}
