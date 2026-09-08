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
