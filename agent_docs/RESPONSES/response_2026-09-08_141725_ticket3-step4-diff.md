# Ticket 3 — Phase 1 Step 4: seed `Pole Material` in both wholesale init arrays — PENDING_APPROVAL

**[CONFIRM: D]** Exactly two WHOLESALE sites, both `[variations]` init effects in `BloxxPricing.tsx` (now L158–172 and L219–235 after Step 3's +4 shift). All other writes surgical; `handleShapeSelection` filters only Pole Shape / Pole Size → Pole Material survives (browser-verified in Step 3: Wood persisted through Add to Cart). Owner of `cartItem` = `ProductDetails.tsx` L37–52 (`variations: []`).
**Design:** GAP-6 (a) — seed inside both arrays. Value = **preserve-or-Unknown**: `prev.variations.find(v => v.name === "Pole Material")?.value || "Unknown"`. At mount this is always `Unknown` (nothing selected yet); if either effect ever re-fires after a selection (e.g. React StrictMode double-invoke in dev, or a future refetch of `variations`), the selection is preserved instead of silently reset — that is GUARDRAILS 12's "preserve or re-seed" literally. Trade-off: 4 more characters of logic than a bare `"Unknown"` literal; the bare literal is the simpler alternative if you prefer it.

## Diff — `src/components/shop/product-page/variations/BloxxPricing.tsx` (two hunks, identical shape)
Init effect A (currently L165):
```diff
           variations: [
             { name: "Pole Shape", value: defaultShape },
             {
               name: "Pole Style",
               value: normalizePoleStyle(defaultStyle) || "Unknown",
             },
             { name: "Pole Size", value: defaultSize || "Unknown" },
+            {
+              name: "Pole Material",
+              value:
+                prev.variations.find((v) => v.name === "Pole Material")
+                  ?.value || "Unknown",
+            },
           ],
```
Init effect B (currently L224–225):
```diff
             { name: "Pole Size", value: defaultSize || "Unknown" },
             { name: "Version", value: defaultVersion },
+            {
+              name: "Pole Material",
+              value:
+                prev.variations.find((v) => v.name === "Pole Material")
+                  ?.value || "Unknown",
+            },
           ],
```
`prev` is already the parameter of both `setCartItem((prev) => …)` calls.

## NOT touching
- The duplicated effects themselves (report-only, GUARDRAILS 13) — I add one entry to each array, nothing else.
- `handleShapeSelection`, the three `.map` sync effects, `calculatePrice`, `variation_id`, price math, `handlePoleStyleChange`.
- Step 3 component/handler.

## Behaviour after this step
- Load bloxx page, no click, Add to Cart → cart has `Pole Material: Unknown` (AC3). Order meta will carry it; WP admin shows `Pole Material: Unknown` (renderer does not filter, per Director).
- Cart strips still hide `Unknown` (generic filter) — as accepted.

## Verification after apply
- tsc + jest (15 / 166).
- Browser: load `whos-your-caddie`, no click, Add to Cart → `cart-storage` has exactly one `Pole Material` = `Unknown`; then fresh page, click Metal, change Pole Shape, change Pole Size, Add to Cart → exactly one `Pole Material` = `Metal` (AC4 shape); `variation_id` and price unchanged for the same Shape/Size.

→ Awaiting approval before applying.
