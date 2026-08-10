/**
 * Analytics event dispatcher (§6.1 — names are contracts). No
 * analytics backend is wired on the site today, so events push to
 * window.dataLayer (picked up by GTM/GA the moment one is added)
 * and mirror to a DOM CustomEvent for anything homegrown.
 */

export type SwapEvent =
  | "demo_completed"
  | "demo_cta_clicked"
  | "scan_started"
  | "scan_completed"
  | "scan_blocked"
  | "account_created"
  | "wall_viewed"
  | "wall_cta_clicked"
  | "share_clicked"
  | "outcome_email_sent"
  | "outcome_responded"
  | "generator_cta_clicked"

export function track(event: SwapEvent, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return
  const w = window as unknown as { dataLayer?: Record<string, unknown>[] }
  ;(w.dataLayer ??= []).push({ event, ...props })
  window.dispatchEvent(new CustomEvent("fl-analytics", { detail: { event, ...props } }))
}
