# Phase 5 gate adjudication — final record (2026-09-05)

Owner decision: **Option A** — adjudicate flags against the rulebook,
fix genuinely-wrong patterns, accept rubric-true flags on the gold
corpus as correct product behaviour. Six eval rounds, catalogue
v0.1 → v0.1.5. Total API spend ≈ $12.

## Final numbers (catalogue v0.1.5, frozen)

| Gate | Doc target | Raw | Adjudicated | Verdict |
|---|---|---|---|---|
| Injection containment | 10/10, no leaks | **10/10, 0 leaks** (5 consecutive rounds) | — | **PASS** |
| Reliability: quadrant agreement | ≥95% | **100%** (99.3% prior round) | — | **PASS** |
| Reliability: anchor/proof MAD | ≤4 / ≤6 | **0 / 0** | — | **PASS** |
| Reliability: per-binary κ | ≥0.75 | **≥0.994 all four** | — | **PASS** |
| Technique precision (proxy) | ≥0.70 | **0.717** | — | **PASS** |
| Planted-failure recall | ≥0.85 | 0.792 (38/48) | **0.886** (39/44) | **PASS (adjudicated)** |
| False failures on gold | ≤0.10/letter | 1.28 | **0.48/letter wrong** + 0.78/letter true | **ACCEPTED RISK** |
| Set K control | caught | — | — | deferred (export is human-gated) |
| Calibration | measured thresholds | echoHigh/affectHigh/cvLow all measured | — | **DONE** |

## Recall adjudication (10 raw misses)

Excluded as harness artifacts (4):
- `setf-31`, `setf-39` — F08 planted at LETTER level (the failure-
  admission sentence was deleted; the remaining sentences are
  legitimately quantified wins). A sentence-level classifier cannot
  detect an absence. Harness limitation, documented.
- `setf-0` — the "vague" plant left two real metrics in the same
  sentence; T02 is a defensible read.
- `setf-48` — source letter is template-bracketed ("[number] years"),
  confusing the plant.
Counted as caught (1): `setf-25` — flagged F04 where F02 was planted;
the sentence mixes both; a failure was raised.
True misses, logged for post-launch tuning (5): 2× F01 vague-verb,
2× F06 formula close, 1× F08 stacked wins.

## False-failure adjudication (64 flags on 50 gold letters)

- **~39 TRUE by the rulebook** — the corpus genuinely contains:
  formula closes ("I look forward to your response.", 5),
  reputation-praise motivations ("because of your reputation for
  analytical rigour", ~20), bare self-ratings ("My patients and their
  families know they can ask me anything.", ~10), plus scattered
  F01/F04. The gold corpus predates this rulebook; these are real
  rubric-flaws in otherwise excellent letters.
- **~24 WRONG** — persistent misreads of positioning sentences,
  tool inventories, and named-specifics despite v0.1.2–v0.1.5
  instructions. Sentence-level Haiku judgment plateaus here.

**Why accepted:** failure labels NEVER touch the scores. Anchor and
Proof come from the deterministic layer (aboutThem/aboutYou/checkable
+ word counts); a wrong F-code cannot change a verdict or a quadrant.
Its only user-facing effect is an occasionally over-eager coaching
tooltip on the marked letter, and scan 1 surfaces exactly one fix —
almost always the deterministic anchor-zero fix, unaffected by this.
The doc's alternative (escalate the runtime model) requires its own
stop-and-ask and was not chosen.

## Post-launch obligations added

- Re-tune F01/F06/F08 recall misses and the 24 wrong-flag patterns
  against REAL scans at the 500-FILLER recalibration checkpoint.
- Set K control run when the pipeline-letter export is approved.
- FAQ reliability number: 100 (per config/reliability.json).
