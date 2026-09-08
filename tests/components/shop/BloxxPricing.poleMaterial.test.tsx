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
