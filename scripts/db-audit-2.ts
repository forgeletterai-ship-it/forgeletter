import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const latest = await db
    .from("agent_outputs")
    .select("agent_name,cycle_number,created_at,fallback_triggered")
    .order("created_at", { ascending: false })
    .limit(6)
  console.log("latest agent_outputs:")
  for (const r of latest.data ?? []) {
    console.log(
      ` ${String(r.created_at).slice(0, 16)} ${String(r.agent_name).padEnd(20)} cycle=${r.cycle_number} fallback=${r.fallback_triggered}`
    )
  }

  const statuses = await db
    .from("generated_letters")
    .select("generation_status,tone_rewrite_count,created_at")
    .order("created_at", { ascending: false })
    .limit(12)
  const tally: Record<string, number> = {}
  for (const r of statuses.data ?? []) {
    tally[r.generation_status] = (tally[r.generation_status] ?? 0) + 1
  }
  console.log("\ngeneration_status across last 12 letters:", JSON.stringify(tally))
  console.log(
    "latest letter:",
    JSON.stringify(statuses.data?.[0] ?? null)
  )

  const gold = await db
    .from("cover_letter_examples")
    .select("id", { count: "exact", head: true })
  console.log(`\ncover_letter_examples now: ${gold.count} rows`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
