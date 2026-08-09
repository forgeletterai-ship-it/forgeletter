import type { DistinctMode } from "@/lib/swap/types"

/**
 * Distinctiveness resolution (Phase 1 contract).
 *
 * Corpus mode — per-role-family document frequencies from jd_corpus:
 * a them-phrase is DISTINCTIVE when its max token IDF ≥ 2.5 AND the
 * family corpus holds ≥ 200 docs. Below 200 docs we are in stoplist
 * mode: a phrase on the hand-curated boilerplate list is BOILERPLATE;
 * a specific named entity or concrete decision off-list is
 * DISTINCTIVE; everything else defaults to BOILERPLATE (naming the
 * company is not distinctive — every applicant does that).
 */

export const CORPUS_SWITCHOVER = 200
export const IDF_DISTINCTIVE = 2.5

export interface Stoplist {
  phrases: string[]
  /** Generic proper nouns (major cities/countries, months…) that do
   *  NOT make a phrase distinctive on their own. */
  genericProperNouns: string[]
}

export interface DistinctivenessContext {
  companyName?: string | null
  /** Employer tokens inferred from the letter itself (see
   *  inferCompanyTokens) — merged with companyName. */
  extraCompanyTokens?: string[]
  /** token -> number of family docs containing it */
  docFreqs?: Map<string, number> | null
  corpusSize: number
  stoplist: Stoplist
}

/** Function words never carry distinctiveness, whatever their
 *  document frequency — an IDF spike on "your" is corpus noise. */
const FUNCTION_WORDS = new Set(
  (
    "a an and are as at be but by for from had has have in into is it its of on or " +
    "our so than that the their them then there these they this those to was we were " +
    "what when where which while who will with would you your yours my i me he she"
  ).split(" ")
)

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']s\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function companyTokens(ctx: DistinctivenessContext): Set<string> {
  const out = new Set<string>()
  if (ctx.companyName) {
    for (const t of normalize(ctx.companyName).split(" ")) if (t) out.add(t)
  }
  for (const t of ctx.extraCompanyTokens ?? []) {
    const n = normalize(t)
    if (n) out.add(n)
  }
  return out
}

/**
 * Infer the employer from the letter itself: a capitalized token that
 * is not a generic proper noun and recurs (≥2 mentions) is almost
 * always the company being addressed — applicants repeat the name
 * ("It names Chorusline three times"). Keeps stoplist mode honest
 * when the optional company field is left empty.
 */
export function inferCompanyTokens(letterText: string, stoplist: Stoplist): string[] {
  const generic = new Set(stoplist.genericProperNouns.map(normalize))
  const counts = new Map<string, number>()
  for (const raw of letterText.split(/\s+/)) {
    const stripped = raw.replace(/[^A-Za-z0-9''-]/g, "")
    if (!/^[A-Z]/.test(stripped)) continue
    const norm = normalize(stripped)
    if (!norm || generic.has(norm)) continue
    counts.set(norm, (counts.get(norm) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([t]) => t)
}

/** Capitalised tokens that are not the employer and not generic. */
function offEmployerProperNouns(
  phrase: string,
  company: Set<string>,
  generic: Set<string>
): string[] {
  const out: string[] = []
  for (const raw of phrase.split(/\s+/)) {
    const stripped = raw.replace(/[^A-Za-z0-9''-]/g, "")
    if (!/^[A-Z]/.test(stripped)) continue
    const norm = normalize(stripped)
    if (!norm || company.has(norm) || generic.has(norm)) continue
    out.push(stripped)
  }
  return out
}

export function resolveMode(ctx: DistinctivenessContext): DistinctMode {
  return ctx.corpusSize >= CORPUS_SWITCHOVER && ctx.docFreqs ? "corpus" : "stoplist"
}

export function phraseIsDistinctive(
  phrase: string,
  ctx: DistinctivenessContext
): boolean {
  const mode = resolveMode(ctx)
  const company = companyTokens(ctx)

  if (mode === "corpus") {
    const docFreqs = ctx.docFreqs as Map<string, number>
    let maxIdf = 0
    for (const tok of normalize(phrase).split(" ")) {
      if (!tok || company.has(tok) || FUNCTION_WORDS.has(tok)) continue
      const df = docFreqs.get(tok) ?? 0
      const idf = Math.log(ctx.corpusSize / (1 + df))
      if (idf > maxIdf) maxIdf = idf
    }
    return maxIdf >= IDF_DISTINCTIVE
  }

  // Stoplist mode.
  const generic = new Set(ctx.stoplist.genericProperNouns.map(normalize))
  const stopset = new Set(ctx.stoplist.phrases.map(normalize))

  const norm = normalize(phrase)
  const withoutCompany = norm
    .split(" ")
    .filter((t) => !company.has(t))
    .join(" ")
  if (stopset.has(norm) || stopset.has(withoutCompany)) return false

  // A concrete decision or artefact: a figure, or a proper noun that
  // is neither the employer nor a generic place/date word.
  if (/\d/.test(phrase)) return true
  return offEmployerProperNouns(phrase, company, generic).length > 0
}

export function sentenceIsDistinctive(
  themPhrases: string[],
  ctx: DistinctivenessContext
): boolean {
  return themPhrases.some((p) => phraseIsDistinctive(p, ctx))
}
