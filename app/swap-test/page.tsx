import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import ResultsFlow from "@/components/swap/ResultsFlow"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { getSiteUrl } from "@/lib/site-url"
import "./swap.css"

/**
 * /swap-test (Phase 6). Unreachable until SWAP_TEST_ENABLED="true"
 * (Rule 11 — no public link before the Phase 5 gates pass). The
 * rubric explainer and FAQ live ONLY here (no query cannibalisation
 * with the homepage demo).
 */

export const dynamic = "force-dynamic"

function swapEnabled(): boolean {
  return process.env.SWAP_TEST_ENABLED === "true"
}

function readConfig<T>(rel: string): T | null {
  try {
    const p = resolve(process.cwd(), rel)
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, "utf-8")) as T
  } catch {
    return null
  }
}

export async function generateMetadata(props: {
  searchParams: Promise<{ share?: string }>
}): Promise<Metadata> {
  const { share } = await props.searchParams
  const base: Metadata = {
    // The layout's title template appends "— ForgeLetter"; the
    // rendered result is the doc's exact title.
    title: "Is your cover letter generic? Free swap test",
    description:
      "Paste a cover letter. We redact everything specific to the employer and show you what's left — plus how many of your claims a reader could actually check.",
    alternates: { canonical: "/swap-test" },
  }
  if (share && /^[0-9a-f-]{36}$/i.test(share)) {
    base.openGraph = {
      images: [`${getSiteUrl()}/api/og/swap?id=${share}`],
    }
  }
  return base
}

export default async function SwapTestPage() {
  if (!swapEnabled()) notFound()

  const session = await auth()
  const benchmark = readConfig<{ medianAnchor: number; medianProof: number; n: number }>(
    "config/benchmark.json"
  )
  const reliability = readConfig<{ quadrantAgreement: number }>("config/reliability.json")

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "The Swap Test",
    url: `${getSiteUrl()}/swap-test`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description:
      "A free diagnostic that redacts everything employer-specific from a cover letter and scores what remains.",
  }

  return (
    <>
      <PublicNav />
      <main className="landing-main swap-scope">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="section">
          <div className="container" style={{ maxWidth: 860 }}>
            <h1>Remove everything about the employer. What&apos;s left?</h1>
            <p className="swap-disclosure" style={{ fontSize: 16, lineHeight: 1.7 }}>
              Paste a cover letter. One scan redacts every passage that could
              only have been written to this employer, then scores what
              remains — no account needed for the first one.
            </p>

            <ResultsFlow isLoggedIn={Boolean(session?.user)} benchmark={benchmark} />

            <h2 style={{ marginTop: 48 }}>The four kinds of sentence</h2>
            <div className="swap-legend">
              <div className="swap-block">
                <span className="swap-s swap-s--distinctive-them">Specific to them</span>
                <p className="swap-disclosure">
                  Names a decision, product, or fact that fits only this
                  employer. Survives the swap test.
                </p>
              </div>
              <div className="swap-block">
                <span className="swap-s swap-s--checkable-you">Checkable about you</span>
                <p className="swap-disclosure">
                  A number, named result, or dated event an interviewer could
                  probe.
                </p>
              </div>
              <div className="swap-block">
                <span className="swap-s swap-s--boilerplate-them">Boilerplate about them</span>
                <p className="swap-disclosure">
                  Would survive unchanged at any competitor.
                </p>
              </div>
              <div className="swap-block">
                <span className="swap-s swap-s--asserted-you">Asserted about you</span>
                <p className="swap-disclosure">
                  A claim with nothing behind it a reader could check.
                </p>
              </div>
            </div>

            <h2 style={{ marginTop: 48 }}>Reading the Anchor score</h2>
            <table className="swap-band-table">
              <thead>
                <tr>
                  <th>Anchor</th>
                  <th>What it usually means</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>0%</td>
                  <td>The letter never engages with the employer at all.</td>
                </tr>
                <tr>
                  <td>1–12%</td>
                  <td>A name-drop or two; nothing that survives the swap.</td>
                </tr>
                <tr className="swap-band--healthy">
                  <td>12–35%</td>
                  <td>Healthy — real engagement without displacing your evidence.</td>
                </tr>
                <tr>
                  <td>&gt;35%</td>
                  <td>More about them than about you — research replacing evidence.</td>
                </tr>
              </tbody>
            </table>

            <h2 style={{ marginTop: 48 }}>Two letters, measured</h2>
            <table className="swap-compare">
              <thead>
                <tr>
                  <th></th>
                  <th>ChatGPT · generic prompt</th>
                  <th>ForgeLetter · real profile</th>
                  <th>Your letter</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Anchor</td>
                  <td className="swap-num">0%</td>
                  <td className="swap-num">25%</td>
                  <td>?</td>
                </tr>
                <tr>
                  <td>Proof</td>
                  <td className="swap-num">25%</td>
                  <td className="swap-num">100%</td>
                  <td>?</td>
                </tr>
                <tr>
                  <td>Verdict</td>
                  <td>FILLER</td>
                  <td>TARGETED</td>
                  <td>Scan it</td>
                </tr>
              </tbody>
            </table>
            <p className="swap-disclosure">
              Both example letters are printed in full in the demo above the
              fold on our homepage; their scores are computed by this exact
              rubric, not quoted.
            </p>

            <div className="swap-validity" style={{ marginTop: 48 }}>
              <h2>What this does and doesn&apos;t tell you</h2>
              <p>
                <strong>What&apos;s measured.</strong> Anchor is the share of your
                letter, by word count, that makes a claim about this employer
                that would not hold for a competitor hiring the same role.
                Proof is the share of claims about you that carry a number, a
                named result, or a dated event.
              </p>
              <p>
                <strong>What&apos;s established.</strong> A 2025 Yale study of 5.5
                million cover letters on a large freelance platform found that
                before AI writing tools became available, a one standard
                deviation increase in how closely a cover letter matched its
                job posting was associated with a 15.46% higher probability of
                being selected. After those tools arrived, that relationship
                weakened by 51% for callbacks and 79% for offers — employers
                shifted toward signals harder to fake, such as work history.
                The same study found time spent editing an AI draft was
                positively associated with receiving an offer, while over 75%
                of AI-generated letters were submitted within a minute of
                generation.
              </p>
              <p>
                <strong>What that means for these scores.</strong> The study
                measured keyword overlap with the posting. That is not what we
                measure. Keyword overlap is now cheap to produce, which is why
                its signal decayed. We measure two things that remain
                expensive: knowing something real about the employer, and
                having a number you can defend. We think those hold their
                value longer. <strong>We have not proven it.</strong>
              </p>
              <p>
                <strong>What is not established.</strong> We have no evidence
                that a high Anchor or Proof score increases your chance of an
                interview. Nobody has run that study, including us. These
                scores describe properties of your letter. They do not predict
                outcomes.
              </p>
              <p>
                <strong>What we&apos;ll do about it.</strong> We&apos;re collecting
                outcome data. When we have enough, we&apos;ll publish what we find
                — including if it shows these scores don&apos;t matter.
              </p>
            </div>

            <div className="swap-faq" style={{ marginTop: 48 }}>
              <h2>FAQ</h2>
              <h4>Do you store my cover letter?</h4>
              <p>
                No — unless you tick the optional research box, in which case
                we keep a copy with names, employers and figures stripped out.
                Otherwise it&apos;s analysed in memory and discarded: nothing
                written to a database, nothing used for training. If you paste
                a job ad we keep word counts from it, never the text. If you
                click &quot;share result&quot; we save the scores for 30 days.
              </p>
              <h4>How many scans do I get?</h4>
              <p>
                One without an account, two more with a free account — three
                total. This tool is a diagnosis; the fixing is what our
                product does. Paying customers get unlimited scans to verify
                their letters.
              </p>
              <h4>Why don&apos;t you swap in a real competitor&apos;s name?</h4>
              <p>
                Because we&apos;d have to guess one, and a wrong guess is worse
                than no guess — especially outside the US, where a model is
                likely to suggest a company from the wrong market entirely.
                Removing the employer-specific content makes the same point
                and requires knowing nothing about the company.
              </p>
              <h4>Is a high Anchor score always better?</h4>
              <p>
                No. Above about 35% the letter is more about them than about
                you, which usually means research replacing evidence. The
                healthy band is 12–35%.
              </p>
              <h4>Is this the same check ForgeLetter letters go through?</h4>
              <p>
                No. This is a standalone diagnostic. Our generation pipeline
                uses its own quality gate — twelve agents, a hallucination
                check against your profile, and a coverage check. The two are
                deliberately separate.
              </p>
              <h4>How reliable is the score?</h4>
              <p>
                Run the same letter twice and the verdict agrees{" "}
                {reliability ? `${reliability.quadrantAgreement}%` : "—%"} of
                the time. We test this on 200 letters before every rubric
                change and publish the number.
              </p>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
