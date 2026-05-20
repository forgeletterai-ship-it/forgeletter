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
    top: 75,
    left: SIDEBAR_W / 2 - 55,
    width: 110,
    height: 110,
  },
  photoRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
  },
  photoInner: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 98,
    height: 98,
    borderRadius: 999,
    backgroundColor: "#D4CCC0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: 98, height: 98, objectFit: "cover" },
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
  // Two cream cloud shapes at the top of the sidebar. They form a
  // soft frame around the photo circle (which sits at y=75-185
  // inside this 200pt-tall area).
  return (
    <View style={sb.topShapesWrap}>
      <Svg width={SIDEBAR_W} height={200} viewBox={`0 0 ${SIDEBAR_W} 200`}>
        {/* Large cream cloud from top-left.
            Extends right to ~125pt and down to ~155pt, sweeping in a
            big curve that frames the left side of the photo. */}
        <Path
          d={`M 0 0 L 125 0 C 122 25, 115 55, 100 80 C 85 110, 65 135, 35 145 C 12 152, 0 130, 0 95 Z`}
          fill={COLORS.cream}
        />
        {/* Cream curve from top-right.
            Curves in and down from top-right, framing the right side
            of the photo. */}
        <Path
          d={`M ${SIDEBAR_W} 0 L 115 0 C 122 30, 145 55, 175 75 C 195 88, ${SIDEBAR_W} 80, ${SIDEBAR_W} 50 Z`}
          fill={COLORS.cream}
        />
        {/* Gold accent stroke tracing the inner edge of the left cloud */}
        <Path
          d={`M 0 95 C 5 125, 25 148, 50 145 C 75 140, 92 120, 105 90 C 115 65, 122 35, 122 5`}
          stroke={COLORS.gold}
          strokeWidth={1}
          fill="none"
        />
        {/* Gold accent stroke on the right cloud */}
        <Path
          d={`M 117 5 C 125 30, 145 55, 173 73 C 188 80, ${SIDEBAR_W - 3} 76, ${SIDEBAR_W} 55`}
          stroke={COLORS.gold}
          strokeWidth={1}
          fill="none"
        />
        {/* Tiny gold accent dot on top, like the reference */}
        <Path
          d={`M 145 20 m -1.5 0 a 1.5 1.5 0 1 0 3 0 a 1.5 1.5 0 1 0 -3 0`}
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
