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

Webhooks can be lost (network, retry exhaustion, regional outage). We
do not run a cron-based reconciler — webhook is the only source of
state sync. If you observe a user whose Stripe and DB state have
drifted (rare), the manual fix is to fire the relevant
`customer.subscription.updated` event from the Stripe dashboard
(Webhooks → endpoint → recent events → resend).

### Recovery snapshot purge

`data_recovery_snapshots` rows older than 30 days should be purged
periodically. Two options:

1. Manual: connect to Supabase SQL editor monthly and run
   `select purge_expired_data_recovery_snapshots();`.
2. Supabase pg_cron: schedule the same function nightly via the
   Database → Cron page in Supabase Studio.

Without a purge job the table grows by ~1 row per deletion, which
is fine for the current customer count.

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
