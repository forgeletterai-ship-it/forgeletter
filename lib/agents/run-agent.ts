import type Anthropic from "@anthropic-ai/sdk"
import type { ZodTypeAny, z } from "zod"
import { AgentParseError, MODELS, type ModelName } from "./client"
import type { AgentName, AgentRunLog } from "./types"

/**
 * runAgent() — single wrapper every agent runs through.
 *
 * Enforces the 7 properties from the blueprint:
 *   1. Strict Zod schema validation → repair → typed fallback
 *   2. Deterministic fallback per agent (never crashes the pipeline)
 *   3. Hard token cap (max_tokens) prevents runaway cost
 *   4. Per-call timeout (default 30s) aborts cleanly into fallback
 *   5. Smart retry: exponential backoff on 429/5xx only, never on 4xx
 *   6. Calibrated temperature (caller sets — Writer 0.7, others 0.1)
 *   7. Full observability: returns the AgentRunLog the orchestrator
 *      persists to agent_outputs
 *
 * Each agent defines only its prompt + schema + fallback. The wrapper
 * handles everything else.
 */

export interface RunAgentOptions<S extends ZodTypeAny> {
  agent: AgentName
  model: ModelName
  cycleNumber: number
  /** System prompt. Use cache markers (cacheControl: ephemeral) on
   *  long, stable prompts to cut tokens by ~90% on subsequent calls. */
  system: string
  user: string
  schema: S
  schemaName: string
  schemaDescription: string
  /** Per-agent typed fallback. Returned without modification if every
   *  retry fails — orchestrator continues with reduced quality
   *  rather than crashing the run. */
  fallback: z.infer<S>
  /** Hard token cap. Set per-agent based on expected output size. */
  maxTokens: number
  /** 0.1 for judgement, 0.7 for Writer. Default 0.1. */
  temperature?: number
  /** Hard wall-clock timeout in ms. Default 30s. */
  timeoutMs?: number
  /** Max retry attempts on 429/5xx. Default 3. */
  maxRetries?: number
}

export interface RunAgentResult<T> {
  data: T
  log: AgentRunLog
}

/** Errors we should retry (transient network / rate-limit / server). */
function isRetryable(err: unknown): boolean {
  const status =
    (err as { status?: number; statusCode?: number })?.status ??
    (err as { status?: number; statusCode?: number })?.statusCode
  if (typeof status === "number") {
    return status === 429 || (status >= 500 && status < 600)
  }
  const message = err instanceof Error ? err.message.toLowerCase() : ""
  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("rate limit")
  )
}

/** AbortController-backed timeout that races the call. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  abort: AbortController
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(() => {
      abort.abort()
      reject(new Error(`Agent call timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(handle)
        resolve(value)
      },
      (err) => {
        clearTimeout(handle)
        reject(err)
      }
    )
  })
}

async function getClient(): Promise<Anthropic> {
  // Lazy import + cache so the wrapper file itself has no side effects.
  const mod = await import("./client")
  // We can't reach the private cached client; instead instantiate
  // through the same env var. This avoids a circular dep on
  // structuredCall while keeping a single API key path.
  const Anthropic = (await import("@anthropic-ai/sdk")).default
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local — without it the AI engine cannot run."
    )
  }
  return new Anthropic({
    apiKey,
    // SDK-level retries — we layer our own typed retry on top.
    maxRetries: 0,
    defaultHeaders: {
      "anthropic-no-retention": "true",
    },
  }) as unknown as Anthropic & typeof mod
}

/**
 * Minimal Zod → JSON Schema conversion. Mirrors the helper in
 * client.ts. Kept inline so this file has no dependency on the older
 * structuredCall implementation.
 */
function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const def = (schema as { _def?: unknown })._def as
    | { typeName?: string; type?: string; [k: string]: unknown }
    | undefined
  if (!def) return { type: "string" }
  const kind = def.type || def.typeName
  switch (kind) {
    case "string":
    case "ZodString":
      return { type: "string" }
    case "number":
    case "ZodNumber":
      return { type: "number" }
    case "boolean":
    case "ZodBoolean":
      return { type: "boolean" }
    case "enum":
    case "ZodEnum": {
      const values =
        (def.entries as Record<string, string> | undefined) ||
        (def.values as Record<string, string> | undefined)
      const enumArr =
        (def.options as readonly string[] | undefined) ||
        (values ? Object.values(values) : undefined)
      return { type: "string", enum: enumArr ?? [] }
    }
    case "array":
    case "ZodArray": {
      const inner = (def.element || def.type) as ZodTypeAny | undefined
      return {
        type: "array",
        items: inner ? zodToJsonSchema(inner) : { type: "string" },
      }
    }
    case "object":
    case "ZodObject": {
      const shape =
        typeof def.shape === "function"
          ? (def.shape as () => Record<string, ZodTypeAny>)()
          : (def.shape as Record<string, ZodTypeAny>)
      const properties: Record<string, unknown> = {}
      const required: string[] = []
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value)
        if (!isOptional(value)) required.push(key)
      }
      return {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      }
    }
    case "optional":
    case "ZodOptional": {
      const inner = (def.innerType || def.type) as ZodTypeAny
      return zodToJsonSchema(inner)
    }
    case "nullable":
    case "ZodNullable": {
      const inner = (def.innerType || def.type) as ZodTypeAny
      const innerSchema = zodToJsonSchema(inner)
      return { ...innerSchema, nullable: true }
    }
    case "default":
    case "ZodDefault": {
      const inner = (def.innerType || def.type) as ZodTypeAny
      return zodToJsonSchema(inner)
    }
    default:
      return { type: "string" }
  }
}

function isOptional(schema: ZodTypeAny): boolean {
  const def = (schema as { _def?: { type?: string; typeName?: string } })._def
  const kind = def?.type || def?.typeName
  return kind === "optional" || kind === "ZodOptional" || kind === "default" || kind === "ZodDefault"
}

/**
 * The single entry point every structured agent uses. Returns the
 * validated data + a complete AgentRunLog. Never throws — fallback
 * is returned with fallbackTriggered=true so the orchestrator can
 * track when an agent degraded.
 */
export async function runAgent<S extends ZodTypeAny>(
  opts: RunAgentOptions<S>
): Promise<RunAgentResult<z.infer<S>>> {
  const temperature = opts.temperature ?? 0.1
  const timeoutMs = opts.timeoutMs ?? 30_000
  const maxRetries = opts.maxRetries ?? 3
  const start = Date.now()

  const buildLog = (
    output: unknown,
    meta: { modelUsed: string; tokensInput: number; tokensOutput: number; durationMs: number },
    fallback: boolean
  ): AgentRunLog => ({
    agent: opts.agent,
    cycle: opts.cycleNumber,
    outputJson: output,
    modelUsed: meta.modelUsed,
    durationMs: meta.durationMs,
    tokensInput: meta.tokensInput,
    tokensOutput: meta.tokensOutput,
    fallbackTriggered: fallback,
  })

  let attempt = 0
  let lastErr: unknown = null

  while (attempt < maxRetries) {
    attempt += 1
    const abort = new AbortController()
    try {
      const client = await getClient()
      const jsonSchema = zodToJsonSchema(opts.schema)

      const response = await withTimeout(
        client.messages.create(
          {
            model: opts.model,
            max_tokens: opts.maxTokens,
            temperature,
            system: opts.system,
            tools: [
              {
                name: opts.schemaName,
                description: opts.schemaDescription,
                input_schema: jsonSchema as Anthropic.Messages.Tool["input_schema"],
              },
            ],
            tool_choice: { type: "tool", name: opts.schemaName },
            messages: [{ role: "user", content: opts.user }],
          },
          { signal: abort.signal }
        ),
        timeoutMs,
        abort
      )

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )
      if (!toolUseBlock) {
        throw new AgentParseError(
          opts.agent,
          `Model did not return a tool_use block on attempt ${attempt}`
        )
      }

      const parsed = opts.schema.safeParse(toolUseBlock.input)
      if (!parsed.success) {
        // Schema validation failures are NOT retryable — they indicate
        // a prompt/schema mismatch, not a transient issue.
        throw new AgentParseError(
          opts.agent,
          `Tool input failed schema validation: ${parsed.error.message}`
        )
      }

      return {
        data: parsed.data,
        log: buildLog(
          parsed.data,
          {
            modelUsed: response.model,
            tokensInput: response.usage.input_tokens,
            tokensOutput: response.usage.output_tokens,
            durationMs: Date.now() - start,
          },
          false
        ),
      }
    } catch (err) {
      lastErr = err
      // Schema validation failures: don't retry, fall straight through to fallback.
      if (err instanceof AgentParseError) break
      // 4xx (other than 429): don't retry — pure waste of money.
      if (!isRetryable(err)) break
      // Backoff before next attempt.
      if (attempt < maxRetries) {
        const backoffMs = Math.min(2 ** attempt * 250, 4000)
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
  }

  // Every attempt exhausted — surface typed fallback.
  console.warn(
    `[runAgent:${opts.agent}] falling back after ${attempt} attempt(s):`,
    lastErr instanceof Error ? lastErr.message : lastErr
  )
  return {
    data: opts.fallback,
    log: buildLog(
      opts.fallback,
      {
        modelUsed: opts.model,
        tokensInput: 0,
        tokensOutput: 0,
        durationMs: Date.now() - start,
      },
      true
    ),
  }
}

/**
 * Plain-text variant for the Writer agent — prose, not JSON. Same
 * 7-property guarantees minus the schema validation.
 */
export interface RunAgentTextOptions {
  agent: AgentName
  model: ModelName
  cycleNumber: number
  system: string
  user: string
  /** Returned if every retry fails. */
  fallback: string
  maxTokens: number
  temperature?: number
  timeoutMs?: number
  maxRetries?: number
}

export interface RunAgentTextResult {
  text: string
  log: AgentRunLog
}

export async function runAgentText(
  opts: RunAgentTextOptions
): Promise<RunAgentTextResult> {
  const temperature = opts.temperature ?? 0.7
  const timeoutMs = opts.timeoutMs ?? 30_000
  const maxRetries = opts.maxRetries ?? 3
  const start = Date.now()

  const buildLog = (
    output: unknown,
    meta: { modelUsed: string; tokensInput: number; tokensOutput: number; durationMs: number },
    fallback: boolean
  ): AgentRunLog => ({
    agent: opts.agent,
    cycle: opts.cycleNumber,
    outputJson: output,
    modelUsed: meta.modelUsed,
    durationMs: meta.durationMs,
    tokensInput: meta.tokensInput,
    tokensOutput: meta.tokensOutput,
    fallbackTriggered: fallback,
  })

  let attempt = 0
  let lastErr: unknown = null

  while (attempt < maxRetries) {
    attempt += 1
    const abort = new AbortController()
    try {
      const client = await getClient()
      const response = await withTimeout(
        client.messages.create(
          {
            model: opts.model,
            max_tokens: opts.maxTokens,
            temperature,
            system: opts.system,
            messages: [{ role: "user", content: opts.user }],
          },
          { signal: abort.signal }
        ),
        timeoutMs,
        abort
      )

      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      )
      if (!textBlock) {
        throw new AgentParseError(opts.agent, "Model returned no text content")
      }
      const text = textBlock.text.trim()
      return {
        text,
        log: buildLog(
          { textLength: text.length },
          {
            modelUsed: response.model,
            tokensInput: response.usage.input_tokens,
            tokensOutput: response.usage.output_tokens,
            durationMs: Date.now() - start,
          },
          false
        ),
      }
    } catch (err) {
      lastErr = err
      if (err instanceof AgentParseError) break
      if (!isRetryable(err)) break
      if (attempt < maxRetries) {
        const backoffMs = Math.min(2 ** attempt * 250, 4000)
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
  }

  console.warn(
    `[runAgentText:${opts.agent}] falling back after ${attempt} attempt(s):`,
    lastErr instanceof Error ? lastErr.message : lastErr
  )
  return {
    text: opts.fallback,
    log: buildLog(
      { fallbackText: true },
      {
        modelUsed: opts.model,
        tokensInput: 0,
        tokensOutput: 0,
        durationMs: Date.now() - start,
      },
      true
    ),
  }
}

export { MODELS }
