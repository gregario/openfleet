'use client';

import { useState } from 'react';

interface ServiceType {
  id: string;
  name: string;
  is_default: boolean;
}

export function ServiceTypesEditor({ initialTypes }: { initialTypes: ServiceType[] }) {
  const [types, setTypes] = useState(initialTypes);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/service-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to add service type');
        return;
      }
      const body = await res.json();
      setTypes((prev) =>
        [...prev, body.serviceType].sort((a, b) => {
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      );
      setNewName('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Service types</h2>
      <p className="mt-1 text-xs text-slate-500">
        Used when creating service schedules. Default types are pre-populated; you can add custom types.
      </p>

      <ul className="mt-3 space-y-1">
        {types.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-900">{t.name}</span>
            {t.is_default && (
              <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                Default
              </span>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Transmission Service"
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
