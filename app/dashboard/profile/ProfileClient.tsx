"use client"

import { useCallback, useMemo, useState } from "react"
import type { UserProfile } from "@/lib/app-data"

type BlockType = "employer" | "internship" | "university"

type Achievement = {
  id: string
  col0: string
  col1: string
  col2: string
}

type ProfileBlock = {
  id: string
  type: BlockType
  company: string
  title: string
  employmentType: string
  sector: string
  size: string
  role: string
  duration: string
  name: string
  degree: string
  achievements: Achievement[]
}

type ProfileDraft = {
  headline: string
  seniority: string
  skills: string
  qualifications: string
  notes: string
  blocks: ProfileBlock[]
}

type ProfileClientProps = {
  initialProfile: UserProfile
  setupError?: string
  /** False when the experience_blocks/qualifications/notes columns
   *  aren't in the database yet. Shows a non-blocking banner so the
   *  user knows their structured entries aren't being persisted until
   *  the migration runs. */
  experiencePersistenceAvailable?: boolean
}

const SENIORITY_LEVELS = [
  { id: "entry", label: "Entry", years: "0-2 yrs" },
  { id: "mid", label: "Mid", years: "3-7 yrs" },
  { id: "senior", label: "Senior", years: "8-12 yrs" },
  { id: "leadership", label: "Leadership", years: "13-18 yrs" },
  { id: "csuite", label: "C-suite", years: "18+ yrs" },
]

const SECTOR_GROUPS = [
  {
    group: "Technology",
    options: [
      "Software & SaaS",
      "Fintech",
      "AI & Machine Learning",
      "Cybersecurity",
      "Data & Analytics",
      "Hardware",
      "Telecommunications",
    ],
  },
  {
    group: "Finance",
    options: [
      "Banking & Capital Markets",
      "Private Equity & VC",
      "Asset Management",
      "Insurance",
      "Accounting & Audit",
    ],
  },
  {
    group: "Professional Services",
    options: [
      "Management Consulting",
      "Legal Services",
      "HR & Recruitment",
      "Marketing & Advertising",
      "Architecture & Design",
    ],
  },
  {
    group: "Healthcare",
    options: [
      "Healthcare & Hospitals",
      "Pharmaceuticals",
      "Biotech & Medical Devices",
      "Mental Health",
    ],
  },
  {
    group: "Industry",
    options: [
      "Manufacturing & Industrials",
      "Engineering & Infrastructure",
      "Energy & Utilities",
      "Aerospace & Defence",
      "Automotive",
      "Agriculture",
    ],
  },
  {
    group: "Consumer",
    options: [
      "Retail & Ecommerce",
      "Food & Beverage",
      "Hospitality & Tourism",
      "Fashion & Luxury",
      "Consumer Goods & FMCG",
    ],
  },
  {
    group: "Media & Education",
    options: [
      "Media & Entertainment",
      "Publishing & Journalism",
      "Education & EdTech",
      "Sport & Fitness",
    ],
  },
  {
    group: "Public & Non-profit",
    options: [
      "Government & Public Sector",
      "Non-profit & Charity",
      "Research & Academia",
      "International Development",
    ],
  },
  {
    group: "Real Assets",
    options: ["Real Estate & Property", "Construction", "Transport & Logistics"],
  },
]

const SIZE_OPTIONS = [
  { value: "", label: "Not sure" },
  { value: "1-50", label: "1-50 people" },
  { value: "51-200", label: "51-200 people" },
  { value: "201-1000", label: "201-1,000 people" },
  { value: "1000-10000", label: "1,000-10,000 people" },
  { value: "10000+", label: "10,000+ people" },
]

const EMPLOYMENT_TYPES = ["Full time", "Part time", "Contract", "Freelance"]

const BLOCK_CONFIG: Record<
  BlockType,
  {
    label: string
    color: string
    textColor: string
    headerBg: string
    headerBdr: string
    labelColor: string
    achFields: string[]
    achPlaceholders: string[]
    addLabel: string
    countLabel: (count: number) => string
  }
> = {
  employer: {
    label: "Employer",
    color: "#c79a36",
    textColor: "#3a2000",
    headerBg: "var(--pp-surface-sub)",
    headerBdr: "var(--pp-border-light)",
    labelColor: "var(--pp-muted)",
    achFields: ["What did you achieve?", "The number", "Why it mattered"],
    achPlaceholders: ["The result", "e.g. 34%, EUR2M", "Business impact"],
    addLabel: "Add win",
    countLabel: (count) => `${count} win${count === 1 ? "" : "s"}`,
  },
  internship: {
    label: "Internship",
    color: "#2f7c83",
    textColor: "#fffaf0",
    headerBg: "rgba(36, 107, 111, 0.08)",
    headerBdr: "rgba(36, 107, 111, 0.22)",
    labelColor: "#246b6f",
    achFields: ["What did you do?", "The number", "What happened"],
    achPlaceholders: [
      "e.g. Built a dashboard",
      "e.g. 200+ users",
      "e.g. Became a permanent feature",
    ],
    addLabel: "Add another",
    countLabel: (count) => `${count} added`,
  },
  university: {
    label: "University",
    color: "#7a72d5",
    textColor: "#fff",
    headerBg: "rgba(122, 114, 213, 0.08)",
    headerBdr: "rgba(122, 114, 213, 0.2)",
    labelColor: "#554bb9",
    achFields: ["Project or achievement", "Scale or number", "Recognition"],
    achPlaceholders: [
      "e.g. Led the Marketing Society",
      "e.g. 300 members",
      "e.g. Largest in faculty",
    ],
    addLabel: "Add project or award",
    countLabel: (count) => `${count} added`,
  },
}

const JOURNEY_GUIDE = [
  {
    title: "Just graduated",
    steps: [
      { color: "#7a72d5", text: "University" },
      { color: "#2f7c83", text: "Internship", optional: true },
    ],
  },
  {
    title: "Building your career",
    steps: [
      { color: "#c79a36", text: "Employer(s)" },
      { color: "#7a72d5", text: "University", optional: true },
    ],
  },
  {
    title: "Established professional",
    steps: [{ color: "#c79a36", text: "Employers only" }],
  },
]

let idCounter = 0
const uid = () => `profile_${++idCounter}_${Date.now()}`
const makeAchievement = (): Achievement => ({ id: uid(), col0: "", col1: "", col2: "" })

function makeBlock(type: BlockType): ProfileBlock {
  return {
    id: uid(),
    type,
    company: "",
    title: "",
    employmentType: "Full time",
    sector: "",
    size: "",
    role: "",
    duration: "",
    name: "",
    degree: "",
    achievements: [],
  }
}

function createDefaultDraft(initialProfile?: UserProfile): ProfileDraft {
  return {
    headline:
      initialProfile?.professional_headline ||
      "Growth marketer with 5 years in SaaS and lifecycle marketing",
    seniority: "mid",
    skills:
      initialProfile?.strengths ||
      "HubSpot, Marketo, SQL, A/B testing, lifecycle marketing, paid social",
    qualifications: initialProfile?.qualifications ?? "",
    notes: initialProfile?.notes ?? "",
    // Saved structured blocks are loaded here so the user sees what
    // they previously entered instead of starting empty each visit.
    blocks: (initialProfile?.experience_blocks ?? []) as ProfileBlock[],
  }
}

function selectedSeniorityLabel(seniority: string) {
  return SENIORITY_LEVELS.find((level) => level.id === seniority)?.label || "Mid"
}

function serializeExperience(profile: ProfileDraft) {
  const blockText = profile.blocks
    .map((block) => {
      const label = BLOCK_CONFIG[block.type].label
      const title =
        block.type === "university"
          ? [block.name, block.degree].filter(Boolean).join(" - ")
          : [block.company, block.title || block.role].filter(Boolean).join(" - ")
      const details = [
        block.employmentType && block.type === "employer"
          ? `Type: ${block.employmentType}`
          : "",
        block.duration && block.type === "internship"
          ? `Duration: ${block.duration}`
          : "",
        block.sector ? `Sector: ${block.sector}` : "",
        block.size ? `Size: ${block.size}` : "",
      ].filter(Boolean)
      const achievements = block.achievements
        .map((achievement) =>
          [achievement.col0, achievement.col1, achievement.col2]
            .filter(Boolean)
            .join(" | ")
        )
        .filter(Boolean)
        .map((achievement) => `- ${achievement}`)

      return [
        `${label}: ${title || "Untitled"}`,
        ...details,
        ...achievements,
      ].join("\n")
    })
    .join("\n\n")

  return [
    blockText,
    profile.qualifications
      ? `Qualifications & portfolio: ${profile.qualifications}`
      : "",
    profile.notes ? `Additional notes: ${profile.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function buildPayload(profile: ProfileDraft, initialProfile: UserProfile): UserProfile {
  const sectors = Array.from(
    new Set(profile.blocks.map((block) => block.sector).filter(Boolean))
  ).join(", ")

  return {
    professional_headline: profile.headline,
    target_roles:
      initialProfile.target_roles || `${selectedSeniorityLabel(profile.seniority)} roles`,
    industries: sectors || initialProfile.industries,
    // Keep the legacy serialized text in key_achievements for backward
    // compatibility with anything that still reads it, but the source
    // of truth is now experience_blocks below.
    key_achievements: serializeExperience(profile),
    strengths: profile.skills,
    experience_blocks: profile.blocks,
    qualifications: profile.qualifications,
    notes: profile.notes,
  }
}

function AchievementRow({
  achievement,
  index,
  config,
  onUpdate,
  onRemove,
}: {
  achievement: Achievement
  index: number
  config: (typeof BLOCK_CONFIG)[BlockType]
  onUpdate: (field: keyof Achievement, value: string) => void
  onRemove: () => void
}) {
  const { color, textColor, achFields, achPlaceholders } = config

  return (
    <div className="ach-row">
      <div className="ach-badge" style={{ background: color, color: textColor }}>
        {index + 1}
      </div>

      {achFields.map((label, fieldIndex) => (
        <div key={label} className="ach-field">
          <div className="ach-field-label">{label}</div>
          <input
            className="ach-input"
            type="text"
            value={achievement[`col${fieldIndex}` as keyof Achievement] || ""}
            placeholder={achPlaceholders[fieldIndex]}
            onChange={(event) =>
              onUpdate(`col${fieldIndex}` as keyof Achievement, event.target.value)
            }
          />
        </div>
      ))}

      <button
        className="ach-remove"
        type="button"
        onClick={onRemove}
        title="Remove"
      >
        x
      </button>
    </div>
  )
}

function SectorSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      <option value="">Select...</option>
      {SECTOR_GROUPS.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function EmployerFields({
  block,
  onUpdate,
  labelClass,
  inputClass,
}: {
  block: ProfileBlock
  onUpdate: (field: keyof ProfileBlock, value: string) => void
  labelClass: string
  inputClass: string
}) {
  return (
    <div className="emp-fields emp-fields--employer">
      <div>
        <div className={`ef-lbl ${labelClass}`}>Company name</div>
        <input
          className={`ef-inp ${inputClass} ef-inp--bold`}
          type="text"
          value={block.company}
          placeholder="e.g. Acme Corp"
          onChange={(event) => onUpdate("company", event.target.value)}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Your title</div>
        <input
          className={`ef-inp ${inputClass}`}
          type="text"
          value={block.title}
          placeholder="Job title"
          onChange={(event) => onUpdate("title", event.target.value)}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Type</div>
        <select
          className={`ef-inp ${inputClass}`}
          value={block.employmentType}
          onChange={(event) => onUpdate("employmentType", event.target.value)}
        >
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Sector</div>
        <SectorSelect
          value={block.sector}
          onChange={(value) => onUpdate("sector", value)}
          className={`ef-inp ${inputClass}`}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>
          Size <span className="ef-opt">(optional)</span>
        </div>
        <select
          className={`ef-inp ${inputClass}`}
          value={block.size}
          onChange={(event) => onUpdate("size", event.target.value)}
        >
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function InternshipFields({
  block,
  onUpdate,
  labelClass,
  inputClass,
}: {
  block: ProfileBlock
  onUpdate: (field: keyof ProfileBlock, value: string) => void
  labelClass: string
  inputClass: string
}) {
  return (
    <div className="emp-fields emp-fields--internship">
      <div>
        <div className={`ef-lbl ${labelClass}`}>Company / Organisation</div>
        <input
          className={`ef-inp ${inputClass} ef-inp--bold`}
          type="text"
          value={block.company}
          placeholder="e.g. Goldman Sachs"
          onChange={(event) => onUpdate("company", event.target.value)}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Role</div>
        <input
          className={`ef-inp ${inputClass}`}
          type="text"
          value={block.role}
          placeholder="e.g. Finance Intern"
          onChange={(event) => onUpdate("role", event.target.value)}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Duration</div>
        <input
          className={`ef-inp ${inputClass}`}
          type="text"
          value={block.duration}
          placeholder="e.g. 3 months"
          onChange={(event) => onUpdate("duration", event.target.value)}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Sector</div>
        <SectorSelect
          value={block.sector}
          onChange={(value) => onUpdate("sector", value)}
          className={`ef-inp ${inputClass}`}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>
          Size <span className="ef-opt">(optional)</span>
        </div>
        <select
          className={`ef-inp ${inputClass}`}
          value={block.size}
          onChange={(event) => onUpdate("size", event.target.value)}
        >
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function UniversityFields({
  block,
  onUpdate,
  labelClass,
  inputClass,
}: {
  block: ProfileBlock
  onUpdate: (field: keyof ProfileBlock, value: string) => void
  labelClass: string
  inputClass: string
}) {
  return (
    <div className="emp-fields emp-fields--university">
      <div>
        <div className={`ef-lbl ${labelClass}`}>University name</div>
        <input
          className={`ef-inp ${inputClass} ef-inp--bold`}
          type="text"
          value={block.name}
          placeholder="e.g. University of Manchester"
          onChange={(event) => onUpdate("name", event.target.value)}
        />
      </div>
      <div>
        <div className={`ef-lbl ${labelClass}`}>Degree</div>
        <input
          className={`ef-inp ${inputClass}`}
          type="text"
          value={block.degree}
          placeholder="e.g. BSc Computer Science"
          onChange={(event) => onUpdate("degree", event.target.value)}
        />
      </div>
    </div>
  )
}

function EmployerBlock({
  block,
  onUpdate,
  onRemove,
  onAddAchievement,
  onUpdateAchievement,
  onRemoveAchievement,
}: {
  block: ProfileBlock
  onUpdate: (field: keyof ProfileBlock, value: string) => void
  onRemove: () => void
  onAddAchievement: () => void
  onUpdateAchievement: (achievementId: string, field: keyof Achievement, value: string) => void
  onRemoveAchievement: (achievementId: string) => void
}) {
  const config = BLOCK_CONFIG[block.type]
  const labelClass = `ef-lbl--${block.type}`
  const inputClass = `ef-inp--${block.type}`

  return (
    <div className="emp-block">
      <div
        className="emp-header"
        style={
          {
            "--hbg": config.headerBg,
            "--hbdr": config.headerBdr,
          } as React.CSSProperties
        }
      >
        <div className="emp-header-top">
          <div className="emp-type-tag" style={{ color: config.labelColor }}>
            <span
              className="emp-type-dot"
              style={{ background: config.color }}
            />
            {config.label}
          </div>
          <button
            className="emp-remove-block"
            type="button"
            onClick={onRemove}
            title="Remove"
          >
            x
          </button>
        </div>

        {block.type === "employer" ? (
          <EmployerFields
            block={block}
            onUpdate={onUpdate}
            labelClass={labelClass}
            inputClass={inputClass}
          />
        ) : null}
        {block.type === "internship" ? (
          <InternshipFields
            block={block}
            onUpdate={onUpdate}
            labelClass={labelClass}
            inputClass={inputClass}
          />
        ) : null}
        {block.type === "university" ? (
          <UniversityFields
            block={block}
            onUpdate={onUpdate}
            labelClass={labelClass}
            inputClass={inputClass}
          />
        ) : null}
      </div>

      <div className="emp-achievements">
        {block.achievements.map((achievement, index) => (
          <AchievementRow
            key={achievement.id}
            achievement={achievement}
            index={index}
            config={config}
            onUpdate={(field, value) =>
              onUpdateAchievement(achievement.id, field, value)
            }
            onRemove={() => onRemoveAchievement(achievement.id)}
          />
        ))}
        <div className="emp-ach-footer">
          <button className="emp-add-ach" type="button" onClick={onAddAchievement}>
            <span className="emp-add-plus">+</span> {config.addLabel}
          </button>
          <span className="emp-ach-count">
            {config.countLabel(block.achievements.length)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ProfileClient({
  initialProfile,
  setupError,
  experiencePersistenceAvailable = true,
}: ProfileClientProps) {
  const initialDraft = useMemo(
    () => createDefaultDraft(initialProfile),
    [initialProfile]
  )
  const [profile, setProfile] = useState(initialDraft)
  const [savedProfile, setSavedProfile] = useState(initialProfile)
  // Returning users (who already have a saved headline OR saved experience
  // blocks) skip the "complete section 1 first" gating — they've been
  // through the flow before and shouldn't have to re-unlock step 2 on
  // every visit. New users (empty saved profile) still see the gated
  // flow that nudges them through step 1.
  const hasSavedHeadline =
    (initialProfile.professional_headline ?? "").trim().length > 0
  const hasSavedExperience =
    Array.isArray(initialProfile.experience_blocks) &&
    initialProfile.experience_blocks.length > 0
  const hasSavedSkills = (initialProfile.strengths ?? "").trim().length > 0
  const returningUser = hasSavedHeadline || hasSavedExperience || hasSavedSkills
  const [experienceUnlocked, setExperienceUnlocked] = useState(returningUser)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")
  const careerSnapshotComplete =
    profile.headline.trim().length > 0 && profile.seniority.trim().length > 0

  const setField = useCallback(
    <Field extends keyof ProfileDraft>(field: Field, value: ProfileDraft[Field]) =>
      setProfile((current) => ({ ...current, [field]: value })),
    []
  )

  const addBlock = useCallback(
    (type: BlockType) =>
      setProfile((current) => ({
        ...current,
        blocks: [...current.blocks, makeBlock(type)],
      })),
    []
  )

  const removeBlock = useCallback(
    (id: string) =>
      setProfile((current) => ({
        ...current,
        blocks: current.blocks.filter((block) => block.id !== id),
      })),
    []
  )

  const updateBlock = useCallback(
    (id: string, field: keyof ProfileBlock, value: string) =>
      setProfile((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === id ? { ...block, [field]: value } : block
        ),
      })),
    []
  )

  const addAchievement = useCallback(
    (blockId: string) =>
      setProfile((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId
            ? { ...block, achievements: [...block.achievements, makeAchievement()] }
            : block
        ),
      })),
    []
  )

  const removeAchievement = useCallback(
    (blockId: string, achievementId: string) =>
      setProfile((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                achievements: block.achievements.filter(
                  (achievement) => achievement.id !== achievementId
                ),
              }
            : block
        ),
      })),
    []
  )

  const updateAchievement = useCallback(
    (
      blockId: string,
      achievementId: string,
      field: keyof Achievement,
      value: string
    ) =>
      setProfile((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                achievements: block.achievements.map((achievement) =>
                  achievement.id === achievementId
                    ? { ...achievement, [field]: value }
                    : achievement
                ),
              }
            : block
        ),
      })),
    []
  )

  async function handleSave() {
    setSaving(true)
    setMessage("")
    setError("")

    const payload = buildPayload(profile, savedProfile)

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { profile?: UserProfile; error?: string }

      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Could not save profile.")
      }

      setSavedProfile(data.profile)
      setMessage("Profile saved.")
      setTimeout(() => setMessage(""), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.")
    } finally {
      setSaving(false)
    }
  }

  function discardChanges() {
    setProfile(createDefaultDraft(savedProfile))
    // For returning users, "Discard" reverts edits but keeps step 2
    // unlocked — they shouldn't have to re-unlock just because they
    // backed out of an in-progress edit.
    const stillReturningUser =
      (savedProfile.professional_headline ?? "").trim().length > 0 ||
      (Array.isArray(savedProfile.experience_blocks) &&
        savedProfile.experience_blocks.length > 0) ||
      (savedProfile.strengths ?? "").trim().length > 0
    setExperienceUnlocked(stillReturningUser)
    setMessage("")
    setError(setupError || "")
  }

  return (
    <div className="pp">
      <div className="pp-topbar">
        <div className="pp-breadcrumb">
          <span>Account</span>
          <span className="pp-sep">/</span>
          <span className="pp-current">Profile</span>
        </div>
        <div className="pp-tb-actions">
          <button className="pp-btn-ghost" type="button" onClick={discardChanges}>
            Discard changes
          </button>
          <button
            className={`pp-btn-primary${message ? " pp-btn-saved" : ""}`}
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : message ? "Saved" : "Save profile"}
          </button>
        </div>
      </div>

      <div className="pp-body">
        <div className="pp-hd">
          <h1 className="pp-h1">Your profile</h1>
          <p className="pp-sub">
            The context behind every letter you generate. Fill this in once -
            the AI pulls from it automatically and adapts it to each specific job.
          </p>
        </div>

        {message ? <div className="success-alert">{message}</div> : null}
        {error ? <div className="alert">{error}</div> : null}
        {!experiencePersistenceAvailable ? (
          <div className="pp-info-banner" role="status">
            <strong>Heads up:</strong> your database hasn&apos;t had the experience-
            persistence migration applied yet, so saved Employer / Internship /
            University blocks won&apos;t survive across page reloads. Everything
            else (career snapshot, skills, qualifications) still saves normally,
            and letter generation works without it.
            <br />
            Run <code>docs/supabase-experience-blocks.sql</code> in your
            Supabase SQL editor to enable structured experience storage.
          </div>
        ) : null}

        <div className="pp-prog">
          {[
            {
              label: "Career snapshot",
              state: experienceUnlocked ? "done" : "current",
              n: 1,
            },
            {
              label: "Experience & wins",
              // Returning users with saved blocks see step 2 as "done";
              // returning users who only have a saved headline see
              // "current"; brand-new users see "locked".
              state: hasSavedExperience
                ? "done"
                : experienceUnlocked
                  ? "current"
                  : "locked",
              n: 2,
            },
          ].map((step, index, steps) => (
            <div key={step.label} className="pp-prog-row">
              <div className="pp-prog-step">
                <div className={`pp-prog-dot pp-prog-dot--${step.state}`}>
                  {step.state === "done" ? (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step.n
                  )}
                </div>
                <span className={`pp-prog-label pp-prog-label--${step.state}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`pp-prog-line${
                    experienceUnlocked ? " pp-prog-line--done" : ""
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="pp-card">
          <div className="pp-card-hd">
            <div className="pp-card-hd-row">
              <h2 className="pp-card-title">Career snapshot</h2>
              <span className="pp-card-step">Step 1 of 2</span>
            </div>
            <p className="pp-card-desc">
              Your professional identity and seniority. This calibrates the tone
              and vocabulary of every letter.
            </p>
          </div>

          <div className="pp-card-body">
            <div className="pp-field">
              <label className="pp-label" htmlFor="profile-headline">
                How would you describe yourself professionally?
              </label>
              <input
                className="pp-input"
                id="profile-headline"
                type="text"
                value={profile.headline}
                onChange={(event) => setField("headline", event.target.value)}
                placeholder="e.g. Growth marketer with 5 years in SaaS"
              />
            </div>

            <div>
              <div className="pp-label pp-label-spaced">
                Seniority level{" "}
                <span className="pp-label-hint">
                  - calibrates tone, vocabulary, and confidence register
                </span>
              </div>
              <div className="pp-sen-grid">
                {SENIORITY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    className={`pp-sen-btn${
                      profile.seniority === level.id ? " pp-sen-btn--active" : ""
                    }`}
                    type="button"
                    onClick={() => setField("seniority", level.id)}
                  >
                    <span className="pp-sen-name">{level.label}</span>
                    <span className="pp-sen-years">{level.years}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Returning users who already have step 2 unlocked don't
                need to see the "Next" CTA — both cards are visible at
                once and they can edit either freely. */}
            {!experienceUnlocked ? (
              <div className="pp-step-actions">
                <div className="pp-step-copy">
                  {careerSnapshotComplete
                    ? "Career snapshot is ready. Continue to add your evidence and wins."
                    : "Add your professional headline and seniority to unlock the next section."}
                </div>
                <button
                  className="pp-next-btn"
                  type="button"
                  disabled={!careerSnapshotComplete}
                  onClick={() => setExperienceUnlocked(true)}
                >
                  Next: experience &amp; wins
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={`pp-card${experienceUnlocked ? "" : " pp-card--locked"}`}>
          <div className="pp-card-hd">
            <div className="pp-card-hd-row">
              <h2 className="pp-card-title">Experience & wins</h2>
              <span className="pp-card-step">Step 2 of 2</span>
            </div>
            <p className="pp-card-desc">
              Your work history, education, and the wins from each. Add a number
              to every achievement - the single biggest factor in getting interviews.
            </p>
          </div>

          {!experienceUnlocked ? (
            <div className="pp-card-body pp-locked-body">
              <div className="pp-lock-icon">2</div>
              <div>
                <h3>Complete section 1 first</h3>
                <p>
                  Fill in your career snapshot, then click the next button above
                  to unlock your experience, evidence, and achievements.
                </p>
              </div>
            </div>
          ) : (
          <div className="pp-card-body">
            <div className="pp-sec-label">
              What to add depending on where you are in your career
            </div>
            <div className="pp-journey">
              {JOURNEY_GUIDE.map((journey) => (
                <div key={journey.title} className="pp-j-card">
                  <div className="pp-j-title">{journey.title}</div>
                  {journey.steps.map((step) => (
                    <div key={step.text} className="pp-j-row">
                      <span
                        className="pp-j-dot"
                        style={{ background: step.color }}
                      />
                      <span className="pp-j-text">
                        {step.text}
                        {"optional" in step && step.optional ? (
                          <span className="pp-j-opt"> (optional)</span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="pp-sec-label pp-add-label">
              What would you like to add?
            </div>
            <div className="pp-add-grid">
              {(["employer", "internship", "university"] as BlockType[]).map(
                (type) => {
                  const config = BLOCK_CONFIG[type]
                  return (
                    <button
                      key={type}
                      className="pp-add-pill"
                      type="button"
                      onClick={() => addBlock(type)}
                    >
                      <span
                        className="pp-add-dot"
                        style={{ background: config.color }}
                      />
                      {config.label}
                    </button>
                  )
                }
              )}
            </div>

            <div className="pp-divider" />

            <div className="pp-tip">
              <div className="pp-tip-title">What makes an achievement land</div>
              <div className="pp-tip-body">
                "Grew TikTok from 0 to 84K followers in 8 months with no paid
                spend - the CFO asked who was running it."
              </div>
              <div className="pp-tip-meta">
                <span>What you did</span>
                <span className="pp-tip-sep">-</span>
                <span>The number</span>
                <span className="pp-tip-sep">-</span>
                <span>Why it mattered</span>
              </div>
            </div>

            {profile.blocks.length === 0 ? (
              <div className="pp-empty">
                No entries yet. Use the buttons above to add your experience.
              </div>
            ) : null}
            <div className="pp-blocks">
              {profile.blocks.map((block) => (
                <EmployerBlock
                  key={block.id}
                  block={block}
                  onUpdate={(field, value) => updateBlock(block.id, field, value)}
                  onRemove={() => removeBlock(block.id)}
                  onAddAchievement={() => addAchievement(block.id)}
                  onUpdateAchievement={(achievementId, field, value) =>
                    updateAchievement(block.id, achievementId, field, value)
                  }
                  onRemoveAchievement={(achievementId) =>
                    removeAchievement(block.id, achievementId)
                  }
                />
              ))}
            </div>

            <div className="pp-divider" />

            <div className="pp-bottom-grid">
              <div className="pp-field">
                <label className="pp-label" htmlFor="profile-skills">
                  Skills & tools
                </label>
                <textarea
                  className="pp-input pp-textarea"
                  id="profile-skills"
                  rows={2}
                  value={profile.skills}
                  onChange={(event) => setField("skills", event.target.value)}
                  placeholder="e.g. HubSpot, Marketo, SQL"
                />
              </div>
              <div>
                <div className="pp-field pp-qualified-field">
                  <label className="pp-label" htmlFor="profile-qualifications">
                    Qualifications & portfolio link
                  </label>
                  <input
                    className="pp-input"
                    id="profile-qualifications"
                    type="text"
                    value={profile.qualifications}
                    onChange={(event) =>
                      setField("qualifications", event.target.value)
                    }
                    placeholder="e.g. MBA, CFA - then https://..."
                  />
                </div>
                <div className="pp-field">
                  <label className="pp-label" htmlFor="profile-notes">
                    Anything else?{" "}
                    <span className="pp-label-hint">(optional)</span>
                  </label>
                  <textarea
                    className="pp-input pp-textarea"
                    id="profile-notes"
                    rows={2}
                    value={profile.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder="Career change, gap, pivot - framed as a strength"
                  />
                </div>
              </div>
            </div>

            <div className="pp-divider" />

            <div className="pp-save-row">
              <span className="pp-save-note">
                Changes are saved to your account and applied to all future letters.
              </span>
              <button
                className={`pp-save-btn${message ? " pp-save-btn--saved" : ""}`}
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : message
                    ? "Saved"
                    : "Save profile & generate a letter ->"}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
