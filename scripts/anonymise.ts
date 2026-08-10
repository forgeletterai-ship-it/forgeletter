/**
 * scripts/anonymise.ts — Phase 7.3. Strips names, employers, dates,
 * figures, emails and links to bracketed placeholders — the same
 * discipline as the gold corpus — before a consented copy may enter
 * swap_research_corpus. Exported for the route; runnable as a CLI
 * smoke test: npx tsx scripts/anonymise.ts "some text".
 */

import stoplistJson from "../config/boilerplate-stoplist.json"

const generic = new Set(
  (stoplistJson as { genericProperNouns: string[] }).genericProperNouns.map((t) =>
    t.toLowerCase()
  )
)

const MONTHS =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b\s+\d{4}\b/g

export function anonymiseText(
  text: string,
  opts: { companyTokens?: string[] } = {}
): string {
  const company = new Set((opts.companyTokens ?? []).map((t) => t.toLowerCase()))
  let out = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/https?:\/\/\S+/g, "[link]")
    .replace(MONTHS, "[date]")
    .replace(/\d[\d.,]*\s*(%|percent|k\b|m\b)?/g, "[figure] ")

  // Capitalized tokens that are neither generic grammar/geo/title
  // words nor sentence furniture become [name]/[company].
  out = out.replace(/\b([A-Z][a-z][A-Za-z''-]+)\b/g, (match) => {
    const lower = match.toLowerCase()
    if (generic.has(lower)) return match
    if (company.has(lower)) return "[company]"
    return "[name]"
  })

  return out.replace(/\s{2,}/g, " ").replace(/\[figure\] \[figure\]/g, "[figure]").trim()
}

if (process.argv[2]) {
  console.log(anonymiseText(process.argv.slice(2).join(" ")))
}
