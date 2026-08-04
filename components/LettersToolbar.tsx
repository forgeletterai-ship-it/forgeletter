"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"

/**
 * Search + filter + sort for the letters library.
 *
 * Search is the primary control: people remember WHERE they applied,
 * not what status they set. Status chips render only when they have
 * something in them (or are the active filter), so a library with
 * three submitted letters doesn't show five empty buckets.
 */

const STATUSES = [
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

type StatusValue = (typeof STATUSES)[number]["value"]

type Props = {
  currentStatus: string
  currentSort: string
  currentQuery: string
  counts: Partial<Record<StatusValue, number>>
  total: number
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function LettersToolbar({
  currentStatus,
  currentSort,
  currentQuery,
  counts,
  total,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(currentQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the box in sync when the URL changes from elsewhere (back
  // button, "Clear filters" link).
  useEffect(() => {
    setQuery(currentQuery)
  }, [currentQuery])

  const pushParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params?.toString() ?? "")
      mutate(next)
      // Any filter change invalidates the page cursor.
      next.delete("page")
      startTransition(() => {
        const qs = next.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
      })
    },
    [params, pathname, router]
  )

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      pushParams((next) => {
        if (!value || value === "all") next.delete(key)
        else next.set(key, value)
      })
    },
    [pushParams]
  )

  function onQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam("q", value.trim() || null)
    }, 300)
  }

  function clearQuery() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setQuery("")
    updateParam("q", null)
  }

  // Only show a chip if it has letters in it, or it's the one that's
  // currently applied (so you can always switch it off).
  const visibleChips = STATUSES.filter(
    (s) => (counts[s.value] ?? 0) > 0 || s.value === currentStatus
  )

  return (
    <div className={`letters-toolbar${pending ? " is-pending" : ""}`}>
      <div className="letters-toolbar__search">
        <span className="letters-toolbar__search-icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          placeholder="Search by role or company..."
          aria-label="Search letters by role or company"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <button
            className="letters-toolbar__clear"
            type="button"
            onClick={clearQuery}
            aria-label="Clear search"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="letters-toolbar__controls">
        <div
          className="letters-toolbar__chips"
          role="group"
          aria-label="Filter by application status"
        >
          <button
            type="button"
            className={`letters-chip${!currentStatus ? " is-active" : ""}`}
            onClick={() => updateParam("status", null)}
            disabled={pending}
          >
            All
            <span className="letters-chip__count">{total}</span>
          </button>
          {visibleChips.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`letters-chip letters-chip--${s.value}${
                s.value === currentStatus ? " is-active" : ""
              }`}
              onClick={() => updateParam("status", s.value)}
              disabled={pending}
            >
              {s.label}
              <span className="letters-chip__count">{counts[s.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <label className="letters-toolbar__sort">
          <span>Sort</span>
          <select
            value={currentSort || "created_desc"}
            onChange={(event) => updateParam("sort", event.target.value)}
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
    </div>
  )
}
