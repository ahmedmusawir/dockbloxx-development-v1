# workflow/01_SOLUTION.md — Phase 1: The Fix (one change at a time)

**Enter this phase only after Tony approves the recon findings.**

**Goal:** Make `purchase` fire exactly once per completed order, stamped with the real
WooCommerce order number, from a single dispatch source. Implement one change at a time,
stopping for review after each.

Steps marked **[CONFIRM AGAINST RECON]** depend on what Phase 0 found. Finalize them from
the recon findings before implementing — do not implement the draft assumption blindly.

---

## Step 1 — Transaction ID = real WooCommerce order number

**[CONFIRM AGAINST RECON]** Using the exact stable identifier recon confirmed (order ID vs
order number, per GUARDRAIL 4):

- Set the `purchase` event's `transaction_id` to that real order identifier.
- Remove any timestamp, random, or client-generated value if recon found one in use.
- If recon confirmed the real order ID is already used, record that and skip the edit —
  do not change it just to change it.

**Checkpoint:** Show Tony the before/after of the `transaction_id` source. Await review.

---

## Step 2 — Once-per-order lock (survives refresh and back-navigation)

- When `purchase` is about to fire, build a marker key from the specific order ID
  (for example a `sessionStorage` key namespaced with the order ID).
- Before firing, check for that marker. If present, do not fire. If absent, fire, then
  write the marker.
- The marker must persist across refresh and back-navigation within the session, so the
  same order can never fire twice.
- **GUARDRAIL 7:** key strictly by order ID. Do not use a global "purchase fired" flag —
  it would block a legitimate second order in the same session.

**[CONFIRM AGAINST RECON]** If recon found an existing guard (e.g. a React ref) that resets
on remount, replace or supplement it with this order-ID-keyed persistent marker rather than
leaving both.

**Checkpoint:** Show Tony the lock logic and the storage key shape. Await review.

---

## Step 3 — Single dispatch source

**[CONFIRM AGAINST RECON]** Based on recon's dispatch-path finding:

- If `purchase` fires from exactly one place, confirm it and move on.
- If recon found a second source (duplicate GTM tag, extra URL trigger, or a direct `gtag`
  alongside the dataLayer push): **do not remove anything yet.** Per GUARDRAIL 2, present
  both sources and your recommendation to Tony, and wait for his decision on which stays.
  Only after his decision, apply the agreed removal as its own isolated change.

**Checkpoint:** Confirm to Tony that purchase now dispatches from exactly one source.
Await review.

---

## Constraints throughout

- Append to existing files where possible. Avoid new files unless justified.
- Do not touch billing, shipping, line items, payment, or coupon logic (GUARDRAIL 8).
- No commits. Tony reviews and commits.
- One change at a time. Do not batch Steps 1–3 into a single edit.

## Stop Gate

> Fix implemented across the approved steps, each reviewed. Purchase now uses the real
> order number, is locked once-per-order, and dispatches from a single source. Ready for
> Phase 2 validation. Awaiting Tony's go.
