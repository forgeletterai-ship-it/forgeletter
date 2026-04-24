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
          Something went wrong during sign in. Please try again, or use email
          login if a social provider is not configured yet.
        </p>
        <Link className="button" href="/auth/login">
          Back to login
        </Link>
      </div>
    </main>
  )
}
