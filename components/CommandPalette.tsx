"use client"

import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

type CommandAction = {
  id: string
  label: string
  description: string
  group: "Navigate" | "Account" | "Help"
  keywords?: string[]
  shortcut?: string
  icon: ReactNode
  onRun: () => void | Promise<void>
}

function Icon({ name }: { name: string }) {
  if (name === "workspace") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    )
  }
  if (name === "letters") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 9h16" />
        <path d="M8 13h8M8 16h5" />
      </svg>
    )
  }
  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    )
  }
  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12.3a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
        <path d="M5 20.2a7 7 0 0 1 14 0" />
      </svg>
    )
  }
  if (name === "security") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-3.6 7-10.3V5.6L12 3 5 5.6v5.1C5 17.4 12 21 12 21Z" />
        <path d="m9.5 11.8 1.8 1.8 3.5-3.8" />
      </svg>
    )
  }
  if (name === "billing") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="M3.5 9.5h17M7 14h3" />
      </svg>
    )
  }
  if (name === "help") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.2 9a3 3 0 1 1 5.2 2c-.9.8-1.8 1.3-2.1 2.8" />
        <path d="M12 17.5h.01" />
      </svg>
    )
  }
  if (name === "legal") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h12l4 4v12H4z" />
        <path d="M14 4v6h6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setActiveIndex(0)
  }, [])

  const actions = useMemo<CommandAction[]>(() => {
    const go = (href: string) => () => {
      router.push(href)
      close()
    }
    return [
      {
        id: "workspace",
        label: "Open workspace",
        description: "Generate a new cover letter",
        group: "Navigate",
        keywords: ["home", "draft", "compose", "new", "create"],
        shortcut: "G W",
        icon: <Icon name="workspace" />,
        onRun: go("/dashboard"),
      },
      {
        id: "letters",
        label: "My letters",
        description: "Browse past cover letters",
        group: "Navigate",
        keywords: ["history", "past", "library"],
        shortcut: "G L",
        icon: <Icon name="letters" />,
        onRun: go("/dashboard/letters"),
      },
      {
        id: "settings",
        label: "Account settings",
        description: "Tone defaults, notifications, data controls",
        group: "Account",
        keywords: ["preferences", "tone", "notifications", "gdpr", "export", "delete"],
        shortcut: "G S",
        icon: <Icon name="settings" />,
        onRun: go("/dashboard/settings"),
      },
      {
        id: "profile",
        label: "Profile",
        description: "Resume, skills, experience",
        group: "Account",
        keywords: ["resume", "skills", "cv"],
        shortcut: "G P",
        icon: <Icon name="profile" />,
        onRun: go("/dashboard/profile"),
      },
      {
        id: "security",
        label: "Security",
        description: "Password, sessions, two-factor",
        group: "Account",
        keywords: ["password", "2fa", "sessions"],
        icon: <Icon name="security" />,
        onRun: go("/dashboard/security"),
      },
      {
        id: "billing",
        label: "Billing & plan",
        description: "Subscription, invoices, switch plan",
        group: "Account",
        keywords: ["subscription", "invoice", "upgrade", "downgrade", "plan", "stripe"],
        shortcut: "G B",
        icon: <Icon name="billing" />,
        onRun: go("/dashboard/billing"),
      },
      {
        id: "help",
        label: "Contact support",
        description: "Reach the ForgeLetter team",
        group: "Help",
        keywords: ["contact", "support", "help", "email"],
        icon: <Icon name="help" />,
        onRun: go("/contact"),
      },
      {
        id: "legal",
        label: "Legal centre",
        description: "Terms, privacy, refunds, compliance",
        group: "Help",
        keywords: ["terms", "privacy", "refund", "gdpr", "imprint", "dpa"],
        icon: <Icon name="legal" />,
        onRun: go("/legal"),
      },
    ]
  }, [router, close])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter((action) => {
      const haystack = [
        action.label,
        action.description,
        action.group,
        ...(action.keywords || []),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [actions, query])

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandAction[]>()
    filtered.forEach((action) => {
      const list = groups.get(action.group) || []
      list.push(action)
      groups.set(action.group, list)
    })
    return Array.from(groups.entries())
  }, [filtered])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifierKey = isMac ? event.metaKey : event.ctrlKey
      if (modifierKey && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      if (event.key === "Escape" && open) {
        event.preventDefault()
        close()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const runActionAt = useCallback(
    (index: number) => {
      const action = filtered[index]
      if (!action) return
      void action.onRun()
    },
    [filtered]
  )

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) =>
        filtered.length === 0 ? 0 : (index + 1) % filtered.length
      )
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) =>
        filtered.length === 0
          ? 0
          : (index - 1 + filtered.length) % filtered.length
      )
    } else if (event.key === "Enter") {
      event.preventDefault()
      runActionAt(activeIndex)
    } else if (event.key === "Home") {
      setActiveIndex(0)
    } else if (event.key === "End") {
      setActiveIndex(Math.max(0, filtered.length - 1))
    }
  }

  useEffect(() => {
    if (!open) return
    const activeNode = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-command-index="${activeIndex}"]`
    )
    activeNode?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  return (
    <>
      <button
        type="button"
        className="command-palette-fab"
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">⌘</span>
        <span>Quick actions</span>
        <kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd>
      </button>

      {open ? (
        <div className="command-palette-root" role="dialog" aria-modal="true" aria-label="Command palette">
          <button
            type="button"
            className="command-palette-backdrop"
            aria-label="Close command palette"
            onClick={close}
          />
          <div className="command-palette">
            <div className="command-palette__search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Jump to anything…"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search commands"
              />
              <kbd>esc</kbd>
            </div>

            <div className="command-palette__results" ref={listRef}>
              {filtered.length === 0 ? (
                <div className="command-palette__empty">
                  No matches for &ldquo;{query}&rdquo;.
                </div>
              ) : (
                grouped.map(([group, items]) => (
                  <div className="command-palette__group" key={group}>
                    <div className="command-palette__group-label">{group}</div>
                    {items.map((action) => {
                      const index = filtered.indexOf(action)
                      const isActive = index === activeIndex
                      return (
                        <button
                          key={action.id}
                          type="button"
                          data-command-index={index}
                          className={`command-palette__item${
                            isActive ? " is-active" : ""
                          }`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runActionAt(index)}
                        >
                          <span className="command-palette__icon">{action.icon}</span>
                          <span className="command-palette__copy">
                            <strong>{action.label}</strong>
                            <span>{action.description}</span>
                          </span>
                          {action.shortcut ? (
                            <kbd className="command-palette__shortcut">
                              {action.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="command-palette__footer">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd>
                to navigate
              </span>
              <span>
                <kbd>enter</kbd>
                to select
              </span>
              <span>
                <kbd>esc</kbd>
                to close
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
