import {
  Document,
  Image as PdfImage,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer"
import { registerPdfFonts } from "../fonts"
import {
  COLORS,
  getInitials,
  parseLetter,
  type LetterTemplateProps,
} from "./shared"

registerPdfFonts()

// A4 in points: 595.28 x 841.89.
const PAGE_H = 842
const SIDEBAR_W = 215

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.paper,
    fontFamily: "Inter",
    fontSize: 10,
    color: COLORS.ink,
    paddingTop: 44,
    paddingBottom: 44,
    paddingLeft: 0,
    paddingRight: 0,
  },
  // The sidebar overlays the left side, taken out of flow.
  // `fixed` makes it repeat on every page.
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: PAGE_H,
    backgroundColor: COLORS.teal,
  },
  // Body content lives in its own column with marginLeft so it never
  // collides with the sidebar. wrap={false} on this View prevents the
  // letter from spilling onto a second page; for unusually long letters
  // the body is clipped on the first page rather than splitting.
  bodyColumn: {
    marginLeft: SIDEBAR_W + 32,
    marginRight: 42,
  },
  recipientBlock: {
    fontSize: 10,
    lineHeight: 1.4,
    color: COLORS.ink,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginBottom: 11,
  },
  bodyParagraph: {
    fontSize: 10,
    lineHeight: 1.48,
    color: COLORS.inkSoft,
    marginBottom: 7,
  },
  signoff: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginTop: 12,
  },
  signedName: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginTop: 22,
  },
  enclosure: {
    fontSize: 9.5,
    color: COLORS.muted,
    marginTop: 12,
  },
})

const sb = StyleSheet.create({
  // All positions below are RELATIVE TO THE SIDEBAR VIEW (which has
  // explicit width SIDEBAR_W and height PAGE_H). That's why this works
  // — the sidebar has dimensions, so absolute children resolve.
  topShapesWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: 200,
  },
  photoWrap: {
    position: "absolute",
    top: 92,
    left: SIDEBAR_W / 2 - 52,
    width: 104,
    height: 104,
  },
  photoRingOuter: {
    // A second, larger gold ring sitting concentric to the photo —
    // matches the reference where the photo has a delicate inner +
    // outer gold ring giving it a more refined "framed" look.
    position: "absolute",
    top: -8,
    left: -8,
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 0.8,
    borderColor: COLORS.gold,
    opacity: 0.7,
  },
  photoRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 104,
    height: 104,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
  },
  photoInner: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: "#D4CCC0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: 92, height: 92, objectFit: "cover" },
  initials: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 30,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  nameWrap: {
    position: "absolute",
    top: 220,
    left: 10,
    width: SIDEBAR_W - 20,
    alignItems: "center",
  },
  name: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 22,
    color: COLORS.gold,
    textAlign: "center",
    letterSpacing: 2.4,
  },
  ornamentWrap: {
    position: "absolute",
    top: 286,
    left: 0,
    width: SIDEBAR_W,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: 326,
    left: 24,
    width: SIDEBAR_W - 38,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconRing: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contactText: {
    color: COLORS.cream,
    fontSize: 9.5,
    flex: 1,
    lineHeight: 1.4,
  },
  wavesWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SIDEBAR_W,
    height: 180,
  },
})

function TopShapes() {
  // Premium organic header composition.
  //
  // Design intent: a layered cream "bloom" composition framing the
  // sidebar's upper area. Built up with three cream layers (different
  // opacities for depth) and three refined gold accent curves +
  // a small partial-ring accent.
  //
  // Each Bezier uses 8+ control points so the curves are continuously
  // smooth (no audible inflection corners) — the previous version's
  // shapes looked angular because they had only 3-4 control points
  // per path.
  const W = SIDEBAR_W
  return (
    <View style={sb.topShapesWrap}>
      <Svg width={W} height={200} viewBox={`0 0 ${W} 200`}>
        {/* ── Layer 1: warm peach undertone (deep back) ─────────────
            Gives the composition warmth without dominating. */}
        <Path
          d={`M 0 0
              L 138 0
              C 138 16, 134 30, 126 44
              C 116 60, 102 74, 86 86
              C 64 102, 38 110, 18 106
              C 4 102, 0 92, 0 78
              Z`}
          fill="#E8D9BC"
          fillOpacity={0.85}
        />

        {/* ── Layer 2: main cream bloom (left, dominant) ────────────
            The largest, most prominent cream shape — sits on top
            of the peach undertone for a soft layered effect. */}
        <Path
          d={`M 0 0
              L 130 0
              C 130 14, 126 28, 119 42
              C 110 56, 98 70, 84 81
              C 64 96, 42 102, 24 98
              C 8 94, 0 84, 0 70
              L 0 0 Z`}
          fill={COLORS.cream}
        />

        {/* ── Layer 3: cream accent (right) ─────────────────────────
            Complementary smaller shape — curves in from top-right. */}
        <Path
          d={`M ${W} 0
              L 102 0
              C 106 14, 115 28, 128 42
              C 144 56, 162 65, 180 68
              C 194 70, ${W - 6} 67, ${W} 56
              L ${W} 0 Z`}
          fill={COLORS.cream}
        />

        {/* ── Layer 4: subtle cream highlight (top center) ──────────
            Bridges the two main shapes for a unified look. */}
        <Path
          d={`M 92 0
              L 108 0
              C 110 12, 109 26, 105 38
              C 101 48, 95 48, 91 38
              C 88 26, 88 12, 92 0
              Z`}
          fill="#F2E8D2"
          fillOpacity={0.95}
        />

        {/* ── Gold accent 1: refined curve tracing left bloom ──────
            Long sweeping gold line with strokeLinecap rounded for
            elegant endpoints. */}
        <Path
          d={`M 0 72
              C 6 92, 22 102, 44 100
              C 64 96, 82 88, 96 76
              C 110 64, 120 48, 126 30
              C 130 18, 132 8, 132 2`}
          stroke={COLORS.gold}
          strokeWidth={1.1}
          fill="none"
          strokeLinecap="round"
        />

        {/* ── Gold accent 2: refined curve on right accent ─────────
            Mirrors the left gold accent, creating compositional
            balance. */}
        <Path
          d={`M 105 4
              C 110 18, 119 30, 132 42
              C 148 56, 166 66, 184 68
              C 196 69, ${W - 6} 65, ${W - 1} 56`}
          stroke={COLORS.gold}
          strokeWidth={1.1}
          fill="none"
          strokeLinecap="round"
        />

        {/* ── Gold accent 3: small decorative ring on upper-right ──
            Adds intricacy. Looks like an intentional designer
            mark rather than a random doodle. */}
        <Path
          d={`M 168 82
              C 178 78, 188 84, 188 95
              C 188 106, 178 110, 168 106
              C 160 102, 158 90, 168 82
              Z`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
        />

        {/* ── Small gold accent dot ───────────────────────────────
            Tiny detail that signals craftsmanship. */}
        <Path
          d={`M 148 20
              m -1.7 0
              a 1.7 1.7 0 1 0 3.4 0
              a 1.7 1.7 0 1 0 -3.4 0`}
          fill={COLORS.gold}
        />

        {/* ── Tiny secondary accent dot ───────────────────────────*/}
        <Path
          d={`M 88 6
              m -1 0
              a 1 1 0 1 0 2 0
              a 1 1 0 1 0 -2 0`}
          fill={COLORS.gold}
        />
      </Svg>
    </View>
  )
}

function PhotoCircle({
  photoDataUrl,
  initials,
}: {
  photoDataUrl: string | null
  initials: string
}) {
  return (
    <View style={sb.photoWrap}>
      {/* Outer thin gold ring (decorative, sits ~8pt outside the photo) */}
      <View style={sb.photoRingOuter} />
      {/* Main gold ring */}
      <View style={sb.photoRing} />
      <View style={sb.photoInner}>
        {photoDataUrl ? (
          <PdfImage src={photoDataUrl} style={sb.photoImg} />
        ) : (
          <Text style={sb.initials}>{initials}</Text>
        )}
      </View>
    </View>
  )
}

function Ornament() {
  return (
    <Svg width={150} height={14} viewBox="0 0 150 14">
      <Path d="M 0 7 L 67 7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
      <Path d="M 75 2 L 80 7 L 75 12 L 70 7 Z" fill={COLORS.gold} />
      <Path d="M 83 7 L 150 7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
    </Svg>
  )
}

function IconPin() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path
        d="M 12 22 C 5 14, 5 9, 5 9 C 5 5.1, 8.1 2, 12 2 C 15.9 2, 19 5.1, 19 9 C 19 9, 19 14, 12 22 Z"
        stroke={COLORS.cream}
        strokeWidth={1.6}
        fill="none"
      />
      <Path
        d="M 12 11.5 A 2.5 2.5 0 1 0 12 6.5 A 2.5 2.5 0 0 0 12 11.5 Z"
        stroke={COLORS.cream}
        strokeWidth={1.4}
        fill="none"
      />
    </Svg>
  )
}

function IconPhone() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path
        d="M 5 4 L 8 4 L 10 8 L 8 9.4 C 9.6 12.5, 11.5 14.4, 14.6 16 L 16 14 L 20 16 L 20 19 C 20 20.1, 19.1 21, 18 21 C 9.7 21, 3 14.3, 3 6 C 3 4.9, 3.9 4, 5 4 Z"
        stroke={COLORS.cream}
        strokeWidth={1.6}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconMail() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M 3 6 L 21 6 L 21 18 L 3 18 Z" stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
      <Path d="M 3 7 L 12 13.5 L 21 7" stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
    </Svg>
  )
}

function IconGlobe() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path
        d="M 12 2 A 10 10 0 1 0 12 22 A 10 10 0 0 0 12 2 Z"
        stroke={COLORS.cream}
        strokeWidth={1.6}
        fill="none"
      />
      <Path d="M 2 12 L 22 12" stroke={COLORS.cream} strokeWidth={1.4} fill="none" />
      <Path d="M 12 2 C 15 5, 16.5 8.5, 16.5 12 C 16.5 15.5, 15 19, 12 22" stroke={COLORS.cream} strokeWidth={1.4} fill="none" />
      <Path d="M 12 2 C 9 5, 7.5 8.5, 7.5 12 C 7.5 15.5, 9 19, 12 22" stroke={COLORS.cream} strokeWidth={1.4} fill="none" />
    </Svg>
  )
}

function BottomWaves() {
  return (
    <View style={sb.wavesWrap}>
      <Svg width={SIDEBAR_W} height={180} viewBox={`0 0 ${SIDEBAR_W} 180`}>
        {/* Cream back wave */}
        <Path
          d={`M 0 60 C 60 30, 120 90, ${SIDEBAR_W} 55 L ${SIDEBAR_W} 180 L 0 180 Z`}
          fill={COLORS.cream}
        />
        {/* Sage middle wave */}
        <Path
          d={`M 0 105 C 55 70, 135 130, ${SIDEBAR_W} 95 L ${SIDEBAR_W} 180 L 0 180 Z`}
          fill={COLORS.sage}
        />
        {/* Gold front wave */}
        <Path
          d={`M 0 140 C 70 100, 145 160, ${SIDEBAR_W} 125 L ${SIDEBAR_W} 180 L 0 180 Z`}
          fill={COLORS.gold}
        />
      </Svg>
    </View>
  )
}

function ContactRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={sb.contactRow}>
      <View style={sb.iconRing}>{icon}</View>
      <Text style={sb.contactText}>{text}</Text>
    </View>
  )
}

export function TealSidebarTemplate(props: LetterTemplateProps) {
  const parsed = parseLetter(props.letterBody, props.candidateName)
  const initials = getInitials(props.candidateName)

  const recipient: string[] = []
  recipient.push("Hiring Manager")
  if (props.companyName) recipient.push(props.companyName)
  if (props.recipientAddress) {
    for (const line of props.recipientAddress.split(/\n/)) {
      const t = line.trim()
      if (t) recipient.push(t)
    }
  }

  return (
    <Document
      author={props.candidateName}
      title={
        props.jobTitle
          ? `Cover Letter — ${props.jobTitle}${props.companyName ? ` at ${props.companyName}` : ""}`
          : "Cover Letter"
      }
    >
      <Page size="A4" style={styles.page} wrap={false}>
        {/* === Fixed sidebar, repeats on every page === */}
        <View fixed style={styles.sidebar}>
          <TopShapes />
          <PhotoCircle photoDataUrl={props.photoDataUrl} initials={initials} />

          <View style={sb.nameWrap}>
            <Text style={sb.name}>
              {(props.candidateName || "Your Name").toUpperCase()}
            </Text>
          </View>

          <View style={sb.ornamentWrap}>
            <Ornament />
          </View>

          <View style={sb.contactList}>
            {props.candidateLocation ? (
              <ContactRow icon={<IconPin />} text={props.candidateLocation} />
            ) : null}
            {props.candidatePhone ? (
              <ContactRow icon={<IconPhone />} text={props.candidatePhone} />
            ) : null}
            {props.candidateEmail ? (
              <ContactRow icon={<IconMail />} text={props.candidateEmail} />
            ) : null}
            {props.candidateWebsite ? (
              <ContactRow icon={<IconGlobe />} text={props.candidateWebsite} />
            ) : null}
          </View>

          <BottomWaves />
        </View>

        {/* === Body column. wrap=false guarantees single-page output === */}
        <View style={styles.bodyColumn} wrap={false}>
          <View style={styles.recipientBlock}>
            {recipient.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>

          <Text style={styles.greeting}>{parsed.greeting}</Text>

          {parsed.paragraphs.map((p, i) => (
            <Text key={i} style={styles.bodyParagraph}>
              {p}
            </Text>
          ))}

          <Text style={styles.signoff}>{parsed.signoff}</Text>
          <Text style={styles.signedName}>{parsed.signedName}</Text>
          <Text style={styles.enclosure}>Enclosure</Text>
        </View>
      </Page>
    </Document>
  )
}
