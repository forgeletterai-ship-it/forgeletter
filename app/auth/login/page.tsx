import LoginClient from "./LoginClient"

export const dynamic = "force-dynamic"

export default function LoginPage() {
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
    />
  )
}