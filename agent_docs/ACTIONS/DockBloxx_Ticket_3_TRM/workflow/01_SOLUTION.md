# workflow/01_SOLUTION.md — Phase 1: The Feature ([CONFIRM]-gated)

**Enter only after Tony approves recon AND CONTRACT.md is FINAL.**

One change at a time. Checkpoint each: present diff → Tony approves → apply → verify.
State what you are NOT touching, each time. No new dependencies.

#### Track B — ACF field values (owner: Tony) — recorded here; the Engineer never
performs or compensates for this in code.
- Product Global field group on staging already has `metal` (Text) and `wood` (Text).
- Tony enters display text (`Metal`, `Wood`) on the options page and saves.
- Later, before promotion, Tony repeats on the PRODUCTION backend (Coach approval).
  Until then the prod ACF response lacks the keys — the reader's fallback (Step 1) must
  make that safe.

#### Step 1 — Read Pole Material from the ACF options endpoint
- **[CONFIRM: H1 — `fetchPoleShapeStyles` reads `data.acf.*` by hardcoded key; B-live
  readback shows `acf.metal` / `acf.wood` present]**
- **Design menu (present to Tony, one decision):**
  (a) New function `fetchPoleMaterials()` in `productServices.ts`, same endpoint, same
      60s revalidate, returns `{ metal: string, wood: string }`. Second fetch of the same
      URL per page (cached by Next fetch dedupe). Cleanest separation; zero touch to
      the existing function.
  (b) Extend `fetchPoleShapeStyles` to return both style URLs and material labels in one
      object. One fetch, but changes an existing function's return type and its callers.
- **Fallback contract (CONTRACT row):** missing key or empty string → option is
  OMITTED from the UI (not rendered with an empty label). Both missing → the whole
  Pole Material group is omitted and the cart still carries `Pole Material: Unknown`
  only if the group rendered at least once — decide in menu: (i) always seed `Unknown`
  for bloxx, or (ii) seed only when the group renders. Recommend (i): the order block
  stays uniform across bloxx orders.
- **Checkpoint:** diff to Tony.

#### Step 2 — Serialize into the category JSON
- **[CONFIRM: H2 — `augmentedCategory` spread pattern in `page.tsx`, `bloxx`-gated]**
- Add `poleMaterials` next to `poleStyles` in the object serialized into
  `<script id="product-category-custom">`. Key name is a CONTRACT row.
- Not touching: `product-variations` JSON, Yoast schema, related products.
- **Checkpoint:** diff to Tony.

#### Step 3 — New component `BloxxPricingPoleMaterials.tsx`
- **[CONFIRM: H5 — precedent component reads the category JSON on mount; C confirms
  the insertion point]**
- Sibling of `BloxxPricingPoleStyles.tsx`, same folder. Reads `data.poleMaterials`.
  Renders heading `Pole Material` and one bordered `<button>` per non-empty material,
  styled EXACTLY like the Pole Size buttons (`BloxxPricing.tsx` L529–533 classes; selected
  = blue). No default selected. Props: `selectedMaterial`, `onSelectionChange`.
- **Director override 2026-09-08:** mount in `BloxxPricing.tsx` as the LAST child, after
  the entire Pole Size block (after "Don't see your size?" and the custom size input,
  i.e. after L561), immediately above the Current Price box. NOT under Pole Shape Styles.
- Not touching: Pole Shape / Pole Size / Version rendering.
- **Checkpoint:** diff to Tony.

#### Step 4 — Cart write (GUARDRAILS 12)
- **[CONFIRM: D — full list of WHOLESALE `variations:` assignments and the owner of
  `cartItem` state]**
- `handleMaterialSelection(value)` in `BloxxPricing.tsx`: set local state AND write
  `{ name: "Pole Material", value }` into `cartItem.variations` via filter-then-append
  (same shape as `handleSizeSelection`).
- Seed `{ name: "Pole Material", value: "Unknown" }` in every WHOLESALE init assignment
  recon listed, and preserve the current selection in `handleShapeSelection` (its filter
  currently strips only Shape and Size — verify Pole Material survives; if a WHOLESALE
  rebuild fires on shape change, re-apply the selected material).
- Not touching: `calculatePrice`, `variation_id`, price/basePrice math.
- **Checkpoint:** diff to Tony.

#### Step 5 — Downstream displays
- **[CONFIRM: E — each renderer classified GENERIC / HARDCODED]**
- GENERIC renderers need nothing. For any HARDCODED renderer, present a menu:
  (a) add `Pole Material` to its list; (b) leave as-is and log as follow-up. Tony decides.
- `orderTransform.ts`: expected zero change (H6). If recon shows the `variations` meta
  is filtered by name anywhere before send, that is a [CONFIRM] failure — STOP, report.
- **Checkpoint:** diff (or "no diff, evidence attached") to Tony.

#### Step 6 — Cart merge behavior
- **[CONFIRM: headline 5 — store merge rule]**
- If the store merges by `variation_id` only, present a menu: (a) leave (two materials
  merge into one line — client-visible quirk, follow-up ticket); (b) include `variations`
  in the merge identity. Option (b) touches shared cart logic → Director decision, and
  if approved, its own checkpoint with regression tests.
- **Checkpoint:** decision recorded in CONTRACT lock trail.

#### Step 7 — Tests (Ironman Rule)
- **[CONFIRM: F — runner + nearest test to copy]**
- Add unit coverage: component renders two buttons from JSON, none selected; selection
  writes exactly one `Pole Material` entry; shape change preserves it; empty ACF values
  omit the option; non-bloxx templates never mount it. Existing suite untouched and green.
- **Checkpoint:** diff + run output to Tony.

#### Step 8 — Adjacent report-only (GUARDRAILS 13) — report; do NOT implement.
- `handlePoleStyleChange` state-only gap; duplicated init `useEffect`s in `BloxxPricing`;
  anything else found in D/E. One paragraph each, with evidence, as follow-up candidates.

**Constraints:** CONTRACT.md governs every name/key/value. No commits.
**Stop Gate:** Steps implemented and approved. Proceeding to Phase 2 self-verification
and QA handoff.
