import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const user = session.user as {
    name?: string | null
    email?: string | null
    plan?: string
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f4f2f7 0%, #f7f3ef 100%)",
        padding: "32px 16px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <div
          style={{
            background: "#ffffffcc",
            backdropFilter: "blur(8px)",
            border: "1px solid #e5e7ef",
            borderRadius: 24,
            padding: "28px 24px",
            boxShadow: "0 14px 38px rgba(17, 22, 51, 0.07)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                display: "inline-block",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "#111633",
                }}
              >
                Letter<span style={{ color: "#f0a500" }}>Forge</span>
              </span>
            </Link>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.1,
                color: "#111633",
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#65748b",
                fontSize: 15,
              }}
            >
              Welcome back{user.name ? `, ${user.name}` : ""}.
            </p>
          </div>

          <form
            action={async () => {
              "use server"
              const { signOut } = await import("@/auth")
              await signOut({ redirectTo: "/auth/login" })
            }}
          >
            <button
              type="submit"
              style={{
                minHeight: 46,
                padding: "0 18px",
                borderRadius: 14,
                border: "1px solid #d9d9e8",
                background: "#fff",
                color: "#111633",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </form>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7ef",
              borderRadius: 20,
              padding: 22,
              boxShadow: "0 10px 28px rgba(17, 22, 51, 0.05)",
            }}
          >
            <div style={{ fontSize: 13, color: "#65748b", marginBottom: 8 }}>
              Account email
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111633", wordBreak: "break-word" }}>
              {user.email || "No email"}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7ef",
              borderRadius: 20,
              padding: 22,
              boxShadow: "0 10px 28px rgba(17, 22, 51, 0.05)",
            }}
          >
            <div style={{ fontSize: 13, color: "#65748b", marginBottom: 8 }}>
              Current plan
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111633" }}>
              {user.plan || "free"}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7ef",
              borderRadius: 20,
              padding: 22,
              boxShadow: "0 10px 28px rgba(17, 22, 51, 0.05)",
            }}
          >
            <div style={{ fontSize: 13, color: "#65748b", marginBottom: 8 }}>
              Status
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111633" }}>
              Logged in
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7ef",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 10px 28px rgba(17, 22, 51, 0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: 20,
              color: "#111633",
            }}
          >
            Next steps
          </h2>

          <p
            style={{
              margin: 0,
              color: "#65748b",
              lineHeight: 1.8,
              fontSize: 15,
            }}
          >
            Your dashboard is live. Next we can connect signup/login fully to your navbar,
            test email registration, and then add Google and Facebook credentials so the
            social buttons work too.
          </p>
        </div>
      </div>
    </main>
  )
}