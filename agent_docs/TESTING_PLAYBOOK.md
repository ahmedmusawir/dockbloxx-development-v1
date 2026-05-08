# TESTING PLAYBOOK

> **Version:** 1.0
> **Date:** 2026-05-03
> **Author:** Architect (Claude) for Tony Stark
> **Origin:** Distilled from the StarkReads Subscription v1 build (136 tests across 3 layers)
> **Purpose:** Reusable recipe for adding a complete testing strategy to any Next.js + Supabase + Stripe application
> **Prerequisite:** A working Next.js App Router app. Stripe and Supabase are optional — the patterns adapt.

---

## Table of Contents

1. [The Four-Layer Testing Strategy](#1-the-four-layer-testing-strategy)
2. [Layer 1: Unit Tests (Jest)](#2-layer-1-unit-tests-jest)
3. [Layer 2: Integration Tests (Jest)](#3-layer-2-integration-tests-jest)
4. [Layer 3: E2E Tests (Playwright)](#4-layer-3-e2e-tests-playwright)
5. [Layer 4: Manual Smoke Test](#5-layer-4-manual-smoke-test)
6. [Test Infrastructure Setup](#6-test-infrastructure-setup)
7. [The Singleton Mock Pattern](#7-the-singleton-mock-pattern)
8. [The Supabase Chain Mock Pattern](#8-the-supabase-chain-mock-pattern)
9. [E2E Test User Lifecycle](#9-e2e-test-user-lifecycle)
10. [E2E Data Seeding Strategy](#10-e2e-data-seeding-strategy)
11. [Environment Variables in Tests](#11-environment-variables-in-tests)
12. [Test Cleanup Patterns](#12-test-cleanup-patterns)
13. [Gotchas & Lessons Learned](#13-gotchas--lessons-learned)
14. [Test Commands & Scripts](#14-test-commands--scripts)
15. [When To Write Which Test](#15-when-to-write-which-test)
16. [Adding Tests To An Existing Project](#16-adding-tests-to-an-existing-project)

---

## 1. The Four-Layer Testing Strategy

Every production application needs four layers of testing. Each catches different bugs. Together they provide comprehensive confidence with minimal redundancy.

| Layer | Tool | What It Proves | Speed | Network? | When To Run |
|-------|------|---------------|-------|----------|-------------|
| **Unit** | Jest | Pure functions are correct (logic, validation, mapping) | ~3s for 100+ tests | No | Every save, every PR |
| **Integration** | Jest | API routes correctly orchestrate services (auth, Stripe, DB writes) | <1s for 13 tests | No (mocked) | Every PR, pre-deploy |
| **E2E** | Playwright | UI flows work in a real browser (pages load, forms submit, gates enforce) | ~40s for 18 tests | Yes (real Supabase) | Pre-deploy, post-deploy |
| **Manual** | You | The actual third-party integration works (Stripe Checkout, webhook round-trip) | ~5 min | Yes (real Stripe Sandbox) | Pre-deploy, major changes |

### Why Four Layers, Not One

Unit tests are fast but can't test HTTP handlers. Integration tests mock external services so they can't prove the real integration works. E2E tests run in a browser but can't automate third-party hosted pages (like Stripe Checkout). Manual testing covers the gaps but doesn't scale. Each layer fills the blindspots of the others.

### The Coverage Matrix

| What's Being Tested | Unit | Integration | E2E | Manual |
|---------------------|------|-------------|-----|--------|
| Tier hierarchy logic (`meetsTier`) | ✅ | — | — | — |
| Open-redirect prevention (`safeRedirect`) | ✅ | — | — | — |
| Price ID ↔ tier mapping | ✅ | — | — | — |
| Checkout route creates Stripe session | — | ✅ | — | — |
| Webhook writes correct data to Supabase | — | ✅ | — | — |
| Webhook signature verification | — | ✅ | — | — |
| Tier upgrade uses update, not new session | — | ✅ | — | — |
| Pages load, navigation works | — | — | ✅ | — |
| Registration → login → portal access | — | — | ✅ | — |
| Subscription gating enforces hierarchy | — | — | ✅ | — |
| Paywall renders correct CTA per state | — | — | ✅ | — |
| Navbar badge reflects tier | — | — | ✅ | — |
| Real Stripe Checkout payment | — | — | — | ✅ |
| Real webhook → real DB update | — | — | — | ✅ |
| Real Customer Portal access | — | — | — | ✅ |

---

## 2. Layer 1: Unit Tests (Jest)

### What To Unit Test

Pure functions with no side effects, no async, no external dependencies. If a function takes inputs and returns outputs without touching the network, database, or filesystem — unit test it.

### Target Functions In A Subscription App

| Function | What To Assert | Test Count |
|----------|---------------|------------|
| `meetsTier(current, required)` | All 16 combinations (4×4 tier matrix). Verify cumulative hierarchy. | 16 assertions across ~7 test cases |
| `tierDisplayName(tier)` | All 4 tiers produce correct capitalized names | 4 |
| `safeRedirect(next)` | Valid paths pass, null/undefined/empty rejected, protocol-relative rejected, schemed URLs rejected, backslashes rejected | 8+ |
| `resolveTierFromPriceId(id)` | Known IDs → correct tiers, unknown ID → null | 4 |
| `resolvePriceIdFromTier(tier)` | Known tiers → correct IDs, 'free' → null | 4 |

### Example: The meetsTier Test (All 16 Combinations)

```typescript
describe('meetsTier', () => {
  // Same tier always passes (diagonal of the 4×4 matrix)
  it.each(['free', 'starter', 'pro', 'enterprise'] as const)(
    '%s meets itself',
    (tier) => {
      expect(meetsTier(tier, tier)).toBe(true);
    }
  );

  // Higher tier meets lower requirement
  it('enterprise meets all tiers', () => {
    expect(meetsTier('enterprise', 'free')).toBe(true);
    expect(meetsTier('enterprise', 'starter')).toBe(true);
    expect(meetsTier('enterprise', 'pro')).toBe(true);
  });

  it('pro meets free and starter', () => {
    expect(meetsTier('pro', 'free')).toBe(true);
    expect(meetsTier('pro', 'starter')).toBe(true);
  });

  it('starter meets free', () => {
    expect(meetsTier('starter', 'free')).toBe(true);
  });

  // Lower tier does NOT meet higher requirement
  it('free does not meet any paid tier', () => {
    expect(meetsTier('free', 'starter')).toBe(false);
    expect(meetsTier('free', 'pro')).toBe(false);
    expect(meetsTier('free', 'enterprise')).toBe(false);
  });

  it('starter does not meet pro or enterprise', () => {
    expect(meetsTier('starter', 'pro')).toBe(false);
    expect(meetsTier('starter', 'enterprise')).toBe(false);
  });

  it('pro does not meet enterprise', () => {
    expect(meetsTier('pro', 'enterprise')).toBe(false);
  });
});
```

### Example: The safeRedirect Test (Security Validation)

```typescript
describe('safeRedirect', () => {
  it('accepts valid internal paths', () => {
    expect(safeRedirect('/pricing')).toBe('/pricing');
    expect(safeRedirect('/members-portal/pro')).toBe('/members-portal/pro');
    expect(safeRedirect('/articles?page=2')).toBe('/articles?page=2');
  });

  it('returns null for null, undefined, and empty string', () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect('')).toBeNull();
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeRedirect('//evil.com')).toBeNull();
  });

  it('rejects schemed URLs', () => {
    expect(safeRedirect('https://evil.com')).toBeNull();
    expect(safeRedirect('javascript:alert(1)')).toBeNull();
  });

  it('rejects backslashes', () => {
    expect(safeRedirect('/path\\evil')).toBeNull();
  });

  it('rejects paths that do not start with /', () => {
    expect(safeRedirect('evil')).toBeNull();
  });
});
```

### File Location Convention

```
src/__tests__/lib/pure-functions.test.ts    # All pure function tests in one file
```

Keep pure function tests together. They're fast, self-contained, and have no dependencies. One file, one `npm test`, instant feedback.

---

## 3. Layer 2: Integration Tests (Jest)

### What To Integration Test

API route handlers — the server-side functions that orchestrate external services (Stripe, Supabase). These tests mock all external dependencies and verify the orchestration logic: "given this input and these mock responses, does the route produce the correct output and make the correct calls?"

### The Three API Routes To Test

| Route | Tests | What's Verified |
|-------|-------|----------------|
| `POST /api/checkout` | 4 | Auth check, tier validation, new-subscriber Checkout flow, existing-subscriber upgrade flow |
| `POST /api/webhooks/stripe` | 6 | Signature verification (2), event handling (3 event types), unknown event passthrough |
| `POST /api/customer-portal` | 3 | Auth check, missing customer handling, portal session creation |

### Example: Webhook Handler Test (Full Pattern)

This is the most complex integration test — it demonstrates mocking Stripe SDK, mocking Supabase admin client, constructing fake webhook events, and asserting database writes.

```typescript
// Mock declarations BEFORE imports
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/stripe/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  },
}));

jest.mock('@/lib/stripe/tierResolver', () => ({
  resolveTierFromPriceId: jest.fn(),
}));

// Imports AFTER mocks
import { POST } from '@/app/api/webhooks/stripe/route';
import { createAdminClient } from '@/utils/supabase/admin';
import { stripe } from '@/lib/stripe/stripe';
import { resolveTierFromPriceId } from '@/lib/stripe/tierResolver';

// Helper: construct a fake Request object
function makeRequest(opts: { body?: string; signature?: string | null }) {
  return {
    text: jest.fn().mockResolvedValue(opts.body ?? '{}'),
    headers: {
      get: jest.fn((name: string) =>
        name === 'stripe-signature' ? (opts.signature ?? null) : null
      ),
    },
  } as any;
}

// Helper: set up Supabase admin client mock with chain methods
function mockAdminClient() {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const eqAfterUpdate = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn(() => ({ eq: eqAfterUpdate }));
  const from = jest.fn(() => ({ upsert, update }));
  (createAdminClient as jest.Mock).mockReturnValue({ from } as any);
  return { from, upsert, update, eqAfterUpdate };
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when stripe-signature header is missing', async () => {
    mockAdminClient();
    const response = await POST(makeRequest({ body: '{}', signature: null }));
    expect(response.status).toBe(400);
  });

  it('upserts subscription on checkout.session.completed', async () => {
    const { upsert } = mockAdminClient();
    (resolveTierFromPriceId as jest.Mock).mockReturnValue('pro');
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          subscription: 'sub_xyz',
          customer: 'cus_xyz',
          metadata: { supabase_user_id: 'user-abc' },
        },
      },
    });
    (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
      id: 'sub_xyz',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [{
          price: { id: 'price_pro' },
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_000_000,
        }],
      },
    });

    const response = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-abc',
        tier: 'pro',
        status: 'active',
      }),
      { onConflict: 'user_id' }
    );
  });
});
```

### File Location Convention

```
src/__tests__/api/checkout.test.ts
src/__tests__/api/webhook.test.ts
src/__tests__/api/customer-portal.test.ts
```

Integration tests live under `__tests__/api/` — this allows the `test:integration` script to target them specifically via `--testPathPatterns=__tests__/api`.

---

## 4. Layer 3: E2E Tests (Playwright)

### What To E2E Test

User-facing flows that span multiple pages, require browser interaction (form fills, clicks, navigation), and verify that the full stack works together. E2E tests are the closest thing to a real user.

### The Five Test Specs

| Spec | Tests | What's Verified |
|------|-------|----------------|
| `public-access.spec.ts` | 5 | Hero loads, articles grid renders, free article shows full content, gated article shows paywall, pricing shows 3 cards |
| `auth-flow.spec.ts` | 3 | Register → portal, logout → blocked, login → portal |
| `subscription-gating.spec.ts` | 3 | Starter/Pro/Enterprise users: cumulative tier hierarchy enforced |
| `paywall.spec.ts` | 4 | Anonymous CTA, free-user CTA, Pro sees full content, Pro on Enterprise article sees upgrade CTA |
| `navbar-badge.spec.ts` | 3 | Free/Starter/Pro badges display correctly |

### Example: Subscription Gating Test (Seeding + Browser + Cleanup)

```typescript
import { test, expect } from '@playwright/test';
import { uniqueEmail, registerUser, loginUser, getUserId, deleteTestUser } from './helpers/test-user';
import { seedSubscription, deleteSubscription } from './helpers/seed-subscription';

test.describe('Subscription Gating — Tier Access Control', () => {
  let starterEmail: string;
  let proEmail: string;
  let enterpriseEmail: string;

  test.beforeAll(async ({ browser }) => {
    starterEmail = uniqueEmail();
    proEmail = uniqueEmail();
    enterpriseEmail = uniqueEmail();

    // Register all 3 users via the real UI
    for (const email of [starterEmail, proEmail, enterpriseEmail]) {
      const page = await browser.newPage();
      await registerUser(page, email);
      await page.close();
    }

    // Seed subscriptions directly into Supabase (bypasses Stripe)
    const starterId = await getUserId(starterEmail);
    const proId = await getUserId(proEmail);
    const enterpriseId = await getUserId(enterpriseEmail);

    if (starterId) await seedSubscription(starterId, 'starter');
    if (proId) await seedSubscription(proId, 'pro');
    if (enterpriseId) await seedSubscription(enterpriseId, 'enterprise');
  });

  test.afterAll(async () => {
    for (const email of [starterEmail, proEmail, enterpriseEmail]) {
      await deleteTestUser(email);
    }
  });

  test('Starter user: can access starter, blocked from pro and enterprise', async ({ page }) => {
    await loginUser(page, starterEmail);
    await page.goto('/members-portal/starter');
    await expect(page.locator('h1')).toContainText('Starter Content');
    await page.goto('/members-portal/pro');
    await page.waitForURL('**/pricing**', { timeout: 10000 });
    await page.goto('/members-portal/enterprise');
    await page.waitForURL('**/pricing**', { timeout: 10000 });
  });

  test('Pro user: can access starter + pro, blocked from enterprise', async ({ page }) => {
    await loginUser(page, proEmail);
    await page.goto('/members-portal/starter');
    await expect(page.locator('h1')).toContainText('Starter Content');
    await page.goto('/members-portal/pro');
    await expect(page.locator('h1')).toContainText('Pro Content');
    await page.goto('/members-portal/enterprise');
    await page.waitForURL('**/pricing**', { timeout: 10000 });
  });

  test('Enterprise user: can access all tiers', async ({ page }) => {
    await loginUser(page, enterpriseEmail);
    await page.goto('/members-portal/starter');
    await expect(page.locator('h1')).toContainText('Starter Content');
    await page.goto('/members-portal/pro');
    await expect(page.locator('h1')).toContainText('Pro Content');
    await page.goto('/members-portal/enterprise');
    await expect(page.locator('h1')).toContainText('Enterprise Content');
  });
});
```

### File Location Convention

```
e2e/
├── helpers/
│   ├── supabase-admin.ts      # Service-role client for seeding
│   ├── seed-subscription.ts   # Seed/delete subscription rows
│   └── test-user.ts           # Register/login/cleanup test users
├── public-access.spec.ts
├── auth-flow.spec.ts
├── subscription-gating.spec.ts
├── paywall.spec.ts
└── navbar-badge.spec.ts
```

E2E tests live OUTSIDE `src/` in an `e2e/` folder. This keeps them separate from the app code and avoids Jest trying to pick them up (Jest is confined to `src/` via the `roots` config).

---

## 5. Layer 4: Manual Smoke Test

### When No Automation Can Replace A Human

The Stripe Checkout payment flow crosses into Stripe's hosted domain. Automating it with Playwright is technically possible but brittle — Stripe changes their page DOM frequently, breaking selectors. The manual smoke test is the pragmatic solution.

### The Checklist

```
□ Register new user → default tier is "free"
□ Subscribe to Starter → Stripe Checkout → test card 4242 4242 4242 4242 → success page → tier updates
□ Verify Supabase row: tier=starter, status=active, subscription ID present
□ Verify Stripe Dashboard: ONE subscription, ONE customer
□ Upgrade to Pro (from pricing page) → no new Checkout page → instant upgrade
□ Verify Supabase: same row, tier=pro, same subscription ID
□ Verify Stripe: ONE subscription (updated), not two
□ Check gating: Pro + Starter content accessible, Enterprise locked
□ Check article paywall: Pro articles unlocked, Enterprise articles show paywall
□ Check navbar badge: shows "Pro"
□ Close browser → reopen → log in → tier persists
□ Account page → "Manage Subscription" → Stripe Customer Portal opens
□ Stripe CLI terminal → webhook events visible for all operations
```

Run this before every deployment. Takes ~5 minutes.

---

## 6. Test Infrastructure Setup

### Installing Jest (if not already present)

```bash
npm install -D jest ts-jest @types/jest @testing-library/react @testing-library/jest-dom
```

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '<rootDir>/src/__tests__/jest.setup.ts'],
};
```

Key settings: `roots: ['<rootDir>/src']` confines Jest to `src/` (excludes `e2e/`). `moduleNameMapper` mirrors Next.js `@/` path alias. `clearMocks: true` auto-resets `mock.calls` between tests (but NOT `mockImplementation` — see gotchas).

### jest.setup.ts

```typescript
// Default env vars (real values from .env.local take precedence if present)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'publishable-key';
process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'service-role-key';
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Mock Next.js navigation (used by many server actions)
jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));
```

The `redirect` mock throws an error (matching Next.js behavior) so tests can assert redirects via `expect(() => ...).toThrow('NEXT_REDIRECT:/path')`.

### Installing Playwright

```bash
npm init playwright@latest
# Accept defaults: TypeScript, e2e/ folder, install browsers
```

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

Key settings: `retries: 0` — no flake-masking, fail loud. `reuseExistingServer: true` — if dev server is already running, use it (massive speedup during local iteration). `webServer.command` auto-starts dev server if not running.

### .npmrc (recommended)

```
legacy-peer-deps=true
```

Avoids peer dependency conflicts when installing test packages alongside Next.js.

---

## 7. The Singleton Mock Pattern

### The Problem

Your Stripe SDK is initialized in a singleton file:

```typescript
// src/lib/stripe/stripe.ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
```

Your routes import this singleton, not the raw SDK:

```typescript
import { stripe } from '@/lib/stripe/stripe';
```

### The Solution

Mock the singleton wrapper, not `'stripe'`:

```typescript
jest.mock('@/lib/stripe/stripe', () => ({
  stripe: {
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    subscriptions: { retrieve: jest.fn(), update: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
    billingPortal: { sessions: { create: jest.fn() } },
  },
}));
```

### Why This Is Better Than `jest.mock('stripe')`

No need to mock the Stripe constructor or prototype. The mock shape only includes methods the route actually calls. The `STRIPE_SECRET_KEY!` assertion doesn't blow up at module load. Test failures point to your singleton, not SDK internals.

### Per-Test Configuration

```typescript
// In each test, set the mock return value:
(stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
  url: 'https://checkout.stripe.com/test-session',
});
```

---

## 8. The Supabase Chain Mock Pattern

### The Problem

Supabase client uses method chaining: `supabase.from('x').select('y').eq('z', v).maybeSingle()`. Each method returns a new object with the next method. Mocking this chain requires nested `jest.fn()` returns.

### The Pattern

```typescript
// For SELECT chains: from().select().eq().maybeSingle()
const maybeSingle = jest.fn().mockResolvedValue({ data: row });
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));

// For UPSERT: from().upsert()
const upsert = jest.fn().mockResolvedValue({ error: null });
const from = jest.fn(() => ({ upsert }));

// For UPDATE chains: from().update().eq()
const eqAfterUpdate = jest.fn().mockResolvedValue({ error: null });
const update = jest.fn(() => ({ eq: eqAfterUpdate }));
const from = jest.fn(() => ({ update }));

// Wire into the mock client
createClientMock.mockReturnValue({ from } as any);
```

### The `as any` Cast

Constructing fully-typed mocks of Supabase response shapes is prohibitively verbose. Use `as any` for mock-shape casts in tests. This is a pragmatic trade-off: marginal type safety loss vs significant code reduction. Every team does this.

---

## 9. E2E Test User Lifecycle

```
uniqueEmail()
→ "test-1714768800000-x4q2@e2e.test"
        │
        ▼
registerUser(page, email)
→ fills /auth Register tab → clicks Signup
→ waits for /members-portal redirect
        │
        ▼
getUserId(email)
→ supabaseAdmin.auth.admin.listUsers()
→ find by email → return UUID
        │
        ▼
seedSubscription(userId, 'pro')
→ UPSERT into subscriptions table
→ synthetic Stripe IDs (cus_test_*, sub_test_*)
        │
        ▼
TEST RUNS
→ loginUser(page, email) drives the browser
        │
        ▼
deleteTestUser(email) [afterAll]
1. DELETE from subscriptions (FK first)
2. DELETE from user_roles
3. supabaseAdmin.auth.admin.deleteUser
```

### The Test User Helper

```typescript
export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@e2e.test`;
}

export async function registerUser(page: Page, email: string, password = 'TestPassword123!'): Promise<void> {
  await page.goto('/auth');
  await page.getByRole('tab', { name: 'Register' }).click();
  await page.locator('input[name="name"]').fill('E2E Test User');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="passwordConfirm"]').fill(password);
  await page.getByRole('button', { name: 'Signup' }).click();
  await page.waitForURL('**/members-portal', { timeout: 15000 });
}

export async function deleteTestUser(email: string): Promise<void> {
  const userId = await getUserId(email);
  if (!userId) return;
  await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId);
  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
```

Key design decisions: timestamp + random in email prevents collisions even if cleanup fails. Registration goes through the real UI (not API backdoor) so auth flow is tested. Deletion cascades in FK order to avoid constraint violations.

---

## 10. E2E Data Seeding Strategy

### The Problem

E2E tests need users with specific subscription tiers. But automating Stripe Checkout in a browser is brittle (Stripe changes their DOM frequently). How do you test subscription gating without going through Stripe?

### The Solution: Direct Database Seeding

Insert subscription rows directly into Supabase via the admin client, as if the webhook had already fired:

```typescript
export async function seedSubscription(userId: string, tier: TestTier) {
  const { error } = await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      tier,
      status: 'active',
      stripe_customer_id: `cus_test_${userId.slice(0, 8)}`,
      stripe_subscription_id: `sub_test_${userId.slice(0, 8)}`,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(`Failed to seed subscription: ${error.message}`);
}
```

### Why Synthetic Stripe IDs Work

The seeder writes `stripe_customer_id: cus_test_*` and `stripe_subscription_id: sub_test_*`. These are NOT real Stripe IDs. But the gating logic only reads `tier` and `status` from the row — it never calls the Stripe API to verify the subscription ID. So synthetic IDs work perfectly for gating tests.

### The Trade-off

E2E does NOT cover the actual Stripe round-trip. That's what integration tests (mocked) validate at the route level, and what manual smoke tests validate end-to-end. Each layer covers what it's good at.

### The Supabase Admin Client For E2E

```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Playwright runs outside Next.js — must load .env.local manually
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

The `dotenv` import is required because Playwright runs in its own Node process, not inside Next.js. Without it, env vars from `.env.local` aren't available to the helpers.

---

## 11. Environment Variables in Tests

### Two Completely Different Mechanisms

**Jest (unit + integration):**
- Defaults set in `jest.setup.ts` using `process.env.X = process.env.X || 'fallback'`
- Preserves real values when present (from `.env.local`), falls back to dummies
- Stripe env vars (`STRIPE_*`) are NOT in setup — integration tests mock the entire Stripe module, pure-function tests set them inline before import
- Loaded via `setupFilesAfterEnv` in `jest.config.js`

**Playwright (E2E):**
- `.env.local` is loaded by Playwright when starting the dev server (visible as `injected env (12) from .env.local`)
- Helper files use `dotenv.config()` to re-load `.env.local` because they run outside the Next.js process
- `dotenv` must be a `devDependency`

### The Module-Scope Env Var Gotcha

Some modules read `process.env` at import time (module scope), not at call time:

```typescript
// This reads STRIPE_PRICE_STARTER when the module is first imported
const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_STARTER!]: 'starter',
};
```

In tests, you must set the env var BEFORE importing the module:

```typescript
process.env.STRIPE_PRICE_STARTER = 'price_test_starter';
import { resolveTierFromPriceId } from '@/lib/stripe/tierResolver';
```

Order matters. ts-jest compiles to CommonJS where assignment statements interleave with `require()` calls in source order.

In integration tests, this is sidestepped by mocking the resolver module entirely.

---

## 12. Test Cleanup Patterns

### Jest: Automatic via Config

```javascript
// jest.config.js
clearMocks: true  // Resets mock.calls and mock.results between tests
```

**Important:** `clearMocks` does NOT reset `mockImplementation`, `mockReturnValue`, or `mockResolvedValue`. Those persist across tests. Either redeclare them per test, or use `mockReturnValueOnce` for single-call values.

Most test files also call `jest.clearAllMocks()` in `beforeEach` for belt-and-suspenders.

No `afterEach` cleanup is needed — everything is mocked, no real state to clean up.

### Playwright: Explicit Teardown

```typescript
test.afterAll(async () => {
  for (const email of [starterEmail, proEmail, enterpriseEmail]) {
    await deleteTestUser(email);
  }
});
```

`deleteTestUser` cascades in FK order: subscriptions → user_roles → auth user. Order matters — deleting the auth user first would violate the foreign key constraint on subscriptions.

Each `test()` gets a fresh `page` instance — no per-test page cleanup needed.

Test user emails use `uniqueEmail()` (timestamp + random) so collisions are impossible even if cleanup fails on a previous run.

---

## 13. Gotchas & Lessons Learned

### Gotcha 1: Jest 30 Flag Rename

`--testPathPattern` (singular) → `--testPathPatterns` (plural). If your `package.json` script uses the old flag, Jest 30 will error. This is only a CLI flag — not available in `jest.config.js`.

### Gotcha 2: Env Vars at Module Scope Must Be Set Before Import

See Section 11. If a module reads `process.env.X` at import time, setting `process.env.X` after importing is too late. The module already captured `undefined`.

### Gotcha 3: Stripe SDK v22 Period Dates Location

`current_period_start` and `current_period_end` moved from `Subscription` to `SubscriptionItem` (`subscription.items.data[0]`). Mock fixtures must place them on the item, not the subscription root.

### Gotcha 4: `clearMocks` Doesn't Reset Implementations

`clearMocks: true` clears `mock.calls` and `mock.results`, NOT `mockImplementation` or `mockReturnValue`. A return value set via `.mockReturnValue()` persists across tests unless explicitly reset.

### Gotcha 5: Webhook Handler Always Returns 200

By design, to prevent Stripe from infinitely retrying. Tests assert the database call shape, not the response status, for event-processing tests. Only signature-verification tests (missing/invalid) check for 400.

### Gotcha 6: Console Output in Passing Tests Is Normal

Route handlers log events via `console.log`/`console.error`. Jest reprints these under each test. Seeing `console.error` under a `PASS` line is not a failure. To silence: `jest.spyOn(console, 'error').mockImplementation(() => {})` per test, or `silent: true` globally in config.

### Gotcha 7: DNS Failures Break E2E But Not Unit/Integration

E2E tests talk to real Supabase (for seeding and cleanup). If DNS is down on your dev machine, E2E fails but unit/integration (which mock everything) pass fine. Fix DNS first if you see `getaddrinfo EAI_AGAIN` errors.

### Gotcha 8: `as any` Is Acceptable In Test Mocks

Constructing fully-typed mocks of Supabase/Stripe response shapes adds hundreds of lines for marginal safety. Use `as any` for mock-shape casts. This is standard practice in every TypeScript test suite that mocks complex external APIs.

---

## 14. Test Commands & Scripts

### npm Scripts

```json
{
  "test": "jest",
  "test:integration": "jest --testPathPatterns=__tests__/api",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

### Shell Script Wrappers

All under `scripts/`, all `chmod +x`, all use `set -euo pipefail`:

```bash
scripts/run_unit_tests.sh               # npm test
scripts/run_stripe_integration_test.sh   # npm run test:integration
scripts/run_e2e_tests.sh                 # npm run test:e2e
scripts/start_stripe_webhook.sh          # stripe listen --forward-to ...
```

### Expected Run Times

| Command | Tests | Time |
|---------|-------|------|
| `npm test` | 118 (unit + integration) | ~3s |
| `npm run test:integration` | 13 | <1s |
| `npm run test:e2e` | 18 | ~40s-1.5min |
| Full local check (all 3 commands) | 136 | ~45s-2min |

Fast enough for tight iteration. Run `npm test` on every save. Run `npm run test:e2e` before every commit.

---

## 15. When To Write Which Test

### Decision Tree

```
Is it a pure function? (no side effects, no async, no imports)
  → YES: Unit test. Always.

Is it an API route handler? (imports services, calls external APIs)
  → YES: Integration test with mocked dependencies.

Is it a user-facing flow? (multiple pages, form fills, navigation)
  → YES: E2E test.

Does it involve a third-party hosted page? (Stripe Checkout, OAuth, etc.)
  → YES: Manual smoke test. Don't automate brittle external UIs.

Is it a React component?
  → If simple (renders props): probably not worth testing separately.
  → If complex (state, conditional rendering): unit test with RTL.
  → If it's a page with routing/auth logic: E2E test.
```

### Rule of Thumb

Write the **cheapest test that catches the bug.** Unit tests are cheapest (fastest, no deps). Integration tests are medium (need mocks). E2E tests are expensive (need browser + running app + database). Manual tests are most expensive (need a human).

Don't write an E2E test for something a unit test can catch. Don't mock what you can test purely.

---

## 16. Adding Tests To An Existing Project

### The Incremental Approach

Don't try to test everything at once. Prioritize by risk and value.

**Week 1: Pure function unit tests.** Find every utility function in `src/lib/` and `src/utils/`. Write exhaustive tests. These are fast wins — high value, zero setup complexity. Goal: 50+ tests in a day.

**Week 2: Integration tests for API routes.** Mock external services, test the orchestration logic. Start with the most critical route (usually auth or payment). Goal: 10-15 tests covering happy paths and auth failures.

**Week 3: E2E tests for core user flows.** Start with the happy path — register, do the main thing, verify it worked. Add edge cases (unauthorized access, invalid input) after the happy path works. Goal: 10-20 tests covering the top 5 user journeys.

**Ongoing: Manual smoke test checklist.** Write it once, run it before every deploy. Update it as features are added.

### The File Structure

```
project-root/
├── src/
│   └── __tests__/
│       ├── jest.setup.ts          # Global env vars + Next.js mocks
│       ├── lib/
│       │   └── pure-functions.test.ts
│       └── api/
│           ├── checkout.test.ts
│           ├── webhook.test.ts
│           └── customer-portal.test.ts
├── e2e/
│   ├── helpers/
│   │   ├── supabase-admin.ts
│   │   ├── seed-subscription.ts
│   │   └── test-user.ts
│   ├── public-access.spec.ts
│   ├── auth-flow.spec.ts
│   ├── subscription-gating.spec.ts
│   ├── paywall.spec.ts
│   └── navbar-badge.spec.ts
├── scripts/
│   ├── run_unit_tests.sh
│   ├── run_stripe_integration_test.sh
│   ├── run_e2e_tests.sh
│   └── start_stripe_webhook.sh
├── jest.config.js
├── playwright.config.ts
└── .npmrc
```

This structure scales. New unit tests go in `__tests__/lib/`. New integration tests go in `__tests__/api/`. New E2E specs go in `e2e/`. Each layer has its own config, its own helpers, its own run command. Clean separation.

---

## Appendix: Quick Reference Card

**Run all unit + integration tests:** `npm test`

**Run only integration tests:** `npm run test:integration`

**Run E2E tests (headless):** `npm run test:e2e`

**Run E2E tests (watch mode, visible browser):** `npm run test:e2e:ui`

**Test card for Stripe:** `4242 4242 4242 4242` (any future expiry, any CVC)

**Current test counts:** 105 unit + 13 integration + 18 E2E = 136 total

**Key files:**
- Jest config: `jest.config.js`
- Jest setup: `src/__tests__/jest.setup.ts`
- Playwright config: `playwright.config.ts`
- E2E helpers: `e2e/helpers/`
- Shell wrappers: `scripts/`

---

**END OF TESTING PLAYBOOK v1.0**
