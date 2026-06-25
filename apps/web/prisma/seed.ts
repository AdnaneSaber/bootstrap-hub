import { PrismaClient, InstallMethod, DetectionMethod, Browser, ExtensionInstallMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: "admin@bootstrap.hub" },
    update: {},
    create: {
      email: "admin@bootstrap.hub",
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.application.upsert({
    where: { name: "TFTAcademy Overlay" },
    update: {},
    create: {
      name: "TFTAcademy Overlay",
      description: "Teamfight Tactics overlay helper from TFTAcademy.",
      category: "Gaming",
      version: "latest",
      downloadUrl: "https://example.com/tft-academy-overlay-setup.exe",
      installMethod: InstallMethod.EXE,
      silentInstallCommand: "/S",
      detectionMethod: DetectionMethod.PROGRAM,
      detectionRule: { displayNameContains: "TFTAcademy" },
      launchAfterInstall: false,
    },
  });

  await prisma.application.upsert({
    where: { name: "Blitz.gg" },
    update: {},
    create: {
      name: "Blitz.gg",
      description: "Companion app for League of Legends and other games.",
      category: "Gaming",
      version: "latest",
      downloadUrl: "https://example.com/blitz-setup.exe",
      installMethod: InstallMethod.EXE,
      silentInstallCommand: "/S",
      detectionMethod: DetectionMethod.PROGRAM,
      detectionRule: { displayNameContains: "Blitz" },
      launchAfterInstall: false,
    },
  });

  await prisma.application.upsert({
    where: { name: "Brave Browser" },
    update: {},
    create: {
      name: "Brave Browser",
      description: "Privacy-focused Chromium browser.",
      category: "Browser",
      version: "latest",
      installMethod: InstallMethod.WINGET,
      silentInstallCommand: "Brave.Brave",
      detectionMethod: DetectionMethod.FILE,
      detectionRule: { path: "${env:ProgramFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" },
      launchAfterInstall: false,
    },
  });

  await prisma.extension.upsert({
    where: { id: "bitwarden-chrome" },
    update: {},
    create: {
      id: "bitwarden-chrome",
      name: "Bitwarden Password Manager",
      extensionId: "nngceckbapebfimnlniiiahkandclblb",
      browser: Browser.CHROME,
      chromeStoreUrl:
        "https://chromewebstore.google.com/detail/bitwarden-password-manager/nngceckbapebfimnlniiiahkandclblb",
      installMethod: ExtensionInstallMethod.POLICY,
    },
  });

  await prisma.extension.upsert({
    where: { id: "bitwarden-brave" },
    update: {},
    create: {
      id: "bitwarden-brave",
      name: "Bitwarden Password Manager",
      extensionId: "nngceckbapebfimnlniiiahkandclblb",
      browser: Browser.BRAVE,
      chromeStoreUrl:
        "https://chromewebstore.google.com/detail/bitwarden-password-manager/nngceckbapebfimnlniiiahkandclblb",
      installMethod: ExtensionInstallMethod.POLICY,
    },
  });

  await prisma.extension.upsert({
    where: { id: "bitwarden-edge" },
    update: {},
    create: {
      id: "bitwarden-edge",
      name: "Bitwarden Password Manager",
      extensionId: "nngceckbapebfimnlniiiahkandclblb",
      browser: Browser.EDGE,
      chromeStoreUrl:
        "https://chromewebstore.google.com/detail/bitwarden-password-manager/nngceckbapebfimnlniiiahkandclblb",
      installMethod: ExtensionInstallMethod.POLICY,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
