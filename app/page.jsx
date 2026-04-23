"use client"

import { useState, useEffect, useRef, useId } from "react";


const SERIF = "'Cormorant Garamond', serif";
const SANS  = "'Plus Jakarta Sans', sans-serif";

// ── Brand colors ──────────────────────────────────────────
const GOLD   = "#f0a500";
const GOLDDP = "#c47f00";
const GOLDBG = "rgba(240,165,0,.08)";
const NAVY   = "#1a1a2e";
const TEAL   = "#0ea5e9";
const PURPLE = "#8b5cf6";
const GREEN  = "#10b981";
const PINK   = "#f43f5e";
const BG     = "#ffffff";
const BGSOFT = "#f8f7ff";
const BORDER = "#e8e6f0";
const MUTED  = "#6b7280";

const GRAD = `linear-gradient(135deg, ${GOLD} 0%, #ff8c00 100%)`;
const GRAD2 = `linear-gradient(135deg, #8b5cf6 0%, #0ea5e9 100%)`;
const GRAD3 = `linear-gradient(135deg, #f43f5e 0%, #f0a500 100%)`;

// ── Logo ──────────────────────────────────────────────────
function Logo({ size = 36, dark = true }) {
  const gid = useId();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="11" fill={`url(#${gid})`}/>
        <path d="M10 28 Q13.5 13 20 11 Q26.5 9 29.5 14.5 Q25.5 16.5 22 22.5 L27.5 20 Q23 26.5 20.5 28.5 Z" fill="white" opacity=".95"/>
        <path d="M13 30 L10.5 33.5 Q14.5 31.5 18 29" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0c040"/>
            <stop offset="100%" stopColor="#e07800"/>
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontFamily:SANS, fontWeight:800, fontSize:size*0.52, color: dark ? NAVY : "white", letterSpacing:"-.3px", lineHeight:1 }}>
        Letter<span style={{ color:GOLD }}>Forge</span>
      </span>
    </div>
  );
}

// ── Floating illustration shapes ──────────────────────────
function HeroIllustration() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 560,
        height: 500,
        margin: "0 auto",
      }}
    >
      {/* ambient glow */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 70,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,.16), transparent 72%)",
          filter: "blur(34px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(240,165,0,.12), transparent 72%)",
          filter: "blur(34px)",
          pointerEvents: "none",
        }}
      />

      {/* main card */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 82,
          width: 388,
          borderRadius: 30,
          padding: 30,
          background: "linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.88) 100%)",
          border: "1px solid rgba(255,255,255,.95)",
          boxShadow:
            "0 30px 80px rgba(17,24,39,.14), 0 10px 24px rgba(17,24,39,.06), inset 0 1px 0 rgba(255,255,255,.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          animation: "lf-bob 5.5s ease-in-out infinite",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg,#f6a400,#ff7f11)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "white",
              boxShadow: "0 10px 24px rgba(240,165,0,.32)",
              flexShrink: 0,
            }}
          >
            ✍
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>
              Cover Letter Generated
            </div>
            <div style={{ fontSize: 11.5, color: "#7a8191", marginTop: 2 }}>
              Product Manager · Google Zurich
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 800,
              color: "#059669",
              background: "rgba(16,185,129,.12)",
              border: "1px solid rgba(16,185,129,.18)",
            }}
          >
            Done ✓
          </div>
        </div>

        <div
          style={{
            height: 12,
            width: "88%",
            borderRadius: 999,
            background: "linear-gradient(90deg,#f0a500,#ff8c00)",
            marginBottom: 14,
            boxShadow: "0 6px 18px rgba(240,165,0,.18)",
          }}
        />
        <div style={{ height: 10, width: "72%", borderRadius: 999, background: "rgba(99,102,241,.07)", marginBottom: 10 }} />
        <div style={{ height: 10, width: "84%", borderRadius: 999, background: "rgba(99,102,241,.07)", marginBottom: 10 }} />
        <div style={{ height: 10, width: "58%", borderRadius: 999, background: "rgba(99,102,241,.07)", marginBottom: 10 }} />
        <div style={{ height: 10, width: "76%", borderRadius: 999, background: "rgba(99,102,241,.07)", marginBottom: 20 }} />

        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              padding: "14px 24px",
              borderRadius: 16,
              background: "rgba(240,165,0,.08)",
              color: "#c47f00",
              border: "1px solid rgba(240,165,0,.16)",
              fontWeight: 800,
              fontSize: 13.5,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
            }}
          >
            Copy Letter
          </div>
          <div
            style={{
              padding: "14px 24px",
              borderRadius: 16,
              background: "rgba(99,102,241,.05)",
              color: "#737b8c",
              border: "1px solid rgba(120,130,160,.12)",
              fontWeight: 700,
              fontSize: 13.5,
            }}
          >
            Regenerate
          </div>
        </div>
      </div>

      {/* top-left stat */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 16,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 22px",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 100%)",
          border: "1px solid rgba(255,255,255,.95)",
          boxShadow: "0 22px 48px rgba(139,92,246,.10), 0 8px 18px rgba(17,24,39,.05)",
          backdropFilter: "blur(12px)",
          animation: "lf-float 5.2s ease-in-out infinite",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "linear-gradient(135deg,#8b5cf6,#a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            color: "white",
            boxShadow: "0 10px 24px rgba(139,92,246,.24)",
          }}
        >
          🎯
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1a1a2e" }}>Interview Rate</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#8b5cf6", lineHeight: 1.05 }}>89%</div>
        </div>
      </div>

      {/* bottom-left stat */}
      <div
        style={{
          position: "absolute",
          left: 52,
          bottom: 42,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 22px",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 100%)",
          border: "1px solid rgba(255,255,255,.95)",
          boxShadow: "0 22px 48px rgba(16,185,129,.10), 0 8px 18px rgba(17,24,39,.05)",
          backdropFilter: "blur(12px)",
          animation: "lf-float 5.8s ease-in-out infinite",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "linear-gradient(135deg,#10b981,#34d399)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            color: "white",
            boxShadow: "0 10px 24px rgba(16,185,129,.22)",
          }}
        >
          ⚡
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1a1a2e" }}>Generated in</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#10b981", lineHeight: 1.05 }}>5 sec</div>
        </div>
      </div>

      {/* bottom-right stat */}
      <div
        style={{
          position: "absolute",
          right: 18,
          bottom: 36,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 22px",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 100%)",
          border: "1px solid rgba(255,255,255,.95)",
          boxShadow: "0 22px 48px rgba(14,165,233,.10), 0 8px 18px rgba(17,24,39,.05)",
          backdropFilter: "blur(12px)",
          animation: "lf-float 6.1s ease-in-out infinite",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            color: "white",
            boxShadow: "0 10px 24px rgba(14,165,233,.22)",
          }}
        >
          🌍
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1a1a2e" }}>Countries</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#0ea5e9", lineHeight: 1.05 }}>34+</div>
        </div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────
function Nav({ onCTA }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      height:68, padding:"0 48px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      background: scrolled ? "rgba(255,255,255,.95)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? `1px solid ${BORDER}` : "none",
      transition:"all .3s",
    }}>
      <Logo size={32}/>
      <div style={{ display:"flex", alignItems:"center", gap:32 }}>
        {["How it Works","Features","Pricing","FAQ"].map(l => (
          <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`} style={{
            fontFamily:SANS, fontWeight:500, fontSize:14,
            color:MUTED, textDecoration:"none", transition:"color .18s",
          }}
          onMouseEnter={e=>e.target.style.color=NAVY}
          onMouseLeave={e=>e.target.style.color=MUTED}>{l}</a>
        ))}
      </div>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <button style={{ background:"transparent", border:"none", color:NAVY, fontFamily:SANS, fontWeight:600, fontSize:14, cursor:"pointer", padding:"8px 16px" }}>Login</button>
        <button onClick={onCTA} style={{
          background:GRAD, color:"white", border:"none", borderRadius:10,
          padding:"10px 22px", fontSize:14, fontWeight:700, fontFamily:SANS,
          cursor:"pointer", boxShadow:"0 4px 16px rgba(240,165,0,.35)",
          transition:"all .2s",
        }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(240,165,0,.5)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 16px rgba(240,165,0,.35)";}}>
          Start Free Trial →
        </button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────
function Hero({ onCTA }) {
  return (
    <section style={{
      background:`linear-gradient(160deg, #fefefe 0%, #f8f5ff 40%, #fff8ec 100%)`,
      padding:"120px 48px 80px",
      position:"relative", overflow:"hidden",
      minHeight:"100vh", display:"flex", alignItems:"center",
    }}>
      {/* Bg decorations */}
      <div style={{ position:"absolute", top:80, right:"8%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(240,165,0,.07) 0%,transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:0, left:"5%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:"30%", left:"2%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(14,165,233,.05) 0%,transparent 70%)", pointerEvents:"none" }}/>

      <div style={{
  maxWidth:1160,
  margin:"0 auto",
  width:"100%",
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  gap:60,
  flexWrap:"wrap",
}}>
        {/* Left */}
        <div style={{ maxWidth:540, flex:"1 1 420px", minWidth:0 }}>
          {/* Eyebrow pill */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:GOLDBG, border:`1px solid rgba(240,165,0,.25)`, borderRadius:40, padding:"6px 16px", marginBottom:28, animation:"lf-up .6s ease both" }}>
            <span style={{ fontSize:16 }}>✨</span>
            <span style={{ fontFamily:SANS, fontSize:12.5, fontWeight:700, color:GOLDDP, letterSpacing:.5 }}>AI-Trained on 10,000+ Winning Letters</span>
          </div>

          <h1 style={{
            fontFamily:SANS, fontWeight:800, fontSize:"clamp(38px, 4.5vw, 58px)",
            lineHeight:1.12, letterSpacing:"-1.2px", color:NAVY,
            marginBottom:22, animation:"lf-up .7s .1s ease both", opacity:1,
          }}>
            Write Cover Letters<br/>
            That Actually<br/>
            <span style={{ background:GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Get Interviews ✦</span>
          </h1>

          <p style={{
            fontSize:17, color:MUTED, lineHeight:1.8, maxWidth:460,
            marginBottom:36, animation:"lf-up .7s .2s ease both", opacity:1,
          }}>
            Paste any job description and your background. LetterForge generates a tailored, compelling cover letter in <strong style={{ color:NAVY }}>5 seconds flat</strong> — no blank page, no generic output.
          </p>

          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:44, animation:"lf-up .7s .3s ease both", opacity:1 }}>
            <button onClick={onCTA} style={{
              background:GRAD, color:"white", border:"none", borderRadius:12,
              padding:"15px 34px", fontSize:16, fontWeight:700, fontFamily:SANS,
              cursor:"pointer", boxShadow:"0 8px 28px rgba(240,165,0,.4)",
              transition:"all .22s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 14px 36px rgba(240,165,0,.5)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 8px 28px rgba(240,165,0,.4)";}}>
              Get Started — Free
            </button>
            <a href="#examples" style={{
              background:"white", color:NAVY, textDecoration:"none",
              border:`2px solid ${BORDER}`, borderRadius:12,
              padding:"15px 24px", fontSize:16, fontWeight:600, fontFamily:SANS,
              display:"inline-flex", alignItems:"center", gap:8, transition:"all .2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.color=GOLDDP;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color=NAVY;}}>
              ▶ See Examples
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display:"flex", alignItems:"center", gap:16, animation:"lf-up .7s .4s ease both", opacity:1 }}>
            <div style={{ display:"flex" }}>
              {["🧑","👩","👨","🧑","👩"].map((e,i) => (
                <div key={i} style={{ width:34, height:34, borderRadius:"50%", background:`hsl(${i*50+200},60%,65%)`, border:"2px solid white", marginLeft: i>0?-8:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, zIndex:5-i }}>
                  {e}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:NAVY }}>14,000+ job seekers</div>
              <div style={{ fontSize:12, color:MUTED }}>already using LetterForge to get hired</div>
            </div>
          </div>
        </div>

        {/* Right — illustration */}
        <div style={{
  display:"flex",
  justifyContent:"center",
  flex:"1 1 420px",
  minWidth:0,
  animation:"lf-up .8s .2s ease both",
  opacity:1
}}>
          <HeroIllustration/>
        </div>
      </div>
    </section>
  );
}

// ── Trust bar ─────────────────────────────────────────────
function TrustBar() {
  const items = ["Google","Booking.com","McKinsey","Spotify","KPMG","ASML","Deloitte","SAP","Google","Booking.com","McKinsey","Spotify","KPMG","ASML","Deloitte","SAP"];
  return (
    <div style={{ background:NAVY, padding:"16px 0", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", animation:"lf-marquee 24s linear infinite", whiteSpace:"nowrap" }}>
        {items.map((n,i) => (
          <span key={i} style={{ fontFamily:SANS, fontWeight:600, fontSize:15, color: i%2===0?"rgba(255,255,255,.25)":"rgba(240,165,0,.6)", padding:"0 28px", letterSpacing:.5 }}>
            {i%2===0 ? n : "✦"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n:"1", icon:"🔍", title:"Select Your Job", color:PURPLE, bg:"rgba(139,92,246,.08)", desc:"Paste the full job posting — role, company, requirements. The more detail, the more personalised your letter." },
    { n:"2", icon:"👤", title:"Add Your Context", color:TEAL,   bg:"rgba(14,165,233,.08)",  desc:"Your current role, key achievements, and why you want this specific job. Two sentences or two paragraphs." },
    { n:"3", icon:"✨", title:"AI Generates Letter", color:GOLD, bg:GOLDBG,                desc:"Our AI writes a tailored, compelling letter with a strong hook, specific connections, and confident close." },
    { n:"4", icon:"🚀", title:"Copy & Apply",       color:GREEN, bg:"rgba(16,185,129,.08)", desc:"Copy your letter, personalise the final touch, and submit. Most users get their first interview within a week." },
  ];
  return (
    <section id="how-it-works" style={{ background:"white", padding:"100px 48px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <div style={{ display:"inline-block", background:GOLDBG, color:GOLDDP, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:16, border:`1px solid rgba(240,165,0,.2)` }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily:SANS, fontSize:"clamp(32px,4vw,48px)", fontWeight:800, color:NAVY, letterSpacing:"-1px", lineHeight:1.2, marginBottom:14 }}>
            From blank page to<br/>interview in <span style={{ background:GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>4 simple steps</span>
          </h2>
          <p style={{ fontSize:16, color:MUTED, maxWidth:480, margin:"0 auto" }}>No AI expertise needed. No complex prompting. Just paste, click, and get a letter that works.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24 }}>
          {steps.map((s,i) => (
            <div key={i} style={{
              background:"white", border:`1px solid ${BORDER}`, borderRadius:20,
              padding:"30px 24px", position:"relative", transition:"all .25s",
              cursor:"default",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px)";e.currentTarget.style.boxShadow=`0 20px 60px rgba(0,0,0,.1)`;e.currentTarget.style.borderColor=s.color;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=BORDER;}}>
              {/* Number badge */}
              <div style={{ position:"absolute", top:-14, left:24, background:s.color, color:"white", width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, boxShadow:`0 4px 12px rgba(0,0,0,.2)` }}>{s.n}</div>
              <div style={{ width:52, height:52, borderRadius:14, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:18, marginTop:6 }}>{s.icon}</div>
              <h3 style={{ fontFamily:SANS, fontSize:17, fontWeight:700, color:NAVY, marginBottom:10, lineHeight:1.3 }}>{s.title}</h3>
              <p style={{ fontSize:14, color:MUTED, lineHeight:1.75 }}>{s.desc}</p>
              <div style={{ marginTop:16, fontSize:13, fontWeight:600, color:s.color, display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                Learn more →
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Generator (live demo) ─────────────────────────────────
const TONES = ["Professional","Confident","Enthusiastic","Creative","Concise"];
const SYS = `You are the world's best cover letter writer. Elite career coach meets masterful copywriter.
RULES: 1) Never start "I am writing" or "I am excited". 2) Open with a metric, bold claim, or vivid story. 3) Show skills through results—never adjectives. 4) Include ONE specific metric. 5) Mirror job description language. 6) Every sentence specific to this job. 7) Confident close. 8) Exactly 3-4 paragraphs.`;

function Generator() {
  const [job, setJob] = useState("");
  const [bg,  setBg]  = useState("");
  const [tone,setTone]= useState("Professional");
  const [loading,setLoading]= useState(false);
  const [letter,setLetter]  = useState("");
  const [error, setError]   = useState("");
  const [copied,setCopied]  = useState(false);
  const [used,  setUsed]    = useState(0);
  const outRef = useRef(null);

  const generate = async () => {
    if (!job.trim()||!bg.trim()){setError("Please fill in both fields first.");return;}
    if (used>=1){setError("Sign up free for unlimited letters!");return;}
    setError(""); setLetter(""); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          system: SYS+`\nTone: ${tone}`,
          messages:[{role:"user",content:`JOB:\n${job}\n\nBACKGROUND:\n${bg}\n\nWrite the letter.`}]
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setLetter(data.content?.find(b=>b.type==="text")?.text||"");
      setUsed(u=>u+1);
      setTimeout(()=>outRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),100);
    } catch(e){setError("Failed: "+e.message);}
    finally{setLoading(false);}
  };

  return (
    <section id="features" style={{ background:BGSOFT, padding:"100px 48px" }}>
      <div style={{ maxWidth:1060, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ display:"inline-block", background:`rgba(139,92,246,.08)`, color:PURPLE, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:16, border:`1px solid rgba(139,92,246,.2)` }}>LIVE DEMO — FREE</div>
          <h2 style={{ fontFamily:SANS, fontSize:"clamp(32px,4vw,46px)", fontWeight:800, color:NAVY, letterSpacing:"-1px", marginBottom:14 }}>
            Try it right now.<br/><span style={{ background:GRAD2, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>No signup needed.</span>
          </h2>
          <p style={{ color:MUTED, fontSize:15 }}>Your first letter is completely free — see the quality before you commit.</p>
        </div>

        <div style={{ background:"white", borderRadius:24, boxShadow:"0 8px 60px rgba(26,26,46,.1)", border:`1px solid ${BORDER}`, overflow:"hidden" }}>
          {/* Tone bar */}
          <div style={{ background:BGSOFT, padding:"20px 28px", borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <span style={{ fontFamily:SANS, fontSize:13, fontWeight:700, color:NAVY, whiteSpace:"nowrap" }}>Letter Tone:</span>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {TONES.map(t=>(
                <button key={t} onClick={()=>setTone(t)} style={{
                  padding:"6px 16px", borderRadius:20, cursor:"pointer", transition:"all .15s", fontFamily:SANS,
                  border:`1.5px solid ${tone===t?GOLD:BORDER}`,
                  background: tone===t ? GRAD : "white",
                  color: tone===t ? "white" : MUTED,
                  fontSize:13, fontWeight:600,
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
            {[
              {lbl:"01 — Job Description",icon:"📋",val:job,set:setJob,ph:"Paste the full job posting here — role, requirements, responsibilities, company info..."},
              {lbl:"02 — Your Background", icon:"👤",val:bg, set:setBg, ph:"Your current role, key achievements with numbers, skills, and why you want this job..."},
            ].map((f,i)=>{
              const ref = useRef(null);
              return (
                <div key={i} ref={ref} style={{ padding:"24px 28px", borderRight:i===0?`1px solid ${BORDER}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:i===0?`rgba(240,165,0,.1)`:`rgba(139,92,246,.1)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{f.icon}</div>
                    <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:i===0?GOLDDP:PURPLE }}>{f.lbl}</span>
                  </div>
                  <textarea value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} rows={8} style={{
                    width:"100%", border:`1.5px solid ${BORDER}`, borderRadius:12, outline:"none",
                    background:"#fafaf9", fontFamily:SANS, fontSize:14, color:NAVY, lineHeight:1.8,
                    resize:"none", padding:"14px 16px", transition:"border-color .2s",
                  }}
                  onFocus={e=>{e.target.style.borderColor=i===0?GOLD:PURPLE; if(ref.current)ref.current.style.background=BGSOFT;}}
                  onBlur={e=>{e.target.style.borderColor=BORDER; if(ref.current)ref.current.style.background="white";}}/>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && <div style={{ margin:"0 28px 12px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 16px", color:"#dc2626", fontSize:14 }}>⚠ {error}</div>}

          {/* Button */}
          <div style={{ padding:"20px 28px 28px" }}>
            <button onClick={generate} disabled={loading} style={{
              width:"100%", padding:"18px", borderRadius:14, border:"none",
              background: loading ? "rgba(240,165,0,.2)" : GRAD,
              color:"white", fontSize:17, fontWeight:700, fontFamily:SANS,
              cursor: loading?"wait":"pointer",
              boxShadow: loading?"none":"0 8px 28px rgba(240,165,0,.35)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:12,
              transition:"all .22s",
            }}
            onMouseEnter={e=>{if(!loading){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 14px 36px rgba(240,165,0,.45)";}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=loading?"none":"0 8px 28px rgba(240,165,0,.35)";}}>
              {loading
                ? <><div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"white",borderRadius:"50%",animation:"lf-spin .7s linear infinite"}}/> Generating your letter...</>
                : "✦ Generate My Cover Letter — Free"}
            </button>
          </div>

          {/* Loading shimmer */}
          {loading && (
            <div style={{ margin:"-8px 28px 28px", background:BGSOFT, borderRadius:14, padding:"24px 28px" }}>
              {[88,70,82,60,76,68].map((w,i)=>(
                <div key={i} style={{height:12,background:BORDER,borderRadius:6,marginBottom:12,width:`${w}%`,animation:`lf-shimmer 1.6s ${i*.12}s infinite`}}/>
              ))}
            </div>
          )}

          {/* Output */}
          {letter && !loading && (
            <div ref={outRef} style={{ margin:"0 28px 28px", border:`2px solid ${GOLD}`, borderRadius:16, overflow:"hidden", animation:"lf-up .4s ease", boxShadow:`0 8px 40px rgba(240,165,0,.1)` }}>
              <div style={{ background:`linear-gradient(135deg,#fff8ec,#fff4e0)`, padding:"14px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid rgba(240,165,0,.25)` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e" }}/>
                  <span style={{ fontWeight:700, color:GOLDDP, fontSize:14 }}>Your Cover Letter — {tone}</span>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>{navigator.clipboard.writeText(letter);setCopied(true);setTimeout(()=>setCopied(false),2200);}} style={{ padding:"7px 18px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:SANS,cursor:"pointer", background:copied?"#22c55e":GRAD,color:"white",border:"none",transition:"all .15s" }}>{copied?"✓ Copied!":"Copy Letter"}</button>
                  <button onClick={generate} style={{ padding:"7px 18px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:SANS,cursor:"pointer", background:"white",color:GOLDDP,border:`1.5px solid rgba(240,165,0,.4)` }}>Regenerate</button>
                </div>
              </div>
              <div style={{ background:"white", padding:"28px 32px" }}>
                <div style={{ fontSize:15.5,lineHeight:2.1,color:"#374151",whiteSpace:"pre-wrap",fontFamily:SANS,fontWeight:400,borderLeft:`3px solid ${GOLD}`,paddingLeft:22 }}>{letter}</div>
              </div>
              <div style={{ background:GOLDBG, padding:"14px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                <span style={{ fontSize:13, color:MUTED }}>✦ First letter free · Sign up for unlimited letters</span>
                <button style={{ background:GRAD,color:"white",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,fontFamily:SANS,cursor:"pointer",boxShadow:"0 4px 14px rgba(240,165,0,.3)" }}>Sign Up Free →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Examples ──────────────────────────────────────────────
function Examples() {
  const [active,setActive]=useState(0);
  const ex=[
    {role:"Product Manager",co:"Spotify Berlin",
      bad:`Dear Hiring Manager,\n\nI am writing to apply for the Product Manager position. I am a motivated individual with a passion for technology. I believe my skills make me a great fit.\n\nI am a team player and quick learner. Thank you.`,
      good:`The feature I led last year now handles 4.2 million daily sessions — shipped three weeks ahead of schedule, zero critical bugs in the first month. That's why your PM opening caught my attention immediately.\n\nAt SoundCloud, I owned the discovery surface for our Eastern European markets. The segment grew 34% YoY. I ran weekly discovery sprints, shipped continuously, and cut time-to-insight from 14 days to 3 by rebuilding analytics alongside two engineers.`},
    {role:"Marketing Manager",co:"Booking.com",
      bad:`To Whom It May Concern,\n\nI am interested in the Marketing Manager role. I am hardworking and passionate about marketing. I have experience in campaigns and social media.\n\nI look forward to hearing from you.`,
      good:`In 2024, I ran a content campaign that generated €2.1M in pipeline on a €9,000 budget. My content team 233x'd the investment — that's the bar I hold myself to.\n\nAt Rebrand Digital, I rebuilt our strategy from demographic targeting to jobs-to-be-done principles. Organic traffic grew 187% in fourteen months. Sales reported a 31% higher close rate on inbound.`},
    {role:"Software Engineer",co:"Google Zurich",
      bad:`Hello,\n\nI'd like to apply for the Software Engineer role. I know Python and React. I love coding and enjoy challenges.\n\nI am available immediately. Thank you.`,
      good:`I inherited a codebase with a 47-second build time, no tests, and a deploy requiring three engineers on a call. Eighteen months later: 8-second builds, 94% coverage, one-click deploys.\n\nAt FinanceFlow, I designed the pipeline that processes €340M in daily transactions. When we found a race condition 3 days before launch, we rebuilt the entire concurrency model in 72 hours — without delaying release.`},
  ];
  return (
    <section id="examples" style={{ background:"white", padding:"100px 48px", borderTop:`1px solid ${BORDER}` }}>
      <div style={{ maxWidth:1060, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div style={{ display:"inline-block", background:`rgba(244,63,94,.07)`, color:PINK, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:16, border:`1px solid rgba(244,63,94,.2)` }}>BEFORE & AFTER</div>
          <h2 style={{ fontFamily:SANS, fontSize:"clamp(32px,4vw,46px)", fontWeight:800, color:NAVY, letterSpacing:"-1px" }}>
            See the difference <span style={{ background:GRAD3, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>instantly.</span>
          </h2>
        </div>
        {/* Role tabs */}
        <div style={{ display:"flex", gap:10, marginBottom:32, justifyContent:"center", flexWrap:"wrap" }}>
          {ex.map((e,i)=>(
            <button key={i} onClick={()=>setActive(i)} style={{
              padding:"10px 22px", borderRadius:10, cursor:"pointer", fontFamily:SANS, transition:"all .15s",
              border:`1.5px solid ${active===i?GOLD:BORDER}`,
              background: active===i?GOLDBG:"white",
              color: active===i?GOLDDP:MUTED,
              fontSize:13.5, fontWeight:600,
            }}>{e.role} → {e.co}</button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
          {[
            {lbl:"❌ Without LetterForge", text:ex[active].bad,  borderColor:"#fca5a5", bg:"#fff5f5", tC:"#6b7280", hC:"#ef4444"},
            {lbl:"✦ With LetterForge",    text:ex[active].good, borderColor:GOLD,       bg:"#fffbf0", tC:"#374151", hC:GOLDDP},
          ].map((col,i)=>(
            <div key={i} style={{ background:col.bg, border:`2px solid ${col.borderColor}`, borderRadius:18, padding:"26px 30px", boxShadow:i===1?`0 8px 40px rgba(240,165,0,.12)`:undefined }}>
              <div style={{ fontSize:12, fontWeight:700, color:col.hC, letterSpacing:1, marginBottom:16, textTransform:"uppercase", fontFamily:SANS }}>{col.lbl}</div>
              <p style={{ fontSize:15, color:col.tC, lineHeight:1.95, whiteSpace:"pre-wrap", fontFamily:i===1?"Georgia, serif":SANS, fontStyle:i===1?"normal":"normal", fontWeight:i===1?400:300 }}>{col.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────
function Testimonials() {
  const reviews=[
    {name:"Ioana M.",flag:"🇷🇴",role:"UX Designer",hired:"Booking.com",q:"Applied Monday. Called Thursday. The opening line was better than anything I'd written in 3 months of trying.",color:PURPLE},
    {name:"Aleksander P.",flag:"🇧🇬",role:"Senior Engineer",hired:"ASML",q:"LetterForge understood Dutch professional culture instantly. It doesn't just translate — it adapts. Total game changer.",color:TEAL},
    {name:"Maria S.",flag:"🇧🇬",role:"Fresh Graduate",hired:"Deloitte",q:"No experience and terrified. LetterForge turned my dissertation into a compelling story. Four interviews in two weeks.",color:GREEN},
    {name:"Tomáš K.",flag:"🇨🇿",role:"Sales Director",hired:"HubSpot",q:"I've tried ChatGPT. Nothing comes close. LetterForge makes real, specific connections between my background and the role.",color:GOLD},
    {name:"Andreea V.",flag:"🇷🇴",role:"Marketing Lead",hired:"London startup",q:"The hiring manager mentioned my opening line in the interview. She said it made her stop scrolling. Worth every cent.",color:PINK},
    {name:"David H.",flag:"🇩🇪",role:"Product Manager",hired:"Spotify Berlin",q:"I write for a living. The letters LetterForge generates are genuinely good — hooks I wouldn't have thought of.",color:NAVY},
  ];
  return (
    <section style={{ background:BGSOFT, padding:"100px 48px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ display:"inline-block", background:`rgba(16,185,129,.08)`, color:GREEN, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:16, border:`1px solid rgba(16,185,129,.2)` }}>WHAT PEOPLE SAY</div>
          <h2 style={{ fontFamily:SANS, fontSize:"clamp(32px,4vw,46px)", fontWeight:800, color:NAVY, letterSpacing:"-1px" }}>
            Real people. <span style={{ background:`linear-gradient(135deg,${GREEN},${TEAL})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Real interviews.</span>
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
          {reviews.map((r,i)=>(
            <div key={i} style={{
              background:"white", border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px",
              transition:"all .22s", cursor:"default",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 20px 60px rgba(0,0,0,.1)";e.currentTarget.style.borderColor=r.color;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=BORDER;}}>
              <div style={{ color:GOLD, fontSize:15, marginBottom:12, letterSpacing:2 }}>★★★★★</div>
              <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:15, color:"#4b5563", lineHeight:1.85, marginBottom:20 }}>"{r.q}"</p>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${r.color},${r.color}88)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:SANS, fontSize:16, fontWeight:800, color:"white" }}>{r.name[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:NAVY }}>{r.name} {r.flag}</div>
                  <div style={{ fontSize:12, color:r.color, fontWeight:600 }}>{r.role} → {r.hired}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────
function Pricing() {
  const [annual,setAnnual]=useState(false);
  const plans=[
    {name:"Starter",price:0,ap:0,tag:"Free forever",hi:false,color:MUTED,
      features:["3 letters lifetime","All 5 tone options","Copy & paste output","No credit card required"],cta:"Start for Free"},
    {name:"Pro",price:9,ap:6,tag:"Most Popular",hi:true,color:GOLD,
      features:["30 letters per month","All tone options","Saved letter history","Priority generation","PDF & email export","Email support"],cta:"Start Pro Trial"},
    {name:"Premium",price:19,ap:13,tag:"Maximum power",hi:false,color:PURPLE,
      features:["Unlimited letters","Best AI model (Claude Sonnet)","Everything in Pro","CV review add-on","Interview prep Q&A","WhatsApp delivery","Priority support"],cta:"Start Premium"},
  ];
  return (
    <section id="pricing" style={{ background:"white", padding:"100px 48px", borderTop:`1px solid ${BORDER}` }}>
      <div style={{ maxWidth:980, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ display:"inline-block", background:GOLDBG, color:GOLDDP, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:16, border:`1px solid rgba(240,165,0,.2)` }}>PRICING</div>
          <h2 style={{ fontFamily:SANS, fontSize:"clamp(32px,4vw,46px)", fontWeight:800, color:NAVY, letterSpacing:"-1px", marginBottom:24 }}>
            Simple, transparent pricing
          </h2>
          {/* Toggle */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:14, background:BGSOFT, border:`1px solid ${BORDER}`, borderRadius:40, padding:"6px 20px" }}>
            <span style={{ fontSize:13, fontWeight:600, color:!annual?NAVY:MUTED }}>Monthly</span>
            <div onClick={()=>setAnnual(a=>!a)} style={{ width:44,height:24,borderRadius:12,cursor:"pointer", background:annual?GOLD:"#d1d5db",position:"relative",transition:"background .2s" }}>
              <div style={{ width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:annual?23:3,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)" }}/>
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:annual?NAVY:MUTED }}>Annual</span>
            {annual && <span style={{ background:GRAD,color:"white",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700 }}>Save 33%</span>}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:22 }}>
          {plans.map((p,i)=>(
            <div key={i} style={{
              background: p.hi ? NAVY : "white",
              border: p.hi ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
              borderRadius:22, padding:"36px 30px", position:"relative",
              transform: p.hi?"scale(1.04)":"none",
              boxShadow: p.hi?"0 24px 72px rgba(26,26,46,.25)":undefined,
              transition:"all .22s",
            }}
            onMouseEnter={e=>{if(!p.hi){e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 16px 48px rgba(0,0,0,.1)";}}}
            onMouseLeave={e=>{if(!p.hi){e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}}>
              {p.hi && <div style={{ position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:GRAD,color:"white",fontSize:11,fontWeight:800,padding:"4px 16px",borderRadius:20,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(240,165,0,.4)" }}>⭐ Most Popular</div>}
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:p.hi?GOLD:MUTED,marginBottom:10,fontFamily:SANS }}>{p.name}</div>
              <div style={{ marginBottom:6 }}>
                <span style={{ fontFamily:SANS,fontSize:52,fontWeight:800,color:p.hi?"white":NAVY,letterSpacing:"-2px",lineHeight:1 }}>€{annual?p.ap:p.price}</span>
                {p.price>0&&<span style={{ fontSize:15,color:p.hi?"rgba(255,255,255,.4)":MUTED,marginLeft:4 }}>/mo</span>}
              </div>
              <div style={{ fontSize:13,color:p.hi?"rgba(255,255,255,.4)":MUTED,marginBottom:24 }}>{p.tag}{annual&&p.price>0?" · billed annually":""}</div>
              <div style={{ height:1,background:p.hi?"rgba(255,255,255,.1)":BORDER,marginBottom:22 }}/>
              <ul style={{ listStyle:"none",marginBottom:28,display:"flex",flexDirection:"column",gap:11 }}>
                {p.features.map((f,fi)=>(
                  <li key={fi} style={{ display:"flex",alignItems:"flex-start",gap:10,fontSize:14 }}>
                    <span style={{ color:p.hi?GOLD:GREEN,fontWeight:700,marginTop:1,fontSize:15 }}>✓</span>
                    <span style={{ color:p.hi?"rgba(255,255,255,.7)":"#4b5563",lineHeight:1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button style={{
                width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:SANS,
                background: p.hi ? GRAD : p.color===PURPLE ? `linear-gradient(135deg,#8b5cf6,#a78bfa)` : BGSOFT,
                color: p.hi ? "white" : p.color===PURPLE ? "white" : NAVY,
                fontSize:15,fontWeight:700,
                boxShadow:p.hi?"0 4px 20px rgba(240,165,0,.4)":undefined,
                transition:"all .18s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.opacity=".88";e.currentTarget.style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="none";}}>
                {p.cta} →
              </button>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center",marginTop:28,fontSize:13,color:MUTED }}>7-day money-back guarantee · Cancel anytime · No questions asked</div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────
function FAQ() {
  const [open,setOpen]=useState(null);
  const faqs=[
    {q:"Why not just use ChatGPT for free?",a:"A general AI given a basic prompt produces generic letters. LetterForge uses an expert system prompt built and refined over thousands of generations, trained to avoid AI clichés and produce letters that sound genuinely human. The difference in quality is significant — like the difference between a home-cooked meal and a Michelin restaurant."},
    {q:"Will hiring managers know it's AI?",a:"Not unless you tell them. LetterForge is specifically built to avoid AI patterns — no \"I am writing to apply\", no \"I am passionate about\", no vague skill lists. The output sounds like a well-written human wrote it because it's trained on exactly those patterns."},
    {q:"How personalised is it really?",a:"Very. Every sentence is tied to either the specific job requirements or your specific experience. Paste two different job descriptions and get two completely different letters. Nothing is generic filler."},
    {q:"What languages does it support?",a:"Any language you write in — Bulgarian, German, Dutch, Romanian, Polish, English. For native-level English output from any background, simply write in English and the AI handles phrasing automatically."},
    {q:"Can I cancel anytime?",a:"Yes, with one click from your dashboard. No emails, no calls. Your access continues until the end of your billing period."},
    {q:"Is my data safe?",a:"Your text is processed by Anthropic's Claude AI solely to generate your letter. We don't store submitted content beyond 90 days and never use your data to train AI. Payments are handled by Stripe — we never see your card number."},
  ];
  return (
    <section id="faq" style={{ background:BGSOFT, padding:"100px 48px", borderTop:`1px solid ${BORDER}` }}>
      <div style={{ maxWidth:1060, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:80, alignItems:"start" }}>
        <div>
          <div style={{ display:"inline-block", background:GOLDBG, color:GOLDDP, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:20, border:`1px solid rgba(240,165,0,.2)` }}>FAQ</div>
          <h2 style={{ fontFamily:SANS, fontSize:"clamp(30px,3.5vw,42px)", fontWeight:800, color:NAVY, letterSpacing:"-1px", lineHeight:1.2, marginBottom:20 }}>
            Any questions?<br/>
            <span style={{ background:GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>We got you.</span>
          </h2>
          <p style={{ color:MUTED, fontSize:15, lineHeight:1.8, marginBottom:28 }}>Everything you need to know about LetterForge. Can't find what you're looking for? Email us.</p>
          <a href="mailto:hello@letterforge.io" style={{ display:"inline-flex", alignItems:"center", gap:8, background:GRAD, color:"white", textDecoration:"none", borderRadius:10, padding:"12px 22px", fontWeight:700, fontSize:14, fontFamily:SANS, boxShadow:"0 4px 16px rgba(240,165,0,.3)" }}>
            Contact Us →
          </a>
        </div>
        <div>
          {faqs.map((f,i)=>(
            <div key={i} style={{ borderBottom:`1px solid ${BORDER}` }}>
              <button onClick={()=>setOpen(open===i?null:i)} style={{ width:"100%",padding:"18px 0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",gap:16,textAlign:"left" }}>
                <span style={{ fontFamily:SANS,fontSize:16,fontWeight:700,color:NAVY,lineHeight:1.3 }}>{f.q}</span>
                <span style={{ width:28,height:28,minWidth:28,borderRadius:"50%",background:open===i?GOLD:BORDER,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:open===i?"white":MUTED,transform:open===i?"rotate(45deg)":"none",transition:"all .2s",fontFamily:SANS }}>+</span>
              </button>
              {open===i && <p style={{ paddingBottom:18,fontSize:14.5,color:MUTED,lineHeight:1.85,animation:"lf-in .2s ease" }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ──────────────────────────────────────────────
function FinalCTA({ onCTA }) {
  return (
    <section style={{ background:NAVY, padding:"100px 48px", textAlign:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute",inset:0,background:`radial-gradient(ellipse 80% 60% at 50% 50%, rgba(240,165,0,.1) 0%, transparent 60%)`,pointerEvents:"none" }}/>
      <div style={{ position:"absolute",top:"-20%",right:"-5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 70%)",pointerEvents:"none" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ display:"inline-block", background:GOLDBG, color:GOLD, borderRadius:40, padding:"6px 16px", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:22, border:`1px solid rgba(240,165,0,.2)` }}>START TODAY</div>
        <h2 style={{ fontFamily:SANS, fontSize:"clamp(36px,5vw,64px)", fontWeight:800, color:"white", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:18 }}>
          Ready to boost your<br/>
          <span style={{ background:GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>interview success rate?</span>
        </h2>
        <p style={{ fontSize:17, color:"rgba(255,255,255,.45)", maxWidth:440, margin:"0 auto 44px", lineHeight:1.8, fontWeight:300 }}>
          Join 14,000+ job seekers who generate interviews instead of anxiety.
        </p>
        <button onClick={onCTA} style={{
          padding:"18px 48px", borderRadius:14, border:"none",
          background:GRAD, color:"white", fontSize:17, fontWeight:700, fontFamily:SANS,
          cursor:"pointer", boxShadow:"0 12px 44px rgba(240,165,0,.4)",
          transition:"all .24s", animation:"lf-pulse 3s infinite",
        }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 20px 60px rgba(240,165,0,.55)";e.currentTarget.style.animationPlayState="paused";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 12px 44px rgba(240,165,0,.4)";e.currentTarget.style.animationPlayState="running";}}>
          Get Started — Free Trial ✦
        </button>
        <div style={{ marginTop:18, fontSize:13, color:"rgba(255,255,255,.2)" }}>No credit card · First letter free · Cancel anytime</div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:"#0e0c1a", padding:"56px 48px 28px", borderTop:"1px solid rgba(255,255,255,.05)" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2.5fr 1fr 1fr 1fr", gap:52, marginBottom:48 }}>
          <div>
            <Logo size={32} dark={false}/>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.25)", lineHeight:1.9, marginTop:16, maxWidth:240 }}>
              AI cover letters that get you interviews. Built in Bulgaria 🇧🇬, used in 34 countries.
            </p>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              {["Instagram","TikTok","LinkedIn"].map(s=>(
                <span key={s} style={{ fontSize:12, color:"rgba(255,255,255,.22)", cursor:"pointer", transition:"color .18s", fontWeight:500, background:"rgba(255,255,255,.06)", borderRadius:8, padding:"6px 12px" }}
                  onMouseEnter={e=>e.target.style.color=GOLD}
                  onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.22)"}>{s}</span>
              ))}
            </div>
          </div>
          {[
            {title:"Product", links:["How it Works","Pricing","Examples","FAQ"]},
            {title:"Resources",links:["Blog","Cover Letter Tips","Job Search Guide","Interview Prep"]},
            {title:"Legal",   links:["Privacy Policy","Terms of Service","Cookie Policy","Contact"]},
          ].map(col=>(
            <div key={col.title}>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.2)",marginBottom:18 }}>{col.title}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {col.links.map(l=>(
                  <a key={l} href="#" style={{ fontSize:13,color:"rgba(255,255,255,.32)",textDecoration:"none",transition:"color .18s" }}
                    onMouseEnter={e=>e.target.style.color=GOLD}
                    onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.32)"}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:22, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.15)" }}>© 2026 LetterForge · hello@letterforge.io</span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.15)" }}>Payments by <span style={{ color:"#635bff",fontWeight:700 }}>Stripe</span> · GDPR Compliant</span>
        </div>
      </div>
    </footer>
  );
}

// ── Root ───────────────────────────────────────────────────
export default function Page() {
  const scrollToGen = () => document.getElementById("features")?.scrollIntoView({ behavior:"smooth" });
  return (
    <>
      <Nav onCTA={scrollToGen}/>
      <Hero onCTA={scrollToGen}/>
      <TrustBar/>
      <HowItWorks/>
      <Generator/>
      <Examples/>
      <Testimonials/>
      <Pricing/>
      <FAQ/>
      <FinalCTA onCTA={scrollToGen}/>
      <Footer/>
    </>
  );
}
