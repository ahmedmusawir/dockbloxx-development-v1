import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * E2E coverage for the /category/[slug] product listing flow.
 *
 * Test data sources:
 *   e2e/fixtures/live-data.json — regenerated per environment via `npm run fixtures:fetch`
 */

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const liveData = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, "live-data.json"), "utf-8")
);

const PAGINATION_THRESHOLD = 12; // products per page on category routes
const HAS_PAGINATION =
  liveData.categories.populated.product_count > PAGINATION_THRESHOLD;

test.describe("Category flow", () => {
  test("category page renders products", async ({ page }) => {
    const categorySlug = liveData.categories.populated.slug;
    await page.goto(`/category/${categorySlug}`);

    // Product names render in <h3> (same ProductListItem as /shop).
    await expect(page.locator("h3").first()).toBeVisible();

    // URL retains the category slug after any client-side hydration.
    expect(page.url()).toContain(`/category/${categorySlug}`);
  });

  test("category pagination works", async ({ page }) => {
    test.skip(
      !HAS_PAGINATION,
      `skipped: dev category has <${PAGINATION_THRESHOLD + 1} products, can't test pagination`
    );

    const categorySlug = liveData.categories.populated.slug;
    await page.goto(`/category/${categorySlug}`);
    await expect(page.locator("h3").first()).toBeVisible();
    const page1FirstName = await page.locator("h3").first().textContent();

    await page.goto(`/category/${categorySlug}?page=2`);
    await expect(page.locator("h3").first()).toBeVisible();
    const page2FirstName = await page.locator("h3").first().textContent();

    expect(page2FirstName).not.toBe(page1FirstName);
  });
});
