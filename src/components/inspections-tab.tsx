'use client';

import { useEffect, useState } from 'react';

interface InspectionRow {
  id: string;
  vehicle_id: string;
  user_id: string;
  template_id: string;
  type: string;
  result: 'PASS' | 'FAIL' | 'NA';
  notes: string | null;
  submitted_at: string;
}

interface TemplateRow {
  id: string;
  name: string;
  frequency_days: number | null;
}

interface InspectionsTabProps {
  vehicleId: string;
  vehicleType: string | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeComplianceStatus(
  latestInspection: InspectionRow | null,
  frequencyDays: number | null,
): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!latestInspection) return { label: 'No inspections on file', tone: 'red' };
  if (!frequencyDays) return { label: 'Up to date', tone: 'green' };

  const submittedAt = new Date(latestInspection.submitted_at).getTime();
  const due = submittedAt + frequencyDays * 86400_000;
  const now = Date.now();

  if (now > due) {
    const daysOverdue = Math.ceil((now - due) / 86400_000);
    return { label: `Overdue by ${daysOverdue}d`, tone: 'red' };
  }
  const daysRemaining = Math.ceil((due - now) / 86400_000);
  if (daysRemaining <= 1) return { label: 'Due today', tone: 'amber' };
  if (daysRemaining <= 3) return { label: `Due in ${daysRemaining}d`, tone: 'amber' };
  return { label: `Current (${daysRemaining}d left)`, tone: 'green' };
}

export function InspectionsTab({ vehicleId }: InspectionsTabProps) {
  const [inspections, setInspections] = useState<InspectionRow[] | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  useEffect(() => {
    async function load() {
      const [inspRes, templatesRes] = await Promise.all([
        fetch(`/api/inspections?vehicleId=${encodeURIComponent(vehicleId)}`),
        fetch('/api/inspection-templates'),
      ]);
      if (inspRes.ok) {
        const body = await inspRes.json();
        setInspections(body.inspections ?? []);
      } else {
        setInspections([]);
      }
      if (templatesRes.ok) {
        const body = await templatesRes.json();
        setTemplates((body.templates ?? []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          frequency_days: (t.frequency_days as number | null) ?? null,
        })));
      }
    }
    load();
  }, [vehicleId]);

  if (inspections == null) return <div className="text-sm text-slate-500">Loading inspections…</div>;

  const passCount = inspections.filter((i) => i.result === 'PASS').length;
  const failCount = inspections.filter((i) => i.result === 'FAIL').length;
  const latest = inspections[0] ?? null;

  // Take the minimum frequency across active templates as the compliance cadence
  const minFrequency = templates
    .map((t) => t.frequency_days)
    .filter((d): d is number => d != null)
    .reduce<number | null>((min, d) => (min == null ? d : Math.min(min, d)), null);

  const compliance = computeComplianceStatus(latest, minFrequency);
  const toneClass =
    compliance.tone === 'red'
      ? 'bg-red-100 text-red-800 border-red-200'
      : compliance.tone === 'amber'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : compliance.tone === 'green'
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-slate-100 text-slate-700 border-slate-200';

  const templateMap = new Map(templates.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={`rounded-md border p-3 ${toneClass}`}>
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">Compliance</div>
          <div className="mt-1 text-sm font-semibold">{compliance.label}</div>
        </div>
        <Stat label="Total inspections" value={String(inspections.length)} />
        <Stat label="Passed" value={String(passCount)} />
        <Stat label="Failed" value={String(failCount)} />
      </div>

      {inspections.length === 0 ? (
        <p className="text-sm text-slate-500">No inspections submitted yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {inspections.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-900">{formatDateTime(i.submitted_at)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">{templateMap.get(i.template_id) ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">{i.type}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        i.result === 'PASS'
                          ? 'bg-green-100 text-green-800'
                          : i.result === 'FAIL'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {i.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <strong className="font-semibold">Disclaimer:</strong> OpenFleet is a fleet management tool
        and is not a tachograph, ELD, or DVIR-compliant system. Use the appropriate certified
        system for regulatory compliance in your jurisdiction.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
