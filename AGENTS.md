<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Operational behaviours worth knowing

### Scheduled plan changes firing mid-generation

When a customer has a scheduled downgrade (via `subscription_schedule`)
and the schedule fires exactly while they are generating a letter:

- The pipeline that's already running keeps its current tier. It started
  with the higher plan's config (full agent set, higher quality
  threshold) and finishes at that tier — no mid-flight downgrade.
- The `customer.subscription.updated` webhook fires and updates the
  user's plan + period start. The letter quota gate (next attempt) will
  use the new lower plan.
- Net effect: the in-flight letter is delivered at the paid-for tier;
  the next letter the user starts will be at the new tier.

This is intentional and documented because customers occasionally email
"why did my Ultra-quality letter finish even though I downgraded?" —
answer: because they paid for the period it was generated in.

### Stripe webhook divergence recovery

Webhooks can be lost (network, retry exhaustion, regional outage).
`/api/cron/stripe-reconcile` runs every 6h via Vercel cron and:

1. Purges `data_recovery_snapshots` past their 30-day expiry.
2. Pulls users with plan != 'free' whose `current_period_start` is null
   or older than 6h, and for each: reads the canonical state from
   Stripe and patches our DB.

Webhook is still primary; the cron is a safety net.

### Card decline during upgrade

`/api/stripe/switch` uses `payment_behavior: "error_if_incomplete"`
on upgrades. If the card declines for the prorated charge, Stripe
rolls back the price change and we return 402 to the client. The
customer stays on the old plan — no "free upgrade window" while
Stripe dunning runs in the background.

### Mid-pipeline crash recovery

`/dashboard/letters` runs `finalizeStalledLetters` on every page load:
any letter with status `running` or `queued` older than 10 minutes
flips to `failed` with a clear reason. This complements the 7-min
orphan window on the quota gate so the DB stays clean.
