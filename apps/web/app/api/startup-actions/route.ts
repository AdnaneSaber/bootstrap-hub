import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { StartupActionCreateSchema } from "@/lib/schemas";
import { parseJsonBody, handlePrismaError, jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const where = search
    ? {
        OR: [{ name: { contains: search, mode: "insensitive" as const } }],
      }
    : {};

  const startupActions = await prisma.startupAction.findMany({
    where,
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ startupActions });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const body = await parseJsonBody(req);
  const parsed = StartupActionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  try {
    const action = await prisma.startupAction.create({
      data: {
        name: data.name,
        actionType: data.actionType,
        target: data.target,
        arguments: data.arguments ?? null,
        workingDir: data.workingDir ?? null,
        order: data.order,
        enabled: data.enabled,
      },
    });

    await logAudit(auth.user.id, "CREATE", "StartupAction", action.id, {
      name: action.name,
      actionType: action.actionType,
    });

    return NextResponse.json({ data: action }, { status: 201 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
