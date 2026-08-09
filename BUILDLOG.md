# BUILDLOG — Swap Test (MASTER_BUILD_SWAP_TEST.md)

One entry per phase: built, deviations, test numbers. Resume here if
interrupted.

## Phase 0 — Recon and blocking fixes

**Verified:**
- Next.js 16.2.12 App Router + TypeScript strict, on Vercel. Route
  handlers take Promise-based `params`; `ImageResponse` from `next/og`.
- `@anthropic-ai/sdk` ^0.98.0 present. `vitest` ^4.1.7 present.
- Supabase reachable via `lib/supabase.ts` (service-role only, RLS
  enabled with no policies — matches the doc's security model).
- `cover_letter_examples` table in use (`lib/agents/agents/example-retrieval.ts`).
- `scripts/gold-letters-source.json` present (101 KB, ~50 records).
- `generated_letters` table exists (Phase 7.1 FK target).
- Resend in use via plain fetch (`app/api/contact/route.ts` pattern).
- Paying-customer check: `getBasePlan(user.plan) !== "free"` (lib/plans.ts).

**Canonical bug (Phase 0.2):** already fixed in an earlier work wave —
`app/layout.tsx` sets `metadataBase: new URL(getSiteUrl())` which
resolves to `https://forgeletter.com` in production. The
vercel.app→forgeletter.com permanent redirect is configured at the
Vercel project level (domain settings), not in-repo; post-deploy curl
verification is on the Phase 8 checklist.

**Deviations:**
- No `vercel.json` existed; created in Phase 4 when the crons land.
- `.env.example` did not exist; created with full scaffolding.
- Existing site rate-limiter is DB-backed (`lib/rate-limit.ts`, auth
  surface). The swap stack uses its own Upstash-backed limiter per the
  doc; DEV ONLY in-memory fallback until credentials arrive.

**Model/pricing note (Phase 0.4):** runtime scan model pinned
`claude-haiku-4-5-20251001` per the builder note. Pricing assumptions
($1/$5 per MTok, cache reads 0.1×, writes 1.25× 5-min / 2× 1-hour,
`cache_control:{type:'ephemeral',ttl:'1h'}`) taken from the build doc;
they could not be re-verified from this offline environment — flagged
for a human spot-check against the pricing page before launch.

**STOP AND ASK (open):** credentials for Upstash Redis REST,
Cloudflare Turnstile, plus `CRON_SECRET` and `FINGERPRINT_SALT`
values. Resend already configured. Until provided, the code paths use
DEV ONLY fallbacks that assert `NODE_ENV !== "production"`.

## Phase 1 — Core deterministic library

_(pending)_
