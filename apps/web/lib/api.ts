import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function parseJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function handlePrismaError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const fields = (err.meta?.target as string[]) ?? [];
      return jsonError(
        `A record with that ${fields.join(", ") || "value"} already exists.`,
        409
      );
    }
    if (err.code === "P2003") {
      return jsonError("Referenced record does not exist.", 400);
    }
    if (err.code === "P2025") {
      return jsonError("Record not found.", 404);
    }
  }
  console.error("Database error:", err);
  return jsonError("Database error", 500);
}
