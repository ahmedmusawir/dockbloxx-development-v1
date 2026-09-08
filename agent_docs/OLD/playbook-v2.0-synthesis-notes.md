# Testing Playbook v2.0 — Synthesis Notes (archived)

> **Status:** HISTORICAL DESIGN-RATIONALE ARCHIVE
> **Date:** 2026-05-11
> **Author:** Architect (Claude) during the v1.0 → v2.0 synthesis pass
> **NOT canonical guidance.** The canonical playbook is `agent_docs/TESTING_PLAYBOOK.md`. This file captures the design decisions, tensions, and gaps surfaced during synthesis — preserved for future-Architect work on v3.0 or beyond.
> **Do not link to this file from the canonical playbook or app documentation.** It exists as engineering history, not as instruction.

---

## Why this archive exists

During the v1.0 → v2.0 synthesis (Step 5, May 2026), the Architect agent flagged 3 tensions, 5 decisions, 5 gaps, and 5 questions for human review. Tony resolved each inline during the promotion pass. The Synthesis Notes appendix was then extracted from the canonical playbook (per Tony's Q4 answer) rather than deleted — on the rationale that future v3.0 synthesis will benefit from seeing why v2.0 landed where it did.

If you're reading this in service of a future synthesis: the resolutions section below shows what was decided. The original Q&A material that follows is the raw input.

---

## Resolutions applied during the v2.0 promotion pass

| # | Topic | Resolution |
|---|---|---|
| Q1 | v1.0 code-example handling | Per-example rule: keep verbatim if generic-style; re-cast to generic + parallel if app-specific. Webhook test in §4.1 re-cast; `meetsTier` and `safeRedirect` kept verbatim. |
| Q2 | Companion doc naming | Keep current names: `CHANGELOG.md` (root), `SECURITY_FINDINGS.md` + `CLEANUP_BACKLOG.md` (under `agent_docs/`). No rename. |
| Q3 | "When to start" companion docs | Prescribe Factory standard. §5 intro now reads: "Every new Factory app scaffolds with all three from day one." |
| Q4 | Synthesis Notes fate | Archive separately (this file), not delete entirely. Preserves design rationale for future synthesis without cluttering canonical. |
| Q5 | HIPAA / regulated environments | Add brief §4.6 stub holding the slot for future content. Real patterns get added after the first regulated-environment project ships v1.0. |

| Tension | Resolution |
|---|---|
| T1 — `tests/` vs `src/__tests__/` | Stay neutral. Both conventions named as valid in §2.1; pick one and stick with it. |
| T2 — Wrapper vs constructor-mock for Stripe | Soft recommendation for wrapper when codebase is under control; constructor-mock supported for legacy/no-wrapper cases. Decision tree in §4.3. |
| T3 — `clearMocks` vs `mockReset` | Both kept. `clearMocks` for simpler suites, `mockReset` when per-test mock behavior varies. §G4 notes the distinction. |

| Gap | Status |
|---|---|
| G1 — Client-side state store testing (Zustand/Redux/TanStack) | Deferred. Block 2 has material; future synthesis pass should pull it in. |
| G2 — React component testing patterns | Deferred. Dockbloxx has examples in `ApplyCoupon.test.tsx` etc. |
| G3 — CI integration | Deferred until first project has CI in place. |
| G4 — Coverage metrics | Deferred. |
| G5 — Fuzzing / property-based testing | Deferred. |

---

## Original Synthesis Notes content (as captured during draft)

Below is the raw Q&A material that produced the resolutions above. Preserved verbatim from the draft's appendix.

### Tensions surfaced

#### T1 — File location convention: `tests/` vs `src/__tests__/`

v1.0 prescribes `src/__tests__/` (StarkReads convention). Dockbloxx uses `tests/` at project root. Both work; both have advantages.

**Resolution in this draft:** §2.1 names both conventions as valid and says "pick one and stick with it." Examples throughout the doc lean toward `tests/` (Dockbloxx) because that's what's freshest, but Supabase-specific section 4.1 references the StarkReads patterns where the v1.0 convention applies.

**Question for human review:** should v2.0 prescribe ONE convention canonically, or stay neutral? If prescriptive, which?

#### T2 — Stripe wrapper-mock vs constructor-mock — which to recommend

v1.0 strongly recommends the wrapper pattern (singleton in `src/lib/stripe/stripe.ts`). Dockbloxx doesn't have a wrapper and uses constructor-mock. Both work.

**Resolution in this draft:** §4.3 presents both with a decision tree based on existing import style, then explicitly recommends "if you have control of the codebase, introduce a wrapper" — preserves v1.0's preference while supporting the no-wrapper case.

**Question for human review:** is the soft recommendation strong enough? Or should v2.0 prescribe the wrapper as canonical and treat constructor-mock as a "legacy code" workaround?

#### T3 — `clearMocks` vs `mockReset` — which to recommend

v1.0 uses `clearMocks: true` globally + `jest.clearAllMocks()` in `beforeEach` for belt-and-suspenders. Block 4's Stripe constructor-mock requires `mockReset()` to clear implementations (because each test configures different success/failure responses).

**Resolution in this draft:** §G4 notes the distinction; constructor-mock section uses `mockReset()` explicitly. The simpler `clearMocks` is still recommended for simpler tests.

**Question for human review:** explicit guidance — "use `clearMocks` for happy-path-mostly suites, `mockReset` for suites with varying per-test mock behavior"? Or leave it as "use whichever the situation requires"?

### Decisions I had to make

#### D1 — Where to place "audit-then-add" (Principle 3.4)

Section 3.4 in this draft. Could have lived in §2 (layer-specific) under "Adding tests to existing project," echoing v1.0 §16. Chose §3 (diagnostic principles) because it's a meta-principle that applies across layers, not a unit-test-specific or E2E-specific practice.

#### D2 — How much of v1.0's specifics to repeat verbatim

v1.0 has long code examples (e.g., the `meetsTier` 16-combination test) that are tied to a specific app's domain. Repeating them verbatim in v2.0 makes the doc concrete but app-specific. Generalizing them loses fidelity.

**Resolution in this draft:** kept the `meetsTier` and `safeRedirect` examples in §2.1 verbatim from v1.0 — they're the most generalizable unit-test pattern examples (matrix-style assertions for hierarchy logic; security-style assertions for redirect validation). Replaced the StarkReads-specific integration test example with a more generic shape in §2.2, leaving the Supabase-specific webhook test for §4.1.

#### D3 — Length budget allocation

Target was 1.2–1.5× v1.0 length. v1.0 was ~1000 lines. This draft is ~1100 lines, putting it at the lower end of the target. Could be longer if the human reviewers want more code examples or more case studies, but I erred toward "concise principles up top, deep appendices below" per the structural mandate.

#### D4 — Cross-references vs duplication

Several principles appear in both Part 1 (short form) and Part 3 (full form). E.g., "Environment Drift First" gets a paragraph in 1.5 and a full section in 3.1.

**Resolution in this draft:** Part 1 is the 30-second answer; Part 3 is the deep dive with case study. Cross-references in Part 1 ("See Section 3.1 for the full diagnostic order") to avoid duplicating content.

**Question for human review:** is the cross-referencing too aggressive? Should Part 1 be more self-contained?

#### D5 — What "backend-agnostic" actually means in the principles

Tried to keep Part 1 examples-free and Part 3 with brief illustrations only. Part 4 holds all the implementation specifics.

**Resolution in this draft:** Part 1 mentions backend types neutrally (e.g., "external services," "REST APIs"). Part 3 uses Dockbloxx and StarkReads examples but tags each as illustrative. Part 4 is where the concrete code lives.

### Gaps I noticed

#### G1 — No coverage of testing client-side state stores explicitly

v1.0 doesn't cover Zustand / Redux / TanStack Query testing. Block 2 notes mention Zustand `setState` seeding as a clean primitive. v2.0 mentions it briefly in §2.3 (localStorage + UI dual-verification) but doesn't have a dedicated "testing client-side state stores" section.

**Recommendation:** add a sub-section in §2.1 or a new §4.6 covering Zustand seeding patterns, Redux test stores, TanStack Query mocking. Block 2 notes have material for this.

#### G2 — No coverage of React component testing patterns

v1.0 §15 mentions React Testing Library briefly. Dockbloxx's component tests (e.g., `ApplyCoupon.test.tsx`) use jest.mock for child components, `useCheckoutStore.setState` for store seeding, and `fireEvent`/`waitFor` for interactions. Not a section in this draft.

**Recommendation:** add a §2.1.B sub-section "Component tests with React Testing Library" covering the stub-children pattern, store seeding, and event firing. Block 2 + ApplyCoupon test file have material.

#### G3 — No coverage of CI integration

v1.0 mentions running tests locally; doesn't cover GitHub Actions / CircleCI / Vercel CI integration. Dockbloxx hasn't set up CI yet.

**Recommendation:** add a §7 (or appendix) on CI patterns when the project actually has one. Premature to write before there's a real case study.

#### G4 — No coverage of test coverage metrics

`jest --coverage`, `c8`, codecov integration — none covered. Both v1.0 and Dockbloxx have skipped this.

**Recommendation:** add a §2.1.C on coverage metrics with caveats about the false-confidence trap (coverage measures execution, not assertion quality).

#### G5 — No coverage of fuzzing / property-based testing

Modern alternative to example-based unit tests for pure functions. Could be valuable for things like `validateCoupon` where the input space is large.

**Recommendation:** add as a §2.1.D "When to use property-based testing instead." Out of scope for this synthesis but worth a stub.

### Questions for Tony

#### Q1 — Should the doc include the StarkReads code examples verbatim or only by reference?

v1.0 has them. v2.0 currently keeps the `meetsTier` and `safeRedirect` examples (most generalizable) and replaces the StarkReads webhook test with a generic shape. Should I:
- (a) Keep all v1.0 examples verbatim?
- (b) Strip them to skeletons + reference v1.0 for the full version?
- (c) Re-cast each one to be generic + add Dockbloxx parallel where applicable?

This draft chose (c) for the webhook test and (a) for the simpler examples. Want a consistent rule?

#### Q2 — Naming convention for "Factory" companion docs

Are `SECURITY_FINDINGS.md`, `CLEANUP_BACKLOG.md`, `CHANGELOG.md` the canonical names for the App Factory? Or do you want different naming (e.g., `docs/SECURITY.md`, `docs/CLEANUP.md`)?

Current draft uses these exact names because they match Dockbloxx. Easy to rename if the Factory standard is different.

#### Q3 — How prescriptive should the "when to start" guidance be?

§5.1 (CHANGELOG) says "almost always immediately." §5.2 (SECURITY_FINDINGS) and §5.3 (CLEANUP_BACKLOG) don't have a "when to start" — implicitly "as soon as you have something to put in it."

Should v2.0 prescribe a Factory-standard "every new project starts with all three companion docs as part of the scaffolding"? Or keep it as "create when needed"?

#### Q4 — Should the synthesis notes be removed entirely before promotion, or kept as a historical "v2.0 design rationale" archive?

Tony's spec says "deleted before promoting." Easy to delete. But the design tensions captured here could be useful for future v3.0 synthesis ("why did v2.0 land here?"). Want to keep a separate archived copy somewhere (e.g., `agent_docs/playbook-v2.0-synthesis-notes.md`)?

#### Q5 — Pharma project HIPAA — anything to flag now?

The next project is HIPAA pharma. The current v2.0 doesn't explicitly call out HIPAA-relevant testing patterns (audit trails, PHI sanitization in errors, breach detection). The defensive error message principle (1.8) is the closest analog. Should there be a §4.6 "Testing in regulated environments (HIPAA / SOC2 / PCI)" stub, or wait until the pharma project is underway to write that from real experience?

---

*End of archived synthesis notes.*
