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

const PAGE_W = 595
const PAGE_H = 842
const LEFT_W = 220

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.cream,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: COLORS.ink,
    position: "relative",
  },
  // Thin gold divider line between columns
  divider: {
    position: "absolute",
    left: LEFT_W,
    top: 60,
    bottom: 60,
    width: 0.8,
    backgroundColor: COLORS.gold,
    opacity: 0.6,
  },
  rightArea: {
    position: "absolute",
    top: 0,
    left: LEFT_W,
    right: 0,
    bottom: 0,
    paddingTop: 60,
    paddingRight: 50,
    paddingBottom: 60,
    paddingLeft: 36,
  },
  dateLine: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginBottom: 18,
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
    marginTop: 14,
  },
  signatureCursive: {
    fontFamily: "DancingScript",
    fontWeight: "bold",
    fontSize: 28,
    color: COLORS.gold,
    marginTop: 10,
    marginBottom: 6,
  },
  signedNameSmall: {
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 2,
  },
})

const leftStyles = StyleSheet.create({
  blobWrap: {
    position: "absolute",
    top: 70,
    left: 16,
    width: LEFT_W - 32,
    height: 160,
  },
  photoWrap: {
    position: "absolute",
    top: 105,
    left: LEFT_W / 2 - 45,
    width: 90,
    height: 90,
    zIndex: 5,
  },
  photoRing: {
    position: "absolute",
    inset: 0,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  photoInner: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 82,
    height: 82,
    borderRadius: 999,
    backgroundColor: "#E6DDD0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: {
    width: 82,
    height: 82,
    objectFit: "cover",
  },
  initials: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  name: {
    position: "absolute",
    top: 248,
    left: 12,
    right: 12,
    fontFamily: "CormorantGaramond",
    fontStyle: "italic",
    fontSize: 30,
    color: COLORS.teal,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  ornamentWrap: {
    position: "absolute",
    top: 295,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: 330,
    left: 24,
    right: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactText: {
    color: COLORS.teal,
    fontSize: 9.5,
    flex: 1,
  },
})

function PhotoCircle({
  photoDataUrl,
  initials,
}: {
  photoDataUrl: string | null
  initials: string
}) {
  return (
    <View style={leftStyles.photoWrap}>
      <View style={leftStyles.photoRing} />
      <View style={leftStyles.photoInner}>
        {photoDataUrl ? (
          <PdfImage src={photoDataUrl} style={leftStyles.photoImg} />
        ) : (
          <Text style={leftStyles.initials}>{initials}</Text>
        )}
      </View>
    </View>
  )
}

function OrganicBlobs() {
  // Three overlapping organic shapes that frame the photo:
  // - back: pale sage curve
  // - mid: dark teal blob
  // - front: smaller sage accent
  const W = LEFT_W - 32
  return (
    <View style={leftStyles.blobWrap}>
      <Svg width={W} height={160} viewBox={`0 0 ${W} 160`}>
        {/* Sage back blob */}
        <Path
          d={`M${W * 0.05},${40} C${W * 0.05},${10} ${W * 0.45},${5} ${W * 0.7},${20} C${W * 0.95},${40} ${W * 0.92},${110} ${W * 0.6},${135} C${W * 0.25},${155} ${W * 0.02},${110} ${W * 0.05},${40} Z`}
          fill={COLORS.sage}
          fillOpacity={0.55}
        />
        {/* Dark teal main blob */}
        <Path
          d={`M${W * 0.18},${30} C${W * 0.45},${10} ${W * 0.85},${20} ${W * 0.9},${60} C${W * 0.95},${100} ${W * 0.7},${145} ${W * 0.4},${140} C${W * 0.1},${135} ${W * 0.05},${85} ${W * 0.18},${30} Z`}
          fill={COLORS.teal}
        />
        {/* Small sage accent on top */}
        <Path
          d={`M${W * 0.55},${10} C${W * 0.7},${5} ${W * 0.95},${20} ${W * 0.88},${45} C${W * 0.75},${65} ${W * 0.55},${50} ${W * 0.55},${10} Z`}
          fill={COLORS.sage}
        />
        {/* Thin gold accent ring (decorative) */}
        <Path
          d={`M${W * 0.1},${80} C${W * 0.1},${30} ${W * 0.55},${20} ${W * 0.85},${50}`}
          stroke={COLORS.gold}
          strokeWidth={0.8}
          fill="none"
        />
      </Svg>
    </View>
  )
}

function Ornament() {
  return (
    <Svg width={120} height={14} viewBox="0 0 120 14">
      <Path d="M0,7 L52,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
      <Path
        d="M60,2 L66,7 L60,12 L54,7 Z"
        fill={COLORS.gold}
      />
      <Path d="M68,7 L120,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
    </Svg>
  )
}

function ContactIconWhite({ pathD }: { pathD: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d={pathD} stroke={COLORS.cream} strokeWidth={1.7} fill="none" />
    </Svg>
  )
}

export function CreamEditorialTemplate(props: LetterTemplateProps) {
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
        <View style={styles.divider} />

        {/* ----- LEFT COLUMN ----- */}
        <OrganicBlobs />
        <PhotoCircle photoDataUrl={props.photoDataUrl} initials={initials} />

        <Text style={leftStyles.name}>
          {props.candidateName || "Your Name Here"}
        </Text>

        <View style={leftStyles.ornamentWrap}>
          <Ornament />
        </View>

        <View style={leftStyles.contactList}>
          {props.candidatePhone ? (
            <View style={leftStyles.contactRow}>
              <View style={leftStyles.iconCircle}>
                <ContactIconWhite pathD={ICONS.phone} />
              </View>
              <Text style={leftStyles.contactText}>{props.candidatePhone}</Text>
            </View>
          ) : null}
          {props.candidateEmail ? (
            <View style={leftStyles.contactRow}>
              <View style={leftStyles.iconCircle}>
                <ContactIconWhite pathD={ICONS.email} />
              </View>
              <Text style={leftStyles.contactText}>{props.candidateEmail}</Text>
            </View>
          ) : null}
          {props.candidateLocation ? (
            <View style={leftStyles.contactRow}>
              <View style={leftStyles.iconCircle}>
                <ContactIconWhite pathD={ICONS.pin} />
              </View>
              <Text style={leftStyles.contactText}>{props.candidateLocation}</Text>
            </View>
          ) : null}
          {props.candidateWebsite ? (
            <View style={leftStyles.contactRow}>
              <View style={leftStyles.iconCircle}>
                <ContactIconWhite pathD={ICONS.globe} />
              </View>
              <Text style={leftStyles.contactText}>{props.candidateWebsite}</Text>
            </View>
          ) : null}
        </View>

        {/* ----- RIGHT COLUMN ----- */}
        <View style={styles.rightArea}>
          <Text style={styles.dateLine}>Date: {formatDate(props.date)}</Text>

          {hasRecipient ? (
            <View style={styles.recipient}>
              {recipientLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.greeting}>{parsed.greeting}</Text>

          {parsed.paragraphs.map((p, i) => (
            <Text key={i} style={styles.bodyParagraph}>
              {p}
            </Text>
          ))}

          <Text style={styles.signoff}>{parsed.signoff}</Text>

          <Text style={styles.signatureCursive}>{parsed.signedName}</Text>
          <Text style={styles.signedNameSmall}>
            {(parsed.signedName || props.candidateName || "").toUpperCase()}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
