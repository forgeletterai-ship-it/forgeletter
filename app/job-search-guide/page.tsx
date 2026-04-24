import { SimplePage } from "@/components/SimplePage"

export default function JobSearchGuidePage() {
  return (
    <SimplePage
      kicker="Guide"
      title="Job search guide"
      intro="A simple system for turning applications into a repeatable workflow."
      cards={[
        {
          title: "Build a shortlist",
          body: "Prioritize roles where your proof matches the company need. Fewer thoughtful applications usually beat volume.",
        },
        {
          title: "Prepare your evidence",
          body: "Collect metrics, project stories, and decisions you made. This becomes fuel for letters and interviews.",
        },
        {
          title: "Track every stage",
          body: "Use saved status labels: brief ready, applied, interview, offer, rejected, archived.",
        },
        {
          title: "Review weekly",
          body: "Look for patterns in replies and adjust positioning instead of rewriting from zero each time.",
        },
      ]}
    />
  )
}
