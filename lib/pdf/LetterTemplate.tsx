import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

export interface LetterTemplateProps {
  letterBody: string
  jobTitle?: string | null
  companyName?: string | null
  candidateName?: string | null
  date?: string
}

const COLORS = {
  ink: "#17120f",
  muted: "#6f655c",
  gold: "#c79a36",
  teal: "#246b6f",
  paper: "#fffdf8",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
    backgroundColor: COLORS.paper,
    color: COLORS.ink,
    fontSize: 11,
    lineHeight: 1.55,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
    marginBottom: 24,
  },
  brand: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: -0.4,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },
  brandAccent: {
    color: COLORS.gold,
  },
  meta: {
    fontSize: 9,
    color: COLORS.muted,
    textAlign: "right",
  },
  date: {
    marginBottom: 14,
    fontSize: 10,
    color: COLORS.muted,
  },
  subjectBlock: {
    marginBottom: 18,
  },
  subjectLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  subjectValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.teal,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.6,
  },
  paragraph: {
    marginBottom: 11,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5ded2",
  },
})

function formatDate(d?: string): string {
  const date = d ? new Date(d) : new Date()
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function LetterTemplate({
  letterBody,
  jobTitle,
  companyName,
  candidateName,
  date,
}: LetterTemplateProps) {
  const paragraphs = (letterBody || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <Document
      author={candidateName ?? "ForgeLetter"}
      title={
        jobTitle
          ? `Cover Letter — ${jobTitle}${companyName ? ` at ${companyName}` : ""}`
          : "Cover Letter"
      }
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>
            Forge<Text style={styles.brandAccent}>Letter</Text>
          </Text>
          {candidateName ? (
            <Text style={styles.meta}>{candidateName}</Text>
          ) : null}
        </View>

        <Text style={styles.date}>{formatDate(date)}</Text>

        {(jobTitle || companyName) && (
          <View style={styles.subjectBlock}>
            <Text style={styles.subjectLabel}>Application for</Text>
            <Text style={styles.subjectValue}>
              {jobTitle ?? "Cover letter"}
              {companyName ? ` · ${companyName}` : ""}
            </Text>
          </View>
        )}

        <View style={styles.body}>
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))
          ) : (
            <Text>{letterBody}</Text>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Generated with ForgeLetter — forgeletter.com
        </Text>
      </Page>
    </Document>
  )
}
