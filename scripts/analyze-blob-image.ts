/**
 * Finds the cream photo placeholder by flood-filling outward from
 * the image center, looking for the connected region of near-white
 * pixels. This handles the case where white highlights elsewhere
 * in the design would confuse a centroid approach.
 */
import fs from "node:fs"
import { PNG } from "pngjs"

const png = PNG.sync.read(fs.readFileSync("lib/pdf/assets/cream-editorial-blobs.png"))
const W = png.width
const H = png.height
const data = png.data

// Try multiple seed points until we find one in a white region
function isWhite(x: number, y: number, threshold = 240): boolean {
  if (x < 0 || y < 0 || x >= W || y >= H) return false
  const i = (y * W + x) * 4
  if (data[i + 3] === 0) return false // transparent
  return data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold
}

// Sample center first, then nearby points
const seedCandidates: Array<[number, number]> = [
  [Math.floor(W / 2), Math.floor(H / 2)],
  [Math.floor(W * 0.45), Math.floor(H * 0.45)],
  [Math.floor(W * 0.5), Math.floor(H * 0.45)],
  [Math.floor(W * 0.5), Math.floor(H * 0.5)],
  [Math.floor(W * 0.55), Math.floor(H * 0.5)],
]

let seed: [number, number] | null = null
for (const cand of seedCandidates) {
  console.log(`Trying seed (${cand[0]}, ${cand[1]}): R=${data[(cand[1] * W + cand[0]) * 4]}, G=${data[(cand[1] * W + cand[0]) * 4 + 1]}, B=${data[(cand[1] * W + cand[0]) * 4 + 2]}, A=${data[(cand[1] * W + cand[0]) * 4 + 3]}`)
  if (isWhite(cand[0], cand[1], 230)) {
    seed = cand
    break
  }
}

if (!seed) {
  console.log("No white seed found in candidate positions.")
  process.exit(1)
}

console.log(`\nSeed found at (${seed[0]}, ${seed[1]})`)

// Flood fill from the seed to find all connected near-white pixels
const visited = new Uint8Array(W * H)
const stack: Array<[number, number]> = [seed]
let count = 0
let minX = W
let maxX = 0
let minY = H
let maxY = 0
let sumX = 0
let sumY = 0

while (stack.length > 0) {
  const [x, y] = stack.pop()!
  if (x < 0 || y < 0 || x >= W || y >= H) continue
  const idx = y * W + x
  if (visited[idx]) continue
  if (!isWhite(x, y, 230)) continue
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

console.log(`\nCream center region:`)
console.log(`  Pixel count:    ${count}`)
console.log(`  Bounding box:   (${minX}, ${minY}) to (${maxX}, ${maxY})`)
console.log(`  Centroid:       (${cx.toFixed(1)}, ${cy.toFixed(1)})`)
console.log(`  Centroid pct:   (${((cx / W) * 100).toFixed(2)}%, ${((cy / H) * 100).toFixed(2)}%)`)
console.log(`  Bbox W x H:     ${bboxW} x ${bboxH}`)
console.log(`  Radius (min/2): ${radius}px = ${((radius / W) * 100).toFixed(2)}% of image width`)

const renderedW = 218
const renderedH = renderedW * (H / W)
console.log(`\nFor a ${renderedW}pt-wide render (height ${renderedH.toFixed(1)}pt):`)
console.log(`  Photo center X:    ${(renderedW * (cx / W)).toFixed(1)} pt`)
console.log(`  Photo center Y:    ${(renderedH * (cy / H)).toFixed(1)} pt (within image)`)
console.log(`  Cream diameter:    ${((2 * radius * renderedW) / W).toFixed(1)} pt`)
console.log(`  Suggested photo:   ${(((2 * radius * renderedW) / W) * 0.85).toFixed(1)} pt (85% of cream diameter)`)
