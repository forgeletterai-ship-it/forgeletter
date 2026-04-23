"use client"

import { useState, useEffect, useRef, useId } from "react"


const SANS = "'Plus Jakarta Sans', sans-serif"

const GOLD   = "#c9a258"
const GOLDHI = "#e8c46a"
const GOLDBG = "#2886c5"
const GOLDDP = "#e5c487"
const NAVY    = "#1a1510"  
const TEAL = "#0ea5e9"
const PURPLE = "#8b5cf6"
const GREEN = "#10b981"
const PINK = "#f43f5e"
const BGSOFT = "#ffffff"
const BORDER = "#ffffff"
const MUTED = "#6b7280"
const GRAD = `linear-gradient(135deg, ${GOLD} 0%, #ff8c00 100%)`
const GRAD2 = `linear-gradient(135deg, #8b5cf6 0%, #0ea5e9 100%)`

function useBreakpoint() {
  const [width, setWidth] = useState(1400)

  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return {
    width,
    isMobile: width <= 767,
    isTablet: width > 767 && width <= 1024,
    isDesktop: width > 1024,
  }
}

function Logo({ size = 36, dark = true }) {
  const gid = useId()
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="11" fill={`url(#${gid})`} />
        <path d="M10 28 Q13.5 13 20 11 Q26.5 9 29.5 14.5 Q25.5 16.5 22 22.5 L27.5 20 Q23 26.5 20.5 28.5 Z" fill="white" opacity=".95" />
        <path d="M13 30 L10.5 33.5 Q14.5 31.5 18 29" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0c040" />
            <stop offset="100%" stopColor="#e07800" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: size * 0.52, color: dark ? NAVY : "white", letterSpacing: "-.3px", lineHeight: 1 }}>
        Letter<span style={{ color: GOLD }}>Forge</span>
      </span>
    </div>
  )
}

function Nav({ onCTA }) {
  const [scrolled, setScrolled] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: isMobile ? 64 : 68,
        padding: isMobile ? "0 12px" : isTablet ? "0 24px" : "0 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(255,255,255,.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${BORDER}` : "none",
        transition: "all .3s",
      }}
    >
      <Logo size={isMobile ? 26 : 32} />

      {!isTablet && !isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["How it Works", "Features", "Pricing", "FAQ"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              style={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 14,
                color: MUTED,
                textDecoration: "none",
              }}
            >
              {l}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center" }}>
        <a
          href="/auth/login"
          style={{
            background: "transparent",
            border: "none",
            color: NAVY,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: isMobile ? 13 : 14,
            cursor: "pointer",
            padding: isMobile ? "8px 8px" : "8px 16px",
            whiteSpace: "nowrap",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Login
        </a>

        <a
          href="/auth/signup"
          style={{
            background: GRAD,
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: isMobile ? "10px 12px" : "10px 22px",
            fontSize: isMobile ? 13 : 14,
            fontWeight: 700,
            fontFamily: SANS,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(240,165,0,.35)",
            whiteSpace: "nowrap",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isMobile ? "Start Free" : "Start Free Trial →"}
        </a>
      </div>
    </nav>
  );
}

function HeroIllustration() {
  const { isMobile, isTablet, width } = useBreakpoint();

  const maxW = isMobile ? 320 : isTablet ? 460 : width > 1600 ? 720 : 580;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: maxW,
        margin: "0 auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <img
        src="/hero-image.png"
        alt="LetterForge hero illustration"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          objectFit: "contain",
          background: "transparent",
        }}
      />
    </div>
  );
}

function Hero({ onCTA }) {
  const { isMobile, isTablet } = useBreakpoint();
  const stacked = isMobile || isTablet;

  return (
    <section
      style={{
        background: "rgb(246, 244, 253)",
        padding: isMobile ? "92px 16px 48px" : isTablet ? "104px 24px 56px" : "120px 48px 80px",
        position: "relative",
        overflow: "hidden",
        minHeight: stacked ? "auto" : "100vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 60,
          right: "6%",
          width: isMobile ? 140 : isTablet ? 220 : 360,
          height: isMobile ? 140 : isTablet ? 220 : 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(240,165,0,.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "4%",
          width: isMobile ? 120 : isTablet ? 180 : 280,
          height: isMobile ? 120 : isTablet ? 180 : 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          alignItems: stacked ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 20 : isTablet ? 32 : 56,
        }}
      >
        {stacked && (
          <div
            style={{
              width: "100%",
              maxWidth: isMobile ? 320 : 460,
              margin: "0 auto 8px",
              order: 1,
            }}
          >
            <HeroIllustration />
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: stacked ? "100%" : 560,
            order: stacked ? 2 : 1,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: GOLDBG,
              border: "1px solid rgba(240,165,0,.25)",
              borderRadius: 999,
              padding: isMobile ? "6px 12px" : "7px 16px",
              marginBottom: isMobile ? 18 : 24,
              maxWidth: "100%",
            }}
          >
            <span style={{ fontSize: 15 }}>✨</span>
            <span
              style={{
                fontFamily: SANS,
                fontSize: isMobile ? 11 : 12.5,
                fontWeight: 700,
                color: GOLDDP,
                letterSpacing: 0.2,
                lineHeight: 1.2,
              }}
            >
              AI-Trained on 10,000+ Winning Letters
            </span>
          </div>

          <h1
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: isMobile ? "clamp(34px, 12vw, 48px)" : isTablet ? "clamp(46px, 8vw, 58px)" : "clamp(42px, 5vw, 68px)",
              lineHeight: isMobile ? 1.02 : 1.08,
              letterSpacing: "-1.4px",
              color: NAVY,
              marginBottom: 18,
              wordBreak: "break-word",
            }}
          >
            Write Cover Letters
            <br />
            That Actually
            <br />
            <span
              style={{
                background: GRAD,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Get Interviews
            </span>
          </h1>

          <p
            style={{
              fontSize: isMobile ? 15 : isTablet ? 16 : 18,
              color: MUTED,
              lineHeight: 1.8,
              maxWidth: stacked ? "100%" : 470,
              marginBottom: isMobile ? 22 : 28,
            }}
          >
            Paste any job description and your background. LetterForge generates a tailored, compelling cover letter in{" "}
            <strong style={{ color: NAVY }}>5 seconds flat</strong> — no blank page, no generic output.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              gap: 12,
              marginBottom: isMobile ? 22 : 28,
              width: "100%",
            }}
          >
            <button
              onClick={onCTA}
              style={{
                background: GRAD,
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: isMobile ? "15px 18px" : "15px 30px",
                fontSize: isMobile ? 16 : 16,
                fontWeight: 700,
                fontFamily: SANS,
                cursor: "pointer",
                boxShadow: "0 8px 28px rgba(240,165,0,.35)",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Get Started — Free
            </button>

            <a
              href="#examples"
              style={{
                background: "white",
                color: NAVY,
                textDecoration: "none",
                border: `2px solid ${BORDER}`,
                borderRadius: 14,
                padding: isMobile ? "15px 18px" : "15px 24px",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: SANS,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: isMobile ? "100%" : "auto",
              }}
            >
              ▶ See Examples
            </a>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: stacked ? "flex-start" : "center",
              gap: 12,
              flexWrap: "wrap",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <div style={{ display: "flex" }}>
              {["🧑", "👩", "👨", "🧑", "👩"].map((e, i) => (
                <div
                  key={i}
                  style={{
                    width: isMobile ? 30 : 34,
                    height: isMobile ? 30 : 34,
                    borderRadius: "50%",
                    background: `hsl(${i * 50 + 200},60%,65%)`,
                    border: "2px solid white",
                    marginLeft: i > 0 ? -8 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isMobile ? 14 : 16,
                    zIndex: 5 - i,
                  }}
                >
                  {e}
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>14,000+ job seekers</div>
              <div style={{ fontSize: 12, color: MUTED }}>already using LetterForge to get hired</div>
            </div>
          </div>
        </div>

        {!stacked && (
          <div
            style={{
              width: "100%",
              maxWidth: 660,
              margin: "0 auto",
              order: 2,
            }}
          >
            <HeroIllustration />
          </div>
        )}
      </div>
    </section>
  );
}

function TrustBar() {
  const items = ["Google", "Booking.com", "McKinsey", "Spotify", "KPMG", "ASML", "Deloitte", "SAP", "Google", "Booking.com", "McKinsey", "Spotify", "KPMG", "ASML", "Deloitte", "SAP"]
  return (
    <div style={{ background: NAVY, padding: "16px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", animation: "lf-marquee 24s linear infinite", whiteSpace: "nowrap" }}>
        {items.map((n, i) => (
          <span key={i} style={{ fontWeight: 600, fontSize: 15, color: i % 2 === 0 ? "rgba(255,255,255,.25)" : "rgba(240,165,0,.6)", padding: "0 28px", letterSpacing: .5 }}>
            {i % 2 === 0 ? n : "✦"}
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionPill({ color, bg, border, children }) {
  return <div style={{ display: "inline-block", background: bg, color, borderRadius: 40, padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: .5, marginBottom: 16, border }}>{children}</div>
}

function HowItWorks() {
  const { isMobile, isTablet } = useBreakpoint()
  const steps = [
    { n: "1", icon: "🔍", title: "Select Your Job", color: PURPLE, bg: "rgba(139,92,246,.08)", desc: "Paste the full job posting — role, company, requirements. The more detail, the more personalised your letter." },
    { n: "2", icon: "👤", title: "Add Your Context", color: TEAL, bg: "rgba(14,165,233,.08)", desc: "Your current role, key achievements, and why you want this specific job. Two sentences or two paragraphs." },
    { n: "3", icon: "✨", title: "AI Generates Letter", color: GOLD, bg: GOLDBG, desc: "Our AI writes a tailored, compelling letter with a strong hook, specific connections, and confident close." },
    { n: "4", icon: "🚀", title: "Copy & Apply", color: GREEN, bg: "rgba(16,185,129,.08)", desc: "Edit if needed, paste into the application, and move on. Faster, better applications with zero blank-page pain." },
  ]
  return (
    <section id="how-it-works" style={{ background: "white", padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill color={GOLDDP} bg={GOLDBG} border={`1px solid rgba(240,165,0,.2)`}>HOW IT WORKS</SectionPill>
          <h2 style={{ fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: NAVY, letterSpacing: "-1px", marginBottom: 14 }}>A faster way to write better cover letters</h2>
          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.85, maxWidth: 700, margin: "0 auto" }}>Built to turn job descriptions and your real experience into interview-worthy letters that sound human, specific, and sharp.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4,1fr)", gap: 24 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, boxShadow: "0 6px 30px rgba(26,26,46,.05)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: s.bg, marginBottom: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: s.color, letterSpacing: 1.4, marginBottom: 10 }}>{s.n.padStart(2, "0")}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 10, lineHeight: 1.25 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.8 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Generator() {
  const { isMobile, isTablet } = useBreakpoint()
  const [job, setJob] = useState("")
  const [bg, setBg] = useState("")
  const [tone, setTone] = useState("Professional")
  const [loading, setLoading] = useState(false)
  const [letter, setLetter] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const outRef = useRef(null)

  const sample = (selectedTone) => `Dear Hiring Manager,\n\nI am excited to apply for this role because it combines strategic thinking, clear communication, and ownership — the exact strengths I have built in my recent work. In my current position, I have led cross-functional initiatives, improved processes, and delivered measurable outcomes under tight timelines.\n\nWhat stands out to me about this opportunity is the emphasis on both execution and thoughtful collaboration. I enjoy turning complex requirements into clear plans, aligning stakeholders, and maintaining a high standard of quality from start to finish.\n\nMy background has taught me how to adapt quickly, communicate with confidence, and stay focused on results. I would welcome the chance to bring that same energy to your team.\n\nThank you for your time and consideration. I would be glad to discuss how my experience could contribute to your goals.\n\nSincerely,\nYour Name\n\nTone used: ${selectedTone}`

  const generate = async () => {
    if (!job.trim() || !bg.trim()) {
      setError("Please fill in both fields first.")
      return
    }
    setError("")
    setLetter("")
    setLoading(true)
    setTimeout(() => {
      setLetter(sample(tone))
      setLoading(false)
      setTimeout(() => outRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    }, 900)
  }

  const copyLetter = async () => {
    if (!letter) return
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tones = ["Professional", "Warm", "Direct", "Confident", "Polished"]

  return (
    <section id="features" style={{ background: BGSOFT, padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill color={PURPLE} bg={`rgba(139,92,246,.08)`} border={`1px solid rgba(139,92,246,.2)`}>LIVE DEMO — FREE</SectionPill>
          <h2 style={{ fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: NAVY, letterSpacing: "-1px", marginBottom: 14 }}>Try it right now.<br /><span style={{ background: GRAD2, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>No signup needed.</span></h2>
          <p style={{ color: MUTED, fontSize: 15 }}>Your first letter is free — test the experience before you commit.</p>
        </div>

        <div style={{ background: "white", borderRadius: 24, boxShadow: "0 8px 60px rgba(26,26,46,.1)", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{ background: BGSOFT, padding: isMobile ? "18px 18px" : "20px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, whiteSpace: "nowrap" }}>Letter Tone:</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tones.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    cursor: "pointer",
                    border: `1.5px solid ${tone === t ? GOLD : BORDER}`,
                    background: tone === t ? GRAD : "white",
                    color: tone === t ? "white" : MUTED,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 0 }}>
            {[
              { lbl: "01 — Job Description", icon: "📋", val: job, set: setJob, ph: "Paste the full job posting here — role, requirements, responsibilities, company info..." },
              { lbl: "02 — Your Background", icon: "👤", val: bg, set: setBg, ph: "Your current role, key achievements with numbers, skills, and why you want this job..." },
            ].map((f, i) => (
              <div key={i} style={{ padding: isMobile ? "20px 18px" : "24px 28px", borderRight: !isMobile && i === 0 ? `1px solid ${BORDER}` : "none", borderBottom: isMobile && i === 0 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? `rgba(240,165,0,.1)` : `rgba(139,92,246,.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{f.icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: i === 0 ? GOLDDP : PURPLE }}>{f.lbl}</span>
                </div>
                <textarea
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                  rows={isMobile ? 7 : 8}
                  style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 12, outline: "none", background: "#fafaf9", fontSize: 14, color: NAVY, lineHeight: 1.8, resize: "none", padding: "14px 16px" }}
                />
              </div>
            ))}
          </div>

          <div style={{ padding: isMobile ? "20px 18px 24px" : "24px 28px 28px", borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: 14, marginBottom: error ? 12 : 0 }}>
              <div style={{ color: MUTED, fontSize: 13 }}>Demo mode — frontend only. Use this to test layout and UX.</div>
              <button onClick={generate} disabled={loading} style={{ background: loading ? "#d1d5db" : GRAD, color: "white", border: "none", borderRadius: 12, padding: "14px 24px", fontWeight: 800, cursor: loading ? "default" : "pointer", minWidth: isMobile ? "100%" : 200 }}>{loading ? "Generating..." : "Generate Letter"}</button>
            </div>
            {error && <div style={{ marginTop: 12, color: PINK, fontSize: 13, fontWeight: 600 }}>{error}</div>}
          </div>
        </div>

        {(letter || loading) && (
          <div ref={outRef} style={{ marginTop: 28, background: "white", borderRadius: 22, border: `1px solid ${BORDER}`, boxShadow: "0 8px 50px rgba(26,26,46,.08)", overflow: "hidden", animation: "lf-in .25s ease" }}>
            <div style={{ padding: isMobile ? "16px 18px" : "18px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>Generated letter</div>
                <div style={{ fontSize: 12, color: MUTED }}>Ready to copy and use as a starting point</div>
              </div>
              <button onClick={copyLetter} style={{ border: `1px solid ${BORDER}`, background: copied ? "rgba(16,185,129,.1)" : "white", color: copied ? GREEN : NAVY, borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>{copied ? "Copied ✓" : "Copy letter"}</button>
            </div>
            <div style={{ padding: isMobile ? 18 : 24, whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.9, color: "#374151" }}>
              {loading ? "Generating your tailored cover letter..." : letter}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Examples() {
  const { isMobile, isTablet } = useBreakpoint()
  const [active, setActive] = useState(0)
  const ex = [
    { role: "Product Manager", co: "Spotify Berlin", text: "Dear Hiring Manager,\n\nI am writing to apply for the Product Manager role at Spotify...\n\nMy experience leading product discovery, aligning cross-functional stakeholders, and turning user insight into shipped outcomes makes this role especially exciting for me." },
    { role: "Marketing Manager", co: "Booking.com", text: "Dear Hiring Team,\n\nWhat drew me to this role immediately was the blend of performance marketing, creative strategy, and international growth...\n\nI have led campaigns across channels, improved conversion rates, and used analytics to make faster decisions." },
    { role: "Software Engineer", co: "ASML Eindhoven", text: "Dear Hiring Manager,\n\nI am excited to apply for the Software Engineer position at ASML...\n\nI enjoy building reliable systems, collaborating deeply with teams, and solving hard technical problems with clear thinking and ownership." },
  ]

  return (
    <section id="examples" style={{ background: "white", padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill color={TEAL} bg={`rgba(14,165,233,.08)`} border={`1px solid rgba(14,165,233,.18)`}>EXAMPLES</SectionPill>
          <h2 style={{ fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: NAVY, letterSpacing: "-1px", marginBottom: 14 }}>Real examples for real roles</h2>
          <p style={{ color: MUTED, fontSize: 15 }}>Switch between sample outputs to preview the writing style.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "320px 1fr", gap: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr", gap: 14, alignSelf: "start" }}>
            {ex.map((item, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ textAlign: "left", padding: 18, borderRadius: 18, border: `1px solid ${active === i ? GOLD : BORDER}`, background: active === i ? "rgba(240,165,0,.06)" : "white", cursor: "pointer" }}>
                <div style={{ fontWeight: 800, color: NAVY, marginBottom: 4 }}>{item.role}</div>
                <div style={{ fontSize: 13, color: active === i ? GOLDDP : MUTED }}>{item.co}</div>
              </button>
            ))}
          </div>
          <div style={{ background: BGSOFT, border: `1px solid ${BORDER}`, borderRadius: 22, padding: isMobile ? 18 : 26, minHeight: 320 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: GOLDDP, letterSpacing: 1.4, marginBottom: 14 }}>{ex[active].role} — {ex[active].co}</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#374151", fontSize: 14.5, lineHeight: 1.9 }}>{ex[active].text}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const { isMobile, isTablet } = useBreakpoint()
  const reviews = [
    { name: "Ioana M.", flag: "🇷🇴", role: "UX Designer", hired: "Booking.com", q: "The hiring manager mentioned my opening line in the interview. She said it made her stop scrolling.", color: PINK },
    { name: "Matej K.", flag: "🇸🇰", role: "Analyst", hired: "Deloitte", q: "Way better than the generic letters I was sending before. It finally sounded like me — just sharper.", color: GREEN },
    { name: "David H.", flag: "🇩🇪", role: "Product Manager", hired: "Spotify Berlin", q: "I write for a living. The letters LetterForge generates are genuinely good — hooks I would not have thought of.", color: NAVY },
  ]
  return (
    <section style={{ background: BGSOFT, padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill color={GREEN} bg={`rgba(16,185,129,.08)`} border={`1px solid rgba(16,185,129,.2)`}>WHAT PEOPLE SAY</SectionPill>
          <h2 style={{ fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: NAVY, letterSpacing: "-1px" }}>Real people. <span style={{ background: `linear-gradient(135deg,${GREEN},${TEAL})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Real interviews.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 20 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, transition: "all .22s" }}>
              <div style={{ color: GOLD, fontSize: 15, marginBottom: 12, letterSpacing: 2 }}>★★★★★</div>
              <p style={{ fontStyle: "italic", fontSize: 15, color: "#4b5563", lineHeight: 1.85, marginBottom: 20 }}>&quot;{r.q}&quot;</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${r.color},${r.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "white" }}>{r.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{r.name} {r.flag}</div>
                  <div style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>{r.role} → {r.hired}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const { isMobile, isTablet } = useBreakpoint()
  const [annual, setAnnual] = useState(false)
  const plans = [
    { name: "Starter", price: 0, ap: 0, tag: "Free forever", hi: false, color: MUTED, features: ["3 letters lifetime", "All 5 tone options", "Copy & paste output", "No credit card required"], cta: "Start for Free" },
    { name: "Pro", price: 9, ap: 6, tag: "Most Popular", hi: true, color: GOLD, features: ["30 letters per month", "All tone options", "Saved letter history", "Priority generation", "PDF & email export", "Email support"], cta: "Start Pro Trial" },
    { name: "Premium", price: 19, ap: 13, tag: "Maximum power", hi: false, color: PURPLE, features: ["Unlimited letters", "Best AI model", "Everything in Pro", "CV review add-on", "Interview prep Q&A", "Priority support"], cta: "Start Premium" },
  ]
  return (
    <section id="pricing" style={{ background: "white", padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill color={GOLDDP} bg={GOLDBG} border={`1px solid rgba(240,165,0,.2)`}>PRICING</SectionPill>
          <h2 style={{ fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: NAVY, letterSpacing: "-1px", marginBottom: 24 }}>Simple, transparent pricing</h2>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: BGSOFT, border: `1px solid ${BORDER}`, borderRadius: 40, padding: "6px 20px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: !annual ? NAVY : MUTED }}>Monthly</span>
            <div onClick={() => setAnnual((a) => !a)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: annual ? GOLD : "#d1d5db", position: "relative", transition: "background .2s" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: annual ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: annual ? NAVY : MUTED }}>Annual</span>
            {annual && <span style={{ background: GRAD, color: "white", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>Save 33%</span>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 22 }}>
          {plans.map((p, i) => (
            <div key={i} style={{ background: p.hi ? NAVY : "white", border: p.hi ? `2px solid ${GOLD}` : `1px solid ${BORDER}`, borderRadius: 22, padding: "36px 30px", position: "relative", transform: p.hi && !isMobile ? "scale(1.04)" : "none", boxShadow: p.hi ? "0 24px 72px rgba(26,26,46,.25)" : undefined }}>
              {p.hi && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: GRAD, color: "white", fontSize: 11, fontWeight: 800, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>⭐ Most Popular</div>}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: p.hi ? GOLD : MUTED, marginBottom: 10 }}>{p.name}</div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: p.hi ? "white" : NAVY, letterSpacing: "-2px", lineHeight: 1 }}>€{annual ? p.ap : p.price}</span>
                {p.price > 0 && <span style={{ fontSize: 15, color: p.hi ? "rgba(255,255,255,.4)" : MUTED, marginLeft: 4 }}>/mo</span>}
              </div>
              <div style={{ fontSize: 13, color: p.hi ? "rgba(255,255,255,.4)" : MUTED, marginBottom: 24 }}>{p.tag}{annual && p.price > 0 ? " · billed annually" : ""}</div>
              <div style={{ height: 1, background: p.hi ? "rgba(255,255,255,.1)" : BORDER, marginBottom: 22 }} />
              <ul style={{ listStyle: "none", marginBottom: 28, display: "flex", flexDirection: "column", gap: 11, padding: 0 }}>
                {p.features.map((f, fi) => (
                  <li key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14 }}>
                    <span style={{ color: p.hi ? GOLD : GREEN, fontWeight: 700, marginTop: 1, fontSize: 15 }}>✓</span>
                    <span style={{ color: p.hi ? "rgba(255,255,255,.7)" : "#4b5563", lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button style={{ width: "100%", padding: "14px 18px", borderRadius: 14, border: p.hi ? "none" : `1px solid ${BORDER}`, background: p.hi ? GRAD : "white", color: p.hi ? "white" : NAVY, fontWeight: 800, cursor: "pointer" }}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const { isMobile, isTablet } = useBreakpoint()
  const [open, setOpen] = useState(null)
  const faqs = [
    { q: "Why not just use ChatGPT for free?", a: "A general AI given a basic prompt produces generic letters. LetterForge is tuned for stronger hooks, sharper relevance, and cleaner cover-letter structure." },
    { q: "Will hiring managers know it's AI?", a: "Not unless you tell them. The goal is to produce writing that sounds human, specific, and role-aware rather than generic AI output." },
    { q: "How personalised is it really?", a: "Very. Each draft is based on the job description and your experience, which means different jobs produce different letters." },
    { q: "What languages does it support?", a: "You can draft in multiple languages, but polished English output is the core use case for international applications." },
    { q: "Can I cancel anytime?", a: "Yes. Billing plans can be changed or cancelled at any time." },
    { q: "Is my data safe?", a: "Use secure backend handling before public launch. For the public product, API keys should never live in frontend code." },
  ]
  return (
    <section id="faq" style={{ background: BGSOFT, padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1.4fr", gap: isMobile ? 32 : 80, alignItems: "start" }}>
        <div>
          <SectionPill color={GOLDDP} bg={GOLDBG} border={`1px solid rgba(240,165,0,.2)`}>FAQ</SectionPill>
          <h2 style={{ fontSize: "clamp(30px,3.5vw,42px)", fontWeight: 800, color: NAVY, letterSpacing: "-1px", lineHeight: 1.2, marginBottom: 20 }}>Any questions?<br /><span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>We got you.</span></h2>
          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.8, marginBottom: 28 }}>Everything you need to know about LetterForge. Cannot find what you need? Email us.</p>
          <a href="mailto:hello@letterforge.io" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GRAD, color: "white", textDecoration: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(240,165,0,.3)" }}>Contact Us →</a>
        </div>
        <div>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", padding: "18px 0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", gap: 16, textAlign: "left" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{f.q}</span>
                <span style={{ width: 28, height: 28, minWidth: 28, borderRadius: "50%", background: open === i ? GOLD : BORDER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: open === i ? "white" : MUTED, transform: open === i ? "rotate(45deg)" : "none", transition: "all .2s" }}>+</span>
              </button>
              {open === i && <p style={{ paddingBottom: 18, fontSize: 14.5, color: MUTED, lineHeight: 1.85, animation: "lf-in .2s ease" }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ onCTA }) {
  const { isMobile, isTablet } = useBreakpoint()
  return (
    <section style={{ background: NAVY, padding: isMobile ? "72px 20px" : isTablet ? "84px 28px" : "100px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 30%, rgba(240,165,0,.12), transparent 40%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 860, margin: "0 auto", position: "relative" }}>
        <h2 style={{ fontSize: "clamp(34px,5vw,54px)", lineHeight: 1.08, fontWeight: 800, color: "white", letterSpacing: "-1.4px", marginBottom: 16 }}>Start landing more interviews with better cover letters</h2>
        <p style={{ color: "rgba(255,255,255,.68)", fontSize: isMobile ? 15 : 17, lineHeight: 1.85, maxWidth: 680, margin: "0 auto 30px" }}>Get tailored drafts in seconds, edit them fast, and apply with more confidence.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={onCTA} style={{ background: GRAD, color: "white", border: "none", borderRadius: 14, padding: isMobile ? "14px 20px" : "16px 28px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 12px 28px rgba(240,165,0,.28)" }}>Get Started Free</button>
          <a href="mailto:hello@letterforge.io" style={{ textDecoration: "none", color: "white", border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)", borderRadius: 14, padding: isMobile ? "14px 18px" : "16px 24px", fontWeight: 700 }}>Talk to us</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const { isMobile, isTablet } = useBreakpoint()
  return (
    <footer style={{ background: "#0e0c1a", padding: isMobile ? "44px 20px 28px" : isTablet ? "48px 28px 28px" : "56px 48px 28px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1.5fr 1fr 1fr" : "2.5fr 1fr 1fr 1fr", gap: 32, marginBottom: 48 }}>
          <div>
            <Logo size={32} dark={false} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.25)", lineHeight: 1.9, marginTop: 16, maxWidth: 240 }}>AI cover letters that get you interviews. Built in Bulgaria 🇧🇬, used in 34 countries.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              {["Instagram", "TikTok", "LinkedIn"].map((s) => (
                <span key={s} style={{ fontSize: 12, color: "rgba(255,255,255,.22)", fontWeight: 500, background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "6px 12px" }}>{s}</span>
              ))}
            </div>
          </div>
          {[
            { title: "Product", links: ["How it Works", "Pricing", "Examples", "FAQ"] },
            { title: "Resources", links: ["Blog", "Cover Letter Tips", "Job Search Guide", "Interview Prep"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact"] },
          ].map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,.2)", marginBottom: 18 }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map((l) => (
                  <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.32)", textDecoration: "none" }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.15)" }}>© 2026 LetterForge · hello@letterforge.io</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.15)" }}>Payments by <span style={{ color: "#635bff", fontWeight: 700 }}>Stripe</span> · GDPR Compliant</span>
        </div>
      </div>
    </footer>
  )
}

export default function Page() {
  const scrollToGen = () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
  return (
    <>
      <Nav onCTA={scrollToGen} />
      <Hero onCTA={scrollToGen} />
      <TrustBar />
      <HowItWorks />
      <Generator />
      <Examples />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA onCTA={scrollToGen} />
      <Footer />
    </>
  )
}
