# workflow/02_QA_HANDOFF.md — Phase 2: QA Handoff & Verification Loop

**Enter only after Phase 1 is implemented, checkpoint-approved, and self-verified.**
**Doctrine source:** `QA_PLAYBOOK.md`. This file defines what the Engineer must PRODUCE
for QA and how findings route back. Blue Team builds; Red Team verifies. The Engineer
does not self-approve completion.

#### Step 1 — Engineer self-verification
Automated suite green; typecheck + production build clean; smoke pass on the dev
frontend against `dockbloxx.mystagingwebsite.com`; CONTRACT e2e trace on one real value
(`Wood`) from ACF response → category JSON → radio → cart item → order payload → WC REST
order readback; final environment state restored. The TEST BUY itself is the Director's
(browser + Stripe sandbox); the Engineer performs the REST readback of the resulting
order id and records it. Record in `templates/EVIDENCE_LOG.md` (self-verification log —
feeds the claim package; NOT the QA verdict).

#### Step 2 — Generate the Acceptance Spec
Fill `templates/ACCEPTANCE_SPEC.md`. Derive AC items from the ticket DoD (CLAUDE.md §2)
and CONTRACT (FINAL) — never from the implementation. Number `AC1, AC2, …`. Include
expected-ABSENT assertions (no Pole Material on non-bloxx templates; no change to
`variation_id`/price) and the fallback case (`Unknown`) as their own rows. Mark evidence
type, environment, WHO.

#### Step 3 — Assemble the Claim Package (QA_PLAYBOOK §6)
Module ID, accepted scope, Acceptance Spec, files changed, behavior claimed complete,
tests added/changed, commands run + results, build/typecheck results, manual checks
performed, known limitations, environment/setup requirements (include module rituals:
clean-session, one-session-one-artifact, TEST BUY naming convention, staging-only,
Track B ACF values must be present on the backend under test), migrations/env changes
(none expected), rollback notes (revert the feature commits; no data migration),
open risks/follow-ups (Pole Style gap, cart merge quirk if left).

#### Step 4 — Hand off. STOP.
> Handoff sent to QA Lead. QA executes per QA_PLAYBOOK: intake, contract extraction,
> Gate Q (pre-deployment, dev repo vs staging backend), Gate D (after promotion to the
> PROD mirror and then Vercel; Track B must be repeated on the production ACF options
> before Gate D can pass). Director drives manual steps one test at a time.

#### Step 5 — Findings return (routing)
- In-scope Critical / blocking-High → back to THIS TRM as checkpoint-gated fix → QA
  retests affected ACs + affected regression. Loop until the gate passes.
- Structural miss → Director takes to Architect for a FIX module; TRM pauses;
  RECOVERY.md updated.
- Out-of-scope / non-blocking → follow-up ticket candidates (L-QA-006). Module not
  reopened.
- PASS / PASS WITH FOLLOW-UP FINDINGS → proceed to close.

#### Step 6 — Closure
Closable when the QA Acceptance Report shows every AC passed (or Director-waived in
writing), Gate Q passed, Gate D passed where deployed, follow-ups routed. Director
writes the client report, attaches, closes. Artifacts → `examples/`; lessons →
TRM_PLAYBOOK + QA retrospectives.

**Stop Gate:** Claim package delivered; QA verdict received; findings routed; closure
criteria met. Awaiting Director release approval.
