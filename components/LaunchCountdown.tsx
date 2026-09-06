"use client"

import { useEffect, useState } from "react"

/* Ticking countdown tiles for the pre-launch splash. Values are only
   computed client-side (first paint shows em dashes) so server and
   client markup never disagree. When the moment passes the tiles
   give way to a plain "live" line — the auth gates in lib/launch.ts
   open on their own at the same instant. */
export function LaunchCountdown({ launchAtMs }: { launchAtMs: number }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const remaining = now === null ? null : Math.max(0, launchAtMs - now)

  if (remaining === 0) {
    return <p className="launch-countdown__live">ForgeLetter is live.</p>
  }

  const parts =
    remaining === null
      ? [
          { value: "—", label: "Days" },
          { value: "—", label: "Hours" },
          { value: "—", label: "Minutes" },
          { value: "—", label: "Seconds" },
        ]
      : (() => {
          const totalSeconds = Math.floor(remaining / 1000)
          const days = Math.floor(totalSeconds / 86400)
          const hours = Math.floor((totalSeconds % 86400) / 3600)
          const minutes = Math.floor((totalSeconds % 3600) / 60)
          const seconds = totalSeconds % 60
          const pad = (n: number) => String(n).padStart(2, "0")
          return [
            { value: String(days), label: "Days" },
            { value: pad(hours), label: "Hours" },
            { value: pad(minutes), label: "Minutes" },
            { value: pad(seconds), label: "Seconds" },
          ]
        })()

  return (
    <div className="launch-countdown" role="timer" aria-label="Time until launch">
      {parts.map((part) => (
        <div className="launch-countdown__tile" key={part.label}>
          <strong>{part.value}</strong>
          <span>{part.label}</span>
        </div>
      ))}
    </div>
  )
}
