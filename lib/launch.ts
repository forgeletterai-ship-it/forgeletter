/**
 * Single source of truth for the public launch moment.
 *
 * Until this instant:
 *   - the homepage splash shows the countdown,
 *   - login/signup pages redirect home and the signup API refuses,
 *   - the nav Login button and every "create account" CTA are hidden.
 *
 * At the instant it passes, all of the above reactivates by itself on
 * the next request — no deploy needed. To move the launch, change
 * this one constant.
 *
 * Set 2026-09-26 21:00 Sofia time so the countdown started at a
 * round 20 days when it went up on 2026-09-06.
 */
export const LAUNCH_AT = new Date("2026-09-26T21:00:00+03:00")

export function isPrelaunch(): boolean {
  return Date.now() < LAUNCH_AT.getTime()
}
