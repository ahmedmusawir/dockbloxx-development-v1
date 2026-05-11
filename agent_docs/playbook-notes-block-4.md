# Playbook Notes — Block 4

> **Purpose:** Field notes from Block 4 — integration tests for Next.js App Router route handlers, mocking external REST services at the cleanest boundary.
> **Origin:** May 2026 sessions on dockbloxx-development-v1. Backend: WooCommerce REST.
> **Audience:** Future-Architect synthesizing v2.0 of the Testing Playbook.

Block 4 picks up where Block 3 left off. Block 3 was the E2E layer (Playwright, full stack). Block 4 is the integration layer (Jest, route handlers + mocked external services). The split is intentional: E2E proves the UI flow; integration proves the route's orchestration logic with deterministic mock inputs.

---

## Entry: Block 4 setup (Step 4A)

### Pattern: dedicated `test:integration` npm script + shell wrapper

Mirrors the v1.0 playbook's `npm run test:integration` convention, adapted for our tooling:

```json
"test:integration": "jest tests/api --testPathPatterns=tests/api"
```

The positional `tests/api` is a path filter; `--testPathPatterns=tests/api` is the regex pattern (Jest 30 syntax — the plural). Both narrow Jest's discovery to the integration suite. Belt-and-suspenders.

Shell wrapper at `scripts/run_integration_tests.sh` follows the same `cd "$(dirname "$0")/.."` pattern as the other shell wrappers in the repo (lint, unit, e2e). One-line callsite for CI / scripted runs.

**Convention reuse:** integration tests live in `tests/api/`, NOT `src/__tests__/api/` (per v1.0). Matches the codebase's existing layout (`tests/api/place-order.test.ts` was already there from Block 2). Single jest.config.js, no split — current setup runs all 149 unit + integration tests in 3 seconds, splitting is premature optimization.

**GENERALIZABLE.**

---

## Entry: Fetch-mock pattern for REST-backed route handlers (Step 4B)

### Pattern: mock `global.fetch`, not the SDK

When testing Next.js App Router route handlers that talk to external REST APIs (WooCommerce, GitHub, generic third-party REST), the cleanest mock surface is `global.fetch`. Set in `beforeEach`, reset in `afterEach`, configure per-test with `mockResolvedValue` (success) or `mockRejectedValue` (failure).

This is the WooCommerce REST equivalent of v1.0's Supabase chain mock. **Same goal** (mock the external service at the cleanest boundary). **Different implementation** (REST vs SDK):
- v1.0 (Supabase + SDK): mock the singleton wrapper, return chain-method objects, assert on `.upsert()` / `.update()` calls.
- Block 4 (Woo + REST + fetch): mock `global.fetch`, return Response-shaped objects, assert on the URL the route built.

**Why mock fetch, not the SDK proxy:** WooCommerce doesn't have a Node SDK we use — the route handlers use native `fetch` directly. So `global.fetch` IS the SDK boundary. No wrapper to mock.

### The minimum-viable shape

```ts
function mockOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function mockNotOkResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    headers: new Headers(),
  } as unknown as Response;
}

describe("GET /api/some-route", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  test("success path", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockOkResponse(payload));
    const response = await GET(request);
    // assertions
  });

  test("failure path", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("...."));
    // ...
  });
});
```

### Four canonical tests per route

Pattern that emerged from `get-coupon-by-code`:

1. **Happy path** — upstream returns ok + valid body. Assert response 200, body matches, and **assert what URL the route built** (`mock.calls[0][0]`). The URL-shape assertion catches "fixed the response handling but broke the URL construction" regressions.
2. **Upstream not-ok** — upstream returns ok:false (404, 5xx). Assert route's mapped status code + error body shape.
3. **Validation failure** — required input missing. Assert 400 + error body. **And critically: assert `fetch` was NOT called** — we shouldn't hit the upstream when the request is invalid client-side.
4. **Upstream throw** — `mockRejectedValueOnce(new Error(...))`. Assert route returns 500 + generic error message that does NOT leak the upstream error text (no stack traces / network details exposed to the client).

The 4-test minimum catches the four behavior categories at REST boundaries: success, expected-failure, input-rejection, unexpected-failure.

### Asserting the URL the route built

This is the most useful structural assertion:

```ts
expect(global.fetch).toHaveBeenCalledTimes(1);
const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
expect(fetchUrl).toContain("/coupons?");
expect(fetchUrl).toContain("code=TESTCOUPON");
```

Catches: missing query params, wrong endpoint path, accidentally appending the user input twice, off-by-one path constructions. Without this assertion, a route that builds the wrong URL but returns the correct response by accident (mock returns the canned data regardless) would pass — a "passes for the wrong reason" trap.

### Gotcha — `@jest-environment node` docblock required

Next.js's `next/server` import (which the route handler uses for `NextResponse`) requires global `Request` and `Response` constructors at module-load time. Jest's default `jsdom` environment doesn't provide them. First run of any route-handler test fails with `ReferenceError: Request is not defined`.

Fix is one line at the top of the test file:

```ts
/**
 * @jest-environment node
 */
```

Node 18+ has fetch + Request + Response globally. Only this single test file uses the node env; all React component tests still run in jsdom (correct for their needs). Per-file override is the right granularity — don't change the global jest config.

**GENERALIZABLE** to any Next.js + Jest setup with route-handler tests.

---

## Entry: Read route source before writing route tests

Always paste/read the route handler source before writing integration tests for it. Test fixtures need to match the exact request shape (`Request` vs `NextRequest`, params destructuring, header reads, etc.) the handler expects.

Concrete savings: in the `get-coupon-by-code` work, reading the source first revealed:
- Handler signature: `GET(req: Request)` — Web standard, not `NextRequest`.
- Reads `code` via `new URL(req.url).searchParams.get("code")` — so the test must build a Request with the right URL shape, not just a header.
- Returns 400 with `{ error: "Coupon code is required" }` when code is missing — the test's regex `/code/i` matches both "Coupon code" and "code" generically.
- Returns 404 with `{ error: "Coupon not found" }` when upstream is not-ok — the test's regex `/not found/i` matches the exact message.
- Returns 500 with `{ error: "Internal Server Error" }` on catch — generic, no upstream details leaked. Test asserts the negative (no specific upstream error text in the response).

Writing the tests without reading first would mean: write 4 tests against assumed shapes → run → 2-3 fail because the assumed shape was wrong → rewrite → run → maybe pass. The "read first" overhead is ~30 seconds; the rewrite cost is 5-10 minutes per shape mismatch.

**Generalizable methodology**, not framework-specific. The same principle applies to component tests, hook tests, store tests — read the contract first, write the test second.

---

## Tagging for v2.0 synthesis

- `npm test:integration` script convention — **GENERALIZABLE.**
- `tests/api/` directory layout — convention, not requirement; either `tests/api/` or `src/__tests__/api/` works.
- Fetch-mock pattern for REST-backed routes — **GENERALIZABLE** (any REST-backed app).
- 4-test canonical shape per route — **GENERALIZABLE** (success / not-ok / validation / throw).
- "Assert the URL the route built" — **GENERALIZABLE** (REST + fetch pattern).
- `@jest-environment node` docblock — **JEST + NEXT.JS-SPECIFIC**, but the broader principle (per-file env override) is generalizable.
- Read-source-first methodology — **GENERALIZABLE.**
- WooCommerce REST query-param auth (`consumer_key=...&consumer_secret=...`) — **WOOCOMMERCE-SPECIFIC.**
- `_dockbloxx_*` meta keys — **DOCKBLOXX-SPECIFIC.**

---

## Entry: Source recon catches more than test plan mismatches (Step 4C.1 finding)

### Principle

The original plan for Step 4C assumed a single-step Stripe call with a wrapper module. Source recon revealed: SDK-direct import (no wrapper), multi-step customer flow (list → maybe create → PaymentIntent), error leak in catch block, zero input validation.

Two of those discoveries weren't test plan issues — they were **production security issues** that source recon happened to surface. Specifically:

1. **Error leak (HIGH severity).** Route returned `{ message: error.message }` from the catch block. Stripe errors can contain card digits, customer emails, internal request IDs. → Fixed in 4C.PRE, locked in by Test 6. See `SECURITY_FINDINGS.md` Finding #1.
2. **No input validation (MEDIUM severity).** Route accepts `amount`, `currency`, `email`, etc. with zero checks. Enables card-testing fraud at $0.01. → Open finding, see `SECURITY_FINDINGS.md` Finding #2.

### Generalized recommendation

When writing integration tests for security-sensitive endpoints (payment, auth, PII handlers), the source recon phase should EXPLICITLY look for:

1. **Error handling patterns** — what gets logged vs what gets returned. Look for `{ message: error.message }` patterns or anything that passes through upstream errors verbatim.
2. **Input validation gaps** — what's destructured vs what's validated. If `const { x, y, z } = await request.json()` is followed immediately by use of those values without a schema check, that's a finding.
3. **Implicit trust assumptions** — does the route trust the caller? Trust the upstream service? Where does the trust boundary live, and does the code enforce it?

### Where findings should land

Findings discovered during recon belong in a dedicated `SECURITY_FINDINGS.md`, **NOT** quietly absorbed into the test code as "test it as-is." The recon phase is a security audit opportunity; treating findings as test scope creep would silently bake the vulnerabilities into the test suite (e.g., "Test 4: assert the leak happens" — that's a regression test for a bug, not a fix).

The right pattern:
- Fix HIGH-severity findings inline in the same session (small, contained source change + test that locks in the fix).
- Document MEDIUM/LOW findings in `SECURITY_FINDINGS.md` with severity, recommended fix, and mitigation-until-fix.
- Tests assert the CORRECT post-fix behavior (defensive assertions), not the buggy pre-fix state.

**GENERALIZABLE** — applies to any test development cycle on endpoints handling money, identity, or sensitive data.

---

## Entry: Mock the Stripe SDK constructor when there's no wrapper

### Pattern

When the route does `import Stripe from "stripe"` and `new Stripe(...)` directly (no project wrapper module), mock the `stripe` package itself. The factory returns a constructor that hands back a persistent instance whose methods are top-level `jest.fn()`s.

```ts
const mockCustomersList = jest.fn();
const mockCustomersCreate = jest.fn();
const mockPaymentIntentsCreate = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    customers: { list: mockCustomersList, create: mockCustomersCreate },
    paymentIntents: { create: mockPaymentIntentsCreate },
  }));
});
```

### Why top-level `mock*` constants

Two reasons:

1. **Jest's hoisting check.** `jest.mock(...)` factory functions can't reference outer-scope variables UNLESS they're prefixed with `mock` (case-insensitive). Top-level `const mockX = jest.fn()` satisfies this.
2. **Module-load capture.** The route instantiates `const stripe = new Stripe(...)` at MODULE LOAD time — once, when the test file's `import { POST }` runs. After that, the route's `stripe` variable is permanently bound to whatever the mock returned during that one call. By having the constructor mock return a stable object containing references to top-level `jest.fn()`s, we can configure those fns per-test (`mockResolvedValueOnce`, `mockRejectedValueOnce`) without losing the binding.

### Per-test reset

```ts
beforeEach(() => {
  mockCustomersList.mockReset();
  mockCustomersCreate.mockReset();
  mockPaymentIntentsCreate.mockReset();
});
```

`mockReset` clears both call history AND any prior `mockImplementation`/`mockResolvedValue` configuration. Stronger than `clearMocks` (which only clears call history). Use `mockReset` when tests configure different success/failure responses per test, because residual configuration from a prior test would silently leak.

### Contrast with the wrapper pattern (v1.0)

v1.0 playbook uses `jest.mock("@/lib/stripe/stripe", () => ({ stripe: { ... } }))` because StarkReads has a wrapper module. Dockbloxx has no wrapper, so the mock target is `"stripe"` itself, and the factory is a class-replacement (`jest.fn().mockImplementation(...)`) rather than a plain object.

**Same goal — mock the external service at the cleanest boundary. Different implementation depending on whether a wrapper exists.**

If you have control of the codebase and want easier testability, **introduce a thin wrapper module.** The wrapper pattern is cleaner (no class-constructor mock dance, no `mock*` prefix dance). But when you don't have a wrapper, the constructor mock works fine — just verbose.

**GENERALIZABLE** to any Node SDK with a class-based default export (Stripe, MongoDB driver, AWS SDK v2, etc.).

### Multi-step flow assertion pattern

When a route makes multiple SDK calls in a branchy sequence (e.g., `list customers → maybe create customer → create PaymentIntent`), each branch deserves a test:

- **Skip path:** input that bypasses an early step entirely. Assert that step was NOT called.
- **Reuse path:** input that triggers branch A. Assert A was called, B was NOT.
- **New path:** input that triggers branch B. Assert B was called with the right args, A's result was overridden.

Use `expect(mockFn).not.toHaveBeenCalled()` and `expect(mockFn).toHaveBeenCalledWith(...)` together — the absence assertions catch "accidentally always-calling" regressions, the presence assertions catch "wrong args" regressions.

**GENERALIZABLE.**

---

## Entry: Defensive error message assertions

### Pattern

When testing the catch block of a route, assert TWO things:

1. The expected user-facing error message IS present (positive assertion).
2. The internal/upstream error message is NOT present (negative assertions).

```ts
mockPaymentIntentsCreate.mockRejectedValue(
  new Error("Your card ending 4242 was declined. Internal ID abc-secret-leaked")
);

const response = await POST(makeRequest({ amount: 5000, currency: "usd" }));
const data = await response.json();

expect(response.status).toBe(500);
expect(data.message).toBe("Failed to process payment. Please try again.");

// Defensive — none of the upstream leaks through.
expect(data.message).not.toMatch(/4242/);
expect(data.message).not.toMatch(/abc-secret-leaked/);
expect(data.message).not.toMatch(/declined/i);
```

### Why this matters

Catches a class of security regressions where someone "improves" error messages by including the original error and accidentally leaks PII, card data, or internal infrastructure details. The positive assertion alone (`expect(data.message).toBe("...")`) might pass if the message is `"Failed to process payment. Your card ending 4242 was declined."` — the .toBe would fail then, but `.toMatch` of generic patterns wouldn't.

Use `expect.not.toMatch` with regexes for the specific kinds of leaks you want to prevent: numeric sequences that could be card digits, internal-looking IDs, vendor-specific keywords like "declined" / "expired" / "insufficient_funds" that could betray status.

### Where to use this

Mandatory for any route that:
- Talks to a payment processor (Stripe, Square, PayPal, Adyen)
- Talks to an identity provider (Auth0, Cognito, custom auth)
- Talks to a data layer that might include PII in errors (Postgres FK constraints with email values, Mongo validation errors)
- Returns errors from third-party APIs that include request IDs

**GENERALIZABLE** to any service-boundary route.

---

## Entry: Shadow implementation tests are false coverage (Step 4D)

### Principle

When integration tests are too hard to write against the real code (route handlers with side effects, complex dependencies), a common shortcut is to copy the logic into the test file and test the copy. The copy and the real code diverge over time. **Tests stay green. Coverage is illusion.**

### Fix pattern

Extract the testable logic into a shared lib that **both the route AND the tests import**. Now the tests test the real implementation. Add separate route-level tests (with mocked external services) for the orchestration layer (validation, fetch, response handling).

```
Before:
  route.ts:    [inline transformation logic]  ←─┐
                                                 │ no shared code
  test.ts:     [local mimic function]      ←────┘
                test calls mimic → asserts mimic shape

After:
  lib.ts:      export function buildOrderData(...)  ←─┐
                                                       │ single source of truth
  route.ts:    import { buildOrderData }              │
                const orderData = buildOrderData(...) │
                                                       │
  test.ts:     import { buildOrderData }              │
                test calls buildOrderData → asserts real shape
```

### Detection heuristic

A test file that defines its own copy of a function whose name matches something in the source is a **strong shadow-implementation smell.** Grep patterns to find them:

- `function buildX` / `const buildX = ` in `tests/**/*.test.ts` where the source has a matching name.
- Comments like `// mimics`, `// same as`, `// copy of` near a function definition in tests.
- Imports of helper utilities (e.g., `parseCouponMeta`) inside a test-file function that ALSO appears in the source's similarly-named function.

The Dockbloxx case had all three: a `function buildOrderData` in the test, an explicit comment `// This function mimics the transformation logic in place-order/route.ts`, and an inline `require("@/lib/couponUtils")` for `parseCouponMeta` that the route also used.

### Risk scale

Drift accumulates silently. Dockbloxx's `place-order` shadow had drifted in **5 places** including:

- Coupon-type discrimination (1 flag vs 2)
- `coupon_lines` routing logic (lenient vs selective by `discount_type`)
- `line_items.meta_data` (mimic missing the `customFields` flattening — a real Build-a-Bloxx production feature)
- Order-level `meta_data` (mimic missing the GHL attribution writing entirely)
- Required-field validation (mimic had none)

The customFields flattening had **zero real test coverage** despite being a production feature relied on by Build-a-Bloxx custom engraving orders. The test suite reported coverage, but the coverage was lying.

### What the fix produced

- 6 existing tests now exercise the real lib (no behavior change required — the tests' assertions happened to be on shape elements that DID match between mimic and real lib).
- 6 new route-handler tests added (orchestration: validation guard, Woo fetch, success response shape, error mapping, defensive leak assertions, the customFields flattening feature).
- 2 production security findings surfaced during recon (one fixed inline, one documented).
- Total: 6 → 12 tests on `place-order`, with the new 6 covering paths the suite had been blind to.

**GENERALIZABLE.** Applies to any framework or language. The detection heuristic + extract-and-import fix shape transfers cleanly.

---

## Entry: Don't test features you're killing

### Principle

When code remains in the codebase for deferred-removal reasons but the feature is deprecated, do NOT write tests to lock in its behavior. Tests have maintenance cost; protecting regressions in features you don't care about is **negative ROI.**

### Concrete example from this block

The GHL attribution feature plumbing in `src/lib/orderTransform.ts` writes Coach/GHL attribution data into Woo order `meta_data`. Production has no consumer for this (no Cyberize plugin, no GHL webhook). The code writes empty meta to Woo on prod — harmless but vestigial.

When extracting the transformation lib, we preserved the plumbing AS-IS per the "literal move, not a refactor" rule. We did NOT add tests asserting the attribution `meta_data` shape. The feature is deprecated; tests would be protecting behavior we don't want to lock in.

What we DID test: the shape of the `meta_data` array EXISTS in the output (so the structural contract isn't broken for other consumers reading `meta_data`). What we did NOT test: the specific keys/values for attribution fields.

### How to communicate the decision

Document in `CLEANUP_BACKLOG.md` so future readers understand "this code is intentionally untested because the feature is dead." Without the document, a future engineer might add tests for "missing coverage" and lock in the dead feature's behavior, making removal harder.

### Test the SHAPE if it matters to other consumers

Even for deprecated features, the surrounding output shape might be load-bearing for other code. Test the shape's existence (e.g., `expect(orderData.meta_data).toBeDefined()`), but skip feature-specific content assertions (`expect(orderData.meta_data[0].key).toBe("_coach_ghl_utm_source")`).

**GENERALIZABLE.**

---

## BLOCK 4 CLOSE-OUT SUMMARY

### What got built

| Step | Output |
|---|---|
| 4A | `scripts/run_integration_tests.sh` + `test:integration` npm script + baseline (9 → run). |
| 4B | `tests/api/get-coupon-by-code.test.ts` — 4 tests (happy / 404 / 400 missing param / 500 throw). |
| 4C | `tests/api/create-payment-intent.test.ts` — 7 tests. Found two production security issues during recon (HIGH error leak, MEDIUM input validation). HIGH fixed inline, MEDIUM documented as open finding. |
| 4D | `src/lib/orderTransform.ts` extracted (shadow-impl fix). `tests/api/place-order.test.ts` rewired: existing 6 tests now use the real lib, 6 new route-handler tests added. Found a third production security issue (Woo error leak) and fixed inline. |

### Test count progression

| Snapshot | Jest tests | E2E tests | Total |
|---|---|---|---|
| Start of 2026-05-11 session | 149 | 16 | 165 |
| After category-pagination fix + regression test (morning) | 149 | 16 | 165 |
| After Block 4 Step 4A baseline | 149 | 16 | 165 |
| After 4B (4 new) | 153 | 16 | 169 |
| After 4C (7 new) | 160 | 16 | 176 |
| **After 4D (6 new — net, since 6 existing rewired)** | **166** | **16** | **182** |

### Production issues found and fixed (this block)

| # | Severity | Where | Status |
|---|---|---|---|
| 1 | HIGH | `/api/create-payment-intent` — Stripe error leak via `error.message` pass-through | ✅ FIXED 2026-05-11 |
| 3 | HIGH | `/api/place-order` — Woo error leak via `{ details: errorData }` | ✅ FIXED 2026-05-11 |

### Production issues found and DEFERRED

| # | Severity | Where | Status |
|---|---|---|---|
| 2 | MEDIUM | `/api/create-payment-intent` — no input validation | 🔴 OPEN — `SECURITY_FINDINGS.md` |

(Category pagination "bug" earlier in the day was a route-bug, not a security finding. Fixed and counted in test progression.)

### Coverage holes closed

- **customFields flattening** (Build-a-Bloxx engraving) — Test 11 of place-order. Zero prior coverage despite being a real production feature.
- **Required-field validation guard** — Test 8 of place-order. Mimic had no validation; real route returned 400 that was never tested.
- **Response shape on success** — Test 12 of place-order. The frontend's `data.id` read had no test guard.
- **Stripe customer reuse vs creation** — Tests 2 and 3 of create-payment-intent. Branch coverage of `customers.list` → reuse vs `customers.create`.
- **Defensive error message assertions** — Tests across all three new route files. Locks in the no-leak contract.

### Coverage holes left open intentionally

- **GHL attribution writing** — feature deprecated, code preserved. Test value ≈ feature value (low). See "Don't test features you're killing" principle above.

### Patterns established this block

1. **Fetch-mock pattern for REST-backed route handlers** (`global.fetch = jest.fn()`, mockResolvedValue / mockRejectedValue per test).
2. **Stripe SDK constructor mock** (no wrapper case): `jest.mock("stripe", () => jest.fn().mockImplementation(...))` with `mock*`-prefixed top-level fns for hoisting + module-load capture.
3. **Defensive error message assertions** (`.toBe(generic) + .not.toMatch(/internal-leak-pattern/) × N`).
4. **`@jest-environment node` docblock** for route-handler tests (Next 15's `next/server` needs global Request/Response).
5. **Assert the URL the route built** (`mock.calls[0][0]`) as a structural check that catches "right body, wrong endpoint" regressions.
6. **4-canonical-test shape per route** (success / upstream-not-ok / validation-rejection / upstream-throw).
7. **Extract-and-import** as the shadow-implementation fix shape.
8. **Source recon before test writing** as a security-audit opportunity, with findings flowing to `SECURITY_FINDINGS.md` not into test code.

### Generalizable principles documented across Blocks 2 / 3 / 4

10+ principles surfaced and captured. Cross-reference at-a-glance:

- Block 2: skip-list-proof + rule-firing-proof pairing, test through public API, regression-test naming convention, fixture-factory hoisting threshold.
- Block 3: test data discovered not declared (fixture discovery), atomic write or no write, credential scrubbing, key-absent vs empty-value, "tests that pass for the wrong reason are worse than tests that fail," "environment drift first."
- Block 4: fetch-mock for REST handlers, mock Stripe SDK constructor when no wrapper, defensive error message assertions, source recon catches security issues, shadow implementations are false coverage, don't test features you're killing.

All tagged GENERALIZABLE / WOOCOMMERCE-SPECIFIC / DOCKBLOXX-SPECIFIC / FRAMEWORK-SPECIFIC for v2.0 synthesis.

### Open items deferred (full menu)

Same list as Block 3 close-out plus this block's additions:

- **`SECURITY_FINDINGS.md` Finding #2** — Stripe input validation (MEDIUM, OPEN).
- **`CLEANUP_BACKLOG.md` items:**
  - Dead `priceAfterDiscount` calc in `orderTransform.ts`
  - Next 15 `params` async warning
  - 165 deferred lint warnings
  - ApplyCoupon "Dealer Coupon Detected" inert banner
  - Stripe metadata string coercion
  - GHL attribution plumbing removal
- **Place-order shadow-impl** — ✅ now fixed.
- **`src/lib/test.ts` orphan tautology** — pending.
- **`tests/utils/detectProductCategory.test.ts` duplicate** — pending.
- **Fixture hoist** to `tests/fixtures/` and `e2e/fixtures/` — pending.

### Block 4 status: CLOSED (pending Tony's manual order verification)

Block 5 (whatever it turns out to be) opens in a fresh session.

---

## Entry: Changelog discipline

### Practice

Every Factory app maintains a `CHANGELOG.md` at root following [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/).

### Maintenance flow

- All in-flight changes accumulate under `[Unreleased]`.
- At deploy time, promote `[Unreleased]` → versioned section, date-stamp it (ISO 8601: `YYYY-MM-DD`), git-tag the commit (`v1.2.0`).
- Sections: `Added`, `Changed`, `Fixed`, `Security`, `Deprecated`, `Removed`.
- Skip: typo fixes, dep bumps, internal refactors, doc-only changes, test additions.
- **Inclusion test:** "would a stakeholder care this changed?" If yes, log it. If no, skip.

### Semantic versioning rules

- **MAJOR** for breaking changes / required user action.
- **MINOR** for new features (backward compatible).
- **PATCH** for bug fixes (backward compatible).

### Cost / benefit

Costs ~5 min per deploy. Returns hours of "what shipped when?" investigation time over the project lifetime. Auditor-friendly artifact for regulated industries (HIPAA, SOC2, PCI). Especially valuable when:

- Customer reports a bug — find the commit range by version, not by grep.
- Security audit needs to know when a CVE-affected dependency was upgraded.
- A regression appears post-deploy and you need to bisect against what shipped.
- New team member asks "what did we do in Q1?" — point them at the changelog.

### When NOT to start a changelog

Almost never. The barrier to creating one is low (~10 min), and starting late is worse than starting now. If the project is genuinely under 100 LOC or week-2 prototype, sure — but anything past that warrants the discipline.

### Block 4 example

This project went 0.x → 1.0.0 today (2026-05-11) — the formal "first documented release" boundary. Prior git history exists but isn't back-documented in the changelog; future deploys start their entries under `[Unreleased]` and get promoted at version-bump time.

**GENERALIZABLE.**

---

*Block 4 closed 2026-05-11.*
