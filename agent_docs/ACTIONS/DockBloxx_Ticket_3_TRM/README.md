# README — DockBloxx Ticket 3 TRM (for Tony)

Your module, not the Engineer's. Ticket: Pole Material (Metal / Wood) option under Pole
Shape Styles, carried to the WooCommerce order like Pole Style.

### Before kickoff (your Track B, do first)
1. On staging `wp-admin` → Options → Global Product: enter the display text for the two
   new fields (`metal` → `Metal`, `wood` → `Wood`) and Update. Empty text fields are GAP-1.
2. Confirm branch: `git status` clean on `product-option-1`, dev repo pointed at
   `dockbloxx.mystagingwebsite.com`.

### Run it
1. Drop this folder at `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/`.
2. Kickoff: "Claudy — read `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/CLAUDE.md`
   and follow it. Phase 0 recon in Plan Mode, read-only. Fill RECON_FINDINGS + CONTRACT
   (PROPOSAL), then STOP. First, confirm back the DoD, scope fences, write policy, and
   that Phase 2 ends in a QA handoff — not self-approval — in your own words."
3. Review his playback → approve recon start.
4. Review RECON_FINDINGS + CONTRACT. **Highest-leverage review = the CONTRACT table**
   (writer/reader identity per row) and the GAP list (sketched candidate answers).
   Headline answer 3 (wholesale rebuilds of `cartItem.variations`) is the one that bites.
5. Get external answers → fold into CONTRACT → mark FINAL → approve Phase 1.
6. Approve each Phase 1 diff.
7. Phase 2: Engineer self-verifies (EVIDENCE_LOG), derives ACCEPTANCE_SPEC from DoD +
   CONTRACT, assembles Claim Package, hands to the **QA Lead** (QA_PLAYBOOK.md governs).
   You drive manual QA one test at a time — the TEST BUY on staging is yours.
8. Findings route: in-scope → Engineer checkpoint-gated fix, QA retests; structural →
   Architect FIX module; out-of-scope → follow-up tickets.
9. Closure: QA Acceptance Report all-green (or written waivers), Gate Q + Gate D
   passed. You write the client report, approve release, close the ticket.
10. Drop artifacts into `examples/`; feed lessons to TRM_PLAYBOOK.md + QA retros.

### Where the decisions live
DoD + out-of-scope: CLAUDE.md §2 · Hard rules: GUARDRAILS.md · Key/value truths:
templates/CONTRACT.md · QA contract: templates/ACCEPTANCE_SPEC.md · Verdicts: QA
Acceptance Report (QA-owned).
