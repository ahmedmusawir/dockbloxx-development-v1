/**
 * Unit tests for fetchPoleMaterials() (Ticket 3) at the global.fetch boundary.
 * CONTRACT fallbacks: missing key → "", non-OK response → both "", network error → both "".
 */

import { fetchPoleMaterials } from "@/services/productServices";

describe("fetchPoleMaterials", () => {
  const originalFetch = global.fetch;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    global.fetch = jest.fn();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleError.mockRestore();
  });

  const okResponse = (body: unknown) =>
    ({ ok: true, statusText: "OK", json: async () => body }) as unknown as Response;

  test("returns both labels verbatim from data.acf", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ acf: { metal: "Metal", wood: "Wood" } })
    );

    await expect(fetchPoleMaterials()).resolves.toEqual({ metal: "Metal", wood: "Wood" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("/wp-json/acf/v3/options/options");
  });

  test("a missing key becomes an empty string", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ acf: { metal: "Metal" } }));

    await expect(fetchPoleMaterials()).resolves.toEqual({ metal: "Metal", wood: "" });
  });

  test("no acf object at all → both empty", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({}));

    await expect(fetchPoleMaterials()).resolves.toEqual({ metal: "", wood: "" });
  });

  test("non-OK response → both empty, never throws", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      { ok: false, statusText: "Service Unavailable", json: async () => ({}) } as unknown as Response
    );

    await expect(fetchPoleMaterials()).resolves.toEqual({ metal: "", wood: "" });
    expect(consoleError).toHaveBeenCalled();
  });

  test("network error → both empty, never throws", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("ECONNRESET"));

    await expect(fetchPoleMaterials()).resolves.toEqual({ metal: "", wood: "" });
  });
});
