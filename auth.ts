import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { compare } from "bcryptjs"
import { supabaseAdmin } from "./lib/supabase"

type AppAuthUser = {
  id: string
  plan: string | null
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isDuplicateError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  )
}

async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,plan")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as AppAuthUser | null
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
    await supabaseAdmin
      .from("users")
      .update({
        name: name || normalizedEmail.split("@")[0],
        image,
        provider,
        provider_id: providerAccountId,
      })
      .eq("id", existing.id)

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

      try {
        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id,email,name,password,plan")
          .eq("email", email)
          .maybeSingle()

        if (error) return null

        if (!user?.password) return null

        const ok = await compare(credentials.password as string, user.password)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        }
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
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
        } catch {
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
        } catch {
          token.plan ||= "free"
        }
      }

      if (user) {
        token.id ||= user.id
        token.plan = (user as any).plan || "free"
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).plan = token.plan
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
})
