"use client"

import { useState } from "react"
import type { UserProfile } from "@/lib/app-data"

type ProfileClientProps = {
  initialProfile: UserProfile
  setupError?: string
}

export function ProfileClient({ initialProfile, setupError }: ProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  function updateField(field: keyof UserProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  async function saveProfile() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not save profile.")
      }

      setProfile(data.profile)
      setMessage("Profile saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-card">
      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="alert">{error}</div> : null}
      <form className="form-stack">
        <div className="field">
          <label htmlFor="headline">Professional headline</label>
          <input
            id="headline"
            value={profile.professional_headline}
            onChange={(event) =>
              updateField("professional_headline", event.target.value)
            }
            placeholder="Growth marketer with SaaS and lifecycle experience"
          />
        </div>
        <div className="dashboard-form-grid">
          <div className="field">
            <label htmlFor="target-roles">Target roles</label>
            <input
              id="target-roles"
              value={profile.target_roles}
              onChange={(event) => updateField("target_roles", event.target.value)}
              placeholder="Marketing Manager, Growth Lead"
            />
          </div>
          <div className="field">
            <label htmlFor="industries">Industries</label>
            <input
              id="industries"
              value={profile.industries}
              onChange={(event) => updateField("industries", event.target.value)}
              placeholder="SaaS, fintech, ecommerce"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="achievements">Key achievements</label>
          <textarea
            id="achievements"
            value={profile.key_achievements}
            onChange={(event) => updateField("key_achievements", event.target.value)}
            placeholder="Add 3-5 measurable wins. Example: improved onboarding conversion by 18%."
          />
        </div>
        <div className="field">
          <label htmlFor="strengths">Strengths and skills</label>
          <textarea
            id="strengths"
            value={profile.strengths}
            onChange={(event) => updateField("strengths", event.target.value)}
            placeholder="List the skills, tools, industries, and working style you want reflected."
          />
        </div>
        <button className="button-soft" type="button" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving profile..." : "Save profile"}
        </button>
      </form>
    </section>
  )
}
