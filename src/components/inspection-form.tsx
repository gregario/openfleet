'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
}

interface Template {
  id: string;
  name: string;
  items: string[];
}

interface InspectionFormProps {
  vehicles: Vehicle[];
  templates: Template[];
}

type Result = 'PASS' | 'FAIL' | 'NA';

interface ItemResponse {
  label: string;
  result: Result;
  notes: string;
  photoUrl: string | null;
  uploading: boolean;
}

export function InspectionForm({ vehicles, templates }: InspectionFormProps) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const [responses, setResponses] = useState<ItemResponse[]>(
    selectedTemplate ? selectedTemplate.items.map((label) => ({
      label,
      result: 'PASS',
      notes: '',
      photoUrl: null,
      uploading: false,
    })) : [],
  );

  // Sync responses when template changes
  function handleTemplateChange(newId: string) {
    setTemplateId(newId);
    const tpl = templates.find((t) => t.id === newId);
    if (tpl) {
      setResponses(
        tpl.items.map((label) => ({
          label,
          result: 'PASS',
          notes: '',
          photoUrl: null,
          uploading: false,
        })),
      );
    }
  }

  function updateResponse(i: number, patch: Partial<ItemResponse>) {
    setResponses((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handlePhotoUpload(i: number, file: File) {
    updateResponse(i, { uploading: true });
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      if (res.ok) {
        const body = await res.json();
        updateResponse(i, { photoUrl: body.url });
      }
    } finally {
      updateResponse(i, { uploading: false });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          templateId,
          type: 'pre-trip',
          notes: notes || null,
          responses: responses.map((r) => ({
            itemLabel: r.label,
            result: r.result,
            notes: r.notes || null,
            photoUrl: r.photoUrl,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to submit inspection');
        return;
      }
      router.push('/driver');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (vehicles.length === 0 || templates.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {vehicles.length === 0 ? 'No vehicle assigned.' : 'No inspection templates available.'}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Vehicle</span>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.license_plate}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Checklist</span>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <ul className="space-y-2">
        {responses.map((r, i) => (
          <li key={i} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-900">{r.label}</span>
              <div className="flex gap-1">
                {(['PASS', 'FAIL', 'NA'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => updateResponse(i, { result: res })}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      r.result === res
                        ? res === 'PASS'
                          ? 'bg-green-600 text-white'
                          : res === 'FAIL'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {res === 'NA' ? 'N/A' : res}
                  </button>
                ))}
              </div>
            </div>
            {r.result === 'FAIL' && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <textarea
                  rows={2}
                  placeholder="Describe the issue…"
                  value={r.notes}
                  onChange={(e) => updateResponse(i, { notes: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(i, file);
                    }}
                    disabled={r.uploading}
                    className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                  {r.uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
                  {r.photoUrl && <p className="mt-1 text-xs text-green-700">Photo attached ✓</p>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-700">Overall notes (optional)</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {submitting ? 'Submitting…' : 'Submit inspection'}
      </button>
      <p className="text-xs text-slate-500">Submitted inspections are timestamped and cannot be edited.</p>
    </form>
  );
}
