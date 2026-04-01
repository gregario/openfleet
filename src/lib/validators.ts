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
