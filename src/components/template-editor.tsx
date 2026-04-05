'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TemplateEditorProps {
  templateId?: string; // undefined = create
  initialName?: string;
  initialDescription?: string;
  initialVehicleType?: string;
  initialFrequencyDays?: number | null;
  initialItems?: string[];
}

export function TemplateEditor({
  templateId,
  initialName = '',
  initialDescription = '',
  initialVehicleType = '',
  initialFrequencyDays = null,
  initialItems = [''],
}: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [vehicleType, setVehicleType] = useState(initialVehicleType);
  const [frequencyDays, setFrequencyDays] = useState<string>(
    initialFrequencyDays != null ? String(initialFrequencyDays) : '',
  );
  const [items, setItems] = useState<string[]>(initialItems.length > 0 ? initialItems : ['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(i: number, v: string) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }
  function addItem() {
    setItems((prev) => [...prev, '']);
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanedItems = items.map((x) => x.trim()).filter((x) => x.length > 0);
    if (cleanedItems.length === 0) {
      setError('At least one checklist item is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        vehicleType: vehicleType || null,
        frequencyDays: frequencyDays ? Number(frequencyDays) : null,
        items: cleanedItems,
      };
      const res = templateId
        ? await fetch(`/api/inspection-templates/${templateId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/inspection-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to save template');
        return;
      }
      router.push('/inspections');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!templateId) return;
    if (!confirm('Archive this template? Existing inspections remain, but the template can no longer be used for new inspections.')) return;
    const res = await fetch(`/api/inspection-templates/${templateId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/inspections');
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Template name">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="Vehicle type (optional)">
            <input
              type="text"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              placeholder="e.g. van, truck, car"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Description">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Frequency (days, optional)">
            <input
              type="number"
              min={1}
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(e.target.value)}
              placeholder="e.g. 1 for daily pre-trip"
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Checklist items</h3>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            + Add item
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`Item ${i + 1}`}
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                aria-label={`Remove item ${i + 1}`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {saving ? 'Saving…' : templateId ? 'Save changes' : 'Create template'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/inspections')}
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
        {templateId && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Archive template
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
