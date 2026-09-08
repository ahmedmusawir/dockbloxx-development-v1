# templates/ACCEPTANCE_SPEC.md — DockBloxx Ticket 3 (the QA contract)

<!-- ENGINEER: derive every AC from the ticket DoD (CLAUDE.md §2) + CONTRACT (FINAL) —
never from the implementation. Rows below are pre-shaped from the DoD; refine wording,
never the intent. AC numbering per Factory Module Identity & QA Handoff doctrine. -->

**Module:** DockBloxx_Ticket_3_TRM · **Contract status:** FINAL — locked 2026-09-08 13:31 (lock trail rows: Track B literals `Metal`/`Wood`; GAP-4 text-not-key; GAP-5 separate reader; GAP-6 seed both init arrays; Director placement override; Step 6 no-merge evidence) · **Derived from:** CLAUDE.md §2 DoD (v1.1) + CONTRACT.md FINAL — not from the implementation
**Source-of-truth order applies** (QA_PLAYBOOK §5).

### Traceability matrix
| ID | Acceptance criterion | Evidence type | Environment | WHO | Status |
|---|---|---|---|---|---|
| AC1 | On a bloxx product page, "Pole Material" group renders BELOW the entire Pole Size block (after "Don't see your size?" and the custom size input) and immediately above the Current Price box, with exactly two bordered buttons labeled with the ACF `metal` / `wood` text, styled like the Pole Size buttons; none selected on load; selected one turns blue | screenshot | dev FE vs staging | Director | Pending |
| AC2 | Selecting a material writes exactly one `{name:"Pole Material", value}` entry to the cart item; visible in cart state / cart page | devtools / cart UI | dev FE | Director + agent | Pending |
| AC3 | With no selection, cart item carries `Pole Material: Unknown` | devtools / cart UI | dev FE | Director | Pending |
| AC4 | Select Wood → change Pole Shape → change Pole Size → Pole Material still `Wood` (regression against wholesale rebuilds) | devtools / cart UI | dev FE | Director | Pending |
| AC5 | TEST BUY (`whos-your-caddie`, product 3157; executed as Square / 4" / **Metal** — Director's choice, literal differs from the Wood example, pipe identical) → staging admin order line shows `Pole Material: Metal` in the nested block with Pole Style | screenshot + order id | staging WP admin | Director | **PASS (Director, order #14893 confirmed, screenshot)** |
| AC6 | WC REST readback of that order: `line_items[].meta_data[key="variations"].value[]` contains `{name:"Pole Material", value:"Metal"}` — identical string to the admin display | CLI readback | staging REST | agent | **Engineer pre-check PASS on #14893** (QA to re-verify) |
| AC7 | TEST BUY with no selection → admin shows `Pole Material: Unknown` as a visible row (renderer does not filter `Unknown`, per #14889 `Version: Unknown`); REST matches | screenshot + CLI | staging | Director + agent | **PASS — order #14894** (Director TEST BUY, Fillet Bloxx, Octagon / 4", no selection): admin block shows `Pole Material: Unknown` (Director screenshot in `examples/`); REST readback carries exactly one `{"name":"Pole Material","value":"Unknown"}` (Engineer). Earlier waiver withdrawn. |
| AC8 | Expected-ABSENT: simple / single-variation / complex-variation / giftcard product pages render no Pole Material group | screenshot | dev FE | Director | Pending |
| AC9 | Expected-UNCHANGED: for the same Shape / Size / Version, Current Price and `variation_id` are identical before and after (compare against `main`) | devtools / diff | dev FE | agent | Pending |
| AC10 | Suite green; typecheck + production build clean; no lock-file change (or full build if any) | CLI | local | agent | Pending |
| AC11 | Gate D: after promotion, production ACF options carry `metal` / `wood` (Track B) and the live product page renders the group; post-deploy smoke is capture-only, no real-money purchase required beyond Director's standard sanity transaction | screenshot | prod FE | Director | Pending |

### Environment notes for QA (module rituals)
- Clean-session ritual every landing test (clear site data / fresh incognito, ALL
  incognito windows closed first); Zustand cart persisted state must be cleared between
  AC2/AC3/AC4 runs or a stale `Pole Material` will masquerade as a pass.
- One session = one artifact set — one TEST BUY = one order id = one REST readback.
- TEST BUY naming convention per TESTING_PLAYBOOK; staging backend only.
- Track B precondition: ACF text values present on the backend under test. Pressable edge cache (`x-ac`) can serve the options endpoint stale for minutes; cache-bust (`?_nocache=<ts>`) before asserting a fresh ACF value.
- Product page reads ACF with `revalidate: 60`; allow ≥ 60 s after any ACF change before a page-level assertion.

### Explicit GAPs (untestable criteria + compensating evidence)
- WP-side renderer (GAP-2): AC5 is the only proof; if AC5 fails while AC6 passes, route
  per GUARDRAILS 7 and record the Director's decision here.
- Production build (part of AC10): run clean by the Director on 2026-09-08 (Engineer could not run it — dev server held `.next`).

### Out-of-scope (protected — findings route as follow-ups, not reopeners)
- Pole Style cart-write gap; duplicated init effects; cart merge by `variation_id`
  (unless Step 6 chose to change it); emails; GA4/GTM; WooCommerce attributes; PHP.
