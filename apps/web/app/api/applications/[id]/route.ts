import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ApplicationUpdateSchema } from "@/lib/schemas";
import { parseJsonBody, handlePrismaError, jsonError } from "@/lib/api";

const includeFile = {
  file: { select: { id: true, originalName: true, sha256: true } },
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (typeof id !== "string") {
    return jsonError("Invalid identifier", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: includeFile,
  });

  if (!application) {
    return jsonError("Application not found", 404);
  }

  return NextResponse.json({ data: application });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (typeof id !== "string") {
    return jsonError("Invalid identifier", 400);
  }

  const body = await parseJsonBody(req);
  const parsed = ApplicationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  try {
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Application not found", 404);
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.version !== undefined && { version: data.version ?? null }),
        ...(data.downloadUrl !== undefined && { downloadUrl: data.downloadUrl ?? null }),
        ...(data.installMethod !== undefined && { installMethod: data.installMethod }),
        ...(data.silentInstallCommand !== undefined && {
          silentInstallCommand: data.silentInstallCommand ?? null,
        }),
        ...(data.installArgs !== undefined && {
          installArgs: (data.installArgs ?? []) as Prisma.InputJsonValue,
        }),
        ...(data.detectionMethod !== undefined && { detectionMethod: data.detectionMethod }),
        ...(data.detectionRule !== undefined && {
          detectionRule: (data.detectionRule ?? {}) as Prisma.InputJsonValue,
        }),
        ...(data.launchAfterInstall !== undefined && { launchAfterInstall: data.launchAfterInstall ?? false }),
        ...(data.launchArguments !== undefined && { launchArguments: data.launchArguments ?? null }),
        ...(data.sha256 !== undefined && { sha256: data.sha256 ?? null }),
        ...(data.fileId !== undefined && { fileId: data.fileId ?? null }),
        ...(data.isDraft !== undefined && { isDraft: data.isDraft ?? false }),
      } as Prisma.ApplicationUpdateInput,
      include: includeFile,
    });

    await logAudit(auth.user.id, "UPDATE", "Application", application.id, {
      name: application.name,
      changedFields: Object.keys(data),
    });

    return NextResponse.json({ data: application });
  } catch (err) {
    return handlePrismaError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (typeof id !== "string") {
    return jsonError("Invalid identifier", 400);
  }

  try {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return jsonError("Application not found", 404);
    }

    await prisma.application.delete({ where: { id } });

    await logAudit(auth.user.id, "DELETE", "Application", application.id, {
      name: application.name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err);
  }
}
