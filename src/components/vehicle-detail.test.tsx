import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor, act } from "@testing-library/react";
import { VehicleDetail, type VehicleDetailData } from "./vehicle-detail";

// Mock the mini-map to avoid WebGL dependency
vi.mock("./vehicle-mini-map", () => ({
  VehicleMiniMap: ({ vehicleName }: { vehicleName: string }) => (
    <div data-testid="vehicle-mini-map">{vehicleName} map</div>
  ),
}));

// Mock next/image to render a simple img
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

const baseVehicle: VehicleDetailData = {
  id: "v-1",
  name: "Van Alpha",
  make: "Ford",
  model: "Transit",
  year: 2022,
  vin: "1FTBW2CM5NKA12345",
  licensePlate: "AB12 CDE",
  color: "White",
  photoUrl: null,
  status: "ACTIVE",
  odometer: 45000,
  motionState: "PARKED",
  trafficLight: "GREEN",
  latestPosition: {
    latitude: 51.4545,
    longitude: -2.5879,
    speed: 0,
    heading: 90,
    timestamp: "2026-04-03T10:00:00Z",
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-04-03T10:00:00Z",
};

// @criterion: fa2-vehicle-detail-tabs
describe("VehicleDetail", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders vehicle name and basic info", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByText("Van Alpha")).toBeDefined();
    expect(screen.getByText(/Ford Transit 2022/)).toBeDefined();
    expect(screen.getByText("AB12 CDE")).toBeDefined();
  });

  it("renders all five tab buttons", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    const tablist = screen.getByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(tabs.map(t => t.textContent)).toEqual(["Overview", "Trips", "Maintenance", "Inspections", "Documents"]);
  });

  it("shows Overview tab as selected by default", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    const tablist = screen.getByRole("tablist");
    const overviewTab = within(tablist).getByRole("tab", { name: "Overview" });
    expect(overviewTab.getAttribute("aria-selected")).toBe("true");
  });

  it("switches tabs without page refresh (client-side)", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    const tablist = screen.getByRole("tablist");

    const tripsTab = within(tablist).getByRole("tab", { name: "Trips" });
    fireEvent.click(tripsTab);

    expect(tripsTab.getAttribute("aria-selected")).toBe("true");
    expect(within(tablist).getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("heading", { name: "Trip history" })).toBeDefined();
  });

  it("shows traffic light indicator with correct label for GREEN", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByText("All clear")).toBeDefined();
  });

  it("shows orange traffic light as Requires attention", () => {
    render(<VehicleDetail vehicle={{ ...baseVehicle, trafficLight: "ORANGE" }} />);
    expect(screen.getByText("Requires attention")).toBeDefined();
  });

  it("shows red traffic light as Overdue", () => {
    render(<VehicleDetail vehicle={{ ...baseVehicle, trafficLight: "RED" }} />);
    expect(screen.getByText("Overdue")).toBeDefined();
  });

  it("renders tabpanel with correct aria attributes", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel.getAttribute("aria-labelledby")).toBe("tab-overview");
  });

  it("renders back link to vehicle list", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    const backLink = screen.getByRole("link", { name: /vehicles/i });
    expect(backLink.getAttribute("href")).toBe("/vehicles");
  });

  it("AC-fix-status-display: shows human-readable status (not raw enum)", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    // Should show "Active" not "ACTIVE"
    const statusDD = screen.getByText("Active");
    expect(statusDD).toBeDefined();
    expect(screen.queryByText("ACTIVE")).toBeNull();
  });

  it("AC-fix-status-display: shows In Shop for IN_SHOP status", () => {
    render(<VehicleDetail vehicle={{ ...baseVehicle, status: "IN_SHOP" }} />);
    expect(screen.getByText("In Shop")).toBeDefined();
  });

  it("shows odometer formatted with locale", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByText("45,000 km")).toBeDefined();
  });

  it("shows VIN when present", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByText("1FTBW2CM5NKA12345")).toBeDefined();
  });

  it("shows mini-map when position is available", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByTestId("vehicle-mini-map")).toBeDefined();
  });

  it("shows no position message when latestPosition is null", () => {
    render(<VehicleDetail vehicle={{ ...baseVehicle, latestPosition: null }} />);
    expect(screen.getByText("No position data available")).toBeDefined();
  });

  it("switches to maintenance tab and shows placeholder", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    const tablist = screen.getByRole("tablist");
    fireEvent.click(within(tablist).getByRole("tab", { name: "Maintenance" }));
    expect(screen.getByRole("heading", { name: "Maintenance records" })).toBeDefined();
  });

  // AC-fix-photo-and-list-polish-1: Vehicle photo in detail header
  it("renders initial-letter placeholder when no photo", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByLabelText(/van alpha avatar/i)).toBeDefined();
    expect(screen.getByText("V")).toBeDefined();
  });

  it("renders vehicle photo in header when photoUrl exists", () => {
    render(<VehicleDetail vehicle={{ ...baseVehicle, photoUrl: "/uploads/van.jpg" }} />);
    const img = screen.getByRole("img", { name: /photo of van alpha/i });
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("/uploads/van.jpg");
  });
});

// @criterion: AC-fix-vehicle-edit — Edit mode, toast, cancel
describe("VehicleDetail edit mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for PUT requests
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // AC-1: Edit button visible on vehicle detail page header
  it("shows an Edit button in the header", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeDefined();
  });

  // AC-2: Edit mode shows pre-populated form with all editable fields including status dropdown
  it("clicking Edit switches to edit mode with pre-populated form fields", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Form fields should be pre-populated
    expect(screen.getByLabelText(/name/i)).toHaveProperty("value", "Van Alpha");
    expect(screen.getByLabelText(/make/i)).toHaveProperty("value", "Ford");
    expect(screen.getByLabelText(/model/i)).toHaveProperty("value", "Transit");
    expect(screen.getByLabelText(/year/i)).toHaveProperty("value", "2022");
    expect(screen.getByLabelText(/license plate/i)).toHaveProperty("value", "AB12 CDE");
    expect(screen.getByLabelText(/odometer/i)).toHaveProperty("value", "45000");
  });

  it("edit mode shows status dropdown with active/in-shop/decommissioned options", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const statusSelect = screen.getByLabelText(/status/i);
    expect(statusSelect).toBeDefined();

    const options = within(statusSelect as HTMLElement).getAllByRole("option");
    const optionValues = options.map((o) => (o as HTMLOptionElement).value);
    expect(optionValues).toContain("ACTIVE");
    expect(optionValues).toContain("IN_SHOP");
    expect(optionValues).toContain("DECOMMISSIONED");
  });

  // AC-4: Success toast shown after save, view returns to read-only mode
  it("shows success toast after save and returns to read-only mode", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ vehicle: { ...baseVehicle, name: "Van Beta" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Change the name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: "Van Beta" } });

    // Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Wait for toast and read-only return
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeDefined();
    });

    // Should be back in read-only mode (Edit button visible again)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit/i })).toBeDefined();
    });
  });

  // AC-5: Cancel discards changes and returns to read-only view
  it("cancel discards changes and returns to read-only view", () => {
    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Change the name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: "Modified Name" } });

    // Cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Should be back in read-only mode with original name
    expect(screen.getByText("Van Alpha")).toBeDefined();
    expect(screen.getByRole("button", { name: /edit/i })).toBeDefined();
  });
});

// @criterion: AC-edit-error — Save error handling
describe("VehicleDetail save error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // AC-edit-error-1: Error toast on save failure (HTTP error)
  it("shows error toast when PUT returns non-2xx status", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Validation failed" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Could not save changes. Please try again.")).toBeDefined();
    });
  });

  // AC-edit-error-2: Form remains in edit mode on failure
  it("preserves form state and stays in edit mode on save failure", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Modify a field
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: "Modified Van" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    // Form should still be visible with modified values
    expect(screen.getByLabelText(/name/i)).toHaveProperty("value", "Modified Van");
    // Edit button should NOT be visible (still in edit mode)
    expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull();
  });

  // AC-edit-error-3: Save button re-enables after failure
  it("re-enables Save button after failed save", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).not.toHaveProperty("disabled", true);
  });

  // AC-edit-error-5: Network error handled
  it("shows error toast on network error (fetch throws)", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Could not save changes. Please try again.")).toBeDefined();
    });

    // Form should still be in edit mode
    expect(screen.getByLabelText(/name/i)).toBeDefined();
  });

  // Regression: success path still works after adding error handling
  it("success path still shows success toast and exits edit mode", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ vehicle: { ...baseVehicle, name: "Van Beta" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Van Beta" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeDefined();
    });

    // Should be back in read-only mode
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit/i })).toBeDefined();
    });

    // No error alert should be present
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// AC-edit-error-4: Error toast auto-dismisses (isolated to avoid fake timer contamination)
describe("VehicleDetail error toast auto-dismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("auto-dismisses error toast after 5 seconds", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Error", { status: 500 }),
    );

    render(<VehicleDetail vehicle={baseVehicle} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Flush microtasks to let the fetch resolve and state update
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("alert")).toBeDefined();

    // Advance past the 5s dismiss timer and flush React updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.queryByRole("alert")).toBeNull();
  }, 10000);
});
