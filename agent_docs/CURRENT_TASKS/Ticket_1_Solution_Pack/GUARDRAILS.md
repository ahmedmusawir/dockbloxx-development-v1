# GUARDRAILS.md — Ticket 1 (hard rules)

These are non-negotiable unless Tony explicitly overrides. Read before recon. They exist
to stop fast, confident mistakes.

## 1. Recon changes nothing

Phase 0 is read-only. No edits, no deletions, no "small tidy while I'm here." You map and
report. Editing begins only after Tony approves the recon findings.

## 2. Removal is approval-gated

If you discover `purchase` firing from more than one place — a duplicate GTM tag, a second
trigger, a direct `gtag` call alongside the dataLayer push — **do not remove anything.**
Report both sources, state which one you believe should remain and why, and wait for Tony's
decision. Accidentally removing the real production GA4 path is a worse outcome than the
double-fire.

## 3. Current behavior is a hypothesis, not a fact

Prior notes suggest the code may already use the real order ID and may already have a
guard. Coach's GA4 evidence from June 27 suggests non-stable IDs still reached GA4. These
can both be true if production differs from this repo, or if a second layer is involved.
**Do not assume either.** Recon proves which layer currently sends `purchase` and what ID
it carries.

## 4. Order ID vs order number

WooCommerce can expose an internal order ID and a displayed order number, and a custom
order-number plugin can make them differ. Confirm whether they are the same on this site.
Use the **stable identifier returned at order creation**, and document exactly which field
you used.

## 5. Validate against the correct GA4 property only

All validation happens in property **443304844** ("www.dockbloxx.com - GA4"). Never in the
duplicate **495675373** ("Dockbloxx Store"). If DebugView shows nothing, first confirm you
are in the right property before concluding the fix failed.

## 6. Staging is the proof surface, not local dev

If analytics are gated behind production mode, local dev may fire nothing. Do not use local
dev as final proof. Validate from **staging** using GA4 DebugView. Confirm in recon where
the analytics guard sits and where events actually fire.

## 7. The lock must be keyed by order ID

A once-per-order lock keyed too broadly (a global "purchase fired" flag) will block a
legitimate second order in the same session. Key the marker strictly to the specific order
ID. This is explicitly tested (see Phase 2, second-order test).

## 8. Do not touch checkout behavior

Billing, shipping, line items, payment, coupon logic — off-limits. This ticket hardens
tracking and dedupe only. Append to existing files where possible; avoid new files unless
justified.

## 9. Scope boundary — GA4 only

This ticket is GA4 purchase accuracy. It does **not** include WooCommerce attribution or
UTM capture (that is Ticket 2). If you find attribution issues, note them for Tony and move
on. Do not fix them here.
