import path from "path";

const base = process.cwd();

function storageRoot(): string {
  if (process.env.STORAGE_ROOT) {
    return process.env.STORAGE_ROOT;
  }
  if (process.env.NODE_ENV === "production") {
    return "/data/bootstrap-hub";
  }
  return path.join(base, "data");
}

const root = storageRoot();

export const UPLOAD_DIR = path.join(root, "uploads");
export const BUNDLE_DIR = path.join(root, "bundles");
export const CACHE_DIR = path.join(root, "cache");
