import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getDataDirectory } from "./database.server";

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function saveUpload(folder: "banners" | "slips", bytes: Uint8Array, extension: string) {
  const ext = extension.toLowerCase().startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  if (!allowedExtensions.has(ext)) throw new Error("Unsupported image type");
  const directory = resolve(getDataDirectory(), "uploads", folder);
  mkdirSync(directory, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  writeFileSync(resolve(directory, name), bytes, { flag: "wx" });
  return `/uploads/${folder}/${name}`;
}

export function serveUpload(pathname: string): Response | null {
  const match = pathname.match(/^\/uploads\/(banners|slips)\/([a-f0-9-]+\.(?:jpe?g|png|webp))$/i);
  if (!match) return null;
  const file = resolve(getDataDirectory(), "uploads", match[1]!, match[2]!);
  try {
    const bytes = readFileSync(file);
    const types: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    return new Response(bytes, {
      headers: {
        "content-type": types[extname(file).toLowerCase()] ?? "application/octet-stream",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
