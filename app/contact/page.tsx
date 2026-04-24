import { SimplePage } from "@/components/SimplePage"

export default function ContactPage() {
  return (
    <SimplePage
      kicker="Contact"
      title="Talk to LetterForge"
      intro="Use this page as the public contact destination until a support inbox or form provider is connected."
      ctaLabel="Email hello@letterforge.io"
      ctaHref="mailto:hello@letterforge.io"
      cards={[
        {
          title: "Support",
          body: "Questions about accounts, billing, data, or exports should route here once support tooling is connected.",
        },
        {
          title: "Product feedback",
          body: "Collect requests from early users: tone quality, dashboard clarity, profile fields, and export formats.",
        },
        {
          title: "Partnerships",
          body: "Universities, recruiters, and coaching businesses can use this channel for collaboration requests.",
        },
        {
          title: "Security",
          body: "Add a dedicated security email before launch if you store resumes, letters, or payment data.",
        },
      ]}
    />
  )
}
