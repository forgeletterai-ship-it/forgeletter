import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

export type PlanId = "free" | "pro" | "ultra"

export type AppUser = {
  id: string
  email: string
  name: string | null
  image?: string | null
  plan: PlanId
}

export type UserProfile = {
  professional_headline: string
  target_roles: string
  industries: string
  key_achievements: string
  strengths: string
}

export type ApplicationBrief = {
  id: string
  user_id: string
  role: string
  company: string
  tone: string
  job_description: string
  candidate_experience: string
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
}

export const defaultSettings: UserSettings = {
  default_tone: "Professional",
  email_updates: true,
  product_updates: true,
}

export function normalizePlan(plan: unknown): PlanId {
  return plan === "pro" || plan === "ultra" ? plan : "free"
}

export function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === "42P01" ||
    error.message?.includes("Could not find the table") ||
    error.message?.includes("schema cache")
  )
}

export function setupMessage(_tableName: string) {
  return "A workspace setup issue is preventing this data from loading. Please contact support."
}

export async function getCurrentAppUser(): Promise<{
  user: AppUser | null
  error?: string
}> {
  const session = await auth()
  const email = session?.user?.email

  if (!email) {
    return { user: null, error: "Authentication required" }
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,email,name,image,plan")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    return { user: null, error: error.message }
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
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select(
      "professional_headline,target_roles,industries,key_achievements,strengths"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return {
      profile: defaultProfile,
      setupError: isMissingTableError(error)
        ? setupMessage("user_profiles")
        : error.message,
    }
  }

  return { profile: { ...defaultProfile, ...(data || {}) } as UserProfile }
}

export async function getApplicationBriefs(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("application_briefs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    return {
      briefs: [] as ApplicationBrief[],
      setupError: isMissingTableError(error)
        ? setupMessage("application_briefs")
        : error.message,
    }
  }

  return { briefs: (data || []) as ApplicationBrief[] }
}

export async function getUserSettings(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_settings")
    .select("default_tone,email_updates,product_updates")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return {
      settings: defaultSettings,
      setupError: isMissingTableError(error)
        ? setupMessage("user_settings")
        : error.message,
    }
  }

  return { settings: { ...defaultSettings, ...(data || {}) } as UserSettings }
}
