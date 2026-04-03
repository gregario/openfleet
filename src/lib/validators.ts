import { z } from "zod";

export const positionSchema = z.object({
  vehicle_id: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime(),
});

export const positionBatchSchema = z.union([
  positionSchema,
  z.array(positionSchema),
]);

export type PositionInput = z.infer<typeof positionSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createVehicleSchema = z.object({
  name: z.string().min(1).max(100),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 2),
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]+$/).optional().or(z.literal("")),
  licensePlate: z.string().min(1).max(20),
  color: z.string().max(30).optional().or(z.literal("")),
  odometer: z.number().int().min(0).default(0),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema
  .omit({ photoUrl: true })
  .partial()
  .extend({
    status: z.enum(["ACTIVE", "IN_SHOP", "DECOMMISSIONED"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
