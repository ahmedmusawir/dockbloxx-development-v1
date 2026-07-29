# Ticket 2 — Phase 1 Implementation Plan (LOCKED-FINAL contract)

## Context

Every DockBloxx order logs `source_type = direct` with blank UTM fields: in a headless
Next.js checkout, WooCommerce's built-in Order Attribution script never runs, and Coach's
old footer script was pulled (it raced E2E). The reader (`src/lib/attribution.ts`) and the
forward (`src/lib/orderTransform.ts`) survive, but capture is gone and the forward writes
dead `_coach_ghl_*` keys plus one buggy native field.

This phase implements the fix per `workflow/01_SOLUTION.md` against the now **LOCKED-FINAL**
`templates/CONTRACT.md`: (1) re-introduce first-touch capture as an E2E-safe React provider,
(2) reconcile the reader keys, (3) repoint the forward to native `_wc_order_attribution_*`
meta + four click IDs, (4) set a direct-traffic fallback. DoD = values read back through the
WooCommerce REST API (Phase 2). **Metadata only — checkout behavior untouched.**

**Operator decisions locked this session:** Coach-parity classification (synthesize
utm_source/utm_medium from referrer when untagged); provider at `src/components/providers/`;
CAT params ship together; add a Jest unit test for the pure logic.

## Approach (one change at a time — checkpoint after each step)

### Step 1 — Capture (E2E-safe React provider) + retire old script
**CREATE `src/lib/attributionCapture.ts`** — pure, DOM-free logic (unit-testable):
- `classifyReferrer(referrer, currentHost)` — ports Coach's `classifyTraffic`
  (`docs/wp-plugins/attribution-script.md:6-41`): returns `{utm_source, utm_medium}` or null.
  Lists: AI → `ai-referral`, Social (twitter-normalized) → `social`, Search → `organic`,
  else → `referral`; null on empty/internal referrer.
- `resolveUtmCat(params)` — per-field `utm_x ?? cat_x` (UTM wins) for the 5 utm/cat twins.
- `deriveSourceType(hasUtmOrCat, classification)` → enum: `utm` if any utm/cat present; else
  `organic` if classification medium is `organic`; else `referral` if classified (social/
  ai/referral); else `typein`. **Never blank.**
- `buildAttribution(search, referrer, pathname, host)` — orchestrates the above into the full
  key map. Direct case (no params, no referrer) → Coach-parity `utm_source='direct'`,
  `utm_medium='(none)'`, `source_type='typein'`. Does NOT port Coach's `utm_campaign=
  '(organic/referral)'` placeholder (noise — flag at checkpoint if Tony wants it).

**CREATE `src/components/providers/AttributionProvider.tsx`** — `"use client"`, renders
`null`, single mount-only `useEffect`. Calls `buildAttribution(window.location.search,
document.referrer, window.location.pathname, window.location.hostname)`, then **strict
first-touch** persist (GUARDRAIL 3): `if (sessionStorage.getItem(k) == null && v) setItem(k, v)`
for all keys incl. `coupon` (keeps `ApplyCoupon.tsx` QR autofill alive) and `landing_page`.
**NO DOM side effects** (no `history.replaceState`, href rewrite, form injection, iframe
patch, or `setInterval`) — this is what avoids the E2E race (recon §H, GUARDRAIL 5).

**MODIFY `src/app/layout.tsx`** — mount `<AttributionProvider />` once inside `<body>`;
**delete** the `<Script id="coach-attribution">` block (lines 85-89, empty no-op) [decision 5].
Dead-code cleanup consequent to that: drop now-unused `footerJS` (line 52), narrow the
destructure (line 48) to `{ header, body }`, remove the commented footer console.log (line 56).
`stripScriptWrapper`/`fetchTrackingScripts` stay (header still uses them).

### Step 2 — Reader reconciliation (`src/lib/attribution.ts`)
- Line 33 `utm_keyword` → `utm_term`; line 34 `_cltk` → `gclid`.
- Add rows: `source_type`, `referrer`, `wbraid`, `gbraid` (`sessionStorage.getItem`).
- Interface (line 11): rename `utm_keyword`→`utm_term`, add the 4 fields, **remove**
  `attribution_captured_at` (line 16 + line 38) [Tony's-call resolved].
- Keep `coupon` + `landing_page`.
- **Grep-verified safe:** `utm_keyword`, `attribution_captured_at`, `_cltk` have zero
  consumers outside this file; `StripePaymentForm`/`ApplyCoupon` don't reference changed fields.

### Step 3 — Forward native meta (`src/lib/orderTransform.ts:168-181`)
- **Delete** the `_coach_ghl_*` map block (170-174) [decision 2].
- Build native meta explicitly, each entry only if the cleaned value is present:
  7× `_wc_order_attribution_{utm_source,utm_medium,utm_campaign,utm_content,utm_term,
  source_type,referrer}` + 4× top-level `gclid`/`fbclid`/`wbraid`/`gbraid` + `landing_page`.
- **Exclude `coupon`** from the forward (it is not attribution meta).
- Fix `source_type` value → read `attribution.source_type` verbatim (kill the
  `utm_source || "direct"` bug at line 178).
- Metadata only — do not touch `line_items`/`coupon_lines`/`fee_lines`/`shipping_lines`
  (GUARDRAIL 2). **Existing 12 tests in `tests/api/place-order.test.ts` don't assert this
  block → no break.**

### Step 4 — Direct-traffic fallback
Resolved AT CAPTURE, not in the forward: `source_type` is always classified (min `typein`),
so the forward writes it verbatim — no `|| direct` needed. Enum has no `direct` member;
direct traffic = `typein` (with Coach-parity `utm_source='direct'`, `utm_medium='(none)'`).

## Files
- CREATE `src/lib/attributionCapture.ts` (pure logic)
- CREATE `src/components/providers/AttributionProvider.tsx` (`"use client"`, effect-only)
- CREATE `tests/lib/attributionCapture.test.ts` (Jest — mirrors existing `tests/lib/*` convention)
- MODIFY `src/app/layout.tsx`, `src/lib/attribution.ts`, `src/lib/orderTransform.ts`
- NOT touched: `StripePaymentForm.tsx`, `ApplyCoupon.tsx`, checkout billing/shipping/line-items/coupon logic, `trackingSeoServices.ts`

## Verification
- **Unit (this phase):** `npm test` — new `tests/lib/attributionCapture.test.ts` covers each
  classifier branch (AI/social/search/referral/direct), utm-wins-over-cat, and the 4-way
  source_type enum. Confirm the existing 12 `place-order` tests still pass.
- **Manual (bridge to Phase 2):** with `npm run dev`, land on `/?utm_source=facebook&
  utm_medium=paid_social&...&gclid=...&fbclid=...` (Case A) → devtools shows the exact
  sessionStorage keys; navigate to checkout → `getAttribution()` returns them.
- **DoD (Phase 2, `workflow/02_TESTING.md`):** place a staging order on
  `dockbloxx.mystagingwebsite.com`, then `GET /wp-json/wc/v3/orders/{id}` and assert the
  `meta_data` entries per the CONTRACT validation checklist (Case A/B). Early check: does the
  native WC order screen render the attribution box at all → escalate if not (GUARDRAIL 10).

## Guardrails in force
One change at a time, diff before saving, checkpoint each step. No commits/pushes. No GA4/GTM.
First-touch only. Adjacent findings report-only.
