import { supabase } from '@/lib/db';
import { VehicleList, type VehicleListItem } from '@/components/vehicle-list';
import { EmptyState } from '@/components/empty-state';

export default async function VehiclesPage() {
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, name, make, model, year, license_plate, status, odometer, traffic_light')
    .neq('status', 'DECOMMISSIONED')
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">Failed to load vehicles. Please try again.</p>
      </div>
    );
  }

  const vehicleList: VehicleListItem[] = (vehicles ?? []).map((v: {
    id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    status: string;
    odometer: number;
    traffic_light: string;
  }) => ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    licensePlate: v.license_plate,
    status: v.status,
    odometer: v.odometer,
    trafficLight: v.traffic_light as 'GREEN' | 'ORANGE' | 'RED',
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
      </div>
      {vehicleList.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          description="Add your first vehicle to start tracking your fleet."
        />
      ) : (
        <VehicleList vehicles={vehicleList} />
      )}
    </div>
  );
}
