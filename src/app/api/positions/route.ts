import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { positionBatchSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = positionBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const positions = Array.isArray(parsed.data)
      ? parsed.data
      : [parsed.data];

    // Validate all vehicle IDs exist
    const vehicleIds = [...new Set(positions.map((p) => p.vehicle_id))];
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, status: "ACTIVE" },
      select: { id: true },
    });
    const validIds = new Set(vehicles.map((v) => v.id));

    const validPositions = positions.filter((p) => validIds.has(p.vehicle_id));
    if (validPositions.length === 0) {
      return NextResponse.json(
        { error: "No valid vehicle IDs found" },
        { status: 404 },
      );
    }

    // Insert positions
    const created = await prisma.position.createMany({
      data: validPositions.map((p) => ({
        vehicleId: p.vehicle_id,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        timestamp: new Date(p.timestamp),
      })),
    });

    // Update vehicle motion state for each vehicle based on latest position
    const latestByVehicle = new Map<string, (typeof validPositions)[0]>();
    for (const p of validPositions) {
      const existing = latestByVehicle.get(p.vehicle_id);
      if (!existing || p.timestamp > existing.timestamp) {
        latestByVehicle.set(p.vehicle_id, p);
      }
    }

    await Promise.all(
      [...latestByVehicle.entries()].map(([vehicleId, pos]) => {
        const speed = pos.speed ?? 0;
        let motionState: "MOVING" | "IDLE" | "PARKED";
        if (speed > 5) {
          motionState = "MOVING";
        } else if (speed > 0.5) {
          motionState = "IDLE";
        } else {
          motionState = "PARKED";
        }

        return prisma.vehicle.update({
          where: { id: vehicleId },
          data: { motionState },
        });
      }),
    );

    return NextResponse.json({
      accepted: created.count,
      rejected: positions.length - validPositions.length,
    });
  } catch (error) {
    console.error("Position ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
