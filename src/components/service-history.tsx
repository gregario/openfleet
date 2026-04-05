'use client';

import { useEffect, useState, useCallback } from 'react';

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  service_type_id: string;
  service_type_name: string | null;
  date: string;
  odometer_km: number;
  cost: number | null;
  vendor: string | null;
  notes: string | null;
  receipt_url: string | null;
}

interface ServiceHistoryProps {
  vehicleId: string;
  refreshKey?: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCost(cost: number | null): string {
  if (cost == null) return '—';
  return `£${cost.toFixed(2)}`;
}

export function ServiceHistory({ vehicleId, refreshKey = 0 }: ServiceHistoryProps) {
  const [records, setRecords] = useState<MaintenanceRecord[] | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/maintenance-records?vehicleId=${encodeURIComponent(vehicleId)}`);
    if (!res.ok) {
      setRecords([]);
      return;
    }
    const body = await res.json();
    setRecords(body.records ?? []);
    setTotalCost(body.totalCost ?? 0);
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (records == null) return <div className="text-sm text-slate-500">Loading history…</div>;

  if (records.length === 0) {
    return <p className="text-sm text-slate-500">No service records yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Service history</h3>
        <div className="text-sm text-slate-600">
          <span className="font-medium">Total spent:</span>{' '}
          <span className="tabular-nums">{formatCost(totalCost)}</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Odometer</th>
              <th className="px-4 py-2 font-medium">Cost</th>
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-4 py-2 font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-900">{formatDate(r.date)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{r.service_type_name ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 tabular-nums">{r.odometer_km.toLocaleString()}km</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-900 tabular-nums">{formatCost(r.cost)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{r.vendor ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  {r.receipt_url ? (
                    <a
                      href={r.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
