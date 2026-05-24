# Security & compliance checklist

This file is the operational counterpart to the legal documents at
`/privacy`, `/terms`, `/cookies`, `/acceptable-use`, `/imprint`. The
policies promise things; this checklist is how we verify those
promises actually hold in production.

Run through the dashboard items every quarter. Code-level controls
are enforced automatically by CI (`.github/workflows/security.yml`)
and Dependabot.

---

## 1. NextAuth + cookies

| Check | Where | Required value |
|---|---|---|
| `AUTH_SECRET` set | Vercel → Project → Settings → Environment Variables → Production scope only | 32+ random bytes (`openssl rand -base64 32`); rotate annually |
| `AUTH_URL` set | Vercel → Production env | `https://forgeletter.app` (or current production domain) |
| `NEXTAUTH_URL` set | Vercel → Production env | Same as `AUTH_URL` |
| OAuth callback whitelist — Google | https://console.cloud.google.com → OAuth client → Authorized redirect URIs | Production only: `https://forgeletter.app/api/auth/callback/google`. No `localhost`. |
| OAuth callback whitelist — Facebook | https://developers.facebook.com → App → Facebook Login → Valid OAuth Redirect URIs | Production only: `https://forgeletter.app/api/auth/callback/facebook`. No `localhost`. |
| Session cookie name in browser matches policy | DevTools → Application → Cookies on production | `__Secure-next-auth.session-token`, `__Host-next-auth.csrf-token`, `__Secure-next-auth.callback-url` |

Code-side: cookie names + secure/SameSite are pinned in `auth.ts`.

## 2. Supabase

| Check | Where | Required value |
|---|---|---|
| Region | Supabase → Project → Settings → General → Region | `eu-central-1` (Frankfurt) |
| Row-Level Security enabled on every table | Supabase → Database → Tables, every row should show "RLS enabled" | Run `docs/supabase-rls.sql` once in the SQL editor to enable + apply policies |
| Daily backups | Supabase → Database → Backups | Enabled (default on Pro plan) |
| Point-in-Time Recovery | Supabase → Database → Backups → PITR | Enabled (Pro plan; ~+$10/mo) |
| Service-role key only used server-side | Code search `SUPABASE_SERVICE_ROLE_KEY` | Only in `lib/supabase.ts` → `supabaseAdmin`; never imported by a client component |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | Vercel → Production env | The anon (public) key. Safe to ship to browser. |
| `SUPABASE_SERVICE_ROLE_KEY` set | Vercel → Production env (NOT preview if you want strict separation) | The service role key. Never exposed to browser. |

## 3. Stripe

| Check | Where | Required value |
|---|---|---|
| Webhook signature verification | `app/api/stripe/webhook/route.ts` | Already enforced — request fails with 400 if `stripe-signature` missing or wrong |
| `STRIPE_SECRET_KEY` set | Vercel → Production env | Live secret key (`sk_live_…`). Rotate at least annually. |
| `STRIPE_WEBHOOK_SECRET` set | Vercel → Production env | Per-endpoint signing secret (`whsec_…`) from Stripe Dashboard → Developers → Webhooks |
| Separate test vs live webhook secrets | Stripe Dashboard | Different `whsec_` for test mode vs live mode |
| Webhook endpoint URL | Stripe Dashboard → Developers → Webhooks | `https://forgeletter.app/api/stripe/webhook` |
| Webhook event types | Stripe Dashboard → Developers → Webhooks → Events on listening | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| No payment-instrument PII in logs | grep over codebase | We only log Stripe IDs (sub, customer) — never card data |

## 4. Vercel

| Check | Where | Required value |
|---|---|---|
| `X-Frame-Options: SAMEORIGIN` | `curl -I https://forgeletter.app` | Returned on every page |
| `Strict-Transport-Security` | `curl -I` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | `curl -I` | Set by `next.config.ts` |
| `Permissions-Policy` | `curl -I` | Set by `next.config.ts` |
| `Referrer-Policy: strict-origin-when-cross-origin` | `curl -I` | Set by `next.config.ts` |
| `X-Robots-Tag: noindex` on preview deployments | `curl -I https://*-vercel.app` | Set by `next.config.ts` based on `VERCEL_ENV` |
| `X-Powered-By` not leaking | `curl -I` | Removed via `poweredByHeader: false` |
| Preview deployments require auth (recommended) | Vercel → Project → Settings → Deployment Protection | "Vercel Authentication" or "Password Protection" enabled for Preview |
| Environment variables scoped | Vercel → Settings → Environment Variables | Each var assigned to Production / Preview / Development as appropriate |

## 5. Anthropic

| Check | Where | Required value |
|---|---|---|
| Zero data retention enabled | console.anthropic.com → Settings → Privacy | "Zero data retention" toggle ON (enterprise plans). Without it, Anthropic stores prompts for 30 days. |
| `ANTHROPIC_API_KEY` set | Vercel → Production env | Server-only; not prefixed with `NEXT_PUBLIC_` |
| API key never committed | `git log -p` grep for `sk-ant-` | No matches |
| `anthropic-no-retention: true` header | `lib/agents/client.ts` | Set on the default client (no-op on standard plans, honoured on enterprise) |
| Rate-limit + quota alerts | console.anthropic.com → Usage → Alerts | Email alert at 80% of monthly quota |

## 6. GitHub & repo hygiene

| Check | Where | Required value |
|---|---|---|
| Branch protection on `main` | GitHub → Settings → Branches → Add rule for `main` | Require PR, require status checks (`Security audit`), no force-push, no deletion |
| Dependabot alerts | GitHub → Settings → Security → Code security and analysis | Enabled |
| Dependabot security updates | Same screen | Enabled (auto-PRs for CVEs) |
| Dependabot version updates | `.github/dependabot.yml` | Configured weekly (npm + actions) |
| Secret scanning | GitHub → Settings → Security | Enabled (public repos free; private requires Advanced Security) |
| Push protection for secrets | GitHub → Settings → Security | Enabled |
| 2FA for org members | GitHub → Organization → Settings → Authentication security | "Require two-factor authentication" enforced |
| CI security workflow | `.github/workflows/security.yml` | Runs `npm audit` and Gitleaks on every PR + weekly cron |
| No secrets in git history | Gitleaks job in CI | Job stays green |

## 7. Incident response (one-page playbook)

When something goes wrong:

1. **Acknowledge in writing** to whoever reported it within 24 hours.
2. **Triage**: is it a confirmed personal-data breach, or a near-miss?
3. If confirmed breach: **start the 72-hour GDPR clock**. Notify the Bulgarian CPDP (https://www.cpdp.bg, kzld@cpdp.bg) via written form.
4. **Contain**: rotate the affected secret (Stripe key / Supabase service role / Anthropic key / AUTH_SECRET), revoke OAuth tokens if needed.
5. **Notify affected users** if the breach is likely to result in a high risk to their rights (Art. 34 GDPR). Email from `privacy@forgeletter.app`.
6. **Document**: keep an immutable record with timeline, decisions, communications, root cause.
7. **Postmortem**: blameless review within two weeks, propose preventative controls, link them to this checklist.

## 8. Quarterly review

Every quarter, walk this file top to bottom and tick each line. Re-run
`npm audit`, rotate the OAuth client secrets if more than a year old,
review who has owner-level access to Vercel, Supabase, Stripe, GitHub,
Anthropic, and remove anyone who no longer needs it.
