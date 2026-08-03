"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

/**
 * Account dropdown for the PUBLIC nav, shown only to logged-in
 * customers. Mirrors the dashboard's account menu (Workspace, letters,
 * profile, billing, settings, log out) so the homepage behaves like
 * the rest of the product once you're signed in — no dead "Logged in"
 * pill, no CTAs that bounce you back to the login page.
 */

type PublicAccountMenuProps = {
  displayName: string
  initials: string
  logoutAction: () => Promise<void>
}

function DownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" />
    </svg>
  )
}

function WorkspaceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h5" />
      <path d="M16 17h.01" />
    </svg>
  )
}

function LettersIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 9h16" />
      <path d="M8 13h8M8 16h5" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 12.3a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
      <path d="M5 20.2a7 7 0 0 1 14 0" />
    </svg>
  )
}

function BillingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M3.5 9.5h17M7 14h3" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 5h4.5A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M9 8l4 4-4 4" />
      <path d="M13 12H3" />
    </svg>
  )
}

function MenuItem({
  children,
  href,
  icon,
  onClick,
}: {
  children: ReactNode
  href: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <Link className="pnav-item" href={href} onClick={onClick}>
      <span className="pnav-item__icon">{icon}</span>
      <span>{children}</span>
    </Link>
  )
}

export function PublicAccountMenu({
  displayName,
  initials,
  logoutAction,
}: PublicAccountMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  function close() {
    setOpen(false)
  }

  return (
    <div className="pnav-account" ref={wrapRef}>
      <Link className="button" href="/dashboard">
        Workspace
      </Link>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${displayName}`}
        className="pnav-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="pnav-avatar" aria-hidden="true">
          {initials}
        </span>
        <DownIcon />
      </button>

      <div className={`pnav-dropdown${open ? " is-open" : ""}`} role="menu">
        <p className="pnav-signed-in">Signed in as {displayName}</p>
        <div className="pnav-divider" />
        <MenuItem href="/dashboard" icon={<WorkspaceIcon />} onClick={close}>
          Workspace
        </MenuItem>
        <MenuItem href="/dashboard/letters" icon={<LettersIcon />} onClick={close}>
          My letters
        </MenuItem>
        <MenuItem href="/dashboard/profile" icon={<AccountIcon />} onClick={close}>
          Profile
        </MenuItem>
        <MenuItem href="/dashboard/billing" icon={<BillingIcon />} onClick={close}>
          Billing / plan
        </MenuItem>
        <MenuItem href="/dashboard/settings" icon={<AccountIcon />} onClick={close}>
          Account settings
        </MenuItem>
        <div className="pnav-divider" />
        <form action={logoutAction}>
          <button className="pnav-item pnav-item--logout" type="submit">
            <span className="pnav-item__icon">
              <LogoutIcon />
            </span>
            <span>Log out</span>
          </button>
        </form>
      </div>
    </div>
  )
}
