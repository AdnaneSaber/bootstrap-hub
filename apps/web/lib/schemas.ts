import { z } from "zod";
import {
  InstallMethod,
  DetectionMethod,
  Browser,
  ExtensionInstallMethod,
  StartupActionType,
} from "@prisma/client";

export const ApplicationCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullish(),
  category: z.string().min(1).max(255),
  version: z.string().max(100).nullish(),
  downloadUrl: z.string().url().max(2000).nullish(),
  installMethod: z.nativeEnum(InstallMethod),
  silentInstallCommand: z.string().max(2000).nullish(),
  installArgs: z.array(z.string().max(2000)).nullish().default([]),
  detectionMethod: z.nativeEnum(DetectionMethod),
  detectionRule: z.record(z.unknown()).nullish().default({}),
  launchAfterInstall: z.boolean().nullish().default(false),
  launchArguments: z.string().max(2000).nullish(),
  sha256: z.string().max(128).nullish(),
  fileId: z.string().uuid().nullish(),
  isDraft: z.boolean().nullish().default(false),
});

export const ApplicationUpdateSchema = ApplicationCreateSchema.partial().extend({
  detectionRule: z.record(z.unknown()).nullish(),
});

export const ExtensionCreateSchema = z.object({
  name: z.string().min(1).max(255),
  extensionId: z.string().min(1).max(500),
  browser: z.nativeEnum(Browser),
  chromeStoreUrl: z.string().url().max(2000).nullish(),
  installMethod: z.nativeEnum(ExtensionInstallMethod).nullish().default(ExtensionInstallMethod.POLICY),
});

export const ExtensionUpdateSchema = ExtensionCreateSchema.partial();

export const StartupActionCreateSchema = z.object({
  name: z.string().min(1).max(255),
  actionType: z.nativeEnum(StartupActionType),
  target: z.string().min(1).max(2000),
  arguments: z.string().max(2000).nullish(),
  workingDir: z.string().max(2000).nullish(),
  order: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export const StartupActionUpdateSchema = StartupActionCreateSchema.partial();
