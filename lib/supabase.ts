import { createClient, type SupabaseClient } from "@supabase/supabase-js"

class SupabaseConfigurationError extends Error {
  constructor(name: string) {
    super(`Missing required Supabase environment variable: ${name}`)
    this.name = "SupabaseConfigurationError"
  }
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
}

let browserClient: SupabaseClient | null = null
let adminClient: SupabaseClient | null = null

function requireEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new SupabaseConfigurationError(name)
  }

  return value
}

function createSupabaseClient(keyName: "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY") {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(keyName),
    clientOptions
  )
}

function proxyClient(getClient: () => SupabaseClient) {
  return new Proxy({} as SupabaseClient, {
    get(_target, property, receiver) {
      const client = getClient()
      const value = Reflect.get(client, property, receiver)
      return typeof value === "function" ? value.bind(client) : value
    },
  })
}

export function getSupabaseClient() {
  browserClient ||= createSupabaseClient("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return browserClient
}

export function getSupabaseAdminClient() {
  adminClient ||= createSupabaseClient("SUPABASE_SERVICE_ROLE_KEY")
  return adminClient
}

export function isSupabaseConfigError(error: unknown) {
  return (
    error instanceof SupabaseConfigurationError ||
    (error instanceof Error && error.name === "SupabaseConfigurationError")
  )
}

export function customerSafeSupabaseError(error: unknown) {
  if (isSupabaseConfigError(error)) {
    return "The workspace connection is not configured correctly. Please contact support."
  }

  return "We could not complete that workspace action. Please try again or contact support."
}

export const supabase = proxyClient(getSupabaseClient)
export const supabaseAdmin = proxyClient(getSupabaseAdminClient)
