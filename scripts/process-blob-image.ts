/**
 * Adds alpha transparency to lib/pdf/assets/cream-editorial-blobs.png.
 *
 * The user's exported PNG is RGB-only (color type 2). We need RGBA
 * for the cream page background to show through around the blobs.
 *
 * Strategy: flood-fill from each corner. Any near-white pixel
 * (R,G,B all >= 245) connected to a corner is "background" and
 * gets alpha=0. Anything else stays opaque. This preserves the
 * cream/white photo placeholder in the center (which is surrounded
 * by colored blob pixels, so the flood fill never reaches it).
 *
 * Also: detects the bounding box of the brightest connected region
 * INSIDE the design (the cream photo placeholder) and prints its
 * center + radius so we can position the photo precisely.
 */
import fs from "node:fs"
import path from "node:path"
import { PNG } from "pngjs"

const INPUT = path.resolve("lib/pdf/assets/cream-editorial-blobs.png")
const BG_THRESHOLD = 245 // pixels with R,G,B all >= this count as "background-like"

async function main() {
  const raw = fs.readFileSync(INPUT)
  const png = PNG.sync.read(raw)
  console.log(`Loaded ${png.width}x${png.height}, channels: ${raw.length / (png.width * png.height)} bytes/px`)

  // If PNG is RGB-only (3 channels), we need to expand to RGBA.
  const hasAlpha = png.data.length === png.width * png.height * 4
  let rgba: Buffer
  if (hasAlpha) {
    rgba = png.data
    console.log("Source already has alpha channel; will refine transparency.")
  } else {
    // Expand RGB -> RGBA with alpha=255 everywhere.
    rgba = Buffer.alloc(png.width * png.height * 4)
    for (let i = 0; i < png.width * png.height; i++) {
      rgba[i * 4 + 0] = png.data[i * 3 + 0]
      rgba[i * 4 + 1] = png.data[i * 3 + 1]
      rgba[i * 4 + 2] = png.data[i * 3 + 2]
      rgba[i * 4 + 3] = 255
    }
    console.log("Expanded RGB to RGBA.")
  }

  const W = png.width
  const H = png.height

  // Flood-fill from corners. Mark background pixels in a visited array.
  const visited = new Uint8Array(W * H)
  const isBackgroundColor = (x: number, y: number): boolean => {
    const i = (y * W + x) * 4
    return rgba[i] >= BG_THRESHOLD && rgba[i + 1] >= BG_THRESHOLD && rgba[i + 2] >= BG_THRESHOLD
  }

  const stack: Array<[number, number]> = [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
  ]

  let filledCount = 0
  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    if (x < 0 || y < 0 || x >= W || y >= H) continue
    const idx = y * W + x
    if (visited[idx]) continue
    if (!isBackgroundColor(x, y)) continue
    visited[idx] = 1
    filledCount++
    // Make this pixel transparent
    rgba[idx * 4 + 3] = 0
    // Push 4-way neighbors (sufficient for solid background regions)
    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
  }

  console.log(`Flood-filled ${filledCount} background pixels to alpha=0 (${((filledCount / (W * H)) * 100).toFixed(1)}% of image).`)

  // Now find the bounding box of the cream center inside the design.
  // Look for pixels that are near-white (R,G,B >= 240) but NOT visited
  // by the corner flood fill (so they're inside the design, surrounded
  // by colored blobs).
  let minX = W
  let maxX = 0
  let minY = H
  let maxY = 0
  let centerHits = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      if (visited[idx]) continue
      const r = rgba[idx * 4]
      const g = rgba[idx * 4 + 1]
      const b = rgba[idx * 4 + 2]
      if (r >= 240 && g >= 240 && b >= 240) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        centerHits++
      }
    }
  }

  console.log(`\nCream center analysis (${centerHits} pixels found inside design):`)
  if (centerHits > 100) {
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const radius = Math.min(maxX - minX, maxY - minY) / 2
    console.log(`  Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY})`)
    console.log(`  Center: (${cx.toFixed(1)}, ${cy.toFixed(1)})`)
    console.log(`  Center as % of image: (${((cx / W) * 100).toFixed(1)}%, ${((cy / H) * 100).toFixed(1)}%)`)
    console.log(`  Radius (smaller axis): ${radius.toFixed(0)}px = ${((radius / W) * 100).toFixed(1)}% of width`)
  } else {
    console.log("  Not enough cream pixels found inside design — center detection unreliable.")
  }

  // Write the new PNG.
  const out = new PNG({ width: W, height: H })
  out.data = Buffer.from(rgba)
  const outBuf = PNG.sync.write(out, { colorType: 6 })
  fs.writeFileSync(INPUT, outBuf)
  console.log(`\nWrote ${INPUT} (RGBA, ${outBuf.length} bytes).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
