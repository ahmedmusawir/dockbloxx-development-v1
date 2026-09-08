# templates/CONTRACT.md — Pole Material Pipe Contract

**STATUS: FINAL** (locked 2026-09-08 13:31 by Director answers; PROPOSAL approved 2026-09-08). Any column change reopens to PROPOSAL.

### The identity rule (load-bearing)
WRITER column and READER column must be IDENTICAL strings per row. A single mismatch = silent empty values with no error.

### Key map
| Field | ACF field name (WP) | ACF REST key (`data.acf.*`) WRITER→ | Service reader key (`fetchPoleMaterials`) | Category JSON key WRITER→ | Component reader key | Radio value / label | `cartItem.variations` entry (name / value) | Order `meta_data[key="variations"].value[]` entry | Admin display line |
|---|---|---|---|---|---|---|---|---|---|
| Metal option | `metal` | `metal` | `data.acf.metal` | `poleMaterials.metal` | `data.poleMaterials.metal` | value: `Metal` / label: `Metal` | `Pole Material` / `Metal` | `{"name":"Pole Material","value":"Metal"}` | `Pole Material: Metal` |
| Wood option | `wood` | `wood` | `data.acf.wood` | `poleMaterials.wood` | `data.poleMaterials.wood` | value: `Wood` / label: `Wood` | `Pole Material` / `Wood` | `{"name":"Pole Material","value":"Wood"}` | `Pole Material: Wood` |
| No selection | — | — | — | — | — | (none checked) | `Pole Material` / `Unknown` | `{"name":"Pole Material","value":"Unknown"}` | `Pole Material: Unknown` |

`Metal` / `Wood` are the literal ACF text values read back from staging on 2026-09-08 (cache-busted GET). Code never hardcodes them; it passes `data.acf.*` through verbatim. If the Director changes the ACF text, this table changes, not code.

Recon evidence per column: REST key = live options GET; service reader = new `fetchPoleMaterials()` modeled on `productServices.ts` L1154–1194 (GAP-5 = separate function); category JSON = `page.tsx` L116–119 spread; component reader = pattern of `BloxxPricingPoleStyles.tsx` L24–32; cart entry = `handleSizeSelection` L431–445 pattern; order entry = `orderTransform.ts` L110–120 (unchanged); admin line = #14889 REST shape.

### Value contracts (enums, formats, fallbacks)
- Accepted cart values: exactly `Metal`, `Wood` (as returned by ACF, verbatim) or `Unknown`. No other value is ever written. No normalization, no trimming.
- Absent or empty ACF value (`data.acf.metal` / `wood` missing or `""`) → that option is OMITTED from the UI; the cart still seeds `Unknown`. Both absent → the whole group renders nothing (mirrors `BloxxPricingPoleStyles` L34). This is the production-safety fallback until Track B runs on production.
- `Unknown` is seeded inside BOTH wholesale init arrays in `BloxxPricing.tsx` (L153–163 and L212–223) — GAP-6 option (a). The selected value is preserved across shape/size/version changes (write sites #3–#8 are surgical, verified).
- Selection handler writes the cart directly: filter out any existing `Pole Material` entry, append the new one (`handleSizeSelection` pattern). Never state-only.
- Exactly ONE `Pole Material` entry exists at any time.
- The `variations` meta entry keeps its current shape: one meta row, key `variations`, value = the full array. Pole Material is one more `{name, value}`; entry order is not contractual.
- Name string is `Pole Material` everywhere it appears (space, title case).
- Radio input `name` attribute: `poleMaterial`. Nothing `checked` by default.
- `variation_id`, `basePrice`, `price` are never touched by any Pole Material code path.
- Cache note: Pressable edge cache (`x-ac`) plus Next `revalidate: 60` mean an ACF text change can take minutes to reach the product page. Not a code concern; QA waits or cache-busts before asserting.

### Consumer-side assumptions
- The WP-side renderer iterates every `{name, value}` in the array and does NOT filter `Unknown` (Director confirmed the #14889 screenshot shows `Version: Unknown`). Still verified only by the TEST BUY (GAP-2).
- Coach reads material from the admin order page and/or REST; no email template needs it.
- Cart strips (mini-cart, cart page, checkout) display the bare value (`Wood`) via existing generic renderers; `Unknown` is filtered there. Director accepted as-is; no change.
- Two carts differing only in material are separate line items (store key includes the full `variations` array). Confirmed; QA asserts it.
- Production ACF options will carry the same two keys/values before Gate D (Track B on production is the Director's).
- TEST BUY product: `whos-your-caddie` (product 3157). DoD example slug `giraffe-g20-…` does not exist on staging.

### External answers folded in (the lock trail)
| Date | Source | Answer | Column(s) updated |
|---|---|---|---|
| 2026-09-08 | Director (Tony) | No price impact; frontend-owned like Pole Style; radios; nothing preselected; unselected = `Unknown`; ACF fields `metal`/`wood` are plain Text; display on WP order nested block like Pole Style | all rows (design lock) |
| 2026-09-08 | Director | Staging = dockbloxx.mystagingwebsite.com; branch `product-option-1`; dev repo only | environment |
| 2026-09-08 | Recon (Engineer) | ACF REST initially lacked `metal`/`wood` (edge cache); store key is full `variations` array (no merge by `variation_id`); renderers generic; two wholesale init sites | Key map evidence; value contracts; GAP-3 closed |
| 2026-09-08 | Director + readback | Track B done; literal ACF text = `Metal`, `Wood` (GAP-1) | radio value/label, cart value, order entry, admin line |
| 2026-09-08 | Director | Store ACF display text, not key (GAP-4) | radio value + cart value |
| 2026-09-08 | Director | Separate `fetchPoleMaterials()` (GAP-5) | service reader column |
| 2026-09-08 | Director | Seed `Unknown` inside both wholesale init arrays (GAP-6 a) | value contracts |
| 2026-09-08 | Director | Cart strips as-is; TEST BUY = `whos-your-caddie`; WP renderer shows `Unknown` rows | consumer assumptions |

### Validation
Engineer self-verification AND independent QA each trace one real value (`Wood`) across ALL columns unchanged; expected-ABSENT fields asserted for the fallback case (`Unknown` present; no second `Pole Material` entry; no change in `variation_id`; Current Price identical before/after for Square / 2" on `whos-your-caddie`).
