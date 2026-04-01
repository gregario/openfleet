'use client';

import { usePathname } from 'next/navigation';
import { DriverNav } from './driver-nav';

export function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <DriverNav activePath={pathname} trackingActive />
      <main className="flex-1 bg-fleet-bg p-4">{children}</main>
    </div>
  );
}
