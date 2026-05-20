import { randomUUID } from "crypto";
import { AppError } from "../../lib/errors.js";

type Pending = {
  userId: string;
  doctorId: string;
  scheduledAt: string;
  expiresAt: number;
};

const pending = new Map<string, Pending>();

export function createMockIntent(input: {
  userId: string;
  doctorId: string;
  scheduledAt: string;
}) {
  const id = `mock_${randomUUID()}`;
  const scheduledAt = new Date(input.scheduledAt).toISOString();
  pending.set(id, {
    userId: input.userId,
    doctorId: input.doctorId,
    scheduledAt,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return { paymentRef: id, provider: "mock" as const };
}

export function consumeMockIntent(paymentRef: string, userId: string) {
  const row = pending.get(paymentRef);
  if (!row) throw new AppError(400, "Invalid or expired payment reference", "PAYMENT_INVALID");
  if (row.userId !== userId) throw new AppError(403, "Payment does not belong to this user", "PAYMENT_FORBIDDEN");
  if (Date.now() > row.expiresAt) {
    pending.delete(paymentRef);
    throw new AppError(400, "Payment reference expired", "PAYMENT_EXPIRED");
  }
  pending.delete(paymentRef);
  return row;
}
