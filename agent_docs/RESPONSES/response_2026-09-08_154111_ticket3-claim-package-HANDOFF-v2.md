# CLAIM PACKAGE — DockBloxx Ticket 3 TRM (Pole Material) — handoff to QA Lead

**This is a CLAIM (QA_PLAYBOOK §6), not a verdict.** Engineer: Claudy. Director: Tony. Date: 2026-09-08 14:42 +08.

### Module ID
DockBloxx_Ticket_3_TRM · repo `dockbloxx-development-v1` · branch `product-option-1` (HEAD 9b395a3 + uncommitted working tree) · backend `dockbloxx.mystagingwebsite.com`

### Accepted scope (DoD, CLAUDE.md §2 v1.1)
Pole Material (Metal / Wood) option on every `bloxx` product page, placed below the Pole Size block and above Current Price (Director override 2026-09-08), two bordered buttons styled like Pole Size, none selected on load; selection written to `cartItem.variations` as exactly one `{name:"Pole Material", value}`, `Unknown` when unselected; carried unchanged by the existing order pipe to the WooCommerce order's nested `variations` meta block; price and `variation_id` unchanged; non-bloxx templates unchanged.
**Out of scope (protected):** WC attributes/variations; WP/PHP/ACF edits; pricing/matching; checkout/Stripe/shipping/coupons; emails; GA4/GTM; Custom Size flow; Pole Style cart-write gap; duplicated init effects.

### Acceptance Spec
`templates/ACCEPTANCE_SPEC.md` — AC1–AC11, derived from DoD + CONTRACT FINAL.

### Files changed (working tree, uncommitted — Director commits)
src/app/(public)/shop/[slug]/page.tsx              |  8 ++++-
.../shop/product-page/variations/BloxxPricing.tsx  | 35 ++++++++++++++++++
src/services/productServices.ts                    | 42 +++++++++++++++++++++-
src/types/product.ts                               |  7 ++++
4 files changed, 90 insertions(+), 2 deletions(-)
  NEW  src/components/shop/product-page/variations/BloxxPricingPoleMaterials.tsx
  NEW  tests/components/shop/
  NEW  tests/services/
  NEW  tests/store/useCartStore.poleMaterial.test.ts
Docs: `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/*` (CLAUDE.md v1.1, templates filled, CLAIM_PACKAGE.md), `agent_docs/CLEANUP_BACKLOG.md` (new, 10 items), `agent_docs/SESSIONS/session_2026-09-08.md`, `agent_docs/RESPONSES/*ticket3*`, `RECOVERY.md`, `CHANGELOG.md`.

### Behaviour claimed complete
1. `fetchPoleMaterials()` reads `data.acf.metal`/`wood` from the ACF options endpoint (60 s revalidate); missing/empty → `""`; errors never throw.
2. Product page embeds `poleMaterials` in `<script id="product-category-custom">` for bloxx products only.
3. `BloxxPricingPoleMaterials` renders heading + one button per non-empty label, Pole-Size styling, none selected; mounted as last child of `BloxxPricing`.
4. `handleMaterialSelection` writes the cart directly (filter-then-append); both wholesale init arrays seed `Pole Material` as preserve-or-`Unknown`.
5. Downstream renderers and `orderTransform.ts` untouched (generic); cart store untouched (no merge across materials — evidenced).

### Tests added / changed
Added 4 files, +19 tests (component ×6, BloxxPricing integration ×5, store identity ×3, reader ×5). No existing test changed.

### Commands run + results
- `npx tsc --noEmit` → exit 0 (after every step)
- `npx jest --ci` → 19 suites / 185 tests passed (baseline 15 / 166 unchanged)
- `next build` → **clean (Director's machine, 2026-09-08)**; Engineer ran tsc only
- Headless Chromium checks (Playwright 1.59.1) on dev :3000 → see `templates/EVIDENCE_LOG.md` and RESPONSES step3/step4 verification artifacts
- Live read-only GETs: staging ACF options (cache-busted) = `Metal`/`Wood`; staging order #14889 REST shape; WC catalog (27 bloxx products)

### Manual checks performed (Engineer, headless — not Director QA)
Happy path, no-selection fallback, persistence across shape/size, switch-replaces, price/`variation_id` parity with and without material, non-bloxx absence, two-materials-two-lines.

### Known limitations
- **TEST BUY performed by the Director:** staging order **#14893**, `whos-your-caddie`, Square / 4" / **Metal** (not Wood — same pipe, different literal). Admin block shows `Pole Material: Metal` (Director screenshot, AC5). REST readback shows exactly one `{"name":"Pole Material","value":"Metal"}` (AC6, Engineer). Order id confirmed by the Director.
- **Second TEST BUY, AC7:** staging order **#14894**, Fillet Bloxx, Octagon / 4", no material selected. Admin block shows `Pole Material: Unknown` (Director screenshot, to be filed in `examples/`). REST readback shows exactly one `{"name":"Pole Material","value":"Unknown"}` (Engineer). **AC7 PASS.**
- **Production build:** run clean by the Director on his machine; Engineer did not run it.
- WP-side renderer (GAP-2): **closed** by #14893.
- Production ACF lacks the keys until Track B runs there → group hidden on prod until then (by design).

### Environment / setup requirements (module rituals)
Clean session per landing test (clear site data / fresh incognito, all incognito windows closed first); Zustand `cart-storage` cleared between AC2/AC3/AC4 runs; one session = one order id = one REST readback; TEST BUY naming per TESTING_PLAYBOOK; staging only — never `dbp.dockbloxx.com`; Track B values present on the backend under test; allow ≥ 60 s / cache-bust after any ACF change.

### Migrations / env changes
None. No new dependencies. No lock-file change.

### Rollback
Revert the Ticket 3 commit(s); no data migration. Orders already placed keep their `Pole Material` meta entry (harmless data).

### Open risks / follow-ups
`agent_docs/CLEANUP_BACKLOG.md` (10 items, report-only): Pole Style state-only handler; duplicated init effects; `makeKey` brace; order-sensitive cart key + pre-deploy carts; console.log; `src/lib/test.ts`; thank-you summary commented out; cart strips show style key; Round `alert()`; DoD example slug.

### Handoff
**HANDED OFF to QA Lead 2026-09-08** per QA_PLAYBOOK: intake → contract extraction → Gate Q (dev repo vs staging) → Gate D after promotion (Track B on production first). Director drives manual steps one test at a time. Engineer pre-checks on AC1–AC4, AC6, AC8–AC10 are claims for QA to re-verify; AC5 and AC7 Director-evidenced (#14893, #14894). **Engineer STOPS here** and resumes only on QA findings routed back (in-scope Critical/High → checkpoint-gated fix).
