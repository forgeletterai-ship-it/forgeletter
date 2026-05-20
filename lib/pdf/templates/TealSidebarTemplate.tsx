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
  formatDate,
  getInitials,
  parseLetter,
  type LetterTemplateProps,
} from "./shared"

registerPdfFonts()

// A4 dimensions in pt: 595.28 x 841.89
const SIDEBAR_W = 215

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.paper,
    fontFamily: "Inter",
    fontSize: 10.5,
    color: COLORS.ink,
    paddingTop: 50,
    paddingBottom: 55,
    paddingLeft: SIDEBAR_W + 30,
    paddingRight: 45,
  },
  recipientBlock: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLORS.ink,
    marginBottom: 22,
  },
  greeting: {
    fontSize: 11,
    fontWeight: "normal",
    color: COLORS.ink,
    marginBottom: 14,
  },
  bodyParagraph: {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: COLORS.inkSoft,
    marginBottom: 10,
    textAlign: "left",
  },
  signoff: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 14,
  },
  signedName: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 30,
  },
  enclosure: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 16,
  },
})

const sidebarStyles = StyleSheet.create({
  // Container — `fixed` makes it repeat on every page.
  // Absolute positioned to overlay the left side. Page's left padding
  // (set in `styles.page`) reserves space so body text never overlaps.
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: "100%",
    backgroundColor: COLORS.teal,
  },
  topShapes: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: 200,
  },
  photoWrap: {
    position: "absolute",
    top: 58,
    left: SIDEBAR_W / 2 - 53,
    width: 106,
    height: 106,
  },
  photoRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 106,
    height: 106,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
  },
  photoInner: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 94,
    height: 94,
    borderRadius: 999,
    backgroundColor: "#D6CFC4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: {
    width: 94,
    height: 94,
    objectFit: "cover",
  },
  initials: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 30,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  name: {
    position: "absolute",
    top: 220,
    left: 12,
    right: 12,
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 22,
    color: COLORS.gold,
    textAlign: "center",
    letterSpacing: 2.2,
  },
  ornamentWrap: {
    position: "absolute",
    top: 290,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: 330,
    left: 24,
    right: 18,
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
    marginRight: 12,
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
    height: 200,
  },
})

function PhotoCircle({ photoDataUrl, initials }: { photoDataUrl: string | null; initials: string }) {
  return (
    <View style={sidebarStyles.photoWrap}>
      <View style={sidebarStyles.photoRing} />
      <View style={sidebarStyles.photoInner}>
        {photoDataUrl ? (
          <PdfImage src={photoDataUrl} style={sidebarStyles.photoImg} />
        ) : (
          <Text style={sidebarStyles.initials}>{initials}</Text>
        )}
      </View>
    </View>
  )
}

function TopOrganicShapes() {
  // Cream petal/cloud shapes coming in from the top of the sidebar,
  // framing the photo circle area. Drawn with smooth Bezier curves.
  return (
    <Svg style={sidebarStyles.topShapes} viewBox={`0 0 ${SIDEBAR_W} 200`}>
      {/* Large cream petal extending from top-left, curving around the photo */}
      <Path
        d={`M 0 0
            L 0 120
            C 25 135, 60 135, 80 110
            C 100 85, 95 35, 65 15
            C 50 5, 25 -5, 0 0
            Z`}
        fill={COLORS.cream}
      />
      {/* Smaller cream curve from top-right */}
      <Path
        d={`M ${SIDEBAR_W} 0
            L 130 0
            C 145 28, 175 50, ${SIDEBAR_W - 10} 70
            C ${SIDEBAR_W - 4} 65, ${SIDEBAR_W} 40, ${SIDEBAR_W} 0
            Z`}
        fill={COLORS.cream}
      />
      {/* Thin gold accent stroke following the right curve */}
      <Path
        d={`M 135 5
            C 152 25, 178 45, ${SIDEBAR_W - 8} 62`}
        stroke={COLORS.gold}
        strokeWidth={0.9}
        fill="none"
      />
      {/* Thin gold stroke around the left petal */}
      <Path
        d={`M 0 118
            C 28 130, 55 130, 75 108
            C 95 85, 90 35, 62 16`}
        stroke={COLORS.gold}
        strokeWidth={0.9}
        fill="none"
      />
    </Svg>
  )
}

function Ornament() {
  return (
    <Svg width={150} height={14} viewBox="0 0 150 14">
      <Path d="M0,7 L67,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
      <Path d="M75,2 L80,7 L75,12 L70,7 Z" fill={COLORS.gold} />
      <Path d="M83,7 L150,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
    </Svg>
  )
}

// Compact icons drawn in white at ~14pt — designed to look right inside a 28pt gold ring
function IconPin() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M12 22s-7-7.4-7-13a7 7 0 0 1 14 0c0 5.6-7 13-7 13z"
        stroke={COLORS.cream}
        strokeWidth={1.6}
        fill="none"
      />
      <Path
        d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
        stroke={COLORS.cream}
        strokeWidth={1.4}
        fill="none"
      />
    </Svg>
  )
}

function IconPhone() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M5 4h3l2 4-2 1.4a12 12 0 0 0 6.6 6.6L16 14l4 2v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2z"
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
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M3 6h18v12H3z" stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
      <Path d="M3 7l9 6.5 9-6.5" stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
    </Svg>
  )
}

function IconGlobe() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"
        stroke={COLORS.cream}
        strokeWidth={1.6}
        fill="none"
      />
      <Path d="M2 12h20" stroke={COLORS.cream} strokeWidth={1.4} fill="none" />
      <Path
        d="M12 2c3 2.5 4.5 6 4.5 10S15 19.5 12 22"
        stroke={COLORS.cream}
        strokeWidth={1.4}
        fill="none"
      />
      <Path
        d="M12 2c-3 2.5-4.5 6-4.5 10S9 19.5 12 22"
        stroke={COLORS.cream}
        strokeWidth={1.4}
        fill="none"
      />
    </Svg>
  )
}

function BottomWaves() {
  // Three layered waves at the bottom of the sidebar.
  // The waves curve in big S-shapes from bottom-left up to bottom-right,
  // matching the target design where each layer peaks at a different height.
  return (
    <Svg style={sidebarStyles.wavesWrap} viewBox={`0 0 ${SIDEBAR_W} 200`}>
      {/* Cream back wave — highest, gentlest curve */}
      <Path
        d={`M 0 80
            C 50 50, 110 110, ${SIDEBAR_W} 75
            L ${SIDEBAR_W} 200
            L 0 200 Z`}
        fill={COLORS.cream}
      />
      {/* Sage middle wave */}
      <Path
        d={`M 0 130
            C 45 95, 130 150, ${SIDEBAR_W} 115
            L ${SIDEBAR_W} 200
            L 0 200 Z`}
        fill={COLORS.sage}
      />
      {/* Gold front wave — most pronounced curve */}
      <Path
        d={`M 0 165
            C 60 125, 150 175, ${SIDEBAR_W} 145
            L ${SIDEBAR_W} 200
            L 0 200 Z`}
        fill={COLORS.gold}
      />
    </Svg>
  )
}

function Sidebar({
  candidateName,
  photoDataUrl,
  initials,
  candidatePhone,
  candidateEmail,
  candidateLocation,
  candidateWebsite,
}: {
  candidateName: string
  photoDataUrl: string | null
  initials: string
  candidatePhone?: string
  candidateEmail: string
  candidateLocation?: string
  candidateWebsite?: string
}) {
  return (
    // `fixed` makes this whole sidebar render on every page of the document.
    <View fixed>
      <View style={sidebarStyles.bar} />
      <TopOrganicShapes />
      <PhotoCircle photoDataUrl={photoDataUrl} initials={initials} />

      <Text style={sidebarStyles.name}>{(candidateName || "Your Name").toUpperCase()}</Text>

      <View style={sidebarStyles.ornamentWrap}>
        <Ornament />
      </View>

      <View style={sidebarStyles.contactList}>
        {candidateLocation ? (
          <View style={sidebarStyles.contactRow}>
            <View style={sidebarStyles.iconRing}>
              <IconPin />
            </View>
            <Text style={sidebarStyles.contactText}>{candidateLocation}</Text>
          </View>
        ) : null}
        {candidatePhone ? (
          <View style={sidebarStyles.contactRow}>
            <View style={sidebarStyles.iconRing}>
              <IconPhone />
            </View>
            <Text style={sidebarStyles.contactText}>{candidatePhone}</Text>
          </View>
        ) : null}
        {candidateEmail ? (
          <View style={sidebarStyles.contactRow}>
            <View style={sidebarStyles.iconRing}>
              <IconMail />
            </View>
            <Text style={sidebarStyles.contactText}>{candidateEmail}</Text>
          </View>
        ) : null}
        {candidateWebsite ? (
          <View style={sidebarStyles.contactRow}>
            <View style={sidebarStyles.iconRing}>
              <IconGlobe />
            </View>
            <Text style={sidebarStyles.contactText}>{candidateWebsite}</Text>
          </View>
        ) : null}
      </View>

      <BottomWaves />
    </View>
  )
}

export function TealSidebarTemplate(props: LetterTemplateProps) {
  const parsed = parseLetter(props.letterBody, props.candidateName)
  const initials = getInitials(props.candidateName)

  const recipientLines: string[] = []
  recipientLines.push("Hiring Manager")
  if (props.companyName) recipientLines.push(props.companyName)
  if (props.recipientAddress) {
    for (const line of props.recipientAddress.split(/\n/)) {
      const t = line.trim()
      if (t) recipientLines.push(t)
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
        <Sidebar
          candidateName={props.candidateName}
          photoDataUrl={props.photoDataUrl}
          initials={initials}
          candidatePhone={props.candidatePhone}
          candidateEmail={props.candidateEmail}
          candidateLocation={props.candidateLocation}
          candidateWebsite={props.candidateWebsite}
        />

        <View style={styles.recipientBlock}>
          {recipientLines.map((line, i) => (
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
      </Page>
    </Document>
  )
}
