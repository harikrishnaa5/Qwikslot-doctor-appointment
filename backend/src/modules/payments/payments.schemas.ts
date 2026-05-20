import { z } from "zod";

export const mockIntentSchema = z.object({
  doctorId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

export const mockConfirmSchema = z.object({
  paymentRef: z.string().min(1),
});
