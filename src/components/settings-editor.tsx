'use client';

import { useState } from 'react';

interface TrackingSchedule {
  enabled?: boolean;
  start?: string;
  end?: string;
  days?: string[];
}

interface SettingsEditorProps {
  companyName: string;
  companyTimezone: string;
  dataRetentionDays: number;
  trackingSchedule: TrackingSchedule;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SettingsEditor({
  companyName: initialName,
  companyTimezone: initialTz,
  dataRetentionDays: initialRetention,
  trackingSchedule: initialSchedule,
}: SettingsEditorProps) {
  const [companyName, setCompanyName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTz);
  const [retention, setRetention] = useState(String(initialRetention));
  const [trackingEnabled, setTrackingEnabled] = useState(initialSchedule.enabled ?? true);
  const [trackingStart, setTrackingStart] = useState(initialSchedule.start ?? '07:00');
  const [trackingEnd, setTrackingEnd] = useState(initialSchedule.end ?? '18:00');
  const [trackingDays, setTrackingDays] = useState<string[]>(
    initialSchedule.days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function saveSetting(key: string, value: unknown) {
    setSaving(key);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to save');
        return;
      }
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  function toggleDay(day: string) {
    setTrackingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Company</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Company name</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <SaveButton
                busy={saving === 'company_name'}
                saved={saved === 'company_name'}
                onClick={() => saveSetting('company_name', companyName)}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Timezone</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Europe/London"
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <SaveButton
                busy={saving === 'company_timezone'}
                saved={saved === 'company_timezone'}
                onClick={() => saveSetting('company_timezone', timezone)}
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Data retention</h2>
        <label className="mt-3 block max-w-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Keep position data for (days)</span>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={3650}
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <SaveButton
              busy={saving === 'data_retention_days'}
              saved={saved === 'data_retention_days'}
              onClick={() => saveSetting('data_retention_days', Number(retention))}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Positions older than this are eligible for hard deletion.</p>
        </label>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Default tracking schedule
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Applied to new drivers. Per-driver overrides are set on each driver&apos;s profile.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackingEnabled}
            onChange={(e) => setTrackingEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tracking enabled by default
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Schedule start</span>
            <input
              type="time"
              value={trackingStart}
              onChange={(e) => setTrackingStart(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Schedule end</span>
            <input
              type="time"
              value={trackingEnd}
              onChange={(e) => setTrackingEnd(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-xs font-medium text-slate-700">Active days</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  trackingDays.includes(day)
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <SaveButton
            busy={saving === 'tracking_schedule'}
            saved={saved === 'tracking_schedule'}
            onClick={() =>
              saveSetting('tracking_schedule', {
                enabled: trackingEnabled,
                start: trackingStart,
                end: trackingEnd,
                days: trackingDays,
              })
            }
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function SaveButton({
  busy,
  saved,
  onClick,
}: {
  busy: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
    >
      {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
    </button>
  );
}
