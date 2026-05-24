/**
 * Cookie-consent gating helpers.
 *
 * Use these before loading any non-essential script (analytics, marketing
 * pixels, third-party embeds that set cookies, etc.). The categories match
 * the configuration in components/CookieConsent.tsx.
 *
 * Example:
 *
 *   import { hasConsent, onConsentChange } from "@/lib/consent"
 *
 *   if (hasConsent("analytics")) loadAnalytics()
 *   onConsentChange((c) => { if (c.includes("analytics")) loadAnalytics() })
 */

export type ConsentCategory = "necessary" | "functional" | "analytics" | "marketing"

type StoredConsent = {
  categories?: ConsentCategory[]
  services?: Record<string, string[]>
  revision?: number
  data?: unknown
  consentTimestamp?: string
  consentId?: string
}

function read(): StoredConsent | null {
  if (typeof window === "undefined") return null
  const stored = (window as Window & { __flConsent?: StoredConsent }).__flConsent
  if (stored) return stored
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("fl_cookie_consent="))
      ?.split("=")[1]
    if (!raw) return null
    return JSON.parse(decodeURIComponent(raw)) as StoredConsent
  } catch {
    return null
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true
  const consent = read()
  return Boolean(consent?.categories?.includes(category))
}

export function onConsentChange(
  handler: (categories: ConsentCategory[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {}
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<StoredConsent>).detail
    handler((detail?.categories ?? []) as ConsentCategory[])
  }
  window.addEventListener("fl:consent", listener)
  const current = read()?.categories as ConsentCategory[] | undefined
  if (current) handler(current)
  return () => window.removeEventListener("fl:consent", listener)
}
