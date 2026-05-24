"use client"

import * as CC from "vanilla-cookieconsent"

/**
 * Footer link that re-opens the cookie preferences modal.
 * Renders as a plain anchor so it sits naturally inside FooterColumn.
 */
export function CookiePreferencesLink({
  className,
  children = "Cookie preferences",
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <a
      href="#cookie-preferences"
      className={className}
      onClick={(event) => {
        event.preventDefault()
        CC.showPreferences()
      }}
    >
      {children}
    </a>
  )
}
