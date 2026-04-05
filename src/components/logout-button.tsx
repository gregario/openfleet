'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

export function LogoutButton({ className, label = 'Sign out' }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className ?? 'w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-fleet-sidebar-hover hover:text-white disabled:opacity-50'}
    >
      {loading ? 'Signing out…' : label}
    </button>
  );
}
