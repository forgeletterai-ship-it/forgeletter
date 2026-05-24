import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Privacy policy — ForgeLetter",
  description:
    "What data ForgeLetter collects, why, who we share it with, how long we keep it, and the rights you have over it. Compliant with GDPR, UK GDPR, ePrivacy, CCPA / CPRA, LGPD.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This policy explains what data ForgeLetter collects, why, who it is shared with, how long it is kept, and the rights you have over it. It is written to satisfy the GDPR, the UK GDPR, the ePrivacy Directive, the CCPA / CPRA and the LGPD. Last updated: 2026-05-24."
      sections={[
        {
          title: "1. Who we are (data controller)",
          body: "ForgeLetter is operated by [Legal entity name], a company registered in the Republic of Bulgaria under EIK [EIK number], with its seat at [Registered address]. For all matters under this policy, [Legal entity name] is the data controller within the meaning of Article 4(7) GDPR.",
        },
        {
          title: "2. How to reach us",
          body: "All privacy and data-protection requests are handled by our designated privacy contact. ForgeLetter is not required to appoint a formal Data Protection Officer under Article 37 GDPR — our processing is not large-scale monitoring of individuals and does not involve special-category data — but we still respond to GDPR requests within the statutory timeframes.",
          points: [
            "Privacy and data-protection requests: privacy@forgeletter.app",
            "Postal: [Legal entity name], [Registered address], Republic of Bulgaria",
          ],
        },
        {
          title: "3. What we collect",
          body: "We collect only what is needed to run the product:",
          points: [
            "Account data: name, email address, hashed password (or the OAuth identifier if you sign in with Google or Facebook).",
            "Application content: the resume snippets, employer / internship / university entries and cover-letter drafts you save.",
            "Generation inputs: the job description text and the prompt parameters you submit to the AI pipeline.",
            "Billing identifiers: a Stripe customer ID and subscription metadata. Raw card numbers are handled by Stripe and never reach our servers.",
            "Technical data: IP address, user-agent and request timestamps in standard server logs.",
            "Consent log: the cookie-category choices you make in the banner, plus a timestamp and policy revision.",
          ],
        },
        {
          title: "4. Why we collect it (lawful bases)",
          body: "Each category of data has a specific purpose and lawful basis under Article 6 GDPR:",
          points: [
            "Account + application content + generation inputs — Contract (Art. 6(1)(b)): we need this to provide the service you signed up for.",
            "Billing identifiers — Contract + Legal obligation (Art. 6(1)(b) and (c)): required to take payments and meet tax / accounting rules.",
            "Server logs — Legitimate interest (Art. 6(1)(f)): needed to keep the site secure and to debug outages.",
            "Analytics / marketing cookies (if you opt in) — Consent (Art. 6(1)(a)): only set after you accept them in the banner.",
          ],
        },
        {
          title: "5. How long we keep it",
          body: "We apply specific, time-bound retention periods to each data type. Where Bulgarian or EU law mandates a longer retention (notably for billing and tax records), that period prevails.",
          table: {
            headers: ["Data category", "Retention period", "Basis"],
            rows: [
              [
                "Account profile (name, email, password hash)",
                "For the lifetime of the account + 30 days after deletion request",
                "Contract (Art. 6(1)(b))",
              ],
              [
                "Application content (resumes, experience, drafts)",
                "Until you delete it, or 30 days after account deletion",
                "Contract",
              ],
              [
                "Generation inputs and outputs",
                "Until you delete the generated letter, or 30 days after account deletion",
                "Contract",
              ],
              [
                "Billing records (invoices, payment metadata)",
                "10 years after the end of the financial year",
                "Bulgarian Accounting Act (Закон за счетоводството)",
              ],
              [
                "Server access logs",
                "30 days",
                "Legitimate interest (Art. 6(1)(f))",
              ],
              [
                "Cookie consent log",
                "182 days, then we re-prompt",
                "Legal obligation under ePrivacy + Art. 7 GDPR",
              ],
              [
                "Support correspondence",
                "3 years after closure of the ticket",
                "Legitimate interest",
              ],
              [
                "Marketing-list email (if subscribed)",
                "Until you unsubscribe + 30 days for tombstone records",
                "Consent (Art. 6(1)(a))",
              ],
            ],
          },
        },
        {
          title: "6. Who we share it with (sub-processors)",
          body: "We use a small number of vetted sub-processors and never sell personal data. All transfers outside the European Economic Area rely on the EU Standard Contractual Clauses (Commission Decision 2021/914) and, where applicable, the EU-US Data Privacy Framework adopted by the European Commission on 10 July 2023.",
          table: {
            headers: ["Provider", "Role", "Location", "Transfer mechanism"],
            rows: [
              [
                "Vercel Inc.",
                "Web hosting and edge delivery",
                "United States (EU edge available)",
                "SCCs + EU-US Data Privacy Framework",
              ],
              [
                "Supabase Inc.",
                "Managed Postgres for account + application data",
                "EU (Frankfurt) by default",
                "Within EEA",
              ],
              [
                "Stripe Payments Europe Ltd.",
                "Payment processing and billing",
                "Ireland (EU) and United States",
                "SCCs + EU-US Data Privacy Framework",
              ],
              [
                "Anthropic PBC",
                "AI text generation (zero-retention API)",
                "United States",
                "SCCs + EU-US Data Privacy Framework",
              ],
              [
                "Google Ireland Ltd.",
                "OAuth sign-in only (if you choose it)",
                "Ireland (EU) and United States",
                "SCCs + EU-US Data Privacy Framework",
              ],
              [
                "Meta Platforms Ireland Ltd.",
                "OAuth sign-in only (if you choose it)",
                "Ireland (EU) and United States",
                "SCCs + EU-US Data Privacy Framework",
              ],
            ],
          },
        },
        {
          title: "7. International transfers",
          body: "Some sub-processors are located outside the EEA / UK. We rely on the EU Standard Contractual Clauses, the UK International Data Transfer Addendum and the EU-US Data Privacy Framework as the legal basis for these transfers. Copies of the SCCs we use are available on request via privacy@forgeletter.app.",
        },
        {
          title: "8. How we protect your data",
          body: "We apply technical and organisational measures appropriate to the risk, in line with Article 32 GDPR:",
          points: [
            "All traffic between your browser and ForgeLetter is encrypted with TLS 1.2 or higher.",
            "Data at rest on Supabase is encrypted with AES-256.",
            "Passwords are stored hashed with bcrypt (12+ rounds) — we cannot read your plaintext password.",
            "Two-factor authentication is offered for accounts and required for production access by our staff.",
            "Production access is least-privilege, logged, and reviewed quarterly.",
            "All third-party providers we use are SOC 2 Type II or ISO 27001 certified (Vercel, Supabase, Stripe, Anthropic).",
            "We monitor for vulnerabilities and apply security patches promptly.",
            "We will notify you and the relevant supervisory authority of a personal data breach within 72 hours where required by Article 33 GDPR.",
          ],
        },
        {
          title: "9. Your rights",
          body: "Depending on where you live, you have some or all of the following rights. We will respond within 30 days (extendable by two months for complex requests, per Article 12 GDPR).",
          points: [
            "Access — request a copy of the data we hold about you (Art. 15 GDPR).",
            "Rectification — correct anything inaccurate (Art. 16 GDPR).",
            "Erasure / Right to be forgotten — delete your account and associated data (Art. 17 GDPR).",
            "Restriction — ask us to pause processing while a dispute is resolved (Art. 18 GDPR).",
            "Portability — receive your data in a machine-readable format (Art. 20 GDPR).",
            "Objection — object to processing based on legitimate interest (Art. 21 GDPR).",
            "Withdraw consent — change your cookie choices at any time from the footer; this does not affect anything processed before withdrawal (Art. 7(3) GDPR).",
            "Not be subject to fully automated decisions with legal effect — note that AI-generated cover letters are advisory drafts you review, not automated decisions (Art. 22 GDPR).",
            "California residents (CCPA / CPRA): right to know, delete, correct, limit sensitive data and opt out of sale or sharing. We do not sell or share personal data for cross-context behavioural advertising.",
            "Brazilian residents (LGPD): equivalent rights under Articles 18-22.",
            "Lodge a complaint with your local data-protection authority — see section 10.",
          ],
        },
        {
          title: "10. Supervisory authorities",
          body: "If you believe we have not handled your data lawfully you have the right to lodge a complaint with a supervisory authority. Our lead authority is Bulgaria's CPDP, but you may complain to the authority in your country of residence:",
          points: [
            "Bulgaria — Commission for Personal Data Protection (Комисия за защита на личните данни, CPDP) — https://www.cpdp.bg, +359 2 91 53 518, kzld@cpdp.bg",
            "United Kingdom — Information Commissioner's Office (ICO) — https://ico.org.uk",
            "Ireland — Data Protection Commission (DPC) — https://www.dataprotection.ie",
            "Germany — your federal-state DPA (BfDI for federal matters) — https://www.bfdi.bund.de",
            "France — Commission nationale de l'informatique et des libertés (CNIL) — https://www.cnil.fr",
            "California — California Privacy Protection Agency (CPPA) — https://cppa.ca.gov",
            "Other EU/EEA — list at https://www.edpb.europa.eu/about-edpb/about-edpb/members_en",
          ],
        },
        {
          title: "11. How to exercise your rights",
          body: "Email privacy@forgeletter.app from the email address on your account, or submit a request via the contact page. We may ask for additional information to verify your identity before acting on the request. We do not charge a fee unless the request is manifestly unfounded or excessive, in line with Article 12(5) GDPR.",
        },
        {
          title: "12. Sign in with Google — limited use disclosure",
          body: "ForgeLetter's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. We request only the scopes needed to authenticate you (email and basic profile). We do not use Google user data to develop, improve, or train generalised AI models; we do not transfer Google user data to third parties for advertising; we do not allow humans to read your Google user data unless we have your specific consent, it is necessary for security investigations, or as required by law. You can revoke ForgeLetter's access at any time from https://myaccount.google.com/permissions.",
        },
        {
          title: "13. Sign in with Facebook",
          body: "When you choose Sign in with Facebook, Meta passes us your name, email address, and Facebook user ID under your direction. We use this only to create or look up your ForgeLetter account. We do not post to Facebook on your behalf and do not run a Meta Pixel on the site. You can revoke ForgeLetter's access from your Facebook Settings → Business integrations.",
        },
        {
          title: "14. Cookies",
          body: "For the full list of cookies set, why each exists, and how to change your choices, see the Cookie policy. You can re-open the consent banner from the Cookie preferences link in the footer or sidebar at any time.",
        },
        {
          title: "15. Children",
          body: "ForgeLetter is not directed at children under 16 and we do not knowingly collect their data. If you believe a child has signed up, contact us at privacy@forgeletter.app and we will delete the account. In jurisdictions where the digital-consent age is higher (e.g. 13 under US COPPA, 16 in most of the EU), the local minimum applies.",
        },
        {
          title: "16. Changes to this policy",
          body: "We will post any material change here, update the revision number, and — if the change touches consent — re-prompt you in the cookie banner. Minor wording fixes will not trigger a re-prompt. The current version is always available at this URL; previous versions are kept for two years and available on request.",
        },
        {
          title: "17. Contact",
          body: "Privacy questions and rights requests can be sent to privacy@forgeletter.app or via the contact page. We aim to respond within one working week and at the latest within 30 days as required by the GDPR.",
        },
      ]}
    />
  )
}
