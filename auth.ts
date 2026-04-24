import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { compare } from "bcryptjs"
import { supabaseAdmin } from "./lib/supabase"

const providers: Provider[] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", credentials.email)
        .single()

      if (!user?.password) return null

      const ok = await compare(credentials.password as string, user.password)
      if (!ok) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
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
          scope: "public_profile",
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
        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", user.email!)
          .single()

        if (!existing) {
          await supabaseAdmin.from("users").insert({
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            provider_id: account.providerAccountId,
            plan: "free",
          })
        }
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
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