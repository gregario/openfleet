import { describe, it, expect } from "vitest";
import React from "react";
import { Loading } from "./loading";

describe("Loading component", () => {
  it("renders with default message", () => {
    const element = Loading({});
    expect(element).toBeTruthy();
  });

  it("renders with custom message", () => {
    const element = Loading({ message: "Fetching vehicles..." });
    expect(element).toBeTruthy();
  });
});
