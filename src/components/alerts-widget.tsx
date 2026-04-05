'use client';

import { useEffect, useState } from 'react';

interface Alert {
  id: string;
  vehicle_id: string | null;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  is_dismissed: boolean;
  created_at: string;
}

const SEVERITY_STYLES: Record<Alert['severity'], { bg: string; label: string }> = {
  CRITICAL: { bg: 'bg-red-100 text-red-900 border-red-200', label: 'Critical' },
  WARNING: { bg: 'bg-amber-100 text-amber-900 border-amber-200', label: 'Warning' },
  INFO: { bg: 'bg-blue-100 text-blue-900 border-blue-200', label: 'Info' },
};

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch('/api/alerts?limit=20');
      if (!res.ok) {
        if (!cancelled) setAlerts([]);
        return;
      }
      const body = await res.json();
      if (!cancelled) setAlerts(body.alerts ?? []);
    }
    load();
    // Refresh every 60s
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function dismiss(id: string) {
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDismissed: true }),
    });
    setAlerts((prev) => (prev ?? []).filter((a) => a.id !== id));
  }

  if (alerts == null) return <p className="mt-2 text-sm text-slate-500">Loading alerts…</p>;

  if (alerts.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">No active alerts.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {alerts.map((a) => {
        const style = SEVERITY_STYLES[a.severity];
        return (
          <li
            key={a.id}
            className={`relative rounded-md border px-3 py-2 text-sm ${style.bg}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase">{style.label}</span>
                  <span className="font-medium">{a.title}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-700">{a.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss alert"
                className="rounded p-1 text-slate-500 hover:bg-white/50 hover:text-slate-900"
              >
                ×
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
