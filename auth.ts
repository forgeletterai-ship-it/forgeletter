import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { compare, hashSync } from "bcryptjs"
import { checkRateLimit, rateLimitKey } from "./lib/rate-limit"
import { supabaseAdmin } from "./lib/supabase"

// Canonical production origin — the custom domain, attached and
// serving on Vercel. OAuth callbacks and auth cookies anchor here.
const PRODUCTION_AUTH_URL = "https://forgeletter.com"

function enforceProductionAuthUrl() {
  if (process.env.NODE_ENV !== "production") return

  const authUrl = process.env.AUTH_URL?.trim()
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim()

  if (!authUrl || authUrl.includes("localhost")) {
    process.env.AUTH_URL = PRODUCTION_AUTH_URL
  }

  if (!nextAuthUrl || nextAuthUrl.includes("localhost")) {
    process.env.NEXTAUTH_URL = PRODUCTION_AUTH_URL
  }
}

enforceProductionAuthUrl()

type AppAuthUser = {
  id: string
  plan: string | null
  password?: string | null
  password_changed_at?: string | null
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// Precomputed-per-instance bcrypt hash used to equalize timing when
// the account doesn't exist or has no password. Lazy so cold-start
// doesn't pay the cost-12 hash unless a login actually needs it.
let dummyHash: string | null = null
function getDummyHash(): string {
  if (!dummyHash) {
    dummyHash = hashSync("forgeletter-timing-equalizer", 12)
  }
  return dummyHash
}

function isDuplicateError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  )
}

function logOAuthProvisioningError(stage: string, error: unknown) {
  const details =
    typeof error === "object" && error !== null
      ? {
          name: "name" in error ? (error as { name?: string }).name : undefined,
          code: "code" in error ? (error as { code?: string }).code : undefined,
          message:
            "message" in error
              ? (error as { message?: string }).message
              : String(error),
        }
      : { message: String(error) }

  console.error(`[auth] OAuth provisioning failed during ${stage}`, details)
}

async function findUserByEmail(email: string) {
  // Prefer the full column set (password for the OAuth-link security
  // check, password_changed_at for session revocation). Fall back to
  // the base set while the auth-hardening migration hasn't run.
  const full = await supabaseAdmin
    .from("users")
    .select("id,plan,password,password_changed_at")
    .eq("email", email)
    .maybeSingle()

  if (!full.error) return full.data as AppAuthUser | null

  const code = (full.error as { code?: string }).code
  if (code !== "42703" && code !== "PGRST204") {
    throw full.error
  }

  const base = await supabaseAdmin
    .from("users")
    .select("id,plan,password")
    .eq("email", email)
    .maybeSingle()

  if (base.error) {
    throw base.error
  }

  return base.data as AppAuthUser | null
}

async function ensureOAuthUser({
  email,
  name,
  image,
  provider,
  providerAccountId,
}: {
  email: string
  name?: string | null
  image?: string | null
  provider: string
  providerAccountId: string
}) {
  const normalizedEmail = normalizeEmail(email)
  const existing = await findUserByEmail(normalizedEmail)

  if (existing) {
    const patch: Record<string, unknown> = {
      name: name || normalizedEmail.split("@")[0],
      image,
      provider,
      provider_id: providerAccountId,
    }
    // SECURITY: OAuth proves ownership of the email (Google/Facebook
    // verify it). If this row carries a password, it may have been set
    // by an attacker who signed up with someone else's address before
    // the real owner arrived via OAuth — signup does no email
    // verification. Null the password on link so the only remaining
    // access paths are OAuth (the verified owner) and the email-bound
    // password reset. A legitimate dual-method user keeps OAuth access
    // and can restore a password via reset at any time.
    if (existing.password) {
      patch.password = null
      console.warn(
        `[auth] OAuth link to existing credentials account — password cleared for user ${existing.id}`
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(patch)
      .eq("id", existing.id)

    if (updateError) {
      throw updateError
    }

    return existing
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    image,
    provider,
    provider_id: providerAccountId,
    plan: "free",
  })

  if (insertError && !isDuplicateError(insertError)) {
    throw insertError
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const created = await findUserByEmail(normalizedEmail)

    if (created) {
      return created
    }

    await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)))
  }

  throw new Error("OAuth user could not be loaded after account creation.")
}

const providers: Provider[] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const email = String(credentials.email).trim().toLowerCase()

      // Rate limit: 10 attempts per email per 15 minutes. Keyed by
      // email (not IP) because credential stuffing rotates IPs but
      // targets specific accounts. Fails open if the table is absent.
      const limit = await checkRateLimit({
        key: rateLimitKey("login", email),
        max: 10,
        windowSeconds: 15 * 60,
      })
      if (!limit.allowed) return null

      try {
        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id,email,name,password,plan,password_changed_at")
          .eq("email", email)
          .maybeSingle()

        let row = user as
          | (typeof user & { password_changed_at?: string | null })
          | null
        if (error) {
          const code = (error as { code?: string }).code
          if (code !== "42703" && code !== "PGRST204") return null
          // password_changed_at column missing (migration pending) —
          // retry without it.
          const retry = await supabaseAdmin
            .from("users")
            .select("id,email,name,password,plan")
            .eq("email", email)
            .maybeSingle()
          if (retry.error) return null
          row = retry.data as typeof row
        }

        if (!row?.password) {
          // Timing-oracle defense: burn the same bcrypt cost whether
          // or not the account exists, so response time doesn't leak
          // account existence.
          await compare(credentials.password as string, getDummyHash())
          return null
        }

        const ok = await compare(credentials.password as string, row.password)
        if (!ok) return null

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          plan: row.plan,
          // Session-revocation anchor — carried into the JWT so a
          // later password reset invalidates this session.
          pwdChangedAt: row.password_changed_at ?? null,
        } as { id: string; email: string; name: string | null }
      } catch {
        return null
      }
    },
  }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Default checks (PKCE + state) are REQUIRED. A previous
      // `checks: ["none"]` workaround disabled both, opening login-CSRF
      // and code-injection attacks. If Google sign-in fails after this,
      // fix the Google Cloud console instead of weakening checks:
      // APIs & Services → Credentials → OAuth client → Authorized
      // redirect URIs must contain EXACTLY
      //   https://forgeletter.com/api/auth/callback/google
      //   https://forgeletter.vercel.app/api/auth/callback/google (transition)
      //   http://localhost:3000/api/auth/callback/google (for dev)
    })
  )
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "email,public_profile",
        },
      },
    })
  )
}

const SECURE_COOKIES = process.env.NODE_ENV === "production"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  useSecureCookies: SECURE_COOKIES,
  cookies: {
    sessionToken: {
      name: SECURE_COOKIES
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: SECURE_COOKIES,
      },
    },
    callbackUrl: {
      name: SECURE_COOKIES
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: SECURE_COOKIES,
      },
    },
    csrfToken: {
      name: SECURE_COOKIES
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: SECURE_COOKIES,
      },
    },
  },
  providers,
  logger: {
    error(error) {
      console.error("[auth] Auth.js error", error)
    },
    warn(code) {
      console.warn("[auth] Auth.js warning", code)
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        const email = (
          user.email || `${account.provider}_${account.providerAccountId}@no-email.local`
        )

        try {
          const appUser = await ensureOAuthUser({
            email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          })
          user.id = appUser.id
          user.email = normalizeEmail(email)
          ;(user as any).plan = appUser.plan || "free"
          ;(user as any).pwdChangedAt = appUser.password_changed_at ?? null
        } catch (error) {
          // Provisioning the users row failed (e.g. Supabase
          // unreachable). Deny the sign-in instead of issuing a 30-day
          // session with no backing row. A rowless session is the crack
          // that later surfaces as a misleading "Authentication required"
          // on every dashboard page: the JWT is valid, so the layout
          // lets the request through, but getCurrentAppUser() can't find
          // the account. Failing loud here keeps the invariant "a valid
          // session always has a users row" — the user simply retries.
          // Credentials sign-in is unaffected (its row already exists).
          logOAuthProvisioningError("signIn", error)
          return false
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        const email = String(
          user?.email ||
            token.email ||
            `${account.provider}_${account.providerAccountId}@no-email.local`
        )

        try {
          const appUser = await ensureOAuthUser({
            email,
            name: user?.name || token.name,
            image: user?.image || (token.picture as string | undefined),
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          })

          token.id = appUser.id
          token.plan = appUser.plan || "free"
          token.email = normalizeEmail(email)
          token.pwdca = appUser.password_changed_at ?? null
        } catch (error) {
          logOAuthProvisioningError("jwt", error)
          token.plan ||= "free"
        }
      }

      if (user) {
        token.id ||= user.id
        token.plan = (user as any).plan || "free"
        if ("pwdChangedAt" in (user as object)) {
          token.pwdca = (user as { pwdChangedAt?: string | null }).pwdChangedAt ?? null
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).plan = token.plan
        // Session-revocation anchor: compared against the users row on
        // every getCurrentAppUser call. `undefined` (pre-deploy JWTs)
        // means "no anchor" and skips the check until natural expiry.
        ;(session.user as any).pwdca = token.pwdca
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
})
