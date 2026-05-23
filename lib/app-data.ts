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

export type UserProfile = {
  professional_headline: string
  target_roles: string
  industries: string
  key_achievements: string
  strengths: string
  experience_blocks: ExperienceBlock[]
  qualifications: string
  notes: string
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
        .map((a): ExperienceAchievement | null => {
          if (!a || typeof a !== "object") return null
          const ach = a as Record<string, unknown>
          const aid = typeof ach.id === "string" ? ach.id : ""
          if (!aid) return null
          return {
            id: aid,
            col0: String(ach.col0 ?? ""),
            col1: String(ach.col1 ?? ""),
            col2: String(ach.col2 ?? ""),
          }
        })
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
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email,name,image,plan")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      return { user: null, error: dataErrorMessage(error, "users") }
    }

    if (!data) {
      return { user: null, error: "Account record not found" }
    }

    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
        plan: normalizePlan(data.plan),
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
    "professional_headline,target_roles,industries,key_achievements,strengths,experience_blocks,qualifications,notes"
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

export async function getCurrentPeriodBriefCount(userId: string, plan: PlanId) {
  try {
    const period = getBillingPeriod(plan)
    const periodStart = getCurrentPlanPeriodStart(period).toISOString()
    const { count, error } = await supabaseAdmin
      .from("application_briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", periodStart)

    if (error) {
      return {
        count: 0,
        setupError: dataErrorMessage(error, "application_briefs"),
      }
    }

    return { count: count || 0 }
  } catch (error) {
    return {
      count: 0,
      setupError: dataErrorMessage(error, "application_briefs"),
    }
  }
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
