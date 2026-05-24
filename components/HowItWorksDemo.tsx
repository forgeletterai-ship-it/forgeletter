"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/**
 * Embedded animated walkthrough on the landing page's "How it works"
 * section.
 *
 * The wrapper gives the iframe a real, stable 16:9 box via
 * aspect-ratio (with padding-top: 56.25% fallback via @supports in
 * globals.css). The iframe inside fills the box at width:100%
 * height:100%. That stable measurable box is exactly what the
 * demo's fit() function needs to compute the right scale.
 *
 * The iframe src is set directly on render (no IntersectionObserver,
 * no swap-to-about:blank). loading="lazy" lets the browser defer the
 * network fetch when the frame is far off-screen, but otherwise the
 * iframe is just a normal iframe.
 *
 * The demo HTML file itself is hardened to re-measure aggressively:
 * fit() runs on requestAnimationFrame, document.fonts.ready, window
 * load, a ResizeObserver on body+documentElement, five staggered
 * setTimeout calls (50/150/300/600/1200ms), and at the top of every
 * animation loop iteration. Any iframe-height settling pattern is
 * caught.
 *
 * Accessibility: prefers-reduced-motion shows a static fallback panel.
 */

const DEMO_SRC = "/forgeletter_demo.html?v=19"
const FALLBACK_IMAGE = "/hero-image-transparent.png"

interface Props {
  /** Optional override for the iframe's max width (default 1200px). */
  maxWidthPx?: number
  /** Optional border radius (default 14px). */
  radiusPx?: number
}

export function HowItWorksDemo({ maxWidthPx = 1200, radiusPx = 14 }: Props) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [userOptedIn, setUserOptedIn] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  // Force the iframe's fit() to re-run whenever the wrapper resizes
  // (e.g. media-query breakpoint changes, orientation, browser resize).
  // The internal ResizeObserver inside the demo HTML isn't 100% reliable
  // across browsers when the iframe's outer box changes via CSS.
  useEffect(() => {
    if (typeof window === "undefined") return
    const wrap = wrapperRef.current
    if (!wrap) return
    const refit = () => {
      const win = iframeRef.current?.contentWindow
      if (!win) return
      try {
        win.dispatchEvent(new Event("resize"))
      } catch {
        /* cross-origin or not ready yet — ignore */
      }
    }
    const ro = new ResizeObserver(refit)
    ro.observe(wrap)
    window.addEventListener("resize", refit)
    window.addEventListener("orientationchange", refit)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", refit)
      window.removeEventListener("orientationchange", refit)
    }
  }, [])

  const showFallback = prefersReducedMotion && !userOptedIn

  return (
    <div
      ref={wrapperRef}
      className="how-it-works-demo"
      style={{
        width: "100%",
        maxWidth: maxWidthPx,
        margin: "0 auto",
        position: "relative",
        borderRadius: radiusPx,
        overflow: "hidden",
        boxShadow:
          "0 18px 36px -16px rgba(40, 26, 12, 0.22), 0 2px 8px -4px rgba(40, 26, 12, 0.08)",
        background: "#FAF6EE",
        // aspect-ratio (modern) / padding-top: 56.25% (fallback) are
        // applied via the .how-it-works-demo class in globals.css so
        // we don't accidentally double-apply both methods here.
      }}
      role="region"
      aria-label="ForgeLetter how-it-works animation"
    >
      {showFallback ? (
        <FallbackPanel onPlay={() => setUserOptedIn(true)} />
      ) : (
        <iframe
          ref={iframeRef}
          src={DEMO_SRC}
          title="Animated walkthrough of how ForgeLetter works"
          loading="lazy"
          // position:absolute so the iframe fills the wrapper whether
          // the wrapper's height comes from aspect-ratio (modern) or
          // padding-top:56.25% (fallback).
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
