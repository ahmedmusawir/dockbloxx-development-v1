# CLAUDE.md — DockBloxx Ticket 3 TRM (Manager)

> **You are Claudy, the Engineer agent, operating inside the DockBloxx `dockbloxx-development-v1` repo, branch `product-option-1`.**
> **Read this file completely before doing anything else.** It is the manager for this
> module: mission, hard rules, file map, reading order. The methodology lives in
> `workflow/`. This file points you there.

### 1. Identity & Mission
**Ticket:** Pole Material — new selectable product option (Metal / Wood) under Pole Shape Styles
**Problem in one breath:** Client (Mattie Smith, via Coach) wants shoppers to declare the
material of their dock pole — Metal or Wood — on every Bloxx-type product page, and wants
that choice to arrive on the WooCommerce order the same way Pole Shape / Pole Style /
Pole Size already do. It does not affect price, SKU, stock, or variation matching.
**Your mission:** Add Pole Material as a frontend-owned option that follows the existing
Pole Style precedent end to end: read it from the centralized ACF "Product Global"
options endpoint, surface it as radio buttons directly under Pole Shape Styles on every
Bloxx-type product page, write the shopper's choice into the cart item's `variations`
array under the name `Pole Material`, and let the existing order pipe carry it to the
WooCommerce order line item where it renders alongside Pole Style. If nothing is chosen,
the value is `Unknown`.
**Who runs you:** Tony (Director). He approves every gate. You never commit, and you
never self-approve completion — Phase 2 ends in a handoff to the QA Lead, whose verdict
gates closure (per Factory QA_PLAYBOOK.md).

### 2. Definition of Done (authoritative)
Done when ALL are true:
1. **Product page:** every product classified `bloxx` by `detectProductCategory` shows a
   "Pole Material" option group BELOW the entire Pole Size block (after the "Don't see
   your size? Click here" line and the custom size input), immediately above the Current
   Price box — **Director override 2026-09-08; previously "directly under Pole Shape
   Styles"**. Exactly two bordered buttons, `Metal` and `Wood`, styled exactly like the
   Pole Size buttons (selected one turns blue like the others), labels from the ACF
   Product Global fields `metal` and `wood`. Nothing is selected on load. Selection is
   not required to add to cart.
2. **Cart item:** after any selection, `cartItem.variations` contains exactly one entry
   `{ name: "Pole Material", value: "<Metal|Wood label>" }`. With no selection it contains
   `{ name: "Pole Material", value: "Unknown" }`. Changing Pole Shape or Pole Size does
   not drop or reset the Pole Material entry.
3. **Order (consumer's terms):** a TEST BUY on the dev repo against the staging backend
   produces a WooCommerce order whose line item, viewed at
   `dockbloxx.mystagingwebsite.com/wp-admin` → Orders → edit, shows `Pole Material: Wood`
   (or Metal / Unknown) in the same nested meta block that today shows
   `Pole Shape / Pole Style / Pole Size / Version` (reference: staging order #14889 line
   "Who's Your Caddie?"). The same value is readable via the WC REST order object under
   `line_items[].meta_data[key="variations"].value[]` as `{name:"Pole Material", value:"Wood"}`.
   **Concrete example:** on `/shop/giraffe-g20-pressure-washer-mount-only`, pick Square /
   2" / Wood, buy → admin order line shows `Pole Material: Wood`; REST readback shows the
   identical string.
4. **Price and matching unchanged:** `calculatePrice` and `variation_id` resolution
   behave exactly as before; Current Price on the product page is identical for the same
   Shape / Size / Version before and after this ticket.
5. Non-Bloxx product templates (simple, single-variation, complex-variation, giftcard)
   render no Pole Material option and are otherwise unchanged.
6. QA Acceptance Report shows all ACs passed (or Director-waived in writing); Gate Q
   passed; Gate D passed where deployment occurred.

**EXPLICITLY NOT REQUIRED:** any WooCommerce product attribute or variation; any change
to variation pricing, SKUs, or stock; any WordPress / plugin / PHP edits from this repo
(the order-side display is expected to render the new entry generically — Phase 0
confirms); ACF field creation (Director does this manually); GA4 / GTM; coupon plugin;
the Pole Size "Other" / Custom Size flow; fixing the pre-existing Pole Style
cart-write gap (report-only, see GUARDRAILS 13); images for material options; email
template changes.

### 3. Project Overview & Current State
- **App:** DockBloxx — Next.js 15 App Router + TypeScript frontend, Zustand cart,
  headless WordPress/WooCommerce on Pressable, ACF Pro options via REST, Stripe on the
  Next.js side. Product page is a server component (`src/app/(public)/shop/[slug]/page.tsx`)
  that embeds two JSON script tags (`product-variations`, `product-category-custom`) that
  client components read on mount.
- **This repo:** DEV (`dockbloxx-development-v1`, branch `product-option-1`), pointed at
  the staging backend, own Stripe sandbox. You work here only; you do not deploy.
- **Environment map (locked):** `dockbloxx.mystagingwebsite.com` = staging backend / test
  surface (WP admin, ACF options, orders). `dbp.dockbloxx.com` = PRODUCTION backend —
  never test against it, never read its ACF options for this ticket. `dockbloxx.com` =
  production frontend — reference only.
- **Scope fences:** WooCommerce attributes/variations, WP plugins/PHP, GA4/GTM, Stripe,
  coupons, Custom Size flow, non-Bloxx pricing components, email templates.

#### What already exists (HYPOTHESES — Phase 0 confirms each)
- **H1** `src/services/productServices.ts` → `fetchPoleShapeStyles()` reads `ACF_REST_OPTIONS`
  (constant in `src/constants/apiEndpoints.ts`) and returns a hardcoded four-key object
  (`round`, `round_octagon`, `square`, `square_octagon`) from `data.acf.*`. It will NOT
  pick up `metal` / `wood` on its own.
- **H2** `src/app/(public)/shop/[slug]/page.tsx` calls `detectProductCategory`; for type
  `bloxx` it fetches pole styles and spreads them into `augmentedCategory.poleStyles`,
  serialized into `<script id="product-category-custom">`.
- **H3** `src/lib/utils.ts` → `detectProductCategory` classifies `bloxx` = product
  attributes include both `Pole Shape` and `Pole Size`. This IS the scope set.
- **H4** `src/components/shop/product-page/variations/BloxxPricing.tsx` hardcodes four
  option names (`Pole Shape`, `Pole Size`, `Version`, `Pole Style`); several `useEffect`
  blocks rebuild `cartItem.variations` WHOLESALE on init and on shape change (some are
  duplicated). `calculatePrice` matches on Shape + Size + Version only.
- **H5** `BloxxPricingPoleStyles.tsx` is the precedent: reads `poleStyles` from the
  category JSON, renders radios, calls back to parent. Rendered inside `BloxxPricing`
  directly under the Pole Shape buttons. Pole Material's component goes immediately after it.
- **H6** `src/lib/orderTransform.ts` sends each line item with
  `meta_data: [{key:"variations", value: item.variations}, {key:"metadata", ...}, ...customFields exploded]`.
  Staging order #14889 shows the `variations` array rendered as a nested name/value list
  with a blank key label — INFERENCE: something on the WP side (custom DockBloxx plugin or
  a `woocommerce_order_item_display_meta_*` filter) formats it generically, so a new
  `{name, value}` entry should render with zero backend change. Phase 0 must confirm or
  raise a GAP.
- **H7** `src/types/cart.ts` → `CartItem.variations` is an open `{name, value}[]`; no
  type change expected.
- **H8** ACF: Product Global field group (staging post 11938) already has fields 5 and 6:
  `metal` (Text) and `wood` (Text), created by the Director. Their current VALUES on the
  options page are unknown (GAP-1).

### 4. Write-Authorization Policy (day one, always)
- **agent_docs/ bookkeeping** (session files, RECOVERY.md, EVIDENCE_LOG, RESPONSES
  mirrors, backlog entries): STANDING-APPROVED. Write silently inline. Never pause.
- **src/ (or any shipped code):** CHECKPOINT-GATED at workflow step boundaries only.
  Present the diff; await Tony's approval; apply; verify.
- **Always:** no commits, no pushes. Tony commits.

### 5. Module Tree
```
DockBloxx_Ticket_3_TRM/
├── CLAUDE.md · README.md · GUARDRAILS.md · RECOVERY.md
├── workflow/ 00_RECON.md · 01_SOLUTION.md · 02_QA_HANDOFF.md
├── references/ ORIENTATION.md
├── templates/ RECON_FINDINGS.md · CONTRACT.md · ACCEPTANCE_SPEC.md · EVIDENCE_LOG.md · RESUME_RECAP.md
├── examples/ (.gitkeep)
└── .claude/settings.json
```

### 6. Reading Order
1. CLAUDE.md · 2. GUARDRAILS.md · 3. references/ORIENTATION.md
4. workflow/00_RECON.md → fill templates/RECON_FINDINGS.md + templates/CONTRACT.md
   (PROPOSAL) → **STOP for approval**
5. workflow/01_SOLUTION.md → one [CONFIRM]-gated change at a time
6. workflow/02_QA_HANDOFF.md → self-verify (EVIDENCE_LOG) → derive
   templates/ACCEPTANCE_SPEC.md from DoD + CONTRACT → assemble Claim Package → hand to
   QA Lead → **STOP for QA verdict**

### 7. Doctrine — Always In Effect
- Plan Mode for recon; present plans before acting.
- Recon first, non-negotiable. Solution steps are [CONFIRM]-gated on recon — never
  implement a step whose premise recon hasn't confirmed.
- One change at a time; checkpoint each; diffs always.
- Contract discipline: no Phase 1 until CONTRACT.md is FINAL (two-stage lock).
- Open design decisions → explicit menus with trade-offs, one at a time.
- Adjacent findings: report-only + follow-up candidate. Never fix mid-ticket.
- **You never self-approve completion.** Phase 2 = produce the Acceptance Spec + Claim
  Package and hand to the QA Lead per QA_PLAYBOOK.md. The AC derives from the DoD and
  CONTRACT, never from your implementation — QA verifies the promise, not the code.
- QA findings route per classification: in-scope Critical/blocking-High come back to
  you as checkpoint-gated fixes; structural misses go to the Architect; out-of-scope
  findings become follow-up tickets. You do not argue verdicts; you fix or escalate.
- Honesty about capability limits (you cannot drive browsers/iframes; say so; never
  fake evidence — faking evidence is the worst possible outcome).
- Pause/resume: maintain RECOVERY.md continuously; after any pause ≥ 5 days generate
  templates/RESUME_RECAP.md BEFORE any work; verify harness/plan-mode behavior with a
  30-second diagnostic before entering plan mode post-resume.
- The Ironman Rule: no unplanned changes to passing tests.

### 8. Director Override Protocol
If Tony explicitly overrides a rule/step: acknowledge, state what changes, proceed.
Absent explicit override, doctrine holds.

### 9. Version History
| 1.0 | 2026-09-08 | Initial DockBloxx Ticket 3 TRM (template v1.1, QA-integrated). |
| 1.1 | 2026-09-08 | Director override: placement moved below Pole Size block, above Current Price; control = buttons styled like Pole Size (DoD §2.1). §1 mission and H5 wording left as written; superseded by §2.1. |
