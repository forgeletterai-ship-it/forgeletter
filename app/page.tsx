import Link from "next/link"
import { AnimatedSeparator } from "@/components/AnimatedSeparator"
import { LandingWorkspace } from "@/components/LandingWorkspace"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { ResourceSlider } from "@/components/ResourceSlider"

const steps = [
  {
    title: "Select your job",
    body: "Paste the full job posting: role, company, responsibilities, requirements, and the language the employer uses.",
  },
  {
    title: "Add your context",
    body: "Add your current role, measurable wins, tools, strengths, and why this opportunity is the right next step.",
  },
  {
    title: "Choose the tone",
    body: "Pick professional, warm, direct, or executive so the letter matches the role, company, and seniority level.",
  },
  {
    title: "Review and apply",
    body: "When AI is connected, the polished output will be ready to edit, save, export, and use with confidence.",
  },
]

const features = [
  {
    icon: "01",
    title: "A calm writing flow",
    body: "A guided workspace removes the blank page and keeps each application focused.",
  },
  {
    icon: "02",
    title: "Reusable profile",
    body: "Save achievements, strengths, and positioning so every future draft starts with substance.",
  },
  {
    icon: "03",
    title: "History and status",
    body: "Track role, company, brief status, and next action inside one professional dashboard.",
  },
  {
    icon: "04",
    title: "Partner-ready direction",
    body: "The dashboard structure can grow into candidate management for career agencies and advisors.",
  },
]

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
    name: "Premium",
    price: "EUR 19",
    body: "For high-volume applications and international searches.",
    features: ["Unlimited workspace", "Profile variants", "Application pipeline", "Priority support"],
    cta: "Choose Premium",
    href: "/auth/signup",
  },
]

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

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main className="landing-main">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Premium cover letter workspace
              </div>
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
                  <strong>Premium</strong>
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
                  <strong>Premium shell</strong>
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

        <section className="section" id="how-it-works">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">How it works</span>
              <h2>A faster way to write better cover letters.</h2>
              <p>
                The flow is simple enough for individual users and structured
                enough to become a professional workflow for career partners.
              </p>
            </div>
            <div className="steps-grid">
              {steps.map((step, index) => (
                <article className="step-card" key={step.title}>
                  <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="workspace">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">Product shell</span>
              <h2>Choose the tone, then add the job and candidate context.</h2>
              <p>
                The generator stays paused, but the user experience now feels
                like the real flow: tone first, job requirements next, candidate
                experience below.
              </p>
            </div>
            <LandingWorkspace />
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">Built out</span>
              <h2>A stronger product foundation.</h2>
              <p>
                The important missing pieces are now represented with consistent
                product language and premium interaction patterns.
              </p>
            </div>
            <div className="grid-4">
              {features.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="examples">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">Examples</span>
              <h2>From generic application text to world-class positioning.</h2>
              <p>
                This section shows the transformation LetterForge should deliver
                once generation is connected: less generic, more specific, and
                easier for a hiring manager to trust.
              </p>
            </div>
            <div className="examples-grid">
              <div className="example-tabs">
                <div className="example-tab">
                  <strong>Product Manager</strong>
                  <span>Spotify Berlin</span>
                </div>
                <div className="example-tab">
                  <strong>Marketing Manager</strong>
                  <span>Booking.com</span>
                </div>
                <div className="example-tab">
                  <strong>Software Engineer</strong>
                  <span>ASML Eindhoven</span>
                </div>
              </div>
              <div className="comparison">
                <article className="comparison-card bad">
                  <h3>What people usually write</h3>
                  <p>
                    I am applying for this position because I believe I am a
                    good fit. I am hardworking, motivated, and passionate about
                    your company. I have many skills that match the role and I
                    would like the opportunity to contribute to your team.
                  </p>
                </article>
                <article className="comparison-card good">
                  <h3>What LetterForge should deliver</h3>
                  <p>
                    I am excited about this Product Manager role because it
                    combines user discovery, commercial judgement, and
                    cross-functional delivery. In my last role, I led a checkout
                    improvement project that raised completion by 14%, and I
                    would bring the same evidence-led approach to your growth
                    team.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">Resources</span>
              <h2>Resource blog with quick-read popups.</h2>
              <p>
                Click a resource card to open a focused information block
                without leaving the landing page.
              </p>
            </div>
            <ResourceSlider />
          </div>
        </section>

        <section className="section section-alt" id="pricing">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">Pricing</span>
              <h2>Clear plans, ready for Stripe later.</h2>
              <p>
                Pricing buttons route to signup for now. Checkout can be
                connected after plans, webhooks, and subscription records are
                confirmed.
              </p>
            </div>
            <div className="price-grid">
              {plans.map((plan) => (
                <article
                  className={`price-card${plan.highlight ? " highlight" : ""}`}
                  key={plan.name}
                >
                  <small>{plan.name}</small>
                  <div className="price">
                    {plan.price}
                    {plan.price !== "Free" ? <span> / month</span> : null}
                  </div>
                  <p>{plan.body}</p>
                  <ul className="check-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link
                    className={plan.highlight ? "button" : "button-secondary"}
                    href={plan.href}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
            <div className="secure-strip" aria-label="Purchase security">
              <div className="secure-item">
                <strong>Secure checkout</strong>
                <span>Stripe-ready payment flow with card details handled by Stripe.</span>
              </div>
              <div className="secure-item">
                <strong>No hidden charges</strong>
                <span>Clear plan pricing before checkout is enabled.</span>
              </div>
              <div className="secure-item">
                <strong>Cancel anytime</strong>
                <span>Subscription controls should live in billing settings.</span>
              </div>
              <div className="secure-item">
                <strong>Private workspace</strong>
                <span>Supabase RLS review before storing real customer content.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <span className="section-kicker">FAQ</span>
              <h2>The original customer questions, answered clearly.</h2>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <details className="faq-item" key={faq.q} open={index === 0}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="container">
            <h2>Ready for a smoother product demo.</h2>
            <p>
              The site now presents like a premium SaaS even before AI
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
