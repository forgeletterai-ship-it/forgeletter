"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/**
 * Embedded animated walkthrough on the landing page's "How it works"
 * section. The animation itself is a self-contained HTML file at
 * /public/forgeletter_demo.html (its own CSS reset, fonts, JS) — kept
 * isolated inside an iframe so its globals can't collide with the site.
 *
 * Performance contract (the demo loops at 60fps 24/7):
 *  - The iframe never loads until it scrolls into view.
 *  - When it leaves the viewport for >2s we detach the src ("about:
 *    blank") so the browser stops running its rAF loop. We restore
 *    src when it scrolls back in.
 *
 * Accessibility:
 *  - Descriptive title for screen readers.
 *  - When prefers-reduced-motion is set, we render a static fallback
 *    image instead of auto-playing animation, with a "Play animation"
 *    button users can opt into.
 */

const DEMO_SRC = "/forgeletter_demo.html"
const DETACH_AFTER_OUT_OF_VIEW_MS = 2_000
const FALLBACK_IMAGE = "/hero-image-transparent.png"

interface Props {
  /** Optional override for the iframe's max width (default 1200px). */
  maxWidthPx?: number
  /** Optional border radius (default 14px). */
  radiusPx?: number
}

export function HowItWorksDemo({ maxWidthPx = 1200, radiusPx = 14 }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const detachTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // True once the section has scrolled into view. After that the iframe
  // has its src set. We toggle the src on/off based on visibility for
  // CPU savings but track this so we know whether the user has ever
  // seen the demo (used to skip the autoplay altogether under reduced
  // motion).
  const [activated, setActivated] = useState(false)

  // Reduced-motion handling. We don't auto-load the iframe when the
  // user prefers reduced motion — they get a static image and a play
  // button.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [userOptedIn, setUserOptedIn] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  // IntersectionObserver: load + unload the iframe based on visibility.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    // If reduced motion is active and user hasn't opted in, don't
    // attach the observer at all — the static fallback stays.
    if (prefersReducedMotion && !userOptedIn) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (detachTimer.current) {
              clearTimeout(detachTimer.current)
              detachTimer.current = null
            }
            // Mount the demo. Setting state triggers the iframe render
            // with the real src — the wrapper's space is already reserved
            // by the 16:9 box so there's no layout shift.
            setActivated(true)
            const iframe = iframeRef.current
            if (iframe && iframe.src !== window.location.origin + DEMO_SRC) {
              // Re-attach the demo if we previously swapped it out.
              iframe.src = DEMO_SRC
            }
          } else {
            // Schedule detach after a short delay so a quick scroll
            // past doesn't unnecessarily kill+re-load the animation.
            if (!detachTimer.current && iframeRef.current) {
              detachTimer.current = setTimeout(() => {
                const iframe = iframeRef.current
                if (iframe) {
                  // about:blank stops the inner JS/animation loop
                  // immediately and releases CPU.
                  iframe.src = "about:blank"
                }
                detachTimer.current = null
              }, DETACH_AFTER_OUT_OF_VIEW_MS)
            }
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (detachTimer.current) {
        clearTimeout(detachTimer.current)
        detachTimer.current = null
      }
    }
  }, [prefersReducedMotion, userOptedIn])

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: maxWidthPx,
    margin: "0 auto",
    aspectRatio: "16 / 9",
    position: "relative",
    borderRadius: radiusPx,
    overflow: "hidden",
    // Light, subtle elevation — no heavy frame. The demo's own body
    // background fills the wrapper edge-to-edge.
    boxShadow:
      "0 18px 36px -16px rgba(40, 26, 12, 0.22), 0 2px 8px -4px rgba(40, 26, 12, 0.08)",
    // Match the demo's body background colour so any pixel gap at the
    // edges blends invisibly. The iframe sits inside this directly.
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
      ) : (
        <iframe
          ref={iframeRef}
          // Only set src once activated. Before that the iframe is empty
          // and uses zero network/CPU. `loading="lazy"` also prevents
          // network on initial paint even when we set src.
          src={activated ? DEMO_SRC : undefined}
          title="Animated walkthrough of how ForgeLetter works"
          loading="lazy"
          // Sandbox: we control the demo file, but isolate it anyway.
          // - allow-scripts: the demo needs JS to animate
          // - same-origin so it can read its own font @import URLs from
          //   googleapis (the demo's CSS imports them)
          sandbox="allow-scripts allow-same-origin"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
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
