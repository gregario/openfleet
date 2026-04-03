import { notFound } from 'next/navigation';
import { supabase } from '@/lib/db';
import { VehicleDetail, type VehicleDetailData } from '@/components/vehicle-detail';

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id } = await params;

  const { data: v, error } = await supabase
    .from('vehicles')
    .select(
      'id, name, make, model, year, vin, license_plate, color, photo_url, status, odometer, motion_state, traffic_light, latest_latitude, latest_longitude, latest_speed, latest_heading, latest_position_at, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error || !v) {
    notFound();
  }

  const vehicle: VehicleDetailData = {
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    licensePlate: v.license_plate,
    color: v.color,
    photoUrl: v.photo_url,
    status: v.status,
    odometer: v.odometer,
    motionState: v.motion_state,
    trafficLight: v.traffic_light as 'GREEN' | 'ORANGE' | 'RED',
    latestPosition:
      v.latest_latitude != null && v.latest_longitude != null
        ? {
            latitude: v.latest_latitude,
            longitude: v.latest_longitude,
            speed: v.latest_speed,
            heading: v.latest_heading,
            timestamp: v.latest_position_at,
          }
        : null,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };

  return <VehicleDetail vehicle={vehicle} />;
}
