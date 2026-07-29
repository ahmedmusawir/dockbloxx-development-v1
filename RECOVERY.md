# Recovery State

**Last touched:** 2026-07-29 16:58 — **PHASE 2 REST readback: Case A (14887) + Case B (14888) PASS — core DoD proven.** REST meta_data matches CONTRACT 1→5 for both; `attribution_captured` guard NOT forwarded; zero `_coach_ghl_*`. EVIDENCE_LOG filled with verbatim meta + assertions. **PENDING: typein order ID** (→ readback + Test 5 direct fallback) and **Tony's wp-admin visual checks** (Origin + Source type render; typein FLAG 1). Superseded runs: 14883/14884/14886. New: Finding 2 addendum (_cltk live), Finding 3 (warmup.html nav) — both report-only, logged. Mirror: `response_2026-07-29_165758_t2-phase2-readback.md`. No commits/pushes.

---

### Prior milestone: 2026-07-29 15:41 — **PHASE 2 IN PROGRESS. Finding 1 (atomic first-touch) fixed & green.** Manual testing found chimera attribution across multi-landing sessions (runs 14883/14884 invalid/superseded). Fixed via `persistFirstTouch()` + guard key `attribution_captured` in `attributionCapture.ts`/`AttributionProvider.tsx` (+2 tests). `npm test` → **221/221**, `tsc` → **0 errors**. Finding 2 (legacy localStorage/_cltk tracker) logged report-only (EVIDENCE_LOG + CLEANUP_BACKLOG) — do NOT fix in T2. Env confirmed: local dev → staging backend `dockbloxx.mystagingwebsite.com`, Stripe test mode, REST reachable (200). **Next: Tony runs 3 clean cases (fresh incognito) → hands order IDs → I curl REST readback + fill EVIDENCE_LOG.** Mirror: `response_2026-07-29_154105_t2-finding1-complete.md`. No commits/pushes.

---

### Prior milestone (superseded by line above): 2026-07-29 13:31 — **PHASE 1 IMPLEMENTATION COMPLETE (Steps 1–4).** All src/ changes saved & green: `npm test` → **219/219** (19 suites), `npx tsc --noEmit` → **0 errors**. Step 3 (forward native meta in `orderTransform.ts` via new `buildAttributionMeta()`; deleted `_coach_ghl_*` + source_type bug) done; Step 4 (direct fallback) needed no code (resolved at capture). **Next = Phase 2 staging REST readback** (`workflow/02_TESTING.md`) on `dockbloxx.mystagingwebsite.com`, fill `EVIDENCE_LOG.md` per CONTRACT Case A/B + wp-admin/typein checks — awaiting Tony's go. Calibration in force: STOP only at src/ step checkpoints; `agent_docs/` bookkeeping silent. Mirrors: step1 `131306`, step2 `132355`, step3 `133115`. FLAG 1 (typein rendering)→CONTRACT Phase 2 checklist; FLAG 2 (dropped campaign placeholder)→EVIDENCE_LOG relay. Bare click-ID names locked; Coach relay pending post-Phase 2. **No commits/pushes.**

**Branch:** `ticket-2-utm-to-rest` (off `main` tip `f4def81 Ticket 1 done`). **Working tree has real uncommitted `src/` changes now** (Phase 1 implementation) plus doc writes — all uncommitted per standing rule. See "Files in working tree" below.

**Standing operator instructions:**
- **No git commits, no pushes by Claudy** unless Tony explicitly grants for a specific action.
- **One change at a time.** Diff review before saving.
- **Plan Mode discipline** for anything beyond a one-line typo fix.
- **GUARDRAIL 10 (T1/T2 both):** never touches GTM / WP admin / third-party dashboards; never writes compensating code for outside-repo config.
- **GUARDRAIL 11 (T1/T2 both):** adjacent findings REPORT-ONLY unless Tony greenlights ride-along.
- **CLAUDE.md v3.1 RESPONSE LOGGING PROTOCOL** — substantive artifacts written to `agent_docs/RESPONSES/response_<YYYY-MM-DD>_<HHMMSS>_<slug>.md` BEFORE printing to screen. Both fire (session file + response file). Conversational replies excluded.

---

## Active session

- **Session file:** `session_2026-07-29.md` (opened today, 2026-07-29). Prior sessions for context: `session_2026-07-28.md` (recap after 20-day gap), `session_2026-07-08.md` (Phase 0 arc + five locked decisions at `[09:35]`).
- **Recap report from yesterday still valid:** `agent_docs/RESPONSES/response_2026-07-28_134814_t2-status-recap.md`
- **Active ticket:** **Ticket 2 — capture UTM + click IDs, write to WooCommerce orders as native meta.**
- **Phase 0 Recon: COMPLETE + APPROVED.** **Phase 1: COMPLETE + ACCEPTED** (Steps 1–4, atomic first-touch fix). **Phase 2: IN PROGRESS** — Case A (14887) + Case B (14888) REST readback PASS (core DoD proven).
- **Awaiting (resume here):** (a) typein order ID → readback + Test 5; (b) Tony attaches wp-admin Origin/Source-type values + screenshots to EVIDENCE_LOG (incl. typein FLAG 1). Then finalize EVIDENCE_LOG + Coach relay items; Tony decides commit/PR.
- **Tests green:** `npm test` 221/221, `tsc --noEmit` 0 errors.

---

## Locked decisions (fold into CONTRACT.md + Solution when we resume)

1. **Staging = `dockbloxx.mystagingwebsite.com`.** Phase 2 REST readback tests hit this host. `dbp.dockbloxx.com` is PRODUCTION and is not tested against. Closes GAP-1.
2. **Delete all `_coach_ghl_*` writes** from `src/lib/orderTransform.ts:170-174` — the `Object.entries(attribution).map(...)` block. We are off the GHL route. Closes GAP-4 with explicit go-ahead per GUARDRAIL 9.
3. **gclid canonical key = `gclid`.** Reader's `_cltk` line (`src/lib/attribution.ts:34`) was always broken. Phase 1 changes it to `gclid`. Closes GAP-3.
4. **`utm_term` canonical** (drop `utm_keyword`). Reader line 33 fallback removed; interface field renamed at line 11.
5. **Delete `<Script id="coach-attribution">` from `src/app/layout.tsx:85-89`** — empty-payload no-op today. GUARDRAIL 9 gate cleared for removal.

## RESOLVED — Phase 1 no longer blocked (2026-07-29)

- **GAP-2 · `source_type` = ENUM** `{utm, organic, referral, typein}`, never blank, Row 6 table locked. Descriptive labels live only in `_wc_order_attribution_utm_source`. Classify once at capture → persist → read/forward verbatim.
- **Scope deltas folded:** (3) wp-admin visibility now in DoD; (4) FOUR click IDs — `gclid, fbclid, wbraid, gbraid`, **bare naming** (URL param = storage = reader = order-meta key, no `_` prefix); (5) CAT params are fallback twins of utm (utm wins), resolved once at capture — cat_source alone → source_type=utm; escape-hatch (ship UTM-only) assessed in the Phase 1 plan.
- **Remaining non-blocking relay:** Tony to report final bare click-ID names to Coach.
- Full detail: `templates/CONTRACT.md` (LOCKED-FINAL) + `agent_docs/RESPONSES/response_2026-07-29_111637_t2-contract-foldin.md`.

---

## Ticket 1 status: CLOSED

Merged to main in `f4def81 Ticket 1 done`. T1 code verified intact at session start. No Ticket 1 work pending. A3 follow-up candidate at `Ticket_1_Solution_Module/Ticket_1_A3_followup_candidate.md` — ClickUp promotion is Tony's call when he chooses.

---

## Files in working tree (uncommitted per standing rule)

**src/ (Phase 1):**
- `src/lib/attributionCapture.ts` — NEW (pure capture logic + `persistFirstTouch` atomic guard)
- `src/components/providers/AttributionProvider.tsx` — NEW (first-touch client provider)
- `src/lib/attribution.ts` — reader reconciled to contract keys
- `src/lib/orderTransform.ts` — native `_wc_order_attribution_*` forward; `_coach_ghl_*` + source_type bug removed
- `src/app/layout.tsx` — provider mounted, dead coach `<Script>` removed

**tests/:** `tests/lib/attributionCapture.test.ts` (NEW, 25), `tests/api/place-order.test.ts` (+3)

**docs:** `templates/CONTRACT.md` (LOCKED-FINAL), `templates/EVIDENCE_LOG.md` (filled), `templates/RECON_FINDINGS.md`, `CLEANUP_BACKLOG.md`, `agent_docs/RESPONSES/*` mirrors, `session_2026-07-29.md`, `RECOVERY.md`.

**Commits/pushes: NONE.**

---

## Next session — start moves in this order

1. **Read `RECOVERY.md` (this file) → `session_2026-07-29.md` bottom (End of Session State) for freshest context.**
2. **Ask Tony:** "Ready to finish Phase 2 — do you have the typein order ID, and the wp-admin Origin/Source-type values + screenshots to log?"
3. **typein readback:** once given the order ID, run the curl (below) → assert `source_type=typein`, `utm_source=direct`, `utm_medium=(none)`, `landing_page=/`, NO click IDs/campaign → fill EVIDENCE_LOG Test 5.
4. **Finalize EVIDENCE_LOG:** wp-admin section (values + screenshot refs), attachments checklist, confirm the two Coach relay items.
5. **Then Tony's call:** commit / PR for the T2 branch (nothing committed yet).
6. **Report-only follow-ups (NOT T2):** legacy tracker retire (Finding 2 + `_cltk` addendum) + warmup.html nav (Finding 3) → in CLEANUP_BACKLOG for a separate ticket.

**Readback curl (from repo root):**
```bash
ID=<ORDER_ID>; CK=$(grep -E "^WOOCOM_CONSUMER_KEY" .env.local | cut -d= -f2); CS=$(grep -E "^WOOCOM_CONSUMER_SECRET" .env.local | cut -d= -f2); curl -s "https://dockbloxx.mystagingwebsite.com/wp-json/wc/v3/orders/$ID?consumer_key=$CK&consumer_secret=$CS" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(json.dumps(d.get("meta_data",[]),indent=2))'
```

---

## Key patterns from T1/T2 recon carried forward

- **Recon-first, gated.** Read-only Phase 0 fills templates. STOP for approval.
- **EVIDENCE / INFERENCE / CLAIM / GAP / QUESTION** labeling on all findings. Cite `file:line`.
- **One change at a time.** No batching. Checkpoint at each.
- **Diff before saving.** Present bytes before invoking `Edit`.
- **Plan Mode discipline.** Write plan to session file BEFORE displaying in CLI.
- **RESPONSE LOGGING (v3.1)** for substantive artifacts. Session file + `agent_docs/RESPONSES/` both fire.
- **Track A / Track B split** when applicable — never compensate for outside-repo config.
- **Adjacent findings REPORT-ONLY** unless Tony greenlights ride-along.
- **NO commits, NO pushes by Claudy.**
