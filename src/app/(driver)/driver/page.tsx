import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { supabase } from '@/lib/db';
import { requireDriver } from '@/lib/auth';

interface AssignmentRow {
  vehicle_id: string;
  type: string;
  started_at: string;
}

interface VehicleRow {
  id: string;
  name: string;
  make: string;
  model: string;
  license_plate: string;
  odometer: number;
  latest_position_at: string | null;
}

export default async function DriverHomePage() {
  const session = await requireDriver();

  // Fetch all active assignments for this driver
  const { data: assignmentsData } = await supabase
    .from('driver_assignments')
    .select('vehicle_id,type,started_at')
    .eq('user_id', session.userId)
    .eq('is_active', true);
  const assignments = (assignmentsData ?? []) as AssignmentRow[];

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">My Vehicle</h1>
        <EmptyState
          title="No vehicle assigned"
          description="Your assigned vehicle will appear here once set up by your admin."
        />
      </div>
    );
  }

  // Fetch vehicle details
  const { data: vehiclesData } = await supabase
    .from('vehicles')
    .select('id,name,make,model,license_plate,odometer,latest_position_at')
    .in('id', assignments.map((a) => a.vehicle_id));
  const vehicles = (vehiclesData ?? []) as VehicleRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My Vehicle{vehicles.length > 1 ? 's' : ''}</h1>
      <ul className="space-y-3">
        {vehicles.map((v) => {
          const assignment = assignments.find((a) => a.vehicle_id === v.id);
          return (
            <li key={v.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{v.name}</h2>
                  <p className="text-sm text-slate-600">
                    {v.make} {v.model} · {v.license_plate}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Odometer: {v.odometer.toLocaleString()}km
                  </p>
                </div>
                {assignment && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {assignment.type === 'ASSIGNED' ? 'Primary' : 'Pool'}
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/driver/inspection"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Pre-trip inspection
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
