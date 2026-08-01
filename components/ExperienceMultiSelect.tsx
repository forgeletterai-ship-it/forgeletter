"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type ExperienceBlock,
  experienceBlockKind,
  experienceBlockLabel,
} from "@/lib/experience-types"

// NOTE: qualifications & portfolio are ALWAYS included in generation
// behind the scenes (alwaysIncludeQualifications in the pipeline).
// They used to appear here as a pinned "Always" row — removed per
// owner decision: the picker lists only the experiences the user can
// actually choose.

interface Props {
  blocks: ExperienceBlock[]
  selectedIds: string[]
  onChange: (nextSelectedIds: string[]) => void
  /** href the empty-state CTA links to */
  profileExperienceHref?: string
  label?: string
  /** id used for the visible label so we can hook aria-labelledby */
  labelId?: string
  /**
   * False if the Supabase schema migration hasn't run yet — the
   * empty-state copy shifts to explain that experiences won't appear
   * here until the DB is updated, rather than implying the user
   * forgot to add them.
   */
  persistenceAvailable?: boolean
}

interface Row {
  id: string
  label: string
  kind: string
}

export function ExperienceMultiSelect({
  blocks,
  selectedIds,
  onChange,
  profileExperienceHref = "/dashboard/profile#experience",
  label = "Experiences to include",
  labelId,
  persistenceAvailable = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const fallbackLabelId = useId()
  const headingId = labelId ?? fallbackLabelId

  const rows: Row[] = useMemo(
    () =>
      blocks.map((b) => ({
        id: b.id,
        label: experienceBlockLabel(b),
        kind: experienceBlockKind(b),
      })),
    [blocks]
  )

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedBlockIds = useMemo(
    () => rows.filter((r) => selectedSet.has(r.id)).map((r) => r.id),
    [rows, selectedSet]
  )

  const selectedLabels = useMemo(() => {
    return rows.filter((r) => selectedSet.has(r.id)).map((r) => r.label)
  }, [rows, selectedSet])

  // ---------- Click outside + Escape ----------

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // ---------- Selection ----------

  const toggle = useCallback(
    (rowId: string) => {
      const next = new Set(selectedBlockIds)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      onChange(Array.from(next))
    },
    [selectedBlockIds, onChange]
  )

  // ---------- Keyboard inside the panel ----------

  const onPanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const last = rows.length - 1
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setFocusedIndex((i) => Math.min(last, i + 1))
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        setFocusedIndex((i) => Math.max(0, i - 1))
      } else if (event.key === "Home") {
        event.preventDefault()
        setFocusedIndex(0)
      } else if (event.key === "End") {
        event.preventDefault()
        setFocusedIndex(last)
      } else if (event.key === " " || event.key === "Enter") {
        const target = rows[focusedIndex]
        if (target) {
          event.preventDefault()
          toggle(target.id)
        }
      }
    },
    [focusedIndex, rows, toggle]
  )

  // Move focus to the focused option when index changes while open.
  useEffect(() => {
    if (!open) return
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${focusedIndex}"]`
    )
    node?.focus()
  }, [focusedIndex, open])

  // ---------- Render ----------

  const blocksEmpty = blocks.length === 0
  const barText =
    selectedLabels.length === 0
      ? "Select experiences to include"
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`

  return (
    <div className="exp-ms" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`exp-ms-bar${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={headingId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
            e.preventDefault()
            setOpen(true)
            setFocusedIndex(0)
          }
        }}
      >
        <span className={`exp-ms-bar-text${selectedLabels.length === 0 ? " is-placeholder" : ""}`}>
          {barText}
        </span>
        <svg
          className={`exp-ms-chev${open ? " is-open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="exp-ms-panel"
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={headingId}
          tabIndex={-1}
          ref={listRef}
          onKeyDown={onPanelKeyDown}
        >
          {blocksEmpty ? (
            <div className="exp-ms-empty">
              {persistenceAvailable ? (
                <>
                  <p className="exp-ms-empty-title">No saved experiences yet</p>
                  <p className="exp-ms-empty-copy">
                    Add Employer, Internship or University entries on your profile,
                    then come back here to choose which to include.
                  </p>
                </>
              ) : (
                <>
                  <p className="exp-ms-empty-title">Experience storage not enabled</p>
                  <p className="exp-ms-empty-copy">
                    Your database needs the experience-persistence migration
                    (docs/supabase-experience-blocks.sql) to remember saved
                    experiences. Until then, generation still works from your
                    qualifications.
                  </p>
                </>
              )}
              <Link
                className="exp-ms-empty-link"
                href={profileExperienceHref}
                onClick={() => setOpen(false)}
              >
                {persistenceAvailable
                  ? "Add experiences on your profile →"
                  : "Open profile →"}
              </Link>
            </div>
          ) : (
            rows.map((row, index) => {
              const checked = selectedSet.has(row.id)
              return (
                <div
                  key={row.id}
                  className={`exp-ms-row${checked ? " is-checked" : ""}`}
                  role="option"
                  aria-selected={checked}
                  aria-checked={checked}
                  data-option-index={index}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  onClick={() => toggle(row.id)}
                  onFocus={() => setFocusedIndex(index)}
                >
                  <span
                    className={`exp-ms-check${checked ? " is-checked" : ""}`}
                    aria-hidden="true"
                  >
                    {checked ? (
                      <svg width="10" height="10" viewBox="0 0 12 12">
                        <path
                          d="M2 6.5l2.5 2.5L10 3.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span className="exp-ms-row-label">{row.label}</span>
                  <span className="exp-ms-row-kind">{row.kind}</span>
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
