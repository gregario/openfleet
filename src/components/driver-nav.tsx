'use client';

import Link from 'next/link';
import { useState } from 'react';

interface DriverNavProps {
  activePath: string;
  trackingActive?: boolean;
}

const navItems = [
  { label: 'My Vehicle', href: '/driver' },
  { label: 'Inspection', href: '/driver/inspection' },
];

export function DriverNav({ activePath, trackingActive = false }: DriverNavProps) {
  const [shiftActive, setShiftActive] = useState(true);

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
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              trackingActive ? 'bg-fleet-green' : 'bg-slate-300'
            }`}
          />
          {trackingActive ? 'Tracking' : 'Not tracking'}
        </div>

        <button
          onClick={() => setShiftActive((prev) => !prev)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            shiftActive
              ? 'bg-fleet-red text-white hover:bg-red-600'
              : 'bg-fleet-green text-white hover:bg-green-600'
          }`}
        >
          {shiftActive ? 'End Shift' : 'Start Shift'}
        </button>
      </div>
    </header>
  );
}
