import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Terms of service — ForgeLetter",
  description:
    "The legal terms that govern your use of ForgeLetter, including billing, AI-generated content, liability, and dispute resolution.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro={`These Terms of Service form a binding agreement between you and ForgeLetter, operated by [Legal entity name], registered in the Republic of Bulgaria under EIK [EIK number], with its seat at [Registered address] ("ForgeLetter", "we", "us"). By creating an account or using the service you accept these terms. If you do not accept them, do not use the service. Last updated: 2026-05-24.`}
      sections={[
        {
          title: "1. Eligibility",
          body: "You may use ForgeLetter only if you are at least 16 years old and able to enter into a binding contract under the law of your country. You must not be located in a country subject to a comprehensive EU, UN, UK or US embargo, and you must not be on any sanctions list. By using the service you confirm that the information you provide about yourself is accurate.",
        },
        {
          title: "2. The service",
          body: "ForgeLetter is a subscription web application that helps you draft cover letters and related job-application materials using artificial intelligence. The exact features included in each plan are described on the pricing page and may change as the product evolves.",
        },
        {
          title: "3. Your account",
          body: "You are responsible for keeping your sign-in credentials secret and for everything that happens under your account. Notify us immediately at the address in section 27 if you suspect unauthorised access. You may not share, sell or transfer your account. We may verify your identity before reinstating access to an account where suspicious activity has been observed.",
        },
        {
          title: "4. Acceptable use",
          body: "Your use of ForgeLetter is governed by our Acceptable Use Policy, which forms part of these terms. In summary, you must not:",
          points: [
            "Submit information about anyone other than yourself, or content you do not have the right to use.",
            "Generate materially false or misleading employment history, qualifications, references, or evidence intended to deceive an employer or third party.",
            "Use the service for spamming, harassment, hate speech, infringement of intellectual-property rights, or any unlawful purpose.",
            "Attempt to reverse-engineer, scrape, mirror, resell, or build a competing product on top of the service.",
            "Bypass technical limits, rate limits, paywalls, or attempt to access accounts you do not own.",
            "Use the service to develop or train competing AI models.",
            "Submit prompts containing personal data of third parties without a lawful basis, or any content that is illegal in your country or ours.",
          ],
        },
        {
          title: "5. AI-generated content and disclaimers",
          body: "ForgeLetter uses third-party large-language models (currently provided by Anthropic) to assist in producing draft text. AI outputs may be inaccurate, incomplete, biased, or fabricated. We do not represent or guarantee that any output is true, factually correct, fit for a particular purpose, free of plagiarism, or suitable for submission to any employer. You must review, fact-check, and edit every output before relying on it. ForgeLetter is not a legal-, career-, or recruitment-advice service.",
        },
        {
          title: "6. Your inputs and how we handle them",
          body: "You retain ownership of the resumes, work history, prompts and other content you submit (\"Inputs\"). You grant ForgeLetter a limited, worldwide, non-exclusive licence to host, process and transmit your Inputs solely to operate the service for you, to support you, and to comply with the law. We do not use your Inputs to train any AI model. Our AI sub-processor Anthropic operates on a zero-retention basis for API content where supported. Details on how we handle personal data are in our Privacy Policy.",
        },
        {
          title: "7. Generated content and ownership",
          body: "Subject to your payment of the applicable fees and your continued compliance with these terms, ForgeLetter assigns to you all rights it may have in the AI-generated output produced for your account, to the maximum extent permitted by law. Note that, under the law of most countries, AI-generated content is not itself copyrightable. You are responsible for the use, accuracy and lawfulness of any output you submit to an employer or third party.",
        },
        {
          title: "8. Intellectual property of ForgeLetter",
          body: "The ForgeLetter name, logo, website, software, design system, prompts, templates, documentation and content (other than your Inputs and your outputs) are owned by ForgeLetter or its licensors and are protected by copyright, trademark and other laws. We grant you a limited, revocable, non-transferable, non-exclusive licence to access and use the service for your own personal job applications during the term of your subscription.",
        },
        {
          title: "9. Third-party services",
          body: "The service relies on third-party providers, including Vercel (hosting), Supabase (database), Stripe (payments), Anthropic (AI), and optional sign-in through Google or Facebook. Each provider has its own terms and privacy policies, which apply to your interaction with their services. We are not responsible for the acts, omissions, availability, or content of third-party services.",
        },
        {
          title: "10. Subscription, fees and billing — general",
          body: "Paid plans are billed in advance through Stripe. Prices and the billing currency are shown at checkout. Where required by Bulgarian or EU law, VAT or equivalent indirect taxes will be added or included; consumers outside the EU may be liable for local taxes. Payment-card details are handled by Stripe under PCI-DSS Level 1; we do not see or store full card numbers. Subscriptions begin on the date of first successful payment unless a free-trial period is offered, in which case billing starts at trial end.",
        },
        {
          title: "10a. Monthly subscription",
          body: "A monthly plan grants access to the features described on the pricing page for a one-month billing period. The plan renews automatically on the same calendar day each month until cancelled. You may cancel at any time from the billing portal and retain access until the end of the paid period. Mid-cycle cancellations do not produce pro-rata refunds save where mandatory consumer law requires otherwise.",
        },
        {
          title: "10b. Annual subscription",
          body: "An annual plan is paid in advance for twelve months and renews automatically each year on the anniversary date until cancelled. Annual plans are non-refundable beyond the EU/UK 14-day withdrawal window described in section 12, except where a sustained service failure makes retention of the fee inequitable. We will send a renewal reminder at least 30 days before the renewal date.",
        },
        {
          title: "10c. One-off purchases",
          body: "Where ForgeLetter offers one-off credit packs or single-letter purchases, these are consumed on use, do not renew, and are non-refundable once the corresponding feature has been used. Unused credits expire 12 months after purchase unless a longer period is shown at checkout.",
        },
        {
          title: "10d. Changes in fees",
          body: "We may change the price of a subscription plan with at least 30 days' notice by email and on the pricing page. Price changes take effect at the start of your next billing period; if you do not accept the change, you may cancel before the renewal date. Continued payment after the effective date constitutes acceptance.",
        },
        {
          title: "11. Auto-renewal, cancellation and what happens to your data",
          body: "You can cancel a subscription at any time from the billing portal. Cancellation takes effect at the end of the current billing period; you retain access until then. After cancellation we keep your account and saved drafts for 30 days so you can reactivate, then we delete them in line with the Privacy Policy. We do not provide pro-rata refunds for unused days unless required by law.",
        },
        {
          title: "12. EU / UK 14-day right of withdrawal",
          body: "If you are a consumer resident in the EU or the United Kingdom you normally have 14 days from the date of purchase to withdraw from a distance contract without giving a reason. Where you purchase a digital subscription and ask for it to start immediately, you expressly consent to immediate performance and acknowledge that you lose the right of withdrawal once the service has been provided in full. To exercise the right where it still applies, contact us at the address in section 27.",
        },
        {
          title: "13. Refunds",
          body: "Our case-by-case approach to refunds is described in the Refund Policy, which forms part of these terms. Statutory rights of consumers in the EU, UK and other jurisdictions are not affected and prevail in the event of conflict.",
        },
        {
          title: "14. Suspension and termination",
          body: "We may suspend or terminate your access without prior notice if you breach these terms, fail to pay, charge back a legitimate payment, or use the service in a way that we reasonably believe is unlawful or harmful. You may stop using the service at any time. On termination, the licences in sections 6 and 8 end and the data-handling provisions of the Privacy Policy apply.",
        },
        {
          title: "15. Warranty disclaimer",
          body: "Except for any warranty that cannot be excluded under applicable law, the service is provided \"as is\" and \"as available\" without warranties of any kind, whether express, implied or statutory, including warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy of outputs, or success in any job application. ForgeLetter does not warrant that the service will be uninterrupted, error-free, or secure against every threat.",
        },
        {
          title: "16. Limitation of liability",
          body: "To the maximum extent permitted by law, ForgeLetter and its officers, directors, employees and suppliers will not be liable for indirect, incidental, special, consequential, or punitive damages, or for any loss of profit, revenue, data, goodwill, business opportunity, employment offer, or reputation, even if advised of the possibility. Our total aggregate liability arising out of or relating to the service in any 12-month period will not exceed the total amount you paid to ForgeLetter in that period. Nothing in these terms limits liability that cannot lawfully be limited (including, in many jurisdictions, fraud, gross negligence, death or personal injury caused by negligence, or consumer rights).",
        },
        {
          title: "17. Indemnification",
          body: "You agree to defend, indemnify and hold ForgeLetter harmless from claims, losses, liabilities, damages, costs and expenses (including reasonable legal fees) arising from your Inputs, your outputs, your breach of these terms, your violation of any law or third-party right, or your misuse of the service.",
        },
        {
          title: "18. DMCA and copyright complaints",
          body: "If you believe content on ForgeLetter infringes your copyright, send a notice with the information required under 17 U.S.C. §512(c)(3) (or equivalent in your jurisdiction) to the address in section 27 with subject line \"Copyright notice\". We will respond promptly and may remove the content or terminate repeat infringers' accounts.",
        },
        {
          title: "19. Feedback",
          body: "If you send us suggestions, feature requests or other feedback, you grant ForgeLetter a perpetual, irrevocable, worldwide, royalty-free licence to use it for any purpose without obligation or attribution.",
        },
        {
          title: "20. Changes to these terms or to the service",
          body: "We may update these terms to reflect changes to the service, the law, or business practice. We will post the updated version here with a new \"Last updated\" date and, for material changes, notify you by email or in-app. Continued use after the effective date constitutes acceptance. If you do not agree to a change, your remedy is to stop using the service and cancel any active subscription.",
        },
        {
          title: "21. Force majeure",
          body: "Neither party is liable for failure or delay caused by events beyond its reasonable control, including acts of God, war, terrorism, civil unrest, labour disputes, internet or hosting outages, failures of third-party providers (Vercel, Supabase, Stripe, Anthropic), or government action.",
        },
        {
          title: "22. Governing law and jurisdiction",
          body: "These terms are governed by the laws of the Republic of Bulgaria, without regard to its conflict-of-laws principles. The competent courts in the City of Sofia, Bulgaria, have exclusive jurisdiction over any dispute arising from or in connection with these terms, except where mandatory consumer-protection rules entitle a consumer to bring proceedings in the courts of their place of residence within the EU.",
        },
        {
          title: "23. Dispute resolution",
          body: "Before starting court proceedings, you agree to contact us in good faith and to try to resolve the dispute informally within 30 days. EU consumers have access to the European Commission's Online Dispute Resolution platform at https://ec.europa.eu/consumers/odr. ForgeLetter is not obliged to participate in alternative dispute resolution before a Bulgarian consumer-protection conciliation commission, but may choose to.",
        },
        {
          title: "24. Mandatory consumer rights",
          body: "Nothing in these terms restricts the mandatory statutory rights of consumers under EU law, UK law, the California Consumer Privacy Act / CPRA, or other applicable consumer-protection regimes. Where a provision of these terms conflicts with such a mandatory right, the right prevails.",
        },
        {
          title: "25. No third-party beneficiaries",
          body: "These terms create rights and obligations only between you and ForgeLetter. No third party (including employers reading letters you generate, recruiters, or AI providers) is a beneficiary under this agreement and no third party may enforce any provision of these terms against ForgeLetter or against you.",
        },
        {
          title: "26. Errata and minor errors",
          body: "ForgeLetter strives to keep the site, prices, descriptions and AI outputs accurate, but typographical errors, pricing inaccuracies, model availability issues or outdated screenshots may occur. We reserve the right to correct any such errors without notice and, where the error affects a purchase, to cancel an order and issue a refund. An obvious error in price or description (for example a 99% discount displayed by mistake) does not bind ForgeLetter even after checkout completes.",
        },
        {
          title: "27. Notices, contact and miscellaneous",
          body: "Legal notices to ForgeLetter must be sent to legal@forgeletter.app (or via the contact page) with a clear subject line indicating the topic. We may notify you through the email address registered to your account or by an in-app message. If any provision of these terms is held invalid or unenforceable, the remainder remains in effect. These terms, together with the Privacy Policy, Cookie Policy, Acceptable Use Policy and Refund Policy, constitute the entire agreement between you and ForgeLetter. We may assign these terms in connection with a merger, acquisition or sale of assets; you may not assign them without our written consent. Failure to enforce a right is not a waiver of it.",
        },
      ]}
    />
  )
}
