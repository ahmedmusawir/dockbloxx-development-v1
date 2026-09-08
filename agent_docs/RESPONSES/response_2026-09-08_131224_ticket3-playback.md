# Ticket 3 TRM — Engineer Playback (pre-recon confirmation)

## Definition of Done, in my words
The ticket is done when a shopper on any Bloxx-type product page (a product whose attributes include both Pole Shape and Pole Size) sees a "Pole Material" radio group with two choices, Metal and Wood, sitting directly under Pole Shape Styles. Labels come from the ACF Product Global text fields `metal` and `wood`. Nothing is preselected and the shopper can add to cart without choosing. Whatever they pick lands in the cart item's `variations` array as exactly one entry named `Pole Material`; no pick means the value `Unknown`. Changing shape or size must not drop or reset it. A real test purchase on this dev repo against staging must produce a WooCommerce order whose line item shows `Pole Material: Wood` (or Metal / Unknown) inside the same nested meta block that already shows Pole Shape / Pole Style / Pole Size / Version, and the same string must read back identically over WC REST. Price and variation_id resolution must be byte-for-byte unchanged. Non-Bloxx templates render nothing new. Finally, the QA Acceptance Report must be all green (or Director-waived in writing), with Gate Q and, if deployed, Gate D passed.

## Scope fences, in my words
Off-limits: WooCommerce attributes and variations (Pole Material is frontend-owned, never a WC attribute), any WordPress / plugin / PHP / ACF edit from this repo, pricing and variation matching (`calculatePrice`, `variation_id`), checkout, Stripe, shipping, coupons, GA4/GTM, the Custom Size flow, non-Bloxx pricing components, email templates, images for the options, and the `orderTransform.ts` payload shape. Two known adjacent bugs are report-only: the state-only `handlePoleStyleChange` and the duplicated init effects in `BloxxPricing.tsx`. Test surface is staging only; `dbp.dockbloxx.com` is production and I never touch or read it. If the WP order page fails to render the new entry after the test buy while REST has it, I stop and report rather than chase it.

## Write policy, in my words
Phase 0 changes nothing in the codebase. Bookkeeping under `agent_docs/` (session file, RECOVERY.md, EVIDENCE_LOG, RESPONSES, and the two filled templates) is standing-approved and I write it inline without asking. Any `src/` or shipped-code change is checkpoint-gated: I present the diff at a workflow step boundary, wait for your approval, apply, verify, one change at a time. Phase 1 cannot start until CONTRACT.md is FINAL. I never run a mutating git command; you commit.

## Phase 2 ends in a QA handoff, in my words
My completion report is a claim, not a verdict. In Phase 2 I self-verify into EVIDENCE_LOG, derive ACCEPTANCE_SPEC from the DoD and CONTRACT (never from my implementation), assemble the Claim Package, and hand it to the QA Lead. QA issues Gate Q and Gate D; you approve release and close the ticket. I do not argue QA findings: in-scope ones come back to me as gated fixes, structural ones go to the Architect, out-of-scope ones become follow-up tickets. I state capability limits honestly: I cannot drive a browser or do the test buy, and I never fabricate evidence.

## Two housekeeping notes
1. The ticket folder lives at `agent_docs/ACTIONS/DockBloxx_Ticket_3_TRM/`, but its README and the folder's `.claude/settings.json` hook assume `agent_docs/CURRENT_TASKS/`. I will treat `ACTIONS/` as canonical unless told otherwise.
2. Track B (entering `Metal` / `Wood` text on the staging options page) is yours. Recon section B does a live GET against the staging ACF endpoint and will report empty values as GAP-1 if Track B has not happened yet.

→ Awaiting approval to enter Plan Mode and begin Phase 0 recon.
