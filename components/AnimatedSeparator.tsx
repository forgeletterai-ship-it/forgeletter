const separatorItems = [
  "Premium workspace",
  "Secure drafting",
  "Career-ready letters",
  "Agency-ready workflow",
  "Saved profiles",
  "Application history",
  "Stripe-ready billing",
  "Supabase-ready accounts",
]

export function AnimatedSeparator() {
  return (
    <div className="premium-separator" aria-label="LetterForge product highlights">
      <div className="premium-separator__glow" aria-hidden="true" />
      <div className="premium-separator__track">
        {[...separatorItems, ...separatorItems].map((item, index) => (
          <span key={`${item}-${index}`}>
            {item}
            <i aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  )
}
