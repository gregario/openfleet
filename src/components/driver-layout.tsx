'use client';

import { usePathname } from 'next/navigation';
import { DriverNav } from './driver-nav';
import { PrivacyNotice } from './privacy-notice';

export function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <PrivacyNotice />
      <DriverNav activePath={pathname} />
      <main className="flex-1 bg-fleet-bg p-4">{children}</main>
    </div>
  );
}
