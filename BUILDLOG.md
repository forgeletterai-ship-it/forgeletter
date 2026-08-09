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

**Built:** `lib/swap/` — types, segment (Intl.Segmenter + abbreviation
merge), score (word-weighted Anchor / claim-counted Proof, RUBRIC 1.0.0,
bands 12/35/66, quadrants, sentence-class resolution), redact (exact
"Nothing was removed." string), signals/{echo,affect,rhythm}, profile
(FILLER split gated on calibrated thresholds — Rule 7), idf (corpus
mode ≥200 docs / stoplist bootstrap + employer inference), fixes
(deterministic, max 3, fixed priority), simhash (64-bit, unigram
features, ≥0.92 / 10-min window), fingerprint (sha256 of salt+ip+
coarse UA+platform+tz), ladder (lifetime 1+2, paying bypass, per-IP
25/day), ratelimit (Upstash REST + DEV ONLY memory fallback with prod
assert, sliding windows, 5,000/day circuit breaker), logscrub (Rule 2:
lengths + hashes only). Plus `lib/swap/demo-data.ts` (Appendix A
verbatim) and `config/boilerplate-stoplist.json`.

**Test numbers:** 42 swap tests green (78 total suite). Mandatory
Appendix A regression holds: ChatGPT letter → 0 / 25 / FILLER,
"Nothing was removed."; ForgeLetter letter → anchor 24 (±2 band) /
100 / TARGETED, opener redacted.

**Deviations:**
- `config/boilerplate-stoplist.json` pulled forward from Phase 3
  (idf + tests need it); ~250 phrases + genericProperNouns (geo,
  months, job-title words, sentence starters). Header-commented
  HAND-CURATED BOOTSTRAP. Phase 3 human gate reviews it.
- Employer inference added to stoplist mode: a capitalized
  non-generic token mentioned ≥2× is treated as the employer, so
  letters that skip the optional company field still score
  "names the company three times — none survive" correctly. A
  single-mention employer with an otherwise generic phrase can
  slip through until the corpus switchover — accepted bootstrap
  limitation, retired automatically at 200 docs/family.
- Simhash features are word unigrams (bigrams flipped too many bits
  on one-word edits to hold the ≥0.92 duplicate window on
  letter-length text).
- Repair templates (`lib/swap/templates.ts`) written now rather than
  Phase 3: F01/F03/F08 verbatim from Appendix B, F02/F04–F07 +
  ENGAGE/TRADE in the same voice; gold quotes only from the verified
  Appendix A letters pending Phase 3 extraction.

## Phase 2 — Data layer, ladder, abuse stack

**Built:**
- `docs/swap-test-schema.sql` — the doc's six tables verbatim +
  indexes, RLS enabled with no policies + anon/authenticated REVOKE
  (project posture), `purge_swap_vocab()` (cnt<10 + closed-vocab
  shape) and `purge_expired_swap_shares()` SECURITY DEFINER functions
  with pinned search_path. **STOP AND ASK: needs running in the
  Supabase SQL editor** (established manual-migration pattern).
- `app/api/outcome/[token]/route.ts` — one-tap outcome writes
  (interview/none/noapply), single-use per stat, unsubscribe revokes
  consent, queue row deleted on first touch.
- `app/api/cron/outcomes/route.ts` — daily 30-day email via Resend
  (subject + copy from templates.ts, three one-tap links +
  unsubscribe); deletes the plaintext address on send.
- `app/api/cron/cleanup/route.ts`, `app/api/cron/vocab-purge/route.ts`
  — RPC wrappers, CRON_SECRET bearer check (DEV ONLY bypass outside
  production).
- `lib/swap/disposable-domains.ts` (~90 domains) wired into the
  signup route; signup also accepts `outcomeOptin`/`researchOptin`
  (both default off) and writes `swap_consents` rows.

**Deviations:**
- Added `swap_outcome_queue` DDL — the doc describes the queue
  ("plaintext email only until send") but its SQL block omits it.
- `vocab_counts` doubles as the jd_corpus TF store using a reserved
  `__docs__` gram per role_family for corpus size (the doc's diagram
  names jd_corpus but its DDL defines only vocab_counts).
- Closed-vocabulary check implemented as a shape rule (lowercase
  ascii words) rather than a shipped 50k wordlist; k-anonymity
  (cnt<10) fully enforced. Wordlist upgrade noted in
  TODO-POSTLAUNCH.md at Phase 8.
- Keep-warm cron is Phase 4 (needs the agent); vercel.json crons
  registered there.

**Test numbers:** tsc clean; suite still 78 green (data layer has no
unit-testable pure logic beyond Phase 1's ladder/ratelimit tests).

## Phase 3 — Knowledge distillation

_(pending)_
