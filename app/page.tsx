import Link from "next/link"
import { AnimatedSeparator } from "@/components/AnimatedSeparator"
import { ExampleShowcase } from "@/components/ExampleShowcase"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { ResourceSlider } from "@/components/ResourceSlider"

const steps = [
  {
    n: "01",
    title: "Select your role",
    body: "Paste the job description, company details, and requirements so the engine understands the opportunity.",
    dark: false,
  },
  {
    n: "02",
    title: "Add your context",
    body: "Share your experience, achievements, strengths, and goals to shape a more personal draft.",
    dark: false,
  },
  {
    n: "03",
    title: "Choose the tone",
    body: "Set the voice—professional, warm, direct, or executive—so every letter matches the role.",
    dark: false,
  },
  {
    n: "04",
    title: "Review and apply",
    body: "Refine the final output, make edits, and export a polished cover letter ready to send.",
    dark: true,
  },
] as const

const engineFeatures = [
  {
    icon: "pen",
    number: "01",
    title: "AI-Powered Writing Flow",
    body: "Answer a few smart questions and let our AI turn your story into a powerful cover letter.",
  },
  {
    icon: "profile",
    number: "02",
    title: "Personalized to Perfection",
    body: "Tailored to the job description, your experience, and the company’s values—every time.",
  },
  {
    icon: "chip",
    number: "03",
    title: "Smart Insights That Matter",
    body: "Our AI analyzes the role and your profile to highlight what hiring managers care about most.",
  },
  {
    icon: "document",
    number: "04",
    title: "Ready to Send, Every Time",
    body: "Clean, confident, and error-free letters—optimized for impact and readability.",
  },
] as const

const plans = [
  {
    name: "Starter",
    price: "Free",
    body: "For testing the product and preparing your first applications.",
    features: ["Draft workspace", "Applicant profile", "3 saved letters", "Basic history"],
    cta: "Start free",
    href: "/auth/signup",
  },
  {
    name: "Pro",
    price: "EUR 9",
    body: "For active job seekers who want a smoother weekly workflow.",
    features: ["More saved letters", "Tone presets", "PDF-ready exports", "Priority roadmap access"],
    cta: "Choose Pro",
    href: "/auth/signup",
    highlight: true,
  },
  {
    name: "Ultra",
    price: "EUR 19",
    body: "For high-volume applications and international searches.",
    features: ["Unlimited workspace", "Profile variants", "Application pipeline", "Priority support"],
    cta: "Choose Ultra",
    href: "/auth/signup",
  },
]

const securityItems = [
  {
    icon: "shield",
    title: "Secure checkout",
    body: "Stripe-ready payment flow",
  },
  {
    icon: "tag",
    title: "No hidden charges",
    body: "Clear plan pricing",
  },
  {
    icon: "sync",
    title: "Cancel anytime",
    body: "Subscription controls in billing settings",
  },
  {
    icon: "lock",
    title: "Private workspace",
    body: "Profile and application data are stored securely",
  },
] as const

const faqs = [
  {
    q: "Why not just use ChatGPT for free?",
    a: "A blank chat still leaves users building prompts, formatting letters, and tracking versions manually. LetterForge gives the whole workflow a focused structure.",
  },
  {
    q: "Will hiring managers know it is AI?",
    a: "The product is designed to produce a polished draft that still needs user review. The final letter should be truthful, specific, and edited before sending.",
  },
  {
    q: "How personalised is it really?",
    a: "Personalisation comes from the job posting, the candidate profile, measurable achievements, and the chosen tone. Better input creates better output.",
  },
  {
    q: "What languages does it support?",
    a: "The product is currently shaped around polished English applications. Additional languages can be added after the core flow is stable.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Once Stripe billing is connected, subscription controls should live inside the billing dashboard and Stripe customer portal.",
  },
  {
    q: "Is my data safe?",
    a: "The interface is prepared for private user data. Before launch, Supabase RLS and server-side secret handling should be reviewed carefully.",
  },
]

function EngineFeatureIcon({ name }: { name: (typeof engineFeatures)[number]["icon"] }) {
  if (name === "pen") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 34.5l2.4-8.8L31.1 10a4.2 4.2 0 0 1 6 6L21.4 31.7 13 34.5Z" />
        <path d="M28.4 12.7l6.1 6.1" />
        <path d="M15.4 25.7l6 6" />
        <path d="M8.5 13.5l1.1-2.9 1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z" />
        <path d="M34.8 31.2l.8-2.1.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z" />
      </svg>
    )
  }

  if (name === "profile") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M17 35v-2.8c0-4.1 3.1-7.2 7-7.2s7 3.1 7 7.2V35" />
        <path d="M24 21.5a6.1 6.1 0 1 0 0-12.2 6.1 6.1 0 0 0 0 12.2Z" />
        <path d="M34 15h7" />
        <path d="M34 23h7" />
        <path d="M34 31h5" />
        <path d="M12 8h24" />
      </svg>
    )
  }

  if (name === "chip") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="14" y="14" width="20" height="20" rx="3" />
        <path d="M18 8v6M24 8v6M30 8v6M18 34v6M24 34v6M30 34v6M8 18h6M8 24h6M8 30h6M34 18h6M34 24h6M34 30h6" />
        <text x="24" y="27.5" textAnchor="middle">
          AI
        </text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 7h14l7 7v27H15V7Z" />
      <path d="M29 7v8h7" />
      <path d="M20 20h12" />
      <path d="M20 27h9" />
      <circle cx="32" cy="32" r="6" />
      <path d="M29.3 32.1l2 2 3.6-4" />
    </svg>
  )
}

function PricingSecurityIcon({ type }: { type: (typeof securityItems)[number]["icon"] }) {
  if (type === "shield") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 4.5 25 8v6.6c0 5.9-3.6 10.2-9 12.9-5.4-2.7-9-7-9-12.9V8l9-3.5Z" />
        <path d="m12.2 16.3 2.5 2.5 5.5-6" />
      </svg>
    )
  }

  if (type === "tag") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5.5 17.2 17.2 5.5h7.3v7.3L12.8 24.5 5.5 17.2Z" />
        <circle cx="21.4" cy="10.6" r="1.8" />
      </svg>
    )
  }

  if (type === "sync") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M25.5 12.6A9.8 9.8 0 0 0 8.7 8.8L6 11.6" />
        <path d="M6 6.1v5.5h5.5" />
        <path d="M6.5 19.4a9.8 9.8 0 0 0 16.8 3.8l2.7-2.8" />
        <path d="M26 25.9v-5.5h-5.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="8" y="14" width="16" height="12" rx="2" />
      <path d="M11.5 14v-3.1a4.5 4.5 0 0 1 9 0V14" />
      <path d="M16 18.5v3.3" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main className="landing-main">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1>
                Apply with letters that feel <span>specific, sharp, and yours.</span>
              </h1>
              <p className="hero-copy">
                LetterForge helps job seekers and future career-agency partners
                prepare stronger cover letter briefs, organise applications, and
                move faster without losing quality.
              </p>
              <div className="hero-actions">
                <Link className="button" href="/auth/signup">
                  Start free
                </Link>
                <Link className="button-secondary" href="#workspace">
                  Try the workspace
                </Link>
              </div>
              <div className="hero-proof" aria-label="Product highlights">
                <div className="proof-item">
                  <strong>Guided</strong>
                  <span>tone, job requirements, and experience fields</span>
                </div>
                <div className="proof-item">
                  <strong>Ultra</strong>
                  <span>auth, dashboard, resources, billing, and legal shell</span>
                </div>
                <div className="proof-item">
                  <strong>Ready</strong>
                  <span>for secure AI, Supabase persistence, and Stripe</span>
                </div>
              </div>
            </div>

            <div className="hero-media">
              <div className="hero-image-frame">
                <img src="/hero-image-transparent.png" alt="LetterForge brain workspace illustration" />
              </div>
              <div className="mini-metrics">
                <div className="mini-metric">
                  <span>Workspace</span>
                  <strong>Private</strong>
                </div>
                <div className="mini-metric">
                  <span>Status</span>
                  <strong>AI paused</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AnimatedSeparator />

        <section className="section section-alt engine-compare-section" id="workspace">
          <div className="container">
            <div className="engine-compare">
              <div className="engine-compare__head">
                <span className="section-kicker">Compare</span>
                <h2>Why Choose ForgeLetter</h2>
                <p>
                  Stop relying on blank pages and generic prompts. ForgeLetter
                  structures the job brief, your evidence, and the right tone so
                  every cover letter can feel specific, polished, and ready to
                  refine.
                </p>
              </div>

              <div className="engine-compare__panel">
                <article className="engine-compare__column engine-compare__column--manual">
                  <h3>Manual writing</h3>
                  <ul className="engine-compare__list">
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--bad" aria-hidden="true" />
                      <span>Starts from a blank page</span>
                    </li>
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--bad" aria-hidden="true" />
                      <span>Generic ChatGPT or Claude prompts</span>
                    </li>
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--bad" aria-hidden="true" />
                      <span>Keywords and evidence get missed</span>
                    </li>
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--bad" aria-hidden="true" />
                      <span>Slow edits for every application</span>
                    </li>
                  </ul>
                </article>

                <article className="engine-compare__column engine-compare__column--engine">
                  <h3>
                    <span className="engine-compare__logo" aria-label="ForgeLetter">
                      <svg className="engine-compare__logo-mark" viewBox="0 0 40 40" aria-hidden="true">
                        <rect width="40" height="40" rx="11" fill="url(#engineForgeLetterGradient)" />
                        <path
                          d="M10 28 Q13.5 13 20 11 Q26.5 9 29.5 14.5 Q25.5 16.5 22 22.5 L27.5 20 Q23 26.5 20.5 28.5 Z"
                          fill="white"
                          opacity=".95"
                        />
                        <path
                          d="M13 30 L10.5 33.5 Q14.5 31.5 18 29"
                          stroke="white"
                          strokeLinecap="round"
                          strokeWidth="1.4"
                        />
                        <defs>
                          <linearGradient
                            id="engineForgeLetterGradient"
                            x1="0"
                            x2="40"
                            y1="0"
                            y2="40"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset="0%" stopColor="#f0c040" />
                            <stop offset="100%" stopColor="#e07800" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="engine-compare__logo-text">
                        Forge<span>Letter</span>
                      </span>
                    </span>
                  </h3>
                  <ul className="engine-compare__list">
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--good" aria-hidden="true" />
                      <span>Guided brief before generation</span>
                    </li>
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--good" aria-hidden="true" />
                      <span>Job keywords tied to real evidence</span>
                    </li>
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--good" aria-hidden="true" />
                      <span>Consistent tone for each role</span>
                    </li>
                    <li className="engine-compare__item">
                      <span className="engine-compare__mark engine-compare__mark--good" aria-hidden="true" />
                      <span>Reusable workflow for faster applications</span>
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="workflow-visual" id="how-it-works" aria-labelledby="workflow-heading">
          <div className="decor-circle decor-circle-right" />
          <div className="decor-circle decor-circle-left" />
          <div className="marble-glow glow-right" />
          <div className="marble-glow glow-bottom" />

          <div className="intro-copy">
            <div className="kicker">How it works</div>
            <h2 id="workflow-heading">
              A faster way to write
              <br />
              better cover letters.
            </h2>
            <p>
              A guided AI workflow that helps you move from job description
              <br className="desktop" />
              to polished final letter with clarity, speed, and premium presentation.
            </p>
          </div>

          <div className="premium-rail-wrap" aria-hidden="true">
            <svg className="premium-rail" viewBox="0 0 1600 470" preserveAspectRatio="none">
              <defs>
                <linearGradient id="railTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1f7375" />
                  <stop offset="24%" stopColor="#287f7d" />
                  <stop offset="52%" stopColor="#2c8783" />
                  <stop offset="76%" stopColor="#267d7a" />
                  <stop offset="100%" stopColor="#1d7073" />
                </linearGradient>
                <linearGradient id="railGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#eabf6f" />
                  <stop offset="30%" stopColor="#f8c76a" />
                  <stop offset="58%" stopColor="#ffc86d" />
                  <stop offset="100%" stopColor="#eabf6f" />
                </linearGradient>
              </defs>

              <path
                className="rail-shadow"
                d="M0 390 H380 C430 390 420 350 470 350 H780 C830 350 820 250 870 250 H1145 C1195 250 1185 160 1235 160 H1600"
              />
              <path
                className="rail-base"
                d="M0 390 H380 C430 390 420 350 470 350 H780 C830 350 820 250 870 250 H1145 C1195 250 1185 160 1235 160 H1600"
              />
              <path
                className="rail-gold"
                d="M0 390 H380 C430 390 420 350 470 350 H780 C830 350 820 250 870 250 H1145 C1195 250 1185 160 1235 160 H1600"
              />
              <path
                className="rail-highlight"
                d="M0 382 H380 C430 382 420 342 470 342 H780 C830 342 820 242 870 242 H1145 C1195 242 1185 152 1235 152 H1600"
              />
            </svg>
          </div>

          <div className="step-grid">
            {steps.map((step, index) => (
              <article
                className={`step-card card-${index + 1} ${step.dark ? "dark" : "light"}`}
                key={step.n}
              >
                <div className="step-number">{step.n}</div>
                <div className="small-rule" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section ai-engine-section">
          <div className="container">
            <div className="ai-engine-head">
              <span className="ai-engine-badge">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.5l1.9 6.6 6.6 1.9-6.6 1.9-1.9 6.6-1.9-6.6-6.6-1.9 6.6-1.9L12 2.5Z" />
                </svg>
                AI COVER LETTER ENGINE
              </span>
              <h2>
                AI that writes. <span>You get hired.</span>
              </h2>
              <p>
                Our AI engine crafts personalized cover letters that speak to the role,
                highlight your strengths, and get you noticed.
              </p>
            </div>

            <div className="ai-engine-grid" aria-label="AI cover letter engine features">
              {engineFeatures.map((feature, index) => (
                <article
                  className={`ai-engine-card${index === 2 ? " ai-engine-card--featured" : ""}`}
                  key={feature.title}
                >
                  <div className="ai-engine-icon">
                    <EngineFeatureIcon name={feature.icon} />
                  </div>
                  <div className="ai-engine-number">{feature.number}</div>
                  <div className="ai-engine-rule" aria-hidden="true" />
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                  <button className="ai-engine-arrow" type="button" aria-label={`${feature.title} details`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h13" />
                      <path d="M13 7l5 5-5 5" />
                    </svg>
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="examples-luxury section" id="examples">
          <div className="container">
            <div className="examples-luxury__head">
              <span className="examples-luxury__kicker">Examples</span>
              <h2>From generic application text to world-class positioning.</h2>
              <p>
                See how ForgeLetter transforms a standard prompt into a
                compelling, role-specific narrative that shows impact, fit, and
                measurable value.
              </p>
            </div>
            <ExampleShowcase />
          </div>
        </section>

        <section className="resources-luxury section" id="resources">
          <div className="container">
            <div className="resources-luxury__head">
              <span className="resources-luxury__kicker">Tips & tricks</span>
              <h2>A flexible library that grows with your workflow.</h2>
              <p>
                Practical guides, templates, and insights curated to help you
                move faster and make stronger applications.
              </p>
            </div>
            <ResourceSlider />
          </div>
        </section>

        <section className="pricing-luxury section section-alt" id="pricing">
          <div className="container">
            <div className="pricing-luxury__head">
              <span className="pricing-luxury__kicker">Pricing</span>
              <h2>Clear plans, secured by Stripe.</h2>
              <p>
                Start free, then upgrade when you&apos;re ready for a smoother
                application workflow.
              </p>
            </div>

            <div className="pricing-arch-grid">
              {plans.map((plan) => {
                const isPaid = plan.price !== "Free"
                const amount = plan.price.replace("EUR ", "")

                return (
                <article
                  className={`pricing-arch-card${plan.highlight ? " pricing-arch-card--featured" : ""}`}
                  key={plan.name}
                >
                  <div className="pricing-arch-card__inner">
                    <small>{plan.name}</small>
                    <div className="pricing-arch-price">
                      {isPaid ? (
                        <>
                          <span>EUR</span>
                          <strong>{amount}</strong>
                          <em>/ month</em>
                        </>
                      ) : (
                        <strong>Free</strong>
                      )}
                    </div>
                    <p>{plan.body}</p>

                    <div className="pricing-arch-rule" aria-hidden="true">
                      <span />
                    </div>

                    <ul className="pricing-arch-list">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>

                    {plan.highlight ? (
                      <div className="pricing-popular">Most popular</div>
                    ) : null}

                    <Link
                      className={`pricing-arch-button${plan.highlight ? " pricing-arch-button--gold" : ""}`}
                      href={plan.href}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </article>
                )
              })}
            </div>

            <div className="pricing-security-bar" aria-label="Purchase security">
              {securityItems.map((item) => (
                <div className="pricing-security-item" key={item.title}>
                  <div className="pricing-security-icon">
                    <PricingSecurityIcon type={item.icon} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="faq-luxury section" id="faq">
          <div className="container faq-luxury__grid">
            <aside className="faq-luxury__copy" aria-labelledby="faq-heading">
              <span className="faq-luxury__kicker">FAQ</span>
              <h2 id="faq-heading">
                The original customer questions, <span>answered clearly.</span>
              </h2>
              <div className="faq-luxury__rule" aria-hidden="true" />
              <p>
                Everything you need to know about how ForgeLetter works, your
                data, and your results.
              </p>
            </aside>

            <div className="faq-luxury__list">
              {faqs.map((faq, index) => (
                <details className="faq-luxury__item" key={faq.q} open={index === 0}>
                  <summary>
                    <span className="faq-luxury__number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="faq-luxury__question">{faq.q}</span>
                    <span className="faq-luxury__toggle" aria-hidden="true" />
                  </summary>
                  <div className="faq-luxury__answer">
                    <div className="faq-luxury__answer-rule" aria-hidden="true">
                      <span />
                    </div>
                    <p>{faq.a}</p>
                  </div>
                </details>
              ))}

              <div className="faq-luxury__contact">
                <span className="faq-luxury__help" aria-hidden="true">?</span>
                <span>Still have questions?</span>
                <Link href="/contact">Contact us</Link>
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="container">
            <h2>Ready for a smoother product demo.</h2>
            <p>
              The site now presents like a polished SaaS even before AI
              generation is wired in.
            </p>
            <Link className="button" href="/auth/signup">
              Create account
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
