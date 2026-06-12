# Recovery State

Last action: Closed out the 2026-06-11 dealer-locator arc. Full e2e suite green (21/21 — 5 pre-existing files contributing 16 tests + 5 new dealer-locator-flow tests). Unit suite green (27/27). Tony shipping to prod via copy of `src/` + `tests/` folders. Optional: bring `e2e/dealer-locator-flow.spec.ts` over too if e2e parity on prod is wanted.

**Arc summary:** Dealer-locator page migrated from static `data.js` import to live WP read via `getDealers()` service (slug-queried page → `acf.dealer_data` repeater → clean `Dealer` shape, defensive `[]` on any failure). Server-fetch + Client-filter split for client-side substring search on `dealer.name` (case-insensitive, no library, no debounce). Homepage JSON-LD enriched with `foundingDate: "2022"` + `founder: { "@type": "Person", "name": "Brady Bragg" }` via `injectOrganizationFacts` helper that handles BOTH string and array `@type` forms. 27 unit tests + 5 e2e tests cover all three pieces. Static `data.js` deleted post visual sign-off.

**Production prereqs (operational, not code):**
- Prod WP must have dealer-locator page at slug `dealer-locator` with ACF `dealer_data` repeater populated (manual entry — same path as staging; native ACF REST writes silently no-op for repeaters on this WP install)
- Prod env vars: `NEXT_PUBLIC_BACKEND_URL` pointing to prod WP, WC consumer keys

**Post-deploy 5-second smoke checks:**
- `/dealer-locator` — confirm dealers render (live WP read)
- View-source on `/` → search for `yoast-schema-moose` → confirm `"foundingDate":"2022"` + `"founder":{"@type":"Person","name":"Brady Bragg"}` inside the Organization node

Pending: None on this arc. Tony's final move (copy + run on prod) is operational.

Next step: Await Tony's next session. Today's uncommitted set sits on the working tree per the no-commit rule; will move with the `src/` + `tests/` copy to prod.
