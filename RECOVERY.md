# Recovery State

Last action: Wrote `scripts/seed-dealers.mjs` (one-shot WP ACF seeder for dealer-locator). Script ran clean and logged `Seeded 15 dealers into page #12595`, but the WP-side outcome was effectively a no-op — the native `POST /wp/v2/pages/{id}` with `{acf:{dealer_data:[...]}}` shape is silently rejected for repeaters on this install (`_acf_changed: false`, no rows written). Tony entered the 15 rows manually in WP admin instead of waiting on a diagnose/pivot cycle. The script remains on disk but inert for this install's write surface; would need rewrite against the `/wp-json/acf/v3/pages/{id}` endpoint (ACF to REST API plugin) if a script-based seed is ever wanted here.
Pending: None. Tony is awaiting next task.
Next step: Stand by. Carryover dirty tree from May (per Tony's no-commit rule) plus today's two new files (`scripts/seed-dealers.mjs`, `session_2026-06-11.md`) and modified `RECOVERY.md` — all uncommitted.
