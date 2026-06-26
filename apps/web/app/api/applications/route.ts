import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ApplicationCreateSchema } from "@/lib/schemas";
import { parseJsonBody, handlePrismaError, jsonError } from "@/lib/api";

const includeFile = {
  file: { select: { id: true, originalName: true, sha256: true } },
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const applications = await prisma.application.findMany({
    where,
    orderBy: { name: "asc" },
    include: includeFile,
  });

  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const body = await parseJsonBody(req);
  const parsed = ApplicationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  try {
    const application = await prisma.application.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        version: data.version ?? null,
        downloadUrl: data.downloadUrl ?? null,
        installMethod: data.installMethod,
        silentInstallCommand: data.silentInstallCommand ?? null,
        installArgs: (data.installArgs ?? []) as Prisma.InputJsonValue,
        detectionMethod: data.detectionMethod,
        detectionRule: (data.detectionRule ?? {}) as Prisma.InputJsonValue,
        launchAfterInstall: data.launchAfterInstall ?? false,
        launchArguments: data.launchArguments ?? null,
        sha256: data.sha256 ?? null,
        fileId: data.fileId ?? undefined,
        isDraft: data.isDraft ?? false,
      },
      include: includeFile,
    });

    await logAudit(auth.user.id, "CREATE", "Application", application.id, {
      name: application.name,
    });

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
