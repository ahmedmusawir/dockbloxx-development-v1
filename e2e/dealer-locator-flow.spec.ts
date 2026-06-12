import { test, expect } from "@playwright/test";

/**
 * E2E coverage for the dealer-locator flow + homepage JSON-LD enrichment.
 *
 * Two describe blocks, one file:
 *   1. Dealer locator flow — visit /dealer-locator, exercise the live-WP
 *      READ path (Server Component → getDealers → fetch → ACF repeater) and
 *      the client-side substring search filter introduced 2026-06-11.
 *      Asserts cards render from WP, the filter narrows case-insensitively
 *      on dealer.name, the empty-state appears on no match, clearing the
 *      input restores the full set.
 *   2. Homepage JSON-LD enrichment — visit /, locate the inline
 *      <script id="yoast-schema-moose"> JSON-LD payload, find the
 *      Organization node (handling BOTH string and array @type shapes —
 *      the silent-failure path locked down in the unit suite), and assert
 *      injectOrganizationFacts() reached the rendered output end-to-end
 *      (foundingDate "2022", founder name "Brady Bragg" — client-confirmed).
 *
 * Fixtures: none. The seeded dealer roster on staging WP contains multiple
 * names with "dock" as a substring (Dock Solutions of Kentucky, The Dock
 * Box Guy, Casey Custom Docks, Southeastern Dock Supply, Docks of Lake
 * Norman), making it a robust query for substring/case-insensitive checks
 * without pinning to a fixture file.
 *
 * Live WP dependency: hits dev-staging WP via the running dev server. Same
 * risk profile as the other 5 e2e specs. Card count is asserted as ">= 5"
 * rather than exact 15 so future dealer-roster changes don't fail the
 * build on data drift.
 */

test.describe("Dealer locator flow", () => {
  test("renders multiple dealer cards from live WP", async ({ page }) => {
    await page.goto("/dealer-locator");

    const cards = page.getByRole("heading", { level: 3 });
    await expect(cards.first()).toBeVisible();

    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Spot-check a known dealer name from the seeded staging roster.
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "Dock Solutions of Kentucky",
      })
    ).toBeVisible();
  });

  test("filters cards by case-insensitive substring on dealer.name", async ({
    page,
  }) => {
    await page.goto("/dealer-locator");
    const cards = page.getByRole("heading", { level: 3 });
    const search = page.getByPlaceholder(/search dealers/i);

    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();

    // Mixed case to exercise both directions of the case-insensitive match.
    await search.fill("DoCk");
    await expect.poll(() => cards.count()).toBeLessThan(initialCount);

    const filteredCount = await cards.count();
    expect(filteredCount).toBeGreaterThanOrEqual(2);

    // A known-matching dealer must still be visible after filtering.
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "Dock Solutions of Kentucky",
      })
    ).toBeVisible();
  });

  test("shows empty-state when nothing matches", async ({ page }) => {
    await page.goto("/dealer-locator");
    const cards = page.getByRole("heading", { level: 3 });
    const search = page.getByPlaceholder(/search dealers/i);

    await expect(cards.first()).toBeVisible();

    await search.fill("zzzz_nonexistent_dealer_xyz");

    // Empty-state TEXT presence is the load-bearing assertion. The source
    // ternary guarantees the empty-state <p> and the dealer-card grid can't
    // co-exist, so a visible "No dealers match..." line is sufficient
    // evidence the filter zeroed out. Asserting `cards.toHaveCount(0)` would
    // over-constrain — the page layout (header/footer) contributes h3s
    // unrelated to DealerList's render branches.
    await expect(
      page.getByText("No dealers match your search.")
    ).toBeVisible();
  });

  test("clearing the input restores all dealers", async ({ page }) => {
    await page.goto("/dealer-locator");
    const cards = page.getByRole("heading", { level: 3 });
    const search = page.getByPlaceholder(/search dealers/i);

    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();

    await search.fill("dock");
    await expect.poll(() => cards.count()).toBeLessThan(initialCount);

    await search.fill("");
    await expect(cards).toHaveCount(initialCount);
  });
});

test.describe("Homepage JSON-LD enrichment", () => {
  test("Organization node carries foundingDate + founder from injectOrganizationFacts", async ({
    page,
  }) => {
    await page.goto("/");

    // Script tags are non-visible (metadata) — assert attached, not visible.
    const schemaScript = page.locator("#yoast-schema-moose");
    await expect(schemaScript).toBeAttached();

    const schemaText = await schemaScript.textContent();
    expect(schemaText).not.toBeNull();
    expect(schemaText!.length).toBeGreaterThan(0);

    const parsed = JSON.parse(schemaText!);
    const graph = parsed["@graph"];
    expect(Array.isArray(graph)).toBe(true);

    // Handle BOTH "@type" shapes Yoast can emit — mirrors isOrganizationNode
    // in src/lib/seoUtils.ts. The array case is the silent-failure path.
    const org = graph.find((node: any) => {
      const t = node?.["@type"];
      return (
        t === "Organization" ||
        (Array.isArray(t) && t.includes("Organization"))
      );
    });
    expect(org).toBeDefined();

    expect(org.foundingDate).toBe("2022");
    expect(org.founder).toBeDefined();
    expect(org.founder["@type"]).toBe("Person");
    expect(org.founder.name).toBe("Brady Bragg");
  });
});
