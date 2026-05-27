/**
 * Embedding helper for the gold-base vector search.
 *
 * Model: OpenAI text-embedding-3-small (1536 dimensions).
 *
 * Anthropic doesn't provide an embedding API, so this is the one
 * place in the engine where we touch OpenAI. We use a direct
 * fetch() call rather than pulling in the OpenAI SDK — the request
 * is a 12-line POST and we already have the auth secret pattern.
 *
 * Failure mode: if OPENAI_API_KEY is unset or the call fails, we
 * return null. ExampleRetrieval treats null as "vector pass not
 * available" and falls through to the substring-based 4-strategy
 * waterfall. No errors propagate; the pipeline degrades gracefully.
 */

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings"
const OPENAI_MODEL = "text-embedding-3-small"
const EMBEDDING_TIMEOUT_MS = 10_000

export type Embedding = number[]

export async function embedText(input: string): Promise<Embedding | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  if (!input || input.trim().length === 0) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS)

  try {
    const res = await fetch(OPENAI_EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: input.slice(0, 8000),
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(
        `[embedText] OpenAI returned ${res.status}; falling back to substring retrieval.`
      )
      return null
    }
    const json = (await res.json()) as {
      data?: Array<{ embedding: number[] }>
    }
    const vector = json.data?.[0]?.embedding
    if (!vector || vector.length !== 1536) {
      console.warn(
        `[embedText] unexpected embedding shape (len=${vector?.length}); falling back.`
      )
      return null
    }
    return vector
  } catch (err) {
    console.warn("[embedText] failed:", err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
