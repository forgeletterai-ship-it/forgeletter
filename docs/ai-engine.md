# The ForgeLetter AI Engine

Reference for how a cover letter is produced: the twelve agents, the
order they run in, the gold-letter corpus they draw structure from,
and every check a letter must survive before delivery.

Source of truth: `lib/agents/orchestrator.ts`, `lib/agents/tiers.ts`,
`lib/agents/agents/*`, `scripts/gold-letters-source.json`.

---

## 1. Tier composition

| | Starter | Pro | Ultra |
|---|---|---|---|
| Agents | 8 | 9 | 12 |
| Quality bar | 90 | 93 | 95 |
| Backend quality rewrites | 1 | 2 | 2 |
| ATS | code-only scorer | + Haiku agent | + Haiku agent |
| Hallucination check | ×1 (post-edit) | ×1 (post-edit) | ×2 (pre + post) |

Backend rewrites are invisible and free — they are how the tier's bar
is met, not a customer-facing feature. The 0 / 1 / 3 *tone* rewrites
sold on the pricing cards are a separate, user-triggered feature that
draws on the monthly letter allowance.

---

## 2. The twelve agents

### 1. InputCleaner — deterministic + Haiku
Normalises whitespace, strips control characters, and caps field
lengths on the profile and job description. On **Ultra** it adds an
LLM pass that scans the job description and profile notes for prompt
injection — text engineered to hijack later agents — and returns a
sanitised job description. Runs before anything else so no downstream
agent ever sees hostile input.

### 2. ProfileAnalyst — Haiku
Turns the saved profile into structured evidence: each employer,
internship, and university entry becomes a *win* with its result, its
number, why it mattered, and the skills and tools recorded against
that specific win. This per-win binding is what later makes "I used
SQL to do X" impossible to fabricate.

### 3. JobAnalyst — Sonnet
Reads the job posting and extracts must-have requirements, keyword
long tail, seniority, industry, and the hiring manager's name when the
posting names one (which drives the greeting). Runs **in parallel**
with ProfileAnalyst — they share no inputs.

### 4. ExampleRetrieval — deterministic (Supabase)
Fetches up to three gold letters matched to this job. Supplies
**structure and phrasing patterns only** — never claims, never facts.
Ranking is described in section 4.

### 5. MatchAnalyst — Sonnet
Maps profile wins onto job requirements and produces a *blueprint*:
which win answers which requirement, in what order, and which
requirements have no evidence behind them. The blueprint is what stops
the Writer from free-associating.

### 6. Writer — Sonnet
Writes the letter against the blueprint: hook opening, one or two body
paragraphs, qualifications and portfolio only in the closing
paragraph, 260–330 words (200–260 for the concise tone), hard cap 330.
Tools may only be named inside the win that records them.

### 7. ATSAgent — code always, Haiku on Pro/Ultra
Scores keyword coverage against the parsed posting. The deterministic
scorer always runs; Pro and Ultra add an LLM pass. Formula in
section 5.

### 8. HMCritic — Sonnet · **Ultra only**
Reads the letter as a hiring manager would and critiques it against
behaviourally anchored rating scales — would this earn a reply, what
is the weakest paragraph, what reads as filler.

### 9. FinalEditor — Sonnet
Polishes voice, enforces the word band, removes AI-tell phrasing, and
preserves the canonical closing verbatim.

### 10. HallucinationCheck — Haiku
Verifies every claim in the letter against the profile. Returns
fabricated facts, unmapped claims, and a risk level. Two layers:
- **Model pass** — semantic reconciliation of claims to evidence.
- **Deterministic pass** — demotes any claim naming a tool absent from
  that win's own text or its skills/tools fields.

Runs **post-edit on every tier** (authoritative — it judges the exact
text that would ship). Ultra adds a pre-edit pass for telemetry.

### 11. QualityGate — Haiku
Scores the letter 0–100 against a fixed rubric and decides pass/fail.
Rubric and anti-manipulation rules in section 5.

### 12. RewriteAgent — deterministic dispatch
Fires only when the gate fails and the letter is salvageable. It is
targeted, not a blind retry: the gate names the single weakest element
("opening hook", "proof / specifics", "fit narrative", "close / CTA",
"voice") and the rewrite attacks that. Capped by tier.

---

## 3. Sequential order

```
1  InputCleaner                      deterministic (+ Haiku scan on Ultra)
         │
2  ProfileAnalyst ──┬── JobAnalyst   parallel
         │          │
3  ExampleRetrieval ┘                gold-letter lookup
         │
4  MatchAnalyst                      blueprint: win → requirement
         │
5  Writer                            first draft
         │
   ┌─────▼──────────── quality loop (0 … maxRewriteCycles) ───────┐
   │  6  ATSAgent                                                 │
   │  7  HMCritic                    Ultra only                   │
   │  8  HallucinationCheck (pre)    Ultra only, telemetry        │
   │  9  FinalEditor                                              │
   │ 10  HallucinationCheck (post)   authoritative, all tiers     │
   │ 10b Auto-cleaner                strips flagged claims,       │
   │                                 re-verifies if it cut        │
   │ 11  QualityGate                 score vs tier threshold      │
   │ 11b Coverage check              every selected experience    │
   │                                 must appear                  │
   │        ├── pass ──────────────► exit loop                    │
   │        └── fail ──► 12 RewriteAgent ──► next cycle           │
   └──────────────────────────────────────────────────────────────┘
         │
   Delivery exit (deterministic, always applied):
     scrubDashes → ensureParagraphs → enforceCanonicalClosing
```

If no cycle passes, the **highest-scoring draft** is delivered rather
than nothing, and the letter is marked best-effort. The whole run is
bounded by a 210-second budget.

---

## 4. The gold-letter database

### Table: `cover_letter_examples`

| Column | Purpose |
|---|---|
| `id` | uuid |
| `industry` | canonicalised (Technology, Finance, Marketing…) |
| `role` | e.g. "Junior Product Manager" |
| `seniority` | canonicalised band |
| `tone` | inferred from industry + role |
| `cover_letter_excerpt` | the letter body, **verbatim** |
| `why_it_works` | one-line explanation of the technique |
| `quality_score` | 0–100; retrieval floor is 90 |
| `tags` | seed tag, industry, seniority, hook type |
| `approved` | only approved rows are retrievable |
| `embedding` | vector(1536), optional — enables semantic search |

### Corpus

50 curated letters seeded by `scripts/seed-gold-letters.ts` from
`scripts/gold-letters-source.json`. Spread across Technology (7),
Finance (6), Marketing (5), Sales (4), Creative (4), Healthcare (3),
Legal (3), HR (3) and others, and across seniority from entry-level
through C-suite and board-level. Each source record carries `role`,
`industry`, `seniority`, `hookDesc` (the opening technique) and
`body`.

**No customer data ever enters this table.** A customer's own
offer-winning letters are read from `generated_letters` filtered by
their `user_id` — they improve only that customer's future letters and
are never shared into a pool.

### Retrieval ranking

Examples are merged from several strategies, ordered by strategy
ascending, then by score descending, deduplicated by id:

| Strategy | Source | Score |
|---|---|---|
| 0 | vector cosine top-K | `100 + similarity × 30` |
| 1 | this user's own winners | rank + 25 (offer) / +12 (interview) |
| 2 | exact industry **and** seniority | rank score |
| 3 | exact industry **or** same role family | rank score |
| 4 | remaining curated pool | rank score |

Vector search is optional — without `OPENAI_API_KEY` the engine falls
back to strategies 1–4, which are substring/attribute based.

### Worked example

From the corpus — *Junior Product Manager · Technology ·
Entry-level · hook: self-directed user research · 319 words*:

> Dear [Hiring Manager],
>
> On my own initiative last year I ran 87 user interviews about
> invoicing. The pattern underneath them was not a missing feature but
> a missing feeling: small business owners did not trust their
> software to represent them well. I rebuilt the information hierarchy
> around that insight, and 60-day retention moved from 12 percent to
> 54 percent.
>
> I am completing my MBA at [Business School] after two years as a
> product intern at [Company A] and [Company B]. At [Company B] I led
> the discovery work for a B2B onboarding flow that brought
> time-to-value down from 14 days to 3, with no engineering sprint
> until the design had been validated across five structured user
> sessions. […]
>
> Your CPO made a point at [Conference] that matches how I work: the
> worst product decisions come from skipping discovery and going
> straight to a solution. […]
>
> Best,
> [Your Name]

**What the engine takes from it:** the shape — open on a
self-initiated, quantified result; move to owned work with
before/after numbers; connect to something specific about the company;
close on a concrete next step. Placeholders are bracketed precisely so
no name, employer, or figure can leak into a customer's letter. The
customer's own numbers fill that shape.

---

## 5. Evaluation method

A letter must clear four independent checks. They are deliberately
redundant: a failure in one is caught by another.

### QualityGate — 100 points

| Points | Dimension | Test |
|---|---|---|
| 30 | Opening | specific hook tied to the role; no clichés; never "I am writing to…" |
| 25 | Proof | ≥2 concrete achievements with numbers, scale, or named impact |
| 20 | Fit | explicit link between the candidate's experience and the JD's top requirements |
| 15 | Close | a concrete next step, not "I look forward to hearing from you" |
| 10 | Voice | clean prose; no AI-sounding phrasing; no banned phrases |

**Anti-manipulation.** The model's own `pass` is not trusted. In code:

```
pass = (score ≥ tier threshold) AND (bannedPhrases.length === 0)
```

A letter that flatters itself into a high verdict still fails if the
number is short or a banned phrase is present.

### ATS keyword score

```
score = mustHaveRatio × 70  +  keywordRatio × 30
```

If one list is empty the other carries full weight — an empty list is
a JobAnalyst extraction artefact, not evidence about the letter. If
both are empty the score is a neutral 70 rather than a false zero.

| Score | Verdict |
|---|---|
| ≥ 80 | ATS Ready |
| ≥ 60 | Good |
| ≥ 40 | Needs Work |
| < 40 | At Risk |

Missing must-have phrases lead the "missing keywords" list shown to
the customer, with the standing instruction that they should only be
added if they reflect real experience.

### HallucinationCheck

Model reconciliation plus deterministic tool-in-story verification.
The final risk is the **maximum** of the model's risk and the
evidence-derived risk — the engine takes the more pessimistic view.
When claims are flagged, the auto-cleaner strips them, subject to a
hard three-sentence floor (it refuses to gut the letter), then
re-verifies so the gate judges the cleaned text.

### Coverage check

Deterministic. Every experience the customer *selected* must be
reflected in the letter. If one is missing, a passing verdict is
overridden to fail and a rewrite is triggered. A letter that silently
drops a chosen experience never ships.

### Delivery guarantees

Applied unconditionally at the exit, regardless of what the agents
returned:

- `scrubDashes` — removes em-dash AI tells
- `ensureParagraphs` — restores paragraph breaks (the auto-cleaner
  rebuilds body text as a single string; this prevents wall-of-text)
- `enforceCanonicalClosing` — replaces any invented closing with the
  exact sanctioned sentence for the tone

These are code, not prompts, so they hold even when a model
misbehaves.
