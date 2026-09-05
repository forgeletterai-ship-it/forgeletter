"use client"

import type { Quadrant as QuadrantType } from "@/lib/swap/types"

/** Result beat 3 — the 2×2, with the letter's cell lit. */

const CELLS: { id: QuadrantType; label: string }[] = [
  { id: "FLATTERY", label: "FLATTERY — all them, no proof" },
  { id: "TARGETED", label: "TARGETED — both sides specific" },
  { id: "FILLER", label: "FILLER — neither" },
  { id: "CREDENTIALS", label: "CREDENTIALS — all proof, no them" },
]

export default function Quadrant({ active }: { active: QuadrantType }) {
  return (
    <div className="swap-block">
      <h3>Where this letter lands</h3>
      <div className="swap-quadrant" role="img" aria-label={`Quadrant: ${active}`}>
        {CELLS.map((c) => (
          <div key={c.id} className={c.id === active ? "swap-quadrant--active" : undefined}>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}
