# Ticket 3 — AC7 REST readback: staging order #14894 (read-only GET, 2026-09-08T02:19:59, status processing)

Line item: 'Fillet Bloxx' product_id=12434 variation_id=12635 qty=1 total=449.00

meta_data entries:
- id=43221 key=`pa_pole-size` display_key=`Pole Size` value=`"4"`
- id=43222 key=`pa_pole-shape` display_key=`Pole Shape` value=`"octagon"`
- id=43223 key=`variations` display_key=`variations` value=`[{"name": "Pole Style", "value": "round_octagon"}, {"name": "Version", "value": "Unknown"}, {"name": "Pole Material", "value": "Unknown"}, {"name": "Pole Shape", "value": "Octagon"}, {"name": "Pole Size", "value": "4\""}]`
- id=43224 key=`metadata` display_key=`metadata` value=`[]`
- id=43230 key=`_reduced_stock` display_key=`_reduced_stock` value=`"1"`

**AC7 assertion:** `line_items[0].meta_data[key="variations"].value` contains exactly one `{"name":"Pole Material","value":"Unknown"}` → **PASS** (count=1). Matches the admin block `Pole Material: Unknown` (Director screenshot). No material was selected in this TEST BUY; the value came from the preserve-or-Unknown seed in both `BloxxPricing` init arrays (Step 4).
**Provenance:** Director confirmed #14894 as his second TEST BUY (Fillet Bloxx, Octagon / 4", no selection).
