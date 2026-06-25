import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAudit(
  userId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        meta: (meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
