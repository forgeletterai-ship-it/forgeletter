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
  ICONS,
  parseLetter,
  type LetterTemplateProps,
} from "./shared"

registerPdfFonts()

// A4 dimensions in pt: 595.28 x 841.89
const PAGE_W = 595
const PAGE_H = 842
const SIDEBAR_W = 220

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.paper,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: COLORS.ink,
    position: "relative",
  },
  // Right (body) area sits on top of the absolutely-positioned sidebar.
  rightArea: {
    position: "absolute",
    top: 0,
    left: SIDEBAR_W,
    right: 0,
    bottom: 0,
    paddingTop: 56,
    paddingRight: 50,
    paddingBottom: 60,
    paddingLeft: 38,
  },
  recipient: {
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
    marginBottom: 11,
    textAlign: "justify",
  },
  signoff: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 10,
  },
  signedName: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 28,
  },
  enclosure: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 14,
  },
})

const sidebarStyles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: PAGE_H,
    backgroundColor: COLORS.teal,
  },
  photoWrap: {
    position: "absolute",
    top: 70,
    left: SIDEBAR_W / 2 - 55,
    width: 110,
    height: 110,
  },
  photoRing: {
    position: "absolute",
    inset: 0,
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
    backgroundColor: "#E6DDD0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: {
    width: 98,
    height: 98,
    objectFit: "cover",
  },
  initials: {
    fontFamily: "Helvetica-Bold",
    fontSize: 32,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  name: {
    position: "absolute",
    top: 200,
    left: 12,
    right: 12,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: COLORS.gold,
    textAlign: "center",
    letterSpacing: 1.4,
  },
  ornamentWrap: {
    position: "absolute",
    top: 244,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: 290,
    left: 22,
    right: 22,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconRing: {
    width: 26,
    height: 26,
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

function TopPetals() {
  // Two cream organic curves coming in from top-left and top-right corners
  return (
    <Svg
      style={{ position: "absolute", top: 0, left: 0 }}
      width={SIDEBAR_W}
      height={70}
      viewBox={`0 0 ${SIDEBAR_W} 70`}
    >
      <Path
        d="M0,0 L0,40 C30,55 60,60 90,42 C75,20 50,8 30,0 Z"
        fill={COLORS.cream}
      />
      <Path
        d={`M${SIDEBAR_W},0 L${SIDEBAR_W - 100},0 C${SIDEBAR_W - 90},10 ${SIDEBAR_W - 70},22 ${SIDEBAR_W - 55},30 C${SIDEBAR_W - 30},38 ${SIDEBAR_W - 5},35 ${SIDEBAR_W},20 Z`}
        fill={COLORS.cream}
      />
      <Path
        d="M0,0 L60,0 C50,18 32,28 14,30 C8,30 4,28 0,24 Z"
        fill={COLORS.gold}
        fillOpacity={0.18}
      />
    </Svg>
  )
}

function Ornament() {
  return (
    <Svg width={140} height={14} viewBox="0 0 140 14">
      <Path d="M0,7 L62,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
      <Path
        d="M70,2 L75,7 L70,12 L65,7 Z"
        stroke={COLORS.gold}
        strokeWidth={0.8}
        fill="none"
      />
      <Path d="M78,7 L140,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
    </Svg>
  )
}

function ContactIcon({ pathD }: { pathD: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d={pathD} stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
    </Svg>
  )
}

function BottomWaves() {
  // Three layered waves at the bottom of the sidebar.
  return (
    <Svg
      style={{ position: "absolute", bottom: 0, left: 0 }}
      width={SIDEBAR_W}
      height={150}
      viewBox={`0 0 ${SIDEBAR_W} 150`}
    >
      {/* Cream back wave */}
      <Path
        d={`M0,90 C60,60 140,110 ${SIDEBAR_W},75 L${SIDEBAR_W},150 L0,150 Z`}
        fill={COLORS.cream}
      />
      {/* Sage middle wave */}
      <Path
        d={`M0,108 C50,80 150,130 ${SIDEBAR_W},95 L${SIDEBAR_W},150 L0,150 Z`}
        fill={COLORS.sage}
      />
      {/* Gold front wave */}
      <Path
        d={`M0,125 C70,100 130,140 ${SIDEBAR_W},112 L${SIDEBAR_W},150 L0,150 Z`}
        fill={COLORS.gold}
      />
    </Svg>
  )
}

export function TealSidebarTemplate(props: LetterTemplateProps) {
  const parsed = parseLetter(props.letterBody, props.candidateName)
  const initials = getInitials(props.candidateName)

  const recipientLines: string[] = []
  if (props.companyName) recipientLines.push(props.companyName)
  if (props.recipientAddress) {
    for (const line of props.recipientAddress.split(/\n/)) {
      const t = line.trim()
      if (t) recipientLines.push(t)
    }
  }
  const hasRecipient = recipientLines.length > 0

  return (
    <Document
      author={props.candidateName}
      title={
        props.jobTitle
          ? `Cover Letter — ${props.jobTitle}${props.companyName ? ` at ${props.companyName}` : ""}`
          : "Cover Letter"
      }
    >
      <Page size="A4" style={styles.page}>
        {/* ----- LEFT SIDEBAR ----- */}
        <View style={sidebarStyles.bar} />
        <TopPetals />
        <PhotoCircle photoDataUrl={props.photoDataUrl} initials={initials} />

        <Text style={sidebarStyles.name}>{(props.candidateName || "Your Name").toUpperCase()}</Text>

        <View style={sidebarStyles.ornamentWrap}>
          <Ornament />
        </View>

        <View style={sidebarStyles.contactList}>
          {props.candidateLocation ? (
            <View style={sidebarStyles.contactRow}>
              <View style={sidebarStyles.iconRing}>
                <ContactIcon pathD={ICONS.pin} />
              </View>
              <Text style={sidebarStyles.contactText}>{props.candidateLocation}</Text>
            </View>
          ) : null}
          {props.candidatePhone ? (
            <View style={sidebarStyles.contactRow}>
              <View style={sidebarStyles.iconRing}>
                <ContactIcon pathD={ICONS.phone} />
              </View>
              <Text style={sidebarStyles.contactText}>{props.candidatePhone}</Text>
            </View>
          ) : null}
          {props.candidateEmail ? (
            <View style={sidebarStyles.contactRow}>
              <View style={sidebarStyles.iconRing}>
                <ContactIcon pathD={ICONS.email} />
              </View>
              <Text style={sidebarStyles.contactText}>{props.candidateEmail}</Text>
            </View>
          ) : null}
          {props.candidateWebsite ? (
            <View style={sidebarStyles.contactRow}>
              <View style={sidebarStyles.iconRing}>
                <ContactIcon pathD={ICONS.globe} />
              </View>
              <Text style={sidebarStyles.contactText}>{props.candidateWebsite}</Text>
            </View>
          ) : null}
        </View>

        <BottomWaves />

        {/* ----- RIGHT BODY ----- */}
        <View style={styles.rightArea}>
          {hasRecipient ? (
            <View style={styles.recipient}>
              <Text>Hiring Manager</Text>
              {recipientLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </View>
          ) : (
            <View style={styles.recipient}>
              <Text>{formatDate(props.date)}</Text>
            </View>
          )}

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
