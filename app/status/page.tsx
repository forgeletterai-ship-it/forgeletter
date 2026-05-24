import type { Metadata } from "next"
import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { supabaseAdmin } from "@/lib/supabase"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "System status — ForgeLetter",
  description:
    "Real-time health of ForgeLetter's database, payments, and webhook pipeline.",
}

type CheckStatus = "operational" | "degraded" | "down"

type Check = {
  id: string
  label: string
  description: string
  status: CheckStatus
  detail: string
  durationMs: number
}

type WebhookEvent = {
  event_id: string
  event_type: string
  processed_at: string
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    ),
  ])
}

async function checkDatabase(): Promise<Check> {
  const started = Date.now()
  try {
    const { error } = await withTimeout<{ error: { message: string } | null }>(
      Promise.resolve(
        supabaseAdmin
          .from("users")
          .select("id", { count: "exact", head: true })
          .limit(1)
      ),
      4000,
      "Database"
    )
    const durationMs = Date.now() - started
    if (error) {
      return {
        id: "database",
        label: "Database",
        description: "Supabase Postgres",
        status: "down",
        detail: `Query error: ${error.message}`,
        durationMs,
      }
    }
    return {
      id: "database",
      label: "Database",
      description: "Supabase Postgres",
      status: durationMs > 1500 ? "degraded" : "operational",
      detail:
        durationMs > 1500
          ? `Slow response (${durationMs}ms)`
          : `Healthy (${durationMs}ms)`,
      durationMs,
    }
  } catch (err) {
    return {
      id: "database",
      label: "Database",
      description: "Supabase Postgres",
      status: "down",
      detail: err instanceof Error ? err.message : "Unreachable",
      durationMs: Date.now() - started,
    }
  }
}

async function checkStripe(): Promise<Check> {
  const started = Date.now()
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        id: "stripe",
        label: "Payments",
        description: "Stripe billing & checkout",
        status: "degraded",
        detail: "Stripe not configured in this environment",
        durationMs: 0,
      }
    }
    const stripe = getStripe()
    await withTimeout(stripe.balance.retrieve(), 4500, "Stripe")
    const durationMs = Date.now() - started
    return {
      id: "stripe",
      label: "Payments",
      description: "Stripe billing & checkout",
      status: durationMs > 2000 ? "degraded" : "operational",
      detail:
        durationMs > 2000
          ? `Slow response (${durationMs}ms)`
          : `Healthy (${durationMs}ms)`,
      durationMs,
    }
  } catch (err) {
    return {
      id: "stripe",
      label: "Payments",
      description: "Stripe billing & checkout",
      status: "down",
      detail: err instanceof Error ? err.message : "Unreachable",
      durationMs: Date.now() - started,
    }
  }
}

async function checkWebhooks(): Promise<{
  check: Check
  recent: WebhookEvent[]
}> {
  const started = Date.now()
  try {
    const { data, error } = await withTimeout<{
      data: WebhookEvent[] | null
      error: { message: string } | null
    }>(
      Promise.resolve(
        supabaseAdmin
          .from("stripe_processed_events")
          .select("event_id, event_type, processed_at")
          .order("processed_at", { ascending: false })
          .limit(10)
      ),
      4000,
      "Webhooks"
    )
    const durationMs = Date.now() - started

    if (error) {
      return {
        check: {
          id: "webhooks",
          label: "Webhook pipeline",
          description: "Stripe → ForgeLetter event delivery",
          status: "degraded",
          detail: `Could not read event log: ${error.message}`,
          durationMs,
        },
        recent: [],
      }
    }

    const events = (data || []) as WebhookEvent[]
    if (events.length === 0) {
      return {
        check: {
          id: "webhooks",
          label: "Webhook pipeline",
          description: "Stripe → ForgeLetter event delivery",
          status: "operational",
          detail: "No events recorded yet",
          durationMs,
        },
        recent: [],
      }
    }
    const latest = new Date(events[0].processed_at).getTime()
    const ageHours = (Date.now() - latest) / 3_600_000
    let status: CheckStatus = "operational"
    let detail = `Last event ${formatRelative(latest)}`
    if (ageHours > 48) {
      status = "degraded"
      detail = `Last event ${formatRelative(latest)} — no recent traffic`
    }

    return {
      check: {
        id: "webhooks",
        label: "Webhook pipeline",
        description: "Stripe → ForgeLetter event delivery",
        status,
        detail,
        durationMs,
      },
      recent: events,
    }
  } catch (err) {
    return {
      check: {
        id: "webhooks",
        label: "Webhook pipeline",
        description: "Stripe → ForgeLetter event delivery",
        status: "down",
        detail: err instanceof Error ? err.message : "Unreachable",
        durationMs: Date.now() - started,
      },
      recent: [],
    }
  }
}

function formatRelative(timestampMs: number): string {
  const diff = Date.now() - timestampMs
  if (diff < 60_000) return "just now"
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

function overallStatus(checks: Check[]): {
  level: CheckStatus
  label: string
  message: string
} {
  if (checks.some((c) => c.status === "down")) {
    return {
      level: "down",
      label: "Service disruption",
      message:
        "One or more critical systems are unreachable. Our team has been alerted.",
    }
  }
  if (checks.some((c) => c.status === "degraded")) {
    return {
      level: "degraded",
      label: "Partial degradation",
      message:
        "Some systems are responding slowly. ForgeLetter remains usable; we're investigating.",
    }
  }
  return {
    level: "operational",
    label: "All systems operational",
    message: "Every component is healthy and responding within expected limits.",
  }
}

const statusLabels: Record<CheckStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
}

export default async function StatusPage() {
  const [databaseCheck, stripeCheck, webhookData] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkWebhooks(),
  ])
  const checks: Check[] = [databaseCheck, stripeCheck, webhookData.check]
  const overall = overallStatus(checks)
  const checkedAt = new Date()

  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <div className="container status-shell">
          <header className={`status-hero status-hero--${overall.level}`}>
            <span className="status-hero__pulse" aria-hidden="true">
              <span />
              <span />
            </span>
            <p className="status-hero__kicker">ForgeLetter system status</p>
            <h1>{overall.label}</h1>
            <p className="status-hero__message">{overall.message}</p>
            <p className="status-hero__checked">
              Live data, fetched{" "}
              <time dateTime={checkedAt.toISOString()}>
                {checkedAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </time>
            </p>
          </header>

          <section className="status-grid" aria-label="Component health">
            {checks.map((check) => (
              <article
                key={check.id}
                className={`status-card status-card--${check.status}`}
              >
                <div className="status-card__header">
                  <strong>{check.label}</strong>
                  <span className="status-card__pill">
                    <span aria-hidden="true" />
                    {statusLabels[check.status]}
                  </span>
                </div>
                <p className="status-card__description">{check.description}</p>
                <p className="status-card__detail">{check.detail}</p>
              </article>
            ))}
          </section>

          <section className="status-section">
            <div className="status-section__head">
              <h2>Recent webhook deliveries</h2>
              <p>
                The last 10 Stripe events successfully processed and recorded
                in our idempotency log.
              </p>
            </div>
            {webhookData.recent.length === 0 ? (
              <div className="status-empty">
                <p>
                  No webhook events processed in the current data window. This
                  is normal for fresh environments or low-traffic windows.
                </p>
              </div>
            ) : (
              <div className="status-event-list">
                {webhookData.recent.map((event) => (
                  <div className="status-event" key={event.event_id}>
                    <span className="status-event__dot" aria-hidden="true" />
                    <div className="status-event__copy">
                      <strong>{event.event_type}</strong>
                      <span>{event.event_id}</span>
                    </div>
                    <time
                      dateTime={event.processed_at}
                      title={formatAbsolute(event.processed_at)}
                    >
                      {formatRelative(new Date(event.processed_at).getTime())}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="status-section status-section--cta">
            <h2>Reporting an incident</h2>
            <p>
              If something is broken for you but everything here looks healthy,
              please <Link href="/contact">contact support</Link>. Include
              the time you experienced the issue and what you were doing —
              this helps us correlate with our logs.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
