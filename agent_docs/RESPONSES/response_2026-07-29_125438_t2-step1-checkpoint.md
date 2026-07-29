# T2 Phase 1 — Step 1 Checkpoint (DIFFS BEFORE SAVING — awaiting approval)

**When:** 2026-07-29 12:54:38
**Status:** PROPOSED — nothing saved to `src/` yet. Presenting the 3 Step 1 artifacts +
the unit test for review. STOP for Tony's approval before writing any file.
**Step:** 1 of 4 (`workflow/01_SOLUTION.md`) — E2E-safe capture provider + retire old script.

## classifyReferrer parity table (vs docs/wp-plugins/attribution-script.md:6-41)

| Bucket   | Domains (exact, ported verbatim)                                                                   | utm_medium    | source_type |
| -------- | -------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| AI/LLM   | chatgpt.com, openai.com, claude.ai, gemini.google.com, bard.google.com, bing.com/chat              | `ai-referral` | referral    |
| Social   | facebook., t.co, twitter., x.com, linkedin., instagram., pinterest., reddit., tiktok., youtube.    | `social`      | referral    |
| Search   | google., bing., yahoo., duckduckgo., baidu., ecosia.                                                | `organic`     | organic     |
| Referral | (any other external domain)                                                                        | `referral`    | referral    |
| Direct   | (no referrer / internal referrer)                                                                  | `(none)`      | typein      |

- **Twitter normalization CARRIED OVER:** `t.co` and `x.com` → `utm_source = "twitter"` (Coach line 27).
- Bucket order preserved: AI → Social → Search → generic referral (first match wins).
- Internal-navigation guard preserved: referrer hostname containing the current host → null.
- `www.` stripped for AI/social/search sources; generic referral keeps the raw domain (Coach parity).
- source_type mapping: search→`organic`; AI/social/other-referral→`referral`; none→`typein`; any utm/cat→`utm`.

## Artifact 1 (CREATE) — src/lib/attributionCapture.ts

```ts
/**
 * Attribution Capture — pure, DOM-free logic.
 *
 * Ports Coach's classifyTraffic() reference logic
 * (docs/wp-plugins/attribution-script.md:6-41) into testable functions. The React provider
 * (AttributionProvider.tsx) supplies the DOM inputs and handles first-touch sessionStorage
 * persistence. This module NEVER touches the DOM.
 *
 * Contract: agent_docs/.../Ticket_2_Solution_Module/templates/CONTRACT.md (LOCKED-FINAL).
 */

export type WcSourceType = "utm" | "organic" | "referral" | "typein";

export interface CapturedAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  source_type: WcSourceType;
  referrer?: string;
  gclid?: string;
  fbclid?: string;
  wbraid?: string;
  gbraid?: string;
  coupon?: string;
  landing_page?: string;
}

// Referrer classification buckets (ported verbatim from Coach's script).
const AI_TOOLS = ["chatgpt.com", "openai.com", "claude.ai", "gemini.google.com", "bard.google.com", "bing.com/chat"];
const SOCIAL = ["facebook.", "t.co", "twitter.", "x.com", "linkedin.", "instagram.", "pinterest.", "reddit.", "tiktok.", "youtube."];
const SEARCH = ["google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "ecosia."];

const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmField = (typeof UTM_FIELDS)[number];

export interface ReferrerClassification {
  utm_source: string;
  utm_medium: "ai-referral" | "social" | "organic" | "referral";
}

/**
 * Classify traffic from the referrer. Returns null for empty or internal referrers.
 * Mirrors Coach's classifyTraffic() bucket order: AI -> Social -> Search -> generic referral.
 */
export function classifyReferrer(referrer: string, currentHost: string): ReferrerClassification | null {
  if (!referrer) return null;
  let domain: string;
  try {
    domain = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  // Ignore internal navigation.
  if (currentHost && domain.indexOf(currentHost.toLowerCase()) > -1) return null;

  const has = (list: string[]) => list.some((x) => domain.indexOf(x) > -1);

  if (has(AI_TOOLS)) {
    return { utm_source: domain.replace("www.", ""), utm_medium: "ai-referral" };
  }
  if (has(SOCIAL)) {
    let src = domain.replace("www.", "");
    if (domain.includes("t.co") || domain.includes("x.com")) src = "twitter";
    return { utm_source: src, utm_medium: "social" };
  }
  if (has(SEARCH)) {
    return { utm_source: domain.replace("www.", ""), utm_medium: "organic" };
  }
  return { utm_source: domain, utm_medium: "referral" };
}

/**
 * Per-field UTM-vs-CAT resolution: utm_* wins, cat_* is the fallback.
 * Returns only the fields that had a value.
 */
export function resolveUtmCat(params: URLSearchParams): Partial<Record<UtmField, string>> {
  const out: Partial<Record<UtmField, string>> = {};
  for (const f of UTM_FIELDS) {
    const catKey = f.replace("utm_", "cat_");
    const v = params.get(f) ?? params.get(catKey);
    if (v) out[f] = v;
  }
  return out;
}

/**
 * Derive the WooCommerce source_type enum. Never blank.
 */
export function deriveSourceType(
  hasUtmOrCat: boolean,
  classification: ReferrerClassification | null,
): WcSourceType {
  if (hasUtmOrCat) return "utm";
  if (!classification) return "typein";
  return classification.utm_medium === "organic" ? "organic" : "referral";
}

/**
 * Build the full attribution map from raw DOM inputs. Pure — no sessionStorage here.
 * The provider persists the result first-touch.
 */
export function buildAttribution(
  search: string,
  referrer: string,
  pathname: string,
  currentHost: string,
): CapturedAttribution {
  const params = new URLSearchParams(search);

  // 1. Explicit UTM/CAT params (utm wins per field).
  const utm = resolveUtmCat(params);
  const hasUtmOrCat = Object.keys(utm).length > 0;

  // 2. Referrer classification — only when untagged.
  const classification = hasUtmOrCat ? null : classifyReferrer(referrer, currentHost);

  const result: CapturedAttribution = {
    ...utm,
    source_type: deriveSourceType(hasUtmOrCat, classification),
    landing_page: pathname,
  };

  // 3. Coach-parity: synthesize source/medium from referrer when untagged.
  if (!hasUtmOrCat) {
    if (classification) {
      result.utm_source = classification.utm_source;
      result.utm_medium = classification.utm_medium;
    } else {
      // Direct traffic (no params, no external referrer).
      result.utm_source = "direct";
      result.utm_medium = "(none)";
    }
  }

  // 4. Referrer (raw), click IDs, coupon — captured when present.
  if (referrer) result.referrer = referrer;
  (["gclid", "fbclid", "wbraid", "gbraid", "coupon"] as const).forEach((k) => {
    const v = params.get(k);
    if (v) result[k] = v;
  });

  return result;
}
```

## Artifact 2 (CREATE) — src/components/providers/AttributionProvider.tsx

```tsx
"use client";

import { useEffect } from "react";
import { buildAttribution } from "@/lib/attributionCapture";

/**
 * First-touch attribution capture (E2E-safe).
 *
 * Reads UTM/CAT params, click IDs, referrer classification, and landing page ONCE on mount,
 * then persists to sessionStorage first-touch (never overwrites a value already set this visit).
 * Renders nothing. NO DOM side effects (no history.replaceState, href rewriting, form injection,
 * iframe patching, or polling) — that is what caused the old Coach script's E2E race.
 *
 * Reader: src/lib/attribution.ts. Contract: templates/CONTRACT.md (LOCKED-FINAL).
 */
export default function AttributionProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const captured = buildAttribution(
      window.location.search,
      document.referrer,
      window.location.pathname,
      window.location.hostname,
    );

    // First-touch persist: write each key only if absent for this visit (GUARDRAIL 3).
    for (const [key, value] of Object.entries(captured)) {
      if (value != null && value !== "" && sessionStorage.getItem(key) == null) {
        sessionStorage.setItem(key, String(value));
      }
    }
  }, []);

  return null;
}
```

## Artifact 3 (MODIFY) — src/app/layout.tsx (unified diff)

```diff
@@ import block @@
 import Script from "next/script";
 import { fetchTrackingScripts } from "@/services/trackingSeoServices";
+import AttributionProvider from "@/components/providers/AttributionProvider";
@@ inside RootLayout @@
-  const { header, body, footer } = await fetchTrackingScripts();
+  const { header, body } = await fetchTrackingScripts();

   const headerJS = stripScriptWrapper(header);
   const bodyHtml = stripNoscriptWrapper(body);
-  const footerJS = stripScriptWrapper(footer);

   // console.log("TRACKING SCRIPTS HEADER: [/app/layout.tsx]", headerJS);
   // console.log("TRACKING SCRIPTS BODY: [/app/layout.tsx]", bodyHtml);
-  // console.log("ATTRIBUTION SCRIPT FOOTER: [/app/layout.tsx]", footerJS);
@@ body @@
         <div
           id="moose-tracker-body"
           dangerouslySetInnerHTML={{ __html: bodyHtml }}
         />

-        {/* Coach's Attribution Script */}
-        <Script
-          id="coach-attribution"
-          strategy="lazyOnload"
-          dangerouslySetInnerHTML={{ __html: footerJS }}
-        />
+        {/* First-touch attribution capture (E2E-safe React provider) */}
+        <AttributionProvider />
       </body>
```

Note: `Script` import is STILL used (moose-tracker-head), so it stays. `stripScriptWrapper`
stays (headerJS). `fetchTrackingScripts` stays (header/body). Only `footer`/`footerJS` removed.

## Artifact 4 (CREATE, TDD) — tests/lib/attributionCapture.test.ts

Covers: each classifyReferrer bucket (AI/social/search/referral), twitter normalization,
internal-referrer null, utm-wins-over-cat, cat-only sets source_type=utm, 4-way source_type
enum incl. typein direct case, and a full buildAttribution Case A/B trace. (Full source
presented together with the code at save time.)

## Open checkpoint notes for Tony
1. Provider mounts in place of the removed Coach `<Script>` (end of `<body>`). Effect runs on
   mount regardless of position; can move higher if you prefer.
2. `WcSourceType` union lives in `attributionCapture.ts` (not `/types`) to avoid relocating the
   existing `AttributionData` interface (scope discipline). Say the word to move both to `/types`.
3. `coupon` captured from `?coupon=` first-touch (keeps ApplyCoupon QR autofill); NOT forwarded.
4. Awaiting approval to SAVE these files. No `src/` written yet.
```
