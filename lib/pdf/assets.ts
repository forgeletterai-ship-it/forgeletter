import fs from "node:fs"
import path from "node:path"

/**
 * Decorative image assets used by the PDF templates, encoded as
 * base64 data URLs at module load.
 *
 * Same pattern as fonts: passing a Buffer to @react-pdf/renderer's
 * <Image src={...}> may hit code paths that call `.substring()` on
 * the src expecting a string. Base64 data URLs are always strings,
 * so the renderer never errors.
 */

interface AssetCache {
  creamEditorialBlobs: string | null
}

let cached: AssetCache | null = null

function readImageAsDataUrl(relativePath: string, mime: string): string | null {
  try {
    const buffer = fs.readFileSync(path.resolve(process.cwd(), relativePath))
    return `data:${mime};base64,${buffer.toString("base64")}`
  } catch {
    return null
  }
}

export function getPdfAssets(): AssetCache {
  if (cached) return cached
  cached = {
    creamEditorialBlobs: readImageAsDataUrl(
      "lib/pdf/assets/cream-editorial-blobs.png",
      "image/png"
    ),
  }
  return cached
}
