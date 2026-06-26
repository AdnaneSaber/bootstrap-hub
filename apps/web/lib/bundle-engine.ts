import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import archiver from "archiver";
import { prisma } from "@/lib/prisma";
import { sha256, signManifest } from "@/lib/crypto";
import { BUNDLE_DIR } from "@/lib/paths";
import { downloadFile } from "@/lib/downloader";
import { renderInstallerPs1 } from "@/lib/ps1-template";
import { Prisma, type Application, type Extension, type StartupAction, type UploadedFile } from "@prisma/client";

export interface BundleInput {
  name: string;
  applicationIds?: string[];
  extensionIds?: string[];
  startupActionIds?: string[];
}

export interface BundleManifest {
  version: string;
  name: string;
  createdAt: string;
  signature?: string;
  applications: Array<Application & { file?: UploadedFile | null; _bundleFileName?: string }>;
  extensions: Extension[];
  startupActions: StartupAction[];
}

const MANIFEST_VERSION = "1.0";
const SIGNING_SECRET = process.env.BUNDLE_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-min-32-characters-long";

if (!process.env.BUNDLE_SECRET && process.env.NODE_ENV === "production") {
  console.warn("BUNDLE_SECRET is not set; falling back to NEXTAUTH_SECRET. Set BUNDLE_SECRET for production.");
}

export interface BundleBuildResult {
  bundleId: string;
  filePath: string;
  fileSize: number;
  sha256: string;
  signature: string;
  existing: boolean;
}

export async function buildBundle(input: BundleInput, createdById?: string): Promise<BundleBuildResult> {
  if (!fs.existsSync(BUNDLE_DIR)) {
    fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  }

  const [rawApplications, extensions, startupActions] = await Promise.all([
    fetchApplications(input.applicationIds),
    fetchExtensions(input.extensionIds),
    fetchStartupActions(input.startupActionIds),
  ]);

  // Download any application installer files that are referenced by URL but not
  // yet stored on disk. Persist them as UploadedFile records so the bundle
  // contains the actual files requested by the user.
  const applications = await ensureApplicationFiles(rawApplications);

  const selectionHash = computeSelectionHash(applications, extensions, startupActions);
  const existing = await prisma.bundle.findUnique({ where: { selectionHash } });
  if (existing && fs.existsSync(existing.filePath)) {
    return {
      bundleId: existing.id,
      filePath: existing.filePath,
      fileSize: existing.fileSize,
      sha256: existing.sha256,
      signature: existing.signature,
      existing: true,
    };
  }

  const manifest: BundleManifest = {
    version: MANIFEST_VERSION,
    name: input.name,
    createdAt: new Date().toISOString(),
    applications: applications.map((app) => {
      const { file, ...rest } = app;
      return {
        ...rest,
        _bundleFileName: file ? sanitizeFileName(app.name) + path.extname(file.path) : undefined,
      };
    }),
    extensions,
    startupActions,
  };

  const signature = signManifest(manifest, SIGNING_SECRET);
  manifest.signature = signature;
  const installerPs1 = renderInstallerPs1(manifest, signature);
  const bootstrapCmd = renderBootstrapCmd();

  const bundleId = randomUUID();
  const fileName = `${sanitizeFileName(input.name)}-${bundleId}.zip`;
  const filePath = path.join(BUNDLE_DIR, fileName);

  const fileSize = await createZipBundle(filePath, manifest, signature, installerPs1, bootstrapCmd, applications);
  const fileSha256 = sha256(await fs.promises.readFile(filePath));

  const bundle = await prisma.bundle.create({
    data: {
      id: bundleId,
      name: input.name,
      selectionHash,
      manifest: manifest as unknown as Prisma.InputJsonValue,
      signature,
      filePath,
      fileSize,
      sha256: fileSha256,
      createdById,
    },
  });

  return {
    bundleId: bundle.id,
    filePath: bundle.filePath,
    fileSize: bundle.fileSize,
    sha256: bundle.sha256,
    signature: bundle.signature,
    existing: false,
  };
}

type ApplicationWithFile = Application & { file: UploadedFile | null };

async function fetchApplications(ids?: string[]): Promise<ApplicationWithFile[]> {
  if (!ids || ids.length === 0) return [];
  return prisma.application.findMany({
    where: { id: { in: ids } },
    include: { file: true },
  });
}

async function ensureApplicationFiles(applications: ApplicationWithFile[]): Promise<ApplicationWithFile[]> {
  let changed = false;

  for (const app of applications) {
    if (app.fileId || !app.downloadUrl) continue;

    try {
      const defaultExt = app.installMethod === "MSI" ? ".msi" : app.installMethod === "ZIP" ? ".zip" : ".exe";
      const downloaded = await downloadFile(app.downloadUrl, undefined, defaultExt);

      // Reuse an existing uploaded file record with the same hash if present,
      // but make sure its stored path points to the correctly-named file.
      let uploaded = await prisma.uploadedFile.findFirst({ where: { sha256: downloaded.sha256 } });
      if (!uploaded) {
        uploaded = await prisma.uploadedFile.create({
          data: {
            originalName: downloaded.originalName,
            mimeType: downloaded.mimeType,
            size: downloaded.size,
            sha256: downloaded.sha256,
            path: downloaded.path,
          },
        });
      } else if (uploaded.path !== downloaded.path) {
        if (fs.existsSync(uploaded.path)) {
          fs.unlinkSync(uploaded.path);
        }
        uploaded = await prisma.uploadedFile.update({
          where: { id: uploaded.id },
          data: {
            originalName: downloaded.originalName,
            mimeType: downloaded.mimeType,
            size: downloaded.size,
            path: downloaded.path,
          },
        });
      }

      await prisma.application.update({
        where: { id: app.id },
        data: {
          fileId: uploaded.id,
          sha256: downloaded.sha256,
        },
      });

      changed = true;
    } catch (err) {
      console.error(`Failed to download installer for ${app.name} (${app.downloadUrl}):`, err);
      throw new Error(`Could not download installer for ${app.name}. ${err instanceof Error ? err.message : ""}`);
    }
  }

  if (!changed) return applications;

  // Refetch so each app carries its newly attached file.
  return fetchApplications(applications.map((a) => a.id));
}

async function fetchExtensions(ids?: string[]): Promise<Extension[]> {
  if (!ids || ids.length === 0) return [];
  return prisma.extension.findMany({ where: { id: { in: ids } } });
}

async function fetchStartupActions(ids?: string[]): Promise<StartupAction[]> {
  if (!ids || ids.length === 0) return [];
  return prisma.startupAction.findMany({
    where: { id: { in: ids }, enabled: true },
    orderBy: { order: "asc" },
  });
}

function computeSelectionHash(
  applications: ApplicationWithFile[],
  extensions: Extension[],
  startupActions: StartupAction[]
): string {
  const timestamps = [
    ...applications.map((a) => a.updatedAt),
    ...extensions.map((e) => e.createdAt),
    ...startupActions.map((s) => s.updatedAt),
  ];
  const maxUpdatedAt = timestamps.length > 0
    ? new Date(Math.max(...timestamps.map((d) => new Date(d).getTime()))).toISOString()
    : new Date().toISOString();

  const canonical = JSON.stringify({
    v: MANIFEST_VERSION,
    applicationIds: applications.map((a) => a.id).sort(),
    extensionIds: extensions.map((e) => e.id).sort(),
    startupActionIds: startupActions.map((s) => s.id).sort(),
    maxUpdatedAt,
  });
  return sha256(canonical);
}

function renderBootstrapCmd(): string {
  return [
    `@echo off`,
    `REM Bootstrap Hub launcher - bypasses PowerShell execution policy and passes arguments through`,
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1" %*`,
    `pause`,
    ``,
  ].join("\r\n");
}

async function createZipBundle(
  filePath: string,
  manifest: BundleManifest,
  signature: string,
  installerPs1: string,
  bootstrapCmd: string,
  applications: ApplicationWithFile[]
): Promise<number> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(archive.pointer()));
    archive.on("error", (err) => reject(err));
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });

    archive.pipe(output);

    const manifestJson = Buffer.from(JSON.stringify(manifest, null, 2));
    archive.append(manifestJson, { name: "manifest.json" });
    archive.append(manifestJson, { name: "config.json" });
    archive.append(Buffer.from(signature), { name: "manifest.sig" });
    archive.append(Buffer.from(installerPs1), { name: "bootstrap.ps1" });
    archive.append(Buffer.from(bootstrapCmd), { name: "bootstrap.cmd" });

    for (const app of applications) {
      if (app.file?.path && fs.existsSync(app.file.path)) {
        archive.file(app.file.path, { name: path.join("files", sanitizeFileName(app.name) + path.extname(app.file.path)) });
      }
    }

    void archive.finalize();
  });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_|_$/g, "");
}
