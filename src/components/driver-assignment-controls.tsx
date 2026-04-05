'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  status: string;
}

interface Assignment {
  id: string;
  vehicle_id: string;
  type: string;
  started_at: string;
}

interface Props {
  driverId: string;
  currentActive: Assignment[];
  availableVehicles: Vehicle[];
  vehicleNames: Record<string, string>;
}

export function DriverAssignmentControls({
  driverId,
  currentActive,
  availableVehicles,
  vehicleNames,
}: Props) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<'ASSIGNED' | 'POOL'>('ASSIGNED');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!vehicleId) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch('/api/driver-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: driverId, vehicleId, type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to assign vehicle');
        return;
      }
      setVehicleId('');
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    if (!confirm('End this assignment?')) return;
    const res = await fetch(`/api/driver-assignments/${assignmentId}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  const activeVehicleIds = new Set(currentActive.map((a) => a.vehicle_id));
  const assignable = availableVehicles.filter((v) => !activeVehicleIds.has(v.id));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Active assignments</h2>
      {currentActive.length === 0 ? (
        <p className="text-sm text-slate-500">No active vehicle assignments.</p>
      ) : (
        <ul className="space-y-2">
          {currentActive.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-slate-900">
                  {vehicleNames[a.vehicle_id] ?? a.vehicle_id}
                </span>
                <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {a.type === 'ASSIGNED' ? 'Primary' : 'Pool'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleUnassign(a.id)}
                className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
              >
                End assignment
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-700">Assign vehicle</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Select vehicle…</option>
            {assignable.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.license_plate}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'ASSIGNED' | 'POOL')}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="ASSIGNED">Primary</option>
            <option value="POOL">Pool</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAssign}
          disabled={!vehicleId || assigning}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {assigning ? 'Assigning…' : 'Assign'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
