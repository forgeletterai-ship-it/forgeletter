export type ResourceArticle = {
  slug: string
  title: string
  category: string
  readingTime: string
  summary: string
  sections: Array<{
    title: string
    body: string
  }>
}

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "avoid-generic-cover-letters",
    title: "How to avoid generic cover letters",
    category: "Cover letters",
    readingTime: "4 min read",
    summary:
      "A practical structure for making every letter specific without sounding over-written.",
    sections: [
      {
        title: "Start with the business reason",
        body: "A strong opening connects the role, the company, and a relevant reason from your background. Avoid broad enthusiasm that could apply to any employer.",
      },
      {
        title: "Use one proof point",
        body: "One measurable achievement is more persuasive than a list of adjectives. Pick a result that maps to the role requirements.",
      },
      {
        title: "Close with fit",
        body: "End by naming the contribution you can make and keeping the next step easy for the hiring team.",
      },
    ],
  },
  {
    slug: "profile-data-that-improves-drafts",
    title: "What to save in your profile",
    category: "Workflow",
    readingTime: "3 min read",
    summary:
      "The profile details that make future application briefs faster and sharper.",
    sections: [
      {
        title: "Keep your proof reusable",
        body: "Save achievements, tools, industries, leadership examples, and working style in one place so each brief starts with substance.",
      },
      {
        title: "Separate facts from tone",
        body: "Facts should stay stable across drafts. Tone can change depending on company, seniority, and role type.",
      },
      {
        title: "Update after interviews",
        body: "When you learn what employers respond to, add that language to your profile for stronger future drafts.",
      },
    ],
  },
  {
    slug: "career-agency-workflows",
    title: "How career agencies can use ForgeLetter",
    category: "Partnerships",
    readingTime: "5 min read",
    summary:
      "A premium workflow direction for advisors managing many candidates and applications.",
    sections: [
      {
        title: "Standardize the intake",
        body: "Advisors need repeatable candidate profiles, measurable achievements, and role targets before any draft is generated.",
      },
      {
        title: "Keep review human",
        body: "ForgeLetter should prepare strong drafts, but partner teams still need review, compliance, and candidate approval before sending.",
      },
      {
        title: "Track outcomes",
        body: "History, status, and versioning make the workspace useful beyond a single letter.",
      },
    ],
  },
]

export function getArticle(slug: string) {
  return resourceArticles.find((article) => article.slug === slug)
}
