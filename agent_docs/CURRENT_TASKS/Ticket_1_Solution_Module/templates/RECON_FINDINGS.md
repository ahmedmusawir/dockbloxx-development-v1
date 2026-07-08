# templates/RECON_FINDINGS.md — Phase 0 Findings (2026-07-01)

Labels: **EVIDENCE** (observed in code/config), **INFERENCE** (reasoned from evidence),
**CLAIM** (stated elsewhere, unverified), **GAP** (unknown, needs access or a test),
**QUESTION** (for Tony/Coach).

Branch under recon: `ticket-1-ga4-dedupe` (tip `cb98563`). No files edited during recon.

---

## Headline answers

- **Which layer currently sends `purchase`?**
  **GTM dataLayer only.** No direct `gtag()` call exists in `src/`. Single call site:
  `src/app/(public)/thankyou/ThankyouPageContent.tsx:42` → `useCheckoutTracking.trackPurchase(parsed)` →
  `pushToDataLayer({event: "purchase", …})` in `src/lib/analytics.ts:33`. *(EVIDENCE)*

- **What `transaction_id` does it carry today?**
  **The real WooCommerce order ID** (`order.id`, i.e. `orderResponse.id` returned from
  `POST /api/place-order`, which proxies to `POST /wp-json/wc/v3/orders`). Not a timestamp,
  not random, not client-generated. See `src/hooks/useCheckoutTracking.ts:50`
  (`transaction_id: order.id`) and `src/components/checkout/payments/StripePaymentForm.tsx:117`
  (`id: orderResponse.id`). *(EVIDENCE)*

- **Is there a second dispatch source?**
  **In the app code: NO.** `trackPurchase` is defined once (`useCheckoutTracking.ts:44`) and
  called once (`ThankyouPageContent.tsx:42`). No other `event: "purchase"` push, no `gtag`
  fallback. *(EVIDENCE)*
  **In GTM container config: UNKNOWN.** A duplicate GA4 tag or a URL-based trigger on
  `/thankyou` inside GTM-KVFXFKQ8 could add a second fire; the repo cannot see the
  container. *(GAP — needs Tony's GTM access; see § A below.)*

---

## A. Deployment path

- **GA4 fed via GTM / direct gtag / both:**
  **GTM only.** *(EVIDENCE — `grep -rn "gtag" src/` returns zero hits; the only tracking
  utility, `src/lib/analytics.ts`, pushes to `window.dataLayer` for GTM to pick up.)*

- **GTM loader location(s) (app / WP / both), which loads on the storefront:**
  The GTM `<script>` HTML is **not hardcoded in the Next.js app**. It is fetched at
  server-render time from the WordPress ACF options endpoint
  `ACF_REST_OPTIONS = /wp-json/acf/v3/options/options`
  (`src/constants/apiEndpoints.ts:4`, `src/services/trackingSeoServices.ts:5-19`) and
  injected in `src/app/layout.tsx:48-65` as three chunks:
    - `header` → ACF field `tracking_scripts_header` → injected as `<Script id="moose-tracker-head" strategy="lazyOnload">` in `<head>` (layout.tsx:61-65).
    - `body` → ACF field `tracking_scripts_body` → injected as `<div id="moose-tracker-body" dangerouslySetInnerHTML>` (layout.tsx:79-82). Typically the GTM `<noscript><iframe>` fallback.
    - `footer` → ACF field `coach_attribution_scripts_footer` → injected as `<Script id="coach-attribution" strategy="lazyOnload">` (layout.tsx:85-89). This is Ticket-2 UTM/attribution script, out of scope for this ticket.
  Response is `revalidate: 3600` (1 hour cache). *(EVIDENCE)*
  So the GTM container-loading `<script>` for `GTM-KVFXFKQ8` lives in **WordPress admin**,
  under ACF options → "tracking_scripts_header". If it needs to change, it changes there,
  not in the Next.js repo. *(EVIDENCE / INFERENCE — I cannot see the ACF field's actual
  value from the repo, but the field name and injection wiring are unambiguous.)*

- **GA4 Event tag triggered by `purchase` in GTM (yes/no, details):**
  **GAP.** Not visible from the repo. Tony's GTM admin access is required to open the
  container and confirm exactly one GA4 Event tag exists for the `purchase` custom event,
  and to verify its `transaction_id` mapping.

- **Thank-you-page URL trigger present (yes/no):**
  **GAP.** Same reason as above. A URL-match trigger on `/thankyou` inside GTM could
  independently send `purchase` regardless of the app's dataLayer push. This is one of the
  two most plausible sources of double-fire that I cannot rule out from the repo alone. It
  is exactly the kind of second source GUARDRAIL 2 warns about. *(QUESTION for Tony.)*

- **Same event sent to both 443304844 and 495675373 (yes/no):**
  **GAP.** Same reason — the tag's destination property is set in GTM, not in the repo.
  Per CLAUDE.md and GUARDRAIL 5, validation happens only against `443304844`. Whether
  `495675373` also receives events is a GTM-admin question. *(QUESTION for Tony.)*

## B. Purchase source in the app

- **Thank-you / confirmation component (file):**
  `src/app/(public)/thankyou/ThankyouPageContent.tsx` (client component, `"use client"` at
  line 1). *(EVIDENCE)*

- **Exact dispatch location (file:line):**
  `src/app/(public)/thankyou/ThankyouPageContent.tsx:42` — `trackPurchase(parsed)`, inside
  a `useEffect(() => { … }, [])` (line 23 open, line 74 close), guarded by a `useRef`.
  *(EVIDENCE)*

- **Tracking hook / trackEvent utility (file):**
  - `src/hooks/useCheckoutTracking.ts` — defines `trackPurchase(order: OrderSummary)`
    (line 44), calls `trackEvent({event: "purchase", ecommerce: {…}, user_data: {…}})`
    (line 47-73).
  - `src/lib/analytics.ts` — defines `pushToDataLayer` (line 30), which pushes to
    `window.dataLayer` (line 33) and logs `[GTM] dataLayer push:` via `console.debug` (line 34).
    `trackEvent` is a re-export alias for `pushToDataLayer` (line 46). *(EVIDENCE)*

- **Fires on mount / effect (yes/no); would re-run on refresh/back (yes/no):**
  **Yes on mount** — the `useEffect(..., [])` runs once per mount, and on every mount the
  guard `hasTrackedPurchase.current` starts at `false` because it is a React `useRef`
  (component-scoped, discarded on unmount).
  **Yes on refresh** — a hard refresh unmounts and remounts the component; the ref resets;
  the effect runs again. *(INFERENCE — standard React lifecycle behavior, confirmed by the
  code shape.)*
  **Yes on back-navigation** — the App Router typically unmounts route components on
  back-nav (no bfcache-driven state restoration for a client component that reads
  `localStorage` in its effect). *(INFERENCE — no `pageshow`/`bfcache`/`persisted` handling
  exists anywhere in `src/`; `grep` returned only unrelated blog/shipping "persist" comments.)*

## C. Transaction ID

- **Value passed as `transaction_id` and its source (file:line):**
  `transaction_id: order.id` at `src/hooks/useCheckoutTracking.ts:50`. `order` is the
  `OrderSummary` object built from `orderResponse` returned by `createWoocomOrder` and
  passed to `trackPurchase` as `parsed` (the object read back from
  `localStorage.getItem("latestOrder")` in `ThankyouPageContent.tsx:36-42`). `order.id` is
  set from `orderResponse.id` at `src/components/checkout/payments/StripePaymentForm.tsx:117`.
  `orderResponse` is the JSON returned by `POST /api/place-order`
  (`src/services/orderServices.ts:15-32`), which proxies to WooCommerce's
  `POST /wp-json/wc/v3/orders`. *(EVIDENCE)*

- **Real Woo order ID/number or generated:**
  **Real WC order ID.** Not generated, no timestamp, no client-side value. *(EVIDENCE)*

- **Order ID vs order number the same on this site (yes/no; custom plugin?):**
  **In the code path: yes** — `order.id` is used everywhere, and there is no reference to
  `order_number`, `orderNumber`, or any custom-order-number plugin in `src/`
  (`grep -rn -i "order_number\|orderNumber" src/` returned zero hits). *(EVIDENCE)*
  **On the WP install itself: GAP.** If a plugin like "WooCommerce Sequential Order
  Numbers" is installed on the WP backend, the DISPLAYED order number in the WC admin can
  differ from the internal `id` returned by the REST API. That would mean GA4 currently
  reports the internal ID while the customer-facing order number is different — a
  reconciliation nuisance but not a double-fire cause. *(QUESTION for Tony: is such a
  plugin installed on staging or prod WP? If yes, we may want to prefer the sequential
  number for readability; per GUARDRAIL 4 we document exactly which field is used either
  way.)*

## D. Existing guard

- **Guard present (yes/no), what storage (ref / var / session / local):**
  **Yes — a single React `useRef`.**
  `src/app/(public)/thankyou/ThankyouPageContent.tsx:18` — `const hasTrackedPurchase = useRef(false);`
  Checked at line 40; set to `true` at line 41 immediately before firing at line 42.
  *(EVIDENCE)*
  No sessionStorage- or localStorage-based dedupe marker exists anywhere in `src/` for
  purchase events (`grep -rn "sessionStorage" src/` shows only UTM/attribution reads under
  `src/lib/attribution.ts` — Ticket 2, out of scope; and no purchase-marker key).
  *(EVIDENCE)*

- **Survives refresh (yes/no); survives back-navigation (yes/no):**
  **Neither.** A React ref is component-scoped: unmount discards it, remount reinitialises
  it to `useRef(false)`. Refresh is a full remount (browser reloads all React state) and
  back-navigation is also a remount in the App Router (no bfcache restoration for a client
  component reading localStorage in an effect). *(INFERENCE — standard React lifecycle;
  no code contradicts.)*
  So the guard prevents a re-fire only within a single continuous mount (e.g. React 18
  StrictMode double-invocation in dev) — it does NOT prevent a re-fire caused by refresh
  or back-nav. This is exactly the "guard resets on remount" mechanism described in the
  pack's ORIENTATION.md.

## E. Order in client storage

- **How the finished order is held (file, key):**
  `localStorage.setItem("latestOrder", JSON.stringify(orderObject))` at
  `src/components/checkout/payments/StripePaymentForm.tsx:141` (written just after Stripe
  order-creation succeeds, before the payment intent is confirmed). Read back at
  `src/app/(public)/thankyou/ThankyouPageContent.tsx:32` via
  `localStorage.getItem("latestOrder")` and parsed into `latestOrder` state. *(EVIDENCE)*

- **Re-read on remount and could re-trigger purchase (yes/no):**
  **Yes.** Every mount of `ThankyouPageContent` re-reads `latestOrder` from
  `localStorage`. If the key is still present (see next point), the useEffect reaches
  line 40, sees the freshly-reset ref (`false`), and fires `trackPurchase(parsed)` again.
  *(INFERENCE from EVIDENCE — the code path is direct.)*

- **When/if cleared:**
  **Never, in code.** `grep -rn 'latestOrder' src/` returns only the write (StripePaymentForm.tsx:141)
  and the reads on the thank-you page. No `removeItem("latestOrder")` call anywhere.
  The order persists in `localStorage` indefinitely (until the user clears their browser
  storage or a NEW order overwrites the key with `setItem`). *(EVIDENCE)*

- **This is the double-fire mechanism (INFERENCE, high confidence):**
  Ref-based guard + never-cleared localStorage entry = every refresh or back-nav to
  `/thankyou` after a completed order fires `purchase` again with the same real
  `transaction_id`. The count in GA4 grows without the customer doing anything new.

## F. Validation surface

- **Production-mode analytics guard location (file):**
  `src/hooks/useCheckoutTracking.ts:45` — `if (process.env.NODE_ENV !== "production") return;`
  This early-returns from every tracking function in the hook (`trackBeginCheckout` L24,
  `trackPurchase` L45, `trackAddShippingInfo` L86, `trackAddPaymentInfo` L107).
  Note it's inside the tracking hook, NOT inside `pushToDataLayer` — `src/lib/analytics.ts`
  itself has no NODE_ENV guard. So other callers of `pushToDataLayer` (product tracking,
  signup tracking, etc.) may or may not fire in dev depending on their own guards; not
  relevant to this ticket. *(EVIDENCE)*

- **Staging URL:**
  **Next.js staging URL: GAP.** `.env.local.example` shows `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  (dev default) and `NEXT_PUBLIC_BACKEND_URL=https://dockbloxx.mystagingwebsite.com`
  (staging WP backend). The Next.js dev-staging deployment URL itself is not in the repo.
  *(QUESTION for Tony: what's the URL of the Next.js staging deployment where DebugView
  validation will happen? Vercel preview URL, dedicated dev subdomain, etc.)*

- **DebugView reachable on 443304844 (yes/no):**
  **Cannot verify from repo.** Access to the GA4 property is a Tony/Coach concern.
  *(GAP — will be resolved by Tony opening DebugView during Phase 2.)*

---

## GAPs needing Tony's access or a staging test

- **GTM container `GTM-KVFXFKQ8` inspection.** Need to open GTM admin and confirm:
  1. Exactly one GA4 Event tag exists for the `purchase` custom-event trigger.
  2. That tag's `transaction_id` field maps directly from `{{dlv:ecommerce.transaction_id}}`
     (or equivalent) — not from a URL param, timestamp, or GTM-side generation.
  3. **No URL-based trigger** on `/thankyou` also fires the tag (or another tag).
  4. No duplicate GA4 tag routes to property `495675373` in addition to `443304844`.
  This is the single largest unresolved question and is required to make GUARDRAIL 2's
  "removal is approval-gated" decision correctly.

- **WP admin inspection.** Need to confirm no "WooCommerce Sequential Order Numbers" (or
  similar) plugin is installed. If it IS installed, decide whether GA4 should carry the
  displayed sequential number instead of the internal REST `id` (readability vs
  status-quo).

- **Coach's June 27 GA4 evidence.** Coach reported that duplicates carry different,
  non-stable `transaction_id`s. The app-side code always sends the stable `order.id`.
  Something between the app and GA4 must be mutating the ID, OR a second dispatch source
  (GTM tag) is sending its own `transaction_id`. This is what the GTM inspection above
  will resolve. Without it, the "different IDs" is unexplained by the app code alone.

- **Next.js staging URL** for Phase 2 DebugView testing (Vercel preview vs dedicated
  staging).

## QUESTIONS for Tony / Coach

1. **GTM admin access:** can you open the container and either (a) share screenshots of
   the `purchase` GA4 tag config + all triggers, or (b) walk it while I take notes? See
   GAP list above for the four checks needed.
2. **Sequential order-number plugin on WP:** installed on staging? On prod? If yes, do we
   prefer to send the display number vs. the REST `id`?
3. **Coach's screenshot of the "different transaction_id" evidence:** can you attach it to
   the RECON so we know exactly what non-stable IDs looked like? That will tell us fast
   whether GTM is the source (URL-derived, timestamp, or per-tag override) or something
   else.
4. **Staging URL** for Phase 2 DebugView validation.
5. **Duplicate GA4 property `495675373`:** should we leave it alone entirely, or is
   confirming "no data reaches it" part of ticket scope?

---

## Where I stopped

- No files edited. No commits. No pushes. (Per your instruction.)
- Task list #1-#6 completed; #7 (this file) in progress → about to be marked complete.
- Awaiting your approval on these findings before proceeding to `workflow/01_SOLUTION.md`
  Step 1. Per GUARDRAIL 2, I will NOT touch anything in GTM or attempt to remove any
  suspected duplicate source without your explicit go-ahead after the GAPs above are
  closed.
