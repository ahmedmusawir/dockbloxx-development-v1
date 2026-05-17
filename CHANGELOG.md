# Changelog — Dockbloxx

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Cyber Repo Security Playbook v0.5** *(2026-05-17)* — major expansion. Added **Phase 6** (Production propagation + pre-deploy verification) codifying the lockfile-copy → `npm ci` → build → eyeball workflow for shipping dep changes to the production/Vercel repo. Added a reusable **Pre-Deployment Eyeball Checklist** scoped to customer-facing storefronts (8 pages, viewport-specific, with a 5-minute speed-run option for time-constrained checks). New principle **P9** (production deployment requires lockfile propagation + `npm ci` + pre-deploy eyeball) anchors the new phase. Marked Case Studies #1→#4 as the **canonical end-to-end reference walkthrough** for App Factory replication: baseline → audit-fix → remove-unused → breaking-migration-with-visual-signoff → overrides-pattern → second-overrides-application → final 0-vuln state → propagation.

### Security

- **Resolved `brace-expansion` CVEs (GHSA-v6h2-p8h4-qcjw, GHSA-f886-m6hf-6m8v) via npm `overrides`** *(2026-05-17)*. Same pattern as the postcss override below — added `"brace-expansion": "^2.0.2"` to the `overrides` block in `package.json`. The single vulnerable instance (`brace-expansion@1.1.11` pulled in by `eslint@8 → minimatch@3`) now resolves to `2.1.0` along with the 7 already-safe nested copies. The proper structural fix (upgrading to `eslint@9` flat config) is a separate breaking-change migration; the override is the targeted CVE-cleanup. Verified: `npm audit` reports **0 vulnerabilities**, build clean, full test suite green (Jest 166/166, Playwright 16/16). **Final session posture across two days: 25 vulns → 0.**

- **Resolved `postcss` CVE (GHSA-qx2v-qp2m-jg93) via npm `overrides`** *(2026-05-17)*. Investigation found that `next@15.5.18`, `next@16.0.0`, and `next@16.2.6` all pin `postcss@8.4.31` exact — a Next upgrade would not have fixed the advisory. Added `"overrides": { "postcss": "^8.5.10" }` to `package.json` and bumped the direct devDependency from `^8.4.38` → `^8.5.10` (npm requires the direct dep range to intersect the override). After `npm install`, all 9 postcss instances in the dep tree resolve to `8.5.14`, including Next's previously-nested copy. Build clean; homepage / `/shop/[slug]` / `/cart` HTTP 200 with stylesheet bundles intact. **`npm audit` now reports 1 moderate (brace-expansion transitive only) — down from 25 vulns at the start of the security pass two days ago.**

- **Upgraded `swiper` from `^11.2.5` (installed `11.2.10`) → `^12.1.4`** — eliminates critical prototype-pollution CVE (GHSA-hmx5-qpq5-p643), the last remaining critical advisory after the same-day axios cleanup. Swiper@12 is a breaking-change release; impact in this codebase was minimal because we only use the `Navigation` + `Thumbs` modules in a single component (`src/components/shop/product-page/mobile/MobileProductSlider.tsx`, mobile product gallery on `/shop/[slug]`). v12's main user-visible change (CSS-pseudo nav arrows → SVG icons) rendered cleanly without restyling — verified on mobile and iPad-mini viewports against `/shop/life-saver`. `npm audit` now reports 3 moderate vulns (down from 25 at session start, with 18 of those eliminated by the axios removal earlier in the day).

### Removed

- **`axios` dependency** — never imported in any source file; was the single biggest source of `npm audit` advisories (18 CVEs spanning SSRF, prototype pollution, credential leakage, CRLF injection, DoS). Removed via `npm uninstall axios`. Docs updated: deleted the "Alternative HTTP Client: Axios" example section in `docs/architecture/frontend.md` (it described aspirational use that was never adopted — project uses native `fetch()`).

### Added

- **Cyber Repo Security Playbook v0.1** (`agent_docs/CYBER_REPO_SECURITY_PLAYBOOK_v0.5.md`) — backend-agnostic, principle-first playbook for dependency CVE triage and cleanup. Seeded from the 2026-05-16 `npm audit` pass; documents the audit → fix → analyze → remove sequence, the `npm audit fix --force` Next.js downgrade trap, and skill-extraction candidates (`/audit-deps`, `/remove-unused-dep`, etc.). Companion to `agent_docs/SECURITY_FINDINGS.md` (which tracks app-level findings).

- **Testing Playbook v2.0** (`agent_docs/TESTING_PLAYBOOK.md`) — multi-backend testing patterns codified for App Factory reuse. Generalizes v1.0's Supabase + Stripe patterns to be backend-agnostic at the principle level, with concrete implementations as appendix examples drawn from StarkReads (Supabase) and Dockbloxx (WooCommerce REST). v1.0 archived at `agent_docs/TESTING_PLAYBOOK_v1.0_ARCHIVE.md`. Synthesis decisions captured separately at `agent_docs/playbook-v2.0-synthesis-notes.md`.

## [1.0.0] - 2026-05-11

First formally documented release. Establishes baseline of the headless Next.js Dockbloxx app and inaugurates the changelog. Prior git history exists but is not back-documented here.

This release captures roughly four days of work (May 8-11): dealer coupon QR flow fix (May 8), ESLint config + lint cleanup + unit test expansion (May 9), comprehensive E2E testing infrastructure setup (May 9), integration tests + production bug/security findings (May 11), and supporting documentation infrastructure across all four days.

### Added

- **Dealer coupon QR flow** (`/dealer-coupon/[dealerSlug]?coupon=`)
  - `validateCouponForDealer` lenient validator (skips email, zip, allow-list, per-user-limit rules)
  - `applyCouponForDealer` Zustand store action
  - Self-contained flow not dependent on third-party scripts
- **ESLint configuration** (`.eslintrc.json`) with strict rules and documented downgrades for deferred-cleanup items
- **Four-layer testing infrastructure** (182 tests total)
  - Jest unit tests (~140 covering utils, stores, lib)
  - Jest integration tests in `tests/api/` (fetch-mocked route handlers, mocked Stripe SDK constructor)
  - Playwright E2E tests (5 specs, 16 tests, fixture-driven)
  - Manual smoke test checklist (`MANUAL_SMOKE_TEST.md`)
- **Fixture discovery script** (`scripts/fetch_e2e_fixtures.ts`) pulls live data from configured WooCommerce backend for E2E tests
- **Order transformation lib** (`src/lib/orderTransform.ts`) extracted from `/api/place-order` route to enable proper integration testing (replaces a shadow-implementation pattern in the existing test file)
- **Testing Playbook field notes** (`agent_docs/playbook-notes-block-{2,3,4}.md`) — multi-backend testing principles and patterns captured across three blocks of work, structured as additions for a future v2.0 synthesis of `TESTING_PLAYBOOK.md`
- **Security findings tracker** (`agent_docs/SECURITY_FINDINGS.md`)
- **Cleanup backlog tracker** (`agent_docs/CLEANUP_BACKLOG.md`)
- **Helper scripts** for test runners (headless, UI, integration)

### Fixed

- **Category pagination broken in production** — `/api/products-by-category` was not reading WooCommerce's `X-WP-Total` HTTP header, causing the frontend to render only page 1 regardless of total product count. Categories with more than 12 products now paginate correctly.
- **React hooks ordering bug** in `DealerCouponClientBlock` — `useEffect` was placed after an early return, violating rules-of-hooks. Hooks now ordered correctly.
- **18 mechanical lint errors** (entity escapes, prefer-const)

### Security

- **Finding #1 — Stripe error message leak** (HIGH severity) in `/api/create-payment-intent`. Raw Stripe error messages (potentially containing card details, customer emails, internal request IDs) were returned to the client on payment failure. Catch block now logs full error server-side and returns a generic message to client. Locked in by integration Test 4.
- **Finding #3 — WooCommerce error message leak** (HIGH severity) in `/api/place-order`. Raw Woo error responses (potentially containing customer emails, DB column names, internal IDs) were returned to client on order creation failure. Catch block now logs server-side and returns generic message. Locked in by integration Test 9.

### Changed

- `/api/place-order` no longer contains inline order-transformation logic. Now imports `buildOrderData` from `src/lib/orderTransform`. Behavior preserved identically; the refactor enables proper test coverage of the transformation (previously tested only against a drifted shadow copy).
- **Dev environment aligned with production**: Coach's attribution script removed from dev WordPress (`coach_attribution_scripts_footer` ACF field emptied). Script was never present on production; removing from dev eliminated test-only race conditions and corrected environment drift.

### Deprecated

- **GHL attribution chain** (`_coach_ghl_*` order meta writing, sessionStorage UTM/click-ID capture, Coach's external attribution script). Code remains in place in the transformation lib but no consumer exists on production (no Cyberize Attribution WP plugin installed, no GHL webhook firing). Plumbing is inert and harmless. May be removed in a future release. Tracked in `CLEANUP_BACKLOG.md`.

### Known Open Items (Not Blockers)

- **Finding #2 (MEDIUM, discovered 2026-05-11)** — No input validation on `/api/create-payment-intent`. Discovered during Block 4 source recon. Enables potential card-testing fraud. Tracked in `SECURITY_FINDINGS.md`. Deferred to a focused security pass post-release.
- ~165 lint warnings deferred (downgraded from error to warn). Tracked in `CLEANUP_BACKLOG.md`.
- Next.js 15 `params` async deprecation warning in dynamic-route pages. Tracked in `CLEANUP_BACKLOG.md`.

---

# Release Workflow

This document evolves continuously. Below is the convention for maintaining it.

## While developing

All changes accumulate under `[Unreleased]` as they're committed. Each change goes under the appropriate section: Added, Changed, Fixed, Security, Deprecated, Removed.

**Inclusion test:** "Would a stakeholder care this changed?" If yes, log it. If no (typo fixes, dep bumps, internal refactors, test additions, doc-only changes), skip it.

## At deploy time

Before pushing to production, promote `[Unreleased]` to a versioned section:

1. **Choose version per Semantic Versioning:**
   - PATCH (1.0.0 → 1.0.1): bug fixes only
   - MINOR (1.0.0 → 1.1.0): new features, backward compatible
   - MAJOR (1.0.0 → 2.0.0): breaking changes / required user action

2. **Rename the section:**
   `[Unreleased]` → `[X.Y.Z] - YYYY-MM-DD`

3. **Create a new empty `[Unreleased]` above it.**

4. **Tag the commit in git:**
```bash
   git add CHANGELOG.md
   git commit -m "Release X.Y.Z"
   git tag -a vX.Y.Z -m "Release X.Y.Z — [brief description]"
   git push origin main
   git push origin vX.Y.Z
```

## Doc-only changes

Doc-only changes (Testing Playbook updates, README edits, etc.) accumulate in `[Unreleased]` but do NOT trigger a version bump on their own. They ride along with the next code release.

## Viewing history

- Changelog: this file (newest at top)
- Git tags: `git tag -l` lists all releases
- Commits per release: `git log v1.0.0..v1.1.0`
