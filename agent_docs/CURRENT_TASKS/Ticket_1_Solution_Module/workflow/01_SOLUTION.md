# workflow/01_SOLUTION.md — Phase 1: The Fix (REWRITTEN v1.1 after live investigation)

**This file replaces the original 01_SOLUTION.md. The root cause changed — read
EVIDENCE_ADDENDUM.md first.**

**Enter this phase only after Tony approves.**

The fix is now TWO tracks with TWO owners. They are independent and both required:

- **Track A — App (Claudy, this repo):** stop the duplicate firing at the source.
- **Track B — GTM container (Tony + Coach, OUTSIDE this repo):** restore the real
  order ID as transaction_id. Claudy does not perform Track B and must not attempt to
  compensate for it in code.

Why both: Track B alone still lets duplicate fires pollute Google Ads, Meta, and TikTok
(no transaction dedup there) and keeps re-registering customers. Track A alone still
sends compound garbage IDs to GA4 — irreconcilable with WooCommerce orders — and fails
the ticket's own Definition of Done, which requires the REAL Woo order ID in DebugView.

---

## TRACK A — App fix (Claudy)

One change at a time. Checkpoint after each. No commits without Tony's review.

### Step A1 — Once-per-order lock that survives remount

- In `ThankyouPageContent.tsx`: before calling `trackPurchase(parsed)`, check
  `sessionStorage` for a marker keyed to that specific order ID (e.g. a key namespaced
  with `parsed.id`). If present, do not fire. If absent, fire, then write the marker.
- Replace the `hasTrackedPurchase` ref logic with this persistent check (the ref may be
  removed or kept as an in-view fast path — Claudy proposes, Tony decides).
- GUARDRAIL 7 stands: key strictly by order ID. A global flag would block a legitimate
  second order in the same session (validated by Test 1D).

**Checkpoint:** show Tony the lock logic and key shape. Await review.

### Step A2 — Clear the stored order after successful fire

- After `trackPurchase` fires (and after the page has what it needs to render the
  order summary — read into state FIRST, then clear), remove `latestOrder` from
  localStorage so a future mount finds nothing to re-send.
- Ordering matters: the page renders from React state (`setLatestOrder`), so clearing
  localStorage after state is set must not blank the on-screen summary. Verify by
  rendering, then refreshing: summary may legitimately show "no order details" after
  refresh, but NO purchase re-fires. Confirm with Tony that this UX trade
  (refresh loses the summary display) is accepted — it is the price of the clear, and
  the lock in A1 already protects even if the clear is deferred.

**Checkpoint:** show Tony the clear placement and the refresh behavior. Await review.

### Step A3 — Same-pattern guard for customer registration (report first)

- The identical remount bug re-runs `regCustomer` / `user_signup` (Evidence E10).
- Claudy REPORTS the proposed same-pattern fix (order- or email-keyed marker) and waits.
  This is adjacent scope: Tony decides whether it ships in this ticket or is logged for
  a follow-up. Do not implement without explicit approval.

### Track A explicitly does NOT include

- Any change to transaction_id construction — the app already sends the real Woo order
  ID (Evidence E2). Original Step "use real order ID" is confirmed a NO-OP. Do not
  touch it.
- Any GTM-compensating hacks in code (e.g. pushing extra ID fields). The ID fix is
  Track B, in the container.

---

## TRACK B — GTM container fix (Tony, with Coach's sign-off — NOT Claudy)

Recorded here so the pack holds the whole solution. Two changes, done as two separate
container versions, in this order:

### Step B1 — Restore the real transaction_id (the inflation stopper)

- In GTM web container GTM-KVFXFKQ8, create a named workspace (e.g.
  "fix-transaction-id").
- In the "ga4 - event settings" variable (Google Tag: Event Settings), the
  `transaction_id` parameter is currently mapped to the generated event_id. Remap it to
  the real dataLayer value — the `ecommerce.transaction_id` Data Layer Variable — or
  remove the override entirely so the ecommerce object's value passes through untouched.
- Preflight with Coach (GAP-1): confirm the event_id mapping isn't load-bearing for a
  client/server dedup path that something still expects.
- Test in GTM Preview against staging: place a test order, confirm the GA4 event now
  carries the REAL Woo order number as transaction_id.
- Coach approves → publish. Note the version number for rollback.

### Step B2 — Resolve the Stape transport (separate change, after B1 is verified)

- "ga4 - config settings" still points `server_container_url` at
  https://fp.dockbloxx.com (retired Stape relay, GAP-2). Decision owner: Coach.
- If Stape is truly retired: remove the server_container_url so GA4 sends direct, in its
  own workspace/version, verified in Preview (events still arrive in DebugView), then
  published. If the Stape subscription is still active and relaying, schedule removal
  with its cancellation.
- Do NOT bundle B2 with B1. Transport changes have blast radius; isolate them.

---

## Sequencing

1. Track A (Claudy, dev repo) — can start immediately after approval.
2. Track B1 (Tony + Coach, GTM) — needs Coach's sign-off; independent of A.
3. Validate BOTH together per 02_TESTING.md: one purchase per order, carrying the real
   Woo order ID, in DebugView on property 443304844.
4. Track B2 (Stape transport) — after B1 verifies clean.

## Stop Gate

> Track A implemented and reviewed step-by-step. Track B recorded and handed to Tony
> for the Coach conversation. Ready for Phase 2 validation once B1 is published.
