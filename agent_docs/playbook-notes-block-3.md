# Playbook Notes — Block 3

> **Purpose:** Field notes from Block 3 — adding the Playwright E2E layer to Dockbloxx. Reference: TESTING_PLAYBOOK.md v1.0 sections 4, 6, 9, 10. Block 3 introduces a NEW pattern not in v1.0 — fixture discovery — that should fold into v2.0 as a new section between 9 and 10.
> **Origin:** May 2026 sessions on dockbloxx-development-v1. Backend: WooCommerce REST (Pressable staging).
> **Audience:** Future-Architect synthesizing v2.0 of the Testing Playbook.

---

## Entry: Block 3 Setup — Playwright Install + Config (Step 3A)

### Pattern: `playwright.config.ts` minimum-viable shape

Reused verbatim from v1.0 with three knobs that matter most:

```ts
{
  testDir: './e2e',          // tests outside src/, kept separate from Jest
  retries: 0,                // non-negotiable — see principle below
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,  // critical for local iteration speed
    timeout: 120000,
  },
}
```

**`reuseExistingServer: true`** is the unsung hero of local dev iteration. If a `npm run dev` is already running, Playwright uses it. Otherwise it spawns one. You don't have to think about it. **GENERALIZABLE** to any framework that has a dev server.

### Principle: `retries: 0` is non-negotiable

Flaky tests ARE bugs, not inconveniences. The moment you set `retries: 1`, you create a class of bugs that hide forever — the ones that fail 50% of the time. Two failures in a row = retry passes = green CI = silent regression. **GENERALIZABLE** — applies to every test framework, not just Playwright.

### Gotcha: `npx playwright test --list` prints `Error: No tests found` but exits 0

Misleading-but-harmless. Empty `e2e/` folder triggers the "Error" prefix in stdout, but exit code is still 0. Use exit code as ground truth, not the word "Error". **PLAYWRIGHT-SPECIFIC**.

---

## Entry: Two-Runner Shell Wrappers (Step 3B)

### Pattern: Headless runner + UI runner as separate scripts

```bash
scripts/run_e2e_tests_headless.sh    # CI / verification mode
scripts/run_e2e_tests_ui.sh          # Local development / debugging
```

Both wrap the corresponding `npm run test:e2e[:ui]` script. Same tests, same code, two runners. Headless for verification (fast, scriptable, no GUI required). UI mode for debugging (time-travel, DOM inspection, see what the test sees). **GENERALIZABLE** — applies to Cypress too, any browser-driven E2E.

### Gotcha (carried from earlier session): scripts must `cd` to project root

Every shell wrapper script in `scripts/` needs:
```bash
cd "$(dirname "$0")/.."
```
…before it runs commands. Without this, calling `./run_lint.sh` from inside `scripts/` causes commands like `npx eslint .` to scan the wrong directory. Established yesterday in a separate fix; applied preemptively to the new E2E wrappers. **GENERALIZABLE** — any project with a `scripts/` folder hits this eventually.

---

## Entry: Fixture Discovery Architecture (Step 3B′ — NEW pattern, not in v1.0)

### Principle: Test data should be discovered, not declared

When testing against a real backend, hardcoded record references (specific product IDs, specific coupon codes, specific category slugs) create brittle coupling between test logic and dataset state. The first time someone deletes a test product from the CMS, every test that referenced it breaks — and the failure message says "element not visible" rather than "your fixture record vanished," obscuring the real cause.

**The pattern:** a discovery script connects to whichever backend is configured in `.env.local`, pulls a small set of live records (first published product, populated category, valid coupon, etc.), merges them with any static fixtures, and writes a single JSON file that all E2E tests read at module top.

Result: tests reference *roles* (the populated category, the valid coupon) rather than *records* (`category-slug-7`, `code-aham10`). The discovery script is the only place that has to change when the dataset changes. Tests stay portable across dev / staging / prod backends and survive backend swaps.

**GENERALIZABLE** to any REST-backed app. The principle is universal even when the implementation is WooCommerce-specific.

### Pattern: Static + live fixture split

Two files in `e2e/fixtures/`:

| File | Source | Committed? | When it changes |
|---|---|---|---|
| `dealers.json` | manually maintained | YES (committed) | when team adds/removes dealer pages in WP |
| `live-data.json` | discovery script output | NO (gitignored) | regenerated per environment via `npm run fixtures:fetch` |

Static fixtures are for things the discovery script *can't* know (e.g., which dealer slugs the testing team has agreed to keep stable in WP). Live fixtures are for everything else — let the script figure it out fresh each time.

**GENERALIZABLE** — applies to any test data that has both "stable knowns" and "discoverable unknowns."

### Pattern: Atomic file write — temp + rename

```ts
const tmpPath = `${LIVE_DATA_PATH}.tmp`;
fs.writeFileSync(tmpPath, JSON.stringify(liveData, null, 2), "utf-8");
fs.renameSync(tmpPath, LIVE_DATA_PATH);
```

If the script crashes after starting the write but before finishing, you'd otherwise leave a half-written JSON file that all tests then crash trying to parse. The rename pattern makes the swap atomic — either the file is fully written or it's not touched at all. **GENERALIZABLE** — applies to any script that produces a critical artifact.

### Principle: Credentials never appear in error messages

When the WooCommerce REST endpoint returns 4xx/5xx, my first instinct was to include the URL in the error: *"Failed to fetch from {url}"*. Wrong — the URL has `consumer_key=...&consumer_secret=...` baked in as query params. A failed CI run could end up posting credentials to logs / Slack / GitHub Actions output.

**The pattern:** log the endpoint path and status code, never the URL.
```ts
throw new Error(`Woo REST ${resp.status} ${resp.statusText} for endpoint ${endpoint}`);
```

**GENERALIZABLE** — applies to any error path that touches authenticated network calls. The bug is a one-line lapse, the impact can be a credential leak.

### Principle: Key-absent vs empty-value distinction matters

Discovery scripts should distinguish "this metadata key doesn't exist on the record" from "this key exists but its value is empty/zero/null." They mean different things to test code:

```ts
function pickMeta(c: WooCoupon, key: string): unknown {
  const entry = c.meta_data?.find((m) => m.key === key);
  return entry ? entry.value : null;  // null = absent; falsy value = present-but-empty
}
```

In Dockbloxx data, the picked coupon `ngbl10` has `_dockbloxx_allowed_emails: []` — the key IS present, just empty. If the script returned `null` for either case, tests couldn't tell whether to use the discount-percent feature at all or just had no email restrictions. Distinguishing keeps the test's decision space accurate.

**GENERALIZABLE** to any system with sparse metadata schemas (WordPress meta, JSON columns in SQL, document store extras, etc.).

### Pattern: Fail loud on missing env vars, before any fetch

```ts
if (!BACKEND_URL) fail("NEXT_PUBLIC_BACKEND_URL is not set in .env.local");
if (!CK) fail("WOOCOM_CONSUMER_KEY is not set in .env.local");
if (!CS) fail("WOOCOM_CONSUMER_SECRET is not set in .env.local");
```

The `fail()` helper exits non-zero with a clear message naming the missing variable. Validating BEFORE any network call means the error is a one-line "this var isn't set" rather than a downstream "fetch failed" stack trace. **GENERALIZABLE** to all scripts with required environment configuration.

### Gotcha: WooCommerce auth is via query params, not headers

```ts
const url = `${BACKEND_URL}/wp-json/wc/v3${endpoint}?consumer_key=${CK}&consumer_secret=${CS}`;
```

Most REST APIs use Authorization headers. WooCommerce's basic auth pattern uses query strings. Surprised me on first read; codebase uses this everywhere already (see `src/app/api/get-coupon-by-code/route.ts`). **WOOCOMMERCE-SPECIFIC**.

### Gotcha: variation discovery requires care

The fixture script samples 5 products from `?per_page=20&status=publish`. In Dockbloxx dev data, **none of the first 20 products have variations** (`variations: []` across the board). Tests that need variation IDs will need a wider per_page or a filter for `variations.length > 0`. Capturing the empty arrays anyway (graceful `?? []`) so the fixture shape stays consistent. **DOCKBLOXX-SPECIFIC** but the lesson generalizes: discovery scripts should fall back gracefully when expected shapes don't appear in the dataset.

---

## Entry: Dealer Coupon Flow Spec (Step 3C)

### Principle: Headline E2E tests protect the most recent fix

The dealer coupon E2E (`e2e/dealer-coupon-flow.spec.ts`) was the FIRST spec written, deliberately. The dealer-coupon fix shipped two days before this E2E layer. The most recent code change is also the change with the least automated coverage and the highest regression risk. By writing the headline spec first, we close the coverage gap on yesterday's work before we lose context. **GENERALIZABLE** — any project standing up E2E for the first time should target the most-recently-shipped feature first.

### Pattern: Load fixtures once at module top, not per test

```ts
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const liveData = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "live-data.json"), "utf-8"));
const dealersData = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "dealers.json"), "utf-8"));
```

Two reasons:
1. **Performance** — no per-test filesystem cost. The cost is paid once at module load.
2. **Fail-fast** — if `live-data.json` is missing or malformed, the spec fails at import time with a clear stack trace pointing at the JSON file. Tests don't even start. Compare to per-test loading: the first test fails with a confusing error mid-suite.

**GENERALIZABLE** — applies to any test framework with module-level evaluation.

### Principle: Read localStorage to verify state, don't trust the UI alone

The dealer landing page has a known UI bug we left unfixed: when the store rejects a coupon, the local component still shows "Coupon Applied" because the component sets its own `appliedCoupon` state independently of the store. The UI is a lying witness in the negative case.

**The pattern** for tests touching persistent state: assert against the source of truth (localStorage, IndexedDB, server state) AND the UI separately. The UI proves the user sees the right thing. The persistent state proves the system actually did the right thing.

```ts
await expect(page.getByText(/Coupon Applied:/)).toBeVisible();   // user-facing claim
const stored = await page.evaluate(() => localStorage.getItem("checkout-storage"));
expect(JSON.parse(stored!).state.checkoutData.coupon.code).toBe(expectedCode);  // ground truth
```

**GENERALIZABLE** — applies to any client-side state persistence (Zustand, Redux, Pinia, anything with middleware writing to localStorage).

### Gotcha: Playwright `getByText` is strict-mode by default

When multiple legitimate elements share text (very common — same string in multiple components/levels), `getByText(/Coupon Applied/i)` matches all of them and the assertion fails with "strict mode violation: resolved to N elements."

**Three handling options, ranked best to worst:**

1. **Best — assert each variant separately.** If both elements are real signals, name them both:
   ```ts
   await expect(page.getByText(/Coupon Applied \(\w+\):/i)).toBeVisible();   // order summary
   await expect(page.getByText(/Coupon Applied:\s*\w+/i)).toBeVisible();      // applied-state UI
   ```
   This is a *stronger* test — catches regressions in either component.

2. **Acceptable — narrow the regex** so it matches exactly one element. Works when one variant is distinctive enough (parens, prefix, etc.).

3. **Last resort — `.first()`.** Hides the multiplicity rather than acknowledging it. A future engineer reading `.first()` won't know whether that was thoughtful (one of N is enough) or sloppy (just made the error go away).

**GENERALIZABLE** — Playwright-specific surprise that bites every team using `getByText` for the first time. Not Dockbloxx-specific.

### Gotcha: pre-existing Next.js 15 `params should be awaited` warning

Source has `const dealerSlug = props.params.dealerSlug` (synchronous access) — Next 15 wants `const { dealerSlug } = await props.params` (async). Fires a console warning per page load. **Doesn't fail tests** — just noise in the webserver output. Tracked for separate cleanup post-Block-4 per Tony's instruction.

**GENERALIZABLE lesson:** framework version migrations leave residual deprecation warnings. They surface in E2E runs more than unit runs because E2E spawns the actual server. Keep them visible but don't let them block test work.

---

## Tagging summary (for v2.0 synthesis)

**GENERALIZABLE — fold into v2.0 core:**
- `retries: 0` non-negotiable principle
- `reuseExistingServer: true` for dev iteration
- Two-runner shell wrappers (headless + UI)
- Fixture discovery architecture (NEW SECTION between v1.0 §9 and §10)
- Static + live fixture split
- Atomic file write (tmp + rename)
- Credential scrubbing in error messages
- Key-absent vs empty-value distinction
- Fail-loud env validation
- Headline-test-the-most-recent-fix sequencing
- Module-top fixture loading
- localStorage + UI dual-verification
- `getByText` strict-mode awareness + three handling options

**WOOCOMMERCE-SPECIFIC — examples in the playbook, not principles:**
- Query-param auth (`consumer_key=...&consumer_secret=...`)
- `/wp-json/wc/v3/...` endpoint paths
- `meta_data` array shape with `{id, key, value}` triples
- `date_expires` field for coupon expiry

**DOCKBLOXX-SPECIFIC — context only:**
- Dealer landing route shape (`/dealer-coupon/[dealerSlug]/?coupon=...`)
- `_dockbloxx_*` meta keys (allowed_emails, discount_percent_per_product)
- `aqualand-marina` / `aham10` fixtures (will rotate)

**PLAYWRIGHT-SPECIFIC — Playwright sub-section of v2.0:**
- `getByText` strict mode behavior
- `--list` printing "Error" while exiting 0
- `webServer.reuseExistingServer` semantics

---

## Entry: Limits of the seed-and-wait pattern (Step 3D, full story)

### Principle: seed-and-wait controls inputs and timing, not DOM side effects

Pre-seeding storage controls a third-party script's **inputs.** Waiting for a deterministic signal (e.g., a UTM param appearing in the URL) proves the script has **run.** Neither addresses the script's **DOM side effects** — if the script re-renders or re-routes during/after its work, click interactivity may remain broken regardless of seed/wait.

Concretely, in Dockbloxx:
- Coach's attribution script reads `document.referrer` + sessionStorage to decide UTM values, then calls `history.replaceState` to write those UTMs into the URL.
- Pre-seeding sessionStorage made the UTM **values** deterministic (`utm_source=e2e_test` instead of the `direct/(none)` fallback). ✅
- Waiting for the seeded UTM to appear in the URL proved the **script ran**. ✅
- But the `replaceState` itself triggered some Next.js routing churn that left product anchors in a non-interactive state for a 30-second window. ❌
- Result: with the wait in place, clicks consistently timed out. Without the wait, clicks raced (33% failure). Either way, flaky.

### When seed-and-wait makes things worse, the right move is to skip + document

When neither timing strategy works, the script's behavior is **architecturally incompatible** with stable click testing on the affected route. Trying more variations is throwing test-side fixes at a problem that needs an app-side fix. The right move:

1. **Skip the affected test** with `test.skip` — preserve the body so the future investigator can see what was tried.
2. **Document the finding** in a comment block on the skipped test: failure modes observed, what was tried, why it didn't work, real-user impact (or non-impact), and which architectural fixes might resolve it.
3. **Mitigate the coverage gap** with a different test that exercises the same codepath via a different route (e.g., direct navigation to the detail URL instead of clicking through the listing).
4. **Address the underlying issue architecturally** outside the test layer (script load timing, route-blocking via Playwright's `page.route`, deferring script to post-hydration, etc.).

**GENERALIZABLE** — applies to any app where third-party scripts mutate routing or DOM state on load. The pattern recurs with: GA4, GTM, Segment, Mixpanel, Amplitude, A/B testing frameworks (Optimizely, LaunchDarkly client SDKs that support URL targeting), session-replay tools (FullStory, Hotjar) that wrap event handlers, attribution platforms (GHL, AppsFlyer web). All of these can interact poorly with fast Playwright clicks in clean browser contexts.

### The pattern (when seed-and-wait DOES work)

For third-party scripts that don't have DOM side-effects beyond their stated job:

```
seed sessionStorage  →  goto  →  waitForURL(deterministic-signal)  →  click  →  assert
```

Two things controlled: the script's **input** (so its output is deterministic), and its **timing** (so click happens after, not concurrently). Works when the script's only effect is the URL rewrite. Fails when the rewrite ALSO triggers route or DOM churn — that's the case where you switch to skip-and-document.

### Pattern: `test.skip` with deliberate comment block (Factory pattern for "tests we want but can't ship today")

The skip isn't a hack — it's a documented coverage decision. The comment block carries five things:

1. **Why skipped** — the specific failure modes observed.
2. **What was tried** — including the things that didn't work.
3. **Real-user impact assessment** — "real users don't reliably hit this" is the load-bearing claim that justifies the skip.
4. **Investigation paths** — concrete options for the next person (or future-you) who picks this up.
5. **Coverage mitigation** — what else covers the same surface, even partially.

The skipped test's body is **preserved verbatim** under `test.skip(...)`. When the architectural fix lands, swap `test.skip` → `test`, and you have a working regression test ready to go. The investment in writing the test isn't lost — just deferred.

**Real example shape** (from `e2e/shop-flow.spec.ts`):

```ts
/**
 * SKIPPED: attribution-script timing flake.
 * Coach's external attribution script runs on /shop load and calls
 * history.replaceState() to add UTM params. This races with Playwright
 * clicks ... [full diagnosis] ...
 *
 * Coverage gap accepted: shop->product-page click flow is untested.
 * Mitigated by Tests 5 + 6 covering shop listing render and pagination,
 * plus manual smoke covering the click.
 */
test.skip(
  "clicking a product navigates to product detail page (skipped: attribution-script timing issue)",
  async ({ page, context }) => {
    /* full body preserved — runnable when investigation resolves */
  }
);
```

The test name itself encodes the skip reason. Even without reading the comment block, anyone running `playwright test` sees `(skipped: attribution-script timing issue)` next to the test ID. **GENERALIZABLE** — applies to any test framework with a `.skip` modifier.

### Mitigation pattern: companion test that exercises the same surface via a different path

The coverage loss from skipping a click-flow test is mitigated by adding a **direct-navigation companion test** that hits the destination URL directly:

```ts
test("product detail page renders when navigated to directly", async ({ page }) => {
  const firstProduct = liveData.products.first_published;
  await page.goto(`/shop/${firstProduct.slug}`);
  await expect(page.getByRole("button", { name: /add to cart/i })).toBeVisible();
  await expect(page.getByText(firstProduct.name).first()).toBeVisible();
});
```

This doesn't prove the listing-→-detail click works, but it does prove:
- The route exists and resolves the slug correctly.
- The detail page renders (no SSR crash, no hydration error).
- Add-to-Cart button is present (the most important detail-page CTA).

What's lost: proof that the listing's `<Link>` anchor wires to the right destination. What's preserved: everything downstream of that anchor click.

**GENERALIZABLE** — when a multi-step flow can't be tested end-to-end due to one fragile step, test the steps before AND the steps after the fragile one separately. Manual smoke fills the seam.

---

## SYSTEMIC FINDING — Third-party scripts at the root layout race E2E click navigation across ALL routes

### The finding

Coach's attribution script is loaded in `src/app/layout.tsx` — the **root** layout. It runs on every page load and calls `history.replaceState()` to write UTM params into the URL. That `replaceState` races Playwright clicks on any product anchor, **regardless of which route hosts the link**.

We initially observed this on `/shop` (Test 7) and hypothesized it was a per-route problem. We then encountered the SAME failure on `/search` (Test 10) with the SAME root cause. The two routes have nothing in common except the script that runs in the layout above them.

This is not a per-spec problem. It's a per-app problem. As more specs get added, more click-navigation tests will hit this same race — Block 3F (category clicks), Block 3G (checkout flow transitions), and any future spec that involves clicking a `<Link>` immediately after page load.

### Two attempts that did not solve it

1. **Pre-seed sessionStorage with deterministic UTM values.** Made the script's *output* (URL contents) predictable but did not change *when* the rewrite happened. Click vs `replaceState` race remained. ~33% failure rate.

2. **Seed + wait for the seeded UTM signal in the URL before clicking.** Eliminated the race in one direction (click no longer fired during `replaceState`) but introduced a worse one — the rewrite triggered a Next.js routing churn that left product anchors in a non-interactive state for ~30 seconds. 100% failure rate after the fix.

### The right fix path (NOT applied today)

**Architectural, at the test-setup layer — fix once, benefits all specs:**

- **Option A — route-block the attribution script during E2E.** Use Playwright's `page.route()` to intercept the script's network request and abort it. The script never loads; never runs; never races. Setup goes in a Playwright fixture or `playwright.config.ts` so every test gets it automatically.

- **Option B — override `history.replaceState` in a setup script.** Inject a init-script that no-ops or queues `replaceState` calls during tests. Lets the attribution script "run" but neutralizes its DOM side effect. More surgical than Option A.

**Trade-off (applies to both options):** tests would no longer exercise the attribution path live. Attribution-side bugs (e.g., the script breaking on a particular page) would need separate coverage — manual smoke for the user-visible behavior, plus a single dedicated spec that DOES allow the script to run and asserts on its output (UTMs in URL, sessionStorage values written, etc.).

### Until the architectural fix lands

We're using `test.skip` with a deliberate comment block on click-navigation tests across affected specs. The skipped tests preserve their bodies for the day the fix lands — flip `test.skip` → `test`, no rewrite needed.

**Currently skipped:**
- `e2e/shop-flow.spec.ts` — Test 7: clicking a product navigates to product detail page
- `e2e/search-flow.spec.ts` — Test 10: clicking a search result navigates to product page

**Mitigation:** `Test 7-alt` in shop-flow proves `/shop/{slug}` renders directly. Manual smoke checklist (Step 3H, pending) covers the click flow.

### Generalizable principle

**When E2E click flake is caused by a third-party script that runs on every page, fix it architecturally at the test-setup layer, not per-spec.**

Skipping per-spec creates an ever-growing skip list as new specs hit the same root cause. Each skip looks small in isolation; the aggregate is a coverage hole that grows linearly with the test suite. The marginal cost of the architectural fix is paid once. The marginal cost of per-spec skips is paid every time a new spec is added.

This pattern recurs with: any analytics/attribution script (GA4, GTM, Segment, Mixpanel, Amplitude, GHL), A/B testing frameworks that run on load (Optimizely, LaunchDarkly client SDK with URL targeting), session-replay tools that wrap event handlers (FullStory, Hotjar), and any custom in-house tracker loaded at the layout level.

**Diagnostic signal that you have this problem:** the same click-navigation flake reproduces on multiple unrelated routes that share only a layout-level script. If the routes have nothing in common except the script, the script is the cause.

**GENERALIZABLE — TEST-INFRASTRUCTURE-LEVEL** (a tier above per-spec patterns; lives in fixtures or config, not in spec files).

---

## RESOLUTION — Attribution script race was environment drift, not architecture

**Update (2026-05-09 evening):** the SYSTEMIC FINDING entry above has been superseded. The race condition described was real, but its **cause** was environment drift, not architectural fragility.

### The actual story

Coach's attribution script was loaded from the WordPress ACF field `coach_attribution_scripts_footer`. Production's WP install had this field **empty** — the script never loaded in production. Dev had it populated during a one-off integration that was never promoted to prod. So the race condition we spent half a day diagnosing didn't exist in production at all.

### The fix

Empty the ACF field on dev WP. The `<Script id="coach-attribution">` tag in `src/app/layout.tsx` still renders, but with no content. No script loads, no `history.replaceState` calls, no race.

The integration point in the layout was kept in place — if Coach ever wants the script back, the field can be repopulated and the script will load again. The decision is reversible at the WP layer; no code change required.

### Result

- Tests 7 (shop click) and 10 (search click) — un-skipped on first attempt with the simplest possible click-and-wait pattern. No `addInitScript`, no UTM seeding, no `waitForURL` on a UTM signal. Just `goto → click → waitForURL → assert`.
- **3 consecutive full-suite runs at 11/11 passing.** Suite times 15–24s. Zero flakes.

### What this means for the prior playbook entries

The "Limits of the seed-and-wait pattern" entry above is now context for a problem that didn't need solving. The principles in it are still correct — seed-and-wait DOES have those limits when applied to scripts whose DOM side effects are problematic — but the diagnostic process took us down a longer path than necessary. Two new principles below (Entries 2 and 3) capture what we learned about HOW to avoid that detour next time.

---

## PRINCIPLE — Tests that pass for the wrong reason are worse than tests that fail

### The story

Test 2 in `dealer-coupon-flow.spec.ts` ("dealer-applied coupon persists to checkout page") was passing yesterday and earlier today. It used `body.toContainText("aham10")` to verify the coupon code appeared on `/checkout`.

But the test never seeded a cart item. `/checkout` requires a non-empty cart and **silently redirects to `/shop`** when the cart is empty. The redirect happens client-side after a brief render — so for a small window, the checkout body IS rendered before being replaced.

The test was passing because `body.toContainText` was racing the redirect — sometimes catching the brief `/checkout` render that contained the coupon's order-summary label, sometimes not. With Coach's script loaded, it added enough page-load latency to widen the catching window. With the script gone, the redirect won the race and the test failed honestly.

### The principle

Prefer assertions that are **impossible to satisfy by accident.** `getByText(specific-pattern)` proves a specific UI element rendered. `body.toContainText(generic-string)` matches any transient or unrelated content the polling loop happens to see — including content from a different page during a redirect.

### Two corollaries

1. **Targeted selectors > full-page text searches.** When asserting that a UI element rendered, name the element. `getByRole`, `getByText` with a distinctive regex, or `data-testid` selectors. Avoid `body.toContainText` unless you genuinely don't care which element holds the text.

2. **Setup dependencies must be enforced in the test body, not assumed.** If `/checkout` requires a non-empty cart, the test must seed the cart. Don't assume environment quirks (cached state, slow scripts, prior-test pollution) will provide the precondition. The cart-seeding step is 4-5 lines; the debugging it prevents is hours.

### Why "passes for the wrong reason" is worse than "fails"

A test that fails sends a clear signal: something is broken, investigate. A test that passes for the wrong reason sends a **fraudulent** signal: claims coverage that doesn't exist, hides the moment when the real claim broke. Worst case: it covers a regression that ships to production because the test was green.

The only way to detect "passes for the wrong reason" is when something perturbs the accidental conditions and the test starts failing — at which point everyone assumes a regression in the code under test, when really the test was always broken.

**GENERALIZABLE.**

---

## PRINCIPLE — Environment Drift First

When debugging E2E flakes that don't reproduce in production, **check for environment drift BEFORE diagnosing test or code issues.**

Dev environments accumulate scripts, integrations, debug tooling, mock services, and configuration overrides that prod doesn't have. Each is a potential source of behavior that exists ONLY in dev — and therefore can break dev-only tests for reasons unrelated to the code under test.

### The diagnostic order

1. **Is this script / config / dependency present in production?**
2. If not — align dev with prod (remove the dev-only thing) BEFORE writing test-side workarounds.
3. Only after the environments match should you investigate test code, app code, or framework behavior.

### Why this matters

Test-side workarounds for environment-drift problems compound. Each new spec needs the same workaround. Workarounds drift across specs as they're copy-pasted. Over time the test suite becomes a mirror of "things we did to fight dev-only weirdness" rather than "things that prove the app works."

The fix is almost always cheaper at the environment layer:
- Empty an ACF field
- Remove a dev-only script tag
- Strip a debug query-param injector
- Disable a mock service worker that prod doesn't have

vs. the test-side workaround:
- Pre-seed sessionStorage in every test
- Add `page.route` aborts to a fixture
- Override `history.replaceState` in setup scripts
- Introduce timing-based waits that assume the workaround landed

### What we did wrong

We spent several hours yesterday diagnosing a "race condition" that didn't exist in production. The right first question was: **"is this script even running in prod?"** One-line check; would have saved the entire debugging session and avoided two skipped tests.

### The shorter heuristic

When dev-only flake doesn't reproduce in prod, the bug is more likely in the environment than in the code. Check there first.

**GENERALIZABLE.**

---

## Block 3 CLOSE-OUT (2026-05-09)

### Final state

- **5 specs** at `e2e/`: `dealer-coupon-flow`, `shop-flow`, `search-flow`, `category-flow`, `checkout-flow`.
- **16 tests total**: 15 active passing + 1 conditional skip (category pagination — dev category has 7 products, below the 12-per-page threshold).
- **3 consecutive full-suite runs**: 15 passed / 1 skipped on each. Times 31.6s / 39.2s / 32.5s. Zero flakes.
- **`MANUAL_SMOKE_TEST.md`** at project root covers the post-Stripe-boundary gap.
- **Fixture discovery infrastructure** in place: `scripts/fetch_e2e_fixtures.ts` + `e2e/fixtures/dealers.json` (committed) + `e2e/fixtures/live-data.json` (gitignored, regenerated per environment).

### Per-spec breakdown

| Spec | Tests | Notes |
|---|---|---|
| dealer-coupon-flow | 4 | Headline regression for the dealer-coupon fix shipped 2026-05-08. Test 2 reframed to seed cart before navigating to /checkout (Option A from environment-drift investigation). |
| shop-flow | 4 | 3 listing tests + Test 7-alt direct-nav companion. Test 7 (click flow) un-skipped after attribution-script removal. |
| search-flow | 3 | Test 10 un-skipped after attribution-script removal. |
| category-flow | 1 active + 1 skipped | Test 12 (pagination) `test.skip` runtime — accessories category has only 7 products. |
| checkout-flow | 3 | Apply coupon, remove coupon, submit-to-Stripe-boundary. Form fill via placeholder selectors; react-select State handled with click → type → Enter. |

### Patterns established (recap)

- **`playwright.config.ts` shape** — `testDir: './e2e'`, `retries: 0` (non-negotiable), `reuseExistingServer: true` (dev iteration), `webServer.command: 'npm run dev'`.
- **Two-runner shell wrappers** — `scripts/run_e2e_tests_headless.sh` for CI/verification, `scripts/run_e2e_tests_ui.sh` for development debugging.
- **Fixture discovery architecture** — script reads env, fetches from REST backend, atomic writes to gitignored JSON. Static + live split.
- **Module-top fixture loading** — `fs.readFileSync` once at file load, NOT per test. Fail-fast on missing/malformed.
- **localStorage + UI dual-verification** — UI proves user-facing claim, localStorage proves system-of-record state.
- **`getByText` assert-each-variant** — when multiple legitimate elements share text, assert on each variant separately rather than `.first()`. Stronger test, catches more regressions.
- **Conditional `test.skip` with runtime reason** — `test.skip(!condition, "reason")` inside the test body for data-dependent skips.
- **Stripe boundary stop pattern** — `Promise.race([waitForURL(stripe-domain-regex), waitForSelector('iframe[src*="stripe"]')])`. End test at the boundary.
- **Inline form fill (no helpers yet)** — placeholder-based selectors, react-select interacted via click → keyboard.type → Enter. Three tests with identical setup duplicated inline per Tony's "no premature DRY" rule.

### Generalizable principles surfaced

1. **Test data should be discovered, not declared.** Discovery script decouples test logic from specific dataset records.
2. **Atomic write or no write.** Temp file + rename ensures consumers never read partial state.
3. **Credentials never appear in error messages.** Log endpoint + status, never the URL with auth params.
4. **Key-absent vs empty-value distinction.** `null` for absent, falsy for present-but-empty. Different signals for callers.
5. **Tests that pass for the wrong reason are worse than tests that fail.** Prefer assertions impossible to satisfy by accident. Targeted selectors > full-page text. Setup dependencies enforced, not assumed.
6. **Environment Drift First.** When dev-only flake doesn't reproduce in prod, check env before code.
7. **Headline-test-the-most-recent-fix.** First spec written should target the most recent change — the most under-protected surface.
8. **Limits of seed-and-wait.** Seeding controls input, waiting proves the script ran, but neither addresses DOM side effects. When seed-and-wait makes things worse, skip + document architecturally rather than escalating workarounds.
9. **Skip-and-document is a Factory pattern.** Body preserved, comment block carries why/what-tried/coverage-mitigation. When the architectural fix lands, flip `test.skip` → `test`, no rewrite.
10. **`retries: 0` is non-negotiable.** Flaky tests are bugs, not inconveniences.

### Dockbloxx-specific learnings

- **Coach's attribution script was dev-only environment drift.** Production never had it. The "race condition" we diagnosed was a phantom of dev configuration. Fix was emptying one ACF field. Field kept in place to preserve the integration point.
- **`/checkout` silently redirects to `/shop` when cart is empty.** Tests that navigate to /checkout MUST seed a product first. Caught a "passes for the wrong reason" bug where `body.toContainText` was racing the redirect.
- **WP ACF as feature-toggle layer.** `coach_attribution_scripts_footer` empty → script doesn't load. The integration in `src/app/layout.tsx` is reversible at the WP layer, no code change required.
- **The dealer-coupon flow uses a self-contained Zustand path.** URL → fetchCouponByCode → applyCouponForDealer → store → localStorage. Does NOT depend on attribution or sessionStorage.
- **`ApplyCoupon.tsx` has a now-inert "Dealer Coupon Detected!" banner.** Reads from sessionStorage that Coach's script no longer populates. Code stays in place per deferred cleanup decision; harmless when storage is empty.
- **Custom `StateSelector` (react-select) interactable via** click visible control → `keyboard.type("Georgia")` → `keyboard.press("Enter")`. Worked first try in E2E.
- **WooCommerce category pagination uses `?page=N`** (same convention as `/shop`).

### Open items deferred (fresh sessions)

- **`tests/api/place-order.test.ts` shadow-implementation** — surfaced in Block 2 audit. Tests run against a local mimic, not the actual route. Architectural fix: extract Woo transformation into a `lib/` module both route and tests import.
- **Next.js 15 `params.dealerSlug` async warning** in `src/app/(public)/dealer-coupon/[dealerSlug]/page.tsx:10`. Informational, doesn't break tests. Tracked for Next 15 deprecation pass.
- **`ApplyCoupon.tsx` "Dealer Coupon Detected!" banner code removal** — code is dead but stays per deferred cleanup. Remove during the next ApplyCoupon edit cycle.
- **Coach's attribution script future state** — currently dormant on both dev and prod. Integration point preserved in case Coach reactivates. Manual smoke includes a conditional check.
- **`src/lib/test.ts` orphan tautology** — single `expect(true).toBe(true)` smoke from Jest setup. Safe to delete; flagged in Block 2 audit.
- **`tests/utils/detectProductCategory.test.ts` duplicate** — duplicates a test already in `tests/lib/utils.test.ts:135`. Delete during a test-folder cleanup pass.
- **Fixture hoist to `/tests/fixtures/` and `/e2e/fixtures/`** — currently inline factories in each spec. Hoist once shapes stabilize across more specs.
- **Lint warning backlog** — 73 unused-vars + 41 explicit-any + 34 no-img-element + 17 exhaustive-deps. Prioritized in Block 2 lint cleanup notes; `no-unused-vars` cluster is the cheapest next win.
- **Block 4** — Stripe integration tests with mocked SDK (the layer between E2E's Stripe-boundary stop and the manual smoke checklist).

### What "pushing through" looked like

Block 3 phase 2 completed Steps 3F → 3G → 3H → 3I in one push:
- Category spec written + 1 active + 1 conditionally skipped (data-driven) — first run green.
- Checkout spec written with inline form fill (Tony's "no helpers" rule) — first run green, including react-select state interaction.
- Manual smoke checklist written.
- Fixture refresh + 3 stability runs all green.

The earlier debugging detour (attribution-script race) cost half a day. Once env drift was identified and fixed, everything else fell into place quickly. **The principles surfaced from the slow path are the load-bearing v2.0 contributions** — the fast path was just executing the standard E2E recipe correctly.

---

*Block 3 closed 2026-05-09. Block 4 (Stripe integration tests, mocked SDK) opens in a fresh session.*
