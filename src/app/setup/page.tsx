'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function check() {
      const res = await fetch('/api/setup');
      if (res.ok) {
        const body = await res.json();
        setNeedsSetup(body.needsSetup);
        if (!body.needsSetup) router.replace('/login');
      }
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Setup failed');
        return;
      }
      // Auto-login after creating admin
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fleet-bg">
        <p className="text-sm text-slate-500">Checking setup status…</p>
      </div>
    );
  }

  if (!needsSetup) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-fleet-bg px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Set up OpenFleet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create the first admin account for your fleet.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Name" id="name">
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            />
          </Field>
          <Field label="Email" id="email">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            />
          </Field>
          <Field label="Password" id="password">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
          </Field>

          {error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-fleet-sidebar py-2 text-sm font-medium text-white hover:bg-fleet-sidebar-hover disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create admin account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
