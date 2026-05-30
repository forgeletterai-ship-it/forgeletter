"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AccountStateBanner } from "@/components/AccountStateBanner"
import {
  ExperienceMultiSelect,
  QUALIFICATIONS_ROW_ID,
} from "@/components/ExperienceMultiSelect"
import { TemplatePickerModal } from "@/components/TemplatePickerModal"
import type { ApplicationBrief, UserProfile, UserSettings } from "@/lib/app-data"
import {
  buildResumeTextFromProfile,
  defaultSelectedExperienceIds,
} from "@/lib/experience-resume"
import { getPlanUsageDetails } from "@/lib/plans"

export interface LatestLetter {
  id: string
  finalCoverLetter: string
  finalScore: number
  atsScore: number | null
  atsVerdict: string | null
  atsCoveredKeywords: string[]
  atsMissingKeywords: string[]
  hallucinationRisk: string | null
  rewriteCycles: number
  agentsRun: string[]
  jobTitle: string | null
  companyName: string | null
  tone: string | null
  tier: string
  generationStatus: string
  failureReason: string | null
  createdAt: string
}

type DashboardClientProps = {
  initialBriefs: ApplicationBrief[]
  initialPeriodBriefCount: number
  plan: string
  profile: UserProfile
  settings: UserSettings
  setupError?: string
  initialLatestLetter: LatestLetter | null
  /** True if the Supabase schema has the experience_blocks column.
   *  When false, the multi-select shows the empty state with a hint
   *  that the database migration is pending. */
  experiencePersistenceAvailable?: boolean
  /** Stripe state surfaced via banners at the top of the workspace.
   *  Both null is the happy path. */
  pastDueSince?: string | null
  disputedAt?: string | null
  /** Server-computed fair letter cap for the current period. When
   *  present, the plan meter uses this as the limit; otherwise it
   *  falls back to the static plan limit. */
  fairCap?: number
  scheduledPlanChange?: {
    toPlan: string
    effectiveAt: string
  } | null
  /** When the user arrived via /dashboard?duplicateFrom=ID, the
   *  prior letter's role/company/tone are surfaced here so the
   *  workspace pre-fills. JD is intentionally NOT carried — that's
   *  the whole point of duplicating. */
  duplicateSource?: {
    role?: string
    company?: string
    tone?: string
  } | null
  /** Number of letters marked 'submitted' more than 7 days ago that
   *  still have no outcome. When > 0 we surface a tasteful banner
   *  prompting the user to update outcomes (which feeds the
   *  retrieval base). */
  staleSubmittedCount?: number
}

type ToneName = "Professional" | "Warm" | "Direct"

const tones: Array<{
  name: ToneName
  detail: string
  icon: "diamond" | "sun" | "send"
}> = [
  {
    name: "Professional",
    detail: "Clear, polished, and suitable for most roles.",
    icon: "diamond",
  },
  {
    name: "Warm",
    detail: "Human and relational for culture-led companies.",
    icon: "sun",
  },
  {
    name: "Direct",
    detail: "Sharp, confident, and outcome-focused.",
    icon: "send",
  },
]

// Server-side minimums in app/api/generate/route.ts. Mirrored here
// so the client can show a live counter instead of letting the user
// submit and hit a 400.
const MIN_JD_CHARS = 200
const MIN_RESUME_CHARS = 200

const AGENT_LABELS: Record<string, string> = {
  InputCleaner: "Cleaning inputs",
  ResumeAnalyst: "Analysing your experience",
  JobAnalyst: "Analysing the job",
  MatchAnalyst: "Building match strategy",
  ExampleRetrieval: "Finding gold examples",
  Writer: "Writing your letter",
  ATSAgent: "ATS keyword scoring",
  HMCritic: "Hiring manager critique",
  FinalEditor: "Polishing prose",
  HallucinationDetector: "Verifying every claim",
  QualityGate: "Final quality check",
  RewriteAgent: "Rewriting with feedback",
  Complete: "Done",
}

type AgentStatus = "pending" | "running" | "done" | "failed"

interface AgentRow {
  key: string
  label: string
  status: AgentStatus
  message?: string
}

function Icon({ name }: { name: string }) {
  if (name === "sparkle") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8 14.3 9l6.2 2.3-6.2 2.4L12 20l-2.3-6.3-6.2-2.4L9.7 9 12 2.8Z" />
        <path d="M19 2.8 20 5l2.2 1L20 7l-1 2.2L18 7l-2.2-1L18 5l1-2.2Z" />
      </svg>
    )
  }

  if (name === "crown") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18.5h16v2H4v-2Z" />
        <path d="m4.6 16.5-1.1-9 5.1 4L12 3.8l3.4 7.7 5.1-4-1.1 9H4.6Z" />
      </svg>
    )
  }

  if (name === "diamond") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.7 4.4h10.6l4 5.2L12 20.2 2.7 9.6l4-5.2Z" />
        <path d="M2.9 9.6h18.2M6.9 4.6l3 5 2.1-5 2.1 5 3-5M9.9 9.6 12 20l2.1-10.4" />
      </svg>
    )
  }

  if (name === "sun") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v3M12 18.2v3M4.9 4.9 7 7M17 17l2.1 2.1M2.8 12h3M18.2 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    )
  }

  if (name === "send") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.6 11.5 16.8-8-7.8 16.9-2.4-7-6.6-1.9Z" />
        <path d="m10.2 13.4 5-5" />
      </svg>
    )
  }

  if (name === "edit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 19.5h15" />
        <path d="M6 15.8 16.8 5a2.5 2.5 0 0 1 3.5 3.5L9.5 19.3H6v-3.5Z" />
        <path d="m15.2 6.6 3.2 3.2" />
      </svg>
    )
  }

  if (name === "file") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.8h8.4L19 8.4v11.8H6V3.8Z" />
        <path d="M14.4 3.8v4.6H19M9 12h6M9 15.5h5" />
      </svg>
    )
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-3.6 7-10.2V5.6L12 3 5 5.6v5.2C5 17.4 12 21 12 21Z" />
        <path d="m9.5 11.8 1.8 1.8 3.5-3.8" />
      </svg>
    )
  }

  if (name === "target") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3" />
      </svg>
    )
  }

  if (name === "copy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="11" height="13" rx="1.8" />
        <path d="M5 16V5.8C5 4.8 5.8 4 6.8 4H15" />
      </svg>
    )
  }

  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11" />
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path d="M4.5 19.5h15" />
      </svg>
    )
  }

  if (name === "refresh") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.5 8.5A7.5 7.5 0 0 0 6 6.2L4.2 8.1" />
        <path d="M4 4.2v4.2h4.2" />
        <path d="M4.5 15.5A7.5 7.5 0 0 0 18 17.8l1.8-1.9" />
        <path d="M20 19.8v-4.2h-4.2" />
      </svg>
    )
  }

  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }

  return null
}

function toneForApi(t: ToneName): "professional" | "warm" | "confident" {
  if (t === "Professional") return "professional"
  if (t === "Warm") return "warm"
  return "confident"
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export function DashboardClient({
  initialBriefs,
  initialPeriodBriefCount,
  plan,
  profile,
  settings,
  setupError,
  initialLatestLetter,
  experiencePersistenceAvailable = true,
  pastDueSince = null,
  disputedAt = null,
  fairCap,
  scheduledPlanChange = null,
  duplicateSource = null,
  staleSubmittedCount = 0,
}: DashboardClientProps) {
  const normalizedTone = tones.some((item) => item.name === settings.default_tone)
    ? (settings.default_tone as ToneName)
    : "Professional"
  const [briefs, setBriefs] = useState(initialBriefs)
  const [periodBriefCount, setPeriodBriefCount] = useState(initialPeriodBriefCount)
  // Resolve a sensible starting tone when duplicating: server stores
  // it lowercased ("warm"); UI uses Title-cased ("Warm").
  const seededToneFromDuplicate: ToneName | null = duplicateSource?.tone
    ? duplicateSource.tone === "warm"
      ? "Warm"
      : duplicateSource.tone === "confident" || duplicateSource.tone === "direct"
        ? "Direct"
        : "Professional"
    : null
  // Brief-form state. Priority order:
  //   1. ?duplicateFrom= source (role/company/tone — JD intentionally blank)
  //   2. Most recent saved brief returned by the server
  //   3. localStorage draft (restored in a useEffect below)
  const [role, setRole] = useState(
    duplicateSource?.role || initialBriefs[0]?.role || ""
  )
  const [company, setCompany] = useState(
    duplicateSource?.company || initialBriefs[0]?.company || ""
  )
  const [tone, setTone] = useState<ToneName>(seededToneFromDuplicate ?? normalizedTone)
  const [jobDescription, setJobDescription] = useState(
    duplicateSource ? "" : initialBriefs[0]?.job_description || ""
  )
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle")
  // Default selection: every saved experience block is checked.
  // The Qualifications & achievements row is always-on inside the
  // component and isn't tracked in this state.
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>(() => {
    const fromBrief = initialBriefs[0]?.selected_experience_ids
    if (Array.isArray(fromBrief) && fromBrief.length > 0) {
      const validIds = new Set(profile.experience_blocks.map((b) => b.id))
      const filtered = fromBrief.filter((id) => validIds.has(id))
      if (filtered.length > 0) return filtered
    }
    return defaultSelectedExperienceIds(profile)
  })
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  // Result state — starts from server-side latest letter, updates after each generation.
  const [latestLetter, setLatestLetter] = useState<LatestLetter | null>(initialLatestLetter)
  const [editedLetter, setEditedLetter] = useState(initialLatestLetter?.finalCoverLetter || "")
  const [isEditing, setIsEditing] = useState(false)
  const [saveLetterStatus, setSaveLetterStatus] = useState<"idle" | "saving" | "saved">("idle")

  // Generation flow state
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle")
  const [percent, setPercent] = useState(0)
  const [agentRows, setAgentRows] = useState<AgentRow[]>([])
  const [genErrorMsg, setGenErrorMsg] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // PDF template picker
  const [showPdfPicker, setShowPdfPicker] = useState(false)

  const planUsage = getPlanUsageDetails(plan, periodBriefCount, fairCap)
  const hasActivePlan = plan !== "free"
  const isBasicTier = plan === "free" || plan.startsWith("starter")

  // Compute resume length live so the workspace can show a counter
  // mirroring the server's MIN_RESUME_CHARS gate. Selected experience
  // blocks change frequently; keep this cheap.
  const resumePreviewLength = useMemo(() => {
    return buildResumeTextFromProfile({
      profile,
      selectedExperienceIds,
    }).trim().length
  }, [profile, selectedExperienceIds])

  // Experience grounding gate. Every letter must be grounded in at
  // least one of the candidate's real experiences, so the Generate
  // button is locked until that's satisfied:
  //   • noExperienceAdded   — the profile has zero experience blocks.
  //   • noExperienceSelected — blocks exist but none are ticked.
  // (selectedExperienceIds holds ONLY real block ids — the always-on
  //  "Qualifications & achievements" row is never counted here.)
  //
  // The gate is suspended when experience persistence is unavailable
  // (DB migration pending): in that mode blocks can't be loaded or
  // selected at all, and generation intentionally falls back to the
  // user's qualifications/skills, so we must not lock them out.
  const experienceGateActive = experiencePersistenceAvailable
  const noExperienceAdded =
    experienceGateActive && profile.experience_blocks.length === 0
  const noExperienceSelected =
    experienceGateActive &&
    profile.experience_blocks.length > 0 &&
    selectedExperienceIds.length === 0

  // Fetches the authoritative letter count from the server. Called
  // after a generation completes and when the tab regains focus, so
  // the meter recovers from anything that drifted client-side.
  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/account/usage", { cache: "no-store" })
      if (!res.ok) return
      const payload = (await res.json()) as { usage?: { used?: number } }
      if (payload.usage && typeof payload.usage.used === "number") {
        setPeriodBriefCount(payload.usage.used)
      }
    } catch {
      // best-effort; next page load will reconcile via the server
      // component's getCurrentPeriodLetterCount call.
    }
  }, [])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void refreshUsage()
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
  }, [refreshUsage])

  // Brief-input autosave. Saves to localStorage 800 ms after the last
  // edit, and on first mount restores any draft that was newer than
  // the most recent saved brief. localStorage stays local; we never
  // ship the draft to the server until the user clicks Generate.
  const AUTOSAVE_KEY = "forgeletter:brief-draft:v1"

  // Restore once on mount, only if the localStorage draft is newer
  // than whatever seeded the form from initialBriefs.
  //
  // EXCEPTION: when ?duplicateFrom= is present, the user explicitly
  // asked to seed from a prior letter. Skip the localStorage restore
  // so the duplicate inputs aren't silently overwritten by an old
  // autosaved draft.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (duplicateSource) return
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        role?: string
        company?: string
        tone?: string
        jobDescription?: string
        savedAt?: string
      }
      const seedTimestamp = initialBriefs[0]?.created_at
        ? new Date(initialBriefs[0].created_at).getTime()
        : 0
      const draftTimestamp = draft.savedAt ? new Date(draft.savedAt).getTime() : 0
      if (draftTimestamp > seedTimestamp) {
        if (typeof draft.role === "string") setRole(draft.role)
        if (typeof draft.company === "string") setCompany(draft.company)
        if (
          typeof draft.tone === "string" &&
          tones.some((t) => t.name === draft.tone)
        ) {
          setTone(draft.tone as ToneName)
        }
        if (typeof draft.jobDescription === "string")
          setJobDescription(draft.jobDescription)
      }
    } catch {
      // corrupt draft — fall back to whatever the server seeded
    }
  }, [initialBriefs, duplicateSource])

  // Debounced save: write to localStorage 800 ms after the last edit
  // to any of the four tracked fields.
  useEffect(() => {
    if (typeof window === "undefined") return
    const hasContent =
      role.trim() || company.trim() || jobDescription.trim().length > 10
    if (!hasContent) return
    setAutosaveStatus("saving")
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({
            role,
            company,
            tone,
            jobDescription,
            savedAt: new Date().toISOString(),
          })
        )
        setAutosaveStatus("saved")
      } catch {
        // localStorage full or denied (Safari private mode) — silently ignore
        setAutosaveStatus("idle")
      }
    }, 800)
    return () => window.clearTimeout(handle)
  }, [role, company, tone, jobDescription])

  const clearAutosavedDraft = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(AUTOSAVE_KEY)
    } catch {
      /* ignore */
    }
    setAutosaveStatus("idle")
  }, [])

  const updateAgent = useCallback((key: string, patch: Partial<AgentRow>) => {
    setAgentRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      const label = AGENT_LABELS[key] ?? key
      if (idx === -1) {
        return [...prev, { key, label, status: "pending", ...patch }]
      }
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }, [])

  async function saveBriefAndGenerate() {
    setMessage("")
    setError("")
    setGenErrorMsg(null)

    // Build the resume text from the selected experience blocks +
    // always-on qualifications/skills. Unselected entries are never
    // included — the agent pipeline only sees what the user chose.
    const resumeText = buildResumeTextFromProfile({
      profile,
      selectedExperienceIds,
    }).trim()

    // Experience grounding gate (defense in depth — the button is
    // already disabled in these states, but never start a generation
    // that isn't grounded in at least one real experience).
    if (noExperienceAdded) {
      setError(
        "Add at least one experience on your profile before generating — every letter is grounded in your real experience."
      )
      return
    }
    if (noExperienceSelected) {
      setError("Select at least one experience to include before generating.")
      return
    }

    // Client-side validation matching the API contract.
    if (jobDescription.trim().length < 200) {
      setError(`Job description needs at least 200 characters (you have ${jobDescription.trim().length}).`)
      return
    }
    if (resumeText.length < 200) {
      setError(
        "Your selected experience is too short to write a strong letter. Add more detail to your profile entries, or select more experiences to include."
      )
      return
    }

    // 1. Save brief (for history). Non-fatal if it fails.
    try {
      const briefRes = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          company,
          tone,
          job_description: jobDescription,
          candidate_experience: resumeText,
          selected_experience_ids: selectedExperienceIds,
        }),
      })
      const briefData = await briefRes.json()
      if (briefRes.ok && briefData.brief) {
        setBriefs((current) => [briefData.brief, ...current])
        if (typeof briefData.usage?.used === "number") {
          setPeriodBriefCount(briefData.usage.used)
        }
      }
    } catch {
      // continue — generation is the primary action
    }

    // 2. Generate letter via SSE streaming.
    setPhase("running")
    setPercent(0)
    setAgentRows([])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription: jobDescription.trim(),
          jobTitle: role.trim() || undefined,
          companyName: company.trim() || undefined,
          tone: toneForApi(tone),
          selectedExperienceIds,
        }),
        signal: controller.signal,
      })

      if (!response.body) throw new Error("No response stream from server.")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let sepIdx
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sepIdx)
          buffer = buffer.slice(sepIdx + 2)
          const dataLine = frame.split("\n").find((l) => l.startsWith("data:"))
          if (!dataLine) continue
          const payload = JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>
          handleSSE(payload)
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setGenErrorMsg(err instanceof Error ? err.message : String(err))
      setPhase("error")
    }
  }

  function handleSSE(event: Record<string, unknown>) {
    const type = event.type as string

    if (type === "init") return

    if (type === "progress") {
      const agent = String(event.agent ?? "")
      const status = String(event.status ?? "") as AgentStatus
      setPercent(Number(event.percent ?? 0))
      updateAgent(agent, {
        status,
        message: event.message ? String(event.message) : undefined,
      })
      return
    }

    if (type === "complete") {
      const newLetter: LatestLetter = {
        id: String(event.generationId),
        finalCoverLetter: String(event.finalLetter ?? ""),
        finalScore: Number(event.finalScore ?? 0),
        atsScore: event.atsScore != null ? Number(event.atsScore) : null,
        atsVerdict: (event.atsVerdict as string | null) ?? null,
        atsCoveredKeywords: (event.atsCoveredKeywords as string[]) ?? [],
        atsMissingKeywords: (event.atsMissingKeywords as string[]) ?? [],
        hallucinationRisk: (event.hallucinationRisk as string | null) ?? null,
        rewriteCycles: Number(event.rewriteCycles ?? 0),
        agentsRun: (event.agentsRun as string[]) ?? [],
        jobTitle: role || null,
        companyName: company || null,
        tone,
        tier: plan,
        generationStatus: String(event.status ?? "passed"),
        failureReason: (event.failureReason as string | null) ?? null,
        createdAt: new Date().toISOString(),
      }
      setLatestLetter(newLetter)
      setEditedLetter(newLetter.finalCoverLetter)
      setIsEditing(false)
      setPercent(100)
      setPhase("done")
      setMessage("Letter generated successfully.")
      // Draft completed its lifecycle — clear localStorage so the
      // user starts the next brief from a clean slate.
      clearAutosavedDraft()

      // /api/generate emits the authoritative usage in the complete
      // event. Sync the meter without a full page reload.
      const usagePayload = (event as { usage?: { used?: number } }).usage
      if (usagePayload && typeof usagePayload.used === "number") {
        setPeriodBriefCount(usagePayload.used)
      } else {
        // Fall back to a fresh /api/account/usage fetch if the
        // server payload was missing for any reason.
        void refreshUsage()
      }
      return
    }

    if (type === "error") {
      setGenErrorMsg(String(event.message ?? "Generation failed."))
      setPhase("error")
      return
    }
  }

  function closeModal() {
    if (phase === "running") {
      abortRef.current?.abort()
    }
    setPhase("idle")
    setAgentRows([])
    setPercent(0)
    setGenErrorMsg(null)
  }

  async function copyLetter() {
    setMessage("")
    setError("")
    const textToCopy = editedLetter || latestLetter?.finalCoverLetter || ""
    if (!textToCopy) {
      setError("Generate a letter first.")
      return
    }
    try {
      await navigator.clipboard.writeText(textToCopy)
      setMessage("Cover letter copied to clipboard.")
    } catch {
      setError("Could not copy the letter. Please try again.")
    }
  }

  async function saveLetterEdits() {
    if (!latestLetter) return
    setSaveLetterStatus("saving")
    try {
      const res = await fetch(`/api/letters/${latestLetter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCoverLetter: editedLetter }),
      })
      if (!res.ok) throw new Error(await res.text())
      setLatestLetter({ ...latestLetter, finalCoverLetter: editedLetter })
      setSaveLetterStatus("saved")
      setIsEditing(false)
      setTimeout(() => setSaveLetterStatus("idle"), 1800)
    } catch {
      setSaveLetterStatus("idle")
      setError("Could not save changes.")
    }
  }

  function downloadPdf() {
    if (!latestLetter) {
      setError("Generate a letter first.")
      return
    }
    setShowPdfPicker(true)
  }

  // ---- Render helpers for letter panel ----

  const letterBody = latestLetter?.finalCoverLetter ?? ""
  const paragraphs = letterBody.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  const atsDisplay = latestLetter?.atsScore ?? null
  const keywordsMatchedCount = latestLetter?.atsCoveredKeywords?.length ?? null

  return (
    <div className="cover-workspace" aria-label="Cover letter workspace">
      <AccountStateBanner pastDueSince={pastDueSince} disputedAt={disputedAt} />
      {staleSubmittedCount > 0 ? (
        <div className="outcome-reminder-banner" role="status">
          <span className="outcome-reminder-banner__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div className="outcome-reminder-banner__copy">
            <strong>
              {staleSubmittedCount} letter{staleSubmittedCount === 1 ? "" : "s"}{" "}
              awaiting outcomes
            </strong>
            <p>
              You marked {staleSubmittedCount === 1 ? "it" : "them"} as
              submitted more than a week ago. Heard back yet? Marking the
              outcome trains your gold-standard examples base so future
              letters mirror what works for you.
            </p>
          </div>
          <Link
            className="outcome-reminder-banner__cta"
            href="/dashboard/letters?status=submitted"
          >
            Mark outcomes →
          </Link>
        </div>
      ) : null}
      {hasActivePlan ? (
        <section className="cover-panel cover-plan-panel">
          <div className="cover-plan-icon">
            <Icon name="crown" />
          </div>
          <div className="cover-plan-content">
            <div className="cover-section-row">
              <div>
                <h2>
                  {planUsage.label} plan
                  {planUsage.limit < planUsage.planLimit ? (
                    <span
                      className="plan-prorated-pill"
                      title={`This cycle is prorated because you upgraded mid-period. Your full ${planUsage.planLimit} letters per ${planUsage.periodNoun} starts on your next renewal.`}
                    >
                      <svg
                        viewBox="0 0 12 12"
                        aria-hidden="true"
                        width="10"
                        height="10"
                      >
                        <circle cx="6" cy="6" r="5" />
                        <path d="M6 3v4M6 8.5v.5" />
                      </svg>
                      Prorated this cycle
                    </span>
                  ) : null}
                </h2>
                <p>{planUsage.copy}</p>
              </div>
            </div>
            <div className="cover-plan-meter">
              <span style={{ width: `${planUsage.usedPercent}%` }} />
            </div>
            <div className="cover-plan-meta">
              <strong>{planUsage.remaining} <span>letters left</span></strong>
              <span>
                {planUsage.used} of {planUsage.limit} this {planUsage.periodNoun}
                {planUsage.limit < planUsage.planLimit ? (
                  <em
                    className="cover-plan-meta__prorated"
                    title={`Your full ${planUsage.planLimit}/${planUsage.periodNoun} starts on your next renewal.`}
                  >
                    {" "}
                    (full {planUsage.planLimit} on renewal)
                  </em>
                ) : null}
              </span>
            </div>
          </div>
        </section>
      ) : (
        <Link
          href="/dashboard/billing"
          className="cover-panel cover-plan-panel cover-plan-panel--cta"
          aria-label="Choose a plan to start generating cover letters"
        >
          <div className="cover-plan-icon">
            <Icon name="crown" />
          </div>
          <div className="cover-plan-content">
            <div className="cover-section-row">
              <div>
                <h2>Choose a plan to start writing</h2>
                <p>
                  Your account is ready. Pick Starter, Pro, or Ultra to
                  unlock cover-letter generation with the full agent
                  pipeline — billed monthly or annually, cancel anytime.
                </p>
              </div>
              <span className="cover-plan-cta-arrow" aria-hidden="true">→</span>
            </div>
          </div>
        </Link>
      )}

      <section className="cover-panel cover-status-panel">
        <div className="cover-panel-title">
          <span className="cover-title-icon cover-title-icon--spark">
            <Icon name="sparkle" />
          </span>
          <h2>Workspace status</h2>
        </div>
        <div className="cover-status-grid">
          <div className="cover-status-item">
            <span className="cover-status-icon">
              <Icon name="file" />
            </span>
            <strong>{briefs.length}</strong>
            <span>saved briefs</span>
          </div>
          <div className="cover-status-item cover-status-item--match">
            <span className="cover-progress-ring">
              <Icon name="shield" />
            </span>
            <strong>{atsDisplay != null ? atsDisplay : "—"}</strong>
            <span>{atsDisplay != null ? (latestLetter?.atsVerdict ?? "ATS score") : "ATS score"}</span>
            <small>
              {atsDisplay != null
                ? "from your most recent letter"
                : isBasicTier
                  ? "available on Pro and Ultra"
                  : "generate a letter to see this"}
            </small>
          </div>
          <div className="cover-status-item">
            <span className="cover-status-icon">
              <Icon name="target" />
            </span>
            <strong>{keywordsMatchedCount != null ? keywordsMatchedCount : "—"}</strong>
            <span>keywords matched</span>
            <small>
              {keywordsMatchedCount != null
                ? "from your most recent letter"
                : "matched from target job brief"}
            </small>
          </div>
        </div>
      </section>

      <section className="cover-panel cover-draft-panel">
        <div className="cover-section-row cover-section-row--compact">
          <div className="cover-panel-title">
            <span className="cover-title-icon">
              <Icon name="edit" />
            </span>
            <h2>Draft inputs</h2>
          </div>
          {autosaveStatus !== "idle" ? (
            <span
              className={`autosave-pill autosave-pill--${autosaveStatus}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="autosave-pill__dot" aria-hidden="true" />
              {autosaveStatus === "saving" ? "Saving draft…" : "Draft saved"}
            </span>
          ) : null}
        </div>
        <p className="cover-panel-copy">
          Save your brief and ForgeLetter runs the 12-agent pipeline to write, verify, and score the cover letter.
        </p>

        {message ? <div className="cover-success">{message}</div> : null}
        {error ? <div className="cover-error">{error}</div> : null}

        <div className="cover-form-block">
          <label>Tone preset</label>
          <div className="cover-tone-grid">
            {tones.map((item) => (
              <button
                className={`cover-tone-card${tone === item.name ? " is-active" : ""}`}
                key={item.name}
                type="button"
                onClick={() => setTone(item.name)}
              >
                <span className={`cover-tone-icon cover-tone-icon--${item.icon}`}>
                  <Icon name={item.icon} />
                </span>
                {tone === item.name ? (
                  <span className="cover-tone-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m6 12.4 3.8 3.8L18.5 7.5" />
                    </svg>
                  </span>
                ) : null}
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="cover-field-grid">
          <div className="cover-field">
            <label htmlFor="cover-role">Target role</label>
            <input
              id="cover-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Senior Business Consultant"
            />
          </div>
          <div className="cover-field">
            <label htmlFor="cover-company">Company</label>
            <input
              id="cover-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Apple"
            />
          </div>
        </div>

        <div className="cover-field">
          <label htmlFor="cover-job">Job description &amp; requirements</label>
          <div className="cover-textarea-shell">
            <textarea
              id="cover-job"
              maxLength={5000}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting — responsibilities, required skills, nice-to-haves, company context."
              aria-describedby="cover-job-counter"
            />
            <span
              id="cover-job-counter"
              className={`cover-textarea-counter${
                jobDescription.trim().length < MIN_JD_CHARS
                  ? " cover-textarea-counter--insufficient"
                  : " cover-textarea-counter--ok"
              }`}
              aria-live="polite"
            >
              {jobDescription.trim().length < MIN_JD_CHARS
                ? `${jobDescription.trim().length} / ${MIN_JD_CHARS} minimum — ${MIN_JD_CHARS - jobDescription.trim().length} more characters`
                : `${jobDescription.length}/5000 — looks good`}
            </span>
          </div>
        </div>

        <div className="cover-field">
          <label id="cover-experience-label">Experiences to include</label>
          <ExperienceMultiSelect
            labelId="cover-experience-label"
            blocks={profile.experience_blocks}
            selectedIds={selectedExperienceIds}
            onChange={setSelectedExperienceIds}
            profileExperienceHref="/dashboard/profile"
            persistenceAvailable={experiencePersistenceAvailable}
          />
          {noExperienceAdded ? (
            <span
              className="cover-textarea-counter cover-textarea-counter--insufficient"
              aria-live="polite"
              style={{ marginTop: 8, display: "block" }}
            >
              Add at least one experience on your profile, then select it
              here — every letter is grounded in your real experience.
            </span>
          ) : noExperienceSelected ? (
            <span
              className="cover-textarea-counter cover-textarea-counter--insufficient"
              aria-live="polite"
              style={{ marginTop: 8, display: "block" }}
            >
              Select at least one experience to include before generating.
            </span>
          ) : (
            <span
              className={`cover-textarea-counter${
                resumePreviewLength < MIN_RESUME_CHARS
                  ? " cover-textarea-counter--insufficient"
                  : " cover-textarea-counter--ok"
              }`}
              aria-live="polite"
              style={{ marginTop: 8, display: "block" }}
            >
              {resumePreviewLength < MIN_RESUME_CHARS
                ? `Selected experience: ${resumePreviewLength} / ${MIN_RESUME_CHARS} chars minimum — select more entries or expand your profile.`
                : `Selected experience: ${resumePreviewLength} characters — ready.`}
            </span>
          )}
        </div>

        {(() => {
          const jdShort = jobDescription.trim().length < MIN_JD_CHARS
          const resumeShort = resumePreviewLength < MIN_RESUME_CHARS
          // Free users (no active plan) get a "Choose a plan" CTA in
          // place of the disabled Generate button so they have a
          // single clear next step.
          if (!hasActivePlan) {
            return (
              <Link
                href="/dashboard/billing"
                className="cover-save-button"
                style={{ textDecoration: "none" }}
              >
                <Icon name="crown" />
                Choose a plan to generate letters
              </Link>
            )
          }
          const disabled =
            phase === "running" ||
            noExperienceAdded ||
            noExperienceSelected ||
            jdShort ||
            resumeShort
          return (
            <button
              className="cover-save-button"
              type="button"
              onClick={saveBriefAndGenerate}
              disabled={disabled}
              title={
                noExperienceAdded
                  ? "Add at least one experience on your profile to generate a letter"
                  : noExperienceSelected
                    ? "Select at least one experience to include"
                    : jdShort
                      ? `Job description needs ${MIN_JD_CHARS - jobDescription.trim().length} more characters`
                      : resumeShort
                        ? `Add more selected experience (need ${MIN_RESUME_CHARS - resumePreviewLength} more chars)`
                        : undefined
              }
            >
              <Icon name="sparkle" />
              {phase === "running" ? "Generating…" : "Save brief & generate letter"}
            </button>
          )
        })()}

        <p className="cover-privacy">
          <Icon name="lock" />
          Your data is private and secure. We never share your information.
        </p>
      </section>

      <section className="cover-panel cover-letter-panel">
        <div className="cover-letter-head">
          <div>
            <div className="cover-panel-title">
              <span className="cover-title-icon">
                <Icon name="file" />
              </span>
              <h2>Generated cover letter</h2>
            </div>
            <p className="cover-panel-copy">
              {latestLetter
                ? `Score ${latestLetter.finalScore}/100 — ${latestLetter.generationStatus === "passed" ? "passed quality gate" : "best draft delivered"}. Edit freely and save your changes.`
                : "Fill in your brief below and click generate. The 12-agent pipeline takes 30–90 seconds."}
            </p>
          </div>
          {latestLetter ? (
            <div className="cover-letter-actions">
              <button
                className="cover-small-button"
                type="button"
                onClick={() => setIsEditing((v) => !v)}
              >
                <Icon name="edit" />
                {isEditing ? "Done editing" : "Edit"}
              </button>
            </div>
          ) : null}
        </div>

        {latestLetter ? (
          isEditing ? (
            <div>
              <textarea
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
                rows={18}
                style={{
                  width: "100%",
                  padding: 16,
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  lineHeight: 1.6,
                  resize: "vertical",
                }}
              />
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  className="cover-output-button"
                  type="button"
                  onClick={saveLetterEdits}
                  disabled={saveLetterStatus === "saving"}
                >
                  {saveLetterStatus === "saving"
                    ? "Saving…"
                    : saveLetterStatus === "saved"
                      ? "Saved"
                      : "Save changes"}
                </button>
                <button
                  className="cover-small-button"
                  type="button"
                  onClick={() => {
                    setEditedLetter(latestLetter.finalCoverLetter)
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <article className="cover-letter-paper">
              <p>{formatDate(latestLetter.createdAt)}</p>
              <p>
                Hiring Manager<br />
                {latestLetter.companyName || company || "—"}
              </p>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </article>
          )
        ) : (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              border: "2px dashed var(--line)",
              borderRadius: 12,
              background: "var(--paper)",
              color: "var(--muted)",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "var(--ink)" }}>
              No letter generated yet
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Fill in the brief on the left and hit "Save brief &amp; generate letter" — your real AI-written cover letter will appear here.
            </p>
          </div>
        )}

        {latestLetter ? (
          <div className="cover-output-actions">
            <button className="cover-output-button" type="button" onClick={copyLetter}>
              <Icon name="copy" />
              Copy to clipboard
            </button>
            <button
              className="cover-output-button cover-output-button--download"
              type="button"
              onClick={downloadPdf}
            >
              <Icon name="download" />
              Download PDF
            </button>
          </div>
        ) : null}
      </section>

      {phase !== "idle" ? (
        <GenerationModal
          phase={phase}
          percent={percent}
          agentRows={agentRows}
          errorMsg={genErrorMsg}
          onClose={closeModal}
          onViewLetter={() => setPhase("idle")}
          score={latestLetter?.finalScore}
          atsScore={latestLetter?.atsScore ?? null}
        />
      ) : null}

      {showPdfPicker && latestLetter ? (
        <TemplatePickerModal
          letterId={latestLetter.id}
          defaultName={profile.professional_headline ? undefined : undefined}
          onClose={() => setShowPdfPicker(false)}
        />
      ) : null}
    </div>
  )
}

// ---------- generation modal ----------

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return
    }
    const start = Date.now()
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [active])
  return seconds
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`
}

function GenerationModal({
  phase,
  percent,
  agentRows,
  errorMsg,
  onClose,
  onViewLetter,
  score,
  atsScore,
}: {
  phase: "running" | "done" | "error"
  percent: number
  agentRows: AgentRow[]
  errorMsg: string | null
  onClose: () => void
  onViewLetter: () => void
  score: number | undefined
  atsScore: number | null
}) {
  const elapsed = useElapsedSeconds(phase === "running")
  const completedCount = agentRows.filter((r) => r.status === "done").length
  const totalCount = agentRows.length || 12
  const runningAgent = agentRows.find((r) => r.status === "running")

  return (
    <div role="dialog" aria-modal="true" className="generation-modal-root">
      <div className="generation-modal-backdrop" aria-hidden="true" />
      <div className="generation-modal">
        {phase === "running" && (
          <>
            <div className="generation-modal__crest" aria-hidden="true">
              <span className="generation-modal__crest-ring" />
              <span className="generation-modal__crest-ring generation-modal__crest-ring--two" />
              <span className="generation-modal__crest-core">
                <Icon name="sparkle" />
              </span>
            </div>
            <h2 className="generation-modal__title">Crafting your letter</h2>
            <p className="generation-modal__subtitle">
              {runningAgent ? runningAgent.label + "…" : "Spinning up the agent pipeline…"}
            </p>

            <div
              className="generation-modal__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.max(2, percent)}
            >
              <span
                className="generation-modal__progress-fill"
                style={{ width: `${Math.max(2, percent)}%` }}
              />
              <span className="generation-modal__progress-shine" aria-hidden="true" />
            </div>

            <div className="generation-modal__meta">
              <span>
                <strong>{completedCount}</strong> / {totalCount} agents
              </span>
              <span>{Math.max(0, Math.min(100, percent))}%</span>
              <span>{formatElapsed(elapsed)} elapsed</span>
            </div>

            <ul className="generation-modal__agents">
              {agentRows.map((row) => (
                <li
                  key={row.key}
                  className={`generation-modal__agent generation-modal__agent--${row.status}`}
                >
                  <span className="generation-modal__agent-indicator" aria-hidden="true">
                    {row.status === "done" ? (
                      <svg viewBox="0 0 24 24">
                        <path d="m6 12.4 3.8 3.8L18.5 7.5" />
                      </svg>
                    ) : row.status === "failed" ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    ) : row.status === "running" ? (
                      <span className="generation-modal__agent-spinner" />
                    ) : (
                      <span className="generation-modal__agent-dot" />
                    )}
                  </span>
                  <span className="generation-modal__agent-label">{row.label}</span>
                  {row.status === "running" ? (
                    <span className="generation-modal__agent-tag">running</span>
                  ) : null}
                </li>
              ))}
            </ul>

            <p className="generation-modal__hint">
              Sit tight — the 12-agent pipeline writes, fact-checks, and quality-gates
              your letter. Typical run: 30–90 seconds.
            </p>
          </>
        )}

        {phase === "done" && (
          <>
            <div
              className="generation-modal__crest generation-modal__crest--done"
              aria-hidden="true"
            >
              <span className="generation-modal__crest-core">
                <svg viewBox="0 0 24 24">
                  <path d="m6 12.4 3.8 3.8L18.5 7.5" />
                </svg>
              </span>
            </div>
            <h2 className="generation-modal__title">Your letter is ready</h2>
            <p className="generation-modal__subtitle">
              Quality{" "}
              <strong>{score ?? "—"}/100</strong>
              {atsScore != null ? (
                <>
                  {" "}
                  · ATS <strong>{atsScore}/100</strong>
                </>
              ) : null}
            </p>
            <button
              type="button"
              className="cover-save-button generation-modal__cta"
              onClick={onViewLetter}
            >
              <Icon name="sparkle" />
              View letter
            </button>
          </>
        )}

        {phase === "error" && (
          <>
            <div
              className="generation-modal__crest generation-modal__crest--error"
              aria-hidden="true"
            >
              <span className="generation-modal__crest-core">!</span>
            </div>
            <h2 className="generation-modal__title generation-modal__title--error">
              Generation failed
            </h2>
            <p className="generation-modal__subtitle">
              {errorMsg ?? "Something went wrong. Your quota was not used."}
            </p>
            <button
              type="button"
              className="cover-save-button generation-modal__cta"
              onClick={onClose}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
