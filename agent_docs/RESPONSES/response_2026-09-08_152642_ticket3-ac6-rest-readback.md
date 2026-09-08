# Ticket 3 — AC6 REST readback: staging order #14893 (read-only GET, 2026-09-08T02:06:01, status processing)

Line item: 'Who’s Your Caddie?' product_id=3157 variation_id=3184 qty=1 total=299.00

meta_data entries:
- id=43196 key=`pole-shape` display_key=`Pole Shape` value=`"Square"`
- id=43197 key=`pa_pole-size` display_key=`Pole Size` value=`"4"`
- id=43198 key=`variations` display_key=`variations` value=`[{"name": "Pole Shape", "value": "Square"}, {"name": "Pole Style", "value": "square"}, {"name": "Version", "value": "Unknown"}, {"name": "Pole Material", "value": "Metal"}, {"name": "Pole Size", "value": "4\""}]`
- id=43199 key=`metadata` display_key=`metadata` value=`[]`
- id=43211 key=`_reduced_stock` display_key=`_reduced_stock` value=`"1"`

**AC6 assertion:** `line_items[0].meta_data[key="variations"].value` contains exactly one `{"name":"Pole Material","value":"Metal"}` → **PASS** (count=1). String identical to the admin display `Pole Material: Metal` (Director screenshot).
**Shape parity with #14889:** same single `variations` meta row, same `{name,value}[]` form, one extra element. No second Pole Material entry. `variation_id` 3184 = Square / 4" (material did not alter matching).
**Order id provenance:** the Director's message carried a placeholder; #14893 identified from a read-only listing of today's staging orders (only order for product 3157 today; selections match). Director to confirm.
