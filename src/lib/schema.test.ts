import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Prisma schema", () => {
  const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  it("exists and is non-empty", () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it("uses postgresql provider", () => {
    expect(schema).toContain('provider   = "postgresql"');
  });

  it("enables postgis extension", () => {
    expect(schema).toContain("extensions = [postgis]");
  });

  it("defines all core models", () => {
    const requiredModels = [
      "User",
      "Session",
      "Vehicle",
      "Position",
      "Trip",
      "DriverAssignment",
      "ServiceType",
      "ServiceSchedule",
      "MaintenanceRecord",
      "InspectionTemplate",
      "InspectionTemplateItem",
      "Inspection",
      "InspectionResponse",
      "Document",
      "Alert",
      "AuditLog",
      "Setting",
    ];

    for (const model of requiredModels) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("defines Role enum with ADMIN and DRIVER", () => {
    expect(schema).toContain("enum Role {");
    expect(schema).toContain("ADMIN");
    expect(schema).toContain("DRIVER");
  });

  it("defines VehicleStatus enum", () => {
    expect(schema).toContain("enum VehicleStatus {");
    expect(schema).toContain("ACTIVE");
    expect(schema).toContain("IN_SHOP");
    expect(schema).toContain("DECOMMISSIONED");
  });

  it("defines TrafficLight enum", () => {
    expect(schema).toContain("enum TrafficLight {");
    expect(schema).toContain("GREEN");
    expect(schema).toContain("ORANGE");
    expect(schema).toContain("RED");
  });

  it("defines MotionState enum", () => {
    expect(schema).toContain("enum MotionState {");
    expect(schema).toContain("MOVING");
    expect(schema).toContain("IDLE");
    expect(schema).toContain("PARKED");
  });

  it("maps User to users table", () => {
    expect(schema).toContain('@@map("users")');
  });

  it("maps Vehicle to vehicles table", () => {
    expect(schema).toContain('@@map("vehicles")');
  });

  it("has indexes on high-query columns", () => {
    // Position lookups by vehicle+time
    expect(schema).toContain("@@index([vehicleId, timestamp])");
    // Trip lookups by vehicle+start
    expect(schema).toContain("@@index([vehicleId, startTime])");
    // Alert filtering
    expect(schema).toContain("@@index([severity, isDismissed])");
  });
});
