import { EmptyState } from '@/components/empty-state';
import { InspectionForm } from '@/components/inspection-form';
import { supabase } from '@/lib/db';
import { requireDriver } from '@/lib/auth';

interface VehicleRow {
  id: string;
  name: string;
  license_plate: string;
  vehicle_type: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  vehicle_type: string | null;
}

export default async function DriverInspectionPage() {
  const session = await requireDriver();

  // Driver's active vehicles
  const { data: assignmentsData } = await supabase
    .from('driver_assignments')
    .select('vehicle_id')
    .eq('user_id', session.userId)
    .eq('is_active', true);

  const vehicleIds = ((assignmentsData ?? []) as Array<{ vehicle_id: string }>).map((a) => a.vehicle_id);

  if (vehicleIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Inspection</h1>
        <EmptyState
          title="No vehicle assigned"
          description="An inspection can be submitted once your admin assigns you a vehicle."
        />
      </div>
    );
  }

  const { data: vehiclesData } = await supabase
    .from('vehicles')
    .select('id,name,license_plate,vehicle_type')
    .in('id', vehicleIds);
  const vehicles = (vehiclesData ?? []) as VehicleRow[];

  // Templates: all active templates, preferring those matching vehicle type.
  // For driver UI simplicity, show all active templates and let the driver pick.
  const { data: templatesData } = await supabase
    .from('inspection_templates')
    .select('id,name,vehicle_type')
    .eq('is_active', true)
    .order('name', { ascending: true });
  const templates = (templatesData ?? []) as TemplateRow[];

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Inspection</h1>
        <EmptyState
          title="No inspection templates"
          description="Your admin needs to set up an inspection template before you can submit one."
        />
      </div>
    );
  }

  const { data: itemsData } = await supabase
    .from('inspection_template_items')
    .select('template_id,label,sort_order')
    .in('template_id', templates.map((t) => t.id))
    .order('sort_order', { ascending: true });

  const itemsByTemplate = new Map<string, string[]>();
  for (const it of (itemsData ?? []) as Array<{ template_id: string; label: string }>) {
    const arr = itemsByTemplate.get(it.template_id) ?? [];
    arr.push(it.label);
    itemsByTemplate.set(it.template_id, arr);
  }

  const templatesWithItems = templates.map((t) => ({
    id: t.id,
    name: t.name,
    items: itemsByTemplate.get(t.id) ?? [],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Pre-trip inspection</h1>
      <InspectionForm
        vehicles={vehicles.map((v) => ({ id: v.id, name: v.name, license_plate: v.license_plate }))}
        templates={templatesWithItems}
      />
    </div>
  );
}
