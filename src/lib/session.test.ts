import { describe, it, expect } from "vitest";
import { sessionOptions } from "./session";

describe("session configuration", () => {
  it("has a cookie name", () => {
    expect(sessionOptions.cookieName).toBe("openfleet-session");
  });

  it("sets TTL to 7 days", () => {
    expect(sessionOptions.ttl).toBe(60 * 60 * 24 * 7);
  });

  it("sets httpOnly cookies", () => {
    expect(sessionOptions.cookieOptions?.httpOnly).toBe(true);
  });

  it("sets sameSite to lax", () => {
    expect(sessionOptions.cookieOptions?.sameSite).toBe("lax");
  });

  it("requires a 32+ char password", () => {
    // The password should be at least 32 chars (iron-session requirement)
    const password = sessionOptions.password;
    if (typeof password === "string") {
      expect(password.length).toBeGreaterThanOrEqual(32);
    }
  });
});
