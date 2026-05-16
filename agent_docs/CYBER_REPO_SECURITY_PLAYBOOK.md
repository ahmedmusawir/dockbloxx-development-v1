# Cyber Repo Security Playbook

> **AI App Factory — Reusable Security Practice**
> *Living document. Principles are backend-agnostic. Case studies are project-specific.*
> *Version: 0.1 (DRAFT — seeded 2026-05-16) | Maintainer: Claude Code*

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

## Changelog (of this playbook)

| Date | Version | Editor | Change |
|------|---------|--------|--------|
| 2026-05-16 | 0.1 | Claude Code | Initial draft. Seeded with Dockbloxx `npm audit` Case Study #1. |
| 2026-05-16 | 0.2 | Claude Code | Added Case Study #2 (swiper@11→12 migration). Promoted Tony's pause-for-visual-check practice to **P7** as a first-class principle for customer-facing UI upgrades. |
