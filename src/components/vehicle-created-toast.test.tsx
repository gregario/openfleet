import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

const mockGet = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

import { VehicleCreatedToast } from "./vehicle-created-toast";

// @criterion: AC-fix-add-vehicle-form-ux-1
describe("VehicleCreatedToast", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows toast with vehicle name when 'created' search param is present", () => {
    mockGet.mockReturnValue("Ford Transit");

    render(<VehicleCreatedToast />);

    const toast = screen.getByRole("status");
    expect(toast.textContent).toBe("Ford Transit added to your fleet");
  });

  it("renders nothing when 'created' search param is absent", () => {
    mockGet.mockReturnValue(null);

    render(<VehicleCreatedToast />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("auto-dismisses after 5 seconds", () => {
    mockGet.mockReturnValue("Ford Transit");

    render(<VehicleCreatedToast />);

    expect(screen.getByRole("status")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });
});
