# EVIDENCE ADDENDUM — Live Investigation of 2026-07-01/02 (Tony + Jarvis)

**Place in pack root, next to GUARDRAILS.md. Claudy: read this immediately after CLAUDE.md.**
**Status:** This addendum SUPERSEDES the root-cause description in the original ticket and
in CLAUDE.md v1.0. The fix scope has changed. Read before any edit.

---

## Headline (the corrected root cause)

The double-count has TWO faults in TWO layers, with TWO owners:

1. **App fault (Claudy's scope):** the thank-you page re-fires `purchase` on every
   mount/refresh/back-nav, because the guard is a React ref (resets on remount) and
   `latestOrder` is never cleared from localStorage.
2. **GTM container fault (Tony + Coach's scope, OUTSIDE this repo):** the container
   **overwrites the real transaction_id with a generated event_id** before sending to
   GA4. The app sends the real Woo order ID; GTM throws it away.

The revenue inflation Coach reported on June 27 is produced by the COMBINATION:
re-fire (fault 1) × fresh generated ID per fire (fault 2) = each duplicate lands in GA4
with a DIFFERENT transaction_id, defeating GA4's dedup, so each counts as a new sale.

The original ticket blamed the app for generating timestamp IDs. That is WRONG for this
codebase — the app sends the real order ID. The generated IDs are minted in GTM.

---

## Evidence log (labeled per recon doctrine)

- **E1 (EVIDENCE, code):** Single purchase dispatch path in the app:
  `ThankyouPageContent.tsx` → `useCheckoutTracking.trackPurchase` → dataLayer push.
  No direct gtag calls in src/. (Claudy Phase-0 recon.)
- **E2 (EVIDENCE, live):** App sends the REAL WooCommerce order ID as `transaction_id`.
  Observed live: orders 14873, 14874, 14875 (sequential Woo IDs) in the dataLayer's
  `ecommerce.transaction_id` during three test transactions on the local production build.
- **E3 (EVIDENCE, code + live):** Guard is `useRef(false)` — resets on every remount.
  `latestOrder` is written to localStorage at StripePaymentForm and never cleared
  anywhere. Both confirmed in code and by live repro.
- **E4 (EVIDENCE, live):** Every reload/back-nav of /thankyou pushes a NEW `purchase`.
  Confirmed three independent ways: dataLayer count per load, stacked GA4 `collect`
  network hits with Preserve log, and new purchase entries in the Tag Assistant timeline
  per reload. GA4 Realtime showed 4 purchases from 1 purchaser during testing.
- **E5 (EVIDENCE, GTM):** Exactly one GA4 purchase tag ("GA4 ee - purchase"), fired by
  the `purchase` Custom Event trigger (`ee - purchase`) — not by page URL. The separate
  "GA4 - Thank you" tag fires a `thank_you` event (Element Visibility on
  `.thank-you-message`) — NOT a purchase; cleared as a suspect.
- **E6 (EVIDENCE, GTM — the smoking gun):** The "ga4 - event settings" variable assigns
  `transaction_id` = `event_id`, where event_id is a generated compound timestamp
  (observed live: app pushed `14875`; GA4 event settings showed
  `transaction_id: "1782960176956_17829608237663"`). The clean ID goes in; the compound
  ID goes out.
- **E7 (EVIDENCE, GTM):** "ga4 - config settings" still carries
  `server_container_url: "https://fp.dockbloxx.com"` — the Stape server container
  (GTM-5R4BLJP2, "Go HighLevel by Stape", published by kevin@datasift, read-only to
  Tony). Stape is supposed to be retired, but the transport URL is still wired in.
- **E8 (EVIDENCE, GA4 production):** Monetization → Transactions (last 28 days): 169
  transactions, ALL with compound timestamp IDs — zero real Woo order numbers reach GA4.
  Twin rows `1781721029034_178172103143969` and `1781721029034_178172103143984`, both
  $930.00, share the identical left half: ONE real sale booked as TWO transactions.
  Revenue inflation confirmed in production data.
- **E9 (EVIDENCE, GTM):** The `ee - purchase` event fans out to FOUR tags: GA4, Google
  Ads Purchase, Meta Ads Purchase, TikTok PlaceAnOrder. Every duplicate fire pollutes
  all four platforms. Google Ads/Meta/TikTok have no transaction-ID dedup.
- **E10 (EVIDENCE, code + live):** The same remount bug re-runs customer registration
  (`user_signup` fired alongside purchase on the thank-you page). Same root pattern.

## Inference and gaps

- **INFERENCE (high confidence):** June 27 (5 GA4 transactions / $3,035 vs 4 real orders
  / $1,351) = fault 1 × fault 2. Same-ID duplicates would have self-healed; different-ID
  duplicates did not.
- **GAP-1:** WHY does the container map event_id → transaction_id? Possibly intentional
  client/server dedup design from the Stape era (kevin@datasift). Must be confirmed with
  Coach before removal — something may still expect it.
- **GAP-2:** Is fp.dockbloxx.com (Stape server container) still live and relaying?
  Production GA4 is receiving data, so the transport path works today — but if Stape is
  cancelled, this URL is a time bomb. Coach decision required.
- **QUESTION for Coach:** Approve the two container changes (below) and decide the Stape
  transport retirement path.

## Ownership split (this changes the guardrails)

- **Claudy (this repo):** app fix only — once-per-order lock + clear latestOrder.
  Claudy does NOT touch GTM and CANNOT fix the ID problem from the repo.
- **Tony (GTM web container, with Coach's sign-off):** (a) remap transaction_id in
  "ga4 - event settings" to the real dataLayer value (`ecommerce.transaction_id`) —
  this is what stops revenue inflation and satisfies the ticket's DoD; (b) resolve the
  Stape `server_container_url` (remove or confirm), as a separate, second change.
- Tony has edit rights on GTM-KVFXFKQ8 (workspace editable, Submit available). Live
  version is Coach's publish; changes go through a named workspace + Preview test +
  Coach approval before publish. GTM versioning allows one-click rollback.
