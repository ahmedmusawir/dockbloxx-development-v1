# Ticket 3 — Step 3 verification (headless Chromium via Playwright 1.59.1, dev server :3000, staging backend)

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| jest | 15 suites / 166 tests |
| whos-your-caddie: "Pole Material" heading + buttons | `["Metal","Wood"]` |
| none selected on load (bg-blue-600) | `[false,false]` |
| DOM order (y px): Pole Size 600 < Pole Material 752 < Current Price 910 | correct |
| Current Price before click | `$299.00` |
| click Wood → blue | `[false,true]` |
| Current Price after click | `$299.00` (unchanged) |
| Add to Cart → localStorage `cart-storage` item | `variation_id: 3182`, `price: 299`, variations = Pole Shape Square · Pole Style square · Pole Size 2" · Version Unknown · **Pole Material Wood** (exactly one entry) |
| carabiner (simple): "Pole Material" text count | 0 |

Script: scratchpad `verify_step3.js` (not committed). Evidence limits: this is a headless script, not the Director's manual QA; no TEST BUY performed.
