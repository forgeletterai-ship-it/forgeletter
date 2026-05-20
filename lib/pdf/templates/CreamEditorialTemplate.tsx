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

const PAGE_H = 842
const LEFT_W = 218

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.cream,
    fontFamily: "Inter",
    fontSize: 10.5,
    color: COLORS.ink,
    paddingTop: 56,
    paddingBottom: 60,
    paddingLeft: 0,
    paddingRight: 0,
  },
  // Left decorations column — absolute, repeats every page via `fixed`.
  leftColumn: {
    position: "absolute",
    top: 0,
    left: 0,
    width: LEFT_W,
    height: PAGE_H,
  },
  divider: {
    position: "absolute",
    top: 56,
    left: LEFT_W,
    width: 0.8,
    height: PAGE_H - 112,
    backgroundColor: COLORS.gold,
    opacity: 0.6,
  },
  bodyColumn: {
    marginLeft: LEFT_W + 30,
    marginRight: 48,
  },
  dateLine: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginBottom: 18,
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
  },
  signoff: {
    fontSize: 11,
    color: COLORS.ink,
    marginTop: 18,
  },
  signatureCursive: {
    fontFamily: "DancingScript",
    fontWeight: "bold",
    fontSize: 32,
    color: COLORS.gold,
    marginTop: 8,
    marginBottom: 4,
  },
  signedNameSmall: {
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 2,
    fontWeight: "bold",
  },
})

const left = StyleSheet.create({
  blobsWrap: {
    position: "absolute",
    top: 50,
    left: 0,
    width: LEFT_W,
    height: 220,
  },
  photoWrap: {
    position: "absolute",
    top: 95,
    left: LEFT_W / 2 - 48,
    width: 96,
    height: 96,
  },
  photoRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 2.2,
    borderColor: COLORS.gold,
  },
  photoInner: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: "#D4CCC0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: 86, height: 86, objectFit: "cover" },
  initials: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 28,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  nameWrap: {
    position: "absolute",
    top: 280,
    left: 8,
    width: LEFT_W - 16,
    alignItems: "center",
  },
  name: {
    fontFamily: "CormorantGaramond",
    fontStyle: "italic",
    fontSize: 30,
    color: COLORS.teal,
    textAlign: "center",
    lineHeight: 1.1,
  },
  ornamentWrap: {
    position: "absolute",
    top: 332,
    left: 0,
    width: LEFT_W,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: 372,
    left: 26,
    width: LEFT_W - 38,
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

function OrganicBlobs() {
  const W = LEFT_W
  return (
    <View style={left.blobsWrap}>
      <Svg width={W} height={220} viewBox={`0 0 ${W} 220`}>
        {/* Sage back blob (large, soft, behind everything) */}
        <Path
          d={`M ${W * 0.06} 110 C ${W * 0.02} 60, ${W * 0.22} 30, ${W * 0.5} 35 C ${W * 0.82} 40, ${W * 0.98} 65, ${W * 0.92} 115 C ${W * 0.86} 165, ${W * 0.6} 195, ${W * 0.35} 185 C ${W * 0.1} 175, ${W * 0.08} 150, ${W * 0.06} 110 Z`}
          fill={COLORS.sage}
          fillOpacity={0.4}
        />
        {/* Cream/peach mid blob behind teal for depth */}
        <Path
          d={`M ${W * 0.12} 80 C ${W * 0.22} 45, ${W * 0.55} 38, ${W * 0.74} 55 C ${W * 0.9} 75, ${W * 0.82} 130, ${W * 0.62} 148 C ${W * 0.38} 165, ${W * 0.12} 140, ${W * 0.12} 80 Z`}
          fill="#EBDFC5"
        />
        {/* Dark teal main blob */}
        <Path
          d={`M ${W * 0.2} 62 C ${W * 0.4} 32, ${W * 0.72} 38, ${W * 0.88} 70 C ${W * 0.98} 100, ${W * 0.84} 155, ${W * 0.58} 170 C ${W * 0.28} 180, ${W * 0.08} 150, ${W * 0.14} 108 C ${W * 0.16} 88, ${W * 0.18} 72, ${W * 0.2} 62 Z`}
          fill={COLORS.teal}
        />
        {/* Sage accent splash on the upper-right */}
        <Path
          d={`M ${W * 0.62} 28 C ${W * 0.8} 22, ${W * 0.96} 30, ${W * 0.92} 52 C ${W * 0.86} 72, ${W * 0.72} 65, ${W * 0.62} 28 Z`}
          fill={COLORS.sage}
        />
        {/* Thin gold accent strokes */}
        <Path
          d={`M ${W * 0.1} 110 C ${W * 0.1} 60, ${W * 0.48} 25, ${W * 0.72} 42`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
        />
        <Path
          d={`M ${W * 0.86} 80 C ${W * 0.92} 100, ${W * 0.88} 145, ${W * 0.72} 160`}
          stroke={COLORS.gold}
          strokeWidth={0.9}
          fill="none"
        />
        {/* Small gold dot */}
        <Path
          d={`M ${W * 0.4} 28 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0`}
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
    <View style={left.photoWrap}>
      <View style={left.photoRing} />
      <View style={left.photoInner}>
        {photoDataUrl ? (
          <PdfImage src={photoDataUrl} style={left.photoImg} />
        ) : (
          <Text style={left.initials}>{initials}</Text>
        )}
      </View>
    </View>
  )
}

function Ornament() {
  return (
    <Svg width={130} height={14} viewBox="0 0 130 14">
      <Path d="M 0 7 L 58 7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
      <Path d="M 65 2 L 71 7 L 65 12 L 59 7 Z" fill={COLORS.gold} />
      <Path d="M 73 7 L 130 7" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
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

function ContactRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={left.contactRow}>
      <View style={left.iconCircle}>{icon}</View>
      <Text style={left.contactText}>{text}</Text>
    </View>
  )
}

export function CreamEditorialTemplate(props: LetterTemplateProps) {
  const parsed = parseLetter(props.letterBody, props.candidateName)
  const initials = getInitials(props.candidateName)

  const recipient: string[] = []
  if (props.companyName) recipient.push(props.companyName)
  if (props.recipientAddress) {
    for (const line of props.recipientAddress.split(/\n/)) {
      const t = line.trim()
      if (t) recipient.push(t)
    }
  }
  const hasRecipient = recipient.length > 0

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
        {/* === Left decoration column, fixed (repeats per page) === */}
        <View fixed style={styles.leftColumn}>
          <OrganicBlobs />
          <PhotoCircle photoDataUrl={props.photoDataUrl} initials={initials} />

          <View style={left.nameWrap}>
            <Text style={left.name}>{props.candidateName || "Your Name"}</Text>
          </View>

          <View style={left.ornamentWrap}>
            <Ornament />
          </View>

          <View style={left.contactList}>
            {props.candidatePhone ? (
              <ContactRow icon={<IconPhone />} text={props.candidatePhone} />
            ) : null}
            {props.candidateEmail ? (
              <ContactRow icon={<IconMail />} text={props.candidateEmail} />
            ) : null}
            {props.candidateLocation ? (
              <ContactRow icon={<IconPin />} text={props.candidateLocation} />
            ) : null}
            {props.candidateWebsite ? (
              <ContactRow icon={<IconGlobe />} text={props.candidateWebsite} />
            ) : null}
          </View>
        </View>

        {/* Vertical gold divider between columns — also fixed */}
        <View fixed style={styles.divider} />

        {/* === Body column === */}
        <View style={styles.bodyColumn}>
          <Text style={styles.dateLine}>Date: {formatDate(props.date)}</Text>

          {hasRecipient ? (
            <View style={styles.recipientBlock}>
              {recipient.map((line, i) => (
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
