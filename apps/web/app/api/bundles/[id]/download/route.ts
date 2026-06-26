import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const bundle = await prisma.bundle.findUnique({ where: { id } });
  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  if (!bundle.filePath || !fs.existsSync(bundle.filePath)) {
    return NextResponse.json({ error: "Bundle file not found" }, { status: 404 });
  }

  try {
    const buffer = await fs.promises.readFile(bundle.filePath);
    const safeName = bundle.name.replace(/[^a-z0-9_-]/gi, "_");

    await prisma.bundle.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
        "Content-Length": String(buffer.length),
        "X-Bundle-Signature": bundle.signature,
      },
    });
  } catch (err) {
    console.error("Failed to read bundle file:", err);
    return NextResponse.json({ error: "Failed to read bundle file" }, { status: 500 });
  }
}
