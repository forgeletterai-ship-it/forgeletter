"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/**
 * Embedded animated walkthrough for the landing page's "How it works"
 * section. The animation lives at /public/forgeletter_demo.html — a
 * self-contained file with its own CSS reset and JS. We isolate it
 * inside an iframe so its globals can't collide with the site's.
 *
 * Design notes:
 *   - The demo file is used AS-IS, no modifications. It works perfectly
 *     when loaded standalone, so we don't touch it.
 *   - The iframe is set up exactly ONCE on first viewport intersection,
 *     then left alone. We deliberately do NOT detach the iframe when it
 *     scrolls out of view — the previous version of this component did,
 *     and the constant reload restarted the animation mid-scene which
 *     looked broken on the screen.
 *   - prefers-reduced-motion: the iframe doesn't auto-load; users see a
 *     static fallback panel with an explicit Play button.
 *
 * Layout:
 *   - 16:9 lock via padding-top: 56.25% (more reliable than CSS
 *     aspect-ratio inside grid cells that align-items:center).
 *   - Iframe positioned absolute inset:0 so it always exactly fills
 *     the 16:9 box.
 */

const DEMO_SRC = "/forgeletter_demo.html"
const FALLBACK_IMAGE = "/hero-image-transparent.png"

interface Props {
  /** Optional override for the iframe's max width (default 1200px). */
  maxWidthPx?: number
  /** Optional border radius (default 14px). */
  radiusPx?: number
}

export function HowItWorksDemo({ maxWidthPx = 1200, radiusPx = 14 }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Has the demo been activated (loaded) yet? Flipped to true the first
  // time the wrapper intersects the viewport. After that we never flip
  // it back — once loaded, the demo just keeps running.
  const [activated, setActivated] = useState(false)

  // Reduced-motion handling.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [userOptedIn, setUserOptedIn] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  // IntersectionObserver — single-shot. As soon as the wrapper enters
  // the viewport we activate the iframe and stop observing.
  useEffect(() => {
    if (activated) return
    if (prefersReducedMotion && !userOptedIn) return

    const el = wrapperRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActivated(true)
            observer.disconnect()
            return
          }
        }
      },
      { rootMargin: "300px 0px", threshold: 0.01 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [activated, prefersReducedMotion, userOptedIn])

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: maxWidthPx,
    margin: "0 auto",
    position: "relative",
    paddingTop: "56.25%", // 9 / 16
    borderRadius: radiusPx,
    overflow: "hidden",
    boxShadow:
      "0 18px 36px -16px rgba(40, 26, 12, 0.22), 0 2px 8px -4px rgba(40, 26, 12, 0.08)",
    // Match the demo's body background so any sub-pixel seam between
    // the iframe and our wrapper is invisible.
    background: "#efe9dd",
  }

  const showFallback = prefersReducedMotion && !userOptedIn

  return (
    <div
      ref={wrapperRef}
      className="how-it-works-demo"
      style={wrapperStyle}
      role="region"
      aria-label="ForgeLetter how-it-works animation"
    >
      {showFallback ? (
        <FallbackPanel onPlay={() => setUserOptedIn(true)} />
      ) : activated ? (
        // Render the iframe ONLY after activation. Once mounted, we
        // never change its src again — React's reconciliation keeps
        // the iframe element stable so the animation runs uninterrupted.
        <iframe
          src={DEMO_SRC}
          title="Animated walkthrough of how ForgeLetter works"
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
      ) : (
        // Pre-activation placeholder — keeps the 16:9 space reserved
        // (already handled by the wrapper) and shows a faint hint of
        // what's coming so the empty area doesn't look broken.
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#9b9384",
            fontSize: 14,
            letterSpacing: "0.04em",
          }}
        >
          Loading walkthrough…
        </div>
      )}
    </div>
  )
}

function FallbackPanel({ onPlay }: { onPlay: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 18,
        background: "linear-gradient(135deg, #0F3D3E 0%, #1A5253 100%)",
        color: "#FCF6EB",
        padding: 24,
        textAlign: "center",
      }}
    >
      <Image
        src={FALLBACK_IMAGE}
        alt=""
        width={420}
        height={280}
        style={{
          maxWidth: "70%",
          height: "auto",
          opacity: 0.92,
          filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.25))",
        }}
        priority={false}
      />
      <div style={{ maxWidth: 460 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "#E0C47C",
          }}
        >
          ANIMATION PAUSED
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: "rgba(252, 246, 235, 0.86)",
          }}
        >
          Looks like you prefer reduced motion. Click below to start the
          animated walkthrough — or skip it; the steps are explained on
          the left.
        </p>
      </div>
      <button
        type="button"
        onClick={onPlay}
        style={{
          padding: "10px 22px",
          background: "#C9A961",
          color: "#0F3D3E",
          border: 0,
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(201, 169, 97, 0.35)",
        }}
      >
        Play animation
      </button>
    </div>
  )
}
