import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Privacy policy — ForgeLetter",
  description:
    "What data ForgeLetter collects, why, who we share it with, how long we keep it, and the rights you have over it.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This policy explains what data ForgeLetter collects, why, who it is shared with, how long it is kept, and the rights you have over it. It is written to satisfy the GDPR, the UK GDPR, the ePrivacy Directive, the CCPA / CPRA and the LGPD."
      sections={[
        {
          title: "Who we are",
          body: "ForgeLetter (\"we\", \"us\") is the data controller for the personal data described in this policy. The contact address for privacy enquiries is on the Contact page.",
        },
        {
          title: "What we collect",
          body: "We collect only what is needed to run the product:",
          points: [
            "Account data: name, email address, hashed password (or the OAuth identifier if you sign in with Google or Facebook).",
            "Application content: the resume snippets, employer / internship / university entries and cover-letter drafts you save.",
            "Generation inputs: the job description text and the prompt parameters you submit to the AI pipeline.",
            "Billing identifiers: a Stripe customer ID and subscription metadata. Raw card numbers are handled by Stripe and never reach our servers.",
            "Technical data: IP address, user-agent and request timestamps in standard server logs (kept 30 days).",
            "Consent log: the cookie-category choices you make in the banner, plus a timestamp and policy revision.",
          ],
        },
        {
          title: "Why we collect it (lawful bases)",
          body: "Each category of data has a specific purpose and lawful basis under Article 6 GDPR:",
          points: [
            "Account + application content + generation inputs — Contract: we need this to provide the service you signed up for.",
            "Billing identifiers — Contract + legal obligation: required to take payments and meet tax/accounting rules.",
            "Server logs — Legitimate interest: needed to keep the site secure and to debug outages.",
            "Analytics / marketing cookies (if you opt in) — Consent: only set after you accept them in the banner.",
          ],
        },
        {
          title: "Who we share it with",
          body: "We use a small number of vetted sub-processors and never sell personal data:",
          points: [
            "Vercel — hosting and edge delivery (United States, EU data-processing addendum in place).",
            "Supabase — managed Postgres for account and application data (EU region selectable).",
            "Stripe — payment processing and billing (PCI-DSS Level 1, global presence).",
            "Anthropic — the AI provider that runs the generation pipeline. Prompts are sent on a zero-retention basis where supported.",
            "Google and Facebook — only if you choose Sign in with Google / Facebook (they receive the auth handshake, nothing else).",
          ],
        },
        {
          title: "International transfers",
          body: "Some sub-processors are located outside the EEA / UK. Transfers rely on the EU Standard Contractual Clauses, the UK International Data Transfer Addendum and equivalent safeguards required by the GDPR.",
        },
        {
          title: "How long we keep it",
          body: "We keep personal data only as long as we need it:",
          points: [
            "Active account data — for as long as your account exists, plus 30 days after deletion request.",
            "Application content and saved drafts — until you delete them, or 30 days after account deletion.",
            "Billing records — 7 years to meet tax and accounting requirements.",
            "Server logs — 30 days.",
            "Consent log — for the lifetime of the consent (182 days) plus a short audit window.",
          ],
        },
        {
          title: "Your rights",
          body: "Depending on where you live, you have some or all of the following rights. We will respond within 30 days.",
          points: [
            "Access — request a copy of the data we hold about you.",
            "Rectification — correct anything inaccurate.",
            "Erasure / Right to be forgotten — delete your account and associated data.",
            "Restriction — ask us to pause processing while a dispute is resolved.",
            "Portability — receive your data in a machine-readable format.",
            "Objection — object to processing based on legitimate interest.",
            "Withdraw consent — change your cookie choices at any time from the footer; this does not affect anything processed before withdrawal.",
            "California residents (CCPA / CPRA): right to know, delete, correct, limit sensitive data and opt out of sale or sharing — we do not sell personal data.",
            "Lodge a complaint with your local data-protection authority (e.g. the ICO in the UK, the CNIL in France).",
          ],
        },
        {
          title: "Sign in with Google — limited use disclosure",
          body: "ForgeLetter's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. We request only the scopes needed to authenticate you (email and basic profile). We do not use Google user data to develop, improve, or train generalised AI models; we do not transfer Google user data to third parties for advertising; we do not allow humans to read your Google user data unless we have your specific consent, it is necessary for security investigations, or as required by law. You can revoke ForgeLetter's access at any time from https://myaccount.google.com/permissions.",
        },
        {
          title: "Sign in with Facebook",
          body: "When you choose Sign in with Facebook, Meta passes us your name, email address, and Facebook user ID under your direction. We use this only to create or look up your ForgeLetter account. We do not post to Facebook on your behalf and do not run a Meta Pixel on the site. You can revoke ForgeLetter's access from your Facebook Settings → Business integrations.",
        },
        {
          title: "Cookies",
          body: 'For the full list of cookies set, why each exists, and how to change your choices, see the Cookie policy. You can re-open the consent banner from the Cookie preferences link in the footer at any time.',
        },
        {
          title: "Children",
          body: "ForgeLetter is not directed at children under 16 and we do not knowingly collect their data. If you believe a child has signed up, contact us and we will delete the account.",
        },
        {
          title: "Changes to this policy",
          body: "We will post any material change here, update the revision number, and — if the change touches consent — re-prompt you in the banner. Minor wording fixes will not trigger a re-prompt.",
        },
        {
          title: "Contact",
          body: "Privacy questions and rights requests can be sent via the Contact page. We aim to respond within one working week and at the latest within 30 days as required by the GDPR.",
        },
      ]}
    />
  )
}
