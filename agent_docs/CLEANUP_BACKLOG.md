# Cleanup Backlog — Dockbloxx

Non-urgent items tracked for future cleanup sessions. Not bugs, not security issues — technical debt with known fix paths.
Earlier backlog (May 2026 security arc) is archived at `agent_docs/OLD/CLEANUP_BACKLOG.md`; items there remain open unless closed elsewhere.

## Open Items — from DockBloxx Ticket 3 (Pole Material) recon, 2026-09-08 (report-only, GUARDRAILS 13)

### Pole Style handler is state-only — shopper's pick never reaches the cart
- `src/components/shop/product-page/variations/BloxxPricing.tsx` `handlePoleStyleChange` (~L404): sets local state only; cart `Pole Style` comes from the shape-driven sync effect + `normalizePoleStyle`
- Effect: `square_octagon` pick ships as `square`; order never records the real choice
- Fix: mirror `handleMaterialSelection` (filter-then-append); decide key vs label for the order
- Risk: low; needs a product decision on the stored value

### Duplicated init effects in BloxxPricing
- Two `useEffect(…, [variations])` blocks (~L116–172, ~L175–238) do the same init; the second wins. A third effect (~L248) repeats the shape→style switch (4 copies total)
- Effect: every new option must be seeded in both arrays (Ticket 3 Step 4 had to)
- Fix: one init effect + `shapeToDefaultStyle()` helper; guard with `tests/components/shop/BloxxPricing.poleMaterial.test.tsx`
- Risk: medium (touches init ordering) — do it with the suite green

### `makeKey` stray brace — three of four copies differ from the fourth
- `src/store/useCartStore.ts` L93, L115, L133 build `…)}}::…`; `addOrUpdateCartItem` L63 builds `…)}::…`
- Effect: `addOrUpdateCartItem` and `setOrReplaceCartItemQuantity` compute different keys for the same item (self-consistent per function, so nothing breaks today)
- Fix: one exported `makeKey` used by all five sites
- Risk: very low

### Cart key is order-sensitive; `handleShapeSelection` reorders `variations`
- Key = `JSON.stringify(variations)`; shape handler filters then appends → `Pole Shape`/`Pole Size` move to the end
- Effect: same selections reached in a different click order can be two lines; pre-deploy persisted carts (no `Pole Material`) will not merge with post-deploy adds
- Fix: sort entries by name inside `makeKey` (bundle with the item above)
- Risk: low

### Leftover `console.log` in BloxxPricingPoleStyles
- `src/components/shop/product-page/variations/BloxxPricingPoleStyles.tsx` L66 logs every style click
- Fix: delete the line
- Risk: none

### `src/lib/test.ts` — bare sanity test under `src/`
- Jest counts it as a suite
- Fix: delete, or move to `tests/`
- Risk: none

### Thank-you page option summary is commented out
- `src/app/(public)/thankyou/ThankyouPageContent.tsx` L137–140
- Effect: confirmation page shows no Shape/Size/Material summary
- Fix: product decision — restore (generic renderer would show `Wood`) or delete the dead block
- Risk: none

### Cart strips print values only — `Pole Style` shows as lowercase `square`
- `CartSlide.tsx` L122–125, `cart-page/CartItems.tsx` L143–146, `CheckoutCartItems.tsx` L41–44
- Effect: `Square · square · 2"`; Director accepted as-is for Ticket 3
- Fix: bundle with the Pole Style item if a label is ever stored
- Risk: none

### Round products: only size `Other`, and Add to Cart aborts via `alert()`
- `src/components/shop/product-page/ProductDetails.tsx` L100–106
- Effect: works as designed, but `alert()` is hostile on mobile and needs dialog handling in e2e (bit the Ticket 3 browser checks)
- Fix: inline validation message next to the custom-size input
- Risk: low

### DoD example slug does not exist on staging
- `giraffe-g20-pressure-washer-mount-only` absent from the 47 published staging products; TEST BUY routed to `whos-your-caddie` (3157)
- Fix: confirm whether Giraffe G20 is production-only or renamed; correct the client-facing DoD wording
- Risk: none (documentation)
