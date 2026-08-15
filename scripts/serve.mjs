import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

function loadEnv() {
  const file = resolve(".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnv();
process.env.NODE_ENV = "production";
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET must contain at least 32 characters. Copy .env.example to .env first.",
  );
}

const clientDirectory = resolve("dist", "client");
const entry = await import(pathToFileURL(resolve("dist", "server", "server.js")));
const app = entry.default ?? entry;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function staticResponse(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const path = resolve(clientDirectory, `.${decoded}`);
  if (path !== clientDirectory && !path.startsWith(`${clientDirectory}${sep}`)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!existsSync(path) || !statSync(path).isFile()) return null;
  return new Response(readFileSync(path), {
    headers: {
      "content-type": mimeTypes[extname(path).toLowerCase()] ?? "application/octet-stream",
      "cache-control": decoded.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    },
  });
}

function toRequest(request) {
  const host = request.headers.host || "localhost";
  const protocol = request.headers["x-forwarded-proto"] || "http";
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, value);
  }
  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Readable.toWeb(request);
    init.duplex = "half";
  }
  return new Request(`${protocol}://${host}${request.url || "/"}`, init);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");
    const result =
      (request.method === "GET" || request.method === "HEAD"
        ? staticResponse(url.pathname)
        : null) ?? (await app.fetch(toRequest(request), {}, {}));

    response.statusCode = result.status;
    response.statusMessage = result.statusText;
    result.headers.forEach((value, key) => response.setHeader(key, value));
    const cookies = result.headers.getSetCookie?.() ?? [];
    if (cookies.length) response.setHeader("set-cookie", cookies);
    if (!result.body || request.method === "HEAD") return response.end();
    Readable.fromWeb(result.body).pipe(response);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () => {
  const browserHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
  console.info(`DevilDev listening on http://${browserHost}:${port}`);
});
