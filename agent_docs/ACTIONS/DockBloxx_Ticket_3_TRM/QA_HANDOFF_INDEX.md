# QA_HANDOFF_INDEX.md — DockBloxx Ticket 3 TRM (Pole Material) — location map for the QA Lead

All paths are relative to the repo root (`dockbloxx-development-v1`). Written by the Engineer 2026-09-08 as bookkeeping; the QA Lead owns the verdict.

## 1. Start here
1. **Factory `QA_PLAYBOOK.md`** — governs intake, contract extraction, Gate Q, Gate D, findings routing. *Not stored in this repo; the Director supplies the Factory path.*
2. **This index** — `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/QA_HANDOFF_INDEX.md`.

## 2. What to test against
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/templates/ACCEPTANCE_SPEC.md` — the QA contract: AC1–AC11 with evidence type, environment, WHO, and current Engineer/Director status per row. Derived from the DoD and the FINAL contract, not from the code.
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/templates/CONTRACT.md` — **FINAL**. Writer/reader key identity per column (ACF → service → category JSON → component → cart → order meta → admin line), value contracts, fallbacks, and the lock trail of every Director decision.
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/CLAUDE.md` **§2 Definition of Done** (v1.1) — the six done-conditions and the explicit not-required list. §2.1 carries the Director's placement override (below Pole Size, above Current Price; Pole-Size-style buttons).
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/GUARDRAILS.md` — the 16 hard rules; use to classify any finding as in-scope, structural, or out-of-scope.

## 3. What the Engineer claims
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/CLAIM_PACKAGE.md` — the handoff claim (QA_PLAYBOOK §6): scope, files changed, behaviour claimed, tests, commands and results, limitations, rituals, rollback, follow-ups. A claim, not a verdict.
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/templates/EVIDENCE_LOG.md` — Engineer self-verification: eight checks with results and evidence refs, key values (ACF literals, order ids, REST entries), known limitations, anomalies.

## 4. Evidence trail (`agent_docs/RESPONSES/`, chronological)
| File | What it is |
|---|---|
| `response_2026-09-08_131224_ticket3-playback.md` | Engineer's pre-recon playback of DoD, fences, write policy, QA-handoff rule |
| `response_2026-09-08_132323_ticket3-recon-findings-contract.md` | Phase 0 recon as presented: six headline answers, H1–H8, sections A–F, GAPs, CONTRACT proposal (superseded by the two FILLED/FINAL files below) |
| `response_2026-09-08_133254_ticket3-recon-findings-FILLED.md` | RECON_FINDINGS as approved and written to the template |
| `response_2026-09-08_133254_ticket3-contract-FINAL.md` | CONTRACT at the moment it went FINAL (literals `Metal`/`Wood` folded in). Later lock-trail rows live only in `templates/CONTRACT.md` |
| `response_2026-09-08_133331_ticket3-step1-diff.md` | Step 1 diff: `PoleMaterials` type + `fetchPoleMaterials()` reader |
| `response_2026-09-08_134807_ticket3-step2-diff.md` | Step 2 diff: `poleMaterials` serialized into the product-category JSON |
| `response_2026-09-08_135653_ticket3-step3-diff.md` | Step 3 diff: new `BloxxPricingPoleMaterials.tsx` + mount + cart-writing handler (Step 3/4 boundary change flagged) |
| `response_2026-09-08_141725_ticket3-step3-verification.md` | Headless-browser check of Step 3: buttons, none selected, DOM order, click → blue, price unchanged, cart write, non-bloxx absence |
| `response_2026-09-08_141725_ticket3-step4-diff.md` | Step 4 diff: preserve-or-`Unknown` seed in both wholesale init arrays |
| `response_2026-09-08_142402_ticket3-step4-verification.md` | Browser runs for Step 4: `Unknown` seed, Metal/Wood survive shape+size changes, price/`variation_id` parity, two materials = two lines; two false alarms explained |
| `response_2026-09-08_142402_ticket3-step5-evidence.md` | Step 5, no diff: renderer classification (all GENERIC), `orderTransform.ts` untouched |
| `response_2026-09-08_142402_ticket3-step6-evidence.md` | Step 6, no diff: cart does not merge across materials; decision recorded |
| `response_2026-09-08_143408_ticket3-step7-diff.md` | Step 7 diff: the four new test files in full (+19 tests) |
| `response_2026-09-08_143408_ticket3-step8-adjacent-findings.md` | Step 8 report: ten adjacent findings, report-only |
| `response_2026-09-08_144243_ticket3-acceptance-spec.md` | ACCEPTANCE_SPEC, first Phase 2 version (superseded) |
| `response_2026-09-08_144243_ticket3-claim-package.md` | Claim Package, first version, before TEST BUY (superseded) |
| `response_2026-09-08_144243_ticket3-evidence-log.md` | EVIDENCE_LOG, first version, before TEST BUY (superseded) |
| `response_2026-09-08_152642_ticket3-ac6-rest-readback.md` | **AC6:** read-only WC REST readback of order #14893 — exactly one `{"name":"Pole Material","value":"Metal"}` |
| `response_2026-09-08_152642_ticket3-acceptance-spec-final.md` | ACCEPTANCE_SPEC after #14893 (AC7 still waived; superseded) |
| `response_2026-09-08_152642_ticket3-claim-package-HANDOFF.md` | Claim Package at handoff, v1 (superseded) |
| `response_2026-09-08_152642_ticket3-evidence-log-final.md` | EVIDENCE_LOG after #14893 (superseded) |
| `response_2026-09-08_154111_ticket3-acceptance-spec-final-v2.md` | **ACCEPTANCE_SPEC, current mirror** — AC5 PASS #14893, AC7 PASS #14894 |
| `response_2026-09-08_154111_ticket3-claim-package-HANDOFF-v2.md` | **Claim Package, current mirror** |
| `response_2026-09-08_154111_ticket3-evidence-log-final-v2.md` | **EVIDENCE_LOG, current mirror** |
| `response_2026-09-08_154859_ticket3-ac7-rest-readback.md` | **AC7:** read-only WC REST readback of order #14894 — exactly one `{"name":"Pole Material","value":"Unknown"}` |

The ticket-folder copies (`templates/*.md`, `CLAIM_PACKAGE.md`) are authoritative; RESPONSES files are timestamped snapshots.

## 5. Director artifacts (`agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/examples/`)
| Artifact | Proves |
|---|---|
| Admin order screenshot, **order #14893** (Who's Your Caddie, Square / 4" / Metal) — nested block shows `Pole Material: Metal` | **AC5** (admin display) — pairs with the AC6 REST readback |
| Admin order screenshot, **order #14894** (Fillet Bloxx, Octagon / 4", no selection) — nested block shows `Pole Material: Unknown` | **AC7** (fallback on the order) — pairs with the AC7 REST readback |

*Status at 15:50 on 2026-09-08: `examples/` contains only `.gitkeep`. The Director reported both screenshots; files still to be dropped in.* Suggested names: `order-14893-admin-pole-material-metal.png`, `order-14894-admin-pole-material-unknown.png`.

## 6. Background reading
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/templates/RECON_FINDINGS.md` — full Phase 0 recon with file:line evidence, the 27-product bloxx scope set, GAP history, and the placement-override addendum.
- `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/references/ORIENTATION.md` — the system mental model: Pole Material is a passenger on the Pole Style pipe; the named trap (wholesale rebuilds).
- `agent_docs/CLEANUP_BACKLOG.md` — the ten adjacent findings as follow-up candidates (out-of-scope for this ticket; do not reopen the module for them).

## 7. Environment quick card
| Item | Value |
|---|---|
| Test surface | dev frontend (this repo, `next dev` on `http://localhost:3000`) against staging backend **`https://dockbloxx.mystagingwebsite.com`** (wp-admin, ACF options, orders, WC REST) |
| **Never** | `dbp.dockbloxx.com` is PRODUCTION backend — never test against it, never read its ACF options. `dockbloxx.com` is the production frontend — reference only. |
| Branch | `product-option-1` (HEAD 9b395a3 + uncommitted Ticket 3 working tree until the Director commits) |
| Test product | `whos-your-caddie` (product 3157). Square sizes 2" / 2.5" / 3" / 4"; Octagon 4"; Round offers only `Other` (custom-size input required, `alert()` guard) |
| TEST BUY orders | **#14893** — Square / 4" / Metal, `variation_id 3184` (AC5/AC6) · **#14894** — Fillet Bloxx, Octagon / 4", no selection → `Unknown`, `variation_id 12635` (AC7) |
| Reference order | #14889 (2026-07-30) — pre-ticket shape of the nested `variations` block, `variation_id 3182` |
| ACF literals | `metal` = `Metal`, `wood` = `Wood` (staging Options → Global Product) |
| Cache warning 1 | Pressable edge cache (`x-ac` header) serves `/wp-json/acf/v3/options/options` stale for minutes. Cache-bust with `?_nocache=<timestamp>` and `Cache-Control: no-cache` before asserting a fresh ACF value. |
| Cache warning 2 | Product page reads ACF with `revalidate: 60`; allow ≥ 60 s after any ACF change before a page-level assertion. |
| Session ritual | Clean session per landing test; clear Zustand `cart-storage` (localStorage) between AC2/AC3/AC4 — a stale `Pole Material` masquerades as a pass. One session = one order id = one REST readback. |
| Suite / build | `npm test` → 19 suites / 185 tests (baseline 15 / 166). `npx tsc --noEmit` clean. `next build` clean on the Director's machine. |
| Gate D precondition | Track B (enter `Metal` / `Wood`) on the **production** ACF options before promotion; until then the reader returns `""`, the group is hidden, and orders still carry `Pole Material: Unknown`. |
