"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"

const STATUSES = [
  { value: "all", label: "All" },
  { value: "offer", label: "Offer" },
  { value: "interviewing", label: "Interviewing" },
  { value: "submitted", label: "Submitted" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "Ghosted" },
  { value: "not_submitted", label: "Not submitted" },
] as const

const SORTS = [
  { value: "created_desc", label: "Most recent" },
  { value: "created_asc", label: "Oldest first" },
  { value: "score_desc", label: "Highest score" },
  { value: "ats_desc", label: "Highest ATS" },
  { value: "outcome_desc", label: "Outcome date" },
] as const

type Props = {
  currentStatus: string
  currentSort: string
  counts: Partial<Record<(typeof STATUSES)[number]["value"], number>>
  total: number
}

export function LettersFilterBar({
  currentStatus,
  currentSort,
  counts,
  total,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params?.toString() ?? "")
      if (!value || value === "all") {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      startTransition(() => {
        const qs = next.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
      })
    },
    [params, pathname, router]
  )

  return (
    <div className={`letters-filter-bar${pending ? " is-pending" : ""}`}>
      <div
        className="letters-filter-bar__chips"
        role="group"
        aria-label="Filter by application status"
      >
        {STATUSES.map((s) => {
          const isActive = (s.value === "all" && !currentStatus) || s.value === currentStatus
          const n = s.value === "all" ? total : counts[s.value] ?? 0
          return (
            <button
              key={s.value}
              type="button"
              className={`letters-filter-chip letters-filter-chip--${s.value}${
                isActive ? " is-active" : ""
              }`}
              onClick={() => updateParam("status", s.value)}
              disabled={pending}
            >
              {s.label}
              <span className="letters-filter-chip__count">{n}</span>
            </button>
          )
        })}
      </div>
      <label className="letters-filter-bar__sort">
        <span>Sort</span>
        <select
          value={currentSort || "created_desc"}
          onChange={(e) => updateParam("sort", e.target.value)}
          disabled={pending}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
