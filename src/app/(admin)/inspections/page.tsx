import Link from 'next/link';
import { supabase } from '@/lib/db';
import { EmptyState } from '@/components/empty-state';

interface Template {
  id: string;
  name: string;
  description: string | null;
  vehicle_type: string | null;
  frequency_days: number | null;
  is_active: boolean;
}

export default async function InspectionsPage() {
  const { data } = await supabase
    .from('inspection_templates')
    .select('id,name,description,vehicle_type,frequency_days,is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const templates = (data ?? []) as Template[];

  const itemCounts = new Map<string, number>();
  if (templates.length > 0) {
    const { data: items } = await supabase
      .from('inspection_template_items')
      .select('template_id')
      .in('template_id', templates.map((t) => t.id));
    for (const i of (items ?? []) as Array<{ template_id: string }>) {
      itemCounts.set(i.template_id, (itemCounts.get(i.template_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Inspection templates</h1>
        <Link
          href="/inspections/templates/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <EmptyState title="No inspection templates" description="Create your first template to let drivers run pre-trip checks." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/inspections/templates/${t.id}`}
              className="rounded-md border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">{t.name}</h2>
              {t.description && <p className="mt-1 text-sm text-slate-600">{t.description}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                  {itemCounts.get(t.id) ?? 0} items
                </span>
                {t.vehicle_type && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{t.vehicle_type}</span>
                )}
                {t.frequency_days && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">every {t.frequency_days}d</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
