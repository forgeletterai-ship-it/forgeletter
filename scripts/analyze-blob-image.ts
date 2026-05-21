/**
 * Finds the WHITE photo-area circle in the composition (the large
 * cream/white region with the thin gold ring), ignoring the smaller
 * gray silhouette placeholder inside it.
 *
 * Strategy: scan all opaque white-ish pixels (R,G,B >= 245), build
 * a horizontal-row coverage map, and find the dominant horizontal
 * extent and vertical extent. The result is the white circle's
 * bounding box.
 */
import fs from "node:fs"
import { PNG } from "pngjs"

const png = PNG.sync.read(fs.readFileSync("lib/pdf/assets/cream-editorial-blobs.png"))
const W = png.width
const H = png.height
const data = png.data

// Background color sample to subtract — anything matching the background
// shouldn't count as "white photo area" (the bg may be cream-ish like
// #FCF7EF which is R=252, G=247, B=239).
const bgR = data[5 * 4]
const bgG = data[5 * 4 + 1]
const bgB = data[5 * 4 + 2]
console.log(`Background sample: RGB(${bgR}, ${bgG}, ${bgB})`)

function isBackground(r: number, g: number, b: number): boolean {
  return Math.abs(r - bgR) <= 4 && Math.abs(g - bgG) <= 4 && Math.abs(b - bgB) <= 4
}

function isWhiteish(r: number, g: number, b: number): boolean {
  // Near-white: all channels >= 245 AND not the background colour
  if (r < 245 || g < 245 || b < 245) return false
  if (isBackground(r, g, b)) return false
  return true
}

// Find the seed: scan from the geometric center outward in a spiral
// until we hit a white-ish pixel.
function findWhiteSeed(): [number, number] | null {
  const cx = Math.floor(W / 2)
  const cy = Math.floor(H / 2)
  // Spiral up to ~30% of image radius
  for (let r = 0; r < W * 0.3; r++) {
    for (let theta = 0; theta < 360; theta += 5) {
      const x = Math.round(cx + r * Math.cos((theta * Math.PI) / 180))
      const y = Math.round(cy + r * Math.sin((theta * Math.PI) / 180))
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const i = (y * W + x) * 4
      if (data[i + 3] === 0) continue
      if (isWhiteish(data[i], data[i + 1], data[i + 2])) {
        return [x, y]
      }
    }
  }
  return null
}

const seed = findWhiteSeed()
if (!seed) {
  console.error("No white-ish pixel found near image center.")
  process.exit(1)
}

console.log(`White seed at (${seed[0]}, ${seed[1]})`)

// Flood-fill connected white-ish pixels (allow some near-white tones).
// This expands into the gray silhouette too — that's fine, because the
// silhouette is INSIDE the white circle so the bounding box will be
// the whole white circle.
const visited = new Uint8Array(W * H)
const stack: Array<[number, number]> = [seed]
let count = 0
let minX = W
let maxX = 0
let minY = H
let maxY = 0
let sumX = 0
let sumY = 0

function isInsidePhotoArea(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= W || y >= H) return false
  const i = (y * W + x) * 4
  if (data[i + 3] === 0) return false
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  if (isBackground(r, g, b)) return false
  // Anything not bg and not too dark counts as "inside the photo area".
  // This catches white, near-white, AND the gray silhouette in the middle.
  // It stops at the gold ring and the colored blobs.
  const minChannel = Math.min(r, g, b)
  const maxChannel = Math.max(r, g, b)
  const isNeutral = maxChannel - minChannel < 15 // gray or white tones
  return isNeutral && minChannel >= 180 // light gray or lighter
}

while (stack.length > 0) {
  const [x, y] = stack.pop()!
  const idx = y * W + x
  if (visited[idx]) continue
  if (!isInsidePhotoArea(x, y)) continue
  visited[idx] = 1
  count++
  sumX += x
  sumY += y
  if (x < minX) minX = x
  if (x > maxX) maxX = x
  if (y < minY) minY = y
  if (y > maxY) maxY = y
  stack.push([x + 1, y])
  stack.push([x - 1, y])
  stack.push([x, y + 1])
  stack.push([x, y - 1])
}

const cx = sumX / count
const cy = sumY / count
const bboxW = maxX - minX
const bboxH = maxY - minY
const radius = Math.min(bboxW, bboxH) / 2

console.log(`\nFull photo-area circle (white + inner gray silhouette):`)
console.log(`  Pixel count:    ${count}`)
console.log(`  Bounding box:   (${minX}, ${minY}) to (${maxX}, ${maxY})`)
console.log(`  Centroid:       (${cx.toFixed(1)}, ${cy.toFixed(1)})`)
console.log(`  Centroid pct:   (${((cx / W) * 100).toFixed(2)}%, ${((cy / H) * 100).toFixed(2)}%)`)
console.log(`  Bbox W x H:     ${bboxW} x ${bboxH}`)
console.log(`  Radius (min/2): ${radius}px = ${((radius / W) * 100).toFixed(2)}% of image width`)

const renderedW = 218
const renderedH = renderedW * (H / W)
console.log(`\nFor a ${renderedW}pt-wide render (height ${renderedH.toFixed(1)}pt):`)
console.log(`  Photo center X:        ${(renderedW * (cx / W)).toFixed(1)} pt`)
console.log(`  Photo center Y in img: ${(renderedH * (cy / H)).toFixed(1)} pt`)
console.log(`  Circle diameter:       ${((2 * radius * renderedW) / W).toFixed(1)} pt`)
console.log(`  Photo size (fill 96%): ${(((2 * radius * renderedW) / W) * 0.96).toFixed(1)} pt`)
console.log(`  Photo size (fill 100%): ${((2 * radius * renderedW) / W).toFixed(1)} pt`)
