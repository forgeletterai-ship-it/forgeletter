import LoginClient from "./LoginClient"

export const dynamic = "force-dynamic"

type LoginPageProps = {
  searchParams?: Promise<{
    provider?: string
    callbackUrl?: string
    error?: string
  }>
}

/** Map Auth.js error codes to copy a locked-out user can act on.
 *  Previously the page ignored ?error= entirely, so a user denied by
 *  OAuth (e.g. provisioning failure → AccessDenied) saw a pristine
 *  login form with no explanation. */
function describeAuthError(code?: string): string {
  if (!code) return ""
  switch (code) {
    case "AccessDenied":
      return "Sign-in was not completed. If you used Google or Facebook, please try again — if it keeps happening, contact support."
    case "OAuthCallbackError":
    case "OAuthSignInError":
    case "OAuthAccountNotLinked":
      return "We couldn't complete the social sign-in. Try again, or sign in with your email and password."
    case "CredentialsSignin":
      return "Invalid email or password."
    case "Configuration":
      return "Sign-in is temporarily unavailable. Please try again in a few minutes."
    default:
      return "Sign-in didn't complete. Please try again."
  }
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
      initialError={describeAuthError(params?.error)}
    />
  )
}
