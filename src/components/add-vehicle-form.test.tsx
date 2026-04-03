import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor, cleanup } from "@testing-library/react";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { AddVehicleForm } from "./add-vehicle-form";

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/vehicle name/i), { target: { value: "Van 1" } });
  fireEvent.change(screen.getByLabelText(/make/i), { target: { value: "Ford" } });
  fireEvent.change(screen.getByLabelText(/model/i), { target: { value: "Transit" } });
  fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "2022" } });
  fireEvent.change(screen.getByLabelText(/license plate/i), { target: { value: "AB12 CDE" } });
}

// @criterion: fa2-add-vehicle-form
describe("AddVehicleForm", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders all required fields", () => {
    render(<AddVehicleForm />);

    expect(screen.getByLabelText(/vehicle name/i)).toBeTruthy();
    expect(screen.getByLabelText(/make/i)).toBeTruthy();
    expect(screen.getByLabelText(/model/i)).toBeTruthy();
    expect(screen.getByLabelText(/year/i)).toBeTruthy();
    expect(screen.getByLabelText(/license plate/i)).toBeTruthy();
    expect(screen.getByLabelText(/odometer/i)).toBeTruthy();
  });

  it("renders optional fields (VIN, color, photo)", () => {
    render(<AddVehicleForm />);

    expect(screen.getByLabelText(/vin/i)).toBeTruthy();
    expect(screen.getByLabelText(/color/i)).toBeTruthy();
    expect(screen.getByLabelText(/photo/i)).toBeTruthy();
  });

  it("has a submit button labeled 'Add Vehicle'", () => {
    render(<AddVehicleForm />);

    expect(screen.getByRole("button", { name: /add vehicle/i })).toBeTruthy();
  });

  it("shows validation error when submitting empty form", async () => {
    render(<AddVehicleForm />);

    // Clear the default year value to trigger validation
    fireEvent.change(screen.getByLabelText(/vehicle name/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    await waitFor(() => {
      expect(screen.getByText(/vehicle name is required/i)).toBeTruthy();
    });
  });

  it("submits valid form data to /api/vehicles", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ vehicle: { id: "v-1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<AddVehicleForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/vehicles", expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }));
    });
  });

  it("disables submit button while submitting", async () => {
    let resolvePromise: (value: Response) => void;
    vi.mocked(global.fetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolvePromise = resolve; }),
    );

    render(<AddVehicleForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /saving/i });
      expect(btn.hasAttribute("disabled")).toBe(true);
    });

    resolvePromise!(
      new Response(JSON.stringify({ vehicle: { id: "v-1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("shows server error message on failure", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<AddVehicleForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toMatch(/failed/i);
    });
  });

  it("includes photo upload input that accepts image files", () => {
    render(<AddVehicleForm />);

    const photoInput = screen.getByLabelText(/photo/i);
    expect(photoInput.getAttribute("type")).toBe("file");
    expect(photoInput.getAttribute("accept")).toBe("image/jpeg,image/png,image/webp,image/gif");
  });

  it("has a cancel link back to vehicle list", () => {
    render(<AddVehicleForm />);

    const cancelLink = screen.getByRole("link", { name: /cancel/i });
    expect(cancelLink.getAttribute("href")).toBe("/vehicles");
  });

  // @criterion: AC-fix-add-vehicle-form-ux-4 — Required fields marked with asterisk (*)
  describe("required/optional field markers", () => {
    it("marks required fields with asterisk (*)", () => {
      render(<AddVehicleForm />);

      const requiredFields = ["Vehicle Name", "Make", "Model", "Year", "License Plate", "Odometer"];
      for (const field of requiredFields) {
        const label = screen.getByText((_content, element) =>
          element?.tagName === "LABEL" && !!element.textContent?.includes(field) && !!element.textContent?.includes("*")
        );
        expect(label).toBeTruthy();
      }
    });

    // @criterion: AC-fix-add-vehicle-form-ux-5 — Optional fields with '(optional)' suffix
    it("marks optional fields with '(optional)' suffix", () => {
      render(<AddVehicleForm />);

      const optionalFields = ["VIN", "Color", "Photo"];
      for (const field of optionalFields) {
        const label = screen.getByText((_content, element) =>
          element?.tagName === "LABEL" && !!element.textContent?.includes(field) && !!element.textContent?.includes("(optional)")
        );
        expect(label).toBeTruthy();
      }
    });

    // @criterion: AC-fix-add-vehicle-form-ux-6 — Legend '* Required' visible at top of form
    it("shows '* Required' legend at top of form", () => {
      render(<AddVehicleForm />);

      expect(screen.getByText(/\* required/i)).toBeTruthy();
    });
  });

  // @criterion: AC-fix-add-vehicle-form-ux-2 — Inline warning when photo upload fails but vehicle creation succeeds
  // @criterion: AC-fix-add-vehicle-form-ux-3 — Vehicle saved correctly despite photo upload failure
  describe("photo upload failure warning", () => {
    it("shows inline warning when photo upload fails but vehicle saves successfully", async () => {
      // First call: photo upload fails
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(new Response("error", { status: 500 }))
        // Second call: vehicle creation succeeds
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ vehicle: { id: "v-1" } }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }),
        );

      render(<AddVehicleForm />);
      fillValidForm();

      // Simulate selecting a photo file
      const photoInput = screen.getByLabelText(/photo/i);
      const file = new File(["photo"], "van.jpg", { type: "image/jpeg" });
      fireEvent.change(photoInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeTruthy();
        expect(screen.getByText(/photo.*could not be uploaded/i)).toBeTruthy();
      });
    });

    it("saves vehicle with null photoUrl when photo upload fails", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(new Response("error", { status: 500 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ vehicle: { id: "v-1" } }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }),
        );

      render(<AddVehicleForm />);
      fillValidForm();

      const photoInput = screen.getByLabelText(/photo/i);
      const file = new File(["photo"], "van.jpg", { type: "image/jpeg" });
      fireEvent.change(photoInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

      await waitFor(() => {
        const vehicleCall = vi.mocked(global.fetch).mock.calls.find(
          (call) => call[0] === "/api/vehicles"
        );
        expect(vehicleCall).toBeTruthy();
        const body = JSON.parse((vehicleCall![1] as RequestInit).body as string);
        expect(body.photoUrl).toBeUndefined();
      });
    });
  });

  // @criterion: AC-fix-add-vehicle-form-ux-1 — Success toast on redirect
  describe("success redirect", () => {
    it("redirects to vehicles page with created vehicle name in URL", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ vehicle: { id: "v-1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      render(<AddVehicleForm />);
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining("/vehicles?created=")
        );
      });
    });
  });
});
