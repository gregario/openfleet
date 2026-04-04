import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VehicleDetailLoading from "./loading";

// @criterion: AC-fix-loading-skeletons
describe("AC-fix-loading-skeletons: vehicle detail loading skeleton", () => {
  it("renders a skeleton with data-testid", () => {
    render(<VehicleDetailLoading />);
    expect(screen.getByTestId("vehicle-detail-skeleton")).toBeTruthy();
  });

  it("renders animated pulse elements", () => {
    const { container } = render(<VehicleDetailLoading />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(3);
  });
});

describe("REGRESSION: fix-loading-skeletons — detail skeleton renders without error", () => {
  it("REGRESSION: fix-loading-skeletons — default export is a valid component", () => {
    const { container } = render(<VehicleDetailLoading />);
    expect(container.firstChild).toBeTruthy();
  });
});
