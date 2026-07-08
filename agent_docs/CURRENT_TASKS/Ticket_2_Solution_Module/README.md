# README — DockBloxx Ticket 2 Solution Module (for Tony)

Your module, not Claudy's. Quick orientation.

## What this is

A self-contained folder that turns Ticket 2 (capture UTM/click IDs → WooCommerce orders)
into a Claudy-ready mission, same shape as the Ticket 1 SM. Drop it in the dev repo,
point Claudy at `CLAUDE.md`, he runs recon first and stops, then the fix one step at a
time, then testing. You approve every gate.

## How you use it

1. Drop `DockBloxx_Ticket_2_Solution_Module/` into the dev repo (repo root or `_agent/`).
2. Tell Claudy: "Go read `DockBloxx_Ticket_2_Solution_Module/CLAUDE.md` and follow it."
3. He runs **Phase 0 recon** in Plan Mode, no edits, and fills TWO templates —
   RECON_FINDINGS and CONTRACT — then stops.
4. You review both. CONTRACT.md is the important one: it's the locked key map that
   prevents silent-empty attribution. Approve it before any code moves.
5. Approve → **Phase 1** fix, one change at a time, checkpoint each.
6. Approve → **Phase 2** testing: staging order from a tagged URL, confirmed via REST API.

## The lesson baked in from Ticket 1

Ticket 1's solution file froze assumptions that recon later broke, forcing a mid-process
rewrite. This module fixes that: every solution step that depends on an unknown is written
as **[CONFIRM: …]**, gated on recon. Recon fills the blanks BEFORE the solution locks. No
mid-process doc surgery this time.

## Definition of Done (decided)

Done = attribution captured on landing, persisted first-touch, written to the order as
native `_wc_order_attribution_*` meta, and READ BACK via the WooCommerce REST API. The WP
admin Orders-screen display is OUT OF SCOPE — your call, to avoid the known WP wall that
cost half a day before. Coach should be aware the closure rests on REST readback, not the
admin UI.

## What is NOT in scope

- Ticket 1's GA4 pipe. No analytics events, no GA4 enrichment with UTMs (possible future
  ticket, never this DoD).
- The WP admin attribution display.
- The old GHL/LeadConnector plumbing (report if seen, don't fix).

## After it's done

You write the Coach report, attach the REST evidence to ClickUp, close. Drop the finished
recon + evidence + filled CONTRACT into `examples/` to seed the App Factory SM process.
