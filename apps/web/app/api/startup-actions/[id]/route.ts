import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { StartupActionUpdateSchema } from "@/lib/schemas";
import { parseJsonBody, handlePrismaError, jsonError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const action = await prisma.startupAction.findUnique({ where: { id } });
  if (!action) {
    return jsonError("Startup action not found", 404);
  }

  return NextResponse.json({ data: action });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await parseJsonBody(req);
  const parsed = StartupActionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  try {
    const existing = await prisma.startupAction.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Startup action not found", 404);
    }

    const action = await prisma.startupAction.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.actionType !== undefined && { actionType: data.actionType }),
        ...(data.target !== undefined && { target: data.target }),
        ...(data.arguments !== undefined && { arguments: data.arguments ?? null }),
        ...(data.workingDir !== undefined && { workingDir: data.workingDir ?? null }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });

    await logAudit(auth.user.id, "UPDATE", "StartupAction", action.id, {
      name: action.name,
      changedFields: Object.keys(data),
    });

    return NextResponse.json({ data: action });
  } catch (err) {
    return handlePrismaError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const action = await prisma.startupAction.findUnique({ where: { id } });
    if (!action) {
      return jsonError("Startup action not found", 404);
    }

    await prisma.startupAction.delete({ where: { id } });

    await logAudit(auth.user.id, "DELETE", "StartupAction", action.id, {
      name: action.name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err);
  }
}
