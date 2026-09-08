# AC10 — Production Build Evidence (independent QA)

**Module:** DockBloxx_Ticket_3_TRM · **AC10 evidence pass:** CODY (successor QA seat)
**Date:** 2026-09-08 (build run during intake playback window) · **Purpose:** close F-2 and finalize AC10 as fully independently evidenced

---

## 1. Pre-build specimen verification (read-only)

| Item | Expected | Observed | Verdict |
|---|---|---|---|
| Branch | `qa/product-option-1` | `qa/product-option-1` | ✅ |
| HEAD SHA | `1834f18c95ed589e1a7d07b44c50f3bef91fe070` | `1834f18c95ed589e1a7d07b44c50f3bef91fe070` | ✅ exact match |
| Working tree modified files | none in `src/` | `CHANGELOG.md`, `RECOVERY.md`, `agent_docs/SESSIONS/session_2026-09-08.md` | ✅ all docs / bookkeeping only |
| Working tree untracked | none in `src/` | `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/QA/`, `examples/order_1.png`, `examples/order_2.png`, `agent_docs/RESPONSES/response_2026-09-08_163800_*` | ✅ all under `agent_docs/` |

No product/application-code modifications beyond the pinned implementation specimen. Pre-build specimen clearance granted.

---

## 2. Build command

```
npm run build
```

`package.json` resolves to `next build`. Next.js 15.5.18, .env.local loaded.

Full captured stdout/stderr: `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/QA/build_output.log` (2,409 lines).

---

## 3. Build result — PASS (EVIDENCE, independent)

### 3.1 Headline markers (verbatim)

```
> nextjs-15-stater-ts-shadcn-v1@1.0.0 build
> next build

   ▲ Next.js 15.5.18
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 7.3s
   Linting and checking validity of types ...

   [165 lint warnings — see §3.3]

 ✓ Generating static pages (270/270)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                                                            Size  First Load JS  Revalidate  Expire
[ ... full route table ... ]

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand
```

### 3.2 Negative-space verification

| Check | Method | Result |
|---|---|---|
| Any `error` lines in build output? | `grep -iE "error" build_output.log` filtered to exclude warnings and "Attempt X/4" log noise | **0 matches** |
| Any `failed` lines? | `grep -iE "failed" build_output.log` filtered | **0 matches** |
| Any `✗` failure markers? | `grep "✗" build_output.log` | **0 matches** |
| Compilation success | `✓ Compiled successfully in 7.3s` | ✅ |
| Static-page generation success | `✓ Generating static pages (270/270)` | ✅ |
| TypeScript validity | `Linting and checking validity of types ...` followed by route table (no abort) | ✅ |
| Staging backend compile-time fetches | Pre-rendered `fetchProductBySlug`/`fetchRelatedProductsById`/`fetchProductVariationsById` calls all logged `Attempt 1/4` → `SUCCESS` | ✅ no fetch errors |

### 3.3 Lint warnings — 165, all pre-existing

All warnings fall into two orthogonal ESLint rules:
- `@typescript-eslint/no-unused-vars` — most common; affects `BackButton`, `Button`, `Link`, `Navbar`, `parse`, `Script`, `DealerCTA` imports across admin / customer / public route files.
- `@typescript-eslint/no-explicit-any` — single occurrence at `src/app/(public)/dealer-coupon/[dealerSlug]/page.tsx:8:55`.

**None of the warnings are in Ticket 3 code paths** (`productServices.ts`, `BloxxPricing.tsx`, `BloxxPricingPoleMaterials.tsx`, `product-category-custom` spread site, the two wholesale init arrays, or the new test files). Spot-check confirms warnings are in:
- `src/app/(admin)/admin-dashboard/AdminPortalContent.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(customers)/customer-dashboard/CustomerPortalContent.tsx`
- `src/app/(customers)/layout.tsx`
- `src/app/(public)/HomePageContent.tsx`
- `src/app/(public)/category/[catSlug]/page.tsx`
- `src/app/(public)/dealer-coupon/[dealerSlug]/DealerPageContent.tsx`
- `src/app/(public)/dealer-coupon/[dealerSlug]/page.tsx`
- `src/app/(public)/demo/DemoPageContent.tsx`
- (and others in the same families)

These warnings are pre-existing baseline and orthogonal to Ticket 3.

### 3.4 Build artifact

Next.js produced `.next/` with 270 prerendered pages and the full route table including:
- `/shop/[slug]` (SSG, 45.4 kB page + 181 kB First Load JS) — **the bloxx product page** where Ticket 3 lands
- `/shop` (Static)
- `/checkout` (Static, 49.9 kB + 176 kB First Load JS)
- `/cart` (Static, 5.76 kB + 139 kB First Load JS)
- All 11 API routes (`/api/place-order`, `/api/get-product-by-slug`, etc.)
- 9 blog SSG pages (`/blog/[slug]`)
- 10 category SSG pages
- 10 dealer-coupon SSG pages
- All remaining static and dynamic routes

First Load JS shared across all routes: 102 kB (chunks `1255-eae4096fb21f1304.js` 46 kB, `4bd1b696-100b9d70ed4e49c1.js` 54.2 kB, plus 2.06 kB other).

---

## 4. Post-build specimen verification (read-only)

| Item | Expected | Observed | Verdict |
|---|---|---|---|
| HEAD SHA unchanged | `1834f18c95ed589e1a7d07b44c50f3bef91fe070` | `1834f18c95ed589e1a7d07b44c50f3bef91fe070` | ✅ |
| `git diff --name-only` | only the 3 bookkeeping docs | `CHANGELOG.md`, `RECOVERY.md`, `agent_docs/SESSIONS/session_2026-09-08.md` | ✅ |
| `git status --porcelain` untracked | only the QA / examples / RESPONSES artifacts | 7 untracked items, all under `agent_docs/` | ✅ |
| Any `src/` modifications | NONE | NONE | ✅ |
| `package-lock.json` modified | NONE | NONE (not in diff, not in status) | ✅ |

**No product/application files were modified by the build.** The only filesystem residue from the build is `.next/` (gitignored, expected). No `.next` paths appear in `git status`.

---

## 5. AC10 final status

| Sub-item | Status | Nature |
|---|---|---|
| Jest suite | 19 suites / 185 tests passed | **EVIDENCE (independent, prior executor)** |
| TypeScript (`npx tsc --noEmit`) | exit 0 | **EVIDENCE (independent, prior executor)** |
| `package-lock.json` untouched (no deps changed) | last touched 2026-05-17; no change at 1834f18 | **EVIDENCE (independent, prior executor + re-confirmed)** |
| **Production build (`next build`)** | **`✓ Compiled successfully in 7.3s`; `✓ Generating static pages (270/270)`; no errors; route table rendered end-to-end** | **✅ EVIDENCE (independent — this run)** |

**AC10 = PASS** — fully independently evidenced across all four sub-items.

---

## 6. F-2 disposition — CLOSED

F-2 was: "Production build is Director-machine-only evidence; QA could not run `next build` without stopping the Director's live dev server (outside the QA lane). AC10's build sub-item remains a CLAIM."

**F-2 = CLOSED.** The Director confirmed the dev server would not interfere with this run. The independent `next build` executed cleanly. F-2 is no longer an evidence gap.

---

## 7. Boundaries held

| Boundary | Status |
|---|---|
| Staging only | ✅ no production access attempted |
| No product-code changes | ✅ confirmed pre- and post-build |
| No repair attempted | ✅ build succeeded first try |
| No Playwright rerun | ✅ |
| No AC rerun | ✅ |
| AC5 / AC7 / F-1 not reopened | ✅ |
| F-3, F-4, F-5 not investigated | ✅ |
| CONTRACT / ACCEPTANCE_SPEC not modified | ✅ |
| No git mutation | ✅ (HEAD unchanged; only documentation files dirty from earlier sessions, untouched by this run) |
| No Gate Q self-issuance | ✅ advisory only |

---

## 8. Files written under `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/QA/` (this turn only)

| File | Contents |
|---|---|
| `AC10_build_evidence.md` | This document |
| `build_output.log` | Full 2,409-line captured stdout/stderr from `npm run build` |

No other files created or modified in this turn. Original `QA_REPORT.md` preserved as historical evidence per the QA Lead's instruction.

---

## 9. Final advisory Gate Q recommendation (NOT Gate Q itself)

> **READY FOR GATE Q.**

All eleven ACs now have either PASS evidence or are untestable by design:

| AC | Status at this point |
|---|---|
| AC1 | PASS (EVIDENCE — Playwright) |
| AC2 | PASS (EVIDENCE — Playwright) |
| AC3 | PASS (EVIDENCE — Playwright) |
| AC4 | PASS (EVIDENCE — Playwright + static) |
| AC5 | PASS (EVIDENCE — REST + admin visual) |
| AC6 | PASS (EVIDENCE — REST readback of #14893) |
| AC7 | PASS (EVIDENCE — REST readback of #14894 + admin visual) |
| AC8 | PASS (EVIDENCE — Playwright + static reachability) |
| AC9 | PASS (EVIDENCE — Playwright + cross-check against #14889) |
| **AC10** | **PASS (EVIDENCE — jest + tsc + lock-file + production build, all independent)** |
| AC11 | UNTESTED by design (Gate D — production ACF Track B + post-deploy smoke; outside QA surface) |

Open items remaining for the QA Lead's discretion (none are blockers):

- **U4 / F-3** — doc scope-count nit (27 → 39). Behavior risk: none.
- **U5 / F-4** — complex-variation has no live specimen on staging; static reachability already proved fencing.
- **U6 / F-5** — Pole Style reaches orders via wholesale init arrays; adjacent, out-of-scope.
- **U7** — pre-existing tree-dirty staleness (QA Report §1 "clean" vs current dirty state); not a defect (no product code in the dirty set).

**Gate Q verdict is the QA Lead's call.** This seat recommends READY.