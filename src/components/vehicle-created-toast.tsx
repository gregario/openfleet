'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function VehicleCreatedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const created = searchParams.get('created');
  const [visible, setVisible] = useState(!!created);

  useEffect(() => {
    if (!created) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [created]);

  useEffect(() => {
    if (!created) return;
    // Clean up the URL without a full navigation
    const url = new URL(window.location.href);
    url.searchParams.delete('created');
    router.replace(url.pathname, { scroll: false });
  }, [created, router]);

  if (!visible || !created) return null;

  return (
    <div
      role="status"
      className="fixed right-4 top-4 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      {created} added to your fleet
    </div>
  );
}
