# Ticket 3 — Phase 1 Step 2: serialize `poleMaterials` into the category JSON — PENDING_APPROVAL

**Depends on Step 1** (`fetchPoleMaterials` export) — Step 1 is NOT yet applied; awaiting an explicit "approved" for it. Apply order: Step 1, then Step 2.
**[CONFIRM: H2]** `augmentedCategory` spread pattern at `page.tsx` L116–119, bloxx-gated at L112–113. Confirmed.

## Diff — `src/app/(public)/shop/[slug]/page.tsx`
```diff
@@ -3,6 +3,7 @@ import SingleProductContent from "./SingleProductContent";
 import {
   fetchAllProductSlugs,
+  fetchPoleMaterials,
   fetchPoleShapeStyles,
   fetchProductBySlug,
   fetchProductVariationsById,
@@ -111,10 +112,15 @@ const SingleProductPage = async ({
   // Fetch pole styles for Bloxx category
   const poleStyles =
     customCategory.type === "bloxx" ? await fetchPoleShapeStyles() : null;
 
-  // Augment the custom category JSON with pole styles
+  // Fetch pole materials (Metal / Wood labels) for Bloxx category — Ticket 3
+  const poleMaterials =
+    customCategory.type === "bloxx" ? await fetchPoleMaterials() : null;
+
+  // Augment the custom category JSON with pole styles and pole materials
   const augmentedCategory = {
     ...customCategory,
     ...(poleStyles && { poleStyles }),
+    ...(poleMaterials && { poleMaterials }),
   };
```
Resulting JSON for bloxx: `{ type, defaultSelections, filtering, poleStyles, poleMaterials: { metal: "Metal", wood: "Wood" } }`. Non-bloxx: unchanged (both fetches skipped, no key).

## NOT touching
- `product-variations` JSON, Yoast schema block, related products, `generateStaticParams`, `generateMetadata`.
- `fetchPoleShapeStyles` call and the `poleStyles` spread — unchanged.
- Consumers of the JSON (`ProductDetails.tsx` reads only `type`; `BloxxPricingPoleStyles.tsx` reads only `poleStyles`) — unaffected by the extra key.

## Verification after apply
- `npx tsc --noEmit` clean; `npm test` unchanged (15 / 166).
- `curl` the dev product page for `whos-your-caddie` and confirm `<script id="product-category-custom">` contains `"poleMaterials":{"metal":"Metal","wood":"Wood"}`; a non-bloxx page has no such key.

→ Awaiting approval (and Step 1 approval) before applying.
