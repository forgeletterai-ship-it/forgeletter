const separatorItems = [
  "12-agent AI pipeline",
  "ATS keyword matching",
  "Photo-ready templates",
  "95+ quality guarantee",
  "Verified experience",
  "Interview-ready letters",
]

export function AnimatedSeparator() {
  return (
    <div className="premium-separator" aria-label="ForgeLetter product highlights">
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
