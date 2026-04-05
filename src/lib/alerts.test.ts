import { describe, it, expect } from "vitest";
import {
  classifyScheduleAlert,
  classifyLicenseAlert,
  deriveAlertsFromSchedules,
  type ScheduleForAlert,
  type VehicleForAlert,
} from "./alerts";

const now = new Date("2026-04-05T12:00:00.000Z");
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400_000).toISOString();

function sched(overrides: Partial<ScheduleForAlert> = {}): ScheduleForAlert {
  return {
    id: "sch-1",
    vehicle_id: "v1",
    service_type_id: "st-1",
    service_type_name: "Oil Change",
    interval_km: 10000,
    interval_days: 365,
    warning_km: 500,
    warning_days: 14,
    next_due_at: daysFromNow(30),
    next_due_km: 50000,
    is_active: true,
    ...overrides,
  };
}

describe("classifyScheduleAlert", () => {
  it("returns null when OK (not near due by km or time)", () => {
    expect(classifyScheduleAlert(sched(), 40000, now)).toBeNull();
  });

  it("returns CRITICAL when past due by time", () => {
    const s = sched({ next_due_at: daysFromNow(-5) });
    expect(classifyScheduleAlert(s, 40000, now)?.severity).toBe("CRITICAL");
  });

  it("returns CRITICAL when past due by km", () => {
    const s = sched({ next_due_km: 40000 });
    expect(classifyScheduleAlert(s, 41000, now)?.severity).toBe("CRITICAL");
  });

  it("returns WARNING when within warning window by time", () => {
    const s = sched({ next_due_at: daysFromNow(10), warning_days: 14 });
    expect(classifyScheduleAlert(s, 40000, now)?.severity).toBe("WARNING");
  });

  it("returns WARNING when within warning window by km", () => {
    const s = sched({ next_due_km: 50000, warning_km: 500 });
    expect(classifyScheduleAlert(s, 49800, now)?.severity).toBe("WARNING");
  });

  it("returns null when outside warning window", () => {
    const s = sched({ next_due_at: daysFromNow(30), warning_days: 14 });
    expect(classifyScheduleAlert(s, 40000, now)).toBeNull();
  });

  it("escalates to CRITICAL when EITHER dimension is overdue", () => {
    const s = sched({ next_due_at: daysFromNow(10), next_due_km: 40000 });
    // time is WARNING, km is CRITICAL → result should be CRITICAL
    const result = classifyScheduleAlert(s, 41000, now);
    expect(result?.severity).toBe("CRITICAL");
  });
});

describe("deriveAlertsFromSchedules", () => {
  const vehicles: VehicleForAlert[] = [
    { id: "v1", name: "Van Alpha", odometer: 49800 },
    { id: "v2", name: "Van Bravo", odometer: 20000 },
  ];

  it("produces no alerts when all schedules are OK", () => {
    const alerts = deriveAlertsFromSchedules(
      [sched({ vehicle_id: "v2", next_due_km: 50000, warning_km: 500 })],
      vehicles,
    );
    expect(alerts).toHaveLength(0);
  });

  it("produces a WARNING alert for a due-soon schedule", () => {
    const alerts = deriveAlertsFromSchedules(
      [sched({ id: "sch-1", vehicle_id: "v1", next_due_km: 50000, warning_km: 500 })],
      vehicles,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("WARNING");
    expect(alerts[0].vehicle_id).toBe("v1");
    expect(alerts[0].title).toContain("Oil Change");
    expect(alerts[0].message).toContain("Van Alpha");
  });

  it("skips inactive schedules", () => {
    const alerts = deriveAlertsFromSchedules(
      [sched({ is_active: false, next_due_km: 40000 })],
      vehicles,
    );
    expect(alerts).toHaveLength(0);
  });

  it("skips schedules whose vehicle is missing", () => {
    const alerts = deriveAlertsFromSchedules(
      [sched({ vehicle_id: "unknown", next_due_km: 10 })],
      vehicles,
    );
    expect(alerts).toHaveLength(0);
  });
});

describe("classifyLicenseAlert", () => {
  it("returns null when no expiry on file", () => {
    expect(classifyLicenseAlert(null, now)).toBeNull();
  });

  it("returns null when licence expires outside warning window", () => {
    expect(classifyLicenseAlert(daysFromNow(90), now, 30)).toBeNull();
  });

  it("returns WARNING when expiring within warning window", () => {
    expect(classifyLicenseAlert(daysFromNow(15), now, 30)?.severity).toBe("WARNING");
  });

  it("returns CRITICAL when already expired", () => {
    expect(classifyLicenseAlert(daysFromNow(-3), now, 30)?.severity).toBe("CRITICAL");
  });
});
