# workflow/02_TESTING.md — Phase 2: Validation & Evidence

**Enter this phase only after the fix is implemented and approved.**

**Goal:** Prove, on staging, in GA4 property `443304844` DebugView, that `purchase` fires
exactly once per order with the real order number, and survives refresh and back-navigation
— then capture the evidence for ClickUp. Fill `templates/EVIDENCE_LOG.md` as you go.

---

## Preflight (Test 0)

Before placing any order, confirm:

- Correct build is live on **staging**.
- You are in GA4 property **443304844**, not the duplicate `495675373`.
- GTM container loads (if GTM is the chosen path per recon).
- **No network calls go to `stape.io`** or an old server container.
- Basic checkout still works: product → cart → checkout.
- Debug mode is enabled for your staging session so DebugView will show your events
  (e.g. the GA Debugger extension, or the app's debug flag on staging).

---

## Test 1A — Normal purchase (fires once, real ID)

1. Open staging in a clean / incognito browser.
2. Open GA4 DebugView (property 443304844).
3. Place one test order. Record the WooCommerce order ID/number.
4. On the thank-you page, find the `purchase` event in DebugView.

**Pass:** exactly one `purchase` event; `transaction_id` equals the real Woo order
number; `value` equals the order total; `currency` correct; `items` present.

## Test 1B — Refresh protection

1. Stay on the thank-you page after the purchase.
2. Refresh the page.
3. Watch DebugView.

**Pass:** no second `purchase` fires.

## Test 1C — Back / forward protection

1. Navigate away from the thank-you page.
2. Use browser back/forward to return.
3. Watch DebugView.

**Pass:** no duplicate `purchase` fires.

## Test 1D — Second legitimate order (lock is per-order, not global)

1. Same browser session.
2. Place a second, different test order.
3. Watch DebugView.

**Pass:** order 1 fired once, order 2 fires once, order 2 is not blocked by order 1's
lock. (This is the test that proves GUARDRAIL 7.)

---

## Regression sanity

Run one full checkout and confirm normal commerce is unchanged: product loads, cart
updates, coupon works, shipping saves, payment works, order is created, thank-you loads,
and GA4 shows exactly one purchase. Delete test orders from the backend afterward so they
do not pollute reports.

---

## Evidence to capture (fill EVIDENCE_LOG.md)

- DebugView screenshot showing a single `purchase`.
- Event-parameters screenshot showing `transaction_id`.
- WooCommerce order screenshot showing the same order ID/number and total.
- Note/screenshot proving refresh did not fire a duplicate.
- Note/screenshot proving back-navigation did not fire a duplicate.
- Note proving the second order fired once and was not blocked.

## Stop Gate

> Validation complete on staging against property 443304844. One purchase per order, real
> order number, refresh/back safe, second order unaffected. Evidence log filled. Ticket is
> ready for Tony to write the Coach report, attach evidence to ClickUp, and close.
