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
 * Infer the employer from the letter itself: the company being
 * addressed is the name the letter marks as an OWNER — "Chorusline's
 * move", "Chorusline's commitment". Possessive use is the signal;
 * repetition alone is not enough, because product names repeat too
 * ("Daily Mix … Daily Mix") and a product mention is exactly the
 * kind of specificity that must stay distinctive. Keeps stoplist
 * mode honest when the optional company field is left empty.
 */
export function inferCompanyTokens(letterText: string, stoplist: Stoplist): string[] {
  const generic = new Set(stoplist.genericProperNouns.map(normalize))
  const possessive = new Set<string>()
  const words = letterText.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const stripped = words[i].replace(/[^A-Za-z0-9''-]/g, "")
    if (!/^[A-Z]/.test(stripped) || !/['']s$/.test(stripped)) continue
    const norm = normalize(stripped)
    if (!norm || generic.has(norm)) continue
    possessive.add(norm)
    // Multi-word names ("Nordvale Group's") — the preceding
    // capitalized token belongs to the same name.
    const prev = (words[i - 1] ?? "").replace(/[^A-Za-z0-9''-]/g, "")
    if (/^[A-Z]/.test(prev)) {
      const p = normalize(prev)
      if (p && !generic.has(p)) possessive.add(p)
    }
  }
  return [...possessive]
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

/** Deterministic role-family bucketing for the JD corpus and stats
 *  (a coarse taxonomy — corpus accuracy per family is what matters,
 *  not taxonomy purity). */
const ROLE_FAMILIES: [string, RegExp][] = [
  ["engineering", /\b(engineer|developer|devops|sre|programmer|software|frontend|backend|full[- ]?stack)\b/i],
  ["data", /\b(data|analytics|analyst|scientist|machine learning|ml engineer|bi\b)\b/i],
  ["design", /\b(designer|design|ux|ui\b|user experience|user interface)\b/i],
  ["product", /\b(product manager|product owner|product lead|pm\b|product)\b/i],
  ["marketing", /\b(marketing|seo|sem|content|brand|growth|social media|communications)\b/i],
  ["sales", /\b(sales|account executive|account manager|business development|bdr|sdr)\b/i],
  ["support", /\b(support|customer success|customer service|helpdesk|service desk)\b/i],
  ["operations", /\b(operations|logistics|supply chain|warehouse|procurement|office manager)\b/i],
  ["finance", /\b(finance|accountant|accounting|controller|auditor|payroll|treasury)\b/i],
  ["people", /\b(recruiter|talent|human resources|hr\b|people ops)\b/i],
]

export function roleFamily(jd: string | null | undefined, letter: string): string {
  const basis = `${(jd || "").slice(0, 600)} ${letter.slice(0, 400)}`
  for (const [family, re] of ROLE_FAMILIES) {
    if (re.test(basis)) return family
  }
  return "other"
}
