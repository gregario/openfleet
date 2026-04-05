/**
 * Alert generation from maintenance schedules.
 *
 * Pure functions + a Supabase-backed generator. Alerts fire when:
 *  - A schedule is overdue (mileage OR time) → CRITICAL
 *  - A schedule is within its warning threshold → WARNING
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface ScheduleForAlert {
  id: string;
  vehicle_id: string;
  service_type_id: string;
  service_type_name?: string | null;
  interval_km: number | null;
  interval_days: number | null;
  warning_km: number | null;
  warning_days: number | null;
  next_due_at: string | null;
  next_due_km: number | null;
  is_active: boolean;
}

export interface VehicleForAlert {
  id: string;
  name: string;
  odometer: number;
}

export interface GeneratedAlert {
  vehicle_id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  // stable dedupe key so repeated sweeps don't create duplicates
  dedupe_key: string;
}

/**
 * Decide whether a schedule should generate an alert, and at what severity.
 * Returns null if the schedule is OK.
 */
export function classifyScheduleAlert(
  schedule: ScheduleForAlert,
  currentOdometer: number,
  now: Date = new Date(),
): { severity: AlertSeverity; reason: string } | null {
  let overdueTime = false;
  let dueSoonTime = false;
  let overdueKm = false;
  let dueSoonKm = false;
  const reasons: string[] = [];

  if (schedule.next_due_at) {
    const due = new Date(schedule.next_due_at);
    if (due < now) {
      overdueTime = true;
      reasons.push(`overdue by ${Math.round((now.getTime() - due.getTime()) / (86400 * 1000))} days`);
    } else if (schedule.warning_days) {
      const warning = new Date(due);
      warning.setDate(warning.getDate() - schedule.warning_days);
      if (now >= warning) {
        dueSoonTime = true;
        reasons.push(`due in ${Math.ceil((due.getTime() - now.getTime()) / (86400 * 1000))} days`);
      }
    }
  }

  if (schedule.next_due_km != null) {
    if (currentOdometer >= schedule.next_due_km) {
      overdueKm = true;
      reasons.push(`${currentOdometer - schedule.next_due_km}km past due`);
    } else if (schedule.warning_km && currentOdometer >= schedule.next_due_km - schedule.warning_km) {
      dueSoonKm = true;
      reasons.push(`${schedule.next_due_km - currentOdometer}km until due`);
    }
  }

  if (overdueTime || overdueKm) {
    return { severity: "CRITICAL", reason: reasons.join("; ") };
  }
  if (dueSoonTime || dueSoonKm) {
    return { severity: "WARNING", reason: reasons.join("; ") };
  }
  return null;
}

/**
 * Pure: given a set of schedules + vehicles, produce the alerts that should
 * exist. Caller handles dedupe + persistence.
 */
export function deriveAlertsFromSchedules(
  schedules: ScheduleForAlert[],
  vehicles: VehicleForAlert[],
): GeneratedAlert[] {
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const alerts: GeneratedAlert[] = [];

  for (const schedule of schedules) {
    if (!schedule.is_active) continue;
    const vehicle = vehicleById.get(schedule.vehicle_id);
    if (!vehicle) continue;

    const classification = classifyScheduleAlert(schedule, vehicle.odometer);
    if (!classification) continue;

    const typeName = schedule.service_type_name ?? "Service";
    alerts.push({
      vehicle_id: schedule.vehicle_id,
      type: "service_due",
      severity: classification.severity,
      title: `${typeName} ${classification.severity === "CRITICAL" ? "overdue" : "due soon"}`,
      message: `${vehicle.name}: ${typeName} — ${classification.reason}`,
      dedupe_key: `service_due:${schedule.id}:${classification.severity}`,
    });
  }

  return alerts;
}

/**
 * Classify a driver's license expiry against warning thresholds.
 * Returns null when the license is fine (or not on file).
 */
export function classifyLicenseAlert(
  expiryIso: string | null,
  now: Date = new Date(),
  warningDays: number = 30,
): { severity: AlertSeverity; reason: string } | null {
  if (!expiryIso) return null;
  const expiry = new Date(expiryIso);
  const days = Math.ceil((expiry.getTime() - now.getTime()) / 86400_000);
  if (days < 0) return { severity: "CRITICAL", reason: `expired ${-days} days ago` };
  if (days <= warningDays) return { severity: "WARNING", reason: `expires in ${days} days` };
  return null;
}

/**
 * Scan schedules + vehicles and write new alerts for any that need attention.
 * Dedupes via a stable key encoded in the alert title/message so repeated
 * sweeps don't create duplicate rows.
 */
export async function generateServiceAlerts(
  supabase: SupabaseClient,
): Promise<{ created: number; skipped: number }> {
  const [schedulesRes, vehiclesRes] = await Promise.all([
    supabase
      .from("service_schedules")
      .select(
        "id,vehicle_id,service_type_id,interval_km,interval_days,warning_km,warning_days,next_due_at,next_due_km,is_active",
      )
      .eq("is_active", true),
    supabase.from("vehicles").select("id,name,odometer").neq("status", "DECOMMISSIONED"),
  ]);

  const schedules = (schedulesRes.data ?? []) as ScheduleForAlert[];
  const vehicles = (vehiclesRes.data ?? []) as VehicleForAlert[];

  // Join service type names
  const typeIds = Array.from(new Set(schedules.map((s) => s.service_type_id)));
  const { data: types } = await supabase
    .from("service_types")
    .select("id,name")
    .in("id", typeIds.length > 0 ? typeIds : ["__empty__"]);
  const typeNameById = new Map(
    ((types ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]),
  );
  for (const s of schedules) {
    s.service_type_name = typeNameById.get(s.service_type_id) ?? null;
  }

  const derived = deriveAlertsFromSchedules(schedules, vehicles);

  // Dedupe against existing undismissed alerts for the same type+vehicle+severity
  const { data: existingAlerts } = await supabase
    .from("alerts")
    .select("type,vehicle_id,severity,title,message,is_dismissed")
    .eq("type", "service_due")
    .eq("is_dismissed", false);

  const existingKeys = new Set(
    ((existingAlerts ?? []) as Array<{ vehicle_id: string; severity: string; message: string }>).map(
      (a) => `${a.vehicle_id}:${a.severity}:${a.message}`,
    ),
  );

  let created = 0;
  let skipped = 0;

  for (const alert of derived) {
    const key = `${alert.vehicle_id}:${alert.severity}:${alert.message}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from("alerts").insert({
      vehicle_id: alert.vehicle_id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      is_dismissed: false,
    });
    if (!error) created++;
  }

  // Driver licence expiry alerts
  const { data: driversData } = await supabase
    .from("users")
    .select("id,name,license_expiry")
    .eq("role", "DRIVER");
  const drivers = (driversData ?? []) as Array<{
    id: string;
    name: string;
    license_expiry: string | null;
  }>;

  const { data: existingLicenseAlerts } = await supabase
    .from("alerts")
    .select("message,severity")
    .eq("type", "license_expiring")
    .eq("is_dismissed", false);
  const existingLicenseKeys = new Set(
    ((existingLicenseAlerts ?? []) as Array<{ severity: string; message: string }>).map(
      (a) => `${a.severity}:${a.message}`,
    ),
  );

  for (const driver of drivers) {
    const result = classifyLicenseAlert(driver.license_expiry);
    if (!result) continue;
    const message = `${driver.name}: licence ${result.reason}`;
    const key = `${result.severity}:${message}`;
    if (existingLicenseKeys.has(key)) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from("alerts").insert({
      vehicle_id: null,
      type: "license_expiring",
      severity: result.severity,
      title: `Driver licence ${result.severity === "CRITICAL" ? "expired" : "expiring soon"}`,
      message,
      is_dismissed: false,
    });
    if (!error) created++;
  }

  return { created, skipped };
}
