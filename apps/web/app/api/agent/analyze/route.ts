import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role, Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/rbac";
import { analyzeApplications, ApplicationDraft } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const AnalyzeRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  createDrafts: z.boolean().default(false),
});

function applicationCreateInput(draft: ApplicationDraft): Prisma.ApplicationCreateInput {
  return {
    name: draft.name,
    description: draft.description,
    category: draft.category,
    version: draft.version,
    downloadUrl: draft.downloadUrl,
    installMethod: draft.installMethod,
    silentInstallCommand: draft.silentInstallCommand,
    detectionMethod: draft.detectionMethod,
    detectionRule: draft.detectionRule as Prisma.InputJsonValue,
    launchAfterInstall: draft.launchAfterInstall,
    launchArguments: draft.launchArguments,
    isDraft: true,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { prompt, createDrafts } = parsed.data;

  const auth = createDrafts
    ? await requireRole(req, [Role.ADMIN, Role.OPERATOR])
    : await requireAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  const { user } = auth;

  let drafts: ApplicationDraft[];
  try {
    drafts = await analyzeApplications(prompt);
  } catch (err) {
    console.error("Agent analysis failed:", err);
    return NextResponse.json(
      {
        error: "Agent analysis failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }

  if (!createDrafts) {
    await logAudit(user.id, "AGENT_ANALYZE", "Application", undefined, {
      prompt,
      draftCount: drafts.length,
    });
    return NextResponse.json({ drafts });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const applications: Prisma.ApplicationGetPayload<{}>[] = [];
      for (const draft of drafts) {
        const app = await tx.application.create({
          data: applicationCreateInput(draft),
        });
        applications.push(app);
      }
      return applications;
    });

    await logAudit(user.id, "AGENT_CREATE_DRAFTS", "Application", undefined, {
      prompt,
      count: created.length,
      ids: created.map((a) => a.id),
    });

    return NextResponse.json({ drafts: created });
  } catch (err) {
    console.error("Failed to save agent drafts:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "One or more application names already exist" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save application drafts" },
      { status: 500 }
    );
  }
}
