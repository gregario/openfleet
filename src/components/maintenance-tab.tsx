'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from './empty-state';
import { ServiceHistory } from './service-history';
import { LogServiceDialog } from './log-service-dialog';

interface Schedule {
  id: string;
  vehicle_id: string;
  service_type_id: string;
  service_type_name: string | null;
  interval_km: number | null;
  interval_days: number | null;
  warning_km: number | null;
  warning_days: number | null;
  estimated_cost: number | null;
  last_serviced_at: string | null;
  last_serviced_km: number | null;
  next_due_at: string | null;
  next_due_km: number | null;
}

interface ServiceType {
  id: string;
  name: string;
  is_default: boolean;
}

interface MaintenanceTabProps {
  vehicleId: string;
  currentOdometer: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInterval(km: number | null, days: number | null): string {
  const parts: string[] = [];
  if (km) parts.push(`${km.toLocaleString()}km`);
  if (days) parts.push(`${days}d`);
  return parts.length > 0 ? parts.join(' / ') : '—';
}

function dueBadge(schedule: Schedule, currentOdometer: number): { label: string; tone: 'green' | 'orange' | 'red' } {
  const now = new Date();
  let overdueTime = false;
  let dueSoonTime = false;
  let overdueKm = false;
  let dueSoonKm = false;

  if (schedule.next_due_at) {
    const due = new Date(schedule.next_due_at);
    if (due < now) overdueTime = true;
    else if (schedule.warning_days) {
      const warning = new Date(due);
      warning.setDate(warning.getDate() - schedule.warning_days);
      if (now >= warning) dueSoonTime = true;
    }
  }
  if (schedule.next_due_km != null) {
    if (currentOdometer >= schedule.next_due_km) overdueKm = true;
    else if (schedule.warning_km && currentOdometer >= schedule.next_due_km - schedule.warning_km) {
      dueSoonKm = true;
    }
  }

  if (overdueTime || overdueKm) return { label: 'Overdue', tone: 'red' };
  if (dueSoonTime || dueSoonKm) return { label: 'Due soon', tone: 'orange' };
  return { label: 'OK', tone: 'green' };
}

export function MaintenanceTab({ vehicleId, currentOdometer }: MaintenanceTabProps) {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formServiceTypeId, setFormServiceTypeId] = useState('');
  const [formIntervalKm, setFormIntervalKm] = useState('');
  const [formIntervalDays, setFormIntervalDays] = useState('');
  const [formWarningKm, setFormWarningKm] = useState('');
  const [formWarningDays, setFormWarningDays] = useState('');
  const [formLastKm, setFormLastKm] = useState('');
  const [loggingSchedule, setLoggingSchedule] = useState<Schedule | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    async function load() {
      const [schedRes, typesRes] = await Promise.all([
        fetch(`/api/service-schedules?vehicleId=${encodeURIComponent(vehicleId)}`),
        fetch('/api/service-types'),
      ]);
      if (schedRes.ok) {
        const body = await schedRes.json();
        setSchedules(body.schedules ?? []);
      } else {
        setSchedules([]);
      }
      if (typesRes.ok) {
        const body = await typesRes.json();
        setServiceTypes(body.serviceTypes ?? []);
      }
    }
    load();
  }, [vehicleId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/service-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          serviceTypeId: formServiceTypeId,
          intervalKm: formIntervalKm ? Number(formIntervalKm) : null,
          intervalDays: formIntervalDays ? Number(formIntervalDays) : null,
          warningKm: formWarningKm ? Number(formWarningKm) : null,
          warningDays: formWarningDays ? Number(formWarningDays) : null,
          lastServicedKm: formLastKm ? Number(formLastKm) : null,
          lastServicedAt: formLastKm ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFormError(body.error ?? 'Failed to create schedule');
        return;
      }
      // Reload
      const reload = await fetch(`/api/service-schedules?vehicleId=${encodeURIComponent(vehicleId)}`);
      const body = await reload.json();
      setSchedules(body.schedules ?? []);
      setShowForm(false);
      setFormServiceTypeId('');
      setFormIntervalKm('');
      setFormIntervalDays('');
      setFormWarningKm('');
      setFormWarningDays('');
      setFormLastKm('');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm('Remove this service schedule?')) return;
    const res = await fetch(`/api/service-schedules/${scheduleId}`, { method: 'DELETE' });
    if (res.ok) {
      setSchedules((prev) => (prev ?? []).filter((s) => s.id !== scheduleId));
    }
  }

  if (schedules == null) return <div className="text-sm text-slate-500">Loading schedules…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Service schedules</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add schedule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Service type">
              <select
                value={formServiceTypeId}
                onChange={(e) => setFormServiceTypeId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {serviceTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Last serviced at (km)">
              <input
                type="number"
                min={0}
                value={formLastKm}
                onChange={(e) => setFormLastKm(e.target.value)}
                placeholder={`current: ${currentOdometer}`}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="Interval (km)">
              <input
                type="number"
                min={1}
                value={formIntervalKm}
                onChange={(e) => setFormIntervalKm(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="Interval (days)">
              <input
                type="number"
                min={1}
                value={formIntervalDays}
                onChange={(e) => setFormIntervalDays(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="Warn at (km before)">
              <input
                type="number"
                min={0}
                value={formWarningKm}
                onChange={(e) => setFormWarningKm(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="Warn at (days before)">
              <input
                type="number"
                min={0}
                value={formWarningDays}
                onChange={(e) => setFormWarningDays(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </Field>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <p className="text-xs text-slate-500">At least one of interval (km) or interval (days) is required.</p>
          <button
            type="submit"
            disabled={saving || !formServiceTypeId || (!formIntervalKm && !formIntervalDays)}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </form>
      )}

      {loggingSchedule && (
        <LogServiceDialog
          vehicleId={vehicleId}
          serviceTypeId={loggingSchedule.service_type_id}
          serviceTypeName={loggingSchedule.service_type_name ?? 'Service'}
          currentOdometer={currentOdometer}
          onClose={() => setLoggingSchedule(null)}
          onLogged={async () => {
            setHistoryKey((k) => k + 1);
            // Refresh schedule list to pick up the new next-due values
            const reload = await fetch(`/api/service-schedules?vehicleId=${encodeURIComponent(vehicleId)}`);
            if (reload.ok) {
              const body = await reload.json();
              setSchedules(body.schedules ?? []);
            }
          }}
        />
      )}

      {schedules.length === 0 ? (
        <EmptyState title="No service schedules" description="Add a schedule to track upcoming maintenance for this vehicle." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Service</th>
                <th className="px-4 py-2 font-medium">Interval</th>
                <th className="px-4 py-2 font-medium">Next due (km)</th>
                <th className="px-4 py-2 font-medium">Next due (date)</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {schedules.map((s) => {
                const badge = dueBadge(s, currentOdometer);
                const toneClass =
                  badge.tone === 'red'
                    ? 'bg-red-100 text-red-800'
                    : badge.tone === 'orange'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800';
                return (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-900">{s.service_type_name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatInterval(s.interval_km, s.interval_days)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                      {s.next_due_km != null ? `${s.next_due_km.toLocaleString()}km` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(s.next_due_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{badge.label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setLoggingSchedule(s)}
                        className="mr-3 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Log service
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ServiceHistory vehicleId={vehicleId} refreshKey={historyKey} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
