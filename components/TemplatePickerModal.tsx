"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type TemplateChoice = "teal_sidebar" | "cream_floral"

interface Props {
  letterId: string
  defaultName?: string
  defaultEmail?: string
  /** Called after successful PDF download */
  onClose: () => void
}

const STORAGE_KEY = "forgeletter_pdf_contact_v1"

interface StoredContact {
  candidateName?: string
  candidateEmail?: string
  candidatePhone?: string
  candidateLocation?: string
  candidateWebsite?: string
  recipientAddress?: string
  preferredTemplate?: TemplateChoice
}

function loadStored(): StoredContact {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as StoredContact
  } catch {
    return {}
  }
}

function saveStored(c: StoredContact) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

export function TemplatePickerModal({
  letterId,
  defaultName,
  defaultEmail,
  onClose,
}: Props) {
  const stored = useMemo(loadStored, [])
  const [template, setTemplate] = useState<TemplateChoice>(
    stored.preferredTemplate ?? "teal_sidebar"
  )
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState(
    stored.candidateName || defaultName || ""
  )
  const [candidateEmail, setCandidateEmail] = useState(
    stored.candidateEmail || defaultEmail || ""
  )
  const [candidatePhone, setCandidatePhone] = useState(stored.candidatePhone || "")
  const [candidateLocation, setCandidateLocation] = useState(stored.candidateLocation || "")
  const [candidateWebsite, setCandidateWebsite] = useState(stored.candidateWebsite || "")
  const [recipientAddress, setRecipientAddress] = useState(stored.recipientAddress || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, submitting])

  // Photo handling: read file as data URL client-side; never uploads anywhere
  // until the user clicks "Download". Cap at 5MB to keep requests reasonable.
  const onPhotoSelected = useCallback((file: File) => {
    setPhotoError(null)
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file (PNG, JPG, or WEBP).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Photo is too large — max 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string)
    }
    reader.onerror = () => setPhotoError("Could not read that file.")
    reader.readAsDataURL(file)
  }, [])

  const onDownload = useCallback(async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/letters/${letterId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          photoDataUrl,
          candidateName: candidateName.trim() || undefined,
          candidateEmail: candidateEmail.trim() || undefined,
          candidatePhone: candidatePhone.trim() || undefined,
          candidateLocation: candidateLocation.trim() || undefined,
          candidateWebsite: candidateWebsite.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `PDF generation failed (${res.status}).`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] || "cover-letter.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      // Persist preferences for next time (NOT the photo).
      saveStored({
        preferredTemplate: template,
        candidateName,
        candidateEmail,
        candidatePhone,
        candidateLocation,
        candidateWebsite,
        recipientAddress,
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.")
    } finally {
      setSubmitting(false)
    }
  }, [
    letterId,
    template,
    photoDataUrl,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateLocation,
    candidateWebsite,
    recipientAddress,
    onClose,
  ])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose PDF template"
      style={overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div style={modalBox}>
        <header style={{ marginBottom: 18 }}>
          <h2 style={titleStyle}>Choose your PDF template</h2>
          <p style={subStyle}>
            Pick a design — the previews below are exact renders of the PDF you'll download. Add a photo if you'd like one.
          </p>
        </header>

        <div style={cardGrid}>
          <TemplateCard
            label="Teal Sidebar"
            description="Bold dark teal sidebar, gold accents, layered waves."
            selected={template === "teal_sidebar"}
            onClick={() => setTemplate("teal_sidebar")}
          >
            <TemplatePreview
              src="/template-previews/teal-sidebar.png"
              alt="Teal Sidebar template — exact render of the PDF"
            />
          </TemplateCard>
          <TemplateCard
            label="Cream Editorial"
            description="Warm cream with organic teal blobs and an elegant serif name."
            selected={template === "cream_floral"}
            onClick={() => setTemplate("cream_floral")}
          >
            <TemplatePreview
              src="/template-previews/cream-editorial.png"
              alt="Cream Editorial template — exact render of the PDF"
            />
          </TemplateCard>
        </div>

        <section style={{ marginTop: 22 }}>
          <h3 style={sectionTitle}>Photo (optional)</h3>
          <p style={sectionSub}>
            Your photo is read in your browser and only used to render the PDF — it never leaves the request that downloads your file.
          </p>
          <div style={photoRow}>
            <button
              type="button"
              style={photoCircleBtn}
              onClick={() => fileRef.current?.click()}
              aria-label="Upload photo"
            >
              {photoDataUrl ? (
                // Use img tag, not next/image — this is a transient blob preview.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoDataUrl}
                  alt="Selected photo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={photoCircleText}>
                  {getInitialsFromName(candidateName) || "FL"}
                </span>
              )}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  {photoDataUrl ? "Change photo" : "Upload photo"}
                </button>
                {photoDataUrl ? (
                  <button
                    type="button"
                    className="button-ghost"
                    onClick={() => setPhotoDataUrl(null)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {photoError ? (
                <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>
                  {photoError}
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                  PNG, JPG, or WEBP — max 5 MB. If you skip, we show your initials.
                </div>
              )}
            </div>
            {/* No `capture` attribute: it forced the selfie camera on
                mobile, blocking users from picking an existing headshot
                from their gallery — the far more common intent. */}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPhotoSelected(file)
                e.target.value = ""
              }}
            />
          </div>
        </section>

        <section style={{ marginTop: 22 }}>
          <h3 style={sectionTitle}>Your contact details</h3>
          <p style={sectionSub}>
            Shown on the template's sidebar. Phone, location, and website are optional — leave blank to hide.
          </p>
          <div style={fieldGrid}>
            <Field label="Full name">
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Maya Chen"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                type="tel"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                placeholder="+1 (555) 555-0123"
              />
            </Field>
            <Field label="Location (optional)">
              <input
                type="text"
                value={candidateLocation}
                onChange={(e) => setCandidateLocation(e.target.value)}
                placeholder="Berlin, DE"
              />
            </Field>
            <Field label="Website (optional)" full>
              <input
                type="text"
                value={candidateWebsite}
                onChange={(e) => setCandidateWebsite(e.target.value)}
                placeholder="linkedin.com/in/yourname"
              />
            </Field>
            <Field label="Recipient address (optional)" full>
              <textarea
                rows={2}
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="123 Business Rd.&#10;Berlin, DE 10115"
              />
            </Field>
          </div>
        </section>

        {error ? (
          <div className="alert" style={{ marginTop: 16 }}>
            {error}
          </div>
        ) : null}

        <footer style={footerStyle}>
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button"
            onClick={onDownload}
            disabled={submitting}
          >
            {submitting ? "Rendering PDF…" : "Download PDF →"}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className="field" style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function TemplateCard({
  label,
  description,
  selected,
  onClick,
  children,
}: {
  label: string
  description: string
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 0,
        border: selected ? "2px solid var(--gold)" : "1px solid var(--line)",
        borderRadius: 12,
        background: selected ? "var(--gold-soft)" : "var(--paper)",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: selected ? "0 12px 28px rgba(199,154,54,0.18)" : "none",
        transition: "transform 0.15s",
      }}
    >
      <div style={{ aspectRatio: "0.707", position: "relative", overflow: "hidden" }}>
        {children}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.45 }}>
          {description}
        </div>
      </div>
    </button>
  )
}

function TemplatePreview({ src, alt }: { src: string; alt: string }) {
  // Real render of the actual PDF template, regenerated with
  // `npm run previews:render` whenever a template changes — so the
  // preview always matches the downloaded PDF exactly.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  )
}

function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---------- styles ----------

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(23,18,15,0.65)",
  backdropFilter: "blur(4px)",
  display: "grid",
  placeItems: "center",
  zIndex: 220,
  padding: 16,
  overflowY: "auto",
}

const modalBox: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  maxHeight: "92vh",
  overflowY: "auto",
  background: "var(--paper-strong)",
  borderRadius: 14,
  padding: 28,
  boxShadow: "var(--shadow)",
  border: "1px solid var(--line)",
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  letterSpacing: "-0.02em",
  color: "var(--ink)",
}

const subStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontSize: 14,
}

const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginTop: 6,
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 800,
  color: "var(--ink)",
  letterSpacing: "-0.01em",
}

const sectionSub: React.CSSProperties = {
  margin: "4px 0 12px",
  color: "var(--muted)",
  fontSize: 12.5,
  lineHeight: 1.5,
}

const photoRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
}

const photoCircleBtn: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: "2px solid var(--gold)",
  background: "#E6DDD0",
  cursor: "pointer",
  padding: 0,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}

const photoCircleText: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 20,
  color: "var(--teal)",
}

const fieldGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--muted-strong)",
  marginBottom: 4,
}

const footerStyle: React.CSSProperties = {
  marginTop: 22,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
}
