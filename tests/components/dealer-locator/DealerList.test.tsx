/**
 * Unit tests for DealerList — src/app/(public)/dealer-locator/DealerList.tsx
 *
 * Tests the client-side substring search filter behavior (introduced
 * 2026-06-11) by rendering the actual component and driving the input.
 * The filter predicate (`d.name.toLowerCase().includes(query.toLowerCase())`)
 * is inline in the component's render body and not importable as a pure
 * function — exercising it via render + simulated typing is the cleanest
 * no-source-refactor approach.
 *
 * Mocking: none. The component is pure props-in / JSX-out — no fetches,
 * no context, no hooks beyond useState. react-icons SVGs render fine in
 * jsdom; no icon-mock needed.
 *
 * Coverage: case-insensitive substring match, partial-match (not prefix),
 * empty query shows all, no match shows empty state, clear restores all.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DealerList from "@/app/(public)/dealer-locator/DealerList";
import { Dealer } from "@/types/dealer";

const fixture: Dealer[] = [
  {
    name: "Lake Life Solutions TN",
    address: "11310 Hwy 57 Counce TN 38326",
    phone: "901-326-5108",
    website: "https://lakelifesolutionsllc.com",
  },
  {
    name: "Lake Life Outdoor Furniture",
    address: "3613 Osage Beach Pkwy",
    phone: "573.693.9271",
    website: "https://www.lakelifeoutdoorfurniture.com",
  },
  {
    name: "Xtreme Docks Alabama",
    address: "364 Killough La. Talladega AL 35160",
    phone: "205-473-8096",
    website: "https://www.xtremedocks.com",
  },
  {
    name: "Dock Solutions of Kentucky",
    address: "1728 Jaggie Fox Way Lexington KY 40511",
    phone: "859-695-2580",
    website: "https://www.kydocks.com",
  },
];

function getDealerCardNames(): string[] {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent ?? "");
}

describe("DealerList — substring search filter", () => {
  test("renders all dealers when query is empty", () => {
    render(<DealerList dealers={fixture} />);

    expect(getDealerCardNames()).toHaveLength(4);
  });

  test("filters by case-insensitive substring on dealer.name", async () => {
    const user = userEvent.setup();
    render(<DealerList dealers={fixture} />);

    await user.type(screen.getByPlaceholderText(/search dealers/i), "lake");

    const names = getDealerCardNames();
    expect(names).toHaveLength(2);
    expect(names).toEqual(
      expect.arrayContaining([
        "Lake Life Solutions TN",
        "Lake Life Outdoor Furniture",
      ])
    );
  });

  test("matches partial/substring, not just prefix", async () => {
    const user = userEvent.setup();
    render(<DealerList dealers={fixture} />);

    // "ock" appears mid-word in "Docks" and at the start of "Dock"
    await user.type(screen.getByPlaceholderText(/search dealers/i), "ock");

    const names = getDealerCardNames();
    expect(names).toHaveLength(2);
    expect(names).toEqual(
      expect.arrayContaining([
        "Xtreme Docks Alabama",
        "Dock Solutions of Kentucky",
      ])
    );
  });

  test("ignores case in both directions (uppercase query, mixed-case names)", async () => {
    const user = userEvent.setup();
    render(<DealerList dealers={fixture} />);

    await user.type(screen.getByPlaceholderText(/search dealers/i), "LAKE");

    expect(getDealerCardNames()).toHaveLength(2);
  });

  test("shows empty-state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<DealerList dealers={fixture} />);

    await user.type(screen.getByPlaceholderText(/search dealers/i), "zzz");

    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(
      screen.getByText("No dealers match your search.")
    ).toBeInTheDocument();
  });

  test("re-shows all dealers when query is cleared", async () => {
    const user = userEvent.setup();
    render(<DealerList dealers={fixture} />);

    const input = screen.getByPlaceholderText(/search dealers/i);
    await user.type(input, "lake");
    expect(getDealerCardNames()).toHaveLength(2);

    await user.clear(input);
    expect(getDealerCardNames()).toHaveLength(4);
  });
});
