import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/db';
import { TripMap } from '@/components/trip-map';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Trip {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  start_latitude: number | null;
  start_longitude: number | null;
  end_latitude: number | null;
  end_longitude: number | null;
  is_active: boolean;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDistance(km: number | null): string {
  if (km == null) return '—';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export default async function TripDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: tripData } = await supabase
    .from('trips')
    .select(
      'id,vehicle_id,start_time,end_time,distance_km,duration_minutes,start_latitude,start_longitude,end_latitude,end_longitude,is_active',
    )
    .eq('id', id)
    .maybeSingle();

  const trip = tripData as Trip | null;
  if (!trip) {
    notFound();
  }

  const { data: positions } = await supabase
    .from('positions')
    .select('latitude,longitude,timestamp')
    .eq('trip_id', id)
    .order('timestamp', { ascending: true });

  const { data: vehicleData } = await supabase
    .from('vehicles')
    .select('name,license_plate')
    .eq('id', trip.vehicle_id)
    .maybeSingle();
  const vehicle = vehicleData as { name: string; license_plate: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/vehicles/${trip.vehicle_id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to vehicle
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Trip {formatDateTime(trip.start_time)}
          </h1>
          {vehicle && (
            <p className="text-sm text-slate-500">
              {vehicle.name} · {vehicle.license_plate}
            </p>
          )}
        </div>
        <div>
          {trip.is_active ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              Completed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Distance" value={formatDistance(trip.distance_km)} />
        <StatCard label="Duration" value={formatDuration(trip.duration_minutes)} />
        <StatCard
          label="End time"
          value={trip.end_time ? formatDateTime(trip.end_time) : '—'}
        />
        <StatCard label="GPS points" value={String((positions ?? []).length)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Route</h2>
        <TripMap
          points={(positions ?? []) as { latitude: number; longitude: number; timestamp: string }[]}
          startLat={trip.start_latitude}
          startLon={trip.start_longitude}
          endLat={trip.end_latitude}
          endLon={trip.end_longitude}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
