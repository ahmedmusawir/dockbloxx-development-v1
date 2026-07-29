# Ticket 2 — Status Recap (resuming after 20-day gap)

**Generated:** 2026-07-28 13:48 · **Author:** Claudy · **For:** Tony
**Last active work:** 2026-07-08 (Phase 0 Recon completed + approved for accuracy).
**Current status:** STOOD DOWN — waiting on Coach's answer to one design question before Phase 1 can start.

---

## TL;DR (30 seconds)

You're working on **Ticket 2 — Capture UTM + click IDs on landing, write them to WooCommerce orders as native meta, prove via REST readback.** Phase 0 (read-only recon) is done and you approved it. You locked five decisions. You then paused Phase 1 to wait for Coach to answer one question about `source_type` field shape. **That answer hasn't landed and nothing has moved on disk in 20 days.** When it lands, one small doc update to `CONTRACT.md` unblocks Phase 1.

---

## The ticket in one paragraph

DockBloxx orders currently log `source_type = direct` with blank UTM fields, because in the headless Next.js checkout WooCommerce's built-in Order Attribution script never runs. **You want:** (1) first-touch capture of UTMs + gclid + fbclid on landing (persisted to `sessionStorage`), (2) forward those values onto the WC order at creation as native `_wc_order_attribution_*` meta (plus gclid/fbclid as order meta), (3) prove via `GET /wp-json/wc/v3/orders/{id}` on staging. **DoD = REST API readback.** The WP admin "Origin" display is explicitly OUT of scope (known WP wall).

Scope boundary: WooCommerce order-attribution pipe ONLY. No GA4, no GTM, no analytics events. That's Ticket 1's territory (closed and merged).

---

## Where we stopped

**Phase 0 Recon: COMPLETE + APPROVED for accuracy.**

Both templates filled and living on disk (uncommitted):

| File                                                                                     | Status                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/templates/RECON_FINDINGS.md`          | Filled ~230 lines, sections A–H + GAPs + Questions |
| `agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/templates/CONTRACT.md`                | Filled — locked 10-row 5-column key map (PROPOSAL) |
| `agent_docs/RESPONSES/response_2026-07-08_091452_t2-phase0-recon.md`                     | Response mirror (leading with 4 headline answers)  |

**Phase 1 Solution: NOT STARTED.** Stood down pending Coach.

## The four recon headlines (for scan-level context)

1. **Reader intact.** `src/lib/attribution.ts` (49 lines). sessionStorage. 9 fields. Gotcha: gclid reads from `_cltk` — a broken key that never matched any live Coach script.
2. **Forward is HYBRID + partly buggy.** `src/lib/orderTransform.ts:168-181` writes `_coach_ghl_*` keys for every field AND one native `_wc_order_attribution_source_type` with the WRONG value (stores utm_source strings under a field WC expects as enum).
3. **Capture is confirmed GONE.** `<Script id="coach-attribution">` in `layout.tsx:85-89` still exists but injects an empty payload (WP ACF field emptied when the script was pulled for E2E race issues).
4. **CONTRACT.md is locked as a proposal.** Columns 2 (capture writes) and 3 (reader reads) are identical strings per row. Reader needs four one-line edits in Phase 1 to align.

Full detail is in the recon response mirror at `agent_docs/RESPONSES/response_2026-07-08_091452_t2-phase0-recon.md` — open that if you want the exhaustive version.

---

## The five decisions you locked on 2026-07-08

Recorded in `session_2026-07-08.md` at the `[09:35]` entry and mirrored in `RECOVERY.md`. **Not yet folded into `CONTRACT.md`** — the file is still the pre-decision "locked proposal" version.

1. **Staging test backend = `dockbloxx.mystagingwebsite.com`.** `dbp.dockbloxx.com` is PRODUCTION, do NOT test against it.
2. **Delete all `_coach_ghl_*` writes** — the block at `src/lib/orderTransform.ts:170-174` goes.
3. **gclid canonical key = `gclid`** (not `_cltk`). Reader line 34 gets fixed in Phase 1.
4. **`utm_term` is canonical** — drop `utm_keyword` fallback + rename interface field.
5. **Delete the empty `<Script id="coach-attribution">`** from `src/app/layout.tsx:85-89`.

---

## The one open blocker

**GAP-2 · `source_type` field-shape design.** Awaiting Coach's answer to:

> "When your team reads `_wc_order_attribution_source_type` off the WC REST order response, do you expect a WC enum value (`utm | referral | organic | typein | admin | mobile_app`) or descriptive strings (`google`, `facebook`, `ai-referral`, `direct`)?"

**Why it blocks Phase 1:** the classifier logic in the new capture provider emits whatever `source_type` value gets persisted to sessionStorage and later written to Woo meta. Since DoD = REST readback, the value SHAPE determines what the capture must emit. Can't finalize the provider without the answer.

**Options I sketched:**
- If Coach wants **enum** — `source_type = utm` when any UTM present, `organic` when referrer is a search engine, `referral` when referrer is external non-search, `typein` when no UTMs + no referrer.
- If Coach wants **descriptive** — reuse Coach's classification logic from the archived script (`docs/wp-plugins/attribution-script.md:6-41`): AI (chatgpt, claude, etc.), Social (facebook, twitter, etc.), Search (google/bing/etc.), Referral (other), Direct.

Either path works; the choice is Coach's alone because it's about what his downstream expects.

---

## Disk state right now

**Branch:** `ticket-2-utm-to-rest`
**HEAD:** `f4def81 Ticket 1 done` (unchanged since T1 merge on 2026-07-02)
**Working tree (5 modified + 1 untracked folder, all uncommitted):**

```
 M CLAUDE.md                                                                # v3.1 RESPONSE LOGGING PROTOCOL added
 M RECOVERY.md                                                              # updated 2026-07-08 to reflect hold state
 M agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/templates/CONTRACT.md   # filled Phase 0 proposal
 M agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/templates/RECON_FINDINGS.md
 M session_2026-07-08.md
?? agent_docs/RESPONSES/                                                    # new folder with 1 file + this new recap
```

**Zero `src/` edits.** No commits or pushes from Claudy over the whole T2 arc (per your standing rule).

---

## When Coach answers, here's the exact resume sequence

1. **Update `CONTRACT.md`** — fold the five locked decisions + Coach's source_type answer into the file. Currently it's the "locked proposal" version; needs to become "locked final." Single Write.
2. **Enter Phase 1** per `Ticket_2_Solution_Module/workflow/01_SOLUTION.md`. Plan Mode. One change at a time.
3. Expected Phase 1 changes (rough shape, subject to Plan Mode diff review):
   - `src/lib/attribution.ts` — 4 one-line edits (drop `utm_keyword` fallback, `_cltk` → `gclid`, add `source_type` and `referrer` rows, rename interface field).
   - `src/lib/orderTransform.ts:168-181` — delete `_coach_ghl_*` block, add 6 missing native `_wc_order_attribution_*` writes, fix source_type value logic per Coach's answer, add top-level `gclid`/`fbclid`/`landing_page` meta.
   - `src/app/layout.tsx:85-89` — delete the empty `<Script id="coach-attribution">`.
   - **NEW file:** first-touch React provider (client component) mounted in root layout. Reads `window.location.search` + `document.referrer` once on mount, writes sessionStorage first-touch, done. NO `history.replaceState`, NO href rewriting, NO polling, NO form injection (all E2E race causes per Recon H).
4. Phase 2 validation on staging (`dockbloxx.mystagingwebsite.com`) via REST readback. Fill `Ticket_2_Solution_Module/templates/EVIDENCE_LOG.md`.

---

## Files to open if you want more depth

| Question                                    | File                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "What did I decide on 2026-07-08?"          | `session_2026-07-08.md` — search for `[09:35]`                                                |
| "What's the recon detail?"                  | `agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/templates/RECON_FINDINGS.md`               |
| "What's the key contract?"                  | `agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/templates/CONTRACT.md`                     |
| "What did the recon report look like?"      | `agent_docs/RESPONSES/response_2026-07-08_091452_t2-phase0-recon.md`                          |
| "What are the pack's hard rules?"           | `agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/GUARDRAILS.md` (10 rules)                  |
| "What does the workflow say to do next?"    | `agent_docs/CURRENT_TASKS/Ticket_2_Solution_Module/workflow/01_SOLUTION.md`                   |
| "3-second recovery"                          | `RECOVERY.md` at repo root                                                                    |

---

## What you asked me for vs what I did

- ✅ Generated this recap report → **written to `agent_docs/RESPONSES/response_2026-07-28_134814_t2-status-recap.md` first, then mirrored to screen** per CLAUDE.md v3.1 RESPONSE LOGGING PROTOCOL.
- ✅ Bookkeeping alongside: created today's session file `session_2026-07-28.md` (per mandatory session-start protocol) and refreshed `RECOVERY.md`'s "Last touched" pointer.
- ❌ Did NOT touch `CONTRACT.md`, `RECON_FINDINGS.md`, or anything in `src/`. No commits, no pushes.

**Next move is yours.** Either (a) tell me Coach's source_type answer and give me the green light to fold-in + enter Phase 1, or (b) something else on your list. Standing by.
