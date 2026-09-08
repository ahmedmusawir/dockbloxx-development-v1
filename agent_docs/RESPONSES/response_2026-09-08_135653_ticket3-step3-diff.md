# Ticket 3 — Phase 1 Step 3: `BloxxPricingPoleMaterials.tsx` + mount — PENDING_APPROVAL

**[CONFIRM: H5]** precedent component reads the category JSON on mount (`BloxxPricingPoleStyles.tsx` L24–32). **[CONFIRM: C / override]** insertion point = last child of `BloxxPricing`, after the Pole Size block (L522–561), immediately above Current Price (rendered by parent `ProductDetails.tsx` L179). Confirmed.

**Step boundary note (deviation, flagged):** the workflow puts the cart-writing handler in Step 4. Mounting the component in Step 3 with a state-only handler would reproduce the `handlePoleStyleChange` anti-pattern (GUARDRAILS 12), even transiently. So Step 3 includes the real `handleMaterialSelection` (filter-then-append, `handleSizeSelection` pattern). Step 4 then covers ONLY seeding `Unknown` in both wholesale init arrays (GAP-6 a) plus the preservation check. No applied state is ever state-only.

## Diff 1 of 2 — NEW `src/components/shop/product-page/variations/BloxxPricingPoleMaterials.tsx`
```tsx
"use client";

import React, { useEffect, useState } from "react";
import { PoleMaterials } from "@/types/product";

interface Props {
  selectedMaterial: string | null;
  onSelectionChange: (material: string) => void; // Pass the selected label back
}

/**
 * Pole Material (Metal / Wood) — frontend-owned option, Ticket 3.
 * Labels come from the ACF "Product Global" options page via the
 * `poleMaterials` key of the embedded product-category-custom JSON.
 * Empty labels are omitted; nothing is selected on load.
 * Styled exactly like the Pole Size buttons in BloxxPricing.
 */
const BloxxPricingPoleMaterials = ({
  selectedMaterial,
  onSelectionChange,
}: Props) => {
  const [poleMaterials, setPoleMaterials] = useState<PoleMaterials | null>(
    null
  );

  // Read pole materials from the embedded category JSON
  useEffect(() => {
    const categoryScript = document.getElementById("product-category-custom");
    if (categoryScript) {
      const data = JSON.parse(categoryScript.textContent || "{}");
      if (data.poleMaterials) {
        setPoleMaterials(data.poleMaterials);
      }
    }
  }, []);

  // CONTRACT: empty/absent ACF value → option omitted; both empty → render nothing
  const materialLabels = poleMaterials
    ? [poleMaterials.metal, poleMaterials.wood].filter((label) => !!label)
    : [];

  if (materialLabels.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-lg text-gray-600">Pole Material</h3>
      <div className="flex flex-wrap gap-3 mt-2 justify-start">
        {materialLabels.map((label) => (
          <button
            key={label}
            onClick={() => onSelectionChange(label)}
            className={`px-8 py-4 min-w-[50px] rounded-none text-sm font-medium shadow-sm ${
              selectedMaterial === label
                ? "bg-blue-600 text-white border-2 border-blue-500"
                : "bg-white text-gray-900 border-2 border-blue-500 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BloxxPricingPoleMaterials;
```
Classes are copied verbatim from the Pole Size buttons (`BloxxPricing.tsx` L529–533) and the wrapper/heading from L522–524.

## Diff 2 of 2 — `src/components/shop/product-page/variations/BloxxPricing.tsx`
Import (after L5):
```diff
 import BloxxPricingPoleStyles from "./BloxxPricingPoleStyles";
+import BloxxPricingPoleMaterials from "./BloxxPricingPoleMaterials";
```
State (after L25 `customSize`):
```diff
   const [customSize, setCustomSize] = useState<string | null>(null);
+  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(
+    null
+  ); // Pole Material (Metal / Wood) — nothing selected on load
```
Handler (after `handleVersionSelection`, L460):
```diff
+  // Handle Pole Material selection — writes the cart directly (GUARDRAILS 12)
+  const handleMaterialSelection = (material: string) => {
+    setSelectedMaterial(material);
+
+    setCartItem((prev) => {
+      const updatedVariations = [
+        ...(prev.variations || []).filter((v) => v.name !== "Pole Material"),
+        { name: "Pole Material", value: material },
+      ];
+      return { ...prev, variations: updatedVariations };
+    });
+  };
```
Mount (after the Pole Size block closes at L561, before the root `</div>` at L562):
```diff
         )}
       </div>
+
+      {/* Pole Material Options — below Pole Size, above Current Price (Ticket 3) */}
+      <BloxxPricingPoleMaterials
+        selectedMaterial={selectedMaterial}
+        onSelectionChange={handleMaterialSelection}
+      />
     </div>
   );
 };
```

## NOT touching
- Pole Shape / Pole Shape Styles / Version / Pole Size rendering and handlers; `calculatePrice`; `variation_id` / price math; both init effects (Step 4); `handleShapeSelection` (recon confirmed its filter preserves other names).
- `BloxxPricingPoleStyles.tsx`, `ProductDetails.tsx`, `renderPricingModules.tsx`.
- No new dependencies.

## Behaviour after this step (before Step 4)
- Bloxx page shows the group below Pole Size; clicking writes exactly one `Pole Material` entry to `cartItem.variations`.
- With NO click, the cart has no `Pole Material` entry yet — `Unknown` seeding is Step 4. Not shippable until Step 4 lands; stated so QA does not test AC3 against this state.

## Verification after apply
- `npx tsc --noEmit` clean; `npm test` 15 / 166.
- Dev page `whos-your-caddie`: group renders with `Metal` / `Wood`, none selected; click → blue; Current Price unchanged for the same Shape / Size.
- Non-bloxx page (`huck-bucket`, `carabiner`): no group (component is only mounted by `BloxxPricing`).

→ Awaiting approval before applying.
