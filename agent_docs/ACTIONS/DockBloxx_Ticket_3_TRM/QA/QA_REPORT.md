# QA REPORT — DockBloxx Ticket 3 TRM (Pole Material)

**Module:** DockBloxx_Ticket_3_TRM · **QA execution seat:** CODY (independent QA execution agent)
**Date:** 2026-09-08 16:36 +08 (08:36 UTC) · **Report status:** Advisory input to the QA Lead — **this is not Gate Q.**

Per `QA_PLAYBOOK.md` §5, every statement below is labeled **EVIDENCE** (direct observation), **INFERENCE**, **CLAIM** (unverified statement), or **GAP** (missing required evidence).

---

## 1. Pinned Specimen Verification — PASS (EVIDENCE)

| Item | Expected | Observed | Verdict |
|---|---|---|---|
| Branch | `qa/product-option-1` | `qa/product-option-1` | ✅ |
| HEAD SHA | `1834f18c95ed589e1a7d07b44c50f3bef91fe070` | exact match (`git rev-parse HEAD`) | ✅ |
| Working tree | — | clean (`git status --porcelain` empty) | ✅ |
| Commit inventory vs Claim Package | 5 src (4 M + 1 A) + 4 test files (A) | identical set (`git show --name-status`); no product code outside claimed scope — `orderTransform.ts`, store, checkout, pricing untouched | ✅ |

No mismatches. Proceeded without escalation.

## 2. QA Environment Verification — PASS (EVIDENCE)

| Item | Result |
|---|---|
| Dev frontend `http://localhost:3000/shop/whos-your-caddie` | HTTP 200; live tree == pinned HEAD (clean tree, dev server serves from disk) |
| Staging backend `https://dockbloxx.mystagingwebsite.com` | HTTP 200; `.env.local` `NEXT_PUBLIC_BACKEND_URL` points at staging, **not** production |
| Production walls | No request of any kind was made to `dbp.dockbloxx.com` or `dockbloxx.com` |
| WC REST credentials | Present in `.env.local`; used read-only (GET only) |
| ACF freshness | Cache-busted GET returned `x-ac: MISS` (fresh edge response), not stale |
| ACF ground truth (Track A) | `metal` = `"Metal"`, `wood` = `"Wood"` — matches CONTRACT FINAL column 1→2 |
| Clean-session ritual | Every browser run used a fresh Playwright context (clean localStorage) — no stale `cart-storage` crossover between AC2/AC3/AC4 runs |
| Order writes | None. QA placed no orders; the two TEST BUY orders (#14893, #14894) were read only |

## 3. AC Grading Table

| ID | Verdict | Basis (one line) |
|---|---|---|
| AC1 | **PASS** (EVIDENCE) | Placement, two buttons, none selected, styling, blue-on-select — all independently observed in-browser |
| AC2 | **PASS** (EVIDENCE) | Exactly one `{name:"Pole Material", value:"Wood"}` in persisted cart after selection |
| AC3 | **PASS** (EVIDENCE) | No selection → exactly one `{name:"Pole Material", value:"Unknown"}` |
| AC4 | **PASS** (EVIDENCE) | `Wood` survives Square→Octagon→Square shape changes and 2"→2.5" size change (wholesale rebuilds); exactly one entry at add time |
| AC5 | **UNTESTED** (GAP) | Admin-display half rests on Director screenshots **not filed** in `examples/` (folder holds only `.gitkeep`); QA has no wp-admin access. See F-1 |
| AC6 | **PASS** (EVIDENCE) | Independent REST readback of #14893: exactly one `{"name":"Pole Material","value":"Metal"}` |
| AC7 | **PASS-PENDING-ADJUDICATION** | REST half independently PASS (`Unknown`, exactly one, #14894); admin-display half is a Director CLAIM with unfiled screenshot. QA Lead to adjudicate whether the Director's admin verification suffices |
| AC8 | **PASS** (EVIDENCE + static) | simple / single-variation / giftcard live-verified absent; complex-variation clause has no live specimen — verified by static reachability (see F-4) |
| AC9 | **PASS** (EVIDENCE) | Price $299.00 + variation_id 3182 identical with/without material; identical to pre-ticket order #14889 (true before/after) |
| AC10 | **PASS** (3 of 4 EVIDENCE, 1 CLAIM) | jest 19/185 ✅, tsc ✅, lock-file untouched ✅ — all independent; production build = Director CLAIM (see F-2) |
| AC11 | **UNTESTED** (by design) | Gate D criterion: Track B not yet run on production; production is outside the QA walls. Expected pending at Gate Q |

## 4. Independent Evidence per AC

Full machine-readable evidence: `QA/browser_acs_result.json`, `QA/readback_orders_result.json`, screenshots in `QA/screenshots/`. Raw evidence for the orders is reproduced verbatim below.

### AC1 — placement, buttons, styling (Playwright, dev :3000 vs staging)
- Heading `Pole Material` present on `whos-your-caddie` (classified `bloxx` in the embedded `product-category-custom` JSON).
- Exactly **2 buttons**, labels `["Metal", "Wood"]` — from ACF text (category JSON `poleMaterials = {metal:"Metal", wood:"Wood"}`).
- **None selected on load**: zero buttons carrying `bg-blue-600`.
- DOM order (y-coordinates, live render): Pole Shape (356) < Pole Size (600) < "Don't see your size?" (712) < **Pole Material (752)** < **Current Price (910)** — matches the Director override: below the *entire* Pole Size block, above Current Price.
- Styling: unselected material button class is character-identical to the unselected Pole Size button base (`px-8 py-4 min-w-[50px] rounded-none text-sm font-medium shadow-sm bg-white text-gray-900 border-2 border-blue-500 hover:bg-gray-100`); selected = `bg-blue-600 text-white`, same as Pole Size.
- Screenshots: `ac1-placement-none-selected.png`, `ac2-wood-selected-blue.png`.

### AC2 — selection writes the cart (Playwright)
Click `Wood` → that button gains `bg-blue-600`, `Metal` does not; Current Price unchanged `$299.00` before/after selection; ADD TO CART → persisted cart (`cart-storage`) contains exactly **one** `Pole Material` entry, value `Wood`:
```
"poleMaterialEntries": [{"name":"Pole Material","value":"Wood"}]
cart item: Who's Your Caddie? | variation_id 3182 | price 299
```

### AC3 — fallback (Playwright, fresh context)
No material clicked, ADD TO CART on defaults (Square / 2") → exactly one entry:
```
{"name": "Pole Material", "value": "Unknown"}
```
alongside unchanged `Pole Shape: Square`, `Pole Size: 2"`, `Version: Unknown`.

### AC4 — survival across wholesale rebuilds (Playwright, fresh context)
Select `Wood` → change shape Square→Octagon → back to Square → change size 2"→2.5" → ADD TO CART. Cart at add time:
```
variation_id 3181 (Square/2.5" — correct shape+size-only matching)
variations: [..., {"name":"Pole Material","value":"Wood"}]  ← exactly one, preserved
```
Static corroboration (specimen code): both wholesale init arrays (`BloxxPricing.tsx` L157–173, L222–239) seed preserve-or-`Unknown`; the three surgical `.map()` write sites (L58/90/111) and the shape-change handler (L398–405, filters only Pole Shape/Pole Size) cannot drop the entry.

### AC5 — admin display of #14893 — **UNTESTED (GAP)**
The QA surface has no wp-admin credentials, and the Director's screenshot (`Pole Material: Metal` admin block) is **not filed** — `examples/` contains only `.gitkeep`. The order-side data is independently confirmed (AC6), but the admin *rendering* claim cannot be turned into a PASS per QA_PLAYBOOK §5 ("never turn a CLAIM into a PASS"). Not a defect — nothing suggests failure; the Director reported the screenshot as taken.

### AC6 — REST readback of #14893 (independent, read-only GET)
```
status: processing | date_created: 2026-09-08T02:06:01
line: Who's Your Caddie? | product_id: 3157 | variation_id: 3184
meta_data[key="variations"].value:
  [{"name":"Pole Shape","value":"Square"},{"name":"Pole Style","value":"square"},
   {"name":"Version","value":"Unknown"},{"name":"Pole Material","value":"Metal"},
   {"name":"Pole Size","value":"4\""}]
Pole Material entries: 1  →  {"name":"Pole Material","value":"Metal"}
```
Identical string to the admin-display claim; exactly one entry. **PASS.**

### AC7 — no-selection TEST BUY #14894 (independent, read-only GET)
```
status: processing | date_created: 2026-09-08T02:19:59
line: Fillet Bloxx | product_id: 12434 | variation_id: 12635
meta_data[key="variations"].value:
  [{"name":"Pole Style","value":"round_octagon"},{"name":"Version","value":"Unknown"},
   {"name":"Pole Material","value":"Unknown"},{"name":"Pole Shape","value":"Octagon"},
   {"name":"Pole Size","value":"4\""}]
Pole Material entries: 1  →  {"name":"Pole Material","value":"Unknown"}
```
REST half **PASS**. Renderer-does-not-filter-`Unknown` corroborated by the pre-ticket `Version: Unknown` row on #14889. Admin-display half = Director CLAIM, screenshot unfiled → **PASS-PENDING-ADJUDICATION**.

### AC8 — expected-ABSENT (Playwright, one fresh context per product)
| Product | Detected type | `poleMaterials` key in JSON | "Pole Material" in body | Headings |
|---|---|---|---|---|
| `carabiner` | simple | absent | none | 0 |
| `huck-bucket` | single-variation | absent | none | 0 |
| `gift-card` | giftcard | absent | none | 0 |
| complex-variation | **no live specimen exists** (all staging variable non-bloxx products have exactly 1 attribute) | — | — | — |
Complex-variation clause covered statically: `BloxxPricingPoleMaterials` is mounted only inside `BloxxPricing`, which `renderPricingModule` renders only for `type === "bloxx"` (`ProductDetails.tsx` L165–176). Unreachable from the complex-variation template. Screenshots: `ac8-*.png`.

### AC9 — price + variation_id parity (Playwright, two fresh contexts + pre-ticket order)
| Run | Material | Displayed price | variation_id | Cart price |
|---|---|---|---|---|
| D1 | Metal selected | $299.00 (before selection) = $299.00 (after) | 3182 | 299 |
| D2 | none | $299.00 | 3182 | 299 |
| Pre-ticket order #14889 (2026-07-30, before this ticket) | n/a | total $299.00 | 3182 | — |

Identical before/after the ticket, with and without material — a true before/after against pre-change production data (the literal "compare against `main`" is satisfied via #14889 since QA may not mutate git to check out `main`). The only delta in the cart item is the added `Pole Material` entry. `calculatePrice` matching is shape+size+version only (specimen code, `BloxxPricing.tsx` calculatePrice) — material is not an input.

### AC10 — suite, typecheck, build, lock file (CLI, pinned tree)
| Check | Command | Result | Nature |
|---|---|---|---|
| Suite | `npx jest --ci` | **19 suites / 185 tests passed**, 0 failures, no retries | EVIDENCE (independent) |
| Typecheck | `npx tsc --noEmit` | exit 0 | EVIDENCE (independent) |
| Lock file | `git log -- package-lock.json` | last touched 2026-05-17 (pre-ticket) — no change | EVIDENCE |
| Production build | — | reported clean by Director 2026-09-08 | **CLAIM** — QA did not run it (see F-2) |

### AC11 — Gate D — UNTESTED (by design)
Production ACF (Track B on production) and promotion have not occurred. This criterion is a Gate D item, outside the permitted QA surface. Expected state at Gate Q; nothing to act on here.

## 5. End-to-End CONTRACT Trace — value `Metal` (EVIDENCE at every reachable hop)

| CONTRACT FINAL column | Expected | Observed | Source |
|---|---|---|---|
| ACF field (WP) / REST key | `metal` | `metal` = `"Metal"` | cache-busted GET, `x-ac: MISS` |
| Service reader | `data.acf.metal` | `fetchPoleMaterials()` returns `data?.acf?.metal` verbatim, `""` fallback | specimen code, `productServices.ts` L1210+ |
| Category JSON | `poleMaterials.metal` | `{"metal":"Metal","wood":"Wood"}` in live `#product-category-custom` | Playwright, live page |
| Component reader / label | `Metal` | button labeled `Metal` | Playwright, live DOM |
| Cart entry | `{name:"Pole Material", value:"Metal"}` | exactly one such entry after selecting Metal | Playwright Run D1 |
| Order meta | `{"name":"Pole Material","value":"Metal"}` | exactly one, in `meta_data[key="variations"].value` of order #14893 | independent REST readback |
| Admin line | `Pole Material: Metal` | Director screenshot reported PASS; **artifact not filed** | CLAIM |

Writer and reader strings are IDENTICAL at every hop — the identity rule holds. The only CLAIM in the chain is the final admin line (F-1). The `Wood` row follows the same pipe (AC2 evidence: `{"name":"Pole Material","value":"Wood"}`); the `Unknown` row is evidenced end-to-end at AC3 (cart) and #14894 (order).

## 6. Regression Results
- **Automated:** 19 suites / 185 tests green on the pinned tree (includes the original 15/166 untouched + 4 new suites). No assertion weakening, no retries.
- **Existing Pole Shape / Pole Size behavior (mission item 10):** live-browser exercise shows correct variation resolution and filtering — Square/2"→3182, Square/2.5"→3181, Square/4"→3184 (#14893), Octagon/4"→4000 pattern confirmed by #14894's Fillet Bloxx 12635 for its own product; shape change correctly refilters sizes; price recalculation fires on shape/size/version changes ($299 held for 2", correct recompute for 2.5"). Pole Shape/Pole Style/Pole Size/Version entries present and shaped exactly as in pre-ticket order #14889.
- **Cart separation (mission item 6):** adding Wood then Metal for the same product/shape/size produces **2 distinct line items** with the same variation_id 3182 — no silent merge (CONTRACT consumer-assumption confirmed independently).
- **No residue:** QA created no staging orders; QA artifacts confined to `QA/` (2 scripts, 2 result JSONs, 6 screenshots); no product code touched.

## 7. Findings

| ID | Severity | Classification | Description |
|---|---|---|---|
| F-1 | Medium (evidence gap — **not** an implementation defect) | (c) environment/evidence | Director's admin screenshots for #14893 and #14894 are not filed in `examples/` (only `.gitkeep`), though QA_HANDOFF_INDEX §5 lists them as the AC5/AC7 admin evidence. QA cannot reach wp-admin to substitute. |
| F-2 | Low | (c) environment | Production build is Director-machine-only evidence; QA could not run `next build` without stopping the Director's live dev server (outside the QA lane). AC10's build sub-item remains a CLAIM. |
| F-3 | Low | (b) doc/spec discrepancy | Recon narrative claims a 27-product bloxx scope; the live catalog has 39 published products carrying both `Pole Shape`+`Pole Size` attributes. `detectProductCategory` is the authority and the mounting is uniform per classification, so there is no behavior risk — but the recon number is stale or derived differently. |
| F-4 | Low | (b) spec vs environment | AC8's complex-variation clause has no live specimen on staging (every non-bloxx variable product has exactly one attribute). Verified by static reachability only. |
| F-5 | Info (out-of-scope) | (d) adjacent, pre-existing | Order #14894 meta carries `Pole Style: round_octagon` (style reaches orders via the wholesale init arrays, not the state-only Pole Style handler — the known cart-write gap family in `CLEANUP_BACKLOG`). Noted per instructions; **not reopened**. |

No implementation defects (class (a)) were found. No security, data-integrity, or financial-risk behavior was altered by the ticket (no pricing/matching/checkout paths touched, confirmed by commit inventory + `calculatePrice` reading).

## 8. Contract/Spec Discrepancies Requiring Adjudication
1. **AC5 + AC7 admin-display halves (F-1):** The QA Lead must either (i) accept the Director's admin verification as sufficient Gate Q evidence, or (ii) require the two screenshots be filed in `examples/` before Gate Q. The REST halves are independently verified either way.
2. **AC10 production build (F-2):** accept Director-run build evidence, or schedule an independent build after the QA/dev server conflict window.
3. **Scope count (F-3):** cosmetic; the Architect may wish to correct the recon narrative so future QA passes don't re-flag it.
4. None of the eleven ACs conflicts with prior accepted behavior or rulings — no reinterpretation of the contract was needed or performed.

## 9. Recommendation to the QA Lead (ADVISORY ONLY — QA does not issue Gate Q)

> **READY FOR GATE Q** — subject to adjudication of the two evidence gaps above.

Rationale: every acceptance criterion reachable on the permitted QA surface was independently verified and PASSED (AC1–AC4, AC6, AC8, AC9, AC10-3-of-4), the full CONTRACT key-identity trace holds for `Metal`/`Wood`/`Unknown`, regression is green (19/185) with existing Pole Shape/Size behavior intact, and no implementation defects were found. The outstanding items are evidence-filed-ness (F-1, F-2), not product behavior. The QA Lead should rule on the admin-display evidence (item 8.1) before issuing the Gate Q verdict; AC11 remains open by design until Track B + promotion, when Gate D applies.

---

### QA evidence artifact manifest (all under `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/QA/`)
| File | Contents |
|---|---|
| `readback_orders.py` | Read-only REST readback script (orders #14893, #14894) |
| `readback_orders_result.json` | Verbatim REST responses (orders captured 08:3x UTC) |
| `browser_acs.cjs` | Playwright verification harness (fresh-context ritual) |
| `browser_acs_result.json` | Machine-readable results for AC1–AC4, AC8, AC9, separation, category JSON |
| `screenshots/ac1-placement-none-selected.png` | Placement + none-selected |
| `screenshots/ac2-wood-selected-blue.png` | Wood selected → blue |
| `screenshots/ac4-wood-survives-shape-size.png` | AC4 end state |
| `screenshots/ac8-{carabiner,huck-bucket,gift-card}.png` | Non-bloxx absence |

*Staging readbacks additionally consulted read-only: order #14889 (pre-ticket reference), ACF options endpoint (cache-busted), WC product catalog (template classification).*