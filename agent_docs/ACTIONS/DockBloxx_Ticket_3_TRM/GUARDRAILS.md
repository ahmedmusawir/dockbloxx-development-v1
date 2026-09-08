# GUARDRAILS.md — DockBloxx Ticket 3 (hard rules)

Non-negotiable unless Tony explicitly overrides.

1. **Recon changes nothing.** Phase 0 is read-only. Editing begins only after Tony
   approves RECON_FINDINGS AND the CONTRACT (PROPOSAL).
2. **Do not change production behavior.** Pricing, variation matching (`calculatePrice`,
   `variation_id`), checkout, Stripe, shipping, coupons, and `orderTransform.ts` payload
   shape are OFF-LIMITS. Pole Material rides an existing pipe; it does not reshape it.
3. **The contract is sacred.** No Phase 1 until CONTRACT.md is FINAL. Every external
   answer folds INTO the contract. Writer-key and reader-key columns must be IDENTICAL
   strings per row.
4. **Removal / replacement is approval-gated.** Report with a repoint-vs-replace
   proposal; never rip out unilaterally.
5. **Adjacent findings are report-only.** Log with evidence, propose a follow-up ticket,
   move on. No mid-ticket cowboy removal.
6. **Test on the locked surface only.** Staging = `dockbloxx.mystagingwebsite.com`.
   `dbp.dockbloxx.com` is PRODUCTION — never test against it, never curl its ACF options.
7. **Do-not-chase walls.** If the nested `variations` block on the WP order page does NOT
   render the new entry after a TEST BUY (H6 false), STOP and report with the REST readback
   as evidence. The WP-side display is not this repo's to fix; Director routes it.
8. **Evidence honesty.** Declare capability limits. Director does browser-interactive
   steps and the TEST BUY; agents do readbacks/assertions. Faking evidence is the worst outcome.
9. **No self-certification.** The Engineer's completion report is a CLAIM (QA_PLAYBOOK
   §6). Phase 2 ends in a QA handoff; QA issues Gate Q / Gate D; the Director approves
   release. The Acceptance Spec derives from DoD + CONTRACT, never the implementation.
10. **No WooCommerce attribute or variation for Pole Material.** It is frontend-owned,
    like Pole Style. Any suggestion to "just add it as an attribute" is a design menu for
    the Director, not an action.
11. **No WordPress / plugin / PHP / ACF edits from this repo.** ACF field creation and
    field values are the Director's manual Track B. The Engineer reads; never writes ACF.
12. **The handler writes the cart, not an effect.** The Pole Material selection handler
    must write `{name:"Pole Material", value}` into `cartItem.variations` directly. Do
    not replicate the `handlePoleStyleChange` pattern (state-only). Every code path that
    rebuilds `cartItem.variations` wholesale must preserve or re-seed Pole Material.
13. **Do not fix the Pole Style cart-write gap.** `handlePoleStyleChange` only sets local
    state; user picks never reach the cart (cosmetic today because `square_octagon`
    normalizes to `square`). Report-only, follow-up ticket candidate. Same for the
    duplicated init `useEffect` blocks in `BloxxPricing.tsx`.
14. **Only Bloxx renders it.** The Pole Material component must be unreachable from
    simple / single-variation / complex-variation / giftcard templates.
15. **Ironman Rule + full build.** No unplanned changes to passing tests. No new
    dependencies expected; if any lock-file change occurs for any reason, run a full
    production build before claiming green.
16. **Naming is literal.** The cart/order name is exactly `Pole Material` (space, title
    case) — parallel to `Pole Style`. Display labels are the ACF text values, not the
    field slugs.
