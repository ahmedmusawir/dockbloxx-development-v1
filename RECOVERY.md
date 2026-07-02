# Recovery State

**Last touched:** 2026-07-02, end-of-session close.

**Branch:** `ticket-1-ga4-dedupe` (renamed from `utm-task-1` on 2026-07-01). No commits added since `cb98563`. Everything since then sits in the working tree, uncommitted. Standing instruction: NO commits, NO pushes by Claudy. Tony's move.

**Active ticket:** Ticket 1 — GA4 `purchase` double-fire dedupe. Root cause split into two tracks per `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/EVIDENCE_ADDENDUM.md`.

---

## Where we are

**Track A — app fix in this repo: DONE.**
- **A1** — `hasTrackedPurchase` useRef removed. Replaced with order-ID-keyed sessionStorage lock in `src/app/(public)/thankyou/ThankyouPageContent.tsx`. Key: `` `ga4_purchase_fired_${parsed.id}` ``, value `"1"`. Applied 2026-07-02.
- **A2** — `localStorage.removeItem("latestOrder")` added inside the same guarded fire block, immediately after `trackPurchase(parsed)`. Applied 2026-07-02. Kills the cross-tab landmine (Tony's clincher during A1 review).
- **A3 (report only)** — `agent_docs/CURRENT_TASKS/Ticket_1_A3_followup_candidate.md` written. Documents the same-pattern `isCustomerRegistered` useRef bug (Evidence E10) with proposed fix mirroring A1, severity classification (low, no revenue impact), and ClickUp-ready ticket body embedded. Tony's call whether to promote it in ClickUp.

Verification: `npx tsc --noEmit` clean after A1 and after A2.

**Track B — GTM container fix (Tony + Coach, outside this repo): PENDING.**
- **B1** — In GTM-KVFXFKQ8, remap `transaction_id` in "ga4 - event settings" variable off the generated `event_id` (Evidence E6 smoking gun: app pushed `14875`; GA4 event settings emitted `transaction_id: "1782960176956_17829608237663"`). Preflight with Coach on GAP-1 (was the `event_id` mapping intentional for a Stape-era client/server dedup design?). Test in GTM Preview against staging. Coach approves → publish. Note version for rollback. **This is the inflation stopper — the ticket's DoD demands it.**
- **B2** — Retire `server_container_url = "https://fp.dockbloxx.com"` from "ga4 - config settings" (Evidence E7 — Stape server container GTM-5R4BLJP2, read-only to Tony, "supposed to be retired"). Separate workspace / version after B1 verifies. Do NOT bundle.

**Phase 2 validation: BLOCKED until Track B publishes.**
- Once Track B is published, follow `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/workflow/02_TESTING.md` on staging with GA4 DebugView. **Validate ONLY against GA4 property 443304844** ("www.dockbloxx.com - GA4" under Google Ads Account). NEVER against property `495675373` ("Dockbloxx Store" — misleading empty duplicate).
- Fill `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/templates/EVIDENCE_LOG.md` with screenshots + notes.
- GAP: Next.js staging URL not documented in repo. Tony provides on Phase 2 kickoff.

---

## Ticket closes when

1. Track A applied ✅ (done, this session)
2. Track B1 published in GTM (Tony + Coach, pending)
3. Phase 2 tests 1A/1B/1C/1D + regression all PASS on staging
4. EVIDENCE_LOG.md filled with proof
5. DebugView on property 443304844 shows exactly one `purchase` per order carrying the REAL Woo order number
6. Track B2 (Stape URL) resolved as a separate change (does not block ticket close if scheduled)

---

## Files sitting in working tree (uncommitted)

**Authored / modified by Claudy this session:**
- `src/app/(public)/thankyou/ThankyouPageContent.tsx` — A1 + A2 hunks
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/CLAUDE.md` — v1.0 → v1.1 patch applied
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/CLAUDE_MD_PATCH.md` — **deleted** post-application
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/templates/RECON_FINDINGS.md` — filled (Phase 0, 2026-07-01)
- `agent_docs/CURRENT_TASKS/Ticket_1_A3_followup_candidate.md` — new (A3 handoff)
- `session_2026-07-01.md` — session log (07-01 + 07-02)
- `RECOVERY.md` — this file

**Landed by Tony overnight (2026-07-02, context — not authored by me):**
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/EVIDENCE_ADDENDUM.md` — new
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/GUARDRAILS.md` — v1.1 (rules 9-11 revised/new)
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/README.md` — v1.1
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/workflow/01_SOLUTION.md` — v1.1 (Track A / Track B rewrite)

**Carryover from prior sessions (not touched this session):**
- `package-lock.json`

---

## Next session — start moves in this order

1. **Read `RECOVERY.md` (this file) → `session_2026-07-01.md` (bottom-up from the `### [12:00]` entry for freshest state) → today's `session_YYYY-MM-DD.md` if it exists.** Do NOT re-read the full pack unless Tony asks; the summary above is sufficient.
2. **Ask Tony one question:** "Track B publish status? (Coach signoff / B1 workspace tested / B1 published?)"
   - If **not yet**: standby. No app-side work pending. Confirm current `working tree` state matches what this file lists.
   - If **B1 published**: enter Phase 2. Read `Ticket_1_Solution_Pack/workflow/02_TESTING.md`. Ask Tony for the staging URL. Follow the test sequence. Fill `Ticket_1_Solution_Pack/templates/EVIDENCE_LOG.md`.
3. **If Tony has promoted A3 to a new ClickUp ticket** and wants Claudy to implement: read `agent_docs/CURRENT_TASKS/Ticket_1_A3_followup_candidate.md` (has the full proposed shape), then run Plan Mode against it as its own arc. This is a NEW ticket, not Ticket 1 scope.
4. **If Tony has done other GTM work in the meantime** and wants a diff-check between his notes and any observed behavior on the app side, do that as recon (read-only) first, don't jump into code.

---

## Standing operator instructions

- **No git commits or pushes by Claudy** for the entire duration of Ticket 1. Tony's move when he chooses.
- **One change at a time.** Diff review before saving.
- **Plan Mode discipline** for anything beyond a one-line typo fix.
- **GUARDRAIL 10:** Claudy never touches GTM and never writes compensating code for the container's behavior. If Track A is done and B is pending, Claudy STOPS. Ticket stays open until B publishes.
- **GUARDRAIL 11:** Adjacent findings are REPORTED, not fixed. A3 is done as report-only. Do not implement it in Ticket 1 scope without Tony's explicit "ride along."
