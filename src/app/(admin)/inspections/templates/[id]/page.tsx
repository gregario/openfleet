import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/db';
import { TemplateEditor } from '@/components/template-editor';

interface Template {
  id: string;
  name: string;
  description: string | null;
  vehicle_type: string | null;
  frequency_days: number | null;
  is_active: boolean;
}

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: templateData } = await supabase
    .from('inspection_templates')
    .select('id,name,description,vehicle_type,frequency_days,is_active')
    .eq('id', id)
    .maybeSingle();
  const template = templateData as Template | null;

  if (!template) notFound();

  const { data: itemsData } = await supabase
    .from('inspection_template_items')
    .select('label,sort_order')
    .eq('template_id', id)
    .order('sort_order', { ascending: true });
  const items = ((itemsData ?? []) as Array<{ label: string; sort_order: number }>).map((i) => i.label);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/inspections" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
          ← Templates
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Edit template</h1>
      </div>
      <TemplateEditor
        templateId={template.id}
        initialName={template.name}
        initialDescription={template.description ?? ''}
        initialVehicleType={template.vehicle_type ?? ''}
        initialFrequencyDays={template.frequency_days}
        initialItems={items.length > 0 ? items : ['']}
      />
    </div>
  );
}
