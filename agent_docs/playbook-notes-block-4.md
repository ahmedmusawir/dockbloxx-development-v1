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

*Block 4 continues with Step 4C (Stripe payment intent) in a follow-up session, after Tony reviews 4B.*
