/**
 * Shared harness plumbing for the Phase 5 gate scripts (eval,
 * reliability, calibrate, benchmark). Runs the SAME pipeline as the
 * route, minus HTTP/ladder/persistence: segment → agent →
 * distinctiveness (stoplist mode) → score → signals.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import stoplistJson from "../config/boilerplate-stoplist.json"
import { classifyWithAgent } from "../lib/swap/agent"
import { inferCompanyTokens, type Stoplist } from "../lib/swap/idf"
import { classifySentences, scoreLetter } from "../lib/swap/score"
import { segmentSentences } from "../lib/swap/segment"
import { affectSignal } from "../lib/swap/signals/affect"
import { echoOverlap } from "../lib/swap/signals/echo"
import { rhythmCv } from "../lib/swap/signals/rhythm"
import type { ClassifiedSentence, Scores } from "../lib/swap/types"

export const stoplist = stoplistJson as unknown as Stoplist

export interface EvalScan {
  sentences: ClassifiedSentence[]
  scores: Scores
  echo: number | null
  affectRatio: number
  cv: number | null
  failures: string[]
  techniques: string[]
}

export async function scanLetter(letter: string, jd?: string | null): Promise<EvalScan> {
  const segmented = segmentSentences(letter)
  const agent = await classifyWithAgent(segmented)
  const classified = classifySentences(segmented, agent.labels, {
    corpusSize: 0,
    stoplist,
    extraCompanyTokens: inferCompanyTokens(letter, stoplist),
  })
  const scores = scoreLetter(classified)
  const live = classified.filter((s) => !s.structural)
  const text = live.map((s) => s.text).join(" ")
  const affect = affectSignal(text, scores.checkableClaims)
  return {
    sentences: classified,
    scores,
    echo: echoOverlap(text, jd ?? null),
    affectRatio: affect.ratio,
    cv: rhythmCv(live.map((s) => s.words)),
    failures: classified.map((s) => s.failure).filter((f): f is string => Boolean(f)),
    techniques: classified.map((s) => s.technique).filter((t): t is string => Boolean(t)),
  }
}

export function loadGold(): { id: string; body: string }[] {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), "scripts/gold-letters-source.json"), "utf-8")
  ) as { number: number; body: string }[]
  return raw.map((r) => ({ id: `gold-${r.number}`, body: r.body }))
}

export function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf-8")) as T
}

export function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function percentile(nums: number[], p: number): number {
  const s = [...nums].sort((a, b) => a - b)
  if (s.length === 0) return NaN
  const idx = (p / 100) * (s.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

/** Median absolute deviation of paired runs (|a-b| per item). */
export function pairedMad(a: number[], b: number[]): number {
  const diffs = a.map((v, i) => Math.abs(v - b[i]))
  return median(diffs)
}

/** Cohen's kappa for paired boolean label sequences. */
export function cohensKappa(a: boolean[], b: boolean[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 1
  let both = 0
  let neither = 0
  let onlyA = 0
  let onlyB = 0
  for (let i = 0; i < n; i++) {
    if (a[i] && b[i]) both++
    else if (!a[i] && !b[i]) neither++
    else if (a[i]) onlyA++
    else onlyB++
  }
  const po = (both + neither) / n
  const pa = ((both + onlyA) / n) * ((both + onlyB) / n)
  const pb = ((neither + onlyB) / n) * ((neither + onlyA) / n)
  const pe = pa + pb
  if (pe === 1) return 1
  return (po - pe) / (1 - pe)
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}
