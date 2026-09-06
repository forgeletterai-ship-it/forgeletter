import Link from "next/link"

type BrandProps = {
  href?: string
  dark?: boolean
}

export function Brand({ href = "/", dark = false }: BrandProps) {
  return (
    <Link className="brand" href={href} style={dark ? { color: "#ffffff" } : undefined}>
      {/* The real brand mark (public/letterforge-mark.png, cropped
          from the master lockup) — 144px covers 36px @4x displays. */}
      <img
        className="brand__mark"
        src="/letterforge-mark.png"
        alt=""
        aria-hidden="true"
        width={144}
        height={144}
      />
      <span className="brand__text">
        Forge<span className="brand__accent">Letter</span>
      </span>
    </Link>
  )
}
