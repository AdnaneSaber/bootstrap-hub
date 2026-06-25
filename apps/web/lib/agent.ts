import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const InstallMethodSchema = z.enum([
  "EXE",
  "MSI",
  "ZIP",
  "PORTABLE",
  "WINGET",
  "CHOCO",
]);

const DetectionMethodSchema = z.enum([
  "REGISTRY",
  "PROGRAM",
  "FILE",
  "CUSTOM",
]);

const nullishString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null ? undefined : v));

const nullishRecord = z
  .union([z.record(z.unknown()), z.null(), z.undefined()])
  .transform((v) => (v == null ? {} : v));

export const ApplicationDraftSchema = z.object({
  name: z.string().min(1),
  description: nullishString,
  category: z.string().min(1),
  version: nullishString,
  downloadUrl: nullishString,
  installMethod: InstallMethodSchema,
  silentInstallCommand: nullishString,
  detectionMethod: DetectionMethodSchema,
  detectionRule: nullishRecord,
  launchAfterInstall: z.boolean().default(false),
  launchArguments: nullishString,
});

export const AgentResponseSchema = z.object({
  applications: z.array(ApplicationDraftSchema),
});

export type ApplicationDraft = z.infer<typeof ApplicationDraftSchema>;

function sanitizeDraft(
  draft: z.infer<typeof ApplicationDraftSchema>
): ApplicationDraft {
  return {
    ...draft,
    description: draft.description ?? undefined,
    version: draft.version ?? undefined,
    downloadUrl: draft.downloadUrl ?? undefined,
    silentInstallCommand: draft.silentInstallCommand ?? undefined,
    launchArguments: draft.launchArguments ?? undefined,
    detectionRule: draft.detectionRule ?? {},
    launchAfterInstall: draft.launchAfterInstall ?? false,
  };
}

function buildSystemPrompt(): string {
  return `You are Bootstrap Hub's packaging assistant. Your job is to turn a user's free-text software request into structured Application records for silent Windows deployment.

Return ONLY a valid JSON object with this exact shape:
{
  "applications": [
    {
      "name": "string",
      "description": "string | null",
      "category": "string",
      "version": "string | null",
      "downloadUrl": "string | null",
      "installMethod": "EXE | MSI | ZIP | PORTABLE | WINGET | CHOCO",
      "silentInstallCommand": "string | null",
      "detectionMethod": "REGISTRY | PROGRAM | FILE | CUSTOM",
      "detectionRule": { ... },
      "launchAfterInstall": false,
      "launchArguments": "string | null"
    }
  ]
}

Rules:
- Extract each distinct application mentioned by the user as a separate entry.
- Use the best install method for enterprise silent deployment. Prefer WINGET or CHOCO when the app is available there; otherwise use EXE/MSI with a silent switch.
- detectionRule must match detectionMethod:
  - REGISTRY: { "hive": "HKLM" | "HKCU", "key": "...", "valueName": "...", "expectedValue": "..." }
  - PROGRAM: { "programName": "...", "publisher": "..." }
  - FILE: { "path": "C:\\\\Program Files\\\\..." }
  - CUSTOM: { "script": "..." }
- detectionRule must never be null; use {} only as a last resort.
- Do not include explanatory text outside the JSON.`;
}

function buildUserPrompt(prompt: string): string {
  return `Analyze the following request and produce a structured list of applications to deploy in a Windows enterprise environment.

Request: """${prompt}"""`;
}

export async function analyzeApplications(
  prompt: string
): Promise<ApplicationDraft[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(prompt) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const validated = AgentResponseSchema.parse(parsed);
  return validated.applications.map(sanitizeDraft);
}
