# Manual Smoke Test — Dockbloxx

Run before every production push. Approximately 5–10 minutes.

## Why this exists

E2E tests stop at the Stripe boundary. Integration tests cover Stripe-talking route handlers with mocked SDK. This checklist covers the gap: real Stripe sandbox, real webhook, real order — the things only a human can verify.

## Stripe Payment Flow

- [ ] Add product to cart
- [ ] Go to /checkout, fill billing/shipping
- [ ] Apply a coupon (verify discount appears)
- [ ] Submit order
- [ ] On Stripe page, use test card `4242 4242 4242 4242` (any future expiry, any CVC)
- [ ] Confirm redirect to /thankyou
- [ ] Verify order in WooCommerce admin: status `processing` or `completed`
- [ ] Verify Stripe webhook fired (Stripe dashboard → Events log → `payment_intent.succeeded` event present)

## Dealer Coupon Flow

- [ ] Open incognito tab
- [ ] Visit `/dealer-coupon/aqualand-marina/?coupon=aham10`
- [ ] Verify "Coupon Applied" message
- [ ] Add a product to cart
- [ ] Visit `/checkout` — confirm coupon is pre-applied with discount visible
- [ ] Try with no coupon param — verify error UI
- [ ] Try with invalid coupon code — verify error UI

## GHL Attribution Flow (CONDITIONAL)

- [ ] Check if Coach's attribution script is currently active (look for `link.dockbloxx.com/js/external-tracking.js` in rendered HTML on /shop)
- [ ] If ACTIVE: place order with UTM params (`/?utm_source=test&utm_campaign=smoke`), confirm order in Woo has `_coach_ghl_*` meta, confirm contact appeared in GHL
- [ ] If NOT ACTIVE: skip this section. Currently dormant on both dev and prod (as of 2026-05-09).

## Categories & Search Regression

- [ ] `/category/accessories` renders products
- [ ] `/search?q=dock` returns results
- [ ] `/shop` pagination — page 2 loads new products
- [ ] Click any product on `/shop` — navigates to product detail (was a flake source previously, verify post-script-removal)
