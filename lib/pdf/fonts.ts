import fs from "node:fs"
import path from "node:path"
import { Font } from "@react-pdf/renderer"

// We read each TTF at module load and convert it to a base64 data-URL
// string. Why not pass the raw Buffer:
// @react-pdf/renderer's internal font loader has code paths that call
// `.substring()` on the src to detect data URLs; Buffer doesn't have
// that method and the renderer throws
//   "TypeError: dataUrl.substring is not a function"
// inside its serverless function. A base64 string sidesteps the issue.
let registered = false

function readFontAsDataUrl(relativePath: string): string | null {
  try {
    const buffer = fs.readFileSync(path.resolve(process.cwd(), relativePath))
    return `data:font/ttf;base64,${buffer.toString("base64")}`
  } catch {
    return null
  }
}

export function registerPdfFonts() {
  if (registered) return
  registered = true

  const cormorantItalic = readFontAsDataUrl("lib/pdf/fonts/CormorantGaramond-Italic.ttf")
  const dancingScript = readFontAsDataUrl("lib/pdf/fonts/DancingScript-Bold.ttf")
  const inter = readFontAsDataUrl("lib/pdf/fonts/Inter.ttf")

  if (cormorantItalic) {
    Font.register({
      family: "CormorantGaramond",
      fonts: [
        { src: cormorantItalic, fontStyle: "italic", fontWeight: "normal" },
        { src: cormorantItalic, fontStyle: "italic", fontWeight: "bold" },
      ],
    })
  }

  if (dancingScript) {
    Font.register({
      family: "DancingScript",
      fonts: [{ src: dancingScript, fontWeight: "bold" }],
    })
  }

  if (inter) {
    // Variable font — supports Latin, Latin Extended, Cyrillic, Greek, Vietnamese.
    // Same data URL for both weights since it's variable (100-900).
    Font.register({
      family: "Inter",
      fonts: [
        { src: inter, fontWeight: "normal" },
        { src: inter, fontWeight: "bold" },
      ],
    })
  }

  // Disable hyphenation — looks bad in formal letter body.
  Font.registerHyphenationCallback((word) => [word])
}

interface ResettableFontSource {
  data: unknown
  loadResultPromise: unknown
}

/**
 * Must be called before EVERY renderToBuffer call.
 *
 * react-pdf keeps loaded fontkit instances (and their glyph-run
 * caches) alive across documents in a warm process. Those caches get
 * mutated during layout, so the second document that lays out a word
 * the first document already used — in a different weight — silently
 * loses glyphs: rendering the Teal template then the Cream template
 * in the same process produced a Cream PDF whose greeting read
 * "g Manager," instead of "Dear Hiring Manager,".
 *
 * Nulling each source's data AND its cached load promise forces the
 * next render to rebuild fontkit instances with clean caches. (The
 * library's own Font.reset() nulls only `data`, leaving the resolved
 * load promise behind — fonts then never reload and rendering
 * crashes; that's why this helper exists.)
 */
export function resetPdfFontCaches() {
  const families = Font.getRegisteredFonts() as unknown as Record<
    string,
    { sources: ResettableFontSource[] }
  >
  for (const family of Object.values(families)) {
    for (const source of family.sources) {
      source.data = null
      source.loadResultPromise = null
    }
  }
}
