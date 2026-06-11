// Run: WP_USER='your-user' WP_APP_PW='xxxx xxxx xxxx xxxx xxxx xxxx' node scripts/seed-dealers.mjs
//
// One-shot seeder: reads the 15 static rows from
// src/app/(public)/dealer-locator/data.js, looks up the WP page by slug
// on dev-staging, and overwrites its ACF "dealer_data" repeater in one REST call (idempotent).

import { readFile } from "node:fs/promises";
import path from "node:path";

const WP_BASE = "https://dockbloxx.mystagingwebsite.com";
const SLUG = "dealer-locator";

const { WP_USER, WP_APP_PW } = process.env;
if (!WP_USER || !WP_APP_PW) {
  throw new Error("Missing env: WP_USER and WP_APP_PW must both be set");
}

// data.js uses ESM `export const` but this project's package.json has no
// "type": "module", so a direct import would be parsed as CJS and throw.
// Read the file and dynamic-import it via a data: URL (ESM, no temp file).
const dataPath = path.resolve(
  import.meta.dirname,
  "../src/app/(public)/dealer-locator/data.js"
);
const dataSrc = await readFile(dataPath, "utf8");
const dataUrl =
  "data:text/javascript;base64," + Buffer.from(dataSrc).toString("base64");
const { dealers } = await import(dataUrl);

const auth =
  "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PW}`).toString("base64");

const lookup = await fetch(
  `${WP_BASE}/wp-json/wp/v2/pages?slug=${encodeURIComponent(SLUG)}`,
  { headers: { Authorization: auth } }
);
if (!lookup.ok) {
  throw new Error(
    `Page lookup failed: ${lookup.status} ${await lookup.text()}`
  );
}
const pages = await lookup.json();
if (!Array.isArray(pages) || pages.length === 0) {
  throw new Error(`No page found for slug "${SLUG}"`);
}
const pageId = pages[0].id;

const dealer_data = dealers.map((d) => ({
  dealer_name: d.name,
  dealer_address: d.address,
  dealer_phone: d.phone,
  dealer_web_url: d.website,
}));

const write = await fetch(`${WP_BASE}/wp-json/wp/v2/pages/${pageId}`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ acf: { dealer_data } }),
});
if (!write.ok) {
  throw new Error(`Write failed: ${write.status} ${await write.text()}`);
}

console.log(`Seeded ${dealer_data.length} dealers into page #${pageId}`);
