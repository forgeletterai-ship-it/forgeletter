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
import { getPdfAssets } from "../assets"
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
    fontSize: 10,
    color: COLORS.ink,
    paddingTop: 44,
    paddingBottom: 48,
    paddingLeft: 0,
    paddingRight: 0,
  },
  // Left decorations column — absolute, repeats every page via `fixed`.
  // backgroundColor explicitly set to cream so the cream colour is
  // painted directly behind the image. Without this, some PDF viewers
  // render the image's transparent pixels as their default transparent
  // representation (checkerboard) instead of blending with the page's
  // backgroundColor — the cream "shows through" reliably this way.
  leftColumn: {
    position: "absolute",
    top: 0,
    left: 0,
    width: LEFT_W,
    height: PAGE_H,
    backgroundColor: COLORS.cream,
  },
  divider: {
    position: "absolute",
    top: 50,
    left: LEFT_W,
    width: 0.8,
    height: PAGE_H - 100,
    backgroundColor: COLORS.gold,
    opacity: 0.6,
  },
  bodyColumn: {
    marginLeft: LEFT_W + 28,
    marginRight: 42,
  },
  dateLine: {
    fontSize: 10,
    color: COLORS.ink,
    marginBottom: 14,
    fontWeight: "bold",
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
    marginBottom: 10,
    fontWeight: "bold",
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
    marginTop: 14,
  },
  signatureCursive: {
    fontFamily: "DancingScript",
    fontWeight: "bold",
    fontSize: 28,
    color: COLORS.gold,
    marginTop: 6,
    marginBottom: 2,
  },
  signedNameSmall: {
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 2,
    fontWeight: "bold",
  },
})

// Image dimensions: 1254 x 1254 (perfectly square).
// Rendered at full column width LEFT_W (218pt), so height also 218pt.
// Cream-center coordinates measured by analyze-blob-image.ts (flood-
// fills the white region inside the design):
//   centroid = (49.3%, 46.8%) of image
//   inner cream diameter = 24.9% of image width = ~108pt
const BLOBS_IMG_TOP = 40
const BLOBS_IMG_WIDTH = LEFT_W
const BLOBS_IMG_HEIGHT = Math.round(LEFT_W * (1254 / 1254))
const PHOTO_CENTER_X = Math.round(LEFT_W * 0.493)
const PHOTO_CENTER_Y_IN_IMG = Math.round(BLOBS_IMG_HEIGHT * 0.468)
const PHOTO_SIZE = 92

const left = StyleSheet.create({
  blobsImage: {
    position: "absolute",
    top: BLOBS_IMG_TOP,
    left: 0,
    width: BLOBS_IMG_WIDTH,
    height: BLOBS_IMG_HEIGHT,
    objectFit: "contain",
  },
  // Photo overlays the cream center of the image. Position is
  // computed from the constants above so the photo lands precisely
  // over the cream/white circle the image was designed with.
  photoWrap: {
    position: "absolute",
    top: BLOBS_IMG_TOP + PHOTO_CENTER_Y_IN_IMG - PHOTO_SIZE / 2,
    left: PHOTO_CENTER_X - PHOTO_SIZE / 2,
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photoInner: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 999,
    backgroundColor: COLORS.creamLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: PHOTO_SIZE, height: PHOTO_SIZE, objectFit: "cover" },
  initials: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 32,
    color: COLORS.teal,
    letterSpacing: -1,
  },
  nameWrap: {
    position: "absolute",
    top: BLOBS_IMG_TOP + BLOBS_IMG_HEIGHT + 40,
    left: 8,
    width: LEFT_W - 16,
    alignItems: "center",
  },
  name: {
    fontFamily: "CormorantGaramond",
    fontStyle: "italic",
    fontSize: 28,
    color: COLORS.teal,
    textAlign: "center",
    lineHeight: 1.1,
  },
  ornamentWrap: {
    position: "absolute",
    top: BLOBS_IMG_TOP + BLOBS_IMG_HEIGHT + 88,
    left: 0,
    width: LEFT_W,
    alignItems: "center",
  },
  contactList: {
    position: "absolute",
    top: BLOBS_IMG_TOP + BLOBS_IMG_HEIGHT + 124,
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

function BlobsImage() {
  // Decorative blob composition is now a real PNG image — much
  // better than hand-coded Bezier paths. The PNG is loaded from
  // disk at module init and embedded as a base64 data URL.
  const assets = getPdfAssets()
  if (!assets.creamEditorialBlobs) {
    // Asset missing — render nothing rather than crashing. The
    // letter still works, just without the decorative composition.
    return null
  }
  return <PdfImage src={assets.creamEditorialBlobs} style={left.blobsImage} />
}

function PhotoCircle({
  photoDataUrl,
  initials,
}: {
  photoDataUrl: string | null
  initials: string
}) {
  // No additional gold ring here — the underlying blob image
  // already has one drawn around the cream center. Adding another
  // ring would create an awkward double-ring effect.
  return (
    <View style={left.photoWrap}>
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
  // Long horizontal gold line with center medallion + accent ticks.
  // Same design as the Teal Sidebar's ornament for visual consistency
  // across both templates.
  const W = 150
  const CY = 8
  return (
    <Svg width={W} height={16} viewBox={`0 0 ${W} 16`}>
      <Line x1={0} y1={CY} x2={6} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      <Line x1={10} y1={CY} x2={W / 2 - 9} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      <Line x1={W / 2 + 9} y1={CY} x2={W - 10} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      <Line x1={W - 6} y1={CY} x2={W} y2={CY} stroke={COLORS.gold} strokeWidth={0.8} />
      <Circle cx={W / 2} cy={CY} r={6} stroke={COLORS.gold} strokeWidth={1} fill="none" />
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
      <Page size="A4" style={styles.page} wrap={false}>
        {/* === Left decoration column, fixed (repeats per page) === */}
        <View fixed style={styles.leftColumn}>
          <BlobsImage />
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

        {/* === Body column. wrap=false guarantees single-page output === */}
        <View style={styles.bodyColumn} wrap={false}>
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
