FORGELETTER
HM Critic Agent
Evaluation Specification v1
An engine-facing upgrade spec: scorable rubric, framework scorecard, output schema, and a reproducibility test.

Purpose: make the HM Critic score the same letter the same way twice, and reward what the best companies actually reward. This document is written to be handed to Claude Code as the source of truth for the HM Critic agent.

## Contents



## 1. What this spec changes, and why
The previous HM Critic used directional anchors such as evidence-rich versus vague. Directional anchors make a language model score on impression, which reintroduces exactly the bias a behaviourally anchored rating scale exists to remove. The result is score drift: the same letter scores 88 on one run and 94 on the next, the rewrite loop fires inconsistently, and the quality bar means less than it should.
This spec fixes that by replacing every anchor with a countable or checkable signal, so two runs converge. It keeps the six-dimension weighted BARS structure already in the agent, adds a second framework scorecard pass that scores the way the strongest companies decide, and defines a reproducibility test the improved agent must pass before it ships.
Honesty note for the team: the six dimensions and the 25/25/20/15/15 weights are a defensible design choice, not an empirically validated constant. What is genuinely evidence-backed is the underlying method. Structured, anchored, rubric-based evaluation predicts performance far better than unstructured judgement (Schmidt and Hunter 1998; Sackett et al. 2022), and the structured interview is the single strongest predictor of job performance, while the resume and years of experience are among the weakest. The letter's job is therefore to earn the structured interview, and the HM Critic should score for exactly that.
## 2. The operating principle
Every anchor must map to something that is either counted, measured as a ratio, or checked as present or absent. If an anchor cannot be reduced to one of those three, it is rewritten until it can. This is what makes the score reproducible and what lets deterministic code later cross-check the model's judgement.
Counted: how many of the job's top priorities does the letter explicitly address.
Ratio: what share of claims carry a number, a named entity, or an attributed result.
Present or absent: is the opening value-first, is there a banned phrase, does the company paragraph pass the swap test.
## 3. The scorable rubric: six dimensions
Each dimension is scored 1 to 5 against the operational anchors below, then combined into the weighted 0 to 100 score. The model is instructed to state the integer score and the one signal that determined it, so the score is auditable.
#### Relevance to the role  (Weight 25)
Signal: Count of the job's top five priorities that a sentence in the letter explicitly addresses.
Anchors: 5 = four or five priorities addressed.  4 = three.  3 = two.  2 = one.  1 = none, or the letter is about the candidate rather than the role.
#### Evidence and credibility  (Weight 25)
Signal: Ratio of claims that carry a number, a named company or technology, or an attributed third-party result, to total claims.
Anchors: 5 = sixty percent or more of claims quantified or named.  4 = about forty-five percent.  3 = about thirty percent.  2 = about fifteen percent.  1 = mostly unsupported adjectives.
#### Clarity and reading ease  (Weight 20)
Signal: Checkable faults: opening is intent-first not value-first; any sentence over roughly thirty words; any banned phrase present; no clear visual hierarchy for a seven-second scan.
Anchors: 5 = zero faults.  4 = one.  3 = two.  2 = three.  1 = four or more, or the value cannot be extracted in a seven-second scan.
#### Competencies and values shown  (Weight 15)
Signal: Count of role-relevant principles demonstrated through a situation-action-result story, versus merely asserted as a trait.
Anchors: 5 = two or more shown and zero claimed-only.  4 = one shown, none claimed-only.  3 = one shown but some traits merely listed.  2 = traits listed, none shown.  1 = generic traits only.
#### Role and culture fit  (Weight 15)
Signal: Swap test on the company paragraph: does it contain at least one specific, verifiable detail that could not appear in a letter to a competitor, and is it tied to the candidate's offer.
Anchors: 5 = specific detail present and tied to the candidate's value.  3 = specific detail present but not connected to the candidate.  1 = generic admiration or flattery that would fit any company.
#### Confident register (pass or fail overlay, not a weighted dimension)
Register is read before content, so it acts as a cap rather than a score. If the letter contains a neediness phrase such as honoured to be considered, hope to hear, or truly believe I am a strong match, the final score is capped at 80 regardless of the weighted total, and the cap is recorded in the output. Peer-register closes do not trigger the cap.
### Weighted score and pass logic
dimScore  in {1,2,3,4,5} for each of the six dimensions
weights   = { relevance:25, evidence:25, clarity:20,
              competencies:15, fit:15 }   // register is a cap, not a weight
 
weighted  = sum( (dimScore[d] / 5) * weights[d] )   // 0..100
if (neediness_phrase_present) weighted = min(weighted, 80)
 
wouldInterview = weighted ≥ 70           // re-derived in code, never trusted from model
passBar        = weighted ≥ tierThreshold  // 90 / 93 / 95 set by tier, not by this agent
The HM Critic reports the weighted score and the diagnostics. The Quality Gate, not this agent, owns the tier pass bar. Keeping scoring and gating separate is deliberate: the critic measures, the gate decides.
## 4. The framework scorecard: scoring the way the best companies decide
This is the second pass you asked to keep. After the rubric produces a number, the critic runs a short scorecard that checks the letter against how the strongest companies actually evaluate. It does not change the weighted score directly; it produces flags that guide the rewrite and surface to the user as quality signals.
#### a. Demonstrated principles, not claimed traits
The best companies score named principles through stories rather than self-described traits. Amazon publishes sixteen Leadership Principles and scores specific situation-action-result stories against them; many strong companies hire in the same spirit. The scorecard records which role-relevant principles the letter demonstrates with a real story. The recurring, transferable set worth checking for:
Starts from the customer or end user.
Takes ownership beyond the strict remit.
Invents or simplifies rather than accepting the status quo.
Insists on high standards.
Has the backbone to disagree, then commits.
Dives deep into detail rather than staying abstract.
Earns trust through candour, including admitting a wrong call.
Delivers measurable results.
Scorecard output: list the principles demonstrated through a story, and separately list any trait that is merely asserted. A letter that shows two principles and asserts none is strong; a letter that asserts five and shows none is weak, however confident it sounds.
#### b. Maps to a competency rubric
Strong companies increasingly score against a fixed competency list rather than a general impression, an approach popularised by Google's people-analytics work. The scorecard checks whether each body paragraph maps cleanly to one competency the role requires, so a structured reader can tick the box without hunting. Flag any paragraph that maps to no required competency: it is a candidate for cutting.
#### c. Behavioural spine present
The structured behavioural interview, built on situation, task, action, result, is the most validated selection method in the field. The strongest proof paragraph should follow that arc in miniature: a real difficulty, the action the candidate personally took, and the measurable result. The scorecard checks that at least one proof paragraph has this shape, because it is precisely what a structured interviewer is trained to score.
#### d. Earns the interview
The single predictive verdict. Given that the letter cannot prove the candidate can do the job, does it earn the structured interview where that gets tested. This is calibrated against the gold base: letters resembling the proven 95-plus exemplars score yes. The verdict is advisory to the rewrite loop, not a hard gate.
## 5. Output schema
The HM Critic returns this exact structure. Every score is an integer, every flag is an array, and the determining signal for each dimension is recorded so the score is auditable and the rewrite agent knows what to fix.
{
  weightedScore: number,          // 0..100, re-derived in code
  registerCapped: boolean,        // true if neediness phrase capped it
  wouldInterview: boolean,        // weightedScore ≥ 70
  dimensions: {
    relevance:     { score: 1..5, signal: string },
    evidence:      { score: 1..5, signal: string },
    clarity:       { score: 1..5, signal: string },
    competencies:  { score: 1..5, signal: string },
    fit:           { score: 1..5, signal: string }
  },
  scorecard: {
    principlesShown:    string[], // demonstrated via a story
    traitsClaimedOnly:  string[], // asserted, not shown
    unmappedParagraphs: number,   // paragraphs tied to no required competency
    behaviouralSpine:   boolean,  // ≥1 proof paragraph in S-A-R shape
    earnsInterview:     boolean
  },
  genericPhrases:   string[],     // exact phrases to cut
  strongestSentence: string,
  weakestSentence:   string,
  consistencyNote:   string,      // from the 3-rater reconciliation
  rewriteTargets:    string[]     // ordered, highest impact first
}
## 6. Bias control and self-consistency
The anchors do most of the debiasing work, because a countable signal cannot be swayed by a halo. Three further controls stay in the agent and are reinforced by this spec.
#### Blind review
Score content only. Disregard any name, gender, ethnicity, age, address, or school-prestige signal. None of these may move any dimension score. If the rationale for a score references identity rather than evidence, the score is invalid and must be recomputed.
#### Three-rater reconciliation
Score from three internal rater perspectives, then reconcile to a single integer per dimension. The anchors make this converge rather than average noise, because each rater is scoring the same countable signal. Record the spread in consistencyNote so wide disagreement is visible.
#### Equity check
Before returning, confirm every dimension score rests on a competency or evidence signal, not on background. Flag any criterion that would disadvantage an under-represented candidate for reasons unrelated to the role.
## 7. The reproducibility test the upgrade must pass
This is the acceptance criterion. The improved HM Critic is not considered shipped until it passes, because reproducibility is the entire point of the rebuild.
Run the critic on the same fixed letter ten times. The weightedScore must stay within a 6-point band, that is plus or minus 3 of the median. Wider spread means an anchor is still impressionistic and must be tightened.
Run the critic on the 50 gold exemplars. Every one must score 90 or above, and at least 40 must score 95 or above. A gold letter scoring below 90 reveals a mis-calibrated anchor, not a weak letter.
Run the critic on 10 deliberately weak letters (generic openers, adjective avalanche, fake company paragraph). None may score above 75, and each genericPhrases array must be non-empty.
Cross-check three dimensions against deterministic code: the evidence ratio, the banned-phrase presence, and the over-long-sentence count. The model's signal must agree with the code count within a small tolerance. Persistent disagreement means the model is not reading the anchor literally.
Log every run to agent_outputs with the per-dimension scores and signals, so the reproducibility band can be measured from real telemetry rather than asserted.
## 8. Build brief for Claude Code
Hand this section to the agent build. It is the concrete change list.
UPGRADE HMCritic (Sonnet, Ultra) to Evaluation Spec v1.
 
1. Replace directional anchors with the operational anchors in section 3.
   Each dimension: integer 1-5 + the determining signal string.
2. Weights relevance25 evidence25 clarity20 competencies15 fit15.
   weightedScore = sum((score/5)*weight). Re-derive in code.
3. Neediness-phrase overlay caps weightedScore at 80; set registerCapped.
4. Add the section-4 framework scorecard pass (principlesShown,
   traitsClaimedOnly, unmappedParagraphs, behaviouralSpine, earnsInterview).
5. Emit the exact section-5 output schema. wouldInterview = score≥70.
6. Keep blind review, 3-rater reconciliation, equity check (section 6).
7. Quality Gate still owns the tier bar (90/93/95). HMCritic only measures.
8. Log per-dimension scores + signals to agent_outputs.
9. Ship only after the section-7 reproducibility test passes:
   same letter within +/-3 over 10 runs; 50 golds all ≥90, ≥40 at ≥95;
   10 weak letters all ≤75 with non-empty genericPhrases;
   model signals agree with deterministic code on the 3 checkable dims.
This keeps the HM Critic as the measuring instrument and the Quality Gate as the decision-maker, makes every score auditable and reproducible, and rewards the letter for doing what the evidence says actually earns an interview.