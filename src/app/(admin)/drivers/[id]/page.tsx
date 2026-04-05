import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/db';
import { DriverAssignmentControls } from '@/components/driver-assignment-controls';

interface DriverRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  vehicle_id: string;
  type: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

interface VehicleRow {
  id: string;
  name: string;
  license_plate: string;
  status: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: driverData } = await supabase
    .from('users')
    .select('id,name,email,phone,license_number,license_expiry,created_at')
    .eq('id', id)
    .eq('role', 'DRIVER')
    .maybeSingle();
  const driver = driverData as DriverRow | null;

  if (!driver) notFound();

  const { data: assignmentsData } = await supabase
    .from('driver_assignments')
    .select('id,vehicle_id,type,started_at,ended_at,is_active')
    .eq('user_id', id)
    .order('started_at', { ascending: false });
  const assignments = (assignmentsData ?? []) as AssignmentRow[];

  const vehicleIds = Array.from(new Set(assignments.map((a) => a.vehicle_id)));
  const { data: vehiclesData } = await supabase
    .from('vehicles')
    .select('id,name,license_plate,status')
    .in('id', vehicleIds.length > 0 ? vehicleIds : ['__empty__']);
  const vehicleMap = new Map(((vehiclesData ?? []) as VehicleRow[]).map((v) => [v.id, v]));

  // All vehicles for assignment dropdown
  const { data: allVehiclesData } = await supabase
    .from('vehicles')
    .select('id,name,license_plate,status')
    .eq('status', 'ACTIVE')
    .order('name', { ascending: true });
  const allVehicles = (allVehiclesData ?? []) as VehicleRow[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/drivers" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
          ← Drivers
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{driver.name}</h1>
        <p className="text-sm text-slate-500">{driver.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Phone" value={driver.phone ?? '—'} />
        <Stat label="Licence #" value={driver.license_number ?? '—'} />
        <Stat label="Licence expiry" value={formatDate(driver.license_expiry)} />
        <Stat label="Joined" value={formatDate(driver.created_at)} />
      </div>

      <DriverAssignmentControls
        driverId={driver.id}
        currentActive={assignments.filter((a) => a.is_active)}
        availableVehicles={allVehicles}
        vehicleNames={Object.fromEntries(
          Array.from(vehicleMap.entries()).map(([id, v]) => [id, `${v.name} · ${v.license_plate}`]),
        )}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Assignment history</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No vehicle assignments yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Vehicle</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Ended</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assignments.map((a) => {
                  const v = vehicleMap.get(a.vehicle_id);
                  return (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-900">
                        {v ? `${v.name} · ${v.license_plate}` : a.vehicle_id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-600">{a.type}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(a.started_at)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(a.ended_at)}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {a.is_active ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            Ended
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
