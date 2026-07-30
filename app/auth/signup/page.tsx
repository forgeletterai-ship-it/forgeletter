import SignupClient from "./SignupClient"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  // Mirror the login page: social sign-in is only offered when the
  // provider is actually configured.
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
  const facebookEnabled = Boolean(
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
  )

  return (
    <SignupClient
      googleEnabled={googleEnabled}
      facebookEnabled={facebookEnabled}
    />
  )
}
