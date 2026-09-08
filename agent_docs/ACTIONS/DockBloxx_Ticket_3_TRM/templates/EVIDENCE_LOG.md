# templates/EVIDENCE_LOG.md — Engineer Self-Verification Log (Phase 2, Step 1)

**Feeds the Claim Package. It is the Engineer's own evidence — NOT the QA verdict.**

### Environment
- Test surface: dev FE (`dockbloxx-development-v1`, branch `product-option-1`, working tree uncommitted) vs `dockbloxx.mystagingwebsite.com` · Build/branch: dev server `next dev --turbopack` on :3000, HEAD 9b395a3 + uncommitted Ticket 3 changes · Date/time: 2026-09-08 14:42 +08
- Node v22.14.0 · npm 10.9.2 · Jest 30 · Playwright 1.59.1 (chromium-1217, headless)

### Self-verification results
| Check | What it proves | Result | Evidence ref |
|---|---|---|---|
| Automated suite | regressions green (Ironman Rule) | **PASS** — 19 suites / 185 tests; original 15 suites / 166 tests unchanged; +4 suites / +19 tests | RESPONSES step7 apply (this log); `npx jest --ci` |
| Typecheck + production build | compiles clean | **tsc PASS** (`npx tsc --noEmit`, tests included by tsconfig). **Production build PASS — run by the Director on his machine 2026-09-08** (Engineer did not run it: dev server held `.next`). | Director statement, session log 14:5x |
| Smoke pass (happy path) | group renders on a bloxx page (below Pole Size, above Current Price per override) | **PASS** — `whos-your-caddie`: heading + `Metal`/`Wood` buttons, none selected, DOM order Pole Size(y600) < Pole Material(752) < Current Price(910); click Wood → blue | response_2026-09-08_141725_ticket3-step3-verification.md |
| Fallback/empty case | `Unknown` seeded; empty ACF value omits option | **PASS** — no-click Add to Cart → exactly one `Pole Material=Unknown`; unit tests: empty wood → only Metal; both empty → nothing; no key → nothing + Unknown still seeded | response_2026-09-08_142402_ticket3-step4-verification.md; tests/components/shop/* |
| Persistence across shape/size change | wholesale rebuilds re-seed / preserve | **PASS** — Metal: Square→Octagon; Wood: size 2"→2.5", shape Square→Round (+custom size) → exactly one entry each time; integration test covers size + shape | step4-verification; BloxxPricing.poleMaterial.test.tsx |
| CONTRACT trace | a real value survives ACF → JSON → button → cart → payload → REST readback | **PASS** — `Wood` traced ACF → JSON → button → cart (Engineer, headless); `Metal` traced button → cart → payload → **WC REST order #14893** `{"name":"Pole Material","value":"Metal"}` → admin block `Pole Material: Metal` (Director screenshot). Same pipe, two literals. | step3/step4 verification; ac6-rest-readback |
| Expected-ABSENT | non-bloxx templates show nothing; `variation_id`/price unchanged | **PASS** — `carabiner` (simple): 0 occurrences; `huck-bucket` (single-variation): no `poleMaterials` key; Octagon/4" with vs without material → `variation_id 4000`, $299 both; Square/2" → 3182, $299 | step3/step4 verification |
| Final environment state | no debug logs / mock residue | **PASS** — no `console.log` in new component; Playwright scripts live in the session scratchpad, not the repo; no staging orders created; headless contexts discarded | `grep console.log` on new file; `git status` |

### Expected-ABSENT assertions — second `Pole Material` entry absent: **y** (every run + "switching replaces" test) · `variation_id` unchanged: **y** (3182 / 4000 / 4194 match shape+size only)
### Key values captured — ACF `metal`: `Metal` · ACF `wood`: `Wood` · TEST BUY order id: **#14893** (2026-09-08T02:06:01, Square / 4" / Metal, variation_id 3184; confirmed by Director) · REST readback entry: `{"name":"Pole Material","value":"Metal"}` — exactly one, in `meta_data[key="variations"].value`
### Known limitations / open risks (carry into Claim Package)
- WP-side renderer (GAP-2) **CLOSED** — TEST BUY #14893 admin block shows `Pole Material: Metal` (Director screenshot).
- Pressable edge cache (`x-ac`) + Next `revalidate: 60`: ACF text changes can take minutes to reach the page.
- Pre-deploy persisted carts lack `Pole Material` → they will not merge with post-deploy adds of the same item (cosmetic, backlog).
- Production ACF lacks `metal`/`wood` until Track B runs there → reader returns `""`, group hidden, cart still seeds `Unknown` (by design).
### TEST BUY (Director, 2026-09-08)
- Product `whos-your-caddie` (3157), **Square / 4" / Metal** (Director chose Metal; AC5 evaluated on `Metal` instead of `Wood` — same pipe, different literal). Admin order block shows `Pole Material: Metal` (Director screenshot). Order id: **#14893, confirmed by Director.** REST readback (AC6): **PASS** — see RESPONSES ac6-rest-readback.
- **Second TEST BUY (Director): #14894** (2026-09-08T02:19:59, Fillet Bloxx 12434, Octagon / 4", variation_id 12635, no material selected). Admin block shows `Pole Material: Unknown` (Director screenshot — reported as placed in `examples/`; folder held only `.gitkeep` at 15:40, Director to drop the file). REST readback: exactly one `{"name":"Pole Material","value":"Unknown"}` in `meta_data[key="variations"].value`. **AC7 PASS** — waiver withdrawn.

### Notes / anomalies
- First two ACF readbacks returned the pre-Track-B body (edge cache); cache-busted GET resolved it.
- First Step 4 browser run captured `price 0` (script clicked before the price effect) — re-run with a wait reproduced $299 / 3182.
- Round offers only `Other`; Add to Cart aborts with the existing `alert()` until a custom size is entered (dialog text captured). Pre-existing.
- Line endings: repo `src/` is CRLF; one early write converted two files to LF and was restored before verification. Tests are LF (matches existing tests).
