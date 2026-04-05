import Link from 'next/link';
import { supabase } from '@/lib/db';
import { EmptyState } from '@/components/empty-state';

interface ScheduleRow {
  id: string;
  vehicle_id: string;
  service_type_id: string;
  interval_km: number | null;
  interval_days: number | null;
  warning_km: number | null;
  warning_days: number | null;
  estimated_cost: number | null;
  next_due_at: string | null;
  next_due_km: number | null;
  last_serviced_at: string | null;
}

interface VehicleRow {
  id: string;
  name: string;
  license_plate: string;
  odometer: number;
}

interface ServiceTypeRow {
  id: string;
  name: string;
}

type Status = 'overdue' | 'due-soon' | 'ok';

function computeStatus(
  schedule: ScheduleRow,
  odometer: number,
  now: Date,
): { status: Status; daysUntilDue: number | null; kmUntilDue: number | null } {
  let overdueTime = false;
  let dueSoonTime = false;
  let overdueKm = false;
  let dueSoonKm = false;
  let daysUntilDue: number | null = null;
  let kmUntilDue: number | null = null;

  if (schedule.next_due_at) {
    const due = new Date(schedule.next_due_at);
    daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / 86400_000);
    if (due < now) overdueTime = true;
    else if (schedule.warning_days && daysUntilDue <= schedule.warning_days) dueSoonTime = true;
  }
  if (schedule.next_due_km != null) {
    kmUntilDue = schedule.next_due_km - odometer;
    if (kmUntilDue < 0) overdueKm = true;
    else if (schedule.warning_km && kmUntilDue <= schedule.warning_km) dueSoonKm = true;
  }

  if (overdueTime || overdueKm) return { status: 'overdue', daysUntilDue, kmUntilDue };
  if (dueSoonTime || dueSoonKm) return { status: 'due-soon', daysUntilDue, kmUntilDue };
  return { status: 'ok', daysUntilDue, kmUntilDue };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function MaintenancePage() {
  const [{ data: schedulesData }, { data: vehiclesData }, { data: typesData }] = await Promise.all([
    supabase
      .from('service_schedules')
      .select('id,vehicle_id,service_type_id,interval_km,interval_days,warning_km,warning_days,estimated_cost,next_due_at,next_due_km,last_serviced_at')
      .eq('is_active', true),
    supabase
      .from('vehicles')
      .select('id,name,license_plate,odometer')
      .neq('status', 'DECOMMISSIONED'),
    supabase.from('service_types').select('id,name'),
  ]);

  const schedules = (schedulesData ?? []) as ScheduleRow[];
  const vehicles = (vehiclesData ?? []) as VehicleRow[];
  const types = (typesData ?? []) as ServiceTypeRow[];

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const typeMap = new Map(types.map((t) => [t.id, t.name]));

  const now = new Date();
  const enriched = schedules
    .map((s) => {
      const v = vehicleMap.get(s.vehicle_id);
      if (!v) return null;
      const { status, daysUntilDue, kmUntilDue } = computeStatus(s, v.odometer, now);
      return {
        ...s,
        vehicle: v,
        service_type_name: typeMap.get(s.service_type_id) ?? '—',
        status,
        daysUntilDue,
        kmUntilDue,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // Sort: overdue first, then due-soon, then ok. Within each, soonest due.
  const statusOrder: Record<Status, number> = { overdue: 0, 'due-soon': 1, ok: 2 };
  enriched.sort((a, b) => {
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
    const ad = a.daysUntilDue ?? Infinity;
    const bd = b.daysUntilDue ?? Infinity;
    return ad - bd;
  });

  const overdueCount = enriched.filter((e) => e.status === 'overdue').length;
  const dueSoonCount = enriched.filter((e) => e.status === 'due-soon').length;
  const okCount = enriched.filter((e) => e.status === 'ok').length;
  const totalEstimated = enriched
    .filter((e) => e.status !== 'ok')
    .reduce((sum, e) => sum + (e.estimated_cost ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
      <p className="text-sm text-slate-500">All upcoming and overdue service schedules across the fleet.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Overdue" value={String(overdueCount)} tone="red" />
        <Stat label="Due soon" value={String(dueSoonCount)} tone="amber" />
        <Stat label="Current" value={String(okCount)} tone="green" />
        <Stat label="Est. cost outstanding" value={`£${totalEstimated.toFixed(0)}`} tone="slate" />
      </div>

      {enriched.length === 0 ? (
        <EmptyState title="No service schedules" description="Add a schedule on any vehicle to start tracking maintenance." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Service</th>
                <th className="px-4 py-2 font-medium">Next due</th>
                <th className="px-4 py-2 font-medium">Interval</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Est. cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {enriched.map((e) => {
                const tone =
                  e.status === 'overdue'
                    ? 'bg-red-100 text-red-800'
                    : e.status === 'due-soon'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800';
                const label =
                  e.status === 'overdue'
                    ? (e.daysUntilDue != null && e.daysUntilDue < 0 ? `${-e.daysUntilDue}d overdue` : 'Overdue')
                    : e.status === 'due-soon'
                      ? (e.daysUntilDue != null ? `${e.daysUntilDue}d left` : 'Due soon')
                      : 'OK';
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link href={`/vehicles/${e.vehicle.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {e.vehicle.name}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">{e.vehicle.license_plate}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{e.service_type_name}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(e.next_due_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                      {e.interval_km && `${e.interval_km.toLocaleString()}km`}
                      {e.interval_km && e.interval_days && ' / '}
                      {e.interval_days && `${e.interval_days}d`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                      {e.estimated_cost != null ? `£${e.estimated_cost.toFixed(0)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'green' | 'slate' }) {
  const toneClass =
    tone === 'red'
      ? 'border-red-200 bg-red-50'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50'
        : tone === 'green'
          ? 'border-green-200 bg-green-50'
          : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
