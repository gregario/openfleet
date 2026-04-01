import { describe, it, expect } from "vitest";
import React from "react";
import { EmptyState } from "./empty-state";

describe("EmptyState component", () => {
  it("renders with title only", () => {
    const element = EmptyState({ title: "No vehicles" });
    expect(element).toBeTruthy();
  });

  it("renders with title and description", () => {
    const element = EmptyState({
      title: "No vehicles",
      description: "Add your first vehicle to get started.",
    });
    expect(element).toBeTruthy();
  });

  it("renders with action button", () => {
    const element = EmptyState({
      title: "No vehicles",
      action: { label: "Add Vehicle", href: "/vehicles/new" },
    });
    expect(element).toBeTruthy();
  });
});
