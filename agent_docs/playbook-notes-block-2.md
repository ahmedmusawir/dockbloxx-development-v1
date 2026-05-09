# Playbook Notes — Block 2

> **Purpose:** Field notes captured during testing-related work in Dockbloxx, intended as ADDITIONS to the Testing Playbook v2.0. Principle leads, examples illustrate. Future-Architect folds these into v2.0 — never replacing v1.0 content.
> **Origin block:** Block 2 — Coupon-flow audit & dealer-coupon regression work, May 2026.

---

## Entry: Unit Test Audit (2026-05-08, audit step before adding coverage)

### Principle: Audit before you add

Before writing a single new test in an existing codebase, audit what's there. The audit answers two questions that determine the entire next phase of work: (1) **what's already protected** so you don't duplicate effort, and (2) **what looks protected but isn't** — broken tests, shadow implementations, weak assertions. A naive "let's add coverage to X" without auditing leads to redundant tests on top of well-covered code while real gaps stay invisible.

The audit is also a forcing function: reading every test file in one sitting reveals patterns and inconsistencies that no PR review catches because PR reviews are local. A 120-test suite with three different mock patterns and five duplicated fixture factories is a cross-cutting smell only a sweep can surface.

**Generic application (not Dockbloxx-specific):** any time you join a project mid-flight and are asked to "improve test coverage," the first deliverable should be the audit, not the new tests. Same goes for any handoff between teams or any major refactor.

### Pattern: The shadow-implementation test (always-passes anti-pattern)

Found in `tests/api/place-order.test.ts`. The route at `src/app/api/place-order/route.ts` has the real transformation logic. The test file defines a LOCAL function — same name, same shape, claims to "mimic the transformation logic" — and runs all assertions against the local copy. The actual route is never imported.

**Why this happens:** the route has side effects (HTTP fetch, env vars) that are inconvenient to mock at the route boundary. Rather than refactor the route to extract a pure helper, the team copies the logic into the test file. Tests pass forever, because the test file's logic and the test's expectations were written together.

**How to recognize it during audit:**
- Look for `// mimics`, `// same as`, `// copy of` comments at the top of test functions.
- Check whether the actual production module (route, controller, etc.) is imported anywhere in the file. If not, suspect.
- Look for re-implementations of business logic in helper functions inside the test file.

**Fix posture (don't fix during audit — flag only):** the right fix is to extract the transformation into a `lib/` module that BOTH the route and the test import. Then the tests are honest. But this is a refactor decision, not a test-only decision — flag it, defer it.

**Snippet — the smell in the wild:**
```ts
// tests/api/place-order.test.ts
// This function mimics the transformation logic in place-order/route.ts
function buildOrderData(checkoutData: CheckoutData) {
  const { parseCouponMeta } = require("@/lib/couponUtils");
  // ... 60 lines of duplicated route logic ...
}
// All 6 tests below test buildOrderData, never the actual route handler.
```

### Pattern: Weak assertions that admit their own weakness

Found in `tests/components/checkout/ShippingMethods.test.tsx`. Two tests check that the "Flat Rate" label renders, but never verify the actual shipping cost. The tests' OWN comments confess: *"This test verifies the component renders correctly for the given subtotal"* — meaning, the cost itself isn't checked.

**Generic principle:** if a test file contains comments explaining what the test DOESN'T verify, the test is probably weak by design. Comments that justify limitations are confessions. The strongest signal that a test is weak is when the author had to write a paragraph explaining what it doesn't cover.

**Audit recipe:** grep test files for words like *"depends on"*, *"verifies … not"*, *"actually"*, *"however"*, *"note that"*. These often flag tests where the author knew the assertion was incomplete.

### Pattern: Duplicate test files from evolution

Found at `tests/utils/detectProductCategory.test.ts` (16 lines, 1 test) AND `tests/lib/utils.test.ts:135` (one of 6 tests covering the same function). Equivalent assertions on the same function. Likely a leftover from when someone added a quick test in `tests/utils/`, then later expanded `tests/lib/utils.test.ts` and never went back to delete the original.

**Generic principle:** test directory evolution leaves orphan files. When a test layout changes (e.g., from per-domain folders to per-source-tree mirroring), old files often survive. Audit step: list all describes, group by target function, look for duplicates across files.

### Pattern: Fixture factory duplication across test files

Five files in this suite each redefine `createCartItem`. Two redefine `createCoupon`. Two redefine `createCheckoutData`. The shapes diverge subtly — some include `discountApplied`, some don't. When the underlying TypeScript types change, every fixture has to be hand-updated.

**Generic principle:** if you find yourself writing the same `function createX()` helper for the third time, hoist it to a shared `tests/fixtures/` module. The marginal cost of one shared file beats the marginal cost of N divergent ones.

**Counter-principle:** local helpers ARE fine when they exist in only one file. Premature hoisting is also a cost. Threshold: 3+ duplicates of the same shape = hoist. 2 = leave alone.

### Pattern: Three coexisting mock patterns in one suite

Observed in this codebase:
1. **Auto-mock + per-test config.** `jest.mock("@/services/checkoutServices")` at top, then per-test `(fetchCouponByCode as jest.Mock).mockResolvedValue(...)`.
2. **Manual factory.** `jest.mock("@/hooks/useCouponTracking", () => ({ useCouponTracking: () => ({ trackApplyCoupon: jest.fn() }) }))`.
3. **Component stub via factory.** `jest.mock("@/components/.../ApplyCoupon", () => function MockApplyCoupon() { return <div data-testid="apply-coupon" />; })`.
4. **No mock — Zustand direct seeding.** `useCartStore.setState({ cartItems: [...] })`.

All four work. None is wrong. But mixing all four within one file (as `ApplyCoupon.test.tsx` does — auto-mock for services, manual factory for hooks, direct setState for store) creates cognitive load for readers.

**Generic principle:** pick a mock pattern PER MOCK TARGET TYPE and use it consistently across the suite. e.g., "always auto-mock services; always factory-mock hooks; always setState-seed Zustand stores." Document the convention. The decision is less important than the consistency.

**Dockbloxx-specific observation:** Zustand's `setState` is the cleanest primitive for store seeding — no module mock required, the test simply uses the real store and writes to it directly. This is BETTER than mocking the store module because it exercises the real selectors and persist middleware. Worth noting in v2.0: the StarkReads playbook v1.0 doesn't have a "stores" section because StarkReads uses Supabase, not Zustand. A Zustand patterns appendix would extend v2.0 cleanly.

### Gotcha: top-level `tests/` vs `src/__tests__/`

The Testing Playbook v1.0 (StarkReads) prescribes `src/__tests__/` for unit and integration tests. Dockbloxx uses top-level `tests/` instead. The `jest.config.js` doesn't set `roots:` — Jest's default file discovery finds both layouts.

**Implication:** v1.0's `roots: ['<rootDir>/src']` recommendation is a v1.0 convention, not a Jest requirement. Both layouts work. The audit has to handle both. The principle to encode: *"locate tests by config introspection, not by convention assumption"* — read `jest.config.js` first to know where to look, don't assume.

**Specific audit-tool implication:** the playbook's `find src/__tests__/` recipe will return zero hits in Dockbloxx, falsely suggesting "no tests exist" when 120 do. Fix: query `find . -name '*.test.*' -not -path '*/node_modules/*'` plus check for top-level `tests/` and `__tests__/` folders.

### Gotcha: `setup.d.ts` is not a test file

Found `tests/setup.d.ts` — a 7-line `.d.ts` file that just imports `@testing-library/jest-dom` for type augmentation. Counts as a "test file" by glob but contains zero tests. Audit tooling that counts files as a proxy for test coverage will overcount unless it filters for actual `describe/test/it` calls.

### What's WooCommerce-specific in this audit

- The shadow-implementation in `place-order.test.ts` exists because the route makes a WooCommerce REST POST. The transformation logic — converting our internal `CheckoutData` shape into Woo's `coupon_lines` / `fee_lines` / `line_items` / `shipping_lines` payload — is large enough that it warrants extraction. Any project mediating between an internal type and a third-party API SDK will have this same pressure.
- The `_dockbloxx_*` meta_data keys are Woo-custom — the test fixtures hard-code these. Generic to any "third-party API with custom meta fields" scenario.
- WooCommerce's `coupon_lines` (built-in coupons) vs `fee_lines` (custom discounts as negative line items) is a Woo-specific design constraint. The tests document this distinction well.

### What's Dockbloxx-specific

- The dealer-coupon flow itself (auto-apply on QR landing, lenient validator path) — the audit findings about zero coverage on `validateCouponForDealer` and `applyCouponForDealer` are specific to this app.
- The Bloxx-shaped product hierarchy in `detectProductCategory` (Pole Shape, Pole Size, Version) is product-domain specific.
- The `_dockbloxx_discount_percent_per_product` meta key is bespoke to this WooCommerce install.

### What's generalizable to v2.0

- **The audit-before-adding principle.** Always.
- **The shadow-implementation anti-pattern detection recipe.** Look for `// mimics` comments, missing imports of the target module, and re-implemented helper functions in test files.
- **The weak-assertion detection recipe.** Grep for confession-language in comments.
- **The duplicate-test-file scan.** Group describes by target, flag duplicates across files.
- **The mock-pattern consistency principle.** Pick one per target type, document, enforce.
- **The Zustand `setState` seeding pattern.** New for v2.0 — v1.0 didn't cover this because Supabase doesn't have an in-memory equivalent.
- **The audit tooling note about test file location heuristics.** Read jest.config.js first.

### Coverage gap pattern: integration-only coverage of pure functions

The most subtle finding: `validateCoupon` is "covered" via UI tests (`ApplyCoupon.test.tsx`) and store tests (`useCheckoutStore.test.ts`), but ALL the integration tests use happy-path coupons. None of the 6 internal validation rules has a direct unit test that asserts the rule fires correctly when violated.

**Generic principle:** integration coverage that only exercises happy paths is a false signal. A function with N validation rules needs at least N unit tests (one per rule, asserting the rule fires when its precondition is violated). Integration tests prove the function is wired up; unit tests prove the function is correct.

This is a TWO-LAYER coverage pattern that v2.0 should make explicit:
- Layer A: Unit tests prove rule correctness (each rule, success path AND failure path).
- Layer B: Integration tests prove wiring correctness (the right function is called at the right time).
- Both layers needed. Each by itself is incomplete.

---

---

## Entry: Coverage Expansion — Pairing Skip-List Proofs With Rule-Firing Proofs (2026-05-08)

### Principle: Two complementary tests prove a "lenient validator" works

When you add a relaxed variant of a strict validator (here: `validateCouponForDealer` skips 4 of 8 rules from `validateCoupon`), DON'T just write tests proving the lenient validator passes inputs that the strict one would reject. That's only HALF the proof. The other half is testing that the lenient validator STILL REJECTS inputs that violate the rules it's supposed to keep.

Without the second half, your "lenient validator" might silently degrade into a "no validator at all" — and a failed test will only surface in production when an expired coupon goes through.

So for any relaxed variant, pair every test with its complement:
- **Skip-list proof:** "passes when X is invalid" (proves rule X is skipped).
- **Rule-firing proof:** "rejects when Y is invalid" (proves rule Y still fires).

If your relaxed variant skips N rules and keeps M rules, you need at least N skip-list proofs AND at least M rule-firing proofs. Plus a happy-path test.

**Generic application:** any "permissive mode" / "lenient mode" / "admin override" / "test-mode" function. Same pattern applies to feature flags that disable validation in dev — write the disabled-rule test AND the still-active-rule test.

### Pattern: Test through public API, not by exporting internals

The dealer-coupon refactor extracted a private `validateCouponSharedRules` helper. Both `validateCoupon` and `validateCouponForDealer` call it. The temptation: `export` the helper so we can test it directly.

Don't. Export of internal helpers couples tests to implementation. If you later inline the helper back into one of the validators (because the second variant gets removed, say), tests break for no reason. Test the PUBLIC API behavior — call the two exported validators and assert their outputs. The shared helper gets covered transitively, exactly as much as it needs to be.

This also forces the tests to be redundant in a useful way: the `min_spend` rejection test exists in both the dealer-validator block AND the strict-validator block. That redundancy isn't waste — it's the proof that BOTH validators trip the rule. If someone breaks the helper, both tests fail; if someone breaks just one validator's wiring to the helper, only that validator's test fails. The redundancy is the diagnostic granularity.

### Pattern: Inline fixture factories, hoisted later

Adopted convention for this block: each test file gets its own `createCoupon`/`createCartItem`/`createCheckoutData` factories at the top. NOT shared via a `tests/fixtures/` module. Yet.

**Why inline:** factories are still being shaped — the right defaults aren't obvious until you've used them across 25 tests. Premature hoisting locks in a shape that has to be reworked. Local factories let each file iterate independently until a stable shape emerges.

**When to hoist:** when 3+ files have factories with the same shape AND the same defaults. Before that threshold, inline duplication is cheaper than a wrong shared module. (See the audit for the current state — 5 files already redefine `createCartItem`. We're past the threshold; hoist is now warranted as a separate cleanup task.)

**Generic principle:** *premature centralization* is the cousin of *premature abstraction*. Both lock in decisions before you have the data to make them well. Both feel like good engineering hygiene. Both create maintenance pain that survives the original developer's tenure. Don't centralize fixtures until you've used them enough to know their shape.

### Snippet: skip-list proof + rule-firing proof, paired

Real example from `tests/lib/couponUtils.test.ts`:

```ts
// Skip-list proof: dealer path SKIPS rule 1 (email allow-list)
test("passes validation when email is not in allowedEmails list", () => {
  const coupon = createCoupon({
    meta_data: [{ id: 1, key: "_dockbloxx_allowed_emails", value: ["allowed@x.com"] }],
  });
  const checkoutData = createCheckoutData({
    billing: { ...DEFAULT_BILLING, email: "other@x.com" },
  });
  const result = validateCouponForDealer(coupon, checkoutData);
  expect(result.isValid).toBe(true);  // Lenient: still passes
});

// Rule-firing proof: dealer path STILL fires rule 2.2 (expiry)
test("rejects when coupon is expired", () => {
  const coupon = createCoupon({ code: "EXPIRED", expires_on: "2020-01-01" });
  const checkoutData = createCheckoutData();
  const result = validateCouponForDealer(coupon, checkoutData);
  expect(result.isValid).toBe(false);  // Strict on what matters
  expect(result.message).toMatch(/expired/i);
});
```

Both tests use the same factory, the same target function — but they prove inverse things. Together, they define the function's contract.

### Pattern: The regression-test sentence

For the dealer fix specifically, the most important test isn't a unit test of either validator — it's the integration-style store-action test that reproduces the exact pre-fix bug:

```ts
test("applies dealer coupon successfully even when billing.email is empty (regression)", () => {
  // Pre-fix: applyCoupon (strict) silently rejected because email was empty.
  // Post-fix: applyCouponForDealer must succeed in the SAME setup.
  useCheckoutStore.setState({
    checkoutData: { ...current, billing: { ...current.billing, email: "" } },
  });
  // ... apply coupon ...
  expect(state.checkoutData.coupon).not.toBeNull();
});
```

The test name encodes the bug as a sentence: *"applies dealer coupon successfully even when billing.email is empty (regression)"*. A future engineer reading this name knows (a) what the test exists to prevent, (b) that it's specifically guarding against a known prior bug.

**Generic principle:** every regression test should be named in a way that describes the BUG it prevents, not just the behavior it asserts. "renders correctly" is a weak name. "renders zero-state when cartItems is empty (was previously crashing on `.map`)" is a strong one. The strong name lives forever; the weak one rots.

### Gotcha: `console.warn` from inside the call chain

The store action's `applyCouponForDealer` calls `validateCouponForDealer` → `isCouponExpiredByTimezone`. Both can emit `console.warn` along the way — `isCouponExpiredByTimezone` warns when expiry-time/timezone metadata is missing (falls back to date-only check). The store action also warns "Invalid dealer coupon: ..." on rejection.

For the regression-style test that asserts `expect(warnSpy).toHaveBeenCalledWith("Invalid dealer coupon:", expect.stringMatching(/expired/i))`, this is fine — Jest's `toHaveBeenCalledWith` matches at least one call with the given args, not all calls. But if you'd written `toHaveBeenCalledTimes(1)`, it would fail because the fallback warn from `isCouponExpiredByTimezone` is a SECOND warn call.

**Generic principle:** when spying on `console` methods that fire from deep inside a call chain, prefer `toHaveBeenCalledWith` (matches presence) over `toHaveBeenCalledTimes` (matches exact count). Strict count assertions are brittle to changes in upstream warning behavior. They lock you into a count even when the count is incidental, not contractual.

### Gotcha: TypeScript's `Partial<T>` with nested objects

The fixture pattern `createCheckoutData(overrides: Partial<CheckoutData>)` works for top-level fields, but `Partial` does NOT recurse into nested objects. So:

```ts
createCheckoutData({ billing: { email: "" } })  // ❌ TS error: missing first_name, last_name, etc.
```

The `billing` override has to provide the FULL `BillingAddress` shape. Two ways to handle:

```ts
// Option A: spread defaults explicitly (used in this codebase)
createCheckoutData({ billing: { ...DEFAULT_BILLING, email: "" } })

// Option B: use DeepPartial<T> in the factory signature
function createCheckoutData(overrides: DeepPartial<CheckoutData>): CheckoutData { ... }
```

We chose Option A because it's explicit and stays close to standard JS patterns. Option B requires importing or defining `DeepPartial`, which is a tiny bit more cognitive load for the reader. Either works; pick one and use it consistently.

### What's WooCommerce-specific in this block

- The `_dockbloxx_allowed_emails` meta key (and its array-vs-comma-string parsing) is bespoke. Tests construct it as `[{ id: 1, key: "_dockbloxx_allowed_emails", value: [...] }]` — exactly mirroring WooCommerce's meta_data shape from the REST API.
- The `_dockbloxx_discount_percent_per_product` meta key is also bespoke.
- WooCommerce's coupon shape (`min_spend`/`max_spend` as strings, `usage_count`/`usage_limit` as nullable numbers) differs from our internal types and requires fixtures to use the correct types.

### What's Dockbloxx-specific

- The dealer landing page itself, and the `applyCouponForDealer` action that enables it.
- The 6 specific validation rules in `validateCoupon` (rules 0, 0.1, 1, 6 are gate rules; rules 2, 2.2, 3, 4, 5 are shared with the dealer path).
- The exact decision of which rules to skip on the dealer path (skip 0, 0.1, 1, 6).

### What's generalizable to v2.0

- **The skip-list-proof + rule-firing-proof pairing.** Universal pattern for any relaxed variant of a strict validator. Should be a documented v2.0 recipe.
- **Test-through-public-API principle.** Universal — applies to any internal helper extraction.
- **Regression-test naming convention.** Universal — name tests by the bug they prevent, not the behavior they assert.
- **`toHaveBeenCalledWith` vs `toHaveBeenCalledTimes` heuristic.** Universal — matters anywhere you spy on side-effect functions.
- **Inline-then-hoist fixture factories.** Universal — applies across any test suite where shape is still evolving.
- **`Partial<T>` doesn't recurse — spread defaults explicitly.** Universal TypeScript test pattern.

### Audit finding: we missed a test file

The audit (earlier this session) reported 12 test suites in `tests/`. The `npm test` run after this expansion revealed a 13th test file at `src/lib/test.ts` (note: in `src/`, not `tests/`). The audit recipe didn't sweep `src/` for test files because the codebase convention puts tests in `tests/`. Both layouts get picked up by the default Jest config though.

**Lesson for v2.0 audit recipe:** always sweep BOTH `tests/` and `src/` (and any other config-discovered roots) for `*.test.*` files. Codebase convention isn't authoritative — Jest's actual file discovery is. The `src/lib/test.ts` file may be legitimate or it may be dead code; flag it for review either way. Audit tools should report `find . -name '*.test.*' -not -path '*/node_modules/*' -not -path '*/.next/*'` results in full, not just from the conventional folder.

---

*Block 2 entries end here. Future entries from later sessions append below this line.*
