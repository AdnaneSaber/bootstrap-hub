import { NextRequest, NextResponse } from "next/server";
import { ExtensionInstallMethod, Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ExtensionCreateSchema } from "@/lib/schemas";
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

  const extensions = await prisma.extension.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ extensions });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const body = await parseJsonBody(req);
  const parsed = ExtensionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  try {
    const extension = await prisma.extension.create({
      data: {
        name: data.name,
        extensionId: data.extensionId,
        browser: data.browser,
        chromeStoreUrl: data.chromeStoreUrl ?? null,
        installMethod: data.installMethod ?? ExtensionInstallMethod.POLICY,
      },
    });

    await logAudit(auth.user.id, "CREATE", "Extension", extension.id, {
      name: extension.name,
    });

    return NextResponse.json({ data: extension }, { status: 201 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
