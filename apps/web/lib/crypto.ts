import { createHash, createHmac, randomBytes } from "crypto";

export function sha256(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function signManifest(manifest: unknown, secret: string): string {
  const canonical = JSON.stringify(manifest);
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function verifyManifest(manifest: unknown, signature: string, secret: string): boolean {
  const expected = signManifest(manifest, secret);
  return signature === expected;
}

export function randomSecret(): string {
  return randomBytes(32).toString("hex");
}
