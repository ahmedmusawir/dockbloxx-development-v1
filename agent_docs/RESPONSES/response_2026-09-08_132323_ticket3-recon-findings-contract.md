# Ticket 3 TRM — Phase 0 Recon Output (RECON_FINDINGS + CONTRACT PROPOSAL)

**Context.** Client wants a Pole Material (Metal / Wood) option on every Bloxx product page, carried to the WooCommerce order the way Pole Style is. Phase 0 establishes the true current state before any code changes. This document IS the filled `templates/RECON_FINDINGS.md` and `templates/CONTRACT.md` (PROPOSAL). Plan Mode restricts writes to this file, so on approval I copy Part 1 and Part 2 verbatim into those two template files, plus the RESPONSES mirror and session log. **No `src/` edits are proposed at this gate.**

Baseline: branch `product-option-1`, `npm test` = 15 suites / 166 tests passing (2026-09-08 13:30). Working tree dirty with docs only; no `src/` changes.

---

# PART 1 — RECON_FINDINGS.md

### Headline answers

**1. Does staging ACF options expose `metal` / `wood`, with what values?**
**NO. Both keys are ABSENT** (not empty). EVIDENCE: live GET `https://dockbloxx.mystagingwebsite.com/wp-json/acf/v3/options/options` → HTTP 200, `acf` object has 22 keys: `address, coach_attribution_scripts_footer, email, faqs, flat_rate_*, is_free_shipping_for_local_pickup, local_pickup_zipcodes, map, phone, reviews, round, round_octagon, square, square_octagon, tracking_scripts_body, tracking_scripts_header`. Neither `metal` nor `wood` appears. → **GAP-1 (BLOCKING for QA, not for Phase 1 code)**. Side fact: the four existing pole-style values are **image URLs** (e.g. `…/uploads/Squre.png`), not text. Pole Material will be the first *text* option on this pipe.

**2. Is the nested `variations` block on the WP order rendered generically?**
REST shape CONFIRMED; renderer still INFERENCE. EVIDENCE: staging order #14889 (product 3157 "Who's Your Caddie?", variation_id 3182) line item `meta_data` id 43179: `key="variations"`, `display_key="variations"`, `value=[{"name":"Pole Shape","value":"Square"},{"name":"Pole Style","value":"square"},{"name":"Pole Size","value":"2\""},{"name":"Version","value":"Unknown"}]`. Plain `{name,value}[]`, nothing else in the entry. Adjacent entries: `pole-shape`/`pa_pole-size` (WC-native attribute meta), `metadata` (`[]`), `_reduced_stock`. INFERENCE: WooCommerce core's `get_formatted_meta_data()` skips non-scalar values, so a nested list on the admin screen implies a site-specific formatter that iterates the array. Supporting EVIDENCE: `/wp-json/` index lists a custom `dockbloxx/v1` namespace (route `/product-videos`) → a DockBloxx plugin is installed on staging. Note the REST `display_key` is `variations`, not blank; the blank label in the screenshot is therefore produced by that renderer. → **GAP-2 stays open; TEST BUY is the proof.** Also note `Version: Unknown` IS present in the stored array, so whatever renders it either shows "Unknown" or filters it — Director's screenshot answers which.

**3. Which code paths rebuild `cartItem.variations` WHOLESALE, and would each drop Pole Material?**
Exactly **two**, both in `src/components/shop/product-page/variations/BloxxPricing.tsx`, both `useEffect(…, [variations])` init effects that fire once after the variations JSON is parsed on mount:
- L153–163 (inside effect L116–166): assigns `[Pole Shape, Pole Style, Pole Size]`. Would drop.
- L212–223 (inside effect L169–226): assigns `[Pole Shape, Pole Style, Pole Size, Version]`. Would drop. Declared later → runs later → **this one wins**; final init state is its 4-entry array.
Every other write is SURGICAL and preserves unknown names (full table in §D). Practical consequence: the wholesale sites run *before* any user interaction, so the real risk is not "dropping a selection" but **never seeding `Unknown`**. After init, a user's Pole Material pick survives shape/size/version changes because `handleShapeSelection` (L382–395) filters only `Pole Shape`/`Pole Size` and the three sync effects use `.map`.

**4. Cart / checkout / confirmation renderers: GENERIC or HARDCODED?**
All GENERIC. Each iterates the array, drops entries whose value is `Unknown`, and prints **values only** joined by ` · ` (names are never shown):
- `src/components/cart/CartSlide.tsx` L122–125
- `src/components/cart/cart-page/CartItems.tsx` L143–146
- `src/components/checkout/right-pane/CheckoutCartItems.tsx` L41–44
- `src/app/(public)/thankyou/ThankyouPageContent.tsx` L137–140 — **commented out**, renders nothing.
No email/webhook rendering of `variations` exists in this repo. Consequence: a shopper will see `Square · square · 2" · Wood` in cart strips; `Unknown` is hidden. No code change needed for DoD.

**5. Does the Zustand cart merge items with identical `variation_id` regardless of `variations`?**
**NO.** Merge key = `${id}::${JSON.stringify(variations)}::${JSON.stringify(customFields)}` — `variation_id` is not part of it. EVIDENCE: `src/store/useCartStore.ts` L90–93 (`setOrReplaceCartItemQuantity`, the one `ProductDetails.handleAddToCart` L92/L122 calls), same key at L60–63, L114–117, L130–133. Square/2"/Wood and Square/2"/Metal → different keys → **two line items**. → **GAP-3 does not apply; closed by evidence.** Two side notes (report-only): (a) key is order-sensitive because it stringifies the array; (b) adding a Pole Material entry changes the key for every bloxx item, so carts persisted in `localStorage` before deploy will not merge with post-deploy adds of the "same" item. Cosmetic.

**6. Exact insertion point under Pole Shape Styles.**
`src/components/shop/product-page/variations/BloxxPricing.tsx` **L485–492** is the `<div className="mb-5">` wrapping `<BloxxPricingPoleStyles … />`. The Pole Material component goes **immediately after L492**, before the `{/* Version Options */}` comment at L494. Only `BloxxPricing` renders there; the dispatcher `src/lib/renderPricingModules.tsx` L73–80 mounts `BloxxPricing` solely for `type === "bloxx"`, satisfying GUARDRAILS 14 with no extra gating.

### Hypotheses H1–H8

| H | Verdict | Evidence |
|---|---|---|
| H1 | **CONFIRMED** | `src/services/productServices.ts` L1154–1194: reads `ACF_REST_OPTIONS` (L1157), `next: { revalidate: 60 }` (L1169), returns hardcoded `{round, round_octagon, square, square_octagon}` from `data.acf.*` (L1184–1189), catch → `{}` (L1192). Will not surface `metal`/`wood`. Return type `Record<string,string>` (L1155). |
| H2 | **CONFIRMED** | `src/app/(public)/shop/[slug]/page.tsx` L109 `detectProductCategory`, L112–113 fetches pole styles only when `type === "bloxx"`, L116–119 spreads `poleStyles` into `augmentedCategory`, L133–139 serializes it into `<script id="product-category-custom">`. |
| H3 | **CONFIRMED** | `src/lib/utils.ts` L233–247: bloxx = attributes include both `Pole Shape` and `Pole Size`. Note evaluation order: giftcard (L210) → simple/no variations (L217) → single-variation when `variations[0].attributes.length === 1` (L222–231) → bloxx (L233) → complex (L249). Scope set = 27 slugs (§C). |
| H4 | **CONFIRMED** | Names hardcoded throughout `BloxxPricing.tsx`; two duplicated wholesale init effects L116–166 and L169–226; `calculatePrice` L306–351 matches Shape + Size + (Version if present) only and writes `variation_id`/`basePrice`/`price` without touching `variations` (L345–350). |
| H5 | **CONFIRMED, with a caveat** | `BloxxPricingPoleStyles.tsx` L24–32 reads `data.poleStyles` from the category JSON, L60–69 radios (`name="poleStyle"`, `value={key}`), L67 `onSelectionChange(key)` reports the **ACF key** (`square`), not a label; L71 renders `<img src={imageUrl}>`. Mounted at `BloxxPricing.tsx` L486–491. **Caveat:** it is image-based and shape-filtered (L44–49); Pole Material must be a new text-radio component, not a reuse. |
| H6 | **CONFIRMED (payload) / INFERENCE (renderer)** | `src/lib/orderTransform.ts` L110–120: `meta_data: [{key:"variations", value: item.variations || []}, {key:"metadata", …}, ...customMeta]`. #14889 REST readback matches exactly (headline 2). Renderer: see GAP-2. |
| H7 | **CONFIRMED** | `src/types/cart.ts` L16–19: `variations: Array<{name: string; value: string}>`. No type change needed. |
| H8 | **DENIED at the REST layer** | `acf.metal` / `acf.wood` absent from the live options response (headline 1). Field-group existence (post 11938) cannot be verified from this repo. → GAP-1. |

### A. Branch & environment
- EVIDENCE `git branch --show-current` → `product-option-1`. `git status`: dirty but **docs only** (`CLAUDE.md`, `CHANGELOG.md`, `agent_docs/*` moves into `agent_docs/OLD/`, new `agent_docs/ACTIONS|RESPONSES|SESSIONS`, deleted root file `test`). Zero `src/` modifications.
- EVIDENCE `src/constants/apiEndpoints.ts` L3–4: `WC_REST_URL` and `ACF_REST_OPTIONS` both derive from `getApiUrl()` (`src/lib/utils.ts` L35–40), which reads `NEXT_PUBLIC_BACKEND_URL`. `.env.local` sets that host to `https://dockbloxx.mystagingwebsite.com`. Locked surface confirmed. WC credentials come from `WOOCOM_CONSUMER_KEY/SECRET` (`productServices.ts` L1201–1202); not printed.
- EVIDENCE Node `v22.14.0`, npm `10.9.2`. Runner: Jest 30 (`package.json` L80), `npm test` = `jest`, `jest.config.js` uses ts-jest + jsdom, ignores `/e2e/` (Playwright specs live in `e2e/`). Baseline **15 suites / 166 tests pass**. `TESTING_PLAYBOOK.md` now lives at `agent_docs/OLD/TESTING_PLAYBOOK.md`.

### B. ACF options source
- Reader: H1 row above. Cache 60 s server-side (ISR); the product page is a server component so a Track B change appears within ~60 s plus any page ISR window.
- Live readback: headline 1. `metal`/`wood` **absent**.
- Other consumers of `ACF_REST_OPTIONS`: `src/rest-api/checkout.ts` L16 (`WOOCOM_REST_GET_SHIPPING_OPTIONS`, shipping flat-rate keys) and `src/services/trackingSeoServices.ts` L7–19 (`tracking_scripts_*`, `coach_attribution_scripts_footer`). Both read specific keys; new keys on the options page cannot affect them. INFERENCE: safe.

### C. Product page render path
- Build of `augmentedCategory`: H2 row. Serialized fields for bloxx: `type`, `defaultSelections`, `filtering`, `poleStyles`. A `poleMaterials` key would ride the same spread (L116–119).
- Consumers of `product-category-custom`: `ProductDetails.tsx` L65–71 (only reads `type`), `BloxxPricingPoleStyles.tsx` L24–32 (reads `poleStyles`). Nothing else. EVIDENCE grep.
- Mount chain: `SingleProductContent.tsx` L25 → `ProductDetails.tsx` L165–176 `renderPricingModule(...)` → `renderPricingModules.tsx` L73–80 `<BloxxPricing>`. Option group render order inside `BloxxPricing`: Pole Shape buttons (L465–482) → Pole Shape Styles (L485–492) → Version (L495–519) → Pole Size (L522–561).
- **Bloxx scope set** (EVIDENCE: WC REST `products?status=publish`, 47 products, filter = attributes contain both names AND variations non-empty; approximates the `attributeCount===1` guard, which no bloxx product trips because each has ≥2 attributes): **27 products** —
  `angler-bloxx, banjo-bloxx, beverage-bloxx*, bucket-bloxx, cool-breeze-bloxx, dog-bloxx*, elevate-your-float-bloxx, ez-flag-bloxx, ez-tv-bloxx, fillet-bloxx, fishing-bloxx, hooked-on-bloxx, hose-n-boats, life-saver*, neat-cleat-bloxx*, no-shock-bloxx, oh-ship-bloxx, satellite-bloxx, smash-bloxx, starter-bloxx, sup-bloxx, table-bloxx*, tube-bloxx, ultimate-wash-station, universal-bloxx*, whos-your-caddie, yak-bloxx` (`*` = also has `Version`). Zero products have only one of the two attributes.
- **QUESTION-5:** the DoD's concrete example slug `giraffe-g20-pressure-washer-mount-only` is **not in the staging published catalog**. Recommend `whos-your-caddie` (product 3157, the #14889 reference) as the TEST BUY product.

### D. Cart write path
Owner of `cartItem`: `ProductDetails.tsx` L37–52 (`useState<CartItem>`, initial `variations: []`); L57–61 and L75–79 spread `prev` (preserve). Add-to-cart: L90–138 → `setOrReplaceCartItemQuantity(itemToStore)` (L122).

| # | Site | file:line | Kind | Pole Material survives? |
|---|---|---|---|---|
| 1 | Init effect A `[variations]` | `BloxxPricing.tsx` L153–163 | **WHOLESALE** (3 entries) | No — not seeded |
| 2 | Init effect B `[variations]` | L212–223 | **WHOLESALE** (4 entries; runs after #1, wins) | No — not seeded |
| 3 | Size sync `[selectedShape, filteredSizes]` | L52–59 | SURGICAL `.map` on `Pole Size` | Yes |
| 4 | Style sync `[selectedShape]` | L84–94 | SURGICAL `.map` on `Pole Style` | Yes |
| 5 | Version sync `[filteredVersions]` | L105–112 | SURGICAL `.map` on `Version` | Yes |
| 6 | `handleShapeSelection` | L382–395 | SURGICAL filter(`Pole Shape`,`Pole Size`)+append | Yes |
| 7 | `handleSizeSelection` | L431–445 | SURGICAL filter(`Pole Size`)+append | Yes |
| 8 | `handleVersionSelection` | L453–459 | SURGICAL filter(`Version`)+append | Yes |
| 9 | `calculatePrice` | L345–350 | does not touch `variations` | n/a |

Precedent for the Pole Material handler: #7 `handleSizeSelection` (filter-then-append). Anti-pattern: `handlePoleStyleChange` L399–401 (state-only, GUARDRAILS 12/13).
Store merge identity: headline 5. `variation_id` is not in the key.

### E. Order pipe & downstream displays
- Payload: `orderTransform.ts` L110–120, single meta row `variations` with the whole array. Unchanged by this ticket (GUARDRAILS 2).

| Renderer | file:line | Kind | Shows |
|---|---|---|---|
| Mini-cart drawer | `CartSlide.tsx` L122–125 | GENERIC | values ≠ `Unknown`, ` · `-joined |
| Cart page | `cart-page/CartItems.tsx` L143–146 | GENERIC | same |
| Checkout right pane | `CheckoutCartItems.tsx` L41–44 | GENERIC | same |
| Thank-you page | `ThankyouPageContent.tsx` L137–140 | commented out | nothing |
| Email / webhook | — | none in repo | — |

- #14889 REST: headline 2. The model Pole Material must match is one more `{ "name": "Pole Material", "value": "Wood" }` element in that same array.
- WP-side renderer: outside repo; GAP-2.

### F. Tests & prior art
- Existing suites touching the pipe: `tests/store/useCartStore.test.ts` (merge identity; L85–102 "adds separate line item for different variations" is the exact precedent for the Wood-vs-Metal assertion), `tests/api/place-order.test.ts` L466–493 (asserts a `variations` meta entry is sent — Ironman guard for `orderTransform`), `tests/components/cart/CartSlide.test.tsx` L83–100 (render precedent), `tests/utils/detectProductCategory.test.ts` (scope predicate). **No test exists for `BloxxPricing`.** Nearest copy target for a new component test: `CartSlide.test.tsx` pattern (RTL + store state) with a `<script id="product-category-custom">` injected into `document.body`.
- Prior art: grep `material|metal|wood` in `src/` + `tests/` → only FAQ copy (`Faq.tsx` L48/77, `ProductFaq.tsx` L50/82) and a static logo alt text (`StaticLogoBlock.tsx` L43/49). **No partial implementation exists.**

### GAPs — with candidate resolutions
- **GAP-1 (BLOCKING for QA/TEST BUY; not for writing code): `metal` / `wood` are ABSENT from the staging ACF REST response.** Candidates: (a) Track B — Director enters `Metal` / `Wood` on staging → Options → Global Product and saves; I re-run the readback. ACF-to-REST typically omits never-saved fields, so absence is consistent with "fields exist, values never saved". (b) If still absent after save: the field group's Location rule may not include the Options page, or the fields sit in a different group; Director checks post 11938's location/rules. (c) Phase 1 code proceeds regardless with the CONTRACT fallback (absent/empty → option omitted, cart still seeds `Unknown`), so only QA is gated on Track B. **Recommend (a) now, (c) in parallel.**
- **GAP-2: WP-side renderer of the nested `variations` block unknown.** Evidence so far: REST value is a plain `{name,value}[]`; `dockbloxx/v1` namespace proves a custom plugin exists; WC core would not render an array meta natively (INFERENCE). Candidates: (a) proceed; TEST BUY proves it (expected outcome); (b) Director supplies the DockBloxx plugin source → I confirm the loop iterates all entries; (c) TEST BUY shows Pole Material missing while REST readback has it → GUARDRAILS 7: stop, report, Director routes as WP-side follow-up. **Recommend (a).**
- **GAP-3: RESOLVED.** Cart does not merge on `variation_id`; Wood and Metal produce separate line items. No action; captured as an Acceptance Spec assertion.
- **GAP-4 (design, needs Director word): precedent stores the ACF KEY, DoD stores the ACF TEXT.** Pole Style writes `square` (the key) to the cart; the DoD and CONTRACT say Pole Material writes the ACF text (`Wood`). The CONTRACT follows the DoD. Candidates: (a) text verbatim (DoD, recommended); (b) key (`wood`) for symmetry with Pole Style — worse for Coach reading the order. **Recommend (a); confirm.**
- **GAP-5 (design menu for Phase 1, no decision needed now): where the reader lives.** (a) extend `fetchPoleShapeStyles()` to also return `metal`/`wood` — mixes image URLs and text in one map and changes a function's return shape; (b) new `fetchPoleMaterials()` in `productServices.ts` returning `{metal, wood}` plus `poleMaterials` key on `augmentedCategory` (what the CONTRACT assumes). **Recommend (b)** — additive, zero change to existing behavior.
- **GAP-6 (design menu for Phase 1): how to seed `Unknown`.** (a) append `{name:"Pole Material", value:"Unknown"}` inside both wholesale init arrays (#1 and #2); (b) one new `useEffect(…, [variations])` declared after L226 that appends the entry if absent — runs after both init effects by declaration order, one site instead of two, but relies on effect ordering. Both satisfy GUARDRAILS 12. Decision deferred to Phase 1 step.

### Adjacent findings (report-only, follow-up candidates)
1. `handlePoleStyleChange` L399–401 is state-only; user picks never reach the cart (expected, GUARDRAILS 13).
2. Duplicated init effects L116–166 and L169–226; plus a third redundant style-sync effect L236–253 that repeats L63–95's switch.
3. `useCartStore.makeKey` has a stray `}` producing `…)}}::…` in three of four copies (L93, L115, L133) but not in `addOrUpdateCartItem` (L63). Harmless today because each function is self-consistent, but the two add paths compute different keys.
4. `BloxxPricingPoleStyles.tsx` L66 leaves a `console.log` in production code.
5. `src/lib/test.ts` is a bare sanity test living under `src/`; Jest picks it up as a 15th suite.
6. Thank-you page variations line is commented out (L137–140).
7. Cart-strip renderers show values only, so the Pole Style key `square` appears as a lowercase bare word next to `Square`.

### QUESTIONS for Tony
1. **GAP-4:** confirm cart/order value is the ACF display text (`Wood`), not the key (`wood`).
2. **Track B status:** have `Metal` / `Wood` been entered on the staging Options page yet? Readback says no keys at all.
3. **GAP-5:** OK to add a separate `fetchPoleMaterials()` reader rather than widening `fetchPoleShapeStyles()`? (Can be decided at the Phase 1 step instead.)
4. **Cart strip:** acceptable that `Wood` shows as a bare value in mini-cart/cart/checkout strips (existing generic behavior), with `Unknown` hidden? DoD does not require a change; I propose none.
5. **TEST BUY product:** the DoD example slug `giraffe-g20-pressure-washer-mount-only` does not exist on staging. Use `whos-your-caddie` (product 3157, matches #14889)?
6. Screenshot of #14889: does the nested block show the `Version: Unknown` row or hide it? (Tells us whether the renderer filters `Unknown`.)

---

# PART 2 — CONTRACT.md (PROPOSAL)

**STATUS: PROPOSAL** — becomes FINAL only after GAP-1 (literal ACF strings) and GAP-4 (text vs key) are answered and folded in. NO PHASE 1 WORK UNTIL FINAL.

### The identity rule (load-bearing)
WRITER column and READER column must be IDENTICAL strings per row. A single mismatch = silent empty values with no error.

### Key map
| Field | ACF field name (WP) | ACF REST key (`data.acf.*`) WRITER→ | Service reader key (`fetchPoleMaterials`) | Category JSON key WRITER→ | Component reader key | Radio value / label | `cartItem.variations` entry (name / value) | Order `meta_data[key="variations"].value[]` entry | Admin display line |
|---|---|---|---|---|---|---|---|---|---|
| Metal option | `metal` | `metal` | `data.acf.metal` | `poleMaterials.metal` | `data.poleMaterials.metal` | value: ACF text verbatim / label: same | `Pole Material` / `<ACF metal text — PENDING GAP-1>` | same object, untouched | `Pole Material: <ACF metal text>` |
| Wood option | `wood` | `wood` | `data.acf.wood` | `poleMaterials.wood` | `data.poleMaterials.wood` | value: ACF text verbatim / label: same | `Pole Material` / `<ACF wood text — PENDING GAP-1>` | same object, untouched | `Pole Material: <ACF wood text>` |
| No selection | — | — | — | — | — | (none checked) | `Pole Material` / `Unknown` | same object | `Pole Material: Unknown` |

Recon evidence per column: REST key layer = live options GET (keys currently absent); service reader = new function modeled on `productServices.ts` L1154–1194; category JSON = `page.tsx` L116–119 spread; component reader = pattern of `BloxxPricingPoleStyles.tsx` L24–32; cart entry = `handleSizeSelection` L431–445 pattern; order entry = `orderTransform.ts` L110–120 (unchanged); admin line = #14889 REST shape.

### Value contracts (enums, formats, fallbacks)
- Accepted cart values: exactly the two ACF text strings, or `Unknown`. No other value is ever written. No normalization; no trimming beyond what ACF returns.
- Absent or empty ACF value (`data.acf.metal`/`wood` missing or `""`) → that option is OMITTED from the UI; the cart still seeds `Unknown`. If both are absent the group renders nothing (mirrors `BloxxPricingPoleStyles` L34).
- `Unknown` is seeded at both WHOLESALE init sites (`BloxxPricing.tsx` L153–163 and L212–223) or by a single post-init seed (GAP-6 menu); the selected value is preserved across shape/size/version changes (sites #3–#8 are surgical — verified in recon).
- Selection handler writes the cart directly: filter out any existing `Pole Material` entry, append the new one (`handleSizeSelection` pattern). Never state-only.
- Exactly ONE `Pole Material` entry exists at any time.
- The `variations` meta entry keeps its current shape: one meta row, key `variations`, value = the full array. Pole Material is one more `{name, value}`; entry order is not contractual.
- Name string is `Pole Material` everywhere it appears (space, title case).
- Radio input `name` attribute: `poleMaterial` (distinct from `poleStyle`). Nothing `checked` by default.
- `variation_id`, `basePrice`, `price` are never touched by any Pole Material code path.

### Consumer-side assumptions (unverified — carried as open QA checks)
- The WP-side renderer iterates every `{name, value}` in the array (GAP-2) — verified only by the TEST BUY. Evidence of a custom DockBloxx plugin exists (`dockbloxx/v1` namespace).
- Coach reads material from the admin order page and/or REST; no email template needs it.
- Cart strips (mini-cart, cart page, checkout) will display the bare value (`Wood`) via existing generic renderers; `Unknown` is filtered. No change proposed.
- Two carts differing only in material are separate line items (store key includes the full `variations` array). Confirmed by evidence; QA asserts it.
- Production ACF options will carry the same two keys/values before Gate D (Track B on production is the Director's).

### External answers folded in (the lock trail)
| Date | Source | Answer | Column(s) updated |
|---|---|---|---|
| 2026-09-08 | Director (Tony) | No price impact; frontend-owned like Pole Style; radios; nothing preselected; unselected = `Unknown`; ACF fields `metal`/`wood` are plain Text; display on WP order nested block like Pole Style | all rows (design lock) |
| 2026-09-08 | Director | Staging = dockbloxx.mystagingwebsite.com; branch `product-option-1`; dev repo only | environment |
| 2026-09-08 | Recon (Engineer) | ACF REST currently lacks `metal`/`wood`; store key is full `variations` array (no merge by `variation_id`); renderers generic; two wholesale init sites | Key map evidence; value contracts; GAP-3 closed |
| — | Director (pending) | Literal ACF strings for `metal`/`wood` (GAP-1) | cart value / admin line columns |
| — | Director (pending) | Text vs key as stored value (GAP-4) | radio value + cart value columns |

### Validation
Engineer self-verification AND independent QA each trace one real value (`Wood`) across ALL columns unchanged; expected-ABSENT fields asserted for the fallback case (`Unknown` present; no second `Pole Material` entry; no change in `variation_id`; Current Price identical before/after for Square / 2" / any Version on `whos-your-caddie`).

---

# What approval means at this gate
- You approve Part 1 (findings) and Part 2 (CONTRACT PROPOSAL) as the recon output.
- On exit I write Part 1 → `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/templates/RECON_FINDINGS.md`, Part 2 → `templates/CONTRACT.md`, mirror to `agent_docs/RESPONSES/`, update session log + ticket `RECOVERY.md` + root `RECOVERY.md`. Bookkeeping only.
- **No `src/` edits.** Phase 1 begins only after you answer GAP-1/GAP-4 and mark the CONTRACT FINAL.
