import Link from "next/link"

const plans = [
  {
    name: "Starter",
    price: "Free",
    state: "Current",
    points: ["3 draft slots", "Basic workspace", "Manual copy"],
  },
  {
    name: "Pro",
    price: "EUR 9 / month",
    state: "Stripe soon",
    points: ["More saved letters", "Export controls", "Priority roadmap"],
  },
  {
    name: "Premium",
    price: "EUR 19 / month",
    state: "Stripe soon",
    points: ["Unlimited workspace", "Profile variants", "Priority support"],
  },
]

export default function BillingPage() {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Billing</span>
          <h1>Plan and subscription shell.</h1>
          <p>
            Stripe checkout is intentionally not wired yet. These pages are
            ready for checkout and webhook integration later.
          </p>
        </div>
      </div>

      <div className="price-grid">
        {plans.map((plan, index) => (
          <article
            className={`price-card${index === 1 ? " highlight" : ""}`}
            key={plan.name}
          >
            <small>{plan.state}</small>
            <h2>{plan.name}</h2>
            <div className="price">{plan.price}</div>
            <ul className="check-list">
              {plan.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <Link
              className={index === 1 ? "button" : "button-secondary"}
              href={index === 0 ? "/dashboard" : "/billing/cancel"}
            >
              {index === 0 ? "Keep current" : "Preview flow"}
            </Link>
          </article>
        ))}
      </div>
    </>
  )
}
