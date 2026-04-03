import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";
import { VehicleDetail, type VehicleDetailData } from "./vehicle-detail";

// Mock the mini-map to avoid WebGL dependency
vi.mock("./vehicle-mini-map", () => ({
  VehicleMiniMap: ({ vehicleName }: { vehicleName: string }) => (
    <div data-testid="vehicle-mini-map">{vehicleName} map</div>
  ),
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
