'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DriverNavProps {
  activePath: string;
}

const navItems = [
  { label: 'My Vehicle', href: '/driver' },
  { label: 'Inspection', href: '/driver/inspection' },
];

interface PrivacyStatus {
  onShift: boolean;
  trackingActive: boolean;
  trackingEnabled: boolean;
}

export function DriverNav({ activePath }: DriverNavProps) {
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/privacy/status');
      if (res.ok) setStatus(await res.json());
    }
    load();
  }, []);

  async function toggleShift() {
    if (!status) return;
    const next = !status.onShift;
    setToggling(true);
    try {
      const res = await fetch('/api/privacy/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onShift: next }),
      });
      if (res.ok) {
        // Re-fetch to get accurate trackingActive
        const s = await fetch('/api/privacy/status');
        if (s.ok) setStatus(await s.json());
      }
    } finally {
      setToggling(false);
    }
  }

  const trackingActive = status?.trackingActive ?? false;
  const onShift = status?.onShift ?? false;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold text-slate-900">OpenFleet</span>

        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 text-sm text-slate-600"
          aria-label={trackingActive ? 'Tracking active' : 'Tracking inactive'}
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              trackingActive ? 'bg-fleet-green animate-pulse' : 'bg-slate-300'
            }`}
          />
          {trackingActive ? 'Tracking' : 'Not tracking'}
        </div>

        <button
          type="button"
          onClick={toggleShift}
          disabled={toggling || !status}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            onShift
              ? 'bg-fleet-red text-white hover:bg-red-600'
              : 'bg-fleet-green text-white hover:bg-green-600'
          }`}
        >
          {toggling ? '…' : onShift ? 'End Shift' : 'Start Shift'}
        </button>
      </div>
    </header>
  );
}
