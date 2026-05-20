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
    fontSize: 10.5,
    color: COLORS.ink,
    paddingTop: 56,
    paddingBottom: 56,
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
  // collides with the sidebar.
  bodyColumn: {
    marginLeft: SIDEBAR_W + 36,
    marginRight: 48,
  },
  recipientBlock: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLORS.ink,
    marginBottom: 22,
  },
  greeting: {
    fontSize: 11,
    color: COLORS.ink,
    marginBottom: 14,
  },
  bodyParagraph: {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: COLORS.inkSoft,
    marginBottom: 10,
  },
  signoff: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 16,
  },
  signedName: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 32,
  },
  enclosure: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 18,
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
    height: 175,
  },
  photoWrap: {
    position: "absolute",
    top: 50,
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
  return (
    <View style={sb.topShapesWrap}>
      <Svg width={SIDEBAR_W} height={175} viewBox={`0 0 ${SIDEBAR_W} 175`}>
        {/* Large cream cloud from top-left, curving down and right */}
        <Path
          d={`M 0 0 L 110 0 C 95 30, 90 65, 65 80 C 35 95, 5 75, 0 50 Z`}
          fill={COLORS.cream}
        />
        {/* Smaller cream curve from top-right */}
        <Path
          d={`M ${SIDEBAR_W} 0 L 130 0 C 138 22, 158 38, ${SIDEBAR_W - 12} 55 C ${SIDEBAR_W - 4} 50, ${SIDEBAR_W} 28, ${SIDEBAR_W} 0 Z`}
          fill={COLORS.cream}
        />
        {/* Subtle gold accent stroke on the left cloud */}
        <Path
          d={`M 0 50 C 8 75, 35 95, 65 80 C 90 65, 95 30, 108 5`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
        />
        {/* Subtle gold accent on the right curve */}
        <Path
          d={`M 132 5 C 142 25, 160 40, ${SIDEBAR_W - 8} 52`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
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
      <Page size="A4" style={styles.page} wrap>
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

        {/* === Body column (flows naturally, paginates) === */}
        <View style={styles.bodyColumn}>
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
