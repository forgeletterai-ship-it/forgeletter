import type { Metadata } from "next"
import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"

export const metadata: Metadata = {
  title: "About us",
  description:
    "ForgeLetter builds evidence-based cover letters. Learn what we stand for: grounded writing, quality over volume, and privacy by design.",
  alternates: {
    canonical: "/about",
  },
}

const principles = [
  {
    title: "Grounded in evidence",
    body: "Every letter is built only from your real experience. Our engine verifies each claim against your profile — if you didn't do it, the letter doesn't say it.",
    icon: "shield",
  },
  {
    title: "Quality over volume",
    body: "Up to twelve AI agents write, critique, and score every letter before you see it. A letter that doesn't pass the quality gate doesn't ship.",
    icon: "gate",
  },
  {
    title: "Private by design",
    body: "Your profile and letters stay yours. Payments run through Stripe — we never see your card — and you can export or delete your data at any time.",
    icon: "lock",
  },
] as const

function PrincipleIcon({ type }: { type: (typeof principles)[number]["icon"] }) {
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.8l7.5 3v5.4c0 4.9-3.2 8.4-7.5 10-4.3-1.6-7.5-5.1-7.5-10V5.8z" />
        <path d="M8.8 12l2.3 2.3 4.1-4.6" />
      </svg>
    )
  }
  if (type === "gate") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M8.2 12.3l2.4 2.4 5.2-5.5" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.2 10.5V7.9a3.8 3.8 0 0 1 7.6 0v2.6" />
      <path d="M12 14.5v2.6" />
    </svg>
  )
}

export default function AboutPage() {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="about-luxury section">
          <div className="container">
            <div className="about-luxury__head">
              <span className="about-luxury__kicker">About us</span>
              <h1>
                Built for people who refuse to send{" "}
                <span className="headline-teal">generic</span> applications.
              </h1>
              <p>
                ForgeLetter exists because most cover letters fail for the same
                reason: they could have been written by anyone, for any company.
                We built an AI engine that works the opposite way — it starts
                from your real experience, checks every claim against it, and
                writes letters a hiring manager can actually verify.
              </p>
            </div>

            <div className="about-luxury__grid">
              {principles.map((principle) => (
                <article className="about-luxury__card" key={principle.title}>
                  <span className="about-luxury__icon">
                    <PrincipleIcon type={principle.icon} />
                  </span>
                  <h2>{principle.title}</h2>
                  <p>{principle.body}</p>
                </article>
              ))}
            </div>

            <div className="about-luxury__note">
              <p>
                ForgeLetter is built by a small, independent team with one
                measure of success: letters that get real people into real
                interviews. What we&apos;re building next is public on our{" "}
                <Link href="/#roadmap">roadmap</Link>.
              </p>
              <div className="about-luxury__actions">
                <Link className="button" href="/contact">
                  Get in touch
                </Link>
                <Link className="button-secondary" href="/#how-it-works">
                  See how it works
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
