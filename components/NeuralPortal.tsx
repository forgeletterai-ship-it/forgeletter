"use client"

import { useEffect } from "react"

import { startNeuralPortal } from "@/components/neural-portal-engine"

/* The hero's neural portal — the bevelled frame and dark aperture from
   the approved standalone design, with the canvas sphere animated by
   neural-portal-engine.ts. This wrapper only supplies the DOM the
   engine expects (ids `scene`, `net`, `hint`) and the mount/unmount
   lifecycle; all sizing lives in globals.css under .hero-portal. */
export default function NeuralPortal() {
  useEffect(() => startNeuralPortal(), [])

  return (
    <div
      className="hero-portal"
      role="img"
      aria-label="Interactive neural network of ForgeLetter's AI agents"
    >
      {/* DOM order matters: .scene first, then four .wall (plaster
          reveal, overlaying the scene edges), then four .wall2
          (bronze profile). Per frame-and-background-specs.md. */}
      <div className="frame">
        <div className="scene" id="scene">
          <canvas id="net" aria-hidden="true" />
          <div className="core">
            <span />
            ORCHESTRATOR
          </div>
          <div className="hint" id="hint">
            Drag to rotate
          </div>
        </div>
        <div className="wall wt" aria-hidden="true" />
        <div className="wall wb" aria-hidden="true" />
        <div className="wall wl" aria-hidden="true" />
        <div className="wall wr" aria-hidden="true" />
        <div className="wall2 wt" aria-hidden="true" />
        <div className="wall2 wb" aria-hidden="true" />
        <div className="wall2 wl" aria-hidden="true" />
        <div className="wall2 wr" aria-hidden="true" />
      </div>
    </div>
  )
}
