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
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error("Vehicles list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
