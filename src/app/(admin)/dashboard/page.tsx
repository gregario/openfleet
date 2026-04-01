import { prisma } from '@/lib/db';
import { DashboardMap } from '@/components/dashboard-map';

export default async function DashboardPage() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'DECOMMISSIONED' } },
    select: {
      id: true,
      name: true,
      trafficLight: true,
      motionState: true,
      positions: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: {
          latitude: true,
          longitude: true,
          speed: true,
          heading: true,
          timestamp: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const vehiclesWithPosition = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    trafficLight: v.trafficLight,
    motionState: v.motionState,
    latestPosition: v.positions[0]
      ? {
          latitude: v.positions[0].latitude,
          longitude: v.positions[0].longitude,
          speed: v.positions[0].speed,
          heading: v.positions[0].heading,
          timestamp: v.positions[0].timestamp.toISOString(),
        }
      : null,
  }));

  return (
    <div className="flex h-full gap-4">
      {/* Map area — ~70% width */}
      <div className="flex-[7] rounded-lg border border-slate-200 bg-white overflow-hidden">
        <DashboardMap initialVehicles={vehiclesWithPosition} />
      </div>

      {/* Status sidebar — ~30% width */}
      <div className="flex-[3] rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Fleet Status</h2>
        <p className="mt-2 text-sm text-slate-500">
          Vehicle statuses and alerts will appear here.
        </p>
      </div>
    </div>
  );
}
