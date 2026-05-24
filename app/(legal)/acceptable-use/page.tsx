import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Acceptable use policy — ForgeLetter",
  description:
    "What you may and may not do with ForgeLetter, including content rules, prohibited uses, and how violations are handled.",
}

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable use policy"
      intro="This Acceptable Use Policy (AUP) sets out the rules for how ForgeLetter may be used. It forms part of our Terms of Service. We reserve the right to enforce it through suspension, termination, removal of content, and reporting to authorities where appropriate. Last updated: 2026-05-24."
      sections={[
        {
          title: "1. Honest job-application use",
          body: "ForgeLetter exists to help real candidates draft real job applications. You must not:",
          points: [
            "Fabricate employment history, education, qualifications, references, security clearances, or visa status that you do not actually hold.",
            "Misrepresent your identity, gender, ethnicity, or other protected characteristics with the aim of deceiving an employer.",
            "Submit content about a third party (e.g. drafting an application as someone else) without their explicit consent.",
            "Use the service to apply to roles you have no intention of taking, in bulk, for the purpose of degrading hiring funnels.",
          ],
        },
        {
          title: "2. Content rules",
          body: "You must not submit, generate, or publish content that:",
          points: [
            "Is unlawful, defamatory, harassing, hateful, threatening, sexually explicit, or otherwise objectionable under applicable law.",
            "Targets minors or solicits content involving minors in any sexualised context.",
            "Promotes terrorism, extremist violence, or self-harm.",
            "Infringes intellectual-property rights, including using someone else's writing samples without licence.",
            "Contains personal data of third parties for which you do not have a lawful basis to process.",
            "Includes malware, exploits, or any code intended to disrupt systems.",
          ],
        },
        {
          title: "3. Technical rules",
          body: "You must not:",
          points: [
            "Reverse-engineer, decompile, or attempt to extract the prompts, model weights, or proprietary logic of the service.",
            "Scrape the site beyond what robots.txt and reasonable rate limits allow.",
            "Bypass paywalls, rate limits, security controls, or attempt to access accounts you do not own.",
            "Use the service to develop, train, or evaluate a competing AI product.",
            "Resell, sublicense, or repackage the service to third parties.",
            "Send abnormal volumes of requests, including automated mass-generation across many accounts.",
          ],
        },
        {
          title: "4. AI-specific rules",
          body: "Because ForgeLetter relies on large-language models, you must not use it to:",
          points: [
            "Generate content intended to defraud, manipulate elections, impersonate real people, or create synthetic media of someone without their consent.",
            "Produce instructions that could enable physical harm, the creation of weapons, illegal drug manufacture, or attacks on critical infrastructure.",
            "Produce content that would violate the Anthropic Usage Policy or the Acceptable Use Policy of any sub-processor.",
          ],
        },
        {
          title: "5. Sanctions, export controls and prohibited regions",
          body: "You confirm that you are not located in, ordinarily resident in, or a national of, a country subject to a comprehensive embargo by the EU, UN, UK or US, and that you are not listed on any sanctions register. You agree not to use the service in violation of export-control laws.",
        },
        {
          title: "6. Reporting violations",
          body: "If you believe someone has violated this policy — including content posted on third-party sites that originated from ForgeLetter — send a notice to abuse@forgeletter.app with the relevant URLs, screenshots, and a brief description. We do not require a court order to investigate plausible abuse reports.",
        },
        {
          title: "7. Enforcement",
          body: "When we detect or are alerted to a possible violation we may, in our discretion and proportionate to the severity: warn the user, restrict or remove the content, suspend the account pending investigation, terminate the account, refuse future service, and report the matter to law-enforcement or to the relevant data-protection authority. We may preserve and disclose information where required by law or where we reasonably believe disclosure is necessary to protect ForgeLetter, our users, or the public.",
        },
        {
          title: "8. Changes",
          body: "We may update this policy as products and risks evolve. Material changes will be announced in-app or by email. Continued use after the effective date means you accept the updated policy.",
        },
      ]}
    />
  )
}
