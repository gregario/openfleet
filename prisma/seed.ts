import { PrismaClient, Role, VehicleStatus, AssignmentType, AlertSeverity, InspectionResult } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ─── Seed ───────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding OpenFleet database...\n");

  // ── Clear existing data (reverse dependency order) ──────────────
  console.log("Clearing existing data...");
  await prisma.inspectionResponse.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.inspectionTemplateItem.deleteMany();
  await prisma.inspectionTemplate.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.serviceSchedule.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.position.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driverAssignment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.setting.deleteMany();
  console.log("  Done.\n");

  // ── Users ───────────────────────────────────────────────────────
  console.log("Creating users...");
  const passwordHash = await hashPassword("openfleet123");

  const sarah = await prisma.user.create({
    data: {
      email: "sarah@clearwaterplumbing.co.uk",
      passwordHash,
      name: "Sarah Mitchell",
      role: Role.ADMIN,
      phone: "+44 117 496 0312",
      privacyAckedAt: daysAgo(180),
    },
  });

  const james = await prisma.user.create({
    data: {
      email: "james.cooper@clearwaterplumbing.co.uk",
      passwordHash,
      name: "James Cooper",
      role: Role.DRIVER,
      phone: "+44 7700 900142",
      licenseNumber: "COOPE805236JC9AB",
      licenseExpiry: daysFromNow(540),
      privacyAckedAt: daysAgo(150),
    },
  });

  const priya = await prisma.user.create({
    data: {
      email: "priya.patel@clearwaterplumbing.co.uk",
      passwordHash,
      name: "Priya Patel",
      role: Role.DRIVER,
      phone: "+44 7700 900287",
      licenseNumber: "PATEL956017PP5CD",
      licenseExpiry: daysFromNow(320),
      privacyAckedAt: daysAgo(150),
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: "marcus.williams@clearwaterplumbing.co.uk",
      passwordHash,
      name: "Marcus Williams",
      role: Role.DRIVER,
      phone: "+44 7700 900463",
      licenseNumber: "WILLI870622MW7EF",
      licenseExpiry: daysFromNow(210),
      privacyAckedAt: daysAgo(120),
    },
  });

  const ling = await prisma.user.create({
    data: {
      email: "ling.chen@clearwaterplumbing.co.uk",
      passwordHash,
      name: "Ling Chen",
      role: Role.DRIVER,
      phone: "+44 7700 900518",
      licenseNumber: "CHENX901114LC2GH",
      licenseExpiry: daysFromNow(680),
      privacyAckedAt: daysAgo(90),
    },
  });

  console.log(`  Created ${5} users.\n`);

  // ── Vehicles ────────────────────────────────────────────────────
  console.log("Creating vehicles...");

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        name: "Van 01",
        make: "Ford",
        model: "Transit Custom 300",
        year: 2022,
        vin: "WF0XXXGCDXNY12345",
        licensePlate: "WR71 HJK",
        color: "White",
        status: VehicleStatus.ACTIVE,
        odometer: 42350,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 02",
        make: "Mercedes-Benz",
        model: "Sprinter 314 CDI",
        year: 2021,
        vin: "WDB9066331S789012",
        licensePlate: "WR21 BNM",
        color: "White",
        status: VehicleStatus.ACTIVE,
        odometer: 67820,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 03",
        make: "Ford",
        model: "Transit Custom 280",
        year: 2023,
        vin: "WF0XXXGCDXPY34567",
        licensePlate: "WR73 CDF",
        color: "Silver",
        status: VehicleStatus.ACTIVE,
        odometer: 15430,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 04",
        make: "Vauxhall",
        model: "Vivaro 2900",
        year: 2020,
        vin: "W0LJ7B6A1LV890123",
        licensePlate: "WR20 TPG",
        color: "Blue",
        status: VehicleStatus.ACTIVE,
        odometer: 83200,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 05",
        make: "Volkswagen",
        model: "Caddy Cargo",
        year: 2022,
        vin: "WV1ZZZ2KZNX456789",
        licensePlate: "WR72 KLM",
        color: "White",
        status: VehicleStatus.ACTIVE,
        odometer: 31650,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 06",
        make: "Mercedes-Benz",
        model: "Vito 114 CDI",
        year: 2019,
        vin: "WDF44760313P012345",
        licensePlate: "WR19 FGH",
        color: "Grey",
        status: VehicleStatus.IN_SHOP,
        odometer: 94750,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 07",
        make: "Ford",
        model: "Transit Connect 240",
        year: 2019,
        vin: "WF0XXXWPGXJY67890",
        licensePlate: "WR69 RST",
        color: "White",
        status: VehicleStatus.DECOMMISSIONED,
        odometer: 132400,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Van 08",
        make: "Vauxhall",
        model: "Vivaro-e 3100",
        year: 2023,
        vin: "W0LJ7B6A1MV234567",
        licensePlate: "WR73 WXY",
        color: "White",
        status: VehicleStatus.ACTIVE,
        odometer: 18200,
      },
    }),
  ]);

  const [van01, van02, van03, van04, van05, van06, van07, van08] = vehicles;
  console.log(`  Created ${vehicles.length} vehicles.\n`);

  // ── Service Types ───────────────────────────────────────────────
  console.log("Creating service types...");

  const serviceTypeData = [
    { name: "Oil Change", isDefault: true },
    { name: "Tire Rotation", isDefault: true },
    { name: "Brake Inspection", isDefault: true },
    { name: "Air Filter Replacement", isDefault: true },
    { name: "Fluid Top-up", isDefault: true },
    { name: "Belt Inspection", isDefault: true },
    { name: "Battery Check", isDefault: true },
  ];

  const serviceTypes: Record<string, { id: string }> = {};
  for (const st of serviceTypeData) {
    const created = await prisma.serviceType.create({ data: st });
    serviceTypes[st.name] = created;
  }

  console.log(`  Created ${serviceTypeData.length} service types.\n`);

  // ── Service Schedules ───────────────────────────────────────────
  console.log("Creating service schedules...");

  const activeVehicles = [van01, van02, van03, van04, van05, van08];
  const scheduleEntries: Array<{
    vehicleId: string;
    serviceTypeId: string;
    intervalKm?: number;
    intervalDays?: number;
    warningKm?: number;
    warningDays?: number;
    estimatedCost?: number;
    lastServicedAt?: Date;
    lastServicedKm?: number;
    nextDueAt?: Date;
    nextDueKm?: number;
  }> = [];

  // Van 01 — Oil Change (mileage), Tire Rotation (mileage), Brake Inspection (time)
  scheduleEntries.push({
    vehicleId: van01.id,
    serviceTypeId: serviceTypes["Oil Change"].id,
    intervalKm: 10000,
    warningKm: 1000,
    estimatedCost: 85,
    lastServicedAt: daysAgo(45),
    lastServicedKm: 38000,
    nextDueKm: 48000,
  });
  scheduleEntries.push({
    vehicleId: van01.id,
    serviceTypeId: serviceTypes["Tire Rotation"].id,
    intervalKm: 15000,
    warningKm: 2000,
    estimatedCost: 40,
    lastServicedAt: daysAgo(90),
    lastServicedKm: 30000,
    nextDueKm: 45000, // approaching due
  });
  scheduleEntries.push({
    vehicleId: van01.id,
    serviceTypeId: serviceTypes["Brake Inspection"].id,
    intervalDays: 180,
    warningDays: 14,
    estimatedCost: 60,
    lastServicedAt: daysAgo(170),
    nextDueAt: daysFromNow(10), // approaching due
  });

  // Van 02 — Oil Change (mileage), Belt Inspection (time)
  scheduleEntries.push({
    vehicleId: van02.id,
    serviceTypeId: serviceTypes["Oil Change"].id,
    intervalKm: 10000,
    warningKm: 1000,
    estimatedCost: 95,
    lastServicedAt: daysAgo(30),
    lastServicedKm: 62000,
    nextDueKm: 72000,
  });
  scheduleEntries.push({
    vehicleId: van02.id,
    serviceTypeId: serviceTypes["Belt Inspection"].id,
    intervalDays: 365,
    warningDays: 30,
    estimatedCost: 45,
    lastServicedAt: daysAgo(340),
    nextDueAt: daysFromNow(25),
  });

  // Van 03 — Oil Change (mileage), Air Filter (mileage)
  scheduleEntries.push({
    vehicleId: van03.id,
    serviceTypeId: serviceTypes["Oil Change"].id,
    intervalKm: 10000,
    warningKm: 1000,
    estimatedCost: 85,
    lastServicedAt: daysAgo(60),
    lastServicedKm: 10000,
    nextDueKm: 20000,
  });
  scheduleEntries.push({
    vehicleId: van03.id,
    serviceTypeId: serviceTypes["Air Filter Replacement"].id,
    intervalKm: 20000,
    warningKm: 2000,
    estimatedCost: 35,
    lastServicedAt: daysAgo(60),
    lastServicedKm: 10000,
    nextDueKm: 30000,
  });

  // Van 04 — Oil Change (mileage), Brake Inspection (time), Battery Check (time)
  scheduleEntries.push({
    vehicleId: van04.id,
    serviceTypeId: serviceTypes["Oil Change"].id,
    intervalKm: 10000,
    warningKm: 1000,
    estimatedCost: 80,
    lastServicedAt: daysAgo(15),
    lastServicedKm: 80000,
    nextDueKm: 90000,
  });
  scheduleEntries.push({
    vehicleId: van04.id,
    serviceTypeId: serviceTypes["Brake Inspection"].id,
    intervalDays: 180,
    warningDays: 14,
    estimatedCost: 60,
    lastServicedAt: daysAgo(160),
    nextDueAt: daysFromNow(20),
  });
  scheduleEntries.push({
    vehicleId: van04.id,
    serviceTypeId: serviceTypes["Battery Check"].id,
    intervalDays: 90,
    warningDays: 7,
    estimatedCost: 25,
    lastServicedAt: daysAgo(85),
    nextDueAt: daysFromNow(5), // approaching due
  });

  // Van 05 — Oil Change (mileage), Fluid Top-up (time)
  scheduleEntries.push({
    vehicleId: van05.id,
    serviceTypeId: serviceTypes["Oil Change"].id,
    intervalKm: 10000,
    warningKm: 1000,
    estimatedCost: 75,
    lastServicedAt: daysAgo(50),
    lastServicedKm: 25000,
    nextDueKm: 35000,
  });
  scheduleEntries.push({
    vehicleId: van05.id,
    serviceTypeId: serviceTypes["Fluid Top-up"].id,
    intervalDays: 90,
    warningDays: 7,
    estimatedCost: 30,
    lastServicedAt: daysAgo(80),
    nextDueAt: daysFromNow(10),
  });

  // Van 08 — Oil Change (mileage), Tire Rotation (mileage)
  scheduleEntries.push({
    vehicleId: van08.id,
    serviceTypeId: serviceTypes["Oil Change"].id,
    intervalKm: 10000,
    warningKm: 1000,
    estimatedCost: 85,
    lastServicedAt: daysAgo(40),
    lastServicedKm: 12000,
    nextDueKm: 22000,
  });
  scheduleEntries.push({
    vehicleId: van08.id,
    serviceTypeId: serviceTypes["Tire Rotation"].id,
    intervalKm: 15000,
    warningKm: 2000,
    estimatedCost: 40,
    lastServicedAt: daysAgo(40),
    lastServicedKm: 12000,
    nextDueKm: 27000,
  });

  for (const entry of scheduleEntries) {
    await prisma.serviceSchedule.create({ data: entry });
  }

  console.log(`  Created ${scheduleEntries.length} service schedules.\n`);

  // ── Inspection Templates ────────────────────────────────────────
  console.log("Creating inspection templates...");

  const dailyTemplate = await prisma.inspectionTemplate.create({
    data: {
      name: "Daily Pre-Trip Check",
      description: "Required daily check before the first journey. Covers safety-critical items.",
    },
  });

  const dailyItems = [
    "Tires — condition and pressure",
    "Lights — headlights, indicators, brake lights",
    "Brakes — pedal feel and handbrake",
    "Fluid Levels — visible leaks under vehicle",
    "Seatbelt — buckle and retraction",
    "Mirrors — adjustment and cleanliness",
    "Horn — functioning",
    "Windscreen — chips, cracks, washer fluid",
    "Tool Inventory — pipe wrenches, fittings bag, torch",
  ];

  for (let i = 0; i < dailyItems.length; i++) {
    await prisma.inspectionTemplateItem.create({
      data: {
        templateId: dailyTemplate.id,
        label: dailyItems[i],
        sortOrder: i + 1,
      },
    });
  }

  const weeklyTemplate = await prisma.inspectionTemplate.create({
    data: {
      name: "Weekly Vehicle Check",
      description: "Comprehensive weekly inspection covering all daily items plus fluid levels and safety equipment.",
    },
  });

  const weeklyItems = [
    ...dailyItems,
    "Oil Level — dipstick check",
    "Coolant — reservoir level",
    "Wiper Blades — wear and streaking",
    "Fire Extinguisher — present and in-date",
    "First Aid Kit — sealed and in-date",
  ];

  for (let i = 0; i < weeklyItems.length; i++) {
    await prisma.inspectionTemplateItem.create({
      data: {
        templateId: weeklyTemplate.id,
        label: weeklyItems[i],
        sortOrder: i + 1,
      },
    });
  }

  console.log(`  Created 2 inspection templates (${dailyItems.length} + ${weeklyItems.length} items).\n`);

  // ── Driver Assignments ──────────────────────────────────────────
  console.log("Creating driver assignments...");

  // Current active assignments
  await prisma.driverAssignment.create({
    data: {
      userId: james.id,
      vehicleId: van01.id,
      type: AssignmentType.ASSIGNED,
      startedAt: daysAgo(120),
      isActive: true,
    },
  });

  await prisma.driverAssignment.create({
    data: {
      userId: priya.id,
      vehicleId: van03.id,
      type: AssignmentType.ASSIGNED,
      startedAt: daysAgo(90),
      isActive: true,
    },
  });

  await prisma.driverAssignment.create({
    data: {
      userId: marcus.id,
      vehicleId: van04.id,
      type: AssignmentType.ASSIGNED,
      startedAt: daysAgo(200),
      isActive: true,
    },
  });

  await prisma.driverAssignment.create({
    data: {
      userId: ling.id,
      vehicleId: van05.id,
      type: AssignmentType.ASSIGNED,
      startedAt: daysAgo(60),
      isActive: true,
    },
  });

  // Historical assignment: Ling was previously on Van 02
  await prisma.driverAssignment.create({
    data: {
      userId: ling.id,
      vehicleId: van02.id,
      type: AssignmentType.ASSIGNED,
      startedAt: daysAgo(180),
      endedAt: daysAgo(60),
      isActive: false,
    },
  });

  console.log("  Created 5 driver assignments (4 active, 1 historical).\n");

  // ── Documents ───────────────────────────────────────────────────
  console.log("Creating documents...");

  const docEntries: Array<{
    vehicleId: string;
    type: string;
    name: string;
    expiresAt?: Date;
  }> = [];

  for (const v of vehicles) {
    docEntries.push({
      vehicleId: v.id,
      type: "registration",
      name: `V5C Registration — ${v.licensePlate}`,
      expiresAt: undefined, // V5C doesn't expire
    });

    // Insurance — most valid, one expiring soon
    const isExpiringSoon = v.id === van04.id;
    docEntries.push({
      vehicleId: v.id,
      type: "insurance",
      name: `Motor Trade Insurance — ${v.licensePlate}`,
      expiresAt: isExpiringSoon ? daysFromNow(12) : daysFromNow(180 + Math.floor(Math.random() * 180)),
    });
  }

  // MOT certificates for older vehicles
  docEntries.push({
    vehicleId: van04.id,
    type: "mot",
    name: `MOT Certificate — ${van04.licensePlate}`,
    expiresAt: daysFromNow(45),
  });
  docEntries.push({
    vehicleId: van06.id,
    type: "mot",
    name: `MOT Certificate — ${van06.licensePlate}`,
    expiresAt: daysFromNow(8), // expiring very soon
  });

  for (const doc of docEntries) {
    await prisma.document.create({ data: doc });
  }

  console.log(`  Created ${docEntries.length} documents.\n`);

  // ── Alerts ──────────────────────────────────────────────────────
  console.log("Creating alerts...");

  await prisma.alert.createMany({
    data: [
      {
        vehicleId: van01.id,
        type: "service_due",
        severity: AlertSeverity.WARNING,
        title: "Tire rotation approaching",
        message: `Van 01 (${van01.licensePlate}) tire rotation due at 45,000 km. Current odometer: 42,350 km.`,
      },
      {
        vehicleId: van04.id,
        type: "service_due",
        severity: AlertSeverity.WARNING,
        title: "Battery check due soon",
        message: `Van 04 (${van04.licensePlate}) battery check due in 5 days.`,
      },
      {
        vehicleId: van06.id,
        type: "document_expiring",
        severity: AlertSeverity.CRITICAL,
        title: "MOT expiring — Van 06",
        message: `MOT certificate for Van 06 (${van06.licensePlate}) expires in 8 days. Vehicle is currently in-shop — ensure MOT is renewed before return to service.`,
      },
      {
        vehicleId: van04.id,
        type: "document_expiring",
        severity: AlertSeverity.WARNING,
        title: "Insurance renewal — Van 04",
        message: `Motor trade insurance for Van 04 (${van04.licensePlate}) expires in 12 days.`,
      },
      {
        vehicleId: van02.id,
        type: "inspection_overdue",
        severity: AlertSeverity.INFO,
        title: "Weekly inspection overdue — Van 02",
        message: `Van 02 (${van02.licensePlate}) has not had a weekly inspection in 9 days. No driver currently assigned.`,
      },
    ],
  });

  console.log("  Created 5 alerts.\n");

  // ── Settings ────────────────────────────────────────────────────
  console.log("Creating settings...");

  await prisma.setting.createMany({
    data: [
      {
        key: "tracking_schedule",
        value: {
          enabled: true,
          start: "07:00",
          end: "18:00",
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        },
      },
      {
        key: "data_retention_days",
        value: 365,
      },
      {
        key: "company_name",
        value: "Clearwater Plumbing Services",
      },
      {
        key: "company_timezone",
        value: "Europe/London",
      },
    ],
  });

  console.log("  Created 4 settings.\n");

  // ── Summary ─────────────────────────────────────────────────────
  console.log("=== Seed complete ===");
  console.log("  Users:               5 (1 admin, 4 drivers)");
  console.log("  Vehicles:            8 (6 active, 1 in-shop, 1 decommissioned)");
  console.log("  Service Types:       7");
  console.log(`  Service Schedules:   ${scheduleEntries.length}`);
  console.log("  Inspection Templates: 2");
  console.log("  Driver Assignments:  5 (4 active, 1 historical)");
  console.log(`  Documents:           ${docEntries.length}`);
  console.log("  Alerts:              5");
  console.log("  Settings:            4");
  console.log("");
  console.log("Demo login: sarah@clearwaterplumbing.co.uk / openfleet123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
