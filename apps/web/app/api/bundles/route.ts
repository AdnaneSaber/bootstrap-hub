import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildBundle } from "@/lib/bundle-engine";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  applicationIds: z.array(z.string()).optional().default([]),
  extensionIds: z.array(z.string()).optional().default([]),
  startupActionIds: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
  const search = searchParams.get("search")?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { createdBy: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [bundles, total] = await Promise.all([
    prisma.bundle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { createdBy: { select: { id: true, email: true, name: true } } },
    }),
    prisma.bundle.count({ where }),
  ]);

  return NextResponse.json({ bundles, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, applicationIds, extensionIds, startupActionIds } = parsed.data;

  try {
    const result = await buildBundle(
      {
        name,
        applicationIds,
        extensionIds,
        startupActionIds,
      },
      auth.user.id
    );

    await logAudit(auth.user.id, result.existing ? "REUSE" : "CREATE", "Bundle", result.bundleId, {
      name,
      existing: result.existing,
      applicationCount: applicationIds.length,
      extensionCount: extensionIds.length,
      startupActionCount: startupActionIds.length,
    });

    return NextResponse.json(
      { data: result },
      { status: result.existing ? 200 : 201 }
    );
  } catch (err) {
    console.error("Failed to create bundle:", err);
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
  }
}
