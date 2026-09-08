# Unit Test Audit — Dockbloxx

| Field | Value |
|---|---|
| Generated | 2026-05-08 18:48 Asia/Dhaka |
| Branch | `testing-playbook-2` |
| Scope | Read-only audit. No tests added, modified, or executed. |
| Test infrastructure | Jest + ts-jest + jsdom + Testing Library. Config at `jest.config.js`, setup at `jest.setup.js`. Tests live in `tests/` (top-level, not `src/__tests__/`). |
| Test inventory | 12 test files (11 actual suites + 1 type-only `.d.ts`). 120 test cases total (1 short of Tony's reported 121 — likely a counting nit, not a missing file). |

---

## Section A — Test Inventory

| # | File | Tests | Target | Summary | Mock patterns |
|---|---|---|---|---|---|
| 1 | `tests/api/place-order.test.ts` | 6 | `place-order/route.ts` order transformation logic (coupon_lines vs fee_lines decision) | Standard coupon → coupon_lines; custom per-product %% → fee_lines; no coupon → empty; fixed_product → coupon_lines | **NONE — but uses a SHADOW IMPLEMENTATION pattern.** Lines 70-131 define a local `buildOrderData()` that "mimics the transformation logic in place-order/route.ts" (per its comment). Tests run against this local mimic, NOT the actual route. Real `parseCouponMeta` from couponUtils is called inside via `require()`. See Section C. |
| 2 | `tests/components/cart/CartSlide.test.tsx` | 12 | `<CartSlide />` cart drawer UI | open/close, empty state, item rendering, subtotal display, +/- quantity buttons, remove item, navigate-to-/shop on last removal, /checkout link | `jest.mock("next/navigation")` (useRouter → mockPush); `jest.mock("next/image")` (returns native `<img>`); direct `useCartStore.setState()` for store seeding |
| 3 | `tests/components/checkout/ApplyCoupon.test.tsx` | 8 | `<ApplyCoupon />` checkout coupon input | renders input/apply button; empty-code error; valid coupon success; invalid coupon error; missing-email error; remove flow; loading state; clears input after success | `jest.mock("@/services/checkoutServices")` (auto-mock; `fetchCouponByCode` configured per test with `mockResolvedValue` / `mockImplementation`); `jest.mock("@/hooks/useCouponTracking")` (factory returning `trackApplyCoupon: jest.fn()`); direct `useCheckoutStore.setState()`; `process.env.NEXT_PUBLIC_BACKEND_URL` set inline |
| 4 | `tests/components/checkout/OrderDetailsDesktop.test.tsx` | 10 | `<OrderDetailsDesktop />` order summary panel | summary heading, subtotal/shipping/total display, discount line when coupon applied, no-discount state, edit-cart button click, coupon-message prop, child component rendering | `jest.mock` factories replace `<ApplyCoupon />` and `<CheckoutCartItems />` with stub components carrying `data-testid` |
| 5 | `tests/components/checkout/ShippingMethods.test.tsx` | 9 | `<ShippingMethods />` shipping selector | renders flat-rate/local-pickup options, empty-methods message, free-shipping coupon override, prop-immutability guard, flat-rate tiers (3 tiers tested but 2 are weak — see Section C), method-switch click | NONE — uses real `useCheckoutStore` with `.setState()` for seeding |
| 6 | `tests/lib/checkoutUtils.test.ts` | 13 | `updateCheckoutTotals()` | shipping tiers ($10/$20/$35), free-shipping coupon, local-pickup preservation, per-product percentage discount (90%), fixed_product discount with multi-quantity, item-price discount cap, included-products-only constraint | NONE — pure-function tests with helper factories `createCartItem` + `createCheckoutData` |
| 7 | `tests/lib/couponUtils.test.ts` | 6 | `parseCouponMeta()` (3 tests) + `isCouponExpiredByTimezone()` (3 tests) | parseCouponMeta extracts percentPerProduct + bracketed timezone + empty meta_data; expiry check handles no-date / today / past-date | NONE — pure-function tests. **`validateCoupon` imported on line 9 but never used; `validateCouponForDealer` not imported. See Section C.** |
| 8 | `tests/lib/utils.test.ts` | 23 | 5 utility functions in `lib/utils.ts` | `getFeaturedImage` (5), `cleanPriceHtml` (4), `formatDateString` (5), `detectProductCategory` (6), `getApiUrl` (3) | NONE — pure functions; uses `process.env.NEXT_PUBLIC_BACKEND_URL` save/restore in `getApiUrl` block |
| 9 | `tests/store/useCartStore.test.ts` | 20 | `useCartStore` Zustand store | initial state, setCartItems, clearCart, setIsCartOpen, addOrUpdateCartItem (with variations + customFields collision logic), increase/decrease quantity, getItemQuantity, removeCartItem, subtotal calc, getCartDetails | NONE — uses `useCartStore.setState()` directly for seeding (Zustand-native pattern, no module mock) |
| 10 | `tests/store/useCheckoutStore.test.ts` | 12 | `useCheckoutStore` Zustand store | initial state, setCartItems, setShippingMethod, **applyCoupon** (3 happy-path tests including per-product %), removeCoupon (with shipping-restore behavior), calculateTotals, shipping-method preservation across tiers | NONE — `useCheckoutStore.setState()` direct seeding. **No `applyCouponForDealer` tests.** |
| 11 | `tests/utils/detectProductCategory.test.ts` | 1 | `detectProductCategory()` for giftcard | Single test: slug `gift-card` → type `giftcard` | NONE — **DUPLICATE of test in `tests/lib/utils.test.ts` line 135. See Section C.** |
| 12 | `tests/setup.d.ts` | 0 | Type-only declarations | Imports `@testing-library/jest-dom` for matcher type augmentation. No tests. | n/a |

**Total: 120 test cases across 11 active suites.**

---

## Section B — Coupon Coverage Map

| Function | Status | Where | Scenarios covered | Scenarios missing |
|---|---|---|---|---|
| `validateCoupon` (strict path) | **PARTIALLY COVERED — indirect only** | `ApplyCoupon.test.tsx` (UI flow) + `useCheckoutStore.test.ts` (store action wraps it) | Empty code rejection (UI); fetch returning null (UI); missing-email rule via UI; happy-path acceptance via store | **Direct unit tests: zero.** No tests for: email allow-list rule (rule 1), 100%-free quantity cap (rule 2), expiration via this function path, min/max spend (rule 3), products_included/excluded (rule 4a/4b), categories_included/excluded (rule 4c/4d), global usage limit (rule 5), per-user usage limit (rule 6). The store happy-path tests only exercise valid coupons — invalid-coupon rejection paths are not exercised. |
| `validateCouponForDealer` (lenient path) | **NOT COVERED** | Nowhere | None | Everything. Function not imported in any test file. The 5 rules it runs via the shared helper are tested indirectly via `updateCheckoutTotals`, but the dealer-specific skip-list semantics (skips rules 0, 0.1, 1, 6) have zero tests proving the skip happens. |
| `validateCouponSharedRules` (private helper) | **NOT COVERED — directly** | n/a (not exported) | Behavior covered indirectly via `updateCheckoutTotals` discount tests in `checkoutUtils.test.ts` | Helper itself isn't exported, so direct tests aren't possible without refactor. The rules it contains (2, 2.2, 3, 4, 5) have no test that exercises the rule-firing path through either calling validator. |
| `applyCoupon` (standalone export from `lib/couponUtils.ts`) | **NOT COVERED** | Nowhere | None | This is the function-form `applyCoupon` from couponUtils — different from the store action of the same name. It's currently UNUSED in the store (the store re-implements via `updateCheckoutTotals`) and unused everywhere else. Effectively dead code. |
| `applyCoupon` (store action in `useCheckoutStore`) | **PARTIALLY COVERED** | `useCheckoutStore.test.ts:119-164` (3 tests) | Happy-path: applies coupon, sets free_shipping, calculates per-product percentage discount | No tests for: validation-failure path (coupon rejected → store unchanged), email-missing path, expired coupon, allow-list mismatch, all the Section-1A rule trips |
| `applyCouponForDealer` (new store action) | **NOT COVERED** | Nowhere | None | Everything — happy path, validation-failure path, lenient skip behavior, the dealer-flow regression we just shipped |
| `parseCouponMeta` | **PARTIALLY COVERED** | `couponUtils.test.ts:14-99` (3 tests) | Extracts `percentPerProduct`; extracts bracketed `_expiry_timezone`; returns empty object when meta_data is empty | Missing: `_dockbloxx_allowed_emails` extraction (array form AND comma-separated string form, both branches in source); `_expiry_time` extraction; lowercase normalization of emails; filter-out-empty-string behavior; non-bracketed timezone format; non-numeric `percentPerProduct` falling through; non-array meta_data |
| `isCouponExpiredByTimezone` | **COVERED** | `couponUtils.test.ts:101-196` (3 tests) | No expiry date → false; today's date with end-of-day time → false; past date → true | Edge cases not covered: missing `expiryTime` AND `expiryTimezone` (fallback path that emits the warning); thrown-error fallback path (try/catch); cross-timezone boundary (e.g., expiry 2026-05-08 in Asia/Dhaka vs. caller in America/New_York). The 3 tests cover the spine; the fallback branches are dark. |
| `calculateCouponDiscount` | **NOT COVERED** | Nowhere | None | Function imported nowhere in tests. Three discount-type branches (`fixed_cart`, `percent`, `fixed_product`) and the min/max spend gating all untested. |
| `updateCheckoutTotals` | **COVERED — most thoroughly tested function in the suite** | `checkoutUtils.test.ts` (13 tests) | 4 shipping-tier scenarios; free-shipping coupon override; local-pickup preservation; 90% per-product percentage; included-products filter; fixed_product 1-qty + multi-qty; item-price cap on over-large discounts; multi-product cart with selective discount | Cross-cutting: no test combining min/max spend gating with percentage discount; no test verifying behavior when `discountTotal` would go negative due to multiple coupons (single-coupon model only — fine for current scope) |

**Bottom line:** the dealer-coupon fix we just shipped sits on essentially zero direct unit-test coverage. `validateCouponForDealer`, `applyCouponForDealer`, and the rules-of-hooks regression in `DealerCouponClientBlock.tsx` are not protected by any test. The strict-path `validateCoupon` is also weakly covered — only happy paths exercise it, and only through UI/store integration. None of its 6 rule families have direct unit tests.

---

## Section C — Concerns Surfaced

Grouped by file. Issues are flagged, not fixed.

### `tests/api/place-order.test.ts` — SHADOW IMPLEMENTATION (the worst smell in the suite)

- **Lines 70-131:** the test file defines a local function `buildOrderData()` whose own comment reads: *"This function mimics the transformation logic in place-order/route.ts"*. All 6 tests run against this local mimic — the real route handler at `src/app/api/place-order/route.ts` is never imported and never invoked.
- **Why this matters:** if the actual route diverges from the mimic (because someone edits the route but doesn't update the mimic), all 6 tests still pass. The tests can't detect drift. They verify a copy of the logic, not the logic. This is the ALWAYS-PASSES class of broken test.
- **Why it exists (likely):** the actual route has side effects (HTTP fetch to WooCommerce, env-var dependencies) that are hard to mock at the route boundary. The team chose to extract the pure transformation into a local helper rather than refactor the route to make the transformation independently testable.
- **Recommended path (when you want to fix this):** extract the real `buildOrderData` into a separate `lib/` file that both the route AND the tests import. Then this file's tests become honest.

### `tests/lib/couponUtils.test.ts` — dead import + missing dealer coverage

- **Line 9:** `validateCoupon` is imported but never referenced anywhere in the file. Either add tests or remove the import.
- **Missing entirely:** `validateCouponForDealer` (added in our recent dealer fix) is not imported, not tested. Same for `validateCouponSharedRules` (private — would require export to test, which is a refactor decision).
- **`parseCouponMeta` partial coverage:** 3 tests exist but they cover only 2 of the 4 meta keys the source actually parses. `_dockbloxx_allowed_emails` and `_expiry_time` extraction logic — including the array-vs-comma-string branch and the lowercase normalization — has no test.

### `tests/components/checkout/ShippingMethods.test.tsx` — WEAK ASSERTIONS

- **Lines 208-242, two tests** (`computes correct flat rate for subtotal $100-$249` and `>= $250`):
  - Both tests render the component with a specific subtotal prop, then assert ONLY `getByText("Flat Rate")` — which is the option label, NOT the calculated cost. The shipping cost itself is never verified.
  - The tests' OWN comments admit it: *"The actual shipping cost in store depends on calculateTotals() which uses the store's subtotal, not the prop. This test verifies the component renders correctly for the given subtotal."*
  - Effective assertion strength: ~0. These tests will pass even if the shipping calculation logic is completely broken, as long as the component still renders the "Flat Rate" label.
- The matching test for the `< $100` tier (lines 186-205) IS strong — it asserts `checkoutData.shippingCost === 10` via the store. The 2 weak tests should be brought up to that bar.

### `tests/utils/detectProductCategory.test.ts` — DUPLICATE FILE

- This entire file (16 lines, 1 test) duplicates a test that already exists in `tests/lib/utils.test.ts` (line 135 — `"detects giftcard by slug"`). Same function, equivalent assertion.
- **Why it's likely there:** evolution artifact — someone added a single test in `tests/utils/` early, then later expanded `tests/lib/utils.test.ts` with a fuller suite, and the original was never deleted.
- Fix path: delete the duplicate file, keep `tests/lib/utils.test.ts` as the single source.

### `tests/components/cart/CartSlide.test.tsx` — minor

- **Line 8:** `waitFor` imported from `@testing-library/react` but never used in any test. Dead import.

### `src/components/dealer/DealerCouponClientBlock.tsx` — ZERO COVERAGE

- The dealer landing page client component — the file we just modified TWICE (selector swap + rules-of-hooks reorder) — has no test file. No `tests/components/dealer/` folder exists.
- Critical gap given (a) the shipping URL is auto-fired on landing, (b) the rules-of-hooks reorder we did relies on the internal `if (!couponCode) return;` guard inside the effect for safety, and (c) we have no automated proof that the lenient validator path actually persists the coupon.

### Cross-cutting — fixture duplication (smell, not a bug)

- `createCartItem` is redefined in 5 separate test files with slightly different shapes (some include `discountApplied`, some don't; some include `customFields`).
- `createCoupon` is redefined in 2 files with different default codes/descriptions.
- `createCheckoutData` is redefined in 2 files.
- Not a "broken test" issue — but a maintenance time-bomb. When `Coupon` or `CartItem` types change, every fixture has to be hand-updated. A shared `tests/fixtures/` module would consolidate this.

### Cross-cutting — mock-pattern inconsistency

Three different mock patterns coexist in the suite:
1. **Auto-mock + per-test config:** `jest.mock("@/services/checkoutServices")` then `(fetchCouponByCode as jest.Mock).mockResolvedValue(...)`. Used in `ApplyCoupon.test.tsx`.
2. **Manual factory:** `jest.mock("@/hooks/useCouponTracking", () => ({ ... }))`. Used in `ApplyCoupon.test.tsx` for the hook.
3. **Component stub via factory:** `jest.mock("@/components/...", () => function MockX() { return ...; })`. Used in `OrderDetailsDesktop.test.tsx`.
4. **No mock — Zustand `setState` direct seeding:** Used in all store tests and most component tests.

All 4 work. Each has a place. But there's no documented convention for which to use when, and the suite mixes them within single files. Not a bug, but a readability cost.

### Skipped tests / TODO comments / commented-out code

- **No `.skip`, `xit`, `xdescribe`, or `test.skip` anywhere.** ✓ clean.
- **No `TODO` or `FIXME` comments inside test files.** ✓ clean.
- **No commented-out `test(...)` blocks.** ✓ clean.
- The suite is hygienic in this respect — credit where due.

---

## Summary headlines

- **120 tests across 11 suites — but the dealer-coupon fix has zero direct coverage.** `validateCouponForDealer`, `applyCouponForDealer`, and `DealerCouponClientBlock.tsx` are entirely untested.
- **`validateCoupon` itself has only happy-path coverage** via UI/store integration. None of its 6 validation rule families (allow-list, expiration, min/max, products, categories, usage limits) have direct unit tests.
- **One shadow-implementation pattern** in `place-order.test.ts` — tests run against a local copy of the route's transformation logic, not the route itself. Always-passes-regardless-of-source class of broken test.
- **Two weak assertions** in `ShippingMethods.test.tsx` (lines 208-242) where tests verify rendering but not calculation; their own comments admit it.
- **One file is a literal duplicate** (`tests/utils/detectProductCategory.test.ts` vs. `tests/lib/utils.test.ts:135`).
- **`updateCheckoutTotals` is the gold standard** of this suite — 13 well-targeted tests with strong assertions. Use it as the model when adding coverage elsewhere.

When ready to add coverage, the highest-value sequence based on this audit:
1. Direct unit tests for `validateCoupon` (each rule, success + failure path) — protects the strict path.
2. Direct unit tests for `validateCouponForDealer` (proves the skip behavior + proves the shared rules still fire).
3. Component test for `DealerCouponClientBlock.tsx` (no-coupon-code path, valid-coupon path, invalid-coupon path).
4. Add `applyCouponForDealer` cases to `useCheckoutStore.test.ts`.
5. Fix the `place-order` shadow-implementation by extracting the transformation into a `lib/` module.
6. Strengthen the 2 weak `ShippingMethods.test.tsx` assertions.
7. Delete the duplicate `detectProductCategory` test file.
8. Hoist fixtures to `tests/fixtures/`.
