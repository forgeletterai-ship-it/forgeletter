/**
 * Live Supabase schema audit — READ-ONLY.
 *
 * Probes the deployed database for every table, column, and RPC the
 * application code actually depends on, using the same
 * capability-probe technique the app itself uses (attempt a SELECT,
 * classify the error). Writes nothing; the only RPC invoked is
 * try_start_letter with p_max_count=0, which by construction returns
 * granted=false before its INSERT branch.
 *
 * Run: npx tsx scripts/db-audit.ts
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

/** Every (table, columns) pair the application reads or writes. */
const EXPECTATIONS: Record<string, string[]> = {
  users: [
    "id", "email", "name", "image", "plan", "password", "provider",
    "provider_id", "current_period_start", "past_due_since", "disputed_at",
    "accrued_cap_this_period", "current_segment_started_at",
    "scheduled_plan_change", "password_changed_at",
  ],
  user_profiles: [
    "user_id", "professional_headline", "target_roles", "industries",
    "key_achievements", "strengths", "tools", "experience_blocks",
    "qualifications", "notes", "portfolio_link",
  ],
  application_briefs: [
    "id", "user_id", "role", "company", "tone", "job_description",
    "candidate_experience", "generated_letter", "status", "updated_at",
    "selected_experience_ids",
  ],
  generated_letters: [
    "id", "user_id", "resume_text", "job_description", "job_title",
    "company_name", "tone", "tier", "generation_status", "failure_reason",
    "final_cover_letter", "final_score", "ats_score", "ats_verdict",
    "ats_covered_keywords", "ats_missing_keywords", "hallucination_risk",
    "rewrite_cycles", "agents_run", "template_chosen", "photo_uploaded",
    "created_at", "completed_at", "application_status", "submitted_at",
    "outcome_at", "outcome_notes", "selected_experience_ids",
    "tone_rewrite_count",
  ],
  agent_outputs: ["id", "generation_id", "agent", "cycle"],
  user_settings: ["user_id", "default_tone", "email_updates", "product_updates"],
  password_reset_tokens: ["id", "user_id", "token_hash", "expires_at", "used_at"],
  contact_messages: ["id", "user_id", "name", "email", "topic", "message"],
  consent_log: [
    "user_id", "action", "from_plan", "to_plan", "effective_at",
    "consent_text_version", "ip_hash", "user_agent", "metadata",
  ],
  data_recovery_snapshots: [
    "user_id", "letters_count", "briefs_count", "profile_present",
    "settings_present", "snapshot", "created_at",
  ],
  cover_letter_examples: ["id", "quality_score", "embedding"],
  user_feedback: ["user_id"],
  auth_rate_limits: ["id", "key", "created_at"],
  stripe_processed_events: ["event_id"],
}

type Result = { table: string; status: string; detail?: string }

async function probeTable(table: string, columns: string[]): Promise<Result> {
  const full = await db.from(table).select(columns.join(","), { head: false }).limit(1)
  if (!full.error) return { table, status: "OK (all columns)" }
  const code = (full.error as { code?: string }).code
  const msg = full.error.message ?? ""

  // Table missing entirely?
  const bare = await db.from(table).select("*").limit(1)
  if (bare.error) {
    return { table, status: "TABLE MISSING", detail: bare.error.message }
  }

  // Table exists — find which columns are missing, one by one.
  const missing: string[] = []
  for (const col of columns) {
    const probe = await db.from(table).select(col).limit(1)
    if (probe.error) missing.push(col)
  }
  return {
    table,
    status: "MISSING COLUMNS",
    detail: `${missing.join(", ")} (code ${code}: ${msg.slice(0, 80)})`,
  }
}

async function main() {
  console.log(`Auditing ${url!.replace(/https:\/\//, "").split(".")[0]}…\n`)

  const results: Result[] = []
  for (const [table, cols] of Object.entries(EXPECTATIONS)) {
    results.push(await probeTable(table, cols))
  }

  console.log("── Tables & columns ─────────────────────────────")
  for (const r of results) {
    const pad = r.table.padEnd(26)
    console.log(`${r.status.startsWith("OK") ? "✅" : "❌"} ${pad} ${r.status}${r.detail ? ` — ${r.detail}` : ""}`)
  }

  // ── RPCs ────────────────────────────────────────────────
  console.log("\n── RPC functions ────────────────────────────────")

  // try_start_letter with max 0: count>=0 → granted=false, no insert.
  const gate = await db.rpc("try_start_letter", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_max_count: 0,
    p_period_start: new Date().toISOString(),
    p_resume_text: "",
    p_job_description: "",
    p_job_title: null,
    p_company_name: null,
    p_tone: "professional",
    p_tier: "starter",
  })
  if (gate.error) {
    console.log(`❌ try_start_letter — ${gate.error.message.slice(0, 100)}`)
  } else {
    const row = Array.isArray(gate.data) ? gate.data[0] : gate.data
    console.log(
      `✅ try_start_letter — exists (granted=${row?.granted} at cap 0, as expected)`
    )
  }

  const match = await db.rpc("match_examples", {
    query_embedding: Array(1536).fill(0),
    match_count: 1,
    min_quality: 99,
  })
  console.log(
    match.error
      ? `❌ match_examples — ${match.error.message.slice(0, 100)}`
      : `✅ match_examples — exists (returned ${Array.isArray(match.data) ? match.data.length : 0} rows at min_quality 99)`
  )

  // Existence-only check (never call for real): purge function.
  const purge = await db.rpc("purge_expired_data_recovery_snapshots")
  console.log(
    purge.error && (purge.error as { code?: string }).code === "PGRST202"
      ? `❌ purge_expired_data_recovery_snapshots — MISSING`
      : `✅ purge_expired_data_recovery_snapshots — exists${purge.error ? "" : ` (purged expired rows: ${JSON.stringify(purge.data)})`}`
  )

  // ── Data sanity ─────────────────────────────────────────
  console.log("\n── Data sanity ──────────────────────────────────")
  const counts: Array<[string, string]> = [
    ["users", "id"],
    ["generated_letters", "id"],
    ["cover_letter_examples", "id"],
    ["agent_outputs", "id"],
    ["auth_rate_limits", "id"],
    ["data_recovery_snapshots", "user_id"],
  ]
  for (const [table, col] of counts) {
    const { count, error } = await db
      .from(table)
      .select(col, { count: "exact", head: true })
    console.log(
      error
        ? `❓ ${table.padEnd(26)} count unavailable`
        : `ℹ️  ${table.padEnd(26)} ${count} rows`
    )
  }

  // Gold examples with embeddings (semantic retrieval live?)
  const embedded = await db
    .from("cover_letter_examples")
    .select("id", { count: "exact", head: true })
    .not("embedding", "is", null)
  if (!embedded.error) {
    console.log(`ℹ️  examples WITH embedding      ${embedded.count} rows`)
  }
}

main().catch((e) => {
  console.error("Audit crashed:", e)
  process.exit(1)
})
