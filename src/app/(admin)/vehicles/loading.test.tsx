import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VehiclesListLoading from "./loading";

// @criterion: AC-fix-loading-skeletons
describe("AC-fix-loading-skeletons: vehicles list loading skeleton", () => {
  it("renders a skeleton with data-testid", () => {
    render(<VehiclesListLoading />);
    expect(screen.getByTestId("vehicles-list-skeleton")).toBeTruthy();
  });

  it("renders animated pulse elements for table rows", () => {
    const { container } = render(<VehiclesListLoading />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(5);
  });
});

describe("REGRESSION: fix-loading-skeletons — list skeleton renders without error", () => {
  it("REGRESSION: fix-loading-skeletons — default export is a valid component", () => {
    const { container } = render(<VehiclesListLoading />);
    expect(container.firstChild).toBeTruthy();
  });
});
