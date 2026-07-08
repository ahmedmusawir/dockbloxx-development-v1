# workflow/02_TESTING.md — Phase 2: Validation (REST API readback)

**Enter only after the fix is implemented and approved.**

**Goal:** Prove, on staging, that a UTM-tagged order carries the attribution onto the
WooCommerce order and that the SAME values read back through the WooCommerce REST API.
Fill `templates/EVIDENCE_LOG.md` and validate `templates/CONTRACT.md` end-to-end.

**Reminder:** the WP admin Orders-screen display is OUT OF SCOPE. REST readback is the
proof. Do not test or chase the admin display.

---

## Preflight (Test 0)
- Correct build live on staging.
- WooCommerce REST credentials (read) ready for `dbp.dockbloxx.com`.
- Basic checkout still works: product → cart → checkout.

## Test 1 — Capture on landing
- Open staging in a clean/incognito browser via a tagged URL, e.g.:
  `?utm_source=facebook&utm_medium=paid_social&utm_campaign=test_campaign&utm_content=test_ad&utm_term=test_kw&gclid=test-gclid-123&fbclid=test-fbclid-123`
- Before checkout, inspect browser storage.
- **Pass:** all values present under the CONTRACT.md keys (utm_source=facebook, medium,
  campaign, content, term, gclid, fbclid, landing_page).

## Test 2 — First-touch persistence
- From the tagged entry, navigate product → cart → checkout, then re-check storage.
- **Pass:** original attribution still present, unchanged.

## Test 3 — First-touch not overwritten mid-visit
- Enter with facebook UTMs; later hit an internal URL with different (e.g. google) UTMs.
- **Pass:** stored attribution still reads the ORIGINAL facebook/paid_social.

## Test 4 — Order metadata forwarding (the core DoD test)
- Complete the order from the tagged session. Record the Woo order ID.
- Fetch the order via WooCommerce REST API: `GET /wp-json/wc/v3/orders/{id}`.
- **Pass:** the response `meta_data` contains the native attribution keys with the tagged
  values, plus gclid/fbclid:
  - `_wc_order_attribution_utm_source` = facebook
  - `_wc_order_attribution_utm_medium` = paid_social
  - `_wc_order_attribution_utm_campaign` = test_campaign
  - `_wc_order_attribution_utm_content` = test_ad
  - `_wc_order_attribution_utm_term` = test_kw
  - `_wc_order_attribution_source_type` = (accepted value)
  - gclid = test-gclid-123, fbclid = test-fbclid-123

## Test 5 — Direct-traffic fallback
- Clean/incognito, NO UTMs, place an order, fetch via REST.
- **Pass:** sane default per the chosen contract (e.g. source_type = direct/typein). No
  crash, no empty/broken payload.

## Regression sanity
- One full checkout: product loads, cart updates, coupon works, shipping saves, payment
  works, order created, thank-you loads. Checkout behavior unchanged. Delete test orders
  afterward.

---

## Evidence to capture (fill EVIDENCE_LOG.md)
- The tagged staging URL used.
- Browser-storage screenshot showing captured keys.
- Woo order ID.
- REST API response excerpt showing the attribution meta_data.
- CONTRACT.md validated end-to-end (capture key → storage → reader → Woo meta → REST field
  all consistent for at least one full field).
- Note: WP admin attribution display intentionally out of scope for this closure.

## Stop Gate

> Validation complete on staging. Attribution captured, persisted first-touch, written to
> the Woo order as native meta, and confirmed via REST API readback. CONTRACT validated.
> Evidence logged. Ticket ready for Tony to write the Coach report and close.
