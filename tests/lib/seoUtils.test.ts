/**
 * Unit tests for injectOrganizationFacts() — src/lib/seoUtils.ts
 *
 * Tests the object-level schema enrichment helper (introduced 2026-06-11)
 * that adds foundingDate + founder to the homepage JSON-LD Organization
 * node BEFORE JSON.stringify / fixUrl in the homepage page.tsx pipeline.
 *
 * Critical case: Yoast emits Organization with a "@type" that may be a
 * string ("Organization") OR an array (e.g. ["Organization","OnlineStore"]).
 * A === check alone silently misses the array form and injects nothing.
 * The array-case test explicitly locks that failure path down.
 *
 * Mocking: none — the function is pure synchronous, no I/O.
 *
 * Scope: injectOrganizationFacts only. Other exports in seoUtils.ts
 * (fetchYoastSEOJson, fixUrl, etc.) are not in scope here.
 */

import { injectOrganizationFacts } from "@/lib/seoUtils";

const FOUNDER = { "@type": "Person", name: "Brady Bragg" };

describe("injectOrganizationFacts", () => {
  test("adds foundingDate + founder when @type is the string 'Organization'", () => {
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://x/#organization",
          name: "DockBloxx",
        },
      ],
    };

    const result = injectOrganizationFacts(schema);
    const org = result["@graph"][0];

    expect(org.foundingDate).toBe("2022");
    expect(org.founder).toEqual(FOUNDER);
  });

  test("adds foundingDate + founder when @type is an array including 'Organization'", () => {
    const schema = {
      "@graph": [
        {
          "@type": ["Organization", "OnlineStore"],
          "@id": "https://x/#organization",
          name: "DockBloxx",
        },
      ],
    };

    const result = injectOrganizationFacts(schema);
    const org = result["@graph"][0];

    expect(org.foundingDate).toBe("2022");
    expect(org.founder).toEqual(FOUNDER);
  });

  test("matches Organization regardless of its position in the @type array", () => {
    const schema = {
      "@graph": [
        {
          "@type": ["OnlineStore", "Organization"],
          name: "DockBloxx",
        },
      ],
    };

    const result = injectOrganizationFacts(schema);
    const org = result["@graph"][0];

    expect(org.foundingDate).toBe("2022");
    expect(org.founder).toEqual(FOUNDER);
  });

  test("returns schema unchanged when no Organization node exists", () => {
    const schema = {
      "@graph": [
        { "@type": "WebPage", name: "Home" },
        { "@type": "BreadcrumbList" },
        { "@type": ["WebSite", "Article"], name: "DockBloxx" },
      ],
    };
    const before = JSON.parse(JSON.stringify(schema));

    const result = injectOrganizationFacts(schema);

    expect(result).toEqual(before);
  });

  test("does NOT overwrite existing foundingDate", () => {
    const schema = {
      "@graph": [
        {
          "@type": "Organization",
          name: "DockBloxx",
          foundingDate: "1999",
        },
      ],
    };

    const result = injectOrganizationFacts(schema);
    const org = result["@graph"][0];

    expect(org.foundingDate).toBe("1999");
    expect(org.founder).toEqual(FOUNDER); // missing field still added
  });

  test("does NOT overwrite existing founder", () => {
    const existingFounder = { "@type": "Person", name: "Someone Else" };
    const schema = {
      "@graph": [
        {
          "@type": "Organization",
          name: "DockBloxx",
          founder: existingFounder,
        },
      ],
    };

    const result = injectOrganizationFacts(schema);
    const org = result["@graph"][0];

    expect(org.founder).toEqual(existingFounder);
    expect(org.foundingDate).toBe("2022"); // missing field still added
  });

  test("returns null unchanged when schema is null (does not throw)", () => {
    expect(() => injectOrganizationFacts(null)).not.toThrow();
    expect(injectOrganizationFacts(null)).toBeNull();
  });

  test("returns input unchanged when schema is not an object", () => {
    expect(injectOrganizationFacts("not-a-schema" as any)).toBe(
      "not-a-schema"
    );
    expect(injectOrganizationFacts(42 as any)).toBe(42);
  });

  test("returns schema unchanged when @graph is missing", () => {
    const schema = { "@context": "https://schema.org" };
    const before = JSON.parse(JSON.stringify(schema));

    const result = injectOrganizationFacts(schema);

    expect(result).toEqual(before);
  });

  test("returns schema unchanged when @graph is not an array", () => {
    const schema = { "@graph": { not: "an array" } };
    const before = JSON.parse(JSON.stringify(schema));

    const result = injectOrganizationFacts(schema);

    expect(result).toEqual(before);
  });

  test("injects only into the first matching Organization node (break behavior)", () => {
    const schema = {
      "@graph": [
        { "@type": "Organization", "@id": "first" },
        { "@type": "Organization", "@id": "second" },
      ],
    };

    const result = injectOrganizationFacts(schema);

    expect(result["@graph"][0].foundingDate).toBe("2022");
    expect(result["@graph"][0].founder).toEqual(FOUNDER);
    expect(result["@graph"][1].foundingDate).toBeUndefined();
    expect(result["@graph"][1].founder).toBeUndefined();
  });
});
