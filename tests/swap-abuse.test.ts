import { describe, expect, it } from "vitest"
import { coarseUserAgent, fingerprintFrom } from "@/lib/swap/fingerprint"
import { checkLadder, commitScan } from "@/lib/swap/ladder"
import { scrubText } from "@/lib/swap/logscrub"
import {
  createMemoryKVForTests,
  slidingWindowAllow,
} from "@/lib/swap/ratelimit"
import {
  DUPLICATE_SIMILARITY,
  isDuplicate,
  simhash64,
  simhashFromHex,
  simhashHex,
  similarity,
} from "@/lib/swap/simhash"

const LETTER =
  "Dear Hiring Manager, I am writing to apply for the role. In my current position I lifted trial starts from 6.1% to 8.4% over two quarters. The first three tests failed outright before the fourth worked."

describe("simhash duplicate window", () => {
  it("identical text is identical", () => {
    expect(similarity(simhash64(LETTER), simhash64(LETTER))).toBe(1)
  })

  it("a small edit stays above the duplicate threshold", () => {
    const edited = LETTER.replace("fourth", "fifth")
    const sim = similarity(simhash64(LETTER), simhash64(edited))
    expect(sim).toBeGreaterThanOrEqual(DUPLICATE_SIMILARITY)
    expect(isDuplicate(simhash64(LETTER), simhash64(edited))).toBe(true)
  })

  it("a different letter is not a duplicate", () => {
    const other =
      "To whom it may concern, my background in industrial ceramics spans nine years across three kilns and two continents, with a focus on glaze chemistry."
    expect(isDuplicate(simhash64(LETTER), simhash64(other))).toBe(false)
  })

  it("hex round-trips", () => {
    const h = simhash64(LETTER)
    expect(simhashFromHex(simhashHex(h))).toBe(h)
  })
})

describe("fingerprint", () => {
  it("coarse UA keeps family+major and OS only", () => {
    expect(
      coarseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      )
    ).toBe("chrome/126 windows")
    expect(coarseUserAgent(null)).toBe("other/0 other")
  })

  it("is stable for same parts, distinct across IPs", () => {
    const parts = {
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0.0.0 Safari/537.36",
      platform: "Win32",
      timezone: "Europe/Sofia",
    }
    expect(fingerprintFrom(parts)).toBe(fingerprintFrom({ ...parts }))
    expect(fingerprintFrom(parts)).not.toBe(
      fingerprintFrom({ ...parts, ip: "203.0.113.8" })
    )
  })
})

describe("ladder — lifetime 1 anon + 2 account, paying bypass", () => {
  it("anon gets exactly one scan", async () => {
    const kv = createMemoryKVForTests()
    const base = {
      kv,
      fingerprint: "fp1",
      ipHash: "ip1",
      userId: null,
      paying: false,
      accountScansUsed: 0,
    }
    const first = await checkLadder(base)
    expect(first).toMatchObject({ allowed: true, ordinal: 1, tier: "anon" })
    await commitScan({ kv, fingerprint: "fp1", ipHash: "ip1", tier: "anon" })
    const second = await checkLadder(base)
    expect(second).toMatchObject({ allowed: false, reason: "anon_limit" })
  })

  it("account scans occupy ordinals 2 and 3, then the wall", async () => {
    const kv = createMemoryKVForTests()
    const base = {
      kv,
      fingerprint: "fp2",
      ipHash: "ip2",
      userId: "user-1",
      paying: false,
    }
    expect(await checkLadder({ ...base, accountScansUsed: 0 })).toMatchObject({
      allowed: true,
      ordinal: 2,
      tier: "account",
    })
    expect(await checkLadder({ ...base, accountScansUsed: 1 })).toMatchObject({
      allowed: true,
      ordinal: 3,
    })
    expect(await checkLadder({ ...base, accountScansUsed: 2 })).toMatchObject({
      allowed: false,
      reason: "acct_limit",
    })
  })

  it("paying bypasses with no ordinal", async () => {
    const kv = createMemoryKVForTests()
    const d = await checkLadder({
      kv,
      fingerprint: "fp3",
      ipHash: "ip3",
      userId: "user-2",
      paying: true,
      accountScansUsed: 99,
    })
    expect(d).toMatchObject({ allowed: true, ordinal: null, tier: "paying" })
  })

  it("per-IP daily ceiling blocks at 25", async () => {
    const kv = createMemoryKVForTests()
    for (let i = 0; i < 25; i++) {
      await commitScan({ kv, fingerprint: `f${i}`, ipHash: "shared", tier: "anon" })
    }
    const d = await checkLadder({
      kv,
      fingerprint: "fresh",
      ipHash: "shared",
      userId: null,
      paying: false,
      accountScansUsed: 0,
    })
    expect(d).toMatchObject({ allowed: false, reason: "rate" })
  })
})

describe("sliding window + log scrub", () => {
  it("sliding window blocks past the limit", async () => {
    const kv = createMemoryKVForTests()
    let allowed = 0
    for (let i = 0; i < 8; i++) {
      if (await slidingWindowAllow(kv, "swap:test", 5, 60)) allowed += 1
    }
    expect(allowed).toBeLessThanOrEqual(5)
  })

  it("scrubText emits length + hash only (Rule 2)", () => {
    const scrubbed = scrubText(LETTER)
    expect(scrubbed.length).toBe(LETTER.length)
    expect(scrubbed.sha256_12).toMatch(/^[0-9a-f]{12}$/)
    expect(JSON.stringify(scrubbed)).not.toContain("Hiring")
  })
})
