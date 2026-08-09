/**
 * 64-bit simhash over normalised text (Phase 1 contract). Used only
 * for the resubmit window: similarity ≥ 0.92 within 10 minutes serves
 * the cached result without burning a scan. Only the hash and a TTL
 * ever leave the request — never text (Rule 1).
 *
 * BigInt literals are avoided (project TS target predates ES2020);
 * the constructor form compiles everywhere Node runs this.
 */

export const DUPLICATE_SIMILARITY = 0.92
export const DUPLICATE_WINDOW_SECONDS = 10 * 60

const B0 = BigInt(0)
const B1 = BigInt(1)
const FNV_OFFSET = BigInt("0xcbf29ce484222325")
const FNV_PRIME = BigInt("0x100000001b3")
const MASK64 = BigInt("0xffffffffffffffff")

function fnv1a64(str: string): bigint {
  let hash = FNV_OFFSET
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i))
    hash = (hash * FNV_PRIME) & MASK64
  }
  return hash
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim()
}

export function simhash64(text: string): bigint {
  const toks = normalise(text).split(" ").filter(Boolean)
  const weights = new Array<number>(64).fill(0)
  // Word unigram features: on letter-length documents (~150-800
  // words) bigrams make single-word edits flip too many bits — a
  // resubmit with one word changed must stay inside the ≥0.92
  // duplicate window, and unigrams keep it there.
  for (const f of toks) {
    const h = fnv1a64(f)
    for (let b = 0; b < 64; b++) {
      weights[b] += (h >> BigInt(b)) & B1 ? 1 : -1
    }
  }
  let out = B0
  for (let b = 0; b < 64; b++) if (weights[b] > 0) out |= B1 << BigInt(b)
  return out
}

export function similarity(a: bigint, b: bigint): number {
  let x = a ^ b
  let hamming = 0
  while (x) {
    hamming += Number(x & B1)
    x >>= B1
  }
  return (64 - hamming) / 64
}

export function isDuplicate(a: bigint, b: bigint): boolean {
  return similarity(a, b) >= DUPLICATE_SIMILARITY
}

/** Serialisable form for the KV store. */
export function simhashHex(h: bigint): string {
  return h.toString(16).padStart(16, "0")
}

export function simhashFromHex(hex: string): bigint {
  return BigInt(`0x${hex}`)
}
