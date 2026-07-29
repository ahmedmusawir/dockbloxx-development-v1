# T2 CONTRACT.md fold-in → LOCKED-FINAL (proposed diff, awaiting approval)

**When:** 2026-07-29 11:16:37
**Status:** PENDING_APPROVAL — proposed content staged in scratch, NOT yet written to the
live `templates/CONTRACT.md`. Standing rule: diff before saving.
**Trigger:** Tony green-lit Phase 1 resume; delivered Coach's 7-item answer set; ordered
CONTRACT.md folded to locked-final in one Write, diff shown, stop for approval.

## What the fold-in encodes (Coach's 7 items)

1. **GAP-2 RESOLVED = ENUM.** `source_type ∈ {utm, organic, referral, typein}`, derivation
   per the (now-locked, formerly "proposed") Row 6 table. Never blank. Descriptive labels
   live only in `_wc_order_attribution_utm_source`. Classify once at capture → persist →
   read verbatim → forward verbatim.
2. **GAP-3 closed informational.** `gclid` canonical; `_cltk` dead.
3. **SCOPE DELTA — wp-admin visibility now in DoD.** Native order screen must show Origin
   (utm_source + utm_medium) and Source type (enum). Added to Phase 2 checklist as item 4,
   with an early "does the native box render on REST-created orders at all?" check →
   escalate if not (GUARDRAIL 10), do not work around.
4. **SCOPE DELTA — four click IDs.** Added `wbraid` + `gbraid` rows alongside gclid/fbclid.
   **Naming recommendation:** bare canonical string across all columns (`gclid`, `fbclid`,
   `wbraid`, `gbraid`) — no `_` prefix. Honors the "same string per row" identity rule,
   matches existing bare gclid/fbclid, keeps IDs visible in admin (underscore = protected/
   hidden meta). Flagged for Tony to report final names to Coach.
5. **SCOPE DELTA — CAT params.** `cat_*` are fallback twins of `utm_*` (utm wins, cat
   fallback), resolved once at capture into the canonical `utm_*` storage key — so no
   separate cat_* keys in columns 2–5. `cat_source` alone still sets `source_type=utm`.
   Escape hatch (ship UTM-only if CAT exceeds a small add) → assessed in Phase 1 plan;
   early read is "few lines, likely ships together."
6. **Test URLs** added as canonical Phase 2 cases (host adapted to staging).
7. **Five 2026-07-08 decisions folded** (staging host, delete `_coach_ghl_*`, gclid
   canonical, utm_term canonical, delete `<Script id="coach-attribution">`). Two "Tony's
   call" items resolved: **KEEP** `landing_page`, **REMOVE** `attribution_captured_at`.

## Structural changes to the doc

- Header + Status → LOCKED-FINAL.
- Key Map: +2 rows (wbraid, gbraid); Source type col-4 note GAP-2 → enum.
- NEW section: Click-ID naming decision.
- NEW section: CAT params (fallback twins).
- Reader-changes section: +remove attribution_captured_at; +wbraid/gbraid rows; decision tags.
- NEW section: Forward changes (`orderTransform.ts`) — delete _coach_ghl block, repoint
  native, fix source_type value.
- NEW section: Layout change (`layout.tsx`) — delete coach-attribution Script.
- Value notes: Source type GAP-2 RESOLVED; gclid GAP-3 CLOSED; fbclid → fbclid/wbraid/gbraid;
  landing_page KEEP; attribution_captured_at REMOVE.
- Validation checklist: canonical test URLs (Case A/B); source_type + click-ID asserts;
  wp-admin visibility item.
- Open GAPs → "None blocking" (GAP-1/2/3/4 all resolved) + one non-blocking relay item.

## Full diff

See on-screen unified diff (live CONTRACT.md vs scratch/CONTRACT_proposed.md). Net: +~150
lines, doc grows from 161 → ~280 lines. No live-file write performed yet.

## Next

On Tony's approval: single Write of the proposed content to
`templates/CONTRACT.md`, update session file COMPLETE + RECOVERY.md, THEN present the
Phase 1 plan in Plan Mode (before any `src/` edit).
