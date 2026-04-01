import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: { not: "DECOMMISSIONED" } },
      select: {
        id: true,
        name: true,
        make: true,
        model: true,
        year: true,
        licensePlate: true,
        color: true,
        status: true,
        odometer: true,
        motionState: true,
        trafficLight: true,
        positions: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Flatten the latest position into the vehicle object
    const result = vehicles.map((v) => ({
      ...v,
      latestPosition: v.positions[0] ?? null,
      positions: undefined,
    }));

    return NextResponse.json({ vehicles: result });
  } catch (error) {
    console.error("Vehicles list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
