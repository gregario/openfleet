'use client';

import { useEffect, useState } from 'react';

interface PrivacyStatus {
  privacyAcked: boolean;
  onShift: boolean;
  trackingEnabled: boolean;
  trackingActive: boolean;
}

/**
 * First-login privacy notice. Blocks the driver UI until they acknowledge.
 * Polls /api/privacy/status once on mount.
 */
export function PrivacyNotice() {
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch('/api/privacy/status');
      if (!res.ok) return;
      const body = await res.json();
      if (!cancelled) setStatus(body);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function acknowledge() {
    setSaving(true);
    try {
      await fetch('/api/privacy/acknowledge', { method: 'POST' });
      setStatus((s) => (s ? { ...s, privacyAcked: true } : s));
    } finally {
      setSaving(false);
    }
  }

  if (!status || status.privacyAcked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Privacy notice</h2>
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          <p>
            OpenFleet tracks your vehicle&apos;s GPS location during your shift to help your
            employer manage the fleet. Here&apos;s what you need to know:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tracking is only active during your scheduled shift.</li>
            <li>You can end your shift at any time to pause tracking.</li>
            <li>
              Your employer can see trip routes, timestamps, and inspection records tied to
              your account.
            </li>
            <li>
              You have the right to request a copy of your data and request its deletion
              at any time.
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            This is not a tachograph, ELD, or DVIR-compliant system. It is a fleet
            management tool.
          </p>
        </div>
        <button
          type="button"
          onClick={acknowledge}
          disabled={saving}
          className="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {saving ? 'Saving…' : 'I understand'}
        </button>
      </div>
    </div>
  );
}
