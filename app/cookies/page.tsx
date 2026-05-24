import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Cookie policy — ForgeLetter",
  description:
    "What cookies ForgeLetter uses, why each one exists, and how you can change your choices at any time.",
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="ForgeLetter only sets the cookies it needs to keep your account, sessions and payments working. You decide whether to enable anything beyond that. You can change your choices at any time from the Cookie preferences link in the footer."
      sections={[
        {
          title: "What cookies are",
          body: "Cookies are small text files a site stores in your browser. They are how a site recognises you between page loads, keeps you signed in, and remembers preferences. Some are essential. Most are not.",
        },
        {
          title: "How we ask for your consent",
          body: "On your first visit you will see a banner with three equally prominent options: Accept all, Reject all, and Customize. Strictly necessary cookies are always on because the site cannot function without them. Every other category defaults to off until you opt in. Your choice is stored in a cookie called fl_cookie_consent for 182 days, after which we will ask again.",
        },
        {
          title: "Strictly necessary",
          body: "Required for ForgeLetter to work. These cannot be disabled.",
          points: [
            "next-auth.session-token — keeps you signed in to your account (HTTP-only, secure, JWT).",
            "next-auth.csrf-token — protects sign-in and account actions from cross-site request forgery.",
            "next-auth.callback-url — temporarily stores the URL to return to after sign-in.",
            "__Host-* / __Secure-* prefixed variants of the above on production HTTPS.",
            "__stripe_mid / __stripe_sid — set by Stripe on the secure checkout page to detect fraud during payment.",
            "fl_cookie_consent — stores the consent choice you make from the banner.",
          ],
        },
        {
          title: "Functional",
          body: "Off by default. Used to remember preferences like your saved template choice and locale. Improves the experience on return visits but the site works without them.",
        },
        {
          title: "Analytics",
          body: "Off by default. Aggregated, privacy-conscious usage data so we can see which features help and which confuse. We do not link this to your account. No analytics provider is currently active — this category is reserved so any future integration can only run after you opt in.",
        },
        {
          title: "Marketing",
          body: "Off by default. Used to measure campaign effectiveness or to show ForgeLetter on other sites. No marketing pixel is currently active — this category exists so we cannot quietly turn one on later without your permission.",
        },
        {
          title: "Sign-in with Google or Facebook",
          body: "If you sign in via Google or Facebook, those providers will set their own cookies in your browser during the OAuth flow. They are governed by Google and Facebook's own privacy and cookie policies. ForgeLetter never sees the password you use with those providers.",
        },
        {
          title: "Changing your mind",
          body: "Open the Cookie preferences link in the footer at any time to update your choices. You can also delete the fl_cookie_consent cookie in your browser settings to reset the banner. Browser settings also let you block or delete cookies for any site individually.",
        },
        {
          title: "Updates",
          body: "If we add a new cookie or tracker we will increment the policy revision and re-prompt you. This page lists the current state — if any cookie is set that is not described here, it is a bug and we want to know.",
        },
      ]}
    />
  )
}
