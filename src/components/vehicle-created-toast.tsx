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
      className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      <span>{created} added to your fleet</span>
      <button
        type="button"
        aria-label="Close"
        onClick={() => setVisible(false)}
        className="ml-1 rounded p-0.5 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
