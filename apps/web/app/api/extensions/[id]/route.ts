import { NextRequest, NextResponse } from "next/server";
import { Role, ExtensionInstallMethod } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ExtensionUpdateSchema } from "@/lib/schemas";
import { parseJsonBody, handlePrismaError, jsonError } from "@/lib/api";

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

  const extension = await prisma.extension.findUnique({ where: { id } });
  if (!extension) {
    return jsonError("Extension not found", 404);
  }

  return NextResponse.json({ data: extension });
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
  const parsed = ExtensionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  try {
    const existing = await prisma.extension.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Extension not found", 404);
    }

    const extension = await prisma.extension.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.extensionId !== undefined && { extensionId: data.extensionId }),
        ...(data.browser !== undefined && { browser: data.browser }),
        ...(data.chromeStoreUrl !== undefined && { chromeStoreUrl: data.chromeStoreUrl ?? null }),
        ...(data.installMethod !== undefined && { installMethod: data.installMethod as ExtensionInstallMethod }),
      },
    });

    await logAudit(auth.user.id, "UPDATE", "Extension", extension.id, {
      name: extension.name,
      changedFields: Object.keys(data),
    });

    return NextResponse.json({ data: extension });
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
    const extension = await prisma.extension.findUnique({ where: { id } });
    if (!extension) {
      return jsonError("Extension not found", 404);
    }

    await prisma.extension.delete({ where: { id } });

    await logAudit(auth.user.id, "DELETE", "Extension", extension.id, {
      name: extension.name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err);
  }
}
