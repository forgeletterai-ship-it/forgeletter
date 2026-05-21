/**
 * Finds the photo placeholder by flood-filling outward from the
 * image center, looking for any "non-background" region that's
 * connected (whether it's a white cream center or a gray silhouette
 * placeholder).
 *
 * The seed walks toward whatever's at the geometric center. We then
 * flood-fill all pixels within a tight color tolerance to map out
 * the placeholder's bounding box.
 */
import fs from "node:fs"
import { PNG } from "pngjs"

const png = PNG.sync.read(fs.readFileSync("lib/pdf/assets/cream-editorial-blobs.png"))
const W = png.width
const H = png.height
const data = png.data

function getRGB(x: number, y: number): [number, number, number, number] {
  const i = (y * W + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

function isSimilar(x: number, y: number, r: number, g: number, b: number, tol: number) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false
  const [pr, pg, pb, pa] = getRGB(x, y)
  if (pa === 0) return false
  return (
    Math.abs(pr - r) <= tol &&
    Math.abs(pg - g) <= tol &&
    Math.abs(pb - b) <= tol
  )
}

// Take the pixel at the geometric center as the seed colour.
const seedX = Math.floor(W / 2)
const seedY = Math.floor(H / 2)
const [sR, sG, sB] = getRGB(seedX, seedY)

console.log(`Seed pixel at center (${seedX}, ${seedY}): RGB(${sR}, ${sG}, ${sB})`)

// Flood-fill all pixels within tolerance of the seed colour.
const tol = 10
const visited = new Uint8Array(W * H)
const stack: Array<[number, number]> = [[seedX, seedY]]
let count = 0
let minX = W
let maxX = 0
let minY = H
let maxY = 0
let sumX = 0
let sumY = 0

while (stack.length > 0) {
  const [x, y] = stack.pop()!
  const idx = y * W + x
  if (visited[idx]) continue
  if (!isSimilar(x, y, sR, sG, sB, tol)) continue
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

console.log(`\nConnected placeholder region (seed colour RGB(${sR}, ${sG}, ${sB}) ±${tol}):`)
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
console.log(`  Placeholder diameter:  ${((2 * radius * renderedW) / W).toFixed(1)} pt`)
console.log(`  Suggested photo size:  ${(((2 * radius * renderedW) / W) * 0.97).toFixed(1)} pt (97% — fills placeholder cleanly)`)

// Also sample several background corners to detect the page-cream colour
console.log(`\nBackground corner samples (use this for COLORS.cream):`)
for (const [x, y] of [
  [5, 5],
  [W - 6, 5],
  [5, H - 6],
  [W - 6, H - 6],
]) {
  const [r, g, b] = getRGB(x, y)
  console.log(`  (${x}, ${y}): RGB(${r}, ${g}, ${b}) = #${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`)
}
