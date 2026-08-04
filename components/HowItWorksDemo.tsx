"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/**
 * Two embedded walkthroughs on the landing page's "How it works"
 * section, switched by a tab pair:
 *   1. Set up & generate — profile → wins → brief → letter
 *   2. Track your letters — library, inline actions, outcome tracking
 *
 * Zero switch latency by design: BOTH iframes are mounted and loaded
 * up front, stacked in the same box. Switching only flips opacity and
 * z-index, so there is no network request or re-layout on click.
 * Because a hidden iframe would otherwise keep animating, the
 * inactive one is paused via postMessage — the demo HTML gates its
 * sleep() on that flag, so only the visible demo consumes CPU.
 *
 * The frame itself is unchanged: the wrapper is still a 16:9 box (via
 * .how-it-works-demo in globals.css) holding a 1280x720 stage, and
 * each demo scales itself into it with the same fit() routine.
 *
 * Accessibility: prefers-reduced-motion shows a static fallback panel.
 */

const DEMOS = [
  {
    id: "workflow",
    label: "Set up & generate",
    hint: "Profile, wins, brief, letter",
    src: "/forgeletter_demo.html?v=24",
    title: "Animated walkthrough of building a profile and generating a letter",
  },
  {
    id: "letters",
    label: "Track your letters",
    hint: "Library, actions, outcomes",
    src: "/myletters_demo.html?v=1",
    title: "Animated walkthrough of the letters library and outcome tracking",
  },
] as const

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
  const [active, setActive] = useState<(typeof DEMOS)[number]["id"]>("workflow")
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const frameRefs = useRef<Record<string, HTMLIFrameElement | null>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  // Pause every demo except the visible one. Runs on mount too, so the
  // second demo never animates until it is first shown.
  useEffect(() => {
    for (const demo of DEMOS) {
      const win = frameRefs.current[demo.id]?.contentWindow
      if (!win) continue
      try {
        win.postMessage({ fl: demo.id === active ? "resume" : "pause" }, "*")
      } catch {
        /* not ready yet — the load handler re-sends */
      }
    }
  }, [active])

  // Force each iframe's fit() to re-run whenever the wrapper resizes
  // (media-query breakpoint changes, orientation, browser resize).
  useEffect(() => {
    if (typeof window === "undefined") return
    const wrap = wrapperRef.current
    if (!wrap) return
    const refit = () => {
      for (const demo of DEMOS) {
        const win = frameRefs.current[demo.id]?.contentWindow
        if (!win) continue
        try {
          win.dispatchEvent(new Event("resize"))
        } catch {
          /* cross-origin or not ready yet — ignore */
        }
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
    <div style={{ width: "100%", maxWidth: maxWidthPx, margin: "0 auto" }}>
      <div className="demo-tabs" role="tablist" aria-label="Choose a walkthrough">
        {DEMOS.map((demo) => (
          <button
            key={demo.id}
            id={`demo-tab-${demo.id}`}
            role="tab"
            type="button"
            aria-selected={active === demo.id}
            aria-controls={`demo-panel-${demo.id}`}
            className={`demo-tab${active === demo.id ? " is-active" : ""}`}
            onClick={() => setActive(demo.id)}
          >
            <span className="demo-tab__label">{demo.label}</span>
            <span className="demo-tab__hint">{demo.hint}</span>
          </button>
        ))}
      </div>

      <div
        ref={wrapperRef}
        className="how-it-works-demo"
        style={{
          width: "100%",
          margin: "0 auto",
          position: "relative",
          borderRadius: radiusPx,
          overflow: "hidden",
          boxShadow:
            "0 18px 36px -16px rgba(40, 26, 12, 0.22), 0 2px 8px -4px rgba(40, 26, 12, 0.08)",
          background: "#FAF6EE",
        }}
      >
        {showFallback ? (
          <FallbackPanel onPlay={() => setUserOptedIn(true)} />
        ) : (
          DEMOS.map((demo) => {
            const isActive = active === demo.id
            return (
              <iframe
                key={demo.id}
                id={`demo-panel-${demo.id}`}
                role="tabpanel"
                aria-labelledby={`demo-tab-${demo.id}`}
                aria-hidden={!isActive}
                ref={(node) => {
                  frameRefs.current[demo.id] = node
                }}
                src={demo.src}
                title={demo.title}
                onLoad={() => {
                  // Re-assert pause state once the frame can receive it.
                  try {
                    frameRefs.current[demo.id]?.contentWindow?.postMessage(
                      { fl: isActive ? "resume" : "pause" },
                      "*"
                    )
                  } catch {
                    /* ignore */
                  }
                }}
                // Both frames stay in layout (never display:none) so each
                // one measures its own box correctly for scaling.
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 2 : 1,
                  pointerEvents: isActive ? "auto" : "none",
                  transition: "opacity 0.28s ease",
                }}
              />
            )
          })
        )}
      </div>
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
