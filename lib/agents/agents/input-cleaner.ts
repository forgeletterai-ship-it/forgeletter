/**
 * Input Cleaner — deterministic, no LLM call.
 *
 * Why deterministic: we run this on every generation. Spending a Haiku
 * call on whitespace normalization adds latency and cost for no quality
 * gain. Reach for an LLM only if you need real comprehension.
 */

export interface CleanedInput {
  resumeText: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
  warnings: string[]
}

export interface RawInput {
  resumeText: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
}

export function runInputCleaner(raw: RawInput): CleanedInput {
  const warnings: string[] = []

  const resumeText = cleanText(raw.resumeText)
  const jobDescription = cleanText(raw.jobDescription)

  if (resumeText.length < 200) {
    warnings.push(
      `Resume is short (${resumeText.length} chars). Letter quality may suffer.`
    )
  }
  if (jobDescription.length < 200) {
    warnings.push(
      `Job description is short (${jobDescription.length} chars). Letter relevance may suffer.`
    )
  }
  if (looksLikeLinkedInUI(resumeText)) {
    warnings.push(
      "Resume text looks like a LinkedIn page paste with UI noise. Consider importing via the LinkedIn URL flow instead."
    )
  }

  return {
    resumeText,
    jobDescription,
    jobTitle: raw.jobTitle?.trim() || undefined,
    companyName: raw.companyName?.trim() || undefined,
    warnings,
  }
}

function cleanText(input: string): string {
  return input
    // Normalize line endings
    .replace(/\r\n?/g, "\n")
    // Strip zero-width / BOM characters
    .replace(/[​-‍﻿]/g, "")
    // Collapse runs of 3+ blank lines into 2
    .replace(/\n{3,}/g, "\n\n")
    // Trim trailing whitespace on each line
    .replace(/[ \t]+\n/g, "\n")
    // Strip page-marker noise commonly seen in PDF copies
    .replace(/^Page \d+ of \d+$/gm, "")
    .trim()
}

const LINKEDIN_UI_MARKERS = [
  "Skip to main content",
  "Top job picks for you",
  "Add profile section",
  "Show all activity",
  "Profile language",
  "People also viewed",
]

function looksLikeLinkedInUI(text: string): boolean {
  return LINKEDIN_UI_MARKERS.filter((m) => text.includes(m)).length >= 2
}
