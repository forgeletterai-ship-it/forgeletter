"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { Brand } from "@/components/Brand"

type PlanTier = "regular" | "pro" | "ultra"
type MenuKey = "desktop" | "large-tablet" | "tablet"

type DashboardNavigationProps = {
  displayName: string
  initials: string
  planLabel: string
  planTier: PlanTier
  logoutAction: () => Promise<void>
}

function TierIcon({ tier }: { tier: PlanTier }) {
  if (tier === "ultra") {
    return (
      <svg aria-hidden="true" className="tier-icon tier-icon--ultra" viewBox="0 0 24 24">
        <path
          className="tier-icon__gem-fill"
          d="M6.7 4.4h10.6l4 5.2L12 20.2 2.7 9.6l4-5.2Z"
        />
        <path
          className="tier-icon__gem-line"
          d="M2.9 9.6h18.2M6.9 4.6l3 5 2.1-5 2.1 5 3-5M9.9 9.6 12 20l2.1-10.4M6.9 4.6 5.6 9.6M17.1 4.6l1.3 5"
        />
        <path
          className="tier-icon__gem-shine"
          d="M8.1 6.3h2.2M6.5 8.1h1.5"
        />
      </svg>
    )
  }

  if (tier === "pro") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 18.3h16v2.2H4v-2.2Z" />
        <path d="m4.8 16.4-1.3-9 5.3 4.1L12 4l3.2 7.5 5.3-4.1-1.3 9H4.8Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 12.3a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
      <path d="M5 20.2a7 7 0 0 1 14 0" />
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

function MenuDotsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function DownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" />
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

function SecurityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 21s7-3.6 7-10.3V5.6L12 3 5 5.6v5.1C5 17.4 12 21 12 21Z" />
      <path d="m9.5 11.8 1.8 1.8 3.5-3.8" />
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

function HelpIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9.2 9a3 3 0 1 1 5.2 2c-.9.8-1.8 1.3-2.1 2.8" />
      <path d="M12 17.5h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function DropdownDivider() {
  return <div className="dropdown-divider" />
}

function AccountMenuItem({
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
    <Link className="dropdown-item" href={href} onClick={onClick}>
      <span className="item-icon">{icon}</span>
      <span>{children}</span>
    </Link>
  )
}

function SheetItem({
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
    <Link className="sheet-item" href={href} onClick={onClick}>
      <span className="item-icon">{icon}</span>
      <span>{children}</span>
    </Link>
  )
}

export function DashboardNavigation({
  displayName,
  initials,
  planLabel,
  planTier,
  logoutAction,
}: DashboardNavigationProps) {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const cleanInitials = initials.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!openMenu && !mobileOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (openMenu && !headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null)
        setMobileOpen(false)
      }
    }

    function handleResize() {
      setOpenMenu(null)
      setMobileOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleResize)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleResize)
    }
  }, [mobileOpen, openMenu])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  function toggleMenu(menu: MenuKey) {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  function closeMenus() {
    setOpenMenu(null)
    setMobileOpen(false)
  }

  const planAriaLabel = `Manage ${planLabel} billing`

  return (
    <>
      <header className={`app-header app-header--${planTier}`} ref={headerRef}>
        <Brand dark />

        <nav className="account account-desktop" aria-label="Account navigation">
          <div className="desktop-profile-control">
            <span className="avatar avatar-sm desktop-profile-avatar" aria-hidden="true">
              {cleanInitials}
            </span>
            <button
              aria-expanded={openMenu === "desktop"}
              className="profile-trigger"
              type="button"
              onClick={() => toggleMenu("desktop")}
            >
              <span className="profile-name">{displayName}</span>
              <DownIcon />
            </button>
          </div>

          <Link className="plan-badge" href="/dashboard/billing" aria-label={planAriaLabel} onClick={closeMenus}>
            <span className="crown">
              <TierIcon tier={planTier} />
            </span>
            <span>{planLabel}</span>
          </Link>

          <div className={`dropdown dropdown-desktop${openMenu === "desktop" ? " is-open" : ""}`}>
            <AccountMenuItem href="/dashboard/settings" icon={<AccountIcon />} onClick={closeMenus}>
              Account settings
            </AccountMenuItem>
            <AccountMenuItem href="/dashboard/profile" icon={<AccountIcon />} onClick={closeMenus}>
              Profile
            </AccountMenuItem>
            <AccountMenuItem href="/dashboard/settings" icon={<SecurityIcon />} onClick={closeMenus}>
              Security
            </AccountMenuItem>
            <DropdownDivider />
            <form action={logoutAction}>
              <button className="dropdown-item logout" type="submit">
                <span className="item-icon">
                  <LogoutIcon />
                </span>
                <span>Log out</span>
              </button>
            </form>
          </div>
        </nav>

        <nav className="account account-large-tablet planSwitcherShell" aria-label="Compact account navigation">
          <div className="planSwitcherRail">
            <div className="planCell planCellAvatar">
              <span className="avatarRing" aria-hidden="true">
                <span className="avatarText">{cleanInitials}</span>
              </span>
            </div>

            <Link
              className="planCell planCellPlan isActive"
              href="/dashboard/billing"
              aria-label={planAriaLabel}
              onClick={closeMenus}
            >
              <span className="planIcon planIconSvg" aria-hidden="true">
                <TierIcon tier={planTier} />
              </span>
              <span className="planLabel">{planLabel}</span>
            </Link>

            <button
              aria-expanded={openMenu === "large-tablet"}
              className="planCell planCellMenu"
              type="button"
              aria-label="More"
              onClick={() => toggleMenu("large-tablet")}
            >
              <span className="dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>

          <div className={`dropdown dropdown-large-tablet${openMenu === "large-tablet" ? " is-open" : ""}`}>
            <AccountMenuItem href="/dashboard/settings" icon={<AccountIcon />} onClick={closeMenus}>
              Account settings
            </AccountMenuItem>
            <AccountMenuItem href="/contact" icon={<HelpIcon />} onClick={closeMenus}>
              Help & support
            </AccountMenuItem>
            <DropdownDivider />
            <form action={logoutAction}>
              <button className="dropdown-item logout" type="submit">
                <span className="item-icon">
                  <LogoutIcon />
                </span>
                <span>Log out</span>
              </button>
            </form>
          </div>
        </nav>

        <nav className="account account-tablet" aria-label="Tablet account navigation">
          <button
            aria-expanded={openMenu === "tablet"}
            className="tablet-pill"
            type="button"
            onClick={() => toggleMenu("tablet")}
          >
            <span className="tablet-initials">{cleanInitials}</span>
            <span className="tablet-divider" />
            <span className="crown">
              <TierIcon tier={planTier} />
            </span>
            <span>{planLabel}</span>
          </button>

          <div className={`dropdown dropdown-tablet${openMenu === "tablet" ? " is-open" : ""}`}>
            <p className="signed-in">Signed in as {displayName}</p>
            <DropdownDivider />
            <AccountMenuItem href="/dashboard/settings" icon={<AccountIcon />} onClick={closeMenus}>
              Account settings
            </AccountMenuItem>
            <AccountMenuItem href="/dashboard/billing" icon={<BillingIcon />} onClick={closeMenus}>
              Billing / plan
            </AccountMenuItem>
            <AccountMenuItem href="/contact" icon={<HelpIcon />} onClick={closeMenus}>
              Help
            </AccountMenuItem>
            <DropdownDivider />
            <form action={logoutAction}>
              <button className="dropdown-item logout" type="submit">
                <span className="item-icon">
                  <LogoutIcon />
                </span>
                <span>Log out</span>
              </button>
            </form>
          </div>
        </nav>

        <nav className="account account-mobile" aria-label="Mobile account navigation">
          <button
            aria-expanded={mobileOpen}
            className="mobile-avatar-button"
            type="button"
            onClick={() => setMobileOpen(true)}
          >
            <span className="avatar avatar-md" aria-hidden="true">
              {cleanInitials}
            </span>
          </button>
        </nav>
      </header>

      <button
        aria-label="Close account menu"
        className={`mobile-overlay${mobileOpen ? " is-open" : ""}`}
        type="button"
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`mobile-sheet${mobileOpen ? " is-open" : ""}`} aria-hidden={!mobileOpen}>
        <div className="sheet-handle" />

        <div className="sheet-profile">
          <span className="avatar avatar-lg" aria-hidden="true">
            {cleanInitials}
          </span>
          <div>
            <p className="sheet-name">{displayName}</p>
            <p className="sheet-plan">
              <span className="crown">
                <TierIcon tier={planTier} />
              </span>
              {planLabel}
            </p>
          </div>
        </div>

        <div className="sheet-divider" />

        <SheetItem href="/dashboard/settings" icon={<AccountIcon />} onClick={closeMenus}>
          Account settings
        </SheetItem>
        <SheetItem href="/dashboard/billing" icon={<BillingIcon />} onClick={closeMenus}>
          Billing / plan
        </SheetItem>

        <div className="sheet-divider" />

        <form action={logoutAction}>
          <button className="sheet-item sheet-logout" type="submit">
            <span className="item-icon">
              <LogoutIcon />
            </span>
            <span>Log out</span>
          </button>
        </form>
      </aside>
    </>
  )
}
