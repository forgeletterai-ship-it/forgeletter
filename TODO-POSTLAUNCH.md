# TODO-POSTLAUNCH — Swap Test

Obligations recorded by the build (MASTER_BUILD_SWAP_TEST.md). Each
is a human decision when its counter trips (Rule 13).

- [ ] **Recalibrate @500 real FILLER scans** — `npx tsx scripts/recalibrate.ts`
      replaces the provisional A-vs-B thresholds with real Set C and
      bumps `config/swap-thresholds.json` version. Re-run the eval +
      reliability harnesses after (≈$0.35/run).
- [ ] **Data study @5,000 scans** — "X% of letters contain nothing
      specific to the employer": a real measurement in a category of
      vendor surveys. Publish it.
- [ ] **Outcome analysis @800 responses** — publish what the outcome
      data shows, including null results.
- [ ] **Per-family corpus switchover** — when a role family reaches
      200 JD docs, idf flips to corpus mode automatically; update the
      disclosure copy review and announce it.
- [ ] **Edit-insights review cadence** — read `reports/edit-insights.md`
      weekly; any FinalEditor/QualityGate change is human-gated.
- [ ] **Closed-vocabulary wordlist** — replace the shape-rule vocab
      check in `purge_swap_vocab()` with a real top-50k English list.
- [ ] **Technique-precision refinement** — once
      `data/technique-extraction.json` exists, replace the lexical
      proxy in `scripts/eval-agent.ts` with extraction-derived ground
      truth.
- [ ] **Test–retest republish** — re-run `scripts/reliability.ts` and
      republish the FAQ number on every rubric version bump.
