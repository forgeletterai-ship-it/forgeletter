import Link from "next/link"
import { Brand } from "@/components/Brand"

export default function AuthErrorPage() {
  return (
    <main className="auth-content" style={{ minHeight: "100vh" }}>
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Brand />
        </div>
        <h2>Authentication error</h2>
        <p>
          Login could not be completed. Please try again, or use email and
          password if the social sign-in window was interrupted.
        </p>
        <Link className="button" href="/auth/login">
          Back to login
        </Link>
      </div>
    </main>
  )
}
