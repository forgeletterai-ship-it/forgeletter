import { SimplePage } from "@/components/SimplePage"

export default function BlogPage() {
  return (
    <SimplePage
      kicker="Resources"
      title="LetterForge blog"
      intro="A clean resource hub for job search strategy, cover letter writing, and product updates."
      cards={[
        {
          title: "How to avoid generic cover letters",
          body: "Lead with a role-specific reason, connect one achievement to the job, and keep the close confident.",
        },
        {
          title: "What to save in your profile",
          body: "Store metrics, projects, industries, tools, and leadership moments so every future draft has substance.",
        },
        {
          title: "Product roadmap",
          body: "Next up: persistent saved letters, secure AI generation, exports, Stripe checkout, and account controls.",
        },
        {
          title: "Launch checklist",
          body: "Review Supabase RLS, legal pages, environment variables, rate limits, and billing webhooks before launch.",
        },
      ]}
    />
  )
}
