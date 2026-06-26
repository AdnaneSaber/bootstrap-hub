import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { URL } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { sha256 } from "@/lib/crypto";
import { UPLOAD_DIR } from "@/lib/paths";
import { randomUUID } from "crypto";

export interface DownloadResult {
  path: string;
  originalName: string;
  size: number;
  sha256: string;
  mimeType: string;
}

function clientForUrl(url: string): typeof http | typeof https {
  return new URL(url).protocol === "https:" ? https : http;
}

function fetchWithRedirects(url: string, redirects = 0): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      return reject(new Error("Too many redirects"));
    }
    const client = clientForUrl(url);
    const req = client.get(url, { headers: { "User-Agent": "Bootstrap-Hub/1.0" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        fetchWithRedirects(next, redirects + 1).then(resolve).catch(reject);
      } else {
        resolve(res);
      }
    });
    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

function guessFilename(url: string, contentDisposition?: string): string {
  if (contentDisposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
    if (match && match[1]) {
      return path.basename(match[1].replace(/['"]/g, ""));
    }
  }
  const parsed = new URL(url);
  const base = path.basename(parsed.pathname) || "download";
  return decodeURIComponent(base.split("?")[0]);
}

export async function downloadFile(url: string, nameHint?: string): Promise<DownloadResult> {
  if (!url) throw new Error("Download URL is required");

  const res = await fetchWithRedirects(url);
  if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
    res.resume();
    throw new Error(`Download failed with status ${res.statusCode} for ${url}`);
  }

  const originalName = nameHint || guessFilename(url, res.headers["content-disposition"]);
  const mimeType = res.headers["content-type"] || "application/octet-stream";

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const tempPath = path.join(UPLOAD_DIR, `${randomUUID()}.tmp`);
  const writeStream = createWriteStream(tempPath);

  try {
    await pipeline(res, writeStream);
  } catch (err) {
    fs.unlinkSync(tempPath);
    throw err;
  }

  const stats = fs.statSync(tempPath);
  const fileSha256 = sha256(await fs.promises.readFile(tempPath));

  // Rename to a stable name based on hash to avoid collisions and duplicates
  const ext = path.extname(originalName) || "";
  const finalName = `${fileSha256}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);

  if (!fs.existsSync(finalPath)) {
    fs.renameSync(tempPath, finalPath);
  } else {
    fs.unlinkSync(tempPath);
  }

  return {
    path: finalPath,
    originalName,
    size: stats.size,
    sha256: fileSha256,
    mimeType,
  };
}
