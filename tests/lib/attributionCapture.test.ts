import {
  classifyReferrer,
  resolveUtmCat,
  deriveSourceType,
  buildAttribution,
  persistFirstTouch,
} from "@/lib/attributionCapture";

const HOST = "dockbloxx.com";

describe("classifyReferrer", () => {
  test("empty referrer → null", () => {
    expect(classifyReferrer("", HOST)).toBeNull();
  });

  test("internal referrer → null", () => {
    expect(classifyReferrer("https://dockbloxx.com/shop", HOST)).toBeNull();
  });

  test("malformed referrer → null", () => {
    expect(classifyReferrer("not a url", HOST)).toBeNull();
  });

  test("AI referrer (chatgpt.com) → ai-referral", () => {
    expect(classifyReferrer("https://chatgpt.com/", HOST)).toEqual({
      utm_source: "chatgpt.com",
      utm_medium: "ai-referral",
    });
  });

  test("social referrer (facebook) → social, www stripped", () => {
    expect(classifyReferrer("https://www.facebook.com/", HOST)).toEqual({
      utm_source: "facebook.com",
      utm_medium: "social",
    });
  });

  test("twitter normalization: x.com → twitter", () => {
    expect(classifyReferrer("https://x.com/someone", HOST)).toEqual({
      utm_source: "twitter",
      utm_medium: "social",
    });
  });

  test("twitter normalization: t.co → twitter", () => {
    expect(classifyReferrer("https://t.co/abc123", HOST)).toEqual({
      utm_source: "twitter",
      utm_medium: "social",
    });
  });

  test("search referrer (bing.com) → organic", () => {
    expect(classifyReferrer("https://www.bing.com/search?q=dock", HOST)).toEqual({
      utm_source: "bing.com",
      utm_medium: "organic",
    });
  });

  test("generic external referrer → referral (raw domain)", () => {
    expect(classifyReferrer("https://someblog.example/post", HOST)).toEqual({
      utm_source: "someblog.example",
      utm_medium: "referral",
    });
  });
});

describe("resolveUtmCat", () => {
  test("utm wins over cat per field", () => {
    const p = new URLSearchParams("utm_source=google&cat_source=facebook&cat_medium=email");
    expect(resolveUtmCat(p)).toEqual({ utm_source: "google", utm_medium: "email" });
  });

  test("cat-only fields fall back", () => {
    const p = new URLSearchParams("cat_source=facebook&cat_campaign=spring");
    expect(resolveUtmCat(p)).toEqual({ utm_source: "facebook", utm_campaign: "spring" });
  });

  test("no utm/cat → empty", () => {
    expect(resolveUtmCat(new URLSearchParams(""))).toEqual({});
  });
});

describe("deriveSourceType", () => {
  test("any utm/cat present → utm", () => {
    expect(deriveSourceType(true, null)).toBe("utm");
  });

  test("search classification → organic", () => {
    expect(
      deriveSourceType(false, { utm_source: "google.com", utm_medium: "organic" }),
    ).toBe("organic");
  });

  test("social classification → referral", () => {
    expect(
      deriveSourceType(false, { utm_source: "facebook.com", utm_medium: "social" }),
    ).toBe("referral");
  });

  test("ai classification → referral", () => {
    expect(
      deriveSourceType(false, { utm_source: "chatgpt.com", utm_medium: "ai-referral" }),
    ).toBe("referral");
  });

  test("no classification → typein", () => {
    expect(deriveSourceType(false, null)).toBe("typein");
  });
});

describe("buildAttribution", () => {
  test("Case A: full UTM + both click IDs → exact shape", () => {
    const search =
      "?utm_source=facebook&utm_medium=paid_social&utm_campaign=summer_sale_2026&utm_content=carousel_a&utm_term=dock_bumper&gclid=TEST-GCLID-123&fbclid=TEST-FBCLID-456";
    expect(buildAttribution(search, "", "/", HOST)).toEqual({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "summer_sale_2026",
      utm_content: "carousel_a",
      utm_term: "dock_bumper",
      source_type: "utm",
      landing_page: "/",
      gclid: "TEST-GCLID-123",
      fbclid: "TEST-FBCLID-456",
    });
  });

  test("Case B: google cpc + wbraid → exact shape", () => {
    const search =
      "?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=TEST-GCLID-123&wbraid=TEST-WBRAID-123";
    expect(buildAttribution(search, "", "/", HOST)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      source_type: "utm",
      landing_page: "/",
      gclid: "TEST-GCLID-123",
      wbraid: "TEST-WBRAID-123",
    });
  });

  test("direct traffic (no params, no referrer) → typein + direct/(none)", () => {
    expect(buildAttribution("", "", "/", HOST)).toEqual({
      utm_source: "direct",
      utm_medium: "(none)",
      source_type: "typein",
      landing_page: "/",
    });
  });

  test("untagged organic referrer → synthesized source/medium + organic + raw referrer", () => {
    const ref = "https://www.google.com/search?q=dock";
    expect(buildAttribution("", ref, "/shop", HOST)).toEqual({
      utm_source: "google.com",
      utm_medium: "organic",
      source_type: "organic",
      landing_page: "/shop",
      referrer: ref,
    });
  });

  test("cat_source alone → source_type utm (CAT counts as UTM presence)", () => {
    const r = buildAttribution("?cat_source=facebook", "", "/", HOST);
    expect(r.source_type).toBe("utm");
    expect(r.utm_source).toBe("facebook");
  });

  test("UTM present suppresses referrer classification (no synth overwrite)", () => {
    const r = buildAttribution("?utm_source=newsletter", "https://www.google.com/", "/", HOST);
    expect(r.utm_source).toBe("newsletter");
    expect(r.source_type).toBe("utm");
    expect(r.utm_medium).toBeUndefined();
  });
});

describe("persistFirstTouch (atomic first-touch)", () => {
  function makeStorage(): Storage {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
      setItem: (k: string, v: string) => {
        m.set(k, v);
      },
      removeItem: (k: string) => {
        m.delete(k);
      },
      clear: () => m.clear(),
      key: (i: number) => Array.from(m.keys())[i] ?? null,
      get length() {
        return m.size;
      },
    } as Storage;
  }

  test("landing 1 sparse, landing 2 full params → snapshot unchanged (no gap-filling)", () => {
    const storage = makeStorage();
    persistFirstTouch(storage, buildAttribution("", "", "/", HOST)); // direct/typein

    persistFirstTouch(
      storage,
      buildAttribution(
        "?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=X&wbraid=Y",
        "",
        "/shop",
        HOST,
      ),
    );

    // Later landing must NOT gap-fill absent keys.
    expect(storage.getItem("utm_campaign")).toBeNull();
    expect(storage.getItem("gclid")).toBeNull();
    expect(storage.getItem("wbraid")).toBeNull();
    // Original snapshot intact.
    expect(storage.getItem("utm_source")).toBe("direct");
    expect(storage.getItem("utm_medium")).toBe("(none)");
    expect(storage.getItem("source_type")).toBe("typein");
    expect(storage.getItem("attribution_captured")).toBe("1");
  });

  test("first landing with full params captures the whole snapshot atomically", () => {
    const storage = makeStorage();
    persistFirstTouch(
      storage,
      buildAttribution("?utm_source=facebook&utm_medium=paid_social&gclid=G1", "", "/", HOST),
    );
    expect(storage.getItem("utm_source")).toBe("facebook");
    expect(storage.getItem("gclid")).toBe("G1");
    expect(storage.getItem("source_type")).toBe("utm");
    expect(storage.getItem("attribution_captured")).toBe("1");
  });
});
