import path from "path";

const base = process.cwd();

export const UPLOAD_DIR =
  process.env.NODE_ENV === "production" ? "/app/uploads" : path.join(base, "uploads");

export const BUNDLE_DIR =
  process.env.NODE_ENV === "production" ? "/app/bundles" : path.join(base, "bundles");
