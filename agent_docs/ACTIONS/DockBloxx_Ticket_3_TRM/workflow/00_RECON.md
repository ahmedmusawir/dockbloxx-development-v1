# workflow/00_RECON.md — Phase 0: Recon (Plan Mode, NO EDITS)

**Goal:** Establish the true current state before touching anything. Fill
`templates/RECON_FINDINGS.md` AND `templates/CONTRACT.md` (as PROPOSAL), then STOP.
**Rules:** Read-only. Label every finding **EVIDENCE** (file:line) / **INFERENCE** /
**CLAIM** / **QUESTION** / **GAP**. Hypotheses H1–H8 live in CLAUDE.md §3; confirm or
deny each with a file:line citation.

### Recon sections

#### A. Branch & environment
- `git status`, `git branch --show-current` (expect `product-option-1`, clean).
- Which env var / constant feeds `ACF_REST_OPTIONS` and `WC_REST_URL`; confirm both
  resolve to `dockbloxx.mystagingwebsite.com`. Cite the file, do not print secrets.
- Node/npm versions; existing test runner and how the suite is invoked (TESTING_PLAYBOOK).

#### B. ACF options source (H1, H8)
- Read `fetchPoleShapeStyles` in `src/services/productServices.ts`: exact keys read,
  return shape, cache setting, error fallback.
- **Live readback (read-only GET, staging only):** fetch `ACF_REST_OPTIONS` and record
  whether `acf.metal` and `acf.wood` exist and their current values. Redact nothing
  except credentials. Empty strings → GAP-1.
- Is there any other consumer of that endpoint?

#### C. Product page render path (H2, H3, H5)
- `src/app/(public)/shop/[slug]/page.tsx`: how `augmentedCategory` is built, exactly
  what is serialized into `product-category-custom`, and the `bloxx` gate.
- `src/lib/utils.ts` `detectProductCategory`: the `bloxx` predicate. From the WC
  catalog (read-only), list product slugs that satisfy it — this is the scope set.
- Where `BloxxPricing` is mounted and in what order the option groups render.
  Confirm the insertion point: immediately after `<BloxxPricingPoleStyles … />`.
- How `BloxxPricingPoleStyles` reads the category JSON and reports selection upward.

#### D. Cart write path (H4, H7) — the one that bites
- `src/types/cart.ts` `CartItem.variations` shape.
- In `BloxxPricing.tsx`, enumerate EVERY statement that assigns `variations:` on the cart
  item. Classify each as WHOLESALE (replaces the array) or SURGICAL (map/filter one name).
  For each WHOLESALE site, state whether a `Pole Material` entry would survive.
- Which component owns `cartItem` state above `BloxxPricing`, and how Add to Cart pushes
  it into the Zustand store (`src/store/*`). Does the store dedupe/merge by product id
  and variation_id in a way that would ignore Pole Material? (Two carts: Square/2"/Wood
  and Square/2"/Metal — same variation_id. Do they merge? Report; do not decide.)
- Confirm `handlePoleStyleChange` is state-only (GUARDRAILS 13) — adjacent finding.

#### E. Order pipe & downstream displays (H6)
- `src/lib/orderTransform.ts`: the `meta_data` array shape; confirm `variations` is sent
  as a single meta entry with the array as value.
- Every place that RENDERS `item.variations` or `variations` meta: cart drawer/page,
  checkout summary, order confirmation / thank-you, any email or webhook code in this
  repo. Classify each as GENERIC (iterates the array) or HARDCODED (looks up names).
- Staging order #14889: via WC REST (read-only GET), pull the line item `meta_data` and
  record the exact structure that produced the nested display block. This is the model
  Pole Material must match.
- The WP-side renderer is outside this repo. State what you can infer from the REST
  shape and the screenshot; if it needs the plugin source, raise GAP-2 with candidates.

#### F. Tests & prior art
- Existing tests touching `BloxxPricing`, cart store, `orderTransform`. Ironman Rule
  applies. Note the nearest test to copy for a Pole Material unit test.
- Any prior partial work for "material" anywhere in the repo (grep `material`, `metal`,
  `wood`).

### Output of this phase
1. RECON_FINDINGS.md filled, every finding labeled, H1–H8 each confirmed/denied.
2. CONTRACT.md filled as **PROPOSAL** (identity rule applied; consumer assumptions).
3. Report leads with headline answers:
   1. Does the staging ACF options response already expose `metal` and `wood`, and with
      what text values?
   2. Is the nested `variations` block on the WP order rendered generically, so a new
      `{name, value}` shows with zero backend change? Evidence from #14889 REST shape.
   3. Which code paths rebuild `cartItem.variations` WHOLESALE, and would each drop
      Pole Material?
   4. Do cart / checkout / confirmation displays iterate `variations` generically or by
      hardcoded names?
   5. Does the Zustand cart merge items with identical `variation_id` regardless of
      `variations` content?
   6. Exact insertion point (file:line) under Pole Shape Styles.
4. Every phase-blocking GAP includes SKETCHED candidate resolutions.
5. **STOP.** No edits until Tony approves BOTH templates.

### Stop Gate
> Recon complete. Findings + CONTRACT (PROPOSAL) filled and labeled. Headline answers
> stated. GAPs sketched. Awaiting approval.
