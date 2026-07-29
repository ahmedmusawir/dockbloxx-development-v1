# T2 Phase 2 — Finding 1 fix COMPLETE (atomic first-touch)

**When:** 2026-07-29 15:41:05
**Status:** COMPLETE — saved, green. Bookkeeping done. STOPPED; Tony runs clean cases next.

## Saved (src/)
- `src/lib/attributionCapture.ts` — added `ATTRIBUTION_GUARD_KEY = "attribution_captured"` and
  `persistFirstTouch(storage, captured)`: if guard set → do nothing; else write full snapshot in
  one pass + set guard. Prevents chimera attribution from multi-landing sessions.
- `src/components/providers/AttributionProvider.tsx` — effect now calls `persistFirstTouch(...)`
  instead of the per-key loop.
- `tests/lib/attributionCapture.test.ts` — +2 atomicity tests (sparse→full no gap-fill; full
  first landing atomic). Note: first run failed (forgot to import `persistFirstTouch` in the
  test) — 2 failures / 3 tsc errors; import fixed; re-green.

## Semantics (per Tony, documented, not to be re-litigated)
Guard is set even on a sparse/direct first landing — a direct first touch is still a valid first
touch. Later landings in the same session are ignored entirely (no gap-filling).
Guard key is NOT read by `getAttribution` → never forwarded to the order.

## Tests / typecheck
```
npm test         → Test Suites: 19 passed, 19 total | Tests: 221 passed, 221 total  (+2)
npx tsc --noEmit → 0 errors
```

## Bookkeeping done
- EVIDENCE_LOG: runs **14883/14884 SUPERSEDED**; Finding 1 (fixed) + Finding 2 (report-only) logged.
- CLEANUP_BACKLOG: "Legacy attribution tracker still active (retire — candidate ticket)" — do NOT
  fix in T2.

## Finding 2 (report-only, no action in T2)
Legacy tracker writes parallel UTM set to localStorage (stale `utm_content="carou"`, google/cpc)
+ `_cltk` to sessionStorage. Not our provider. Follow-up ticket candidate.

## Next
Tony runs the 3 clean cases (fresh incognito each, Session-storage panel only): Case A, Case B,
typein. Hands over order IDs → I curl `GET /wp-json/wc/v3/orders/{id}`, assert meta_data vs
CONTRACT, paste verbatim into EVIDENCE_LOG. Env confirmed: local dev → staging backend, Stripe
test mode, REST reachable (200).
