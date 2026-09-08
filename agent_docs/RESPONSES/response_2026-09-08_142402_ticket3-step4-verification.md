# Ticket 3 — Step 4 verification (headless Chromium, dev :3000 → staging backend)

| Check | Result |
|---|---|
| tsc / jest | clean / 15 suites, 166 tests |
| Run 1 — load, no click, wait for price, Add to Cart | exactly one `Pole Material=Unknown`; `variation_id 3182`, price 299 (AC3 shape) |
| Run 1 — mini-cart strip text | `Square · square · 2"` — `Unknown` hidden by the existing generic filter (Step 5 evidence) |
| Run 2 — Metal → shape Square→Octagon → Add | Metal stayed blue; exactly one `Pole Material=Metal`; `variation_id 4000`, price 299 |
| Run 3 — same Octagon/4" with NO material click | `variation_id 4000`, price 299 → identical to Run 2 (price/matching unchanged, AC9 shape) |
| Run 2b/2c — Wood → size 2"→2.5" → shape Square→Round → Add | Wood stayed blue through both changes. First add stored NOTHING because Round offers only size `Other` and the pre-existing guard fired: dialog `"Please enter a custom pole size before adding to cart!"` (ProductDetails.tsx L100–106). After entering custom size `12`: exactly one `Pole Material=Wood`, `variation_id 4194`, price 299 (AC4 shape). |
| Run 6 — Square/2"/Wood then Square/2"/Metal | **2 line items**, both `variation_id 3182` (Step 6 evidence: no merge across materials) |

Timing note: an earlier Run 1 attempt clicked Add to Cart before the price effect resolved and captured `price 0` / no `variation_id`. Re-run with an explicit wait for "Current Price: $" reproduced the expected values. Pre-existing render timing, not a Step 4 effect (Step 4 touches only the two init arrays).
Observation (report-only): `handleShapeSelection`'s filter-then-append reorders `variations` (Pole Material moves before Pole Shape/Size). Order is non-contractual per CONTRACT.
Scripts: scratchpad `verify_step4*.js` (not committed). Agent evidence only; no TEST BUY.
