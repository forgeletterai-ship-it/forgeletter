/**
 * Renders the REAL PDF templates to preview PNGs for the template
 * picker, so what the customer sees in the chooser is pixel-identical
 * to what they download.
 *
 * Re-run whenever a template changes:
 *   npm run previews:render
 *
 * Pipeline: @react-pdf/renderer renderToBuffer (the exact code path
 * the download route uses) → pdfjs-dist rasterizes page 1 →
 * @napi-rs/canvas encodes PNG → public/template-previews/*.png
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToBuffer } from "@react-pdf/renderer"
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas"
import { resetPdfFontCaches } from "../lib/pdf/fonts"
import { CreamEditorialTemplate } from "../lib/pdf/templates/CreamEditorialTemplate"
import { TealSidebarTemplate } from "../lib/pdf/templates/TealSidebarTemplate"
import type { LetterTemplateProps } from "../lib/pdf/templates/shared"

// pdfjs expects browser globals; @napi-rs/canvas provides Node-native
// equivalents.
const g = globalThis as Record<string, unknown>
g.DOMMatrix = g.DOMMatrix ?? DOMMatrix
g.ImageData = g.ImageData ?? ImageData
g.Path2D = g.Path2D ?? Path2D

const SAMPLE: LetterTemplateProps = {
  letterBody: [
    "Dear Hiring Manager,",
    "",
    "Cutting order-to-ship time from 48 hours to 20 hours across three warehouses is what end-to-end process ownership looks like in practice. At Nordvik Trading, I mapped the full fulfilment flow across all three sites, with the 58% reduction translating into a one-third drop in delivery complaints and measurable growth in repeat purchases.",
    "",
    "In the same period, I renegotiated carrier contracts covering the entire parcel volume, producing EUR 210K in annual savings that funded two new packing lines without additional budget. Turning ambiguous operational questions into structured, measurable improvement projects is the core of my background.",
    "",
    "My Lean Six Sigma Green Belt underpins the methodology I bring to this kind of work. I would welcome the opportunity to discuss how my skills and experience align with your needs. Please let me know a convenient time for a call or meeting.",
    "",
    "Sincerely,",
    "Alex Morgan",
  ].join("\n"),
  jobTitle: "Senior Operations Analyst",
  companyName: "Beacon Parcel",
  candidateName: "Alex Morgan",
  candidateEmail: "alex.morgan@email.com",
  candidatePhone: "+44 7700 900123",
  candidateLocation: "Amsterdam, NL",
  photoDataUrl: null,
}

async function rasterize(pdf: Buffer, outFile: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdf),
    verbosity: 0,
    // Node has no FontFace API: disableFontFace makes pdf.js draw the
    // embedded fonts' glyph paths directly, which renders correctly
    // headless.
    disableFontFace: true,
    useSystemFonts: false,
    standardFontDataUrl: resolve(
      process.cwd(),
      "node_modules/pdfjs-dist/standard_fonts/"
    ) + "/",
  })
  const doc = await loadingTask.promise
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale: 1.6 }) // A4 → ~952×1347 px
  const canvas = createCanvas(viewport.width, viewport.height)
  const ctx = canvas.getContext("2d")
  await page.render({
    // Types differ between DOM canvas and @napi-rs/canvas; runtime API
    // surface is compatible for pdfjs's usage.
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    canvas: canvas as unknown as HTMLCanvasElement,
    viewport,
  }).promise
  await loadingTask.destroy()
  writeFileSync(outFile, canvas.toBuffer("image/png"))
  console.log(`✓ ${outFile} (${viewport.width}×${viewport.height})`)
}

async function main() {
  const outDir = resolve(process.cwd(), "public/template-previews")
  mkdirSync(outDir, { recursive: true })

  // Same guard the download route uses: stale react-pdf font caches
  // from a previous render corrupt the next document's text.
  resetPdfFontCaches()
  const teal = await renderToBuffer(TealSidebarTemplate(SAMPLE))
  await rasterize(teal, resolve(outDir, "teal-sidebar.png"))

  resetPdfFontCaches()
  const cream = await renderToBuffer(CreamEditorialTemplate(SAMPLE))
  await rasterize(cream, resolve(outDir, "cream-editorial.png"))
}

main().catch((e) => {
  console.error("Preview render failed:", e)
  process.exit(1)
})
