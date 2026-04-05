'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  driverId: string;
  driverName: string;
  trackingEnabled: boolean;
  trackingScheduleStart: string | null;
  trackingScheduleEnd: string | null;
}

export function DriverPrivacyActions({
  driverId,
  driverName,
  trackingEnabled: initialEnabled,
  trackingScheduleStart: initialStart,
  trackingScheduleEnd: initialEnd,
}: Props) {
  const router = useRouter();
  const [trackingEnabled, setTrackingEnabled] = useState(initialEnabled);
  const [scheduleStart, setScheduleStart] = useState(initialStart ?? '');
  const [scheduleEnd, setScheduleEnd] = useState(initialEnd ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSchedule() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/privacy/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: driverId,
          trackingEnabled,
          trackingScheduleStart: scheduleStart || null,
          trackingScheduleEnd: scheduleEnd || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete() {
    const confirmation = prompt(
      `Hard-delete ${driverName}? This removes their account, sessions, assignments, and inspections. Type "${driverName}" to confirm.`,
    );
    if (confirmation !== driverName) return;
    const res = await fetch(`/api/drivers/${driverId}/data`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/drivers');
    } else {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? 'Delete failed');
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Privacy & tracking</h2>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackingEnabled}
            onChange={(e) => setTrackingEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tracking enabled
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Schedule start (HH:MM)</span>
            <input
              type="time"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Schedule end (HH:MM)</span>
            <input
              type="time"
              value={scheduleEnd}
              onChange={(e) => setScheduleEnd(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={saveSchedule}
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {saving ? 'Saving…' : 'Save schedule'}
        </button>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">GDPR</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={`/api/drivers/${driverId}/export?format=json`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export (JSON)
          </a>
          <a
            href={`/api/drivers/${driverId}/export?format=csv`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export (CSV)
          </a>
          <button
            type="button"
            onClick={handleHardDelete}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Hard delete
          </button>
        </div>
      </div>
    </div>
  );
}
