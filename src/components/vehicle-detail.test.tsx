import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
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
