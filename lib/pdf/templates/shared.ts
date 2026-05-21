export const COLORS = {
  teal: "#0F3D3E",
  tealLight: "#1A5253",
  gold: "#C9A961",
  goldLight: "#DBC084",
  // Cream and creamLight match the cream-editorial-blobs PNG's
  // background colour exactly, so the image blends seamlessly with
  // the page (no visible image-rectangle edge).
  cream: "#FCF7EF",
  creamLight: "#FDFAF4",
  sage: "#8FBAB0",
  paper: "#FFFFFF",
  ink: "#1C1A17",
  inkSoft: "#3D3733",
  muted: "#6F655C",
} as const

export interface LetterTemplateProps {
  /** AI-generated letter body — full text including "Dear ..." and sign-off */
  letterBody: string
  /** Candidate display name (e.g. "Maya Chen") */
  candidateName: string
  /** Candidate email — required */
  candidateEmail: string
  /** Phone, location, website — all optional */
  candidatePhone?: string
  candidateLocation?: string
  candidateWebsite?: string
  /** Base64 data URL of the photo (data:image/png;base64,...) or null for initials fallback */
  photoDataUrl: string | null
  /** Job + company for the recipient block */
  jobTitle?: string | null
  companyName?: string | null
  /** Recipient address (optional, multi-line) */
  recipientAddress?: string | null
  /** ISO date string (defaults to today) */
  date?: string
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "FL"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatDate(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

/**
 * Parse the AI letter into:
 *   { greeting, body[], signoff, signedName }
 *
 * The orchestrator's Writer agent always produces:
 *   Dear <name>,
 *
 *   <para 1>
 *
 *   <para 2>
 *   ...
 *
 *   Sincerely,
 *   <Candidate name>
 *
 * If the format diverges we still get something usable.
 */
export interface ParsedLetter {
  greeting: string
  paragraphs: string[]
  signoff: string
  signedName: string
}

export function parseLetter(text: string, candidateName: string): ParsedLetter {
  const normalized = (text || "").replace(/\r\n?/g, "\n").trim()
  const blocks = normalized.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)

  let greeting = ""
  let signoff = "Sincerely,"
  let signedName = candidateName

  const SALUTATION_RE = /^(Dear\b[^]*?,|To whom it may concern,|Hello[^]*?,|Hi[^]*?,)/i

  if (blocks.length > 0 && SALUTATION_RE.test(blocks[0])) {
    greeting = blocks.shift() as string
  }

  // Find the signoff in the last 1-2 blocks. The pattern is usually
  // "Sincerely,\n<Name>" combined into one block, or two separate blocks.
  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1]
    const signoffMatch = last.match(/^(Sincerely|Best( regards)?|Warm regards|Regards|Kind regards|Yours sincerely),?\s*\n?\s*(.*)$/i)
    if (signoffMatch) {
      signoff = signoffMatch[1].endsWith(",") ? signoffMatch[1] : signoffMatch[1] + ","
      const trailing = signoffMatch[3]?.trim()
      if (trailing) signedName = trailing
      blocks.pop()
    } else if (blocks.length >= 2) {
      const lastTwo = blocks[blocks.length - 2]
      const so2 = lastTwo.match(/^(Sincerely|Best( regards)?|Warm regards|Regards|Kind regards|Yours sincerely),?\s*$/i)
      if (so2) {
        signoff = so2[1].endsWith(",") ? so2[1] : so2[1] + ","
        signedName = blocks[blocks.length - 1]
        blocks.pop()
        blocks.pop()
      }
    }
  }

  return {
    greeting: greeting || `Dear Hiring Manager,`,
    paragraphs: blocks,
    signoff,
    signedName,
  }
}

/**
 * Approximate paths for the four contact icons we use across templates.
 * Each path is drawn inside a 24x24 viewBox; templates scale them.
 * We use simple outlined paths so they render crisp at any size.
 */
export const ICONS = {
  phone:
    "M5 4h3l2 4-2 1.4a12 12 0 0 0 5.6 5.6L15 13l4 2v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2z",
  email:
    "M3 6h18v12H3z M3 6l9 6 9-6",
  pin:
    "M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2c3 2.5 4.5 6.5 4.5 10S15 19.5 12 22 M12 2c-3 2.5-4.5 6.5-4.5 10S9 19.5 12 22",
} as const
