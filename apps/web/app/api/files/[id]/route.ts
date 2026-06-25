import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const uploaded = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!uploaded) {
      return jsonError("File not found", 404);
    }

    if (uploaded.path) {
      try {
        const safePath = path.join(path.dirname(uploaded.path), path.basename(uploaded.path));
        if (fs.existsSync(safePath)) {
          await fs.promises.rm(safePath);
        }
      } catch (err) {
        console.error("Failed to delete physical file:", err);
      }
    }

    await prisma.uploadedFile.delete({ where: { id } });

    await logAudit(auth.user.id, "DELETE", "UploadedFile", id, {
      originalName: uploaded.originalName,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete file:", err);
    return jsonError("Failed to delete file", 500);
  }
}
