import { supabase } from '@/lib/db';
import { DashboardMap } from '@/components/dashboard-map';
import { AlertsWidget } from '@/components/alerts-widget';

export default async function DashboardPage() {
  // Fetch vehicles with latest position (stored on vehicle row during ingestion)
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate, traffic_light, motion_state, latest_latitude, latest_longitude, latest_speed, latest_heading, latest_position_at')
    .neq('status', 'DECOMMISSIONED')
    .order('name', { ascending: true });

  const vehicleList = vehicles ?? [];
  const vehicleIds = vehicleList.map((v: { id: string }) => v.id);

  // Fetch active driver assignments
  const driverNameByVehicle = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const { data: assignments } = await supabase
      .from('driver_assignments')
      .select('vehicle_id, users(name)')
      .in('vehicle_id', vehicleIds)
      .eq('is_active', true);

    for (const a of assignments ?? []) {
      if (!driverNameByVehicle.has(a.vehicle_id)) {
        const user = Array.isArray(a.users) ? a.users[0] : a.users;
        if (user?.name) driverNameByVehicle.set(a.vehicle_id, user.name);
      }
    }
  }

  const vehiclesWithPosition = vehicleList.map((v: {
    id: string;
    name: string;
    license_plate: string;
    traffic_light: string;
    motion_state: string;
    latest_latitude: number | null;
    latest_longitude: number | null;
    latest_speed: number | null;
    latest_heading: number | null;
    latest_position_at: string | null;
  }) => ({
    id: v.id,
    name: v.name,
    licensePlate: v.license_plate,
    trafficLight: v.traffic_light as 'GREEN' | 'ORANGE' | 'RED',
    motionState: v.motion_state as 'MOVING' | 'IDLE' | 'PARKED',
    driverName: driverNameByVehicle.get(v.id) ?? null,
    latestPosition: v.latest_latitude != null && v.latest_longitude != null
      ? {
          latitude: v.latest_latitude,
          longitude: v.latest_longitude,
          speed: v.latest_speed,
          heading: v.latest_heading,
          timestamp: v.latest_position_at,
        }
      : null,
  }));

  return (
    <div className="flex h-full gap-4">
      {/* Map area — ~70% width */}
      <div className="flex-[7] rounded-lg border border-slate-200 bg-white overflow-hidden">
        <DashboardMap initialVehicles={vehiclesWithPosition} />
      </div>

      {/* Status sidebar — ~30% width */}
      <div className="flex-[3] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
        <AlertsWidget />
      </div>
    </div>
  );
}
