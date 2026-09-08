# Ticket 3 — Phase 1 Step 1: `fetchPoleMaterials()` reader — PENDING_APPROVAL

**[CONFIRM: H1]** `fetchPoleShapeStyles` reads `data.acf.*` by hardcoded key (productServices.ts L1184–1189); live readback shows `acf.metal="Metal"`, `acf.wood="Wood"`. Premise confirmed.
**Design:** GAP-5 answer = separate function. Fallback: missing/empty → `""` per key; any error → both `""`, never throws (production-safe until Track B runs there). Same endpoint, same 60 s revalidate; Next dedupes the second fetch of the same URL within a render.

## Diff 1 of 2 — `src/types/product.ts` (append at end of file, after `RelatedProduct`)
```diff
@@ -97,3 +97,10 @@ export interface RelatedProduct {
   image: string; // The URL of the product's featured image
 }
+
+// Pole Material display labels from the ACF "Product Global" options page.
+// Frontend-owned option (like Pole Style): no price / SKU / variation impact.
+export interface PoleMaterials {
+  metal: string; // e.g. "Metal" — "" when the ACF value is unset
+  wood: string; // e.g. "Wood" — "" when the ACF value is unset
+}
```

## Diff 2 of 2 — `src/services/productServices.ts`
Import (line 1):
```diff
-import { Product, RelatedProduct } from "@/types/product";
+import { PoleMaterials, Product, RelatedProduct } from "@/types/product";
```
New block inserted after line 1196 (`// ---- FETCH POLE SHAPE STYLES FROM ACF ENDS ----`), before the FEATURED PRODUCTS block:
```diff
 // --------------------------- FETCH POLE SHAPE STYLES FROM ACF ENDS ------------------------------------------------------------
 
+// --------------------------- FETCH POLE MATERIALS FROM ACF STARTS ------------------------------------------------------------
+
+/**
+ * Fetches the Pole Material display labels (Metal / Wood) from the ACF
+ * "Product Global" options page. Frontend-owned option like Pole Style —
+ * it never touches price, SKU, stock or WooCommerce variation matching.
+ *
+ * Fallback contract (Ticket 3 CONTRACT.md): a missing key or empty string
+ * is returned as "" so the UI omits that option. Any fetch error returns
+ * both as "" and never throws — production lacks these keys until the
+ * ACF values are entered there.
+ */
+export const fetchPoleMaterials = async (): Promise<PoleMaterials> => {
+  try {
+    const response = await fetch(ACF_REST_OPTIONS, {
+      method: "GET",
+      headers: {
+        "Content-Type": "application/json",
+      },
+      next: { revalidate: 60 }, // Same cache window as fetchPoleShapeStyles
+    });
+
+    if (!response.ok) {
+      throw new Error(`Failed to fetch pole materials: ${response.statusText}`);
+    }
+
+    const data = await response.json();
+
+    return {
+      metal: data?.acf?.metal || "",
+      wood: data?.acf?.wood || "",
+    };
+  } catch (error) {
+    console.error("Error fetching pole materials:", error);
+    return { metal: "", wood: "" };
+  }
+};
+
+// --------------------------- FETCH POLE MATERIALS FROM ACF ENDS ------------------------------------------------------------
+
 // --------------------------- FEATURED PRODUCTS FROM WOOCOM PRODUCTS STARTS ------------------------------------------------------------
```

## NOT touching
- `fetchPoleShapeStyles` (L1154–1194): unchanged, per GAP-5.
- `src/constants/apiEndpoints.ts`, `page.tsx` (Step 2), any component (Step 3), `BloxxPricing.tsx` (Step 4), `orderTransform.ts`, cart store, tests (Step 7).
- No new dependencies.

## Verification after apply
- `npx tsc --noEmit` clean; `npm test` still 15 suites / 166 tests.
- Function is unused until Step 2 wires it, so no runtime change to any page yet.
- Unit test (mocked `fetch`: happy path, missing keys → `""`, network error → `""`) lands in Step 7 with the rest of the coverage.

→ Awaiting approval before applying.
