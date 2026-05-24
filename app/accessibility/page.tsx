import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Accessibility statement — ForgeLetter",
  description:
    "ForgeLetter's commitment to digital accessibility, the standards we follow, known limitations, and how to report a barrier.",
}

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility statement"
      intro="ForgeLetter is committed to making its service accessible to as many people as possible, in line with the European Accessibility Act (Directive (EU) 2019/882, in force from 28 June 2025) and equivalent laws in other jurisdictions. This statement explains our standards, our current conformance, known limitations, and how to contact us if you hit a barrier. Last updated: 2026-05-24."
      sections={[
        {
          title: "1. Standards we follow",
          body: "We design, build and test ForgeLetter against the Web Content Accessibility Guidelines (WCAG) version 2.2, Level AA. Our internal target is to meet or exceed Level AA on every page and to remediate Level AAA failures where the cost is reasonable.",
        },
        {
          title: "2. Conformance status",
          body: "ForgeLetter aims to be partially conformant with WCAG 2.2 Level AA. \"Partially conformant\" means that some parts of the service may not yet fully meet the standard — typically third-party embeds and the AI-generated content itself, which we cannot review in advance. We re-test the public site and the authenticated workspace on a quarterly cadence and after any major release.",
        },
        {
          title: "3. What we do",
          body: "Concrete steps we take include:",
          points: [
            "Semantic HTML and ARIA roles for every interactive element.",
            "Keyboard navigation across the public site, workspace, and the cookie consent banner.",
            "Visible focus indicators on all focusable elements.",
            "Colour-contrast ratios that meet WCAG AA for text and essential graphics.",
            "Alt text for meaningful images and aria-hidden on decorative ones.",
            "Captions / transcripts on any future video content.",
            "Forms with associated labels, clear error messages, and inline guidance.",
            "Reduced-motion respect (prefers-reduced-motion media query) for animations including the How it works walkthrough.",
            "Screen-reader-friendly skip links on long pages.",
          ],
        },
        {
          title: "4. Known limitations",
          body: "We are transparent about gaps we have not yet closed:",
          points: [
            "The animated How it works demo on the landing page is a visual walkthrough; a text equivalent is available via the step descriptions, and the animation pauses when prefers-reduced-motion is set.",
            "AI-generated cover letters are produced live and are not pre-reviewed for plain-language readability or screen-reader phrasing. Users can edit before saving.",
            "Some PDF templates use fonts and layouts that may not match the source HTML's accessibility tree byte-for-byte.",
          ],
        },
        {
          title: "5. Compatibility",
          body: "ForgeLetter is tested on the latest stable versions of Chrome, Edge, Firefox, and Safari, and with VoiceOver (macOS / iOS), NVDA (Windows), and TalkBack (Android). Older browsers may work but are not officially supported.",
        },
        {
          title: "6. Reporting a barrier",
          body: "If you encounter a page or feature you cannot use because of an accessibility issue, please tell us. We aim to acknowledge your message within two working days and to provide an alternative or fix within ten working days where reasonably possible. Send a description, the URL, and (if possible) details of the assistive technology you use to accessibility@forgeletter.app.",
        },
        {
          title: "7. Enforcement procedure",
          body: "If you are not satisfied with our response, residents of the European Union may complain to the national body responsible for enforcing the European Accessibility Act in their country (in Bulgaria: the Commission for Protection against Discrimination — KZD). Residents of the United Kingdom may complain to the Equality and Human Rights Commission (EHRC). Residents of the United States may complain under the Americans with Disabilities Act through the U.S. Department of Justice.",
        },
        {
          title: "8. Review",
          body: "This statement is reviewed at least annually and after any major redesign. Significant changes are documented in the changelog at the bottom of the page once we add one.",
        },
      ]}
    />
  )
}
