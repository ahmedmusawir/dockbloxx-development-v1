# Ticket 3 — Phase 1 Step 7: Tests (Ironman Rule) — PENDING_APPROVAL

**[CONFIRM: F]** runner = Jest 30 + ts-jest + jsdom (`jest.config.js`), `@/` alias mapped, `.env.local` loaded by `jest.setup.js`. Nearest precedents: `tests/store/useCartStore.test.ts` (createCartItem helper, store reset), `tests/components/cart/CartSlide.test.tsx` (RTL render, `next/link` unmocked works), `tests/api/get-coupon-by-code.test.ts` (global.fetch mock pattern). Existing tests are LF; new files LF.
**Ironman:** four NEW files, zero edits to existing tests or src. Existing 15 suites / 166 tests must stay identical.

## Diff 1 of 4 — NEW `tests/components/shop/BloxxPricingPoleMaterials.test.tsx`
```tsx
/**
 * Component tests for BloxxPricingPoleMaterials.tsx (Ticket 3 — Pole Material)
 * Reads labels from <script id="product-category-custom">; renders one bordered
 * button per non-empty label; nothing selected unless told; empty labels omitted.
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BloxxPricingPoleMaterials from "@/components/shop/product-page/variations/BloxxPricingPoleMaterials";

function injectCategoryJson(data: unknown) {
  const script = document.createElement("script");
  script.id = "product-category-custom";
  script.type = "application/json";
  script.textContent = JSON.stringify(data);
  document.body.appendChild(script);
}

const isSelected = (el: HTMLElement) => el.className.includes("bg-blue-600");

afterEach(() => {
  document.body.innerHTML = "";
});

describe("BloxxPricingPoleMaterials", () => {
  test("renders Metal and Wood buttons from the category JSON, none selected", () => {
    injectCategoryJson({ type: "bloxx", poleMaterials: { metal: "Metal", wood: "Wood" } });
    render(
      <BloxxPricingPoleMaterials selectedMaterial={null} onSelectionChange={jest.fn()} />
    );

    expect(screen.getByRole("heading", { name: "Pole Material" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Metal", "Wood"]);
    expect(buttons.some(isSelected)).toBe(false);
  });

  test("clicking a button reports the ACF label verbatim", () => {
    injectCategoryJson({ type: "bloxx", poleMaterials: { metal: "Metal", wood: "Wood" } });
    const onSelectionChange = jest.fn();
    render(
      <BloxxPricingPoleMaterials selectedMaterial={null} onSelectionChange={onSelectionChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Wood" }));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith("Wood");
  });

  test("only the selected material is highlighted", () => {
    injectCategoryJson({ type: "bloxx", poleMaterials: { metal: "Metal", wood: "Wood" } });
    render(
      <BloxxPricingPoleMaterials selectedMaterial="Wood" onSelectionChange={jest.fn()} />
    );

    expect(isSelected(screen.getByRole("button", { name: "Wood" }))).toBe(true);
    expect(isSelected(screen.getByRole("button", { name: "Metal" }))).toBe(false);
  });

  test("omits an option whose ACF value is empty", () => {
    injectCategoryJson({ type: "bloxx", poleMaterials: { metal: "Metal", wood: "" } });
    render(
      <BloxxPricingPoleMaterials selectedMaterial={null} onSelectionChange={jest.fn()} />
    );

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Metal"]);
  });

  test("renders nothing when both ACF values are empty", () => {
    injectCategoryJson({ type: "bloxx", poleMaterials: { metal: "", wood: "" } });
    const { container } = render(
      <BloxxPricingPoleMaterials selectedMaterial={null} onSelectionChange={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when the category JSON has no poleMaterials key", () => {
    injectCategoryJson({ type: "bloxx" });
    const { container } = render(
      <BloxxPricingPoleMaterials selectedMaterial={null} onSelectionChange={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
```

## Diff 2 of 4 — NEW `tests/components/shop/BloxxPricing.poleMaterial.test.tsx`
```tsx
/**
 * Integration tests for BloxxPricing.tsx — Pole Material cart write (Ticket 3)
 * Drives the real component with embedded variations + category JSON and a
 * functional setCartItem shim. Asserts the CONTRACT: exactly one
 * { name: "Pole Material" } entry at all times; "Unknown" seeded on mount;
 * selection preserved across shape / size changes; price + variation_id untouched.
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BloxxPricing from "@/components/shop/product-page/variations/BloxxPricing";
import { CartItem } from "@/types/cart";
import { ProductVariation } from "@/types/product";

const variation = (id: number, shape: string, size: string): ProductVariation => ({
  id,
  price: "299",
  regular_price: "299",
  sale_price: null,
  stock_status: "instock",
  sku: null,
  attributes: [
    { id: 1, name: "Pole Shape", option: shape },
    { id: 2, name: "Pole Size", option: size },
  ],
});

const VARIATIONS = [
  variation(101, "Square", '2"'),
  variation(102, "Square", '3"'),
  variation(103, "Round", "Other"),
];

const CATEGORY = {
  type: "bloxx",
  poleStyles: { round: "r.png", round_octagon: "ro.png", square: "s.png", square_octagon: "so.png" },
  poleMaterials: { metal: "Metal", wood: "Wood" },
};

function injectJson(id: string, data: unknown) {
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/json";
  script.textContent = JSON.stringify(data);
  document.body.appendChild(script);
}

function setup(category: unknown = CATEGORY) {
  injectJson("product-variations", VARIATIONS);
  injectJson("product-category-custom", category);

  let cartItem: CartItem = {
    id: 1,
    name: "Test Bloxx",
    price: 0,
    quantity: 1,
    image: "",
    categories: [],
    basePrice: 0,
    variations: [],
    customFields: [],
    metadata: {},
  };
  // Mimics React's functional setState so the component's updaters run for real
  const setCartItem = jest.fn((updater: CartItem | ((prev: CartItem) => CartItem)) => {
    cartItem = typeof updater === "function" ? updater(cartItem) : updater;
  });

  render(<BloxxPricing onPriceChange={jest.fn()} setCartItem={setCartItem as any} />);

  return {
    get cartItem() {
      return cartItem;
    },
  };
}

const poleMaterialEntries = (item: CartItem) =>
  item.variations.filter((v) => v.name === "Pole Material");

afterEach(() => {
  document.body.innerHTML = "";
});

describe("BloxxPricing — Pole Material cart write", () => {
  test("seeds exactly one Pole Material: Unknown on mount", () => {
    const h = setup();
    expect(poleMaterialEntries(h.cartItem)).toEqual([{ name: "Pole Material", value: "Unknown" }]);
  });

  test("selecting Wood writes exactly one Pole Material: Wood and leaves price/variation_id alone", () => {
    const h = setup();
    const { variation_id, basePrice } = h.cartItem;

    fireEvent.click(screen.getByRole("button", { name: "Wood" }));

    expect(poleMaterialEntries(h.cartItem)).toEqual([{ name: "Pole Material", value: "Wood" }]);
    expect(h.cartItem.variation_id).toBe(variation_id);
    expect(h.cartItem.basePrice).toBe(basePrice);
  });

  test("selection survives a Pole Size change and a Pole Shape change", () => {
    const h = setup();

    fireEvent.click(screen.getByRole("button", { name: "Wood" }));
    fireEvent.click(screen.getByRole("button", { name: '3"' }));
    expect(poleMaterialEntries(h.cartItem)).toEqual([{ name: "Pole Material", value: "Wood" }]);

    fireEvent.click(screen.getByRole("button", { name: "Round" }));
    expect(poleMaterialEntries(h.cartItem)).toEqual([{ name: "Pole Material", value: "Wood" }]);
  });

  test("switching material replaces the entry instead of adding a second one", () => {
    const h = setup();

    fireEvent.click(screen.getByRole("button", { name: "Wood" }));
    fireEvent.click(screen.getByRole("button", { name: "Metal" }));

    expect(poleMaterialEntries(h.cartItem)).toEqual([{ name: "Pole Material", value: "Metal" }]);
  });

  test("with no poleMaterials in the JSON the group is absent but Unknown is still seeded", () => {
    const h = setup({ type: "bloxx", poleStyles: CATEGORY.poleStyles });

    expect(screen.queryByRole("heading", { name: "Pole Material" })).not.toBeInTheDocument();
    expect(poleMaterialEntries(h.cartItem)).toEqual([{ name: "Pole Material", value: "Unknown" }]);
  });
});
```

## Diff 3 of 4 — NEW `tests/store/useCartStore.poleMaterial.test.ts`
```ts
/**
 * useCartStore — Pole Material line-item identity (Ticket 3, Step 6 evidence as a test)
 * Same product + same variation_id but different Pole Material must be two lines.
 */

import { useCartStore } from "@/store/useCartStore";
import { CartItem } from "@/types/cart";

function bloxxItem(material: string, overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 3157,
    name: "Who's Your Caddie?",
    slug: "whos-your-caddie",
    price: 299,
    quantity: 1,
    image: "caddie.jpg",
    categories: [],
    basePrice: 299,
    variation_id: 3182,
    variations: [
      { name: "Pole Shape", value: "Square" },
      { name: "Pole Style", value: "square" },
      { name: "Pole Size", value: '2"' },
      { name: "Version", value: "Unknown" },
      { name: "Pole Material", value: material },
    ],
    customFields: [],
    ...overrides,
  };
}

beforeEach(() => {
  useCartStore.setState({ cartItems: [], isCartOpen: false });
});

describe("useCartStore — Pole Material identity", () => {
  test("Wood and Metal with the same variation_id are separate line items (setOrReplaceCartItemQuantity)", () => {
    const { setOrReplaceCartItemQuantity } = useCartStore.getState();
    setOrReplaceCartItemQuantity(bloxxItem("Wood"));
    setOrReplaceCartItemQuantity(bloxxItem("Metal"));

    const { cartItems } = useCartStore.getState();
    expect(cartItems).toHaveLength(2);
    expect(cartItems.map((i) => i.variation_id)).toEqual([3182, 3182]);
    expect(
      cartItems.map((i) => i.variations.find((v) => v.name === "Pole Material")?.value)
    ).toEqual(["Wood", "Metal"]);
  });

  test("Wood and Metal are separate line items (addOrUpdateCartItem)", () => {
    const { addOrUpdateCartItem } = useCartStore.getState();
    addOrUpdateCartItem(bloxxItem("Wood"));
    addOrUpdateCartItem(bloxxItem("Metal"));

    expect(useCartStore.getState().cartItems).toHaveLength(2);
  });

  test("the same material twice stays one line", () => {
    const { setOrReplaceCartItemQuantity } = useCartStore.getState();
    setOrReplaceCartItemQuantity(bloxxItem("Wood"));
    setOrReplaceCartItemQuantity(bloxxItem("Wood", { quantity: 3 }));

    const { cartItems } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(3);
  });
});
```

## Diff 4 of 4 — NEW `tests/services/fetchPoleMaterials.test.ts`
```ts
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
```

## NOT touching
- Any existing test file, `jest.config.js`, `jest.setup.js`, any `src/` file. No new dependencies.

## Verification after apply
- `npx jest --ci`: expected **19 suites / 185 tests** (166 + 6 + 5 + 3 + 5). Existing 166 unchanged.
- `npx tsc --noEmit` (tests are outside `tsconfig` include? — will confirm; ts-jest type-checks them regardless).

→ Awaiting approval before applying.
