/**
 * scripts/seed-gold-letters.ts
 *
 * Seeds public.cover_letter_examples with the 50 gold-standard
 * cover letters from "Gold_Standard_Cover_Letters_v3.docx" and then
 * backfills embeddings via OpenAI text-embedding-3-small.
 *
 * The letter bodies are loaded verbatim from
 * `scripts/gold-letters-source.json` — do NOT edit that file.
 *
 * Idempotent: every row is tagged `gold-seed-v3` in the `tags`
 * column. Re-running first deletes existing seed rows and re-inserts.
 *
 * Run:
 *   npx tsx scripts/seed-gold-letters.ts            # seed only
 *   npx tsx scripts/seed-gold-letters.ts --embed    # seed + embed
 *
 * Env vars required:
 *   SUPABASE_URL                    (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY                   (only when --embed is passed)
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

config({ path: resolve(process.cwd(), ".env.local") })

// ─────────────────────────────────────────────────────────────────
// Source data
// ─────────────────────────────────────────────────────────────────

type SourceLetter = {
  number: number
  role: string
  industry: string
  seniority: string
  hookDesc: string
  body: string
}

const SEED_TAG = "gold-seed-v3"
const QUALITY_SCORE = 95

const SOURCE_PATH = resolve(process.cwd(), "scripts/gold-letters-source.json")
const letters: SourceLetter[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"))
if (letters.length !== 50) {
  throw new Error(
    `Expected 50 gold letters, got ${letters.length}. Re-parse the DOCX before seeding.`
  )
}

// ─────────────────────────────────────────────────────────────────
// Field mappings
// ─────────────────────────────────────────────────────────────────

/** Lowercase the multi-word industries into single canonical tags
 *  the ExampleRetrieval substring matcher already uses. */
function canonicalIndustry(raw: string): string {
  const base = raw.toLowerCase().split("/")[0].trim()
  const map: Record<string, string> = {
    technology: "technology",
    finance: "finance",
    marketing: "marketing",
    sales: "sales",
    creative: "creative",
    healthcare: "healthcare",
    legal: "legal",
    "human resources": "hr",
    operations: "operations",
    consulting: "consulting",
    engineering: "engineering",
    executive: "executive",
    governance: "governance",
    nonprofit: "nonprofit",
  }
  return map[base] ?? base.replace(/\s+/g, "-")
}

/** Compress the verbose "Senior (6 to 10 yrs)" labels into the
 *  4-bucket enum the cover_letter_examples CHECK constraint allows. */
function canonicalSeniority(raw: string): "junior" | "mid" | "senior" | "lead" {
  const lower = raw.toLowerCase()
  if (lower.startsWith("entry")) return "junior"
  if (lower.startsWith("mid")) return "mid"
  if (lower.startsWith("senior")) return "senior"
  if (
    lower.startsWith("staff") ||
    lower.startsWith("principal") ||
    lower.startsWith("executive") ||
    lower.startsWith("c-suite") ||
    lower.startsWith("board")
  )
    return "lead"
  return "senior"
}

/** Tone is a retrieval hint, not a Writer instruction. Map by
 *  industry: nonprofit and clinical roles read warm, everything
 *  else is the gold-standard confident peer register. */
function inferTone(industry: string, role: string): string {
  const ind = canonicalIndustry(industry)
  const r = role.toLowerCase()
  if (ind === "nonprofit") return "warm"
  if (ind === "healthcare" && (r.includes("nurse") || r.includes("physician"))) {
    return "warm"
  }
  return "confident"
}

/** Build the why_it_works string the Writer reads inline when
 *  this row is retrieved. Concise — one sentence on hook, one on
 *  structural pattern. */
function buildWhyItWorks(letter: SourceLetter): string {
  const hook = letter.hookDesc.replace(/\.$/, "").trim()
  return `Hook: ${hook}. Built on the gold six-layer anatomy — hook, anchored proof, value stack, swap-test company paragraph, peer-register close, signature. Every claim carries a number, a named entity, or an attributed result.`
}

function buildTags(letter: SourceLetter): string[] {
  const tags = [SEED_TAG]
  // Hook style — tokenized, used by future filtering.
  const hookTokens = letter.hookDesc
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, "")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["the", "for", "and", "with"].includes(t))
    .slice(0, 5)
  tags.push(`hook-${hookTokens.join("-")}`)
  // Role family token.
  const roleHead = letter.role.toLowerCase().split(/\s+/)[0]
  if (roleHead) tags.push(`role-${roleHead}`)
  // Letter number for traceability.
  tags.push(`gold-${String(letter.number).padStart(2, "0")}`)
  return tags
}

// ─────────────────────────────────────────────────────────────────
// Supabase client
// ─────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[seed-gold-letters] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local"
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ─────────────────────────────────────────────────────────────────
// Embedding helper (only used with --embed)
// ─────────────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    console.warn("[embed] OPENAI_API_KEY unset — skipping vector backfill.")
    return null
  }
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // ~2000 tokens, well under the 8192 cap
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => "")
    console.error(`[embed] HTTP ${resp.status}:`, t.slice(0, 300))
    return null
  }
  const json = (await resp.json()) as {
    data: Array<{ embedding: number[] }>
  }
  return json.data[0]?.embedding ?? null
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  const args = new Set(process.argv.slice(2))
  const shouldEmbed = args.has("--embed")

  // Step 1: wipe any prior seed rows so we start clean.
  console.log(`[seed] Removing existing rows tagged '${SEED_TAG}'…`)
  const { error: delErr, count: delCount } = await supabase
    .from("cover_letter_examples")
    .delete({ count: "exact" })
    .contains("tags", [SEED_TAG])
  if (delErr) {
    console.error("[seed] Delete failed:", delErr)
    process.exit(1)
  }
  console.log(`[seed] Removed ${delCount ?? 0} prior seed rows.`)

  // Step 2: build the insert payload from the source file.
  // IMPORTANT: cover_letter_excerpt is the body VERBATIM. We never
  // touch the user's text.
  const rows = letters.map((L) => ({
    industry: canonicalIndustry(L.industry),
    role: L.role,
    seniority: canonicalSeniority(L.seniority),
    tone: inferTone(L.industry, L.role),
    cover_letter_excerpt: L.body,
    why_it_works: buildWhyItWorks(L),
    quality_score: QUALITY_SCORE,
    tags: buildTags(L),
    approved: true,
  }))

  console.log(`[seed] Inserting ${rows.length} gold rows…`)
  const { error: insErr, data: inserted } = await supabase
    .from("cover_letter_examples")
    .insert(rows)
    .select("id, role, seniority, industry, tags")
  if (insErr) {
    console.error("[seed] Insert failed:", insErr)
    process.exit(1)
  }
  console.log(`[seed] Inserted ${inserted?.length ?? 0} rows.`)

  // Step 3: optional embedding backfill.
  if (!shouldEmbed) {
    console.log(
      "[seed] Skipping embedding backfill. Pass --embed (and set OPENAI_API_KEY) to enable vector search."
    )
    return
  }

  console.log("[embed] Generating embeddings for the 50 seeded rows…")
  let embedded = 0
  let skipped = 0
  for (const row of inserted ?? []) {
    // Fetch the excerpt back so we don't rebuild it client-side.
    const { data: full } = await supabase
      .from("cover_letter_examples")
      .select("id, industry, role, cover_letter_excerpt")
      .eq("id", row.id)
      .single()
    if (!full) {
      skipped += 1
      continue
    }
    const signature = [
      `Industry: ${full.industry}`,
      `Role: ${full.role}`,
      "",
      full.cover_letter_excerpt,
    ].join("\n")
    const vec = await embedText(signature)
    if (!vec) {
      skipped += 1
      continue
    }
    const { error: updErr } = await supabase
      .from("cover_letter_examples")
      .update({ embedding: vec })
      .eq("id", full.id)
    if (updErr) {
      console.error(`[embed] Update failed for ${full.id}:`, updErr.message)
      skipped += 1
      continue
    }
    embedded += 1
    process.stdout.write(".")
  }
  console.log(`\n[embed] Embedded ${embedded} rows, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error("[seed] Unhandled error:", err)
  process.exit(1)
})
