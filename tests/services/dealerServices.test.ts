/**
 * Unit tests for getDealers() — src/services/dealerServices.ts
 *
 * Covers the dealer-locator service function (introduced 2026-06-11) that
 * fetches the slug-queried WP page and maps WP field names → clean Dealer
 * shape. Mocked at the global.fetch boundary — does NOT hit the live WP
 * endpoint at dockbloxx.mystagingwebsite.com.
 *
 * Mocking strategy: jest.mock the @/constants/apiEndpoints module so the
 * service picks a known URL, then per-test configure global.fetch with
 * mockResolvedValue / mockRejectedValue. Same pattern as the API route
 * tests in tests/api/.
 *
 * Scope: getDealers only. The co-resident fetchAllDealerSlugs and
 * fetchDealerPageData functions cover the unrelated dealer-coupon feature
 * (separate WP source) and are not in scope here. Both endpoint constants
 * are mocked anyway to avoid undefined-as-import noise at module load.
 */

jest.mock("@/constants/apiEndpoints", () => ({
  DEALER_LOCATOR_REST_URL:
    "https://test-wp.example/wp-json/wp/v2/pages?slug=dealer-locator",
  DEALER_REST_COUPONS: "https://test-wp.example/wp-json/wp/v2/dealer_coupon",
}));

import { getDealers } from "@/services/dealerServices";

function mockOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function mockNotOkResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    headers: new Headers(),
  } as unknown as Response;
}

describe("getDealers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  test("maps WP fields → clean Dealer shape", async () => {
    const wpRows = [
      {
        dealer_name: "Lake Life Solutions TN",
        dealer_address: "11310 Hwy 57 Counce TN 38326",
        dealer_phone: "901-326-5108",
        dealer_web_url: "https://lakelifesolutionsllc.com",
      },
      {
        dealer_name: "Xtreme Docks Alabama",
        dealer_address: "364 Killough La. Talladega AL 35160",
        dealer_phone: "205-473-8096",
        dealer_web_url: "https://www.xtremedocks.com",
      },
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockOkResponse([{ acf: { dealer_data: wpRows } }])
    );

    const result = await getDealers();

    expect(result).toEqual([
      {
        name: "Lake Life Solutions TN",
        address: "11310 Hwy 57 Counce TN 38326",
        phone: "901-326-5108",
        website: "https://lakelifesolutionsllc.com",
      },
      {
        name: "Xtreme Docks Alabama",
        address: "364 Killough La. Talladega AL 35160",
        phone: "205-473-8096",
        website: "https://www.xtremedocks.com",
      },
    ]);
  });

  test("calls fetch with &_fields=acf trim", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockOkResponse([{ acf: { dealer_data: [] } }])
    );

    await getDealers();

    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(fetchUrl).toContain("slug=dealer-locator");
    expect(fetchUrl).toContain("&_fields=acf");
  });

  test("calls fetch with next: { revalidate: 30 } for ISR caching", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockOkResponse([{ acf: { dealer_data: [] } }])
    );

    await getDealers();

    const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(fetchOptions).toBeDefined();
    expect(fetchOptions).toEqual(
      expect.objectContaining({ next: { revalidate: 30 } })
    );
  });

  test("returns [] when response is not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockNotOkResponse(500));

    const result = await getDealers();

    expect(result).toEqual([]);
  });

  test("returns [] when fetch throws", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("network failure")
    );

    const result = await getDealers();

    expect(result).toEqual([]);
  });

  test("returns [] when WP response is an empty array", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockOkResponse([]));

    const result = await getDealers();

    expect(result).toEqual([]);
  });

  test("returns [] when data[0].acf is missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockOkResponse([{}]));

    const result = await getDealers();

    expect(result).toEqual([]);
  });

  test("returns [] when data[0].acf.dealer_data is missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockOkResponse([{ acf: {} }])
    );

    const result = await getDealers();

    expect(result).toEqual([]);
  });

  test("returns [] when dealer_data is not an array", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockOkResponse([{ acf: { dealer_data: null } }])
    );

    const result = await getDealers();

    expect(result).toEqual([]);
  });

  test("defaults missing sub-fields to empty string", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockOkResponse([
        {
          acf: {
            dealer_data: [
              {
                dealer_name: "Casey Custom Docks",
                // dealer_address omitted on purpose
                dealer_phone: "770.924.1810",
                // dealer_web_url omitted on purpose
              },
            ],
          },
        },
      ])
    );

    const result = await getDealers();

    expect(result).toEqual([
      {
        name: "Casey Custom Docks",
        address: "",
        phone: "770.924.1810",
        website: "",
      },
    ]);
  });
});
