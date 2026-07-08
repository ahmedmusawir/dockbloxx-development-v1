# Recovery State

**Last touched:** 2026-07-08, session-start refresh.

**Branch:** `ticket-1-ga4-dedupe`. Tip commit: `8d89b74 2july2026 - GA4-GTM fix - Ticket 1 for coach`. **Working tree is clean** (nothing uncommitted).

**Standing operator instructions:**
- **No git commits, no pushes by Claudy** unless Tony explicitly grants for a specific action. Tony commits.
- **One change at a time.** Diff review before saving.
- **Plan Mode discipline** for anything beyond a one-line typo fix.
- **GUARDRAIL 10** (from Ticket 1): Claudy never touches GTM and never writes compensating code. Applies broadly — if a fix needs a container change, that's a separate track, not a repo compensation.
- **GUARDRAIL 11** (from Ticket 1): Adjacent findings are REPORTED, not fixed, unless Tony explicitly greenlights a ride-along.

---

## Active session

- **Session file:** `session_2026-07-08.md` (opened at start of day 2026-07-08 per CLAUDE.md protocol).
- **Immediate expected work:** Ticket 2. No pack landed yet — awaiting Tony's briefing.

---

## Ticket 1 status (as of last session close, 2026-07-02)

- **Track A — app fix, THIS REPO: COMMITTED (in `8d89b74`).**
  - A1 sessionStorage lock keyed by `parsed.id` in `src/app/(public)/thankyou/ThankyouPageContent.tsx`
  - A2 `localStorage.removeItem("latestOrder")` in the same block
  - A3 report-only handoff at `agent_docs/CURRENT_TASKS/Ticket_1_A3_followup_candidate.md`
  - Verified still in place at session-start 2026-07-08 (grep hit).
- **Track B — GTM container, OUTSIDE REPO (Tony + Coach): status unknown.** Ask Tony.
  - B1 remap `transaction_id` off `event_id` in "ga4 - event settings" variable of GTM-KVFXFKQ8.
  - B2 retire `server_container_url = fp.dockbloxx.com` from "ga4 - config settings" (separate change).
- **Phase 2 validation on staging: not yet performed.** Blocked on B1 publish. When B1 lands, follow `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/workflow/02_TESTING.md`. Validate ONLY against GA4 property **443304844** (never `495675373`). Fill `Ticket_1_Solution_Pack/templates/EVIDENCE_LOG.md`.
- **Ticket 1 CLOSES ONLY when:** Track A committed ✅ · B1 published (pending) · Phase 2 DebugView shows one purchase per order with real Woo order ID · EVIDENCE_LOG.md filled.

---

## Ticket 2 status (as of 2026-07-08 session open)

- **Nothing landed yet.** No pack in `agent_docs/CURRENT_TASKS/`. No brief from Tony.
- **Expected topic (INFERENCE):** WooCommerce attribution / UTM capture pipe — Ticket 1 pack's ORIENTATION.md called this out as "Pipe 2" and explicitly deferred it out of Ticket 1 scope. The branch name Tony pre-created for the 2026-07-01 session was `utm-task-1`, later renamed to `ticket-1-ga4-dedupe`; strong signal that UTM is on the roadmap. Original suspicion holds.
- **Branch strategy: OPEN QUESTION for Tony** — branch T2 off `main` (clean base) or off `ticket-1-ga4-dedupe` (if T1 still not merged and T2 can build on it)?

---

## Files sitting in `agent_docs/CURRENT_TASKS/`

- `Ticket_1_Solution_Pack/` — full pack v1.1 (CLAUDE.md v1.1, EVIDENCE_ADDENDUM.md, GUARDRAILS.md v1.1, README.md v1.1, workflow/, references/, templates/RECON_FINDINGS.md filled, templates/EVIDENCE_LOG.md empty pending Phase 2, examples/ empty).
- `Ticket_1_A3_followup_candidate.md` — report-only handoff for the `isCustomerRegistered` remount bug. ClickUp promotion is Tony's call, unresolved.

---

## Next session — start moves in this order

1. **Read `RECOVERY.md` (this file) → `session_2026-07-08.md` (today).** Prior session file `session_2026-07-01.md` (07-01 + 07-02 arc) has full T1 context if a deeper dive is needed.
2. **Wait for Tony's Ticket 2 briefing.** He signalled T2 is imminent when opening today's session.
3. **Ask Tony one bookkeeping question when appropriate** (don't lead with it, but surface before pivoting to T2 recon if not already known): "Ticket 1 Track B publish status — B1 landed in GTM, or still with Coach? Any Phase 2 validation to run today?"
4. **If T2 pack lands:** read in the order the pack's CLAUDE.md prescribes. Almost certainly `CLAUDE.md → GUARDRAILS.md → EVIDENCE_ADDENDUM.md (if any) → references → workflow/00_RECON.md`. Enter Plan Mode discipline for Phase 0.
5. **If Tony asks about A3:** the handoff report is at `agent_docs/CURRENT_TASKS/Ticket_1_A3_followup_candidate.md`. Includes ClickUp-ready ticket body embedded.

---

## Key patterns from Ticket 1 to carry into Ticket 2

- **Recon-first, gated.** Phase 0 read-only recon before any code. Fill a findings template. Stop for approval.
- **One change at a time.** No batching, no bundled hunks. Checkpoint at each.
- **Diff before saving.** Present the exact bytes before invoking `Edit`.
- **Plan Mode discipline.** Write plan to session file BEFORE displaying in CLI (disaster recovery).
- **EVIDENCE / INFERENCE / CLAIM / GAP / QUESTION labeling** on all findings. Cite file:line.
- **Track A / Track B split** when applicable — recognize when a fix has an in-repo half and an outside-repo half (container config, WP admin, third-party). Claudy never compensates for the outside-repo half.
- **Adjacent findings are REPORT-ONLY** unless Tony greenlights ride-along.
- **Validate the correct GA4 property** if any GA4 work — `443304844` only, never `495675373`.
