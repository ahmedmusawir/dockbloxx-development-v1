# T2 Phase 2 — Findings 1 & 2 (Finding 1 fix PROPOSED — awaiting approval)

**When:** 2026-07-29 15:35:51
**Status:** Finding 1 = src/ amendment PROPOSED (diff below), NOT saved — awaiting Tony's approval.
Finding 2 = report-only. Two Phase-2 manual runs invalidated.
**Context:** Manual Phase 2 testing surfaced two findings before clean runs completed.

## Invalidated runs
- Orders **14883 / 14884** — INVALID (multi-landing session contamination). To be marked
  **superseded** in EVIDENCE_LOG.

## FINDING 1 — DESIGN FLAW (fix now, src/ checkpoint)

**Bug:** per-key first-touch locks each key independently. A sparse first landing (e.g. no
params → `utm_source=direct`, `utm_medium=(none)`, `source_type=typein`) leaves other keys
absent; a *later* landing in the same session can't overwrite the locked keys but DOES fill
the absent ones (utm_campaign, utm_content, then gclid/wbraid). Result: chimera record —
typein+direct carrying campaign + click IDs.

**Fix:** atomic first-touch via a single guard key `attribution_captured="1"`. If present →
provider skips entirely. If absent → write full snapshot + guard in one pass. Per-key absence
checks kept as belt-and-suspenders.

**Reader/forward unaffected:** `attribution_captured` is not read by `getAttribution`, so it is
never forwarded to the order.

### Diff A — src/lib/attributionCapture.ts (append)
```ts
export const ATTRIBUTION_GUARD_KEY = "attribution_captured";

/**
 * Atomic first-touch persistence (Ticket 2 Finding 1 fix).
 *
 * If the guard key is already set, this visit has captured — do NOTHING. This prevents
 * "chimera" attribution where a later landing in the same session gap-fills keys the first
 * landing left absent (e.g. a typein/direct first touch later acquiring campaign + click IDs).
 * Otherwise write the whole snapshot in one pass and set the guard. The per-key absence check
 * is kept as belt-and-suspenders.
 */
export function persistFirstTouch(storage: Storage, captured: CapturedAttribution): void {
  if (storage.getItem(ATTRIBUTION_GUARD_KEY) != null) return;
  for (const [key, value] of Object.entries(captured)) {
    if (value != null && value !== "" && storage.getItem(key) == null) {
      storage.setItem(key, String(value));
    }
  }
  storage.setItem(ATTRIBUTION_GUARD_KEY, "1");
}
```

### Diff B — src/components/providers/AttributionProvider.tsx
```diff
 import { useEffect } from "react";
-import { buildAttribution } from "@/lib/attributionCapture";
+import { buildAttribution, persistFirstTouch } from "@/lib/attributionCapture";
@@
 export default function AttributionProvider() {
   useEffect(() => {
     if (typeof window === "undefined") return;

-    const captured = buildAttribution(
-      window.location.search,
-      document.referrer,
-      window.location.pathname,
-      window.location.hostname,
-    );
-
-    // First-touch persist: write each key only if absent for this visit (GUARDRAIL 3).
-    for (const [key, value] of Object.entries(captured)) {
-      if (value != null && value !== "" && sessionStorage.getItem(key) == null) {
-        sessionStorage.setItem(key, String(value));
-      }
-    }
+    // Atomic first-touch (GUARDRAIL 3 + Finding 1): capture the whole snapshot once per
+    // visit, guarded so later landings can't gap-fill absent keys into a chimera record.
+    persistFirstTouch(
+      window.sessionStorage,
+      buildAttribution(
+        window.location.search,
+        document.referrer,
+        window.location.pathname,
+        window.location.hostname,
+      ),
+    );
   }, []);

   return null;
 }
```

### Diff C — tests/lib/attributionCapture.test.ts (append)
```ts
describe("persistFirstTouch (atomic first-touch)", () => {
  function makeStorage(): Storage {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
      setItem: (k: string, v: string) => { m.set(k, v); },
      removeItem: (k: string) => { m.delete(k); },
      clear: () => m.clear(),
      key: (i: number) => Array.from(m.keys())[i] ?? null,
      get length() { return m.size; },
    } as Storage;
  }

  test("landing 1 sparse, landing 2 full params → snapshot unchanged (no gap-filling)", () => {
    const storage = makeStorage();
    persistFirstTouch(storage, buildAttribution("", "", "/", HOST)); // direct/typein

    persistFirstTouch(
      storage,
      buildAttribution("?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=X&wbraid=Y", "", "/shop", HOST),
    );

    expect(storage.getItem("utm_campaign")).toBeNull();
    expect(storage.getItem("gclid")).toBeNull();
    expect(storage.getItem("wbraid")).toBeNull();
    expect(storage.getItem("utm_source")).toBe("direct");
    expect(storage.getItem("utm_medium")).toBe("(none)");
    expect(storage.getItem("source_type")).toBe("typein");
    expect(storage.getItem("attribution_captured")).toBe("1");
  });

  test("first landing with full params captures the whole snapshot atomically", () => {
    const storage = makeStorage();
    persistFirstTouch(
      storage,
      buildAttribution("?utm_source=facebook&utm_medium=paid_social&gclid=G1", "", "/", HOST),
    );
    expect(storage.getItem("utm_source")).toBe("facebook");
    expect(storage.getItem("gclid")).toBe("G1");
    expect(storage.getItem("source_type")).toBe("utm");
    expect(storage.getItem("attribution_captured")).toBe("1");
  });
});
```

## FINDING 2 — ADJACENT, report-only (GUARDRAIL 9/10 — do NOT fix in T2)

Legacy tracker still active on the page: writes a parallel UTM key set to **localStorage**
(observed stale `utm_content="carou"`, full google/cpc set) and **`_cltk`** to sessionStorage.
NOT our provider (ours is sessionStorage-only, code-verified). To be logged in EVIDENCE_LOG +
CLEANUP_BACKLOG: "identify and retire legacy attribution tracker — candidate follow-up ticket;
do NOT remove within T2."

## On approval (one batch)
1. Save Diffs A/B/C.
2. `npm test` + `npx tsc --noEmit`.
3. Pre-approved bookkeeping: mark runs 14883/14884 superseded in EVIDENCE_LOG; log Finding 2 in
   EVIDENCE_LOG + CLEANUP_BACKLOG.
4. STOP with diff + results; then Tony runs the three clean cases (fresh incognito each) and
   hands over order IDs for readback.

**Note:** harness currently shows plan mode (read-only) — needs dropping to save + run + bookkeep.
