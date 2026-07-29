# T2 Phase 1 — Step 3 COMPLETE (Phase 1 code done; stopped for review)

**When:** 2026-07-29 13:31:15
**Status:** COMPLETE — Step 3 saved and green. STOPPED for Tony's review.
**Step:** 3 of 4 (`workflow/01_SOLUTION.md`) — forward to native Woo attribution meta.

## Changes saved — src/lib/orderTransform.ts

1. **Added module-private helper `buildAttributionMeta()`** (+ `WC_ATTRIBUTION_META` map and
   `TOP_LEVEL_META_KEYS`) between the `OrderData` interface and `buildOrderData`.
   - 7 native `_wc_order_attribution_*` (utm_source/medium/campaign/content/term/source_type/referrer)
   - 4 bare top-level click IDs (gclid/fbclid/wbraid/gbraid) + landing_page
   - **Conditional inclusion:** `if (value) meta.push(...)` — no empty writes.
   - `coupon` excluded; `source_type` written verbatim.
2. **Replaced the attribution `meta_data` block** (old lines 166-181): deleted the
   `_coach_ghl_*` map AND the `utm_source || "direct"` source_type bug. Now just
   `meta_data: buildAttributionMeta(checkoutData.attribution)`.

## Test added — tests/api/place-order.test.ts (describe "Attribution (Ticket 2 native meta)")
- Full attribution → **exactly 12** meta entries (7 native + gclid/fbclid/wbraid/gbraid + landing_page),
  **coupon ABSENT**, source_type verbatim ("utm"), **no `_coach_ghl_*`**.
- Sparse input (utm_source + source_type only) → exactly those 2 entries, no empties.
- No attribution → empty `meta_data`.

## Tests / typecheck
```
npm test         → Test Suites: 19 passed, 19 total | Tests: 219 passed, 219 total  (+3 new)
npx tsc --noEmit → 0 errors project-wide (0 orderTransform/attribution)
```
Existing 12 place-order tests intact — Ironman Rule held.

## Step 4 (direct-traffic fallback) — NO CODE NEEDED
Resolved at capture (Step 1): `buildAttribution` always classifies `source_type` (min `typein`,
with `utm_source='direct'`, `utm_medium='(none)'`), and the forward now writes it verbatim.
No `|| direct` fallback in the transform. Covered by existing tests
(attributionCapture direct case + orderTransform verbatim case). **Phase 1 implementation is
functionally COMPLETE.**

## What's next
Phase 2 — staging REST readback (`workflow/02_TESTING.md`) on
`dockbloxx.mystagingwebsite.com`, filling `EVIDENCE_LOG.md` per the CONTRACT validation
checklist (Case A/B), incl. the wp-admin visibility + typein-rendering checks (FLAGs 1).

→ Awaiting Tony's review / go for Phase 2.
