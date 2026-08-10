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

**Built:**
- `config/catalogue.v0.1.json` — T01–T12 + F01–F08 from the doc's
  seed set: id, name, one-line definition, explicit trigger phrasing
  (the eval-iteration surface), anonymised exemplar, failure→repair
  mappings exactly per Phase 3.2. Exemplars only from Appendix A
  verified letters + bracket-anonymised gold snippets.
- `scripts/extract-techniques.ts` — Batch API extraction (Sonnet
  names the move per sentence; submit + --poll modes) →
  `data/technique-extraction.json`. NOT yet run (≈$0.20 + async
  batch); the seed catalogue ships regardless, extraction refines
  trigger phrasing before the human gate.
- Anonymisation CI ⚙ — `tests/swap-anonymisation.test.ts`: every
  gold quote in templates + catalogue checked for unresolved
  [placeholders] and for proper nouns that survive un-bracketed in
  gold bodies (denylist built from the source records at test time).
  Green (3 tests). Runs with the suite in CI.
- Repair templates were completed in Phase 1 (templates.ts).

**HUMAN GATE — STOP AND ASK (open):** catalogue v0.1 needs ~1–2h of
human review before public launch. Build continues on v0.1 as the
doc allows.

## Phase 4 — Agent, route, keep-warm

**Built:**
- `lib/swap/agent-prefix.ts` — prefix assembled from the catalogue
  (role → techniques → failures → 3 contrastive pairs → TASK block
  verbatim from the doc). ~1.5k tokens vs the doc's ~7k sketch —
  leaner is cheaper with no gate impact; Phase 5 iteration may grow
  the triggers. Rule 8 grep enforced in tests.
- `lib/swap/agent.ts` — Haiku 4.5 pinned (`claude-haiku-4-5-20251001`),
  `max_tokens 1200`, `temperature 0`, `cache_control ephemeral 1h` on
  the prefix; strict short-key parser (unknown codes dropped+logged,
  malformed → one retry → typed 502); cache token usage logged.
- `app/api/swap-test/route.ts` — full §3.1 pipeline: validate
  300–8,000 → sliding window → ladder (Wall payload on acct_limit
  with real trajectory) → Turnstile ≥scan 2 → circuit breaker (hard
  Turnstile for anon over budget + alert log) → duplicate window →
  segment → agent → distinctiveness (corpus/stoplist w/ live
  vocab_counts) → score/signals/profile/redact/fixes →
  swap_stats numbers-only row → outcome queue (consented) → JD TF
  upsert → ladder burn LAST → ScanResult. scan-1 shows 1 fix.
- `app/api/cron/warm/route.ts` + `vercel.json` (all four crons
  registered: warm hourly, outcomes daily, cleanup daily,
  vocab-purge weekly).
- Guardrail tests ⚙ (`tests/swap-agent.test.ts`, 6 green): prefix
  ≤8,500 tokens, max_tokens ≤1,500, model pin, Rule 8 grep, verbatim
  task rules, all 20 codes present.

**Deviation (documented reasoning):** the resubmit window stores
hash+TTL only in KV — never text, per the doc's own simhash
constraint — so a duplicate re-runs the (cache-cheap) classification
instead of replaying a stored result. The ladder is not burned and
no stats row is written; the user still gets their result. This
reconciles "returns the cached result without burning a scan" with
"Hash + TTL only; never text" in favour of the privacy rule.

**Test numbers:** 6 agent guardrail tests green; tsc clean.

## Phase 5 — Gates: eval, injection, reliability, calibration, benchmark

**Built (harnesses implemented; execution pending — see below):**
- `data/set-i.json` — 10 authored injection letters (override, fake
  JSON, prompt-leak, system impersonation, encoded, hidden-comment…).
- `scripts/swap-eval-lib.ts` — shared: route-identical scan pipeline
  (minus HTTP/persistence), median/percentile/MAD/Cohen's κ,
  bounded-concurrency mapper.
- `scripts/gen-set-b.ts` — 50 AI-generic letters (fictional ads ×
  numberless 3-line profiles → Sonnet, Batch API).
- `scripts/gen-set-f.ts` — 50 single-failure degradations of gold,
  round-robin F01–F08, planted code = ground truth (Batch API).
- `scripts/eval-agent.ts` — all doc gates: F-recall ≥0.85, A
  false-failure ≤0.10/letter, technique precision ≥0.70
  (lexical-proxy until extraction runs — noted in the report),
  Set-I 10/10 schema-valid + zero leakage, Set-K control when the
  human-gated export lands. Writes reports/eval-results.json,
  exits non-zero on failure.
- `scripts/reliability.ts` — A+B+F twice; MADs, quadrant agreement,
  per-binary κ → config/reliability.json (FAQ renders the number).
- `scripts/calibrate.ts` — echoHigh=P75(B echo), affectHigh=P75(B
  affect), cvLow=P25(A cv), IQR-overlap disables a signal →
  config/swap-thresholds.json {provisional-1}. `recalibrate.ts`
  re-derives at ≥500 real FILLER scans and bumps the version.
- `scripts/benchmark.ts` — median Anchor/Proof over the ~100-letter
  export → config/benchmark.json; Wall falls back to the verified
  single example until then.

**NOT YET RUN — needs sign-off:** executing the gates costs ~$15 of
API (gen sets via Batch, ~460 scans across eval+reliability+
calibration) and two STOP-AND-ASK exports (Set K: 10 pipeline
letters, one with a planted weakness; benchmark: ~100 generated
letters). Rule 11 holds: no public link ships until these pass —
everything stays behind SWAP_TEST_ENABLED.

## Phase 6 — UI

**Built:** `components/swap/` (ResultsFlow, RedactionView, Scores,
Quadrant, MarkedLetter, ProfileBlock, Fixes, Wall, HomepageDemo,
AccountGate, ShareButton), `app/swap-test/page.tsx` (+swap.css),
`app/api/og/swap/route.tsx`, `app/api/swap-share/route.ts`,
`app/api/swap-consent/route.ts`. Fixed results order 1–9; Appendix
B/C/D verbatim; class colours + underline styles (AA, survives
colour-blindness); count-up/lift-out motion with reduced-motion final
states; keyboard-reachable tooltips; JSON-LD WebApplication; homepage
demo at section 2 with the doc's reorder (examples→4, why-choose
down) — both flag-gated behind SWAP_TEST_ENABLED (Rule 11). Analytics
events per §6.1 push to window.dataLayer (no analytics backend exists
on the site yet — noted). Rule 6 + rhythm greps are CI tests
(`tests/swap-ui-gates.test.ts`) with two verbatim-mandated
exemptions: the Appendix A demo title and the Appendix C Yale
sentence. Fonts: site self-hosted stack + system mono (the doc's
Google-font trio conflicts with the site's no-external-fonts policy —
mapped, per §3.3's "map to existing tokens" instruction).
Deviation: swap-share + swap-consent routes added beyond the file map
(ShareButton→OG needs a server write; results-order item 8 needs a
consent write).

**Test numbers:** 90 tests green (17 files); tsc + prod build clean.

## Phase 7 — Learning loops

**Built:**
- 7.1 `letter_edits` DDL (UNIQUE(letter_id), RLS) + capture in the
  letter PATCH route (delivered vs final, upsert, non-fatal) +
  `scripts/edit-diff.ts` nightly report → reports/edit-insights.md.
  Report only (Rule 13); lib/agents/ untouched (Rule 14).
- 7.2 `scripts/prevalence-report.ts` → reports/prevalence.md
  (failure/technique histograms, opening/closing codes, profile mix,
  corpus progress). The monthly technique-outcome job needs benchmark
  exports + letter outcome fields — deferred to post-launch.
- 7.3 `scripts/anonymise.ts` (bracketed placeholders, gold-corpus
  discipline; exported for the route + CLI) wired into the scan
  route behind the research_copy consent; gold invite condition
  (TARGETED ∧ anchor 12–35 ∧ proof ≥80) returned as `goldInvite`;
  `gold_invite` consent kind accepted.

**STOP AND ASK (open):** privacy-policy additions need human/legal
sign-off before launch — research copy, outcome email,
fingerprint-for-fraud, JD term frequencies (GDPR mapping in Part V.2
is the source text).

## Phase 8 — Launch gates (checklist status)

- [ ] Phase 5 gates green + reliability number in FAQ — **harnesses
      ready, not yet run** (≈$15 API + Set K / benchmark exports)
- [x] Canonical: metadataBase → forgeletter.com (curl check on deploy)
- [x] Rule 1/2 audits: no letter persistence path outside the three
      exceptions; logscrub on the route (grep clean)
- [x] Rule 6/8 greps: CI tests green
- [x] Anonymisation CI green
- [ ] Catalogue human-approved (v0.1 awaiting review)
- [ ] Privacy text human-approved
- [x] KV + human-check: OWNER DECISION (2026-08-10) — no new
      third-party services. Counters run on the swap_kv table in
      Supabase (atomic swap_kv_incr RPC, purged by the cleanup
      cron); Turnstile is optional-when-unconfigured and the circuit
      breaker fails CLOSED for anonymous scans without it, keeping
      the worst-case day bounded (~$16). Upstash/Turnstile remain
      drop-in via env vars. Resend already configured. DEV-ONLY
      memory KV asserts NODE_ENV — unreachable in prod builds.
- [x] Crons registered in vercel.json (warm/outcomes/cleanup/vocab-purge)
- [x] Analytics events firing (dataLayer)
- [x] TODO-POSTLAUNCH.md complete
- [ ] Deploy behind flag; human runs 20 varied manual scans; flip
      SWAP_TEST_ENABLED

**Spend so far:** $0 API (all gate runs deferred). Build is
code-complete behind the flag.
