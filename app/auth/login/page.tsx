import LoginClient from "./LoginClient"

export const dynamic = "force-dynamic"

type LoginPageProps = {
  searchParams?: Promise<{
    provider?: string
    callbackUrl?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )

  const facebookEnabled = Boolean(
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
  )

  return (
    <LoginClient
      googleEnabled={googleEnabled}
      facebookEnabled={facebookEnabled}
      autoProvider={
        params?.provider === "google" || params?.provider === "facebook"
          ? params.provider
          : null
      }
      initialCallbackUrl={params?.callbackUrl}
    />
  )
}
