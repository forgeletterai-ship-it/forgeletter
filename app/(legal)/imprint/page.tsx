import { LegalPage } from "@/components/LegalPage"

export const metadata = {
  title: "Imprint / Impressum — ForgeLetter",
  description:
    "Legal entity details for ForgeLetter, including company registration, contact, and responsible person, as required by §5 TMG (Germany), §63 ECG (Austria) and equivalent laws.",
}

export default function ImprintPage() {
  return (
    <LegalPage
      title="Imprint / Impressum"
      intro="This page provides the legal entity information required by §5 of the German Telemediengesetz (TMG), §63 of the Austrian E-Commerce Gesetz (ECG), Article 22 of the Swiss Federal Act against Unfair Competition (UWG), Article 6 of the Bulgarian Electronic Commerce Act (ZET), and Article 5 of the EU e-Commerce Directive (2000/31/EC). Last updated: 2026-05-24."
      sections={[
        {
          title: "1. Service provider",
          body: "ForgeLetter is operated by:",
          points: [
            "Legal entity: [Legal entity name] (to be registered)",
            "Legal form: [e.g. EOOD / OOD / Ltd.]",
            "Registered office: [Registered address], Republic of Bulgaria",
            "EIK (Unified Identification Code): [EIK number]",
            "VAT identification number: BG[VAT number]",
            "Country of registration: Republic of Bulgaria",
            "Commercial Register: Commercial Register and Register of Non-Profit Legal Entities maintained by the Registry Agency of the Republic of Bulgaria",
          ],
        },
        {
          title: "2. Responsible person",
          body: "The person responsible for the content of this website, within the meaning of §18 paragraph 2 of the German Medienstaatsvertrag (MStV) and equivalent provisions in other jurisdictions, is:",
          points: [
            "[Responsible person name]",
            "c/o [Legal entity name], [Registered address], Republic of Bulgaria",
          ],
        },
        {
          title: "3. Contact",
          body: "General enquiries: hello@forgeletter.app",
          points: [
            "Legal notices: legal@forgeletter.app",
            "Privacy and data-protection requests: privacy@forgeletter.app",
            "Abuse reports: abuse@forgeletter.app",
            "Billing enquiries: billing@forgeletter.app",
            "Postal address: [Registered address], Republic of Bulgaria",
          ],
        },
        {
          title: "4. Supervisory authority",
          body: "Where applicable, the supervisory authority for the service is the relevant national consumer protection or commercial registry. In Bulgaria, this is the Commission for Consumer Protection (Комисия за защита на потребителите, KZP).",
        },
        {
          title: "5. Online dispute resolution (EU consumers)",
          body: "The European Commission provides a platform for online dispute resolution at https://ec.europa.eu/consumers/odr. ForgeLetter is not obliged to participate in dispute-resolution proceedings before a consumer arbitration board and is not currently willing or required to do so, save where required by law.",
        },
        {
          title: "6. Liability for content",
          body: "As a service provider we are responsible for our own content on these pages under general law. However, we are not under an obligation to monitor transmitted or stored third-party information, or to investigate circumstances that indicate illegal activity. Obligations to remove or block the use of information under general laws remain unaffected. Liability in this respect arises only from the point in time at which a specific infringement of the law becomes known. Upon notification of such infringements, we will remove the relevant content without delay.",
        },
        {
          title: "7. Liability for links",
          body: "Our website may contain links to third-party websites whose content we have no control over. Therefore, we cannot accept any responsibility for the content of any linked third-party site. The respective provider or operator is always responsible for the content of the linked sites. Linked sites were checked for possible infringements of the law at the time of linking; illegal content was not recognisable at that time.",
        },
        {
          title: "8. Copyright",
          body: "The content and works on these pages created by the site operator are subject to copyright. Duplication, processing, distribution and any form of commercialisation of such material beyond the scope of copyright law require the prior written consent of the author or originator. Downloads and copies of this site are only permitted for private, non-commercial use.",
        },
      ]}
    />
  )
}
