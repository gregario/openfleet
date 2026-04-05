'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from './empty-state';

export interface TripRow {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  is_active: boolean;
  simulated: boolean;
}

interface TripsTabProps {
  vehicleId: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
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

export function TripsTab({ vehicleId }: TripsTabProps) {
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeSimulated, setIncludeSimulated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = `/api/trips?vehicleId=${encodeURIComponent(vehicleId)}&limit=50${
          includeSimulated ? '&includeSimulated=true' : ''
        }`;
        const res = await fetch(url);
        if (!res.ok) {
          setError('Failed to load trips');
          return;
        }
        const body = await res.json();
        if (!cancelled) setTrips(body.trips ?? []);
      } catch {
        if (!cancelled) setError('Failed to load trips');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, includeSimulated]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {error}
      </div>
    );
  }

  if (trips == null) {
    return <div className="text-sm text-slate-500">Loading trips…</div>;
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={includeSimulated}
          onChange={(e) => setIncludeSimulated(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300"
        />
        Include simulated trips
      </label>

      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description={
            includeSimulated
              ? 'No trips on record for this vehicle.'
              : 'No completed trips yet. Tick "Include simulated trips" above to see simulator-generated trips.'
          }
        />
      ) : (
      <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Start</th>
            <th className="px-4 py-2 font-medium">End</th>
            <th className="px-4 py-2 font-medium">Distance</th>
            <th className="px-4 py-2 font-medium">Duration</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Route</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td className="whitespace-nowrap px-4 py-2 text-slate-900">
                {formatDateTime(trip.start_time)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                {trip.end_time ? formatDateTime(trip.end_time) : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-slate-900">{formatDistance(trip.distance_km)}</td>
              <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDuration(trip.duration_minutes)}</td>
              <td className="whitespace-nowrap px-4 py-2">
                {trip.is_active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Completed
                  </span>
                )}
                {trip.simulated && (
                  <span className="ml-1 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Sim
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2">
                <Link
                  href={`/trips/${trip.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View route →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
}
