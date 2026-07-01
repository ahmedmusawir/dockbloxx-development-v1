# references/ORIENTATION.md — System Mental Model

Read this to hold the system correctly. It keeps Ticket 1 from blurring into Ticket 2.

## Two separate pipes

Tracking on DockBloxx is two pipes that do not cross.

**Pipe 1 — GA4 (this ticket).** The app drops ecommerce events, including `purchase`,
into the `dataLayer`. Google Tag Manager (container `GTM-KVFXFKQ8`) watches that tray,
picks events up, and forwards them to GA4. This ticket is about making `purchase` count
each order once.

**Pipe 2 — WooCommerce attribution (NOT this ticket).** On landing, where a visitor came
from is captured, held for the visit, and written onto the WooCommerce order at checkout.
This never touches GA4. It is Ticket 2. Do not work on it here.

If you remember one thing: **Pipe 1 is "count the sale once." Pipe 2 is "record where the
buyer came from." This pack is Pipe 1 only.**

## Where Stape fits (it doesn't, anymore)

The old path had an extra hop: app → dataLayer → GTM → **Stape server** → GA4. Stape was a
server-side relay. It is retired. The path is now app → dataLayer → GTM → GA4, directly.
Do not add, wire, or reference Stape. Anything labeled "Stape" in the code is a stale label
on generic GTM plumbing, not a live dependency — but per the guardrails, do not delete
anything during recon; report it.

## The suspected double-fire mechanism (verify in recon)

The thank-you page likely re-fires `purchase` whenever it mounts — on refresh or
back-navigation — because any existing in-memory guard resets on remount while the finished
order is still stored client-side and gets re-read. If duplicates also carry different,
non-stable transaction IDs, GA4 cannot recognize them as the same sale and counts each one.
The fix is a real order ID plus a persistent, order-keyed lock. Recon confirms this picture
before any code changes.

## The correct GA4 property

Validate only in `443304844` ("www.dockbloxx.com - GA4", under the Google Ads Account).
Never in the duplicate `495675373` ("Dockbloxx Store").
