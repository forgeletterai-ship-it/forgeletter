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

/**
 * SERVICE ROLE ONLY, SERVER SIDE ONLY.
 *
 * ForgeLetter does not use Supabase Auth — sessions come from
 * NextAuth — so there is no signed-in Supabase user whose identity
 * RLS could key off. Every query therefore runs with the service
 * role from server code that has already authorised the caller via
 * getCurrentAppUser().
 *
 * An anon client used to be exported here. It was never imported
 * anywhere, and it was a footgun: anything reaching for it would
 * have bypassed our own authorisation checks and depended on RLS
 * policies that deliberately do not exist. Removed.
 *
 * The public schema has RLS enabled with no policies (see
 * docs/supabase-rls-lockdown.sql), which closes the anon REST
 * surface entirely. If Supabase Auth is ever introduced, that file
 * documents what has to change.
 */
let adminClient: SupabaseClient | null = null

function requireEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new SupabaseConfigurationError(name)
  }

  return value
}

function createSupabaseClient(keyName: "SUPABASE_SERVICE_ROLE_KEY") {
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

export const supabaseAdmin = proxyClient(getSupabaseAdminClient)
