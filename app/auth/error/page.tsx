import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f6f4fd",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "white",
          border: "1px solid #e8e6f0",
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
          boxShadow: "0 8px 40px rgba(26,26,46,.08)",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 }}>
          Authentication Error
        </h1>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          Something went wrong during sign in. Please try again.
        </p>
        <Link
          href="/auth/login"
          style={{
            display: "inline-block",
            padding: "12px 18px",
            borderRadius: 12,
            textDecoration: "none",
            background: "linear-gradient(135deg,#f0a500,#ff8c00)",
            color: "white",
            fontWeight: 700,
          }}
        >
          Back to Login
        </Link>
      </div>
    </main>
  )
}