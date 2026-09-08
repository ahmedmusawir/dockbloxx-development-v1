# Ticket 3 — Phase 1 Step 6: Cart merge behaviour — NO DIFF (evidence + decision)

**[CONFIRM: headline 5]** `useCartStore.ts` L90–93: key = `${id}::${JSON.stringify(variations)}}::${JSON.stringify(customFields)}`; `variation_id` is not part of it.
**Browser Run 6:** Square / 2" / Wood then Square / 2" / Metal → 2 separate line items, both `variation_id 3182`. Two materials do NOT merge into one line. The menu in 01_SOLUTION Step 6 (merge-by-variation_id quirk) does not arise.
**Decision to record in CONTRACT lock trail:** no change to cart merge identity; Step 6 closed on evidence.
**Side note (report-only, from recon):** the key stringifies the array in order, and `handleShapeSelection` reorders entries, so the same selections reached by different click orders can be distinct lines. Pre-existing; not introduced by Pole Material.

**Checkpoint:** no diff. Nothing to apply.
