# README — Ticket 1 Solution Pack (for Tony)

This is your pack, not Claudy's. Quick orientation.

## What this is

A self-contained folder that turns Ticket 1 (GA4 purchase double-firing) into a
Claudy-ready mission. You drop it into the dev repo, point Claudy at the folder, and
`CLAUDE.md` tells him the whole story. He runs recon first and stops for you, then the
fix one step at a time, then testing. You approve every gate.

## How you use it

1. Drop `Ticket_1_Solution_Pack/` into the dev repo (somewhere Claudy can read it, e.g.
   repo root or an `_agent/` folder — your call).
2. Tell Claudy: "Go read `Ticket_1_Solution_Pack/CLAUDE.md` and follow it."
3. He reads the manager, the guardrails, the orientation, then runs **Phase 0 recon** in
   Plan Mode with no edits, and stops.
4. You review the filled `templates/RECON_FINDINGS.md`. This is the moment of truth — it
   tells you what production actually does versus what we assumed.
5. Approve, and he moves to **Phase 1** — the fix, one change at a time, checkpoint each.
6. Approve, and he runs **Phase 2** — DebugView validation and the evidence log.

## The two-stage thing (why the solution file has "confirm against recon" notes)

The fix in `01_SOLUTION.md` is a strong draft, not frozen. A few of its steps depend on
what recon finds (which layer sends purchase, order ID vs order number). Those points are
marked. After recon, you and Claudy finalize them from evidence. This is deliberate — we
never freeze an assumption before we've checked it.

## After it's done

You generate the Coach report yourself, attach the evidence to ClickUp, close the ticket.
The pack stays manual on the handoff side, by your call. The `examples/` folder is where
you can drop the finished recon + evidence artifacts if you want this pack to seed the
future App Factory ticket-resolution process.

## What is NOT in scope here

Ticket 2 (WooCommerce attribution). This pack is GA4 purchase accuracy only. Keeping them
separate is the whole point.
