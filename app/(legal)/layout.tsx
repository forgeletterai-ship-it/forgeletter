import { LegalSidebar } from "@/components/LegalSidebar"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <div className="container legal-shell">
          <LegalSidebar />
          <div className="legal-shell__content">{children}</div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
