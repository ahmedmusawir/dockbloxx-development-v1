# README — Ticket 1 SM Update (v1.0 → v1.1)

Four files. Here's exactly where each goes inside
`agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/`:

1. **EVIDENCE_ADDENDUM.md** → pack ROOT (next to CLAUDE.md and GUARDRAILS.md). New file.
2. **01_SOLUTION.md** → REPLACES `workflow/01_SOLUTION.md`.
3. **GUARDRAILS.md** → REPLACES `GUARDRAILS.md` at pack root.
4. **CLAUDE_MD_PATCH.md** → pack ROOT temporarily; apply its four edits to CLAUDE.md
   (yourself, or tell Claudy "apply CLAUDE_MD_PATCH.md verbatim" and review), then
   delete the patch file.

Also: drop your investigation screenshots (the ga4-event-settings overwrite, the twin
$930 rows, the Tag Assistant purchase stack) into `examples/` — they are the visual
evidence for Coach and the future App Factory process.

## What changed and why (one breath)

The original pack assumed the app might be generating bad transaction IDs. The live
investigation proved the opposite: the app sends the real Woo order ID; the GTM
container overwrites it with a generated event_id, and that overwrite is what turns the
app's duplicate firing into inflated GA4 revenue. So the fix split into Track A (app —
Claudy: lock + clear) and Track B (GTM — you + Coach: remap transaction_id, then retire
the Stape transport URL). Claudy's scope narrowed; a real GTM work item was added that
no repo change can accomplish.

## Your next moves, in order

1. Drop the files in, apply the CLAUDE.md patch.
2. Take the evidence to Coach: the E6 screenshot (14875 in, compound ID out), the twin
   $930 rows (E8), and the two proposed container changes (B1 remap, B2 Stape URL).
   Get sign-off, confirm GAP-1 (was the event_id mapping intentional?) and GAP-2 (is
   fp.dockbloxx.com still relaying?).
3. Green-light Claudy on Track A (he reads the updated pack and proceeds step-by-step).
4. After B1 publishes, run Phase 2 testing — one purchase, real Woo order ID, DebugView,
   property 443304844 — and capture the evidence log.
