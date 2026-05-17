# Cyber Repo Security Playbook (v0.5)

> **AI App Factory — Reusable Security Practice**
> *Living document. Principles are backend-agnostic. Case studies are project-specific.*
> *Version: 0.5 — Production-ready for App Factory replication (seeded 2026-05-16, expanded 2026-05-17) | Maintainer: Claude Code*
> *Filename convention: this file is renamed on each version bump so the version is visible at a glance (e.g., `CYBER_REPO_SECURITY_PLAYBOOK_v0.5.md`). Previous versions are not preserved on rename — see internal Changelog table at the bottom for version history.*

---

## Purpose

This playbook captures the **standard operating procedure** for repo-level cybersecurity hygiene across all App Factory projects (Dockbloxx, StarkReads, and future apps). It is not a findings tracker — it is a **how-to manual** for the recurring practice of:

1. Auditing third-party dependencies for known CVEs
2. Deciding *patch vs. upgrade vs. remove* per finding
3. Cleaning up unused attack surface
4. Recording decisions so future sessions can replicate them
5. Distilling the practice into Claude Code skills (`/security-audit`, `/dep-cleanup`, …)

> **Principle: A dependency you don't use is a vulnerability you don't need.**

---

## Core Principles (backend-agnostic)

### P1 — Inventory before patching

Never run a "fix-all" command before you know what each finding is and whether the dep is actually used. Reflexive `npm audit fix --force` (and equivalents) can introduce more risk than the original CVE — see Case Study #1 for a real example where the proposed `--force` would have downgraded Next.js 15 → 9.3.3.

### P2 — Remove beats upgrade beats patch

When triaging a vulnerable dep, ask in order:
1. **Can we remove it?** (Is it actually imported anywhere?)
2. **Can we replace it with a built-in?** (e.g., `axios` → native `fetch`)
3. **Can we upgrade in-place non-breaking?** (`npm audit fix` without `--force`)
4. **Do we need a breaking-change migration?** (separate plan)
5. **Is it an acceptable transitive risk?** (last resort, document why)

### P3 — Distinguish direct vs. transitive

A direct dep is on the menu — pick anything. A transitive dep is constrained by its parent's pin. Fixing a transitive often means upgrading the parent. Don't waste effort trying to "fix" a transitive without checking its parent first.

### P4 — Build the bookkeeping into the action

Every security change must update:
- `CHANGELOG.md` (`[Unreleased]` → `Security` or `Removed`)
- The relevant project session log (`session_YYYY-MM-DD.md`)
- `RECOVERY.md` (last-action pointer)
- This playbook (if a new pattern was learned)

If the change isn't in the bookkeeping, it didn't happen.

### P5 — Verify after every removal

A removal must be validated by:
- Source grep across all code-bearing extensions — confirm zero imports remain
- A clean build (`npm run build` or equivalent)
- A clean test pass when feasible (`npm run test`)

A removal that breaks the build is a regression, not a security fix.

### P6 — Quantify the surface eliminated

Don't report removals in vuln-count alone. The interesting number is **CVE-advisory-count eliminated from the dep graph**, not just the headline tally — `npm audit fix` may have already patched the dep in place, masking how much risk you removed by uninstalling it entirely.

### P7 — Require visual sign-off before finalizing customer-facing upgrades

For any dep upgrade that touches **customer-facing UI on a money path** (storefront galleries, checkout, cart, auth screens, anything in front of users with revenue intent), the standard workflow MUST pause for human visual verification between the build step and the bookkeeping step.

**Why:** Builds and tests catch type errors, module resolution, and obvious crashes — but not subtle visual regressions (wrong colors, misaligned arrows, broken transitions, hover-state glitches). Documented breaking changes in upstream changelogs don't always *manifest* as visible changes in any given codebase, but they sometimes do — and only an eyeball check on the relevant viewport(s) catches it. The cost is small (2 minutes); the cost of locking in "no regression" in CHANGELOG and then having a customer report it later is large.

**How to apply:**
- After step 3 (build passes), spin up the dev server and provide the operator a concrete URL + viewport instructions for the affected surface.
- Pause and wait for explicit approval ("looks good"/"needs adjustment"/"rollback") before any bookkeeping is written.
- The CHANGELOG `Security`/`Changed` entry must reference the viewports verified, not just "no regressions observed."
- For non-customer-facing UI (admin tools, dev rigs, internal dashboards), this principle relaxes to "a build pass is sufficient for now."

(Origin: Case Study #2, 2026-05-16 — Tony's swiper@11→12 migration modification.)

### P8 — When an upstream parent pins a vulnerable transitive, prefer `overrides` over major-version upgrade

If a vulnerability lives in a transitive dep that a major parent (Next, React, webpack, etc.) **pins exact** in its own `package.json`, do not assume upgrading the parent will fix it. Verify first:

```bash
npm view <parent>@<current-version> dependencies.<transitive>
npm view <parent>@<latest-version> dependencies.<transitive>
```

If both versions of the parent pin the same vulnerable transitive, an upgrade is a no-op for the CVE. In that case, use npm `overrides` (or yarn `resolutions`, or pnpm `overrides`) to force the transitive to a safe version across the entire dep tree. This is:

- **Cheaper** than a major upgrade (10 minutes vs. days)
- **Safer** (build-pipeline-internal change vs. framework API surface)
- **More precise** (you change exactly the vulnerable thing)

**Gotcha:** npm refuses an override that doesn't intersect a direct dependency's declared range (`EOVERRIDE`). If your `package.json` has the transitive as a direct dep with an older range (e.g., `"postcss": "^8.4.38"`), bump the direct dep range to match the override range first.

**Verify the override took effect:** `npm ls <dep>` should show every instance resolving to a safe version, with the top-level entry marked `overridden`.

**Why:** Upgrade-as-cure is the reflexive answer for many security tools and humans alike, but it confuses the *vehicle* of the fix (upgrade) with the *content* of the fix (safer transitive version). When the vehicle doesn't carry the content, you spend the cost of the upgrade with none of the benefit. Origin: Case Study #3, 2026-05-17 — postcss CVE was unfixed across `next@15.5.18 → 16.2.6`; override resolved it in 10 minutes vs. a major migration that would have done nothing.

**How to apply:** Make this the *first* mental check whenever an audit advisory suggests "upgrade `<parent>`" — verify the upgrade target actually moves the transitive before scoping any migration work.

### P9 — Production deployment requires lockfile propagation + `npm ci` + pre-deploy eyeball

Local audit cleanliness ≠ production safety. A change is not deployed until:

1. **`package.json` AND `package-lock.json` reach the production repo** — these are the only two artifacts that need to move; nothing else
2. **Install with `npm ci`, not `npm install`** — wipes `node_modules` and honors the lockfile exact (no version drift, fails loudly on drift)
3. **Build + start in the production environment** — `npm run build && npm start`. If `next start` errors on a manifest field, `rm -rf .next && npm run build && npm start` first.
4. **Eyeball the storefront against the production build** — use the [Pre-Deployment Eyeball Checklist](#pre-deployment-eyeball-checklist). Type-check / unit / E2E pass means the *code* is correct; eyeball pass means the *rendering* is correct. Both matter.

Only after all four pass: deploy.

**Why:** Deploys fail not because of code that doesn't compile, but because of subtle environmental drift between dev and prod (different node versions resolving ranges differently, partial install state, build-cache artifacts, third-party iframe styling that only manifests in a real browser). `npm ci` eliminates resolution drift. The eyeball check eliminates rendering drift. Together they catch what tests can't.

**How to apply:** Phase 6 of the standard workflow operationalizes this principle. Treat the propagation as a *separate* operation from the local fix — different repo, different install mode, different verification surface.

(Origin: Case Study #4 wrap-up, 2026-05-17 — Tony's workflow for pushing the override changes to the Vercel production repo.)

---

## Standard Workflow

### Phase 0 — Baseline

```bash
npm audit                 # capture the starting count + categorization
```

Record:
- Total vulnerabilities by severity (critical / high / moderate / low)
- Which deps account for the bulk of advisories (top 3 offenders)
- Which are direct vs. transitive (check `package.json` vs. `node_modules/*/node_modules`)

### Phase 1 — Soak up the safe wins

```bash
npm audit fix             # NEVER --force at this step
```

Re-baseline. The drop between Phase 0 and Phase 1 is your "free" reduction.

### Phase 2 — Triage the remainder

For each remaining vuln, apply [P2](#p2--remove-beats-upgrade-beats-patch):

1. **Usage check** — grep the codebase for actual imports:
   ```bash
   grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
        --include="*.mjs" --include="*.cjs" \
        -E "(from\s+['\"]<dep>['\"]|require\(['\"]<dep>['\"]\)|import.*<dep>)" . \
     | grep -v node_modules | grep -v ".next/"
   ```
2. **Doc check** — grep `*.md` too. Aspirational/example references in docs are a red flag: somebody installed the dep planning to use it, never did.
3. **Type-package check** — grep for `@types/<dep>`, ESLint plugins, etc. that may need to come with it.
4. **Decision** — record in table form (see [Phase 4](#phase-4--report--bookkeep)).

### Phase 3 — Execute

For each row in the decision table:
- **Remove:** `npm uninstall <dep>` + delete doc references + verify build
- **Upgrade non-breaking:** `npm install <dep>@<safe-version>` (manual, surgical — not `--force`)
- **Plan breaking migration:** enter Plan Mode, design migration, get approval, execute separately
- **Accept transitive:** document rationale in this playbook

### Phase 4 — Report & bookkeep

Update:
- `CHANGELOG.md` — add an entry under `[Unreleased]`
- `session_YYYY-MM-DD.md` — log the work
- `RECOVERY.md` — update last-action pointer
- This playbook — add a case study if a new pattern was learned

### Phase 5 — Re-baseline

```bash
npm audit
```

Confirm:
- Headline count moved in the right direction
- No new vulnerabilities introduced
- Build still passes

### Phase 6 — Production propagation & pre-deploy verification

Local cleanliness is not deployment cleanliness. Until `package.json` + `package-lock.json` reach the production repo and the lockfile is honored exactly during install, nothing has shipped. This phase bridges that gap.

**Step 6a — Propagate the artifacts**

The only two files that need to move from dev → production/Vercel repos:
- `package.json`
- `package-lock.json`

Copy them in. Nothing else is required for the dep-tree change — no source-code edits, no config, no migration scripts.

**Step 6b — Install in the production repo with `npm ci`**

```bash
npm ci
```

**Why `npm ci` (not `npm install`):**

| Behavior | `npm install` | `npm ci` |
|----------|--------------|----------|
| Wipes `node_modules` first | No (merges) | **Yes** |
| Resolves ranges fresh | Yes (may update lock) | **No** (lockfile is source of truth) |
| Tolerates lock/`package.json` drift | Yes | **Fails** |
| Speed | Slower | Faster |

For production: you want **exactly the lockfile** to be honored — no surprises, no version drift between dev and prod. `npm ci` guarantees that. If the lock and `package.json` are out of sync, `npm ci` fails loudly *before* any deploy, which is what you want.

`npm ci` also wipes `node_modules` automatically, so you don't need a separate `rm -rf node_modules` step.

**Step 6c — Production build verification**

```bash
npm run build
npm start
```

Critical: this catches a known failure mode — incremental `.next/` state in the production repo can cause `next start` to throw `routesManifest.dataRoutes is not iterable` (or similar manifest-incomplete errors) even when `next build` exits 0. If you see this:

```bash
rm -rf .next && npm run build && npm start
```

That clears the cache and forces a complete manifest write. If `next start` still fails after a clean rebuild, the issue is in the dep changes themselves — not stale state.

**Step 6d — Manual eyeball verification (per [P7](#p7--require-visual-sign-off-before-finalizing-customer-facing-upgrades))**

See the [Pre-Deployment Eyeball Checklist](#pre-deployment-eyeball-checklist) section below for the reusable scoped list.

**Step 6e — Deploy**

Only after 6a–6d pass cleanly. If anything in 6c or 6d is off, halt and triage — do not deploy a build you haven't verified.

---

## Pre-Deployment Eyeball Checklist

A reusable scoped checklist for any dep-tree change touching the **build-time CSS/JS pipeline** (postcss, sass, sass-loader, swc, webpack, terser, swiper, tailwind, shadcn) on a customer-facing storefront. Designed for ~10–15 min walkthrough. Run after the production build is up on `localhost:3000` via `npm start`.

### Scope by page

**1. Homepage (`/`)**
- Desktop (1440px+): hero spacing, nav alignment, footer columns
- Tablet (~768–1024px): does the layout break at the medium breakpoint?
- Mobile (~390px): hamburger menu, hero stacking, button sizing

**2. Single product page (`/shop/<product>`)**
- Desktop: buy box right-aligned, gallery left, pricing/qty controls, "Add to Cart" hover state
- iPad mini (~768x1024): does the layout transition correctly between mobile-stack and desktop-side-by-side? (historically the tricky breakpoint)
- Mobile (~390px): **MobileProductSlider** — main image, thumbnail strip, navigation arrows render and sync
- DevTools console open: no CSS warnings, no chunk-file 404s

**3. Cart (`/cart`) — must have an item**
- Desktop: line items, quantity steppers (+/-), remove button, subtotal/total alignment
- Mobile: does the table-style layout collapse to stacked cards correctly?
- Coupon input field styling

**4. Checkout (`/checkout`) — with item in cart**
- Desktop: form layout, field alignment, **Stripe Elements iframe** renders inside its container
- Form validation error states (try submitting empty)
- Order summary panel on the right
- **Don't submit a real payment** — verify UI up to the Stripe boundary only

**5. Category pages (`/category/<slug>`)**
- Product grid: equal-height cards, image aspect ratios
- Pagination controls at the bottom
- Hover states on product cards

**6. Typography / `prose` pages** — **highest-risk for postcss changes**
- `/warranty`, `/privacy`, `/returns`, `/terms`
- These use `@tailwindcss/typography` which generates a lot of CSS that flows through postcss
- Watch: heading sizes, paragraph spacing, list indentation, link colors

**7. Search (`/search`)**
- Empty state styling
- Results list styling
- Search bar input focus state

**8. Dealer coupon flow (`/dealer-coupon/<slug>`)**
- Landing page form/copy
- Error states (no coupon param, invalid coupon)
- Apply button hover/disabled states

### Cross-cutting (every page)

- **DevTools console** — any CSS parse errors or 404s on `_next/static/css/*` files
- **Network tab** — CSS chunks loading with `200`, reasonable sizes (none mysteriously 0 bytes)
- **Layout shift (CLS)** — anything jumping after initial paint
- **Hover/focus states** — buttons, links, form inputs
- **Custom shadows / gradients** — if any look "flatter" or off, postcss may have over-minified
- **Font rendering** — weights, italic styles, custom font loading

### Speed-run order (5 min budget)

If time is short, hit these four — they cover ~80% of the surface:
1. `/` desktop — global CSS sanity
2. `/shop/<product>` mobile viewport — swiper + product CSS
3. `/cart` with item — interactive elements
4. `/warranty` desktop — typography (highest postcss-sensitivity)

### What to do if eyeball fails

- **Visual regression in one page only:** likely a tailwind utility class minification quirk. Note the page, capture a screenshot, then revert the most recent override and rebuild to confirm. If revert fixes it, isolate which override caused it (postcss is more likely than brace-expansion for visual issues).
- **Console errors:** copy them verbatim. CSS chunk 404s usually mean the build directory is partial — `rm -rf .next && npm run build` first.
- **Stripe iframe broken:** Stripe Elements is third-party — our changes shouldn't affect it directly. Check if our wrapper styling targets `.StripeElement` classes that might have shifted.
- **Site visually fine but slow:** check bundle sizes via `npm run build` output. A 50KB+ delta on a key route suggests something pulled in extra deps unexpectedly.

---

## Decision Heuristics

### When to **remove** vs **upgrade**

| Signal | Action |
|--------|--------|
| Zero imports anywhere in source | Remove |
| Imported only in docs/examples | Remove (it's aspirational) |
| Imported in dead code paths only | Remove the dead code + the dep |
| Used in 1-2 places, replaceable by native API | Refactor + remove |
| Used pervasively, non-breaking patch available | Upgrade |
| Used pervasively, breaking upgrade only | Separate migration plan |

### When `npm audit fix --force` is a trap

Before ever running `--force`, read what npm wants to install:

```bash
npm audit fix --force --dry-run  2>&1 | grep -E "(install|major|breaking)"
```

🚩 **Red flags** that `--force` is unsafe:
- Wants to downgrade a framework (e.g., `Next 15 → 9.3.3`)
- "Major" version jump on a dep with extensive API surface (swiper, react, next)
- Cascade of breaking changes across multiple deps in one command

When red-flagged, plan each breaking upgrade individually — never as a batch `--force`.

### Triaging transitive vulnerabilities

If a vuln is in a transitive dep:
1. Find the parent: `npm ls <transitive-dep>` — read the tree.
2. Check if the parent has a newer version that drops/updates the transitive.
3. If yes → upgrade the parent.
4. If no → the parent is stuck; this is an upstream issue. Decide whether to accept or fork.

---

## Skill Extraction Candidates

These are the workflow chunks that look ripe to become Claude Code slash commands:

| Skill | Trigger | Behavior |
|-------|---------|----------|
| `/audit-deps` | "audit deps for security" | Runs Phase 0 + Phase 1, returns a decision-ready triage table |
| `/check-dep-usage <name>` | "is X used anywhere" | Source/doc/test/script-wide grep, returns Used / Aspirational / Unused |
| `/remove-unused-dep <name>` | "remove X" | Plan-Mode → uninstall → doc cleanup → build verify → CHANGELOG + RECOVERY updates |
| `/plan-breaking-upgrade <name>` | "upgrade X" | Identifies callsites, maps API diffs, drafts migration plan |
| `/security-audit-report` | "summarize the audit" | Renders Phase 0–5 results into a status doc |

> **Note:** These are not yet built. Each should be authored only after the underlying playbook section has been exercised on ≥2 real cases — to avoid premature abstraction (a recurring lesson from TESTING_PLAYBOOK v2.0).

---

## Companion Documents

- `agent_docs/SECURITY_FINDINGS.md` — **app-level** vulnerabilities discovered during integration/E2E testing (different scope; this playbook handles **dep/repo-level**)
- `agent_docs/TESTING_PLAYBOOK.md` — same pattern, applied to testing practice
- `CHANGELOG.md` — `[Unreleased]` → `Security` / `Removed` entries for every applied change

---

## Appendix A — Case Studies

> **Canonical end-to-end example:** Case Studies #1 → #4 (2026-05-16 / 2026-05-17) together form the **reference walkthrough** for the full playbook — `npm audit` baseline (25 vulns: 3 critical, 11 high, 9 moderate, 2 low) → `npm audit fix` (4 vulns) → unused-dep removal (axios, 18 advisories eliminated from graph) → breaking-change migration with visual sign-off (swiper@11→12) → npm `overrides` for parent-pinned transitive (postcss) → second `overrides` application proving the pattern generalizes (brace-expansion) → final state of **0 vulnerabilities**. Read these four in order as the worked example for a new operator (human or agent) coming to repo-dep-security work fresh. The fifth phase — **production propagation via `npm ci` + pre-deploy eyeball** — is the same Tony will run when copying `package.json` + `package-lock.json` from this dev branch into the production/Vercel repo.


### Case Study #1 — Dockbloxx `npm audit` pass, 2026-05-16

**Operator:** Claude Code
**Trigger:** Ad-hoc `npm audit` request by Tony

**Phase 0 (baseline):** 25 vulnerabilities — 3 critical, 11 high, 9 moderate, 2 low.

**Top offenders:**
- `axios@1.7.9` — **18 advisories** (SSRF, prototype pollution, credential leakage, CRLF, DoS)
- `swiper` — critical prototype pollution
- `next` / `postcss` chain — multiple advisories (SSRF, XSS, DoS, cache poisoning)

**Phase 1 (`npm audit fix`):** 25 → **4** vulnerabilities. Most issues had non-breaking patches available.

**Phase 2 (triage):**

| Dep | Status | Decision | Reasoning |
|-----|--------|----------|-----------|
| `axios` | Direct, still flagged after fix | **Remove** | Zero imports in source (`*.ts/tsx/js/jsx`). Only references: `package.json:32` and a docs example in `docs/architecture/frontend.md` describing it as "available as a secondary option." Project uses native `fetch()` for HTTP throughout. |
| `swiper` | Direct, critical | **Defer — plan breaking migration** | `swiper@11 → 12.1.4` is a breaking API change. Used in carousel components. Needs migration plan, not `--force`. |
| `next/postcss` | Transitive | **Defer — Next upgrade path** | `npm audit fix --force` proposed `next@9.3.3` (a **major downgrade** from 15). Hard no. Needs proper Next patch/minor upgrade. |
| `brace-expansion` | Transitive | **Accept for now** | Low impact, will resolve with next dep refresh. |

**Phase 3 (execute):**
- `npm uninstall axios`
- Deleted "Alternative HTTP Client: Axios" section in `docs/architecture/frontend.md`
- Verified zero remaining axios references (source + docs + non-lockfile JSON)

**Phase 4 (bookkeep):**
- `CHANGELOG.md` — added `[Unreleased] → Removed` entry citing the 18 CVEs eliminated
- `session_2026-05-16.md` — created session log
- `RECOVERY.md` — updated pointer
- This playbook — seeded v0.1 with today's pass as Case Study #1

**Phase 5 (re-baseline):**
- `npm audit` after: 4 vulns (same count — `audit fix` had already patched axios in-place earlier).
- **Real win:** ~18 CVE advisories eliminated from the dep graph going forward.
- `npm run build`: exit 0, all routes rendered.

**Lessons distilled from this pass:**
1. The headline vuln count is a lagging indicator — eliminating a dep with many advisories is high-value even when it doesn't move the count further than `audit fix` already did.
2. Aspirational doc examples are a strong signal of unused deps — grep `*.md` always, not just source.
3. The "fix" suggested by `audit fix --force` can be catastrophically wrong (Next 15 → 9.3.3). Always inspect before running.
4. Confirming a removal needs both a source grep AND a build — but a build alone isn't enough (tree-shaking can hide ghost imports in dev).

---

### Case Study #2 — Dockbloxx `swiper@11 → swiper@12` migration, 2026-05-16

**Operator:** Claude Code
**Trigger:** Last remaining critical CVE after Case Study #1 — `swiper@11.2.10` prototype pollution (GHSA-hmx5-qpq5-p643). `npm audit fix --force` proposed `swiper@12.1.4` (breaking change), so a real plan was required rather than reflexive `--force`.

**Pre-migration recon:**

Phase 2 usage check (per [P2](#p2--remove-beats-upgrade-beats-patch)) showed swiper was **not removable** — it powers the mobile product gallery. But the usage was tiny:

| Surface | Result |
|---------|--------|
| Files importing swiper | **1** (`src/components/shop/product-page/mobile/MobileProductSlider.tsx`) |
| Modules used | `Navigation`, `Thumbs` only |
| CSS imports | `swiper/css`, `swiper/css/navigation`, `swiper/css/thumbs` |
| Test coverage | **None** (no unit, integration, or E2E test touches swiper) |
| Callsites | 1 (`src/components/shop/product-page/ProductDetails.tsx`, mobile-only via `lg:hidden`) |

**v12 breaking-change audit (from swiper CHANGELOG):**

| v12 change | Impact on this codebase |
|------------|------------------------|
| Navigation arrows → SVG icons (was CSS-pseudo) | 🟡 **Visible change risk** — needs eyeball verification |
| LESS/SCSS removed in favor of CSS | ✅ No impact (we already import CSS paths) |
| Thumbs accepts HTMLElement / selector string (additive) | ✅ No impact |
| `wrapperClass` prop added (additive) | ✅ No impact |
| Package shipped as `.mjs` only | ✅ Next.js handles natively |

**Decision:** Plan a focused 7-step migration. Pause for visual approval after the build (step 4) because the gallery is a customer-facing UI on a money path.

**Execution results:**

| Step | Result |
|------|--------|
| 1. Pre-flight snapshot | Branch `main`, working tree dirty with same-day axios+playbook work (expected) |
| 2. `npm install swiper@12.1.4` | Clean, 2 pkgs changed, audit drops 4 → 3 immediately |
| 3. `npm run build` | Exit 0; `/shop/[slug]` bundle 44.8 kB → 45.3 kB (+0.5 kB); zero type errors |
| 4. Manual mobile/tablet UI verification | Tony tested mobile + iPad-mini viewports on `/shop/life-saver` → "looks perfect." All checklist items passed (image render, thumbnail strip, click-sync, swipe-sync, arrows render, no console errors). |
| 5. CSS adjustment | **SKIPPED** — no restyling needed despite the SVG-arrow swap |
| 6. Final audit | 3 moderate remaining (brace-expansion transitive, next/postcss chain). Zero critical, zero high. |
| 7. Bookkeeping | CHANGELOG `[Unreleased] → Security` entry, RECOVERY pointer updated, session log appended, this case study written |

**Files touched:**
- `package.json` (swiper pin only)
- `package-lock.json` (regenerated)
- `MobileProductSlider.tsx`: **0 lines changed** — survived the upgrade unmodified

**Lessons distilled (additions to the principles):**

1. **Documented breaking changes don't always *manifest* as visible changes.** v12's CSS-pseudo → SVG nav-arrow swap was the only "visible" concern in the v12 release notes, but our existing Tailwind/global styles absorbed it cleanly. A small fraction of advertised breaking changes actually matter for any given codebase — the *scope of your usage* is what determines real impact, not the changelog severity.

2. **Mandate visual approval on customer-facing UI before bookkeeping locks in "no regression."** Tony's pause-at-step-4 modification (a 2-minute cost on a money path) is now part of the standard workflow for any UI-affecting upgrade. **Codifying as new principle: [P7](#p7--require-visual-sign-off-before-finalizing-customer-facing-upgrades).**

3. **A tiny usage surface flips the cost calculus.** Migrating a dep used pervasively might justify staying on a patched older major; migrating a dep used in one component is usually faster than maintaining a CVE-acceptance rationale.

4. **The build-bundle-size delta is a useful sanity check.** +0.5 kB for swiper@12 on `/shop/[slug]` is reasonable; a 50 kB delta would have been a red flag worth investigating.

**Compounded session arc (Case Study #1 + #2):**

| Snapshot | Total | Critical | High | Moderate | Low |
|----------|-------|----------|------|----------|-----|
| Session start | 25 | 3 | 11 | 9 | 2 |
| After `npm audit fix` | 4 | 1 | 0 | 3 | 0 |
| After axios removal | 4 | 1 | 0 | 3 | 0 (+ 18 advisories eliminated from graph) |
| After swiper@12 | **3** | **0** | **0** | **3** | **0** |

Zero critical, zero high after one session — a defensible posture even though three moderates remain (next/postcss chain pending proper Next upgrade; brace-expansion transitive).

**Retroactive playbook update prompted by Case Study #2:**

Adding [P7](#p7--require-visual-sign-off-before-finalizing-customer-facing-upgrades) below.

---

### Case Study #3 — Dockbloxx `postcss` CVE resolution via npm `overrides`, 2026-05-17

**Operator:** Claude Code
**Trigger:** Last day's pass left 3 moderate vulns. The `next` → `postcss` chain was queued for "Next upgrade path" today. Investigation revealed this was a dead end.

**The pivot moment:**

Yesterday's session ended with the assumption that upgrading Next from 15.5.18 to a newer 15.x patch would clear the bundled postcss. The morning verification step ([P8](#p8--when-an-upstream-parent-pins-a-vulnerable-transitive-prefer-overrides-over-major-version-upgrade), retroactively codified) showed:

```bash
$ npm view next versions  # 15.x ends at 15.5.18; 16.x is current major
$ npm view next@15.5.18 dependencies.postcss     # → '8.4.31'
$ npm view next@16.0.0   dependencies.postcss    # → '8.4.31'
$ npm view next@16.2.6   dependencies.postcss    # → '8.4.31'
```

**Conclusion: Next does not move postcss across the entire 15.x → 16.x line.** Major upgrade would have been weeks of work with zero CVE benefit.

**Real exploit risk:** Effectively zero. The advisory (GHSA-qx2v-qp2m-jg93, XSS via unescaped `</style>` in CSS stringify) only matters if attacker-controlled content reaches postcss. In our setup, postcss runs at *build time* on CSS we author. The CVE is hygiene, not real risk — but the audit advisory blocks clean security gates, so worth resolving.

**Decision (per newly-formed [P8](#p8--when-an-upstream-parent-pins-a-vulnerable-transitive-prefer-overrides-over-major-version-upgrade)):** Use npm `overrides` to force-resolve postcss across the dep tree.

**Execution:**

| Step | Result |
|------|--------|
| 1. Added `"overrides": { "postcss": "^8.5.10" }` to `package.json` | — |
| 2a. `npm install` (first try) | ❌ `EOVERRIDE` — direct devDep `postcss@^8.4.38` didn't intersect override range. New gotcha discovered. |
| 2b. Bumped direct devDep `postcss` to `^8.5.10`, reran install | ✅ Clean. `removed 1 package, changed 1 package`. |
| 3. `npm ls postcss` | All 9 instances now `8.5.14`, including `next@15.5.18 → postcss@8.5.14 deduped`. Top-level marked `overridden`. |
| 4. `npm audit` | **3 moderate → 1 moderate.** Only `brace-expansion` remains. |
| 5. `npm run build` | Exit 0. Bundle sizes unchanged (build CSS pipeline produced equivalent output). |
| 6. Dev-server smoke test | `/`, `/shop/life-saver`, `/cart` all HTTP 200; stylesheet bundles present and healthy. |
| 7. Bookkeeping | This case study + P8 principle + CHANGELOG + session + RECOVERY updates |

**Files touched:**
- `package.json`: added `overrides` block (2 lines content); bumped direct `postcss` devDep range
- `package-lock.json`: regenerated by `npm install`
- Zero source-code changes

**Lessons distilled:**

1. **Verify before assuming an upgrade fixes anything.** The "upgrade Next to fix postcss" plan was wrong because nobody had checked what postcss Next actually bundles. This is now codified as P8 — make the verification a habit, not an afterthought.
2. **npm `overrides` quirk to remember:** if the transitive is also a direct dep with a narrower range, the override fails with `EOVERRIDE`. Bump the direct dep range to match before retrying. This isn't documented prominently and bit us on the first install attempt.
3. **Override resolution is more powerful than people give it credit for.** It propagated to Next's internal nested resolution, which is exactly what we needed. Not a partial fix.
4. **"Build-time only" CVEs are still worth fixing when the fix is cheap.** Audit cleanliness has value for CI gates, future security reviews, and the simple fact that a clean audit makes the next real CVE more visible.

**Compounded session arc (2 days total):**

| Snapshot | Total | Critical | High | Moderate |
|----------|------:|---------:|-----:|---------:|
| 2026-05-16 start | 25 | 3 | 11 | 9 |
| Yesterday close (axios + swiper) | 3 | 0 | 0 | 3 |
| **Today close (postcss override)** | **1** | **0** | **0** | **1** |

The one remaining `brace-expansion` is build-time-only with no exploit path for a webapp that doesn't accept user-supplied glob patterns. Acceptable to defer until upstream parents (eslint, jest, tailwind) bump minimatch on their own schedules.

**Retroactive playbook update prompted by Case Study #3:**

Added [P8](#p8--when-an-upstream-parent-pins-a-vulnerable-transitive-prefer-overrides-over-major-version-upgrade) above.

---

### Case Study #4 — Dockbloxx `brace-expansion` override (second application of P8), 2026-05-17

**Operator:** Claude Code
**Trigger:** Same-day follow-up to Case Study #3. After the postcss override left 1 moderate vuln (`brace-expansion` via `eslint@8 → minimatch@3 → brace-expansion@1.1.11`), Tony requested the same override pattern be applied to confirm the approach generalizes beyond a one-shot postcss fix.

**Why this is the important data point:** Case Study #3 introduced P8 with a single proof. A principle proven by one case is interesting; a principle proven by two cases — across different parent ecosystems (Next.js framework internals vs. eslint linter internals) — is reusable.

**Execution (deliberately brief — same shape as Case Study #3):**

| Step | Result |
|------|--------|
| 1. Added `"brace-expansion": "^2.0.2"` to existing `overrides` block | One-line addition, no other changes |
| 2. `npm install` | ✅ Clean on first try (no `EOVERRIDE` — `brace-expansion` is not a direct dep, unlike postcss). Net `-8 packages` from dedup. |
| 3. `npm ls brace-expansion` | All 8 instances resolve to `2.1.0`; eslint→minimatch@3 chain marked `overridden`, rest `deduped`. |
| 4. `npm audit` | **`found 0 vulnerabilities`** — clean. |
| 5. `npm run build` | Exit 0, bundle sizes unchanged. |
| 6. `npm run test` (Jest) | **166/166 pass** across 15 suites. |
| 7. `npm run test:e2e` (Playwright) | **16/16 pass** in 59.6s. |

**What Case Study #4 proves about P8:**

1. **Generalizes across parent types.** Worked identically for a framework internal (Next/postcss) and a tooling internal (eslint/brace-expansion).
2. **`EOVERRIDE` is a Case-#3-specific gotcha**, not a P8-general one. Brace-expansion is purely transitive — no direct dep to align — so the install worked first try. The `EOVERRIDE` failure mode only triggers when the target is *also* declared as a direct dep with a narrower range. Worth knowing because it means most override applications won't hit it.
3. **Override + dedup compound nicely.** The 8 separate nested copies of brace-expansion collapsed into shared 2.x resolutions after the override, eliminating 8 packages from the installed tree. CVE removal *and* tree cleanup in one move.
4. **Test suite coverage matters for confidence.** A build pass alone wouldn't catch a runtime regression from API drift. Full unit + E2E green is what makes this defensible as "no functional impact."

**Mini-lesson on alternate fix paths considered:**

The "proper" structural fix for this CVE is upgrading to `eslint@9`, which would replace the entire minimatch@3 chain. That's a real migration (flat config rewrite, plugin compatibility audit, potential lint-rule changes) — days of work for the same CVE outcome. The override compressed that to ~3 minutes plus test runs.

**Final session posture (2 calendar days, 4 case studies):**

| Snapshot | Total | Critical | High | Moderate |
|----------|------:|---------:|-----:|---------:|
| 2026-05-16 start | 25 | 3 | 11 | 9 |
| After Case Study #1 (axios) + #2 (swiper) | 3 | 0 | 0 | 3 |
| After Case Study #3 (postcss override) | 1 | 0 | 0 | 1 |
| **After Case Study #4 (brace-expansion override)** | **0** | **0** | **0** | **0** |

**`npm audit: found 0 vulnerabilities`.** Defensible clean state. No carryover for next session.

---

## Changelog (of this playbook)

| Date | Version | Editor | Change |
|------|---------|--------|--------|
| 2026-05-16 | 0.1 | Claude Code | Initial draft. Seeded with Dockbloxx `npm audit` Case Study #1. |
| 2026-05-16 | 0.2 | Claude Code | Added Case Study #2 (swiper@11→12 migration). Promoted Tony's pause-for-visual-check practice to **P7** as a first-class principle for customer-facing UI upgrades. |
| 2026-05-17 | 0.3 | Claude Code | Added Case Study #3 (postcss override pattern). New principle **P8** — verify upgrade actually moves the vulnerable transitive before scoping a major version migration; prefer npm `overrides` when the parent pins exact. Documented the `EOVERRIDE` direct-dep-range gotcha. |
| 2026-05-17 | 0.4 | Claude Code | Added Case Study #4 (brace-expansion override). Second application of P8 — proves the override pattern generalizes beyond a one-shot postcss fix to a different parent ecosystem (eslint internals). Confirmed `EOVERRIDE` is a case-specific gotcha, not P8-general. Final session posture: **0 vulnerabilities**. |
| 2026-05-17 | 0.5 | Claude Code | Added **Phase 6** (Production propagation + pre-deploy verification) and a reusable **Pre-Deployment Eyeball Checklist** scoped to customer-facing storefronts. New principle **P9** — production deployment requires lockfile propagation + `npm ci` + pre-deploy eyeball. Documented the `routesManifest.dataRoutes is not iterable` failure mode and the `rm -rf .next` workaround. Marked Case Studies #1→#4 as the canonical end-to-end reference walkthrough. |
