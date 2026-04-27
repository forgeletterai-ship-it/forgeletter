import Link from "next/link"

type BrandProps = {
  href?: string
  dark?: boolean
}

export function Brand({ href = "/", dark = false }: BrandProps) {
  return (
    <Link className="brand" href={href} style={dark ? { color: "#ffffff" } : undefined}>
      <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="url(#letterforgeLogoGradient)" />
        <path
          d="M10 28 Q13.5 13 20 11 Q26.5 9 29.5 14.5 Q25.5 16.5 22 22.5 L27.5 20 Q23 26.5 20.5 28.5 Z"
          fill="white"
          opacity=".95"
        />
        <path
          d="M13 30 L10.5 33.5 Q14.5 31.5 18 29"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
        <defs>
          <linearGradient
            id="letterforgeLogoGradient"
            x1="0"
            x2="40"
            y1="0"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f0c040" />
            <stop offset="100%" stopColor="#e07800" />
          </linearGradient>
        </defs>
      </svg>
      <span className="brand__text">
        Forge<span className="brand__accent">Letter</span>
      </span>
    </Link>
  )
}
