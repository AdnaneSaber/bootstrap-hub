import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
}

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: session.user as unknown as SessionUser };
}

export async function requireRole(req: NextRequest, roles: Role[]) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth;
  if (!roles.includes(auth.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
