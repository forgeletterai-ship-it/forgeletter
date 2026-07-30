import type { Metadata } from "next"
import { SimplePage } from "@/components/SimplePage"

export const metadata: Metadata = {
  title: "Interview prep",
  description:
    "Turn the same evidence that powers your cover letters into stronger interview answers: predict questions, structure proof, rehearse delivery.",
  alternates: {
    canonical: "/interview-prep",
  },
}

export default function InterviewPrepPage() {
  return (
    <SimplePage
      kicker="Guide"
      title="Interview prep"
      intro="Turn the same context from your letters into stronger interview answers."
      cards={[
        {
          title: "Extract likely questions",
          body: "Use the job description to predict where the interviewer will probe: ownership, tools, team fit, and tradeoffs.",
        },
        {
          title: "Answer with structure",
          body: "Use context, action, result, and reflection. Keep stories concise and outcome-led.",
        },
        {
          title: "Connect to the company",
          body: "Every answer should quietly show why this company and role make sense for your next step.",
        },
        {
          title: "Prepare the close",
          body: "Have two smart questions and one final summary of why your experience fits the role.",
        },
      ]}
    />
  )
}
