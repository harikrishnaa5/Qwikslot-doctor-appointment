import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { formatTokenDisplay } from "../../lib/tokens.js";

type Tx = Prisma.TransactionClient;

/**
 * Atomically issue the next token for a session.
 * Uses row-level lock via UPDATE ... RETURNING pattern in Prisma increment.
 */
export async function issueNextToken(tx: Tx, sessionId: string): Promise<number> {
  const session = await tx.doctorSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, tokenCounter: true },
  });
  if (!session) throw new AppError(404, "Session not found", "NOT_FOUND");
  if (session.status === "CLOSED") {
    throw new AppError(400, "Session is closed for new bookings", "SESSION_CLOSED");
  }

  const updated = await tx.doctorSession.update({
    where: { id: sessionId },
    data: { tokenCounter: { increment: 1 } },
    select: { tokenCounter: true },
  });

  return updated.tokenCounter;
}

export function formatTokenFields(tokenNumber: number) {
  return {
    tokenNumber,
    token: formatTokenDisplay(tokenNumber),
  };
}
