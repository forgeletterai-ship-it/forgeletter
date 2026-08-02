// @vitest-environment node
import { describe, expect, it } from "vitest"
import { renderToBuffer } from "@react-pdf/renderer"
import { resetPdfFontCaches } from "../lib/pdf/fonts"
import { CreamEditorialTemplate } from "../lib/pdf/templates/CreamEditorialTemplate"
import { TealSidebarTemplate } from "../lib/pdf/templates/TealSidebarTemplate"
import type { LetterTemplateProps } from "../lib/pdf/templates/shared"

const PROPS: LetterTemplateProps = {
  letterBody:
    "Dear Hiring Manager,\n\nShort body paragraph.\n\nSincerely,\nAlex Morgan",
  candidateName: "Alex Morgan",
  candidateEmail: "alex.morgan@email.com",
  candidatePhone: "+44 7700 900123",
  candidateLocation: "Amsterdam, NL",
  photoDataUrl: null,
}

async function extract(buf: Buffer): Promise<{ text: string; width: number; height: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const tc = await page.getTextContent()
  const text = tc.items
    .map((i) => ("str" in i ? i.str : ""))
    .join(" ")
  const [, , width, height] = page.view
  await doc.cleanup()
  return { text, width, height }
}

describe("PDF template rendering", () => {
  it("second template rendered in the same process keeps its full text (warm-instance font-cache corruption)", async () => {
    // Reproduces the production sequence: one warm process renders a
    // Teal letter, then a Cream letter. Without resetPdfFontCaches()
    // before each render, the Cream greeting loses its leading glyphs
    // ("g Manager," instead of "Dear Hiring Manager,").
    resetPdfFontCaches()
    const teal = await renderToBuffer(TealSidebarTemplate(PROPS))
    resetPdfFontCaches()
    const cream = await renderToBuffer(CreamEditorialTemplate(PROPS))

    const tealOut = await extract(teal)
    const creamOut = await extract(cream)
    expect(tealOut.text).toContain("Dear Hiring Manager,")
    expect(creamOut.text).toContain("Dear Hiring Manager,")
  }, 60_000)

  it("pages are full A4 despite wrap={false} (no content-height collapse)", async () => {
    resetPdfFontCaches()
    const teal = await renderToBuffer(TealSidebarTemplate(PROPS))
    resetPdfFontCaches()
    const cream = await renderToBuffer(CreamEditorialTemplate(PROPS))

    for (const buf of [teal, cream]) {
      const { width, height } = await extract(buf)
      expect(width).toBeCloseTo(595.28, 0)
      expect(height).toBeGreaterThanOrEqual(841.8)
    }
  }, 60_000)
})
