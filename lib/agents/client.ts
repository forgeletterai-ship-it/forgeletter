import Anthropic from "@anthropic-ai/sdk"
import type { ZodTypeAny, z } from "zod"

let cached: Anthropic | null = null

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local — without it the AI engine cannot run."
    )
  }
  if (!cached) {
    cached = new Anthropic({ apiKey, maxRetries: 2 })
  }
  return cached
}

export const MODELS = {
  // Fast + cheap for extraction-style tasks (input cleaning, ATS keyword extraction)
  haiku: "claude-haiku-4-5-20251001",
  // High-quality reasoning + writing
  sonnet: "claude-sonnet-4-6",
} as const

export type ModelName = (typeof MODELS)[keyof typeof MODELS]

export interface StructuredCallOptions<S extends ZodTypeAny> {
  agent: string
  model: ModelName
  system: string
  user: string
  schema: S
  schemaName: string
  schemaDescription: string
  maxTokens?: number
  temperature?: number
}

export interface StructuredCallResult<T> {
  data: T
  modelUsed: string
  tokensInput: number
  tokensOutput: number
  durationMs: number
}

/**
 * Calls Claude with a tool definition derived from the Zod schema, then
 * parses + validates the returned arguments.
 *
 * Why tool-use instead of "respond in JSON": tool-use is the most reliable
 * way to get structured output from Claude — the SDK enforces the schema at
 * the API layer, so we never see free-form prose where we expect JSON.
 */
export async function structuredCall<S extends ZodTypeAny>(
  opts: StructuredCallOptions<S>
): Promise<StructuredCallResult<z.infer<S>>> {
  const client = getClient()
  const start = Date.now()

  const jsonSchema = zodToJsonSchema(opts.schema)

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    tools: [
      {
        name: opts.schemaName,
        description: opts.schemaDescription,
        // Cast: zodToJsonSchema is typed loosely, but a Zod object always
        // produces { type: "object", ... } at the root.
        input_schema: jsonSchema as Anthropic.Messages.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: opts.schemaName },
    messages: [{ role: "user", content: opts.user }],
  })

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (!toolUseBlock) {
    throw new AgentParseError(
      opts.agent,
      "Claude did not return a tool_use block. Response: " +
        JSON.stringify(response.content).slice(0, 500)
    )
  }

  const parsed = opts.schema.safeParse(toolUseBlock.input)
  if (!parsed.success) {
    throw new AgentParseError(
      opts.agent,
      "Tool input failed schema validation: " + parsed.error.message
    )
  }

  return {
    data: parsed.data,
    modelUsed: response.model,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    durationMs: Date.now() - start,
  }
}

/**
 * Plain text completion. Used by the Writer agent — we want prose, not JSON,
 * for the actual letter body.
 */
export interface TextCallOptions {
  agent: string
  model: ModelName
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}

export interface TextCallResult {
  text: string
  modelUsed: string
  tokensInput: number
  tokensOutput: number
  durationMs: number
}

export async function textCall(opts: TextCallOptions): Promise<TextCallResult> {
  const client = getClient()
  const start = Date.now()

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  })

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  )

  if (!textBlock) {
    throw new AgentParseError(
      opts.agent,
      "Claude did not return any text content."
    )
  }

  return {
    text: textBlock.text.trim(),
    modelUsed: response.model,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    durationMs: Date.now() - start,
  }
}

export class AgentParseError extends Error {
  agent: string
  constructor(agent: string, message: string) {
    super(`[${agent}] ${message}`)
    this.name = "AgentParseError"
    this.agent = agent
  }
}

/**
 * Minimal Zod → JSON Schema converter for tool definitions.
 * We support the subset of Zod we use: object, string, number, boolean,
 * array, enum, optional, nullable. If you reach for something exotic and
 * the SDK rejects the schema, extend this helper.
 */
function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const def = (schema as { _def?: unknown })._def as
    | { typeName?: string; type?: string; [k: string]: unknown }
    | undefined

  if (!def) {
    return { type: "string" }
  }

  // Zod 4 uses `type` directly; Zod 3 used `typeName`.
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
