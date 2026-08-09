import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import catalogue from "@/config/catalogue.v0.1.json"
import { REPAIRS } from "@/lib/swap/templates"

/**
 * Anonymisation CI (Phase 3.5 ⚙): every gold quote used anywhere is
 * scanned against a denylist built from the gold source records.
 * The gold corpus discipline is bracketed placeholders — so (a) no
 * quote may carry an unresolved [placeholder], and (b) no quote may
 * contain a proper noun that appears un-bracketed in a gold body
 * (those are the residual names/employers the discipline missed).
 */

const goldPath = resolve(process.cwd(), "scripts/gold-letters-source.json")
const gold: { body: string }[] = JSON.parse(readFileSync(goldPath, "utf-8"))

// Words that are capitalized for grammatical reasons, not identity —
// the stoplist's genericProperNouns (geo, months, job-title words,
// sentence starters) plus test-local grammar words.
import stoplistJson from "@/config/boilerplate-stoplist.json"

const GENERIC = new Set([
  ...(stoplistJson as { genericProperNouns: string[] }).genericProperNouns,
  ...(
    "I I'm I've I'd Two Three Four Five Six Sincerely Once Over Under Since Last " +
    "One First Second Third Then There Here Now Today Yesterday What They He She But Not No"
  ).split(" "),
])

function properNouns(text: string): Set<string> {
  // Strip bracketed placeholders first — they are the anonymisation.
  const unbracketed = text.replace(/\[[^\]]*\]/g, " ")
  const out = new Set<string>()
  for (const m of unbracketed.matchAll(/\b([A-Z][a-z][A-Za-z''-]+)\b/g)) {
    if (!GENERIC.has(m[1])) out.add(m[1])
  }
  return out
}

// Denylist: capitalized tokens that survive un-bracketed in gold
// bodies. Deliberately conservative — anything here is potentially a
// residual name/employer and must not travel into user-facing quotes.
const denylist = new Set<string>()
for (const rec of gold) for (const t of properNouns(rec.body)) denylist.add(t)

// The Appendix A demo employer is fictional and verified — exempt.
const EXEMPT = new Set(["Chorusline", "Daily", "Mix", "Berlin"])

function collectQuotes(): { source: string; quote: string }[] {
  const quotes: { source: string; quote: string }[] = []
  for (const [key, r] of Object.entries(REPAIRS)) {
    quotes.push({ source: `templates.${key}`, quote: r.goldQuote })
  }
  const cat = catalogue as unknown as {
    techniques: { id: string; exemplar: string }[]
    failures: { id: string; exemplar: string }[]
  }
  for (const t of cat.techniques) quotes.push({ source: `catalogue.${t.id}`, quote: t.exemplar })
  for (const f of cat.failures) quotes.push({ source: `catalogue.${f.id}`, quote: f.exemplar })
  return quotes
}

describe("anonymisation CI — gold quotes leak nothing (Rule/Phase 3.5)", () => {
  const quotes = collectQuotes()

  it("collects quotes from templates and catalogue", () => {
    expect(quotes.length).toBeGreaterThanOrEqual(30)
  })

  it("no quote carries an unresolved [placeholder]", () => {
    for (const { source, quote } of quotes) {
      expect(quote.includes("["), `${source} has a placeholder`).toBe(false)
    }
  })

  it("no quote contains a denylisted proper noun from the gold corpus", () => {
    for (const { source, quote } of quotes) {
      for (const noun of properNouns(quote)) {
        if (EXEMPT.has(noun)) continue
        expect(
          denylist.has(noun),
          `${source} contains "${noun}" which appears un-bracketed in a gold body`
        ).toBe(false)
      }
    }
  })
})
