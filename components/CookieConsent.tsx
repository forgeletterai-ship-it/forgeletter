"use client"

import { useEffect, useRef } from "react"
import * as CC from "vanilla-cookieconsent"
import "vanilla-cookieconsent/dist/cookieconsent.css"

/**
 * GDPR / ePrivacy / CCPA / LGPD compliant consent banner.
 *
 * - Necessary cookies are always on (NextAuth session, CSRF, Stripe).
 * - Functional / Analytics / Marketing default to OFF until the user opts in.
 * - Accept all and Reject all are equally prominent.
 * - User can re-open preferences anytime via any element with the
 *   `data-cc="show-preferencesModal"` attribute (see CookiePreferencesLink).
 * - Consent is logged with a version + timestamp; bumping CONSENT_VERSION
 *   triggers a re-prompt the next time the user lands on the site.
 */

const CONSENT_VERSION = 1

export function CookieConsentProvider() {
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    // Expose CookieConsent on window so footer links and gating helpers
    // can call showPreferences/acceptCategory without re-importing the
    // module (which would tree-shake into a separate chunk).
    ;(window as Window & { CookieConsent?: typeof CC }).CookieConsent = CC
    CC.run({
      revision: CONSENT_VERSION,
      autoShow: true,
      hideFromBots: true,
      disablePageInteraction: false,
      guiOptions: {
        consentModal: {
          layout: "box inline",
          position: "bottom left",
          equalWeightButtons: true,
          flipButtons: false,
        },
        preferencesModal: {
          layout: "box",
          equalWeightButtons: true,
          flipButtons: false,
        },
      },
      cookie: {
        name: "fl_cookie_consent",
        expiresAfterDays: 182,
        sameSite: "Lax",
      },
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        functional: {
          enabled: false,
          readOnly: false,
        },
        analytics: {
          enabled: false,
          readOnly: false,
        },
        marketing: {
          enabled: false,
          readOnly: false,
        },
      },
      language: {
        default: "en",
        translations: {
          en: {
            consentModal: {
              title: "We use cookies",
              description:
                "We use cookies to keep your session secure and to power checkout. We will only set analytics or marketing cookies if you choose to allow them. You can change your mind any time from the footer.",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              showPreferencesBtn: "Customize",
              footer:
                '<a href="/privacy">Privacy policy</a> · <a href="/cookies">Cookie policy</a>',
            },
            preferencesModal: {
              title: "Cookie preferences",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              savePreferencesBtn: "Save preferences",
              closeIconLabel: "Close modal",
              serviceCounterLabel: "Service|Services",
              sections: [
                {
                  title: "Your privacy matters",
                  description:
                    "ForgeLetter only sets the cookies it needs to keep your account, sessions, and payments working. You decide whether to enable anything beyond that.",
                },
                {
                  title: "Strictly necessary",
                  description:
                    "Required for the site to work — secure login session (NextAuth), CSRF protection, and Stripe checkout. These cannot be turned off because the site will not function without them.",
                  linkedCategory: "necessary",
                },
                {
                  title: "Functional",
                  description:
                    "Remembers preferences like your saved template choice and locale. Not required, but improves the experience on return visits.",
                  linkedCategory: "functional",
                },
                {
                  title: "Analytics",
                  description:
                    "Aggregated, privacy-conscious usage data so we can see which features are useful and which are confusing. We do not link this to your account.",
                  linkedCategory: "analytics",
                },
                {
                  title: "Marketing",
                  description:
                    "Used to measure the effectiveness of campaigns or to show ForgeLetter on other sites. None are enabled right now — this category exists so we cannot quietly turn it on later without your permission.",
                  linkedCategory: "marketing",
                },
                {
                  title: "More information",
                  description:
                    'Full details live in our <a href="/cookies">Cookie policy</a> and <a href="/privacy">Privacy policy</a>.',
                },
              ],
            },
          },
        },
      },
      onConsent: ({ cookie }) => {
        if (typeof window !== "undefined") {
          ;(window as Window & { __flConsent?: typeof cookie }).__flConsent = cookie
          window.dispatchEvent(new CustomEvent("fl:consent", { detail: cookie }))
        }
      },
      onChange: ({ cookie }) => {
        if (typeof window !== "undefined") {
          ;(window as Window & { __flConsent?: typeof cookie }).__flConsent = cookie
          window.dispatchEvent(new CustomEvent("fl:consent", { detail: cookie }))
        }
      },
    })
  }, [])

  return null
}
