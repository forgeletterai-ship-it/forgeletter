import fs from "node:fs"
import path from "node:path"
import { Font } from "@react-pdf/renderer"

// @react-pdf/renderer accepts Buffers for `src` at runtime even though
// its TypeScript types only declare `string`. Reading the file at module
// load and passing the buffer avoids a cold-start network fetch and keeps
// the font bundled with the serverless function (Next.js file-tracing
// follows fs.readFileSync calls).
let registered = false

function readFontSafe(relativePath: string): Buffer | null {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath))
  } catch {
    return null
  }
}

export function registerPdfFonts() {
  if (registered) return
  registered = true

  const cormorantItalic = readFontSafe("lib/pdf/fonts/CormorantGaramond-Italic.ttf")
  const dancingScript = readFontSafe("lib/pdf/fonts/DancingScript-Bold.ttf")

  if (cormorantItalic) {
    Font.register({
      family: "CormorantGaramond",
      fonts: [
        { src: cormorantItalic as unknown as string, fontStyle: "italic", fontWeight: "normal" },
        { src: cormorantItalic as unknown as string, fontStyle: "italic", fontWeight: "bold" },
      ],
    })
  }

  if (dancingScript) {
    Font.register({
      family: "DancingScript",
      fonts: [{ src: dancingScript as unknown as string, fontWeight: "bold" }],
    })
  }

  // @react-pdf/renderer ships Helvetica + Times + Courier built-in,
  // so no further work needed for the body text.

  // Disable hyphenation — looks bad in formal letter body.
  Font.registerHyphenationCallback((word) => [word])
}
