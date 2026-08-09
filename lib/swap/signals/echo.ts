/**
 * S2 — JD echo (Phase 1 contract): content-trigram overlap between
 * letter and job description. Trigrams made purely of stopwords are
 * skipped; returns null when no JD was supplied.
 */

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could did do does for from had has have " +
    "he her here his how i if in into is it its just like me more most my no nor not " +
    "of on or our out over she so some such than that the their them then there these " +
    "they this those through to under until up very was we were what when where which " +
    "while who why will with would you your yours am us it's i'm i've we're don't"
  ).split(" ")
)

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z''-]*/g) || []).map((t) =>
    t.replace(/['']s$/, "")
  )
}

function contentTrigrams(text: string): Set<string> {
  const toks = tokens(text)
  const grams = new Set<string>()
  for (let i = 0; i + 2 < toks.length; i++) {
    const a = toks[i]
    const b = toks[i + 1]
    const c = toks[i + 2]
    if (STOPWORDS.has(a) && STOPWORDS.has(b) && STOPWORDS.has(c)) continue
    grams.add(`${a} ${b} ${c}`)
  }
  return grams
}

/** Share of the letter's content trigrams that also appear in the JD. */
export function echoOverlap(letter: string, jd: string | null | undefined): number | null {
  if (!jd || !jd.trim()) return null
  const letterGrams = contentTrigrams(letter)
  if (letterGrams.size === 0) return 0
  const jdGrams = contentTrigrams(jd)
  let hits = 0
  for (const g of letterGrams) if (jdGrams.has(g)) hits += 1
  return hits / letterGrams.size
}
