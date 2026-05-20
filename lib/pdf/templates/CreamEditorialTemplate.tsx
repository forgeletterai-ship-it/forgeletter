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

const LEFT_W = 218

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.cream,
    fontFamily: "Inter",
    fontSize: 10.5,
    color: COLORS.ink,
    paddingTop: 54,
    paddingBottom: 60,
    paddingLeft: LEFT_W + 26,
    paddingRight: 46,
  },
  dividerLine: {
    position: "absolute",
    left: LEFT_W,
    top: 50,
    width: 0.7,
    bottom: 50,
    backgroundColor: COLORS.gold,
    opacity: 0.55,
  },
  dateLine: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginBottom: 16,
    fontWeight: "bold",
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
    marginBottom: 12,
    fontWeight: "bold",
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
    marginTop: 16,
  },
  signatureCursive: {
    fontFamily: "DancingScript",
    fontWeight: "bold",
    fontSize: 30,
    color: COLORS.gold,
    marginTop: 6,
    marginBottom: 4,
  },
  signedNameSmall: {
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 2,
    fontWeight: "bold",
  },
})

const leftStyles = StyleSheet.create({
  blobWrap: {
    position: "absolute",
    top: 50,
    left: 0,
    width: LEFT_W,
    height: 200,
  },
  photoWrap: {
    position: "absolute",
    top: 90,
    left: LEFT_W / 2 - 47,
    width: 94,
    height: 94,
  },
  photoRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 94,
    height: 94,
    borderRadius: 999,
    borderWidth: 2.2,
    borderColor: COLORS.gold,
  },
  photoInner: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: "#D6CFC4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: {
    width: 84,
    height: 84,
    objectFit: "cover",
  },
  initials: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 28,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  name: {
    position: "absolute",
    top: 270,
    left: 10,
    right: 10,
    fontFamily: "CormorantGaramond",
    fontStyle: "italic",
    fontSize: 30,
    color: COLORS.teal,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 1.1,
  },
  ornamentWrap: {
    position: "absolute",
    top: 320,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: 360,
    left: 24,
    right: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 28,
    height: 28,
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
    lineHeight: 1.4,
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
  // Composition of organic shapes framing the photo:
  // - large dark teal blob in the middle
  // - sage shape on the left/back
  // - smaller sage accent top-right
  // - thin gold ring overlay
  const W = LEFT_W
  return (
    <View style={leftStyles.blobWrap}>
      <Svg width={W} height={200} viewBox={`0 0 ${W} 200`}>
        {/* Sage back blob (large, soft, behind everything) */}
        <Path
          d={`M ${W * 0.04} 90
              C ${W * 0.0} 50, ${W * 0.2} 25, ${W * 0.45} 30
              C ${W * 0.75} 35, ${W * 0.95} 55, ${W * 0.92} 100
              C ${W * 0.88} 145, ${W * 0.6} 175, ${W * 0.35} 165
              C ${W * 0.1} 158, ${W * 0.05} 130, ${W * 0.04} 90 Z`}
          fill={COLORS.sage}
          fillOpacity={0.45}
        />
        {/* Cream/peach softer blob behind the teal one for depth */}
        <Path
          d={`M ${W * 0.1} 65
              C ${W * 0.2} 35, ${W * 0.5} 30, ${W * 0.7} 50
              C ${W * 0.85} 70, ${W * 0.78} 115, ${W * 0.6} 130
              C ${W * 0.35} 145, ${W * 0.1} 120, ${W * 0.1} 65 Z`}
          fill="#EBDFC5"
        />
        {/* Dark teal main blob — the prominent shape */}
        <Path
          d={`M ${W * 0.18} 50
              C ${W * 0.36} 22, ${W * 0.7} 28, ${W * 0.86} 60
              C ${W * 0.96} 90, ${W * 0.82} 140, ${W * 0.55} 152
              C ${W * 0.25} 160, ${W * 0.05} 130, ${W * 0.12} 92
              C ${W * 0.14} 75, ${W * 0.15} 60, ${W * 0.18} 50 Z`}
          fill={COLORS.teal}
        />
        {/* Sage accent — small splash on the upper-right */}
        <Path
          d={`M ${W * 0.62} 18
              C ${W * 0.78} 12, ${W * 0.94} 22, ${W * 0.92} 42
              C ${W * 0.88} 60, ${W * 0.7} 58, ${W * 0.62} 18 Z`}
          fill={COLORS.sage}
        />
        {/* Thin gold accent stroke — partial ring over composition */}
        <Path
          d={`M ${W * 0.08} 95
              C ${W * 0.08} 50, ${W * 0.45} 18, ${W * 0.7} 35`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
        />
        <Path
          d={`M ${W * 0.85} 70
              C ${W * 0.9} 90, ${W * 0.86} 130, ${W * 0.7} 145`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
        />
        {/* Small gold accent dot */}
        <Path
          d={`M ${W * 0.4} 18
              m -2 0
              a 2 2 0 1 0 4 0
              a 2 2 0 1 0 -4 0`}
          fill={COLORS.gold}
        />
      </Svg>
    </View>
  )
}

function Ornament() {
  return (
    <Svg width={130} height={14} viewBox="0 0 130 14">
      <Path d="M0,7 L58,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
      <Path d="M65,2 L71,7 L65,12 L59,7 Z" fill={COLORS.gold} />
      <Path d="M73,7 L130,7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
    </Svg>
  )
}

function IconPin() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
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
    <Svg width={13} height={13} viewBox="0 0 24 24">
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
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M3 6h18v12H3z" stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
      <Path d="M3 7l9 6.5 9-6.5" stroke={COLORS.cream} strokeWidth={1.6} fill="none" />
    </Svg>
  )
}

function IconGlobe() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
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

function LeftDecorations({
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
    <View fixed>
      <View style={styles.dividerLine} />
      <OrganicBlobs />
      <PhotoCircle photoDataUrl={photoDataUrl} initials={initials} />

      <Text style={leftStyles.name}>{candidateName || "Your Name"}</Text>

      <View style={leftStyles.ornamentWrap}>
        <Ornament />
      </View>

      <View style={leftStyles.contactList}>
        {candidatePhone ? (
          <View style={leftStyles.contactRow}>
            <View style={leftStyles.iconCircle}>
              <IconPhone />
            </View>
            <Text style={leftStyles.contactText}>{candidatePhone}</Text>
          </View>
        ) : null}
        {candidateEmail ? (
          <View style={leftStyles.contactRow}>
            <View style={leftStyles.iconCircle}>
              <IconMail />
            </View>
            <Text style={leftStyles.contactText}>{candidateEmail}</Text>
          </View>
        ) : null}
        {candidateLocation ? (
          <View style={leftStyles.contactRow}>
            <View style={leftStyles.iconCircle}>
              <IconPin />
            </View>
            <Text style={leftStyles.contactText}>{candidateLocation}</Text>
          </View>
        ) : null}
        {candidateWebsite ? (
          <View style={leftStyles.contactRow}>
            <View style={leftStyles.iconCircle}>
              <IconGlobe />
            </View>
            <Text style={leftStyles.contactText}>{candidateWebsite}</Text>
          </View>
        ) : null}
      </View>
    </View>
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
      <Page size="A4" style={styles.page} wrap>
        <LeftDecorations
          candidateName={props.candidateName}
          photoDataUrl={props.photoDataUrl}
          initials={initials}
          candidatePhone={props.candidatePhone}
          candidateEmail={props.candidateEmail}
          candidateLocation={props.candidateLocation}
          candidateWebsite={props.candidateWebsite}
        />

        <Text style={styles.dateLine}>Date: {formatDate(props.date)}</Text>

        {hasRecipient ? (
          <View style={styles.recipientBlock}>
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
      </Page>
    </Document>
  )
}
