'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from './empty-state';

interface Document {
  id: string;
  vehicle_id: string;
  type: string;
  name: string;
  file_url: string | null;
  expires_at: string | null;
  created_at: string;
}

interface DocumentsTabProps {
  vehicleId: string;
}

const COMMON_TYPES = [
  'Registration',
  'Insurance',
  'MOT',
  'Roadworthy',
  'Warranty',
  'Service contract',
  'Other',
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function expiryBadge(expiry: string | null): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!expiry) return { label: 'No expiry', tone: 'slate' };
  const due = new Date(expiry);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400_000);
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: 'red' };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: 'amber' };
  return { label: 'Valid', tone: 'green' };
}

export function DocumentsTab({ vehicleId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState(COMMON_TYPES[0]);
  const [formExpiry, setFormExpiry] = useState('');
  const [formFileUrl, setFormFileUrl] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/documents?vehicleId=${encodeURIComponent(vehicleId)}`);
    if (!res.ok) {
      setDocuments([]);
      return;
    }
    const body = await res.json();
    setDocuments(body.documents ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Upload failed');
        return;
      }
      const body = await res.json();
      setFormFileUrl(body.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          type: formType,
          name: formName,
          fileUrl: formFileUrl,
          expiresAt: formExpiry ? new Date(formExpiry).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to create document');
        return;
      }
      setFormName('');
      setFormType(COMMON_TYPES[0]);
      setFormExpiry('');
      setFormFileUrl(null);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this document?')) return;
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments((prev) => (prev ?? []).filter((d) => d.id !== id));
    }
  }

  if (documents == null) return <div className="text-sm text-slate-500">Loading documents…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Documents</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add document'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Document name</span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. 2026 Insurance Policy"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Type</span>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                {COMMON_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Expiry date</span>
              <input
                type="date"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">File (optional)</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
              {formFileUrl && <p className="mt-1 text-xs text-green-700">File attached ✓</p>}
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving || uploading || !formName}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {saving ? 'Saving…' : 'Save document'}
          </button>
        </form>
      )}

      {documents.length === 0 ? (
        <EmptyState title="No documents" description="Add registration, insurance, MOT and other vehicle documents here." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Expires</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">File</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {documents.map((d) => {
                const badge = expiryBadge(d.expires_at);
                const toneClass =
                  badge.tone === 'red'
                    ? 'bg-red-100 text-red-800'
                    : badge.tone === 'amber'
                      ? 'bg-amber-100 text-amber-800'
                      : badge.tone === 'green'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600';
                return (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-900">{d.name}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{d.type}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(d.expires_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {d.file_url ? (
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
