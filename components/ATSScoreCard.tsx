"use client"

import Link from "next/link"

export type ATSVerdict = "ATS Ready" | "Good" | "Needs Work" | "At Risk"

export interface ATSData {
  score: number
  verdict: ATSVerdict
  coveredKeywords: string[]
  missingKeywords: string[]
}

type BasePlan = "free" | "starter" | "pro" | "ultra"

interface Props {
  atsData: ATSData
  tier: BasePlan
}

const VERDICT_STYLE: Record<ATSVerdict, { color: string; bg: string }> = {
  "ATS Ready": { color: "var(--green)", bg: "rgba(40,120,94,0.10)" },
  Good: { color: "var(--gold)", bg: "rgba(199,154,54,0.12)" },
  "Needs Work": { color: "var(--amber)", bg: "rgba(235,127,34,0.12)" },
  "At Risk": { color: "var(--red)", bg: "rgba(164,60,60,0.10)" },
}

export function ATSScoreCard({ atsData, tier }: Props) {
  // Free + Starter tiers see a locked card.
  const locked = tier === "free" || tier === "starter"

  if (locked) {
    return (
      <div className="dashboard-card" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
          <h3 style={titleStyle}>ATS keyword score</h3>
          <p style={{ color: "var(--muted)" }}>
            Your letter contains 8 of 12 keywords the ATS expects.
          </p>
          <div style={{ marginTop: 16, height: 8, background: "var(--line)", borderRadius: 4 }}>
            <div style={{ width: "70%", height: "100%", background: "var(--gold)", borderRadius: 4 }} />
          </div>
        </div>
        <div style={lockedOverlay}>
          <strong style={{ fontSize: 18, color: "var(--ink)" }}>
            Unlock ATS scoring
          </strong>
          <p style={{ margin: "6px 0 14px", color: "var(--muted)", maxWidth: 360, fontSize: 14 }}>
            See exactly which ATS keywords your letter covers and which to add. Available on Pro and Ultra.
          </p>
          <Link className="button" href="/dashboard/billing">
            Upgrade →
          </Link>
        </div>
      </div>
    )
  }

  const verdictStyle = VERDICT_STYLE[atsData.verdict] ?? VERDICT_STYLE.Good

  return (
    <div className="dashboard-card">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={titleStyle}>ATS keyword score</h3>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            How well your letter matches the keywords an applicant-tracking system looks for.
          </p>
        </div>
        <span
          style={{
            ...verdictBadge,
            color: verdictStyle.color,
            background: verdictStyle.bg,
            border: `1px solid ${verdictStyle.color}`,
          }}
        >
          {atsData.verdict}
        </span>
      </header>

      <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>
          {atsData.score}
        </span>
        <span style={{ color: "var(--muted)" }}>/ 100</span>
      </div>

      <div style={{ marginTop: 8, height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.max(2, Math.min(100, atsData.score))}%`,
            height: "100%",
            background: `linear-gradient(90deg, var(--gold), var(--amber))`,
            transition: "width 800ms ease",
          }}
        />
      </div>

      {atsData.coveredKeywords.length > 0 && (
        <KeywordSection title="Keywords matched" tone="green" keywords={atsData.coveredKeywords} />
      )}
      {atsData.missingKeywords.length > 0 && (
        <KeywordSection
          title="Missing keywords"
          tone="red"
          keywords={atsData.missingKeywords}
          subtitle="Add naturally if they reflect your real experience — we never recommend fabricating skills."
        />
      )}
    </div>
  )
}

function KeywordSection({
  title,
  tone,
  keywords,
  subtitle,
}: {
  title: string
  tone: "green" | "red"
  keywords: string[]
  subtitle?: string
}) {
  const color = tone === "green" ? "var(--green)" : "var(--red)"
  const bg = tone === "green" ? "rgba(40,120,94,0.08)" : "rgba(164,60,60,0.06)"
  const border = tone === "green" ? "rgba(40,120,94,0.25)" : "rgba(164,60,60,0.22)"
  return (
    <section style={{ marginTop: 18 }}>
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{title}</h4>
      {subtitle ? (
        <p style={{ margin: "2px 0 8px", color: "var(--muted)", fontSize: 12 }}>{subtitle}</p>
      ) : (
        <div style={{ height: 8 }} />
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {keywords.map((kw) => (
          <span
            key={kw}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${border}`,
              background: bg,
              color,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {kw}
          </span>
        ))}
      </div>
    </section>
  )
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: "-0.01em",
}

const verdictBadge: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
}

const lockedOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255, 253, 248, 0.86)",
  textAlign: "center",
  padding: 24,
}
