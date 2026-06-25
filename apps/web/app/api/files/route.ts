import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";
import { UPLOAD_DIR } from "@/lib/paths";
import { jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const files = await prisma.uploadedFile.findMany({
    orderBy: { createdAt: "desc" },
    include: { applications: { select: { id: true, name: true } } },
  });

  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, [Role.ADMIN, Role.OPERATOR]);
  if ("error" in auth) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("A non-empty file is required", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = sha256(buffer);
    const ext = path.extname(file.name) || "";
    const fileName = `${randomUUID()}${ext}`;

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.promises.writeFile(filePath, buffer);

    const uploaded = await prisma.uploadedFile.create({
      data: {
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        sha256: hash,
        path: filePath,
      },
    });

    await logAudit(auth.user.id, "CREATE", "UploadedFile", uploaded.id, {
      originalName: uploaded.originalName,
      size: uploaded.size,
      sha256: hash,
    });

    return NextResponse.json({ data: uploaded }, { status: 201 });
  } catch (err) {
    console.error("Upload failed:", err);
    return jsonError("Failed to process upload", 500);
  }
}
