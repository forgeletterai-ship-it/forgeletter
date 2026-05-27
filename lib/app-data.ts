import { auth } from "@/auth"
import {
  getBillingPeriod,
  getCurrentPlanPeriodStart,
  normalizeStoredPlan,
  type StoredPlanId,
} from "@/lib/plans"
import { customerSafeSupabaseError, supabaseAdmin } from "@/lib/supabase"

/**
 * Schema capability detection.
 *
 * The migration in docs/supabase-experience-blocks.sql adds three
 * column groups to the database. If the user hasn't run it yet, queries
 * that reference those columns fail and the app blows up with a generic
 * "We could not complete that workspace action" error.
 *
 * Instead of that, we detect once per cold start which columns exist
 * and gracefully degrade — read/write only the columns that are
 * actually present. Result: the app keeps working with or without the
 * migration; structured experience persistence simply waits until the
 * migration runs.
 */
export interface SupabaseSchemaCapabilities {
  userProfileExperienceBlocks: boolean
  applicationBriefsSelectedExperienceIds: boolean
  generatedLettersSelectedExperienceIds: boolean
}

const FULL_CAPABILITIES: SupabaseSchemaCapabilities = {
  userProfileExperienceBlocks: true,
  applicationBriefsSelectedExperienceIds: true,
  generatedLettersSelectedExperienceIds: true,
}

const LEGACY_CAPABILITIES: SupabaseSchemaCapabilities = {
  userProfileExperienceBlocks: false,
  applicationBriefsSelectedExperienceIds: false,
  generatedLettersSelectedExperienceIds: false,
}

interface SchemaCacheEntry {
  capabilities: SupabaseSchemaCapabilities
  cachedAt: number
}

// Cache semantics:
//   - Positive detection (column exists) is honoured FOREVER for this
//     process — columns don't disappear at runtime.
//   - Negative detection (column missing) is only honoured for
//     NEGATIVE_TTL_MS so a freshly-applied migration is picked up on
//     warm functions within ~1 minute, without needing a redeploy.
const NEGATIVE_TTL_MS = 60_000

let schemaCache: SchemaCacheEntry | null = null
let inflightProbe: Promise<SupabaseSchemaCapabilities> | null = null

function isFullyCapable(c: SupabaseSchemaCapabilities): boolean {
  return (
    c.userProfileExperienceBlocks &&
    c.applicationBriefsSelectedExperienceIds &&
    c.generatedLettersSelectedExperienceIds
  )
}

function looksLikeMissingColumn(err: { code?: string | null; message?: string | null } | null): boolean {
  if (!err) return false
  const code = err.code || ""
  if (code === "42703" || code === "PGRST204") return true
  const msg = err.message || ""
  if (/column .* does not exist/i.test(msg)) return true
  if (/could not find the .* column/i.test(msg)) return true
  return false
}

async function probeColumn(table: string, column: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from(table)
      .select(column)
      .limit(1)
    if (!error) return true
    if (looksLikeMissingColumn(error)) return false
    // Any other error (e.g. missing table) — treat as "not available" too.
    return false
  } catch {
    return false
  }
}

async function probeAll(): Promise<SupabaseSchemaCapabilities> {
  try {
    const [userProfileBlocks, briefIds, letterIds] = await Promise.all([
      probeColumn("user_profiles", "experience_blocks"),
      probeColumn("application_briefs", "selected_experience_ids"),
      probeColumn("generated_letters", "selected_experience_ids"),
    ])
    if (!userProfileBlocks && !briefIds && !letterIds) {
      console.warn(
        "[schema] Experience-persistence columns are missing — run docs/supabase-experience-blocks.sql to enable structured experience storage."
      )
    }
    return {
      userProfileExperienceBlocks: userProfileBlocks,
      applicationBriefsSelectedExperienceIds: briefIds,
      generatedLettersSelectedExperienceIds: letterIds,
    }
  } catch (err) {
    console.warn("[schema] Probe failed; assuming legacy schema:", err)
    return LEGACY_CAPABILITIES
  }
}

export async function getSupabaseSchemaCapabilities(): Promise<SupabaseSchemaCapabilities> {
  // Honour the cache if either:
  //   (a) all columns are present (definitive, can't get worse later), OR
  //   (b) the cache is still fresh under the negative TTL.
  if (schemaCache) {
    if (isFullyCapable(schemaCache.capabilities)) return schemaCache.capabilities
    if (Date.now() - schemaCache.cachedAt < NEGATIVE_TTL_MS) return schemaCache.capabilities
  }

  // Coalesce concurrent probes so we don't run 3 probes per request when
  // multiple page-data loaders fire at once.
  if (!inflightProbe) {
    inflightProbe = probeAll()
      .then((capabilities) => {
        schemaCache = { capabilities, cachedAt: Date.now() }
        return capabilities
      })
      .finally(() => {
        inflightProbe = null
      })
  }
  return inflightProbe
}

/** Test/recovery hook: lets us re-detect on demand (used in tests + when admin reruns migration). */
export function resetSchemaCapabilitiesCache(): void {
  schemaCache = null
  inflightProbe = null
}

// Marked exported for explicit reset in tests.
export const __SCHEMA_FULL = FULL_CAPABILITIES
export const __SCHEMA_LEGACY = LEGACY_CAPABILITIES

export type PlanId = StoredPlanId

export type AppUser = {
  id: string
  email: string
  name: string | null
  image?: string | null
  plan: PlanId
  /**
   * ISO timestamp of the start of the user's current Stripe billing
   * period. Populated by the Stripe webhook on subscription
   * created/updated/payment_succeeded events; cleared on subscription
   * deleted. Falls back to the calendar boundary when null.
   */
  currentPeriodStart: string | null
  /**
   * Fair-cap accumulator: letters earned at previous plans during the
   * current period, frozen in. Reset to 0 on every renewal.
   */
  accruedCapThisPeriod: number
  /**
   * When the user's current plan stretch began. Used with
   * accruedCapThisPeriod to compute the fair letter cap. Reset to the
   * new period start on every renewal.
   */
  currentSegmentStartedAt: string | null
  /**
   * Deferred downgrade record. Set when the user confirms a
   * downgrade; cleared by the webhook when Stripe applies it on the
   * renewal boundary. UI uses this to render the "your plan will
   * change on X" banner.
   */
  scheduledPlanChange: {
    toPlan: string
    effectiveAt: string
  } | null
  /**
   * ISO timestamp set when invoice.payment_failed fires; cleared on
   * invoice.payment_succeeded. UI surfaces a "your card was declined"
   * banner while this is non-null.
   */
  pastDueSince: string | null
  /**
   * ISO timestamp set when charge.dispute.created fires for a charge
   * belonging to this user. UI surfaces a "chargeback under review"
   * banner while this is non-null.
   */
  disputedAt: string | null
}

// Experience types + display helpers live in their own zero-dep module
// so client components and unit tests can import them without pulling
// in NextAuth / Supabase.
export {
  type ExperienceAchievement,
  type ExperienceBlock,
  type ExperienceBlockType,
  experienceBlockKind,
  experienceBlockLabel,
} from "@/lib/experience-types"

import type { ExperienceAchievement, ExperienceBlock } from "@/lib/experience-types"
import { normalizeAchievement } from "@/lib/experience-types"

export type UserProfile = {
  professional_headline: string
  target_roles: string
  industries: string
  key_achievements: string
  strengths: string
  experience_blocks: ExperienceBlock[]
  qualifications: string
  notes: string
  portfolio_link: string
}

export type ApplicationBrief = {
  id: string
  user_id: string
  role: string
  company: string
  tone: string
  job_description: string
  candidate_experience: string
  /** Experience block ids the user opted to include for this brief.
   *  Empty array = use the user's full saved experience set. */
  selected_experience_ids: string[]
  generated_letter: string | null
  status: "draft" | "brief_ready" | "generated" | "archived"
  created_at: string
  updated_at: string
}

export type UserSettings = {
  default_tone: string
  email_updates: boolean
  product_updates: boolean
}

export const defaultProfile: UserProfile = {
  professional_headline: "",
  target_roles: "",
  industries: "",
  key_achievements: "",
  strengths: "",
  experience_blocks: [],
  qualifications: "",
  notes: "",
  portfolio_link: "",
}

/** Coerces JSONB from Supabase into a typed ExperienceBlock array. */
function normalizeExperienceBlocks(raw: unknown): ExperienceBlock[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry): ExperienceBlock | null => {
      if (!entry || typeof entry !== "object") return null
      const e = entry as Record<string, unknown>
      const type =
        e.type === "employer" || e.type === "internship" || e.type === "university"
          ? e.type
          : null
      if (!type) return null
      const id = typeof e.id === "string" ? e.id : ""
      if (!id) return null
      const achievementsRaw = Array.isArray(e.achievements) ? e.achievements : []
      const achievements: ExperienceAchievement[] = achievementsRaw
        .map((a) => normalizeAchievement(a))
        .filter((a): a is ExperienceAchievement => a !== null)
      return {
        id,
        type,
        company: String(e.company ?? ""),
        title: String(e.title ?? ""),
        employmentType: String(e.employmentType ?? ""),
        sector: String(e.sector ?? ""),
        size: String(e.size ?? ""),
        role: String(e.role ?? ""),
        duration: String(e.duration ?? ""),
        name: String(e.name ?? ""),
        degree: String(e.degree ?? ""),
        achievements,
      }
    })
    .filter((b): b is ExperienceBlock => b !== null)
}

export const defaultSettings: UserSettings = {
  default_tone: "Professional",
  email_updates: true,
  product_updates: true,
}

export function normalizePlan(plan: unknown): PlanId {
  return normalizeStoredPlan(plan)
}

type DatabaseError = {
  code?: string | null
  message?: string | null
}

export function isMissingTableError(error: DatabaseError | null | undefined) {
  if (!error) return false

  const message = error.message || ""

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist"))
  )
}

export function setupMessage(_tableName: string) {
  return "A workspace setup issue is preventing this data from loading. Please contact support."
}

export function dataErrorMessage(error: unknown, tableName: string) {
  return isMissingTableError(error as DatabaseError)
    ? setupMessage(tableName)
    : customerSafeSupabaseError(error)
}

export async function getCurrentAppUser(): Promise<{
  user: AppUser | null
  error?: string
}> {
  let session

  try {
    session = await auth()
  } catch (error) {
    return { user: null, error: customerSafeSupabaseError(error) }
  }

  const email = session?.user?.email

  if (!email) {
    return { user: null, error: "Authentication required" }
  }

  try {
    // Try with all columns including the fair-cap and scheduled-change
    // fields. Fall back through two narrower column sets if the
    // migrations haven't all been applied — keeps the dashboard
    // working during a partial rollout.
    const fullCols =
      "id,email,name,image,plan,current_period_start,past_due_since,disputed_at,accrued_cap_this_period,current_segment_started_at,scheduled_plan_change"
    const mediumCols =
      "id,email,name,image,plan,current_period_start,past_due_since,disputed_at"
    const baseCols = "id,email,name,image,plan"

    let row: Record<string, unknown> | null = null
    let lastError: { code?: string | null; message?: string | null } | null = null

    for (const cols of [fullCols, mediumCols, baseCols]) {
      const attempt = await supabaseAdmin
        .from("users")
        .select(cols)
        .eq("email", email)
        .maybeSingle()
      if (!attempt.error) {
        row = attempt.data as Record<string, unknown> | null
        lastError = null
        break
      }
      lastError = attempt.error
      const code = (attempt.error as { code?: string }).code
      if (code !== "42703" && code !== "PGRST204") {
        // Real error, not a missing-column. Don't keep retrying with
        // ever-smaller projections.
        break
      }
    }

    if (lastError) {
      return { user: null, error: dataErrorMessage(lastError, "users") }
    }
    if (!row) {
      return { user: null, error: "Account record not found" }
    }

    const scheduledRaw = row.scheduled_plan_change as
      | { toPlan?: unknown; effectiveAt?: unknown }
      | null
      | undefined
    const scheduledPlanChange =
      scheduledRaw &&
      typeof scheduledRaw === "object" &&
      typeof scheduledRaw.toPlan === "string" &&
      typeof scheduledRaw.effectiveAt === "string"
        ? {
            toPlan: scheduledRaw.toPlan,
            effectiveAt: scheduledRaw.effectiveAt,
          }
        : null

    return {
      user: {
        id: row.id as string,
        email: row.email as string,
        name: (row.name as string | null) ?? null,
        image: (row.image as string | null) ?? null,
        plan: normalizePlan(row.plan),
        currentPeriodStart: (row.current_period_start as string | null) ?? null,
        accruedCapThisPeriod:
          typeof row.accrued_cap_this_period === "number"
            ? row.accrued_cap_this_period
            : Number(row.accrued_cap_this_period ?? 0) || 0,
        currentSegmentStartedAt:
          (row.current_segment_started_at as string | null) ?? null,
        scheduledPlanChange,
        pastDueSince: (row.past_due_since as string | null) ?? null,
        disputedAt: (row.disputed_at as string | null) ?? null,
      },
    }
  } catch (error) {
    return { user: null, error: dataErrorMessage(error, "users") }
  }
}

async function selectUserProfileRow(
  userId: string,
  columns: string
): Promise<{
  data: Record<string, unknown> | null
  error: { code?: string | null; message?: string | null } | null
}> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select(columns)
    .eq("user_id", userId)
    .maybeSingle()
  return { data: data as Record<string, unknown> | null, error }
}

export async function getUserProfile(userId: string) {
  const capabilities = await getSupabaseSchemaCapabilities()
  const fullCols =
    "professional_headline,target_roles,industries,key_achievements,strengths,experience_blocks,qualifications,notes,portfolio_link"
  const legacyCols =
    "professional_headline,target_roles,industries,key_achievements,strengths"

  try {
    let result = await selectUserProfileRow(
      userId,
      capabilities.userProfileExperienceBlocks ? fullCols : legacyCols
    )

    // Defensive: if a probe said the columns exist but the actual query
    // says otherwise (race during a partial migration), retry with the
    // legacy column set so we never break the page.
    if (result.error && looksLikeMissingColumn(result.error)) {
      console.warn(
        "[getUserProfile] new columns failed mid-flight; falling back to legacy columns:",
        result.error
      )
      resetSchemaCapabilitiesCache()
      result = await selectUserProfileRow(userId, legacyCols)
    }

    if (result.error) {
      return {
        profile: defaultProfile,
        setupError: dataErrorMessage(result.error, "user_profiles"),
      }
    }

    const raw = result.data ?? {}
    const merged: UserProfile = {
      ...defaultProfile,
      ...(raw as Record<string, unknown>),
      experience_blocks: normalizeExperienceBlocks(
        (raw as { experience_blocks?: unknown }).experience_blocks
      ),
      qualifications: String((raw as { qualifications?: unknown }).qualifications ?? ""),
      notes: String((raw as { notes?: unknown }).notes ?? ""),
      portfolio_link: String((raw as { portfolio_link?: unknown }).portfolio_link ?? ""),
    } as UserProfile

    return { profile: merged }
  } catch (error) {
    return {
      profile: defaultProfile,
      setupError: dataErrorMessage(error, "user_profiles"),
    }
  }
}

export async function getApplicationBriefs(userId: string) {
  try {
    // SELECT * is safe whether the new column exists or not — missing
    // columns simply won't be in the row payload.
    const { data, error } = await supabaseAdmin
      .from("application_briefs")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) {
      return {
        briefs: [] as ApplicationBrief[],
        setupError: dataErrorMessage(error, "application_briefs"),
      }
    }

    const briefs: ApplicationBrief[] = (data || []).map((row: Record<string, unknown>) => ({
      ...(row as ApplicationBrief),
      selected_experience_ids: Array.isArray(row.selected_experience_ids)
        ? (row.selected_experience_ids as string[])
        : [],
    }))

    return { briefs }
  } catch (error) {
    return {
      briefs: [] as ApplicationBrief[],
      setupError: dataErrorMessage(error, "application_briefs"),
    }
  }
}

/**
 * Window of seconds we still treat a "running" letter as in-flight.
 * Beyond this, the row is treated as orphaned (Vercel function
 * timeout, pipeline crashed pre-status-update) and excluded from the
 * count so the user's slot is refunded automatically.
 */
const RUNNING_LETTER_MAX_AGE_SECONDS = 7 * 60

/**
 * Single source of truth for "how many letters has this user consumed
 * in the current billing period".
 *
 * A slot is consumed when the pipeline produced **output** for the
 * user, regardless of whether the internal quality gate marked the
 * row passed or failed. From the user's perspective they received a
 * letter; from the business's perspective the Anthropic compute was
 * spent. The only thing that should refund a slot is a true pipeline
 * crash (no output at all) or a stale running row that never
 * finalised.
 *
 * Counted rows:
 *  - final_cover_letter present (any completed generation, regardless
 *    of pass/fail quality score)
 *  - status = running AND created within the orphan window (7 min)
 *
 * Excluded:
 *  - status = failed with no final_cover_letter (true crash)
 *  - status = running but older than 7 min (orphaned)
 *
 * Period boundary: prefers the user's Stripe subscription
 * current_period_start when available (anniversary-aligned with what
 * Stripe billed them for). Falls back to the calendar boundary
 * (1st-of-UTC-month for monthly plans, Jan 1 UTC for annual plans).
 */
export async function getCurrentPeriodLetterCount(
  userId: string,
  plan: PlanId,
  currentPeriodStart?: string | null
) {
  try {
    const period = getBillingPeriod(plan)
    const periodStart = currentPeriodStart
      ? new Date(currentPeriodStart).toISOString()
      : getCurrentPlanPeriodStart(period).toISOString()

    const cutoff = new Date(
      Date.now() - RUNNING_LETTER_MAX_AGE_SECONDS * 1000
    ).toISOString()

    // Two-query approach. One for completed letters (any row with
    // output, passed OR quality-failed). One for currently in-flight
    // running rows newer than the orphan cutoff.
    const [completedResult, runningResult] = await Promise.all([
      supabaseAdmin
        .from("generated_letters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", periodStart)
        .not("final_cover_letter", "is", null),
      supabaseAdmin
        .from("generated_letters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("generation_status", "running")
        .gte("created_at", periodStart)
        .gte("created_at", cutoff)
        .is("final_cover_letter", null),
    ])

    if (completedResult.error) {
      return {
        count: 0,
        setupError: dataErrorMessage(completedResult.error, "generated_letters"),
      }
    }
    if (runningResult.error) {
      return {
        count: 0,
        setupError: dataErrorMessage(runningResult.error, "generated_letters"),
      }
    }

    return {
      count: (completedResult.count || 0) + (runningResult.count || 0),
    }
  } catch (error) {
    return {
      count: 0,
      setupError: dataErrorMessage(error, "generated_letters"),
    }
  }
}

/**
 * @deprecated Use getCurrentPeriodLetterCount. Kept as an alias so any
 * older call site keeps building; both paths now route through the
 * letter-based counter.
 */
export async function getCurrentPeriodBriefCount(userId: string, plan: PlanId) {
  return getCurrentPeriodLetterCount(userId, plan)
}

export async function getUserSettings(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .select("default_tone,email_updates,product_updates")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      return {
        settings: defaultSettings,
        setupError: dataErrorMessage(error, "user_settings"),
      }
    }

    return { settings: { ...defaultSettings, ...(data || {}) } as UserSettings }
  } catch (error) {
    return {
      settings: defaultSettings,
      setupError: dataErrorMessage(error, "user_settings"),
    }
  }
}
