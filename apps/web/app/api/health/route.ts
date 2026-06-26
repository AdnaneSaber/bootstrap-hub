import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import { BUNDLE_DIR } from "@/lib/paths";

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (err) {
    console.error("Health DB check failed:", err);
  }

  let writable = false;
  try {
    if (!fs.existsSync(BUNDLE_DIR)) {
      fs.mkdirSync(BUNDLE_DIR, { recursive: true });
    }
    fs.accessSync(BUNDLE_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }

  const status = db && writable ? 200 : 503;
  return NextResponse.json({ status: db && writable ? "ok" : "degraded", db, bundleDirWritable: writable }, { status });
}
