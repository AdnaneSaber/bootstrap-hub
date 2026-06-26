import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const bundle = await prisma.bundle.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, email: true, name: true } } },
  });

  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  return NextResponse.json(bundle);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const bundle = await prisma.bundle.findUnique({ where: { id } });
  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  if (bundle.filePath) {
    try {
      const safePath = path.join(path.dirname(bundle.filePath), path.basename(bundle.filePath));
      if (fs.existsSync(safePath)) {
        await fs.promises.rm(safePath);
      }
    } catch (err) {
      console.error("Failed to delete bundle file:", err);
    }
  }

  await prisma.bundle.delete({ where: { id } });

  await logAudit(auth.user.id, "DELETE", "Bundle", id, { name: bundle.name });

  return NextResponse.json({ success: true });
}
