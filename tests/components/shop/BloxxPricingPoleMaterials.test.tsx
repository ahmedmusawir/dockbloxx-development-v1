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
