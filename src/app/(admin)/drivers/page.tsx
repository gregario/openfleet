import Link from 'next/link';
import { supabase } from '@/lib/db';
import { EmptyState } from '@/components/empty-state';

interface DriverRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
}

function licenseBadge(expiry: string | null): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!expiry) return { label: 'No licence on file', tone: 'slate' };
  const due = new Date(expiry);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400_000);
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: 'red' };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: 'amber' };
  return { label: `Valid`, tone: 'green' };
}

export default async function DriversPage() {
  const { data } = await supabase
    .from('users')
    .select('id,name,email,phone,license_number,license_expiry')
    .eq('role', 'DRIVER')
    .order('name', { ascending: true });

  const drivers = (data ?? []) as DriverRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
        <Link
          href="/drivers/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add driver
        </Link>
      </div>

      {drivers.length === 0 ? (
        <EmptyState title="No drivers yet" description="Add your first driver to start assigning vehicles." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Licence</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {drivers.map((d) => {
                const badge = licenseBadge(d.license_expiry);
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
                    <td className="whitespace-nowrap px-4 py-2 text-slate-900">
                      <Link href={`/drivers/${d.id}`} className="font-medium hover:text-blue-600">
                        {d.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{d.email}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{d.phone ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Link href={`/drivers/${d.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                        View
                      </Link>
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
