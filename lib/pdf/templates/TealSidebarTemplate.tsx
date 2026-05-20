import {
  Circle,
  Document,
  Image as PdfImage,
  Line,
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
  // Premium editorial header — adapted directly from the user-provided
  // SVG (the 600x240 reference). Elements used:
  //   1. Top-left composite emblem (gold ring + filled teal disc +
  //      inner gold ring + 2 short accent ticks)
  //   2. Top-right cream organic curve coming in from the corner,
  //      with a gold ring + filled gold dot at its center
  //   3. Three small gold dots in a row (placed lower as a brand mark)
  //
  // Scaled to fit the 215pt sidebar instead of the original 600pt band.
  const W = SIDEBAR_W
  return (
    <View style={sb.topShapesWrap}>
      <Svg width={W} height={200} viewBox={`0 0 ${W} 200`}>
        {/* ===== TOP-LEFT EMBLEM ===== */}
        {/* Outer gold ring */}
        <Circle cx={42} cy={42} r={30} stroke={COLORS.gold} strokeWidth={1.3} fill="none" />
        {/* Filled cream disc (sits against the dark teal sidebar) */}
        <Circle cx={42} cy={42} r={20} fill={COLORS.cream} />
        {/* Inner gold ring */}
        <Circle cx={42} cy={42} r={9} stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
        {/* Short accent ticks (left + top) */}
        <Line x1={6} y1={42} x2={20} y2={42} stroke={COLORS.gold} strokeWidth={0.9} />
        <Line x1={42} y1={6} x2={42} y2={20} stroke={COLORS.gold} strokeWidth={0.9} />

        {/* ===== TOP-RIGHT CREAM CURVE FROM CORNER =====
            Quadratic Bezier sweeping in from the top-right corner.
            Soft cream fill against the dark teal sidebar. */}
        <Path
          d={`M ${W} 0 Q ${W} 0, ${W} 38 Q ${W} 70, ${W - 35} 70 Q ${W} 50, ${W} 0 Z`}
          fill={COLORS.cream}
        />
        {/* Gold ring centered on the corner-curve focal point */}
        <Circle
          cx={W - 18}
          cy={32}
          r={14}
          stroke={COLORS.gold}
          strokeWidth={1}
          fill="none"
        />
        {/* Filled gold dot inside the ring — strong focal accent */}
        <Circle cx={W - 18} cy={32} r={4} fill={COLORS.gold} />

        {/* ===== THREE GOLD DOTS — brand mark accent ===== */}
        <Circle cx={20} cy={165} r={2.4} fill={COLORS.gold} />
        <Circle cx={36} cy={165} r={2.4} fill={COLORS.gold} />
        <Circle cx={52} cy={165} r={2.4} fill={COLORS.gold} />
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
  // Center divider — directly adapted from the user-provided SVG.
  // Long horizontal gold line + center medallion (gold ring + filled
  // gold dot) + short accent ticks just outside the main line.
  const W = 170
  const CY = 8
  return (
    <Svg width={W} height={16} viewBox={`0 0 ${W} 16`}>
      {/* Short accent tick (left) */}
      <Line x1={0} y1={CY} x2={6} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      {/* Long horizontal gold line — left half */}
      <Line x1={10} y1={CY} x2={W / 2 - 9} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      {/* Long horizontal gold line — right half */}
      <Line x1={W / 2 + 9} y1={CY} x2={W - 10} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      {/* Short accent tick (right) */}
      <Line x1={W - 6} y1={CY} x2={W} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      {/* Center medallion — outer ring */}
      <Circle cx={W / 2} cy={CY} r={6} stroke={COLORS.gold} strokeWidth={1} fill="none" />
      {/* Center medallion — filled dot */}
      <Circle cx={W / 2} cy={CY} r={2.4} fill={COLORS.gold} />
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
