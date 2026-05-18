# Cyber Repo Security Playbook (v0.6)

> **AI App Factory — Reusable Security Practice**
> *Living document. Principles are backend-agnostic. Case studies are project-specific.*
> *Version: 0.6 — Three-Repo Promotion verified end-to-end against production (seeded 2026-05-16, expanded 2026-05-17 morning + afternoon, multi-repo procedure codified 2026-05-17) | Maintainer: Claude Code*
> *Filename convention: this file is renamed on each version bump so the version is visible at a glance (e.g., `CYBER_REPO_SECURITY_PLAYBOOK_v0.6.md`). Previous versions are not preserved on rename — see internal Changelog table at the bottom for version history.*

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

### P9 — Three-Repo Promotion for Customer-Facing Security Patches

Security patches affecting customer-facing code pass through **three repos with explicit checkpoints**:

1. **Dev repo** (source of truth) — make the dep changes, regenerate the lockfile, run the full local test pyramid + dev-backend smoke.
2. **Local prod mirror** (same repo on a different clone, `.env.local` pointing at the **real production backend**) — install via `npm ci` from the dev-generated lockfile, re-run tests + build, **manually smoke against real prod data** with a Stripe test card.
3. **Vercel prod repo** (the actual deploy target) — install via `npm ci`, re-run tests + build, commit, push, smoke the live URL post-deploy.

Each phase has a hard checkpoint: **all green or stop.** No phase is optional.

**Why:** Skipping the local prod mirror trades "caught on dev" for "caught by customers." Dev backend is sanitized test data; the local prod mirror is the **only** place you find out that your dep change works against real-world product slugs, real coupons, real WooCommerce category structures, real Pressable response shapes — *before* any production traffic sees it. Vercel is the deploy; the mirror is the verification.

**How to apply:** See the [Procedure: Three-Repo Security Patch Promotion via npm ci](#procedure-three-repo-security-patch-promotion-via-npm-ci) section below for the full runbook with command-by-command checkpoints.

(Origin: formalized 2026-05-17 during the postcss + brace-expansion multi-repo deployment, with the local prod mirror added explicitly between dev and Vercel.)

### P10 — `npm ci` for Lock-Strict Promotion Between Repos

When propagating a verified dependency tree from one repo to another, copy **BOTH** `package.json` AND `package-lock.json`, then install with `npm ci` — **never** `npm install`.

| Mode | Use when |
|------|----------|
| `npm install` | **Establishing** the lockfile. Dev repo, after editing `package.json`, before any propagation. Fresh resolution; lock file becomes the authoritative output. |
| `npm ci` | **Propagating** the lockfile. Local prod mirror and Vercel prod repo. No resolution; honors the lock exact; fails loudly if `package.json` and lock are out of sync. |

**Why:** `npm install` does fresh range resolution and may pick different transitive versions on different machines or at different times (because the npm registry advances). `npm ci` installs exactly what the lockfile specifies — same bytes everywhere. This is what makes the three-repo promotion deterministic. If you `npm install` in the prod repo, you've just defeated the entire point of having a lockfile.

**Gotcha:** `npm ci` requires both `package.json` and `package-lock.json` to be present AND in sync. If they drift, it fails with an explicit error — investigate that error rather than working around it.

**How to apply:** Phase 1 of the procedure uses `npm install` (dev, establishes the lock); Phases 2 and 3 use `npm ci` (mirror + prod, honor the lock).

(Origin: 2026-05-17 — the propagation mechanism that made the three-repo flow byte-identical across environments.)

### P11 — Threat-Landscape Check Before Every Install Session

Before any registry-fetching command (`npm install`, `npm audit fix`, `npm ci`, dep upgrades), perform a quick web search for **active npm supply-chain attacks in the past 7 days**. If active threats overlap with the project's dependencies — transitive or direct — halt and assess.

**Examples that trigger this:**
- Mini Shai-Hulud campaign (Sept 2025 onward) — periodic typosquats and malicious post-install scripts in popular dep ecosystems
- node-ipc compromise (Mar 2022) — politically-motivated payload injection in a transitive of vue-cli and friends
- Any "Vercel/Next/React popular package backdoored" headline

**Why:** npm registry compromise is rare but high-impact. A normal-looking `npm install` becomes the attack vector. Spending 60 seconds checking the threat landscape before pulling fresh deps is cheap insurance against installing a payload that was published in the last day.

**How to apply:** A literal one-line search ("npm supply chain attack last 7 days" or check GitHub Security Advisories / npm's published advisories) before each session. Document in `RECOVERY.md` or session log that the check was done. If a threat overlaps with project deps, halt and triage; do not install.

(Origin: Tony's standing pre-install question — "any current npm threat?" — formalized 2026-05-17 in the context of Mini Shai-Hulud and node-ipc compromises being active reference points.)

### P12 — Git Divergence: Investigate Before Pulling, Never Force

When `git push` is rejected due to divergent branches, **do not blindly `git pull`** and **do not `git push --force`**. Run three diagnostic commands first:

```bash
git log HEAD..origin/main --oneline    # what does the remote have that we don't?
git log origin/main..HEAD --oneline    # what do we have that the remote doesn't?
git show --stat <commit>               # which files did each remote commit modify?
```

**Then decide based on overlap:**

| Remote commits touched … | Action |
|--------------------------|--------|
| Files unrelated to your current changes | **Safe:** `git pull --rebase origin main && git push` |
| Files you also modified in current work | **Stop:** manual merge required; understand the conflict before resolving |
| Anything in `package.json` or `package-lock.json` if you're shipping a dep change | **Extra care:** lockfile merges are deceptively dangerous; verify post-merge with `npm ci` + build + tests before pushing |

**Why:** Production repos accumulate commits from other workflows (CMS-driven content updates, hotfixes by other operators, automated bots). Force-pushing or blind-pulling can erase legitimate work or merge incompatible changes. The 30 seconds spent reading the divergence first prevents reverts, lost commits, and post-deploy hotfixes.

**How to apply:** Make the three diagnostic commands a reflex when push is rejected. If the diagnostics don't make the safe path obvious, stop and assess — never default to `--force`.

(Origin: Tony's prod repo divergence on 2026-05-17 — remote had earlier privacy + MeetTheTeam content updates from a separate workflow that hadn't propagated to this clone. Rebase was safe because those commits touched unrelated files; verified before push went through.)

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

### Phase 6 — Production propagation

Local cleanliness is not deployment cleanliness. After Phase 5, run the **[Procedure: Three-Repo Security Patch Promotion via npm ci](#procedure-three-repo-security-patch-promotion-via-npm-ci)** section below. That procedure is the operationalization of [P9](#p9--three-repo-promotion-for-customer-facing-security-patches) (three-repo flow) and [P10](#p10--npm-ci-for-lock-strict-promotion-between-repos) (`npm ci` for propagation). It replaces the inline phase 6 sub-steps that lived here in v0.5 — the procedure is now a top-level section because it deserves the standalone attention.

---

## Procedure: Three-Repo Security Patch Promotion via npm ci

The runbook for every customer-facing security patch. Three phases. **Do not skip phases.** Each phase has a hard "all green or stop" checkpoint.

This is the load-bearing procedure of the playbook. The principles ([P9](#p9--three-repo-promotion-for-customer-facing-security-patches), [P10](#p10--npm-ci-for-lock-strict-promotion-between-repos)) explain *why*; this section is the *how*, command-by-command.

### Phase 1 — Dev Repo (source of truth)

The dev repo is where dependency changes originate and where the authoritative lockfile is regenerated. Phase 1 establishes the artifacts that Phases 2 + 3 will propagate.

```bash
# 1.1 — Pre-flight: branch + threat-landscape check (per P11)
git checkout -b security-patch-YYYY-MM-DD       # safety branch — don't work on main
# Web search: "npm supply chain attack last 7 days" — confirm no active threats
# overlap with project deps. If overlap exists, HALT and triage before installing.

# 1.2 — Edit package.json with dep changes
#       (e.g., add `overrides`, bump dep, remove unused dep)

# 1.3 — Force fresh lock resolution
rm package-lock.json
npm install

# 1.4 — Immediate post-install audit (verify expected vuln profile)
npm audit                                        # confirm count matches expectation

# 1.5 — Build must succeed
npm run build

# 1.6 — Full test suite
npm test                                         # Jest unit + integration
npm run test:e2e                                 # Playwright

# 1.7 — Flush cached build artifacts before final smoke
rm -rf .next
npm run build                                    # clean rebuild

# 1.8 — Manual dev smoke (dev backend)
npm run dev
#   Walk through MANUAL_SMOKE_TEST.md checklist (repo root)
#   Use Stripe test card: 4242 4242 4242 4242, any future expiry, any CVC, any ZIP
#   Hit homepage, product page, cart, checkout (up to Stripe boundary)
```

**Checkpoint:** ALL of the above must be green. `npm audit` matches the expected delta, build clean, tests clean, dev smoke clean. If anything fails, stop and fix in dev before any propagation.

**Output artifacts:** updated `package.json` + freshly-generated `package-lock.json`. These two files are the only things that propagate.

### Phase 2 — Local Prod Mirror (real prod backend, local code)

The local prod mirror is the same repo on a different clone, with `.env.local` pointing at the **real production backend** (production Pressable WooCommerce, production Stripe webhook receivers in test mode, etc.). This is the only environment that catches "works against dev test data but breaks against real prod data" before customer traffic does.

```bash
# 2.1 — CONFIRM .env.local POINTS AT PROD BACKEND
#       This is non-negotiable. Open .env.local and verify NEXT_PUBLIC_BACKEND_URL
#       (and any *_API_URL / *_BACKEND vars) point at the production Pressable host,
#       not dev. If you skip this check, you've just tested dev → dev again and the
#       whole phase has zero verification value.

# 2.2 — Copy BOTH artifacts from dev repo
cp ../dockbloxx-dev/package.json .
cp ../dockbloxx-dev/package-lock.json .
#       DO NOT delete the lock file. The lockfile IS the propagation mechanism.

# 2.3 — Clean slate for npm ci
rm -rf node_modules

# 2.4 — Strict install per P10
npm ci                                           # honors lockfile exact, no resolution

# 2.5 — Audit must match dev's profile exactly
npm audit                                        # same vuln count as Phase 1.4

# 2.6 — Build + tests
npm run build
npm test
npm run test:e2e

# 2.7 — Manual smoke against REAL prod backend
npm run dev
#   MANUAL_SMOKE_TEST.md checklist again
#   Stripe TEST card (4242…) — NEVER a real card, even though backend is prod
#   After smoke: DELETE the test order from prod WooCommerce admin to keep prod
#   data clean (test orders pollute analytics, reports, abandoned-cart flows)
```

**Checkpoint:** ALL green. Audit profile matches dev. Build clean. Tests clean. Manual smoke against prod backend reveals no real-data regressions. Test order deleted from prod admin.

**Why this phase is non-negotiable:** Dev backend is sanitized test data. Real prod has product slugs you didn't know existed, categories with edge-case structures, coupons with quirks, and WooCommerce response shapes that subtly differ from dev. The local prod mirror is where you find that out — before deploy, not after.

### Phase 3 — Vercel Prod Repo (live deploy)

The Vercel prod repo is what auto-deploys to the live customer-facing URL when you push to `main`. Phase 3 propagates the verified artifacts there and triggers the deploy.

```bash
# 3.1 — CRITICAL pre-flight: confirm you're INSIDE the repo folder
pwd                                              # must be inside the repo, not parent
ls package.json                                  # must exist here
#       Files at parent-folder level trigger Next.js's "multiple lockfiles detected"
#       warning at build time and can cause npm ci to install in the wrong location.
#       See G-NPM-3 in Gotchas section below.

# 3.2 — Copy BOTH artifacts from dev repo (same as Phase 2.2)
cp ../dockbloxx-dev/package.json .
cp ../dockbloxx-dev/package-lock.json .

# 3.3 — Strict install
npm ci

# 3.4 — Re-verify everything
npm audit
npm run build
npm test
npm run test:e2e

# 3.5 — Commit
git add package.json package-lock.json
git commit -m "Security: <description of patch> — promoted from dev"

# 3.6 — Push (this triggers Vercel auto-deploy)
git push origin main

# 3.7 — IF push is rejected due to divergent branches: STOP. Apply P12.
#       git log HEAD..origin/main --oneline       # what does remote have?
#       git log origin/main..HEAD --oneline       # what do we have?
#       git show --stat <remote-commit>           # which files did it touch?
#       If remote commits don't touch your changed files:
#         git pull --rebase origin main && git push
#       If remote commits touch your changed files:
#         STOP — manual merge required. Do NOT --force.

# 3.8 — Post-deploy smoke (live production URL)
#       Wait for Vercel build to finish (watch the Vercel dashboard)
#       Hit the live URL — MANUAL_SMOKE_TEST.md against real prod
#       Stripe TEST card only
#       Delete the test order from prod admin afterward

# 3.9 — Watch first 15 minutes of production traffic for errors
#       Vercel dashboard → Logs / Errors tab
#       Any spike in 4xx / 5xx → investigate immediately
#       If you see errors related to the patch, rollback via Vercel's "Promote to
#       Production" on the previous deployment
```

**Checkpoint:** Deploy live, post-deploy smoke clean, first 15 min of traffic clean.

### Why `npm install` in Phase 1 but `npm ci` in Phases 2+3

| Phase | Command | Purpose |
|-------|---------|---------|
| 1 (dev) | `npm install` | **Establishes** the lockfile. Fresh resolution after `package.json` changes generates the authoritative tree. |
| 2 (mirror) | `npm ci` | **Propagates** the lockfile. Honors it exact, no resolution drift across environments. |
| 3 (prod) | `npm ci` | **Propagates** the lockfile. Same as Phase 2 — byte-identical tree to dev. |

Using `npm install` in Phase 2 or 3 defeats the entire point of the lockfile and re-introduces resolution drift. Don't do it.

### Quick reference card

```
PHASE 1 (dev)    →  rm package-lock.json → npm install → audit → build → test → smoke
PHASE 2 (mirror) →  copy package.json + lock → rm -rf node_modules → npm ci → audit → build → test → smoke against PROD backend
PHASE 3 (prod)   →  copy package.json + lock → npm ci → audit → build → test → commit → push → live smoke → watch 15min
```

---

## Gotchas

Known failure modes encountered during real procedure executions, with their fixes. Each gotcha is named (e.g., `G-NPM-1`) so it can be referenced from procedure steps and case studies.

### G-NPM-1 — `EOVERRIDE`: npm overrides must be reachable from a declared dep

**Symptom:** Adding an `overrides` entry for a transitive dep triggers an `npm error code EOVERRIDE` on install.

**Cause:** npm refuses an override whose range doesn't intersect a direct dependency's declared range. If the package isn't a direct dep at all, the override is accepted. If it IS a direct dep but at an older/narrower range than the override, you get `EOVERRIDE`.

**Fix:** Bump the direct devDep's declared range to a version that intersects the override range. Then `npm install` again.

**Example:** Adding `"overrides": { "postcss": "^8.5.10" }` when `package.json` declared `"postcss": "^8.4.38"` as a direct devDep. Bumped the direct devDep to `^8.5.10` to match the override range; install succeeded.

**Encountered:** 2026-05-17 during Case Study #3a (postcss override).

### G-NPM-2 — `rm -rf .next` before final manual smoke

**Symptom:** After applying a dep change, the build succeeds and tests pass, but the manual smoke renders pre-upgrade behavior (or `next start` throws `routesManifest.dataRoutes is not iterable`).

**Cause:** Next.js's `.next` directory caches compiled artifacts that reference the previous dependency tree. Subsequent `next build` invocations can produce mixed-state artifacts that include stale references.

**Fix:** Delete `.next` between dep changes and the final smoke:

```bash
rm -rf .next && npm run build && npm start
```

This forces a complete rebuild against the current dep tree and writes a complete `routes-manifest.json`.

**When to apply:** As a habit at step 1.7 of the procedure (Phase 1) and before any production smoke. Also as the first thing to try if `next start` errors on a manifest field.

**Encountered:** 2026-05-17 during Case Study #3 — `next start` errored on `routesManifest.dataRoutes` until `.next` was wiped and rebuilt.

### G-NPM-3 — Stray files at parent directory level trigger multi-lockfile warning

**Symptom:** `next build` or `next dev` warns about "multiple lockfiles detected" even when there's clearly only one `package-lock.json` inside the repo. Worse, `npm ci` may install into an unexpected location.

**Cause:** Next.js walks UP the directory tree looking for `package.json` to determine the project root. If sibling repos or accidentally-copied files (e.g., a stray `package.json` from a different project) sit at the parent folder, Next.js detects them as competing roots.

**Fix:** Before running any install or build in a freshly-cloned repo, verify only the in-repo `package.json` exists:

```bash
ls package.json                       # must exist inside repo folder
ls ../package.json                    # MUST NOT exist (or it's a different project's root)
find .. -maxdepth 2 -name "package.json" -not -path "./node_modules/*" 2>/dev/null
```

Clean up any stray files at parent level before proceeding.

**Encountered:** Referenced as the reason Phase 3 step 3.1 has the explicit `pwd` + `ls package.json` pre-flight check — operating from the wrong directory level has been a real failure mode in past App Factory deployments.

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

- `MANUAL_SMOKE_TEST.md` (repo root) — **the smoke checklist referenced by Phase 1.8, Phase 2.7, and Phase 3.8 of the procedure.** Authored separately because it evolves with the storefront's feature set; the playbook just references it. The procedure's Stripe test card details (`4242 4242 4242 4242`) and "delete the test order from prod admin after smoke" rule both originate from the manual smoke test conventions.
- `agent_docs/SECURITY_FINDINGS.md` — **app-level** vulnerabilities discovered during integration/E2E testing (different scope; this playbook handles **dep/repo-level**)
- `agent_docs/TESTING_PLAYBOOK.md` — same pattern, applied to testing practice
- `CHANGELOG.md` — `[Unreleased]` → `Security` / `Removed` entries for every applied change

**Relationship between this playbook and `MANUAL_SMOKE_TEST.md`:** The playbook's [Pre-Deployment Eyeball Checklist](#pre-deployment-eyeball-checklist) is the **build-time-CSS-pipeline-specific** subset; `MANUAL_SMOKE_TEST.md` is the **full pre-production-push checklist** including transactional flows (checkout, Stripe boundary, dealer coupon, account flows). Both are run during Phases 1.8 / 2.7 / 3.8 — the playbook's checklist is a focused supplement, not a replacement.

---

## Appendix A — Case Studies

> **Canonical end-to-end example:** Case Studies #1 → #3 (2026-05-16 / 2026-05-17) together form the **reference walkthrough** for the full playbook — `npm audit` baseline (25 vulns: 3 critical, 11 high, 9 moderate, 2 low) → `npm audit fix` (4 vulns) → unused-dep removal (axios, 18 advisories eliminated from graph) → breaking-change migration with visual sign-off (swiper@11→12) → npm `overrides` for parent-pinned transitive (postcss, Case Study #3a) → second `overrides` application proving the pattern generalizes (brace-expansion, Case Study #3b) → **three-repo promotion through dev → local prod mirror → Vercel prod, verified end-to-end** → final deployed state of **0 vulnerabilities**. Read these three in order as the worked example for a new operator (human or agent) coming to repo-dep-security work fresh. Case Study #3 is the load-bearing chapter: it's the only one that captures the full local → mirror → production arc with the procedure operationalized.


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

### Case Study #3 — Three-Repo Promotion: From 25 Vulns to Zero, End-to-End, 2026-05-17

**Operator:** Claude Code (with Tony as architect / decision authority)
**Trigger:** The yesterday-close state was 3 moderate vulns remaining after Case Studies #1 + #2. Tony's intent today: drive to 0 and propagate end-to-end through every repo that ships customer-facing code.

**This is the load-bearing case study of the playbook.** It's the first one that captures the full local → local-prod-mirror → Vercel-prod arc, with the procedure operationalized and verified against real production. Read it together with the [Procedure section](#procedure-three-repo-security-patch-promotion-via-npm-ci) above.

**Why this work happened now — threat-landscape context:**

The wider npm ecosystem was active with supply-chain incidents at the time (Mini Shai-Hulud-style campaigns; reference points like the older node-ipc compromise still inform the practice). The pre-install threat-landscape check (now formalized as [P11](#p11--threat-landscape-check-before-every-install-session)) was Tony's standing question: *"any current npm threat?"* before pulling fresh deps. No active threats overlapped with project dependencies, so the work proceeded.

---

#### Day 1 outcomes (referenced — see Case Studies [#1](#case-study-1--dockbloxx-npm-audit-pass-2026-05-16) and [#2](#case-study-2--dockbloxx-swiper11--swiper12-migration-2026-05-16))

| Action | Outcome |
|--------|---------|
| Case Study #1 — axios removal | Direct dep removed (unused). 18 advisories eliminated from dep graph. |
| Case Study #2 — swiper@11 → swiper@12 | Critical CVE resolved. Visual sign-off on mobile + iPad-mini viewports. P7 (visual sign-off principle) formalized. |
| End-of-day 1 audit | 25 → 3 moderate. Zero critical, zero high. |

---

#### Day 2 morning — Case Study #3a: postcss override via npm `overrides`

**The pivot moment:**

Yesterday's session ended with a queued plan to "upgrade Next from 15.5.18 to a newer 15.x patch to clear the bundled postcss." Morning verification (now codified as [P8](#p8--when-an-upstream-parent-pins-a-vulnerable-transitive-prefer-overrides-over-major-version-upgrade)) revealed:

```bash
$ npm view next versions                          # 15.x ends at 15.5.18; 16.x is current major
$ npm view next@15.5.18 dependencies.postcss     # → '8.4.31'
$ npm view next@16.0.0   dependencies.postcss    # → '8.4.31'
$ npm view next@16.2.6   dependencies.postcss    # → '8.4.31'
```

**Conclusion: Next does not move postcss across the entire 15.x → 16.x line.** Major upgrade = weeks of work for zero CVE benefit. Decision: use npm `overrides`.

**Real exploit risk:** Effectively zero. GHSA-qx2v-qp2m-jg93 (XSS via unescaped `</style>` in CSS stringify) only matters if attacker-controlled content reaches postcss. In our setup, postcss runs at *build time* on CSS we author. CVE is hygiene, not real risk — but audit cleanliness has standalone value for security gates.

**Execution (Phase 1, dev only — full propagation came in the afternoon):**

| Step | Result |
|------|--------|
| 1. Added `"overrides": { "postcss": "^8.5.10" }` to `package.json` | — |
| 2a. `npm install` (first try) | ❌ `EOVERRIDE` — direct devDep `postcss@^8.4.38` didn't intersect override range. **New gotcha discovered — now codified as [G-NPM-1](#g-npm-1--eoverride-npm-overrides-must-be-reachable-from-a-declared-dep).** |
| 2b. Bumped direct devDep `postcss` to `^8.5.10`, reran install | ✅ Clean. `removed 1 package, changed 1 package`. |
| 3. `npm ls postcss` | All 9 instances now `8.5.14`, including `next@15.5.18 → postcss@8.5.14 deduped`. Top-level marked `overridden`. |
| 4. `npm audit` | **3 moderate → 1 moderate.** Only `brace-expansion` remains. |
| 5. `npm run build` | Exit 0. Bundle sizes unchanged. |
| 6. Dev-server smoke test | `/`, `/shop/life-saver`, `/cart` all HTTP 200; stylesheet bundles healthy. |

**Files touched:** `package.json` (overrides block + direct devDep bump), `package-lock.json` (regenerated). Zero source-code changes.

---

#### Day 2 morning — Case Study #3b: brace-expansion override (second P8 application)

**Trigger:** After #3a left 1 moderate vuln (`brace-expansion@1.1.11` via `eslint@8 → minimatch@3`), Tony directed applying the same override pattern to drive audit to zero and **prove [P8](#p8--when-an-upstream-parent-pins-a-vulnerable-transitive-prefer-overrides-over-major-version-upgrade) generalizes** beyond a one-shot postcss fix.

**Execution (Phase 1, dev only):**

| Step | Result |
|------|--------|
| 1. Added `"brace-expansion": "^2.0.2"` to existing `overrides` block | One-line addition, no other changes |
| 2. `npm install` | ✅ Clean on first try (no `EOVERRIDE` — brace-expansion isn't a direct dep, unlike postcss). Net `-8 packages` from dedup. |
| 3. `npm ls brace-expansion` | All 8 instances resolve to `2.1.0`; eslint→minimatch@3 chain marked `overridden`, rest `deduped`. |
| 4. `npm audit` | **`found 0 vulnerabilities`** — clean. |
| 5. `npm run build` | Exit 0, bundle sizes unchanged. |
| 6. `npm run test` (Jest) | **166/166 pass** across 15 suites. |
| 7. `npm run test:e2e` (Playwright) | **16/16 pass** in 59.6s. |

**What #3b proves about P8:**
1. **Generalizes across parent types** — same pattern worked for Next/postcss (framework internal) and eslint/brace-expansion (tooling internal).
2. **`EOVERRIDE` is case-specific** (G-NPM-1), not P8-general. Pure transitives don't trigger it.
3. **Override + dedup compound** — 8 nested copies collapsed into shared resolutions. CVE removal *and* tree cleanup in one move.
4. **Test-suite coverage matters.** Build pass alone wouldn't catch runtime regressions from API drift. Full unit + E2E green is what makes this defensible.

**Alternate fix path considered and rejected:** Upgrading to `eslint@9` (flat config) would have structurally fixed it but cost days. The override compressed that to ~3 minutes + test runs.

---

#### Day 2 afternoon — Three-repo promotion

With dev at `npm audit: found 0 vulnerabilities` and all tests green, the afternoon's work was propagating those artifacts through to production via the three-phase procedure (now codified as [P9](#p9--three-repo-promotion-for-customer-facing-security-patches) and [P10](#p10--npm-ci-for-lock-strict-promotion-between-repos)).

**Outcome:** All phases ran green, no regressions reported, production deployed. The one notable event was a `git push` rejection in Phase 3 due to **divergent branches** — pre-existing GitHub commits from a separate workflow had landed on the prod repo's `main` between the last sync and this push. Diagnosed using the three commands in [P12](#p12--git-divergence-investigate-before-pulling-never-force):

```bash
git log HEAD..origin/main --oneline    # remote had earlier privacy + MeetTheTeam content updates
git log origin/main..HEAD --oneline    # our local: just the package.json + lockfile changes
git show --stat <remote-commits>       # remote commits touched src/app/... pages, NOT package files
```

Remote commits touched **unrelated files** (content pages, not dep files), so a `git pull --rebase origin main && git push` was safe. No `--force` needed. Rebase resolved cleanly; push succeeded; Vercel auto-deploy triggered.

**Three-repo phase summary:**

| Phase | Repo | Install | Audit | Build | Tests | Smoke | Outcome |
|-------|------|---------|-------|-------|-------|-------|---------|
| 1 | Dev | `rm package-lock.json` + `npm install` | 0 vulns | ✅ | ✅ | ✅ dev backend | Lockfile established. |
| 2 | Local prod mirror (real prod backend) | `npm ci` | 0 vulns (matches dev) | ✅ | ✅ | ✅ prod backend, Stripe test card 4242, test order deleted post-smoke | Real-prod-data verification passed. |
| 3 | Vercel prod repo | `npm ci` | 0 vulns | ✅ | ✅ | ✅ live URL post-deploy, 15-min traffic watch clean | Deployed. |

**Notable:** The local prod mirror (Phase 2) is the phase that **only exists in this procedure** — not in lighter-weight workflows. It's what catches "works against dev test data but breaks against real prod data" before Vercel sees it. Without that phase, you trade "caught on dev" for "caught by customers."

---

#### Cumulative session arc (2 days, full procedure)

| Snapshot | Total | Critical | High | Moderate |
|----------|------:|---------:|-----:|---------:|
| 2026-05-16 start | 25 | 3 | 11 | 9 |
| After axios removal (Case Study #1) | 4 (with -18 advisories from graph) | 1 | 0 | 3 |
| After swiper@12 (Case Study #2) | 3 | 0 | 0 | 3 |
| After postcss override (#3a) | 1 | 0 | 0 | 1 |
| After brace-expansion override (#3b) | 0 | 0 | 0 | 0 |
| **After three-repo promotion (deployed live)** | **0** | **0** | **0** | **0** |

**`npm audit: found 0 vulnerabilities`** in production. Zero regressions reported. Procedure operationalized end-to-end.

---

#### Lessons distilled — specific to multi-repo coordination

1. **The local prod mirror is the load-bearing phase.** Dev catches code correctness; the mirror catches data-shape correctness; Vercel just deploys. Skipping the mirror is the classic "worked on my machine" → "broke for customers" failure mode.

2. **Lockfile-based propagation requires both files copied + `npm ci`.** If you skip `package-lock.json` or use `npm install` on the receiving repo, you've defeated the deterministic-tree guarantee. Procedure step 2.2 / 3.2 is non-negotiable.

3. **Git divergence on production repos is normal.** Other workflows (content updates, hotfixes, automated bots) commit to `main` between your syncs. Investigate before pulling, never force-push, use `git pull --rebase` only when remote touches unrelated files. [P12](#p12--git-divergence-investigate-before-pulling-never-force) codifies this.

4. **The threat-landscape check is cheap insurance.** 60 seconds of web search before each install session is the cost; the upside is not installing a malicious payload published in the last 24 hours. [P11](#p11--threat-landscape-check-before-every-install-session) makes this a habit, not an afterthought.

5. **A 5-minute eyeball checklist beats a 5-hour rollback.** Visual / functional smoke at Phases 1.8, 2.7, 3.8 catches regressions that builds and tests don't — Stripe iframe rendering quirks, CSS over-minification, real-prod-data edge cases. [P7](#p7--require-visual-sign-off-before-finalizing-customer-facing-upgrades) + the [Pre-Deployment Eyeball Checklist](#pre-deployment-eyeball-checklist) + `MANUAL_SMOKE_TEST.md` together make this systematic.

6. **Bookkeeping isn't optional and it isn't separate from the work.** CHANGELOG, RECOVERY, session log, playbook updates — all happen during the work, not after. If they're not in the bookkeeping, the work didn't happen ([P4](#p4--build-the-bookkeeping-into-the-action)).

**Retroactive playbook updates prompted by Case Study #3:**

- New principles [P9](#p9--three-repo-promotion-for-customer-facing-security-patches), [P10](#p10--npm-ci-for-lock-strict-promotion-between-repos), [P11](#p11--threat-landscape-check-before-every-install-session), [P12](#p12--git-divergence-investigate-before-pulling-never-force) above
- New top-level [Procedure section](#procedure-three-repo-security-patch-promotion-via-npm-ci) — the load-bearing runbook
- New top-level [Gotchas section](#gotchas) — [G-NPM-1](#g-npm-1--eoverride-npm-overrides-must-be-reachable-from-a-declared-dep), [G-NPM-2](#g-npm-2--rm--rf-next-before-final-manual-smoke), [G-NPM-3](#g-npm-3--stray-files-at-parent-directory-level-trigger-multi-lockfile-warning)
- Replaced the v0.5-era Phase 6 with a pointer to the procedure (it's a load-bearing standalone section now, not buried in workflow phases)
- Old standalone Case Studies #3 (postcss) and #4 (brace-expansion) folded in here as #3a and #3b respectively, since the three-repo promotion is the umbrella arc that gives them their full meaning

---

## Changelog (of this playbook)

| Date | Version | Editor | Change |
|------|---------|--------|--------|
| 2026-05-16 | 0.1 | Claude Code | Initial draft. Seeded with Dockbloxx `npm audit` Case Study #1. |
| 2026-05-16 | 0.2 | Claude Code | Added Case Study #2 (swiper@11→12 migration). Promoted Tony's pause-for-visual-check practice to **P7** as a first-class principle for customer-facing UI upgrades. |
| 2026-05-17 | 0.3 | Claude Code | Added Case Study #3 (postcss override pattern). New principle **P8** — verify upgrade actually moves the vulnerable transitive before scoping a major version migration; prefer npm `overrides` when the parent pins exact. Documented the `EOVERRIDE` direct-dep-range gotcha. |
| 2026-05-17 | 0.4 | Claude Code | Added Case Study #4 (brace-expansion override). Second application of P8 — proves the override pattern generalizes beyond a one-shot postcss fix to a different parent ecosystem (eslint internals). Confirmed `EOVERRIDE` is a case-specific gotcha, not P8-general. Final session posture: **0 vulnerabilities**. |
| 2026-05-17 | 0.5 | Claude Code | Added **Phase 6** (Production propagation + pre-deploy verification) and a reusable **Pre-Deployment Eyeball Checklist** scoped to customer-facing storefronts. New principle **P9** — production deployment requires lockfile propagation + `npm ci` + pre-deploy eyeball. Documented the `routesManifest.dataRoutes is not iterable` failure mode and the `rm -rf .next` workaround. Marked Case Studies #1→#4 as the canonical end-to-end reference walkthrough. |
| 2026-05-17 | 0.6 | Claude Code | **Major restructure after three-repo promotion verified end-to-end against live production.** Old standalone Case Studies #3 (postcss) and #4 (brace-expansion) folded into a new unified **Case Study #3 — Three-Repo Promotion: From 25 Vulns to Zero, End-to-End** with #3a / #3b sub-parts; the umbrella arc adds the afternoon's dev → local prod mirror → Vercel deploy timeline including the git divergence event resolved per P12. **Replaced v0.5's P9** with a more specific three-repo P9. Added **P10** (`npm ci` for lock-strict propagation), **P11** (threat-landscape check before install), **P12** (git divergence: investigate before pulling, never force). New top-level **Procedure: Three-Repo Security Patch Promotion via npm ci** section (Phase 1 Dev / Phase 2 Local Prod Mirror / Phase 3 Vercel Prod) — the load-bearing runbook. New top-level **Gotchas** section with **G-NPM-1** (`EOVERRIDE`), **G-NPM-2** (`rm -rf .next` before final smoke), **G-NPM-3** (stray parent-level files trigger multi-lockfile warning). Phase 6 in Standard Workflow reduced to a pointer at the procedure section. `MANUAL_SMOKE_TEST.md` (repo root) added to Companion Documents with relationship-to-eyeball-checklist explained. |
