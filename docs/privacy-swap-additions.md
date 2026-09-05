# Privacy-policy additions for the Swap Test — DRAFT for owner/legal approval

Status: NOT yet published. These four disclosures must be added to the
live privacy policy before `SWAP_TEST_ENABLED` is flipped (build doc
Phase 7.3 STOP-AND-ASK; GDPR mapping in Part V.2 is the source). Once
approved verbatim or amended, fold them into `app/(legal)/privacy` as
a "Swap Test" section.

---

## Proposed section: "The Swap Test (free letter scan)"

**Your letter is not stored.** When you scan a cover letter, it is
analysed in memory and discarded — nothing is written to a database
and nothing is used to train any model. We keep only numbers about the
scan (scores, sentence counts, category labels), which contain none of
your text. There are exactly three exceptions, each triggered only by
your own action: if you click "Share result", we store the scores (not
the letter) for 30 days to render the share card; if you paste a job
advert, we keep word counts from the advert — never its text; and the
research option below.

**Optional research copy.** At sign-up (and after a scan) you can tick
an optional box allowing us to keep a copy of your letter to improve
the tool. Before storage, names, employers, dates and figures are
automatically replaced with placeholders. The box is off by default,
consent is logged, and you can request deletion at any time at
{support email}.

**Optional outcome email.** If you tick the outcome box, we send one
email about 30 days after your scan asking whether the letter led to
an interview — three buttons, nothing else. Your address is held in a
send queue only until that email goes out, and is deleted the moment
it is sent. Every such email contains an unsubscribe link, and
unsubscribing revokes the consent permanently. Legal basis: consent.

**Fraud prevention.** To enforce the free-scan limit without requiring
an account, we compute a salted, irreversible hash from your IP
address, browser type, platform and timezone. The hash cannot be
turned back into any of those values, is used solely to prevent abuse
of the free tier, and expires after 30 days. Legal basis: legitimate
interest (fraud prevention).

---

Reviewer notes:
- {support email} → substitute the published support address.
- The existing policy's provider list needs no change: the scan uses
  the same processors already disclosed (hosting, database, AI).
- Retention summary for the records table, if the policy has one:
  letter text 0 days · share snapshot 30 days · JD word counts
  indefinite (no personal data) · fingerprint hash 30 days rolling ·
  outcome email until sent or revoked · research copy until deletion
  request.
