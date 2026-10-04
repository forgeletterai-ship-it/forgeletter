"use client"

import { useEffect } from "react"

/* Pre-launch client helper for the landing page, two jobs:
 *
 * 1. Every LOAD starts at the top (the splash with the countdown) on
 *    every device: strips a shared #explore anchor from the URL and
 *    disables browser scroll restoration. In-page anchor clicks
 *    afterwards behave normally.
 *
 * 2. Publishes the REAL nav height as --nav-h on :root. The splash
 *    sizes itself as viewport minus nav; a hardcoded constant broke
 *    whenever a browser's font metrics rendered the nav a few px
 *    taller (gap above the eyebrow, sneak-peek arrow clipped). The
 *    ResizeObserver keeps it exact across font loads, orientation
 *    changes and window resizes. */
export function ScrollToTopOnLoad() {
  useEffect(() => {
    if (window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      )
    }
    try {
      window.history.scrollRestoration = "manual"
    } catch {
      /* older browsers: scrollTo below still runs */
    }
    window.scrollTo(0, 0)

    const nav = document.querySelector(".site-nav")
    if (!nav) return
    const publish = () => {
      const h = Math.ceil(nav.getBoundingClientRect().height)
      if (h > 0) {
        document.documentElement.style.setProperty("--nav-h", `${h}px`)
      }
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  return null
}
