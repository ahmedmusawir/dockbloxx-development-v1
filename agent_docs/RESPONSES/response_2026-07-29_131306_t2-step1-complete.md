# T2 Phase 1 — Step 1 COMPLETE (stopped for Step 2 approval)

**When:** 2026-07-29 13:13:06
**Status:** COMPLETE — Step 1 saved and green. STOPPED for Tony's go before Step 2.
**Step:** 1 of 4 (`workflow/01_SOLUTION.md`) — E2E-safe capture provider + retire old script.

## What was saved

| File | Change |
| ---- | ------ |
| `src/lib/attributionCapture.ts` | **NEW** — pure logic (`classifyReferrer`, `resolveUtmCat`, `deriveSourceType`, `buildAttribution`) |
| `src/components/providers/AttributionProvider.tsx` | **NEW** — `"use client"`, effect-only, strict first-touch, zero DOM side effects |
| `tests/lib/attributionCapture.test.ts` | **NEW** — 23 tests |
| `src/app/layout.tsx` | mounted provider, deleted dead `coach-attribution` `<Script>` + orphaned `footer`/`footerJS` |
| `EVIDENCE_LOG.md`, `CLEANUP_BACKLOG.md` | notes 2 & 3 logged |

## Test results

```
npx jest tests/lib/attributionCapture.test.ts tests/api/place-order.test.ts
Test Suites: 2 passed, 2 total
Tests:       35 passed, 35 total
Snapshots:   0 total
Time:        2.191 s
```

Required cases present: **bing.com → organic**, **internal-referrer → null**, **full Case A/B
`buildAttribution` shape asserts** (plus utm-wins-cat, cat-only→utm, twitter normalization,
typein direct). Existing 12 `place-order` tests intact — Ironman Rule held.

## Operator notes — all honored

1. Provider position unchanged (end of `<body>`).
2. `WcSourceType` stays local; `/types` move logged in `CLEANUP_BACKLOG.md`.
3. EVIDENCE_LOG records: "classifyReferrer ported verbatim incl. substring-match looseness
   and unreachable `bing.com/chat` entry — tightening deferred as Coach-parity."

## Concerns

- None on Step 1.
- Standing item: `CONTRACT.md` was modified on disk outside my context earlier — will re-read
  before touching it again.

## Step 2 preview (NOT started)

Reader reconciliation in `src/lib/attribution.ts`: `utm_keyword`→`utm_term`, `_cltk`→`gclid`,
add `source_type`/`referrer`/`wbraid`/`gbraid`, remove `attribution_captured_at`. Grep already
proved no external consumers reference the changed fields.

→ Awaiting Tony's **go for Step 2**.
