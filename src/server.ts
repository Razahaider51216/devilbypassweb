import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

declare global {
  var __DEVILBYPASS_RUNTIME_ENV: Record<string, string> | undefined;
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function applyRuntimeEnv(env: unknown) {
  if (!env || typeof env !== "object") return;

  const runtimeEnv = globalThis.__DEVILBYPASS_RUNTIME_ENV ?? {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      runtimeEnv[key] = value;
      try {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      } catch {
        // Some edge runtimes expose process.env as read-only; global runtime env is still available.
      }
    }
  }
  globalThis.__DEVILBYPASS_RUNTIME_ENV = runtimeEnv;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/** Security headers are applied here so they also cover server-function responses. */
function hardenResponse(request: Request, response: Response): Response {
  if (response.status === 101) return response;

  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("origin-agent-cluster", "?1");
  headers.set("x-permitted-cross-domain-policies", "none");
  headers.set(
    "content-security-policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self'; connect-src 'self' https://discord.com; img-src 'self' data: https://cdn.discordapp.com; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; upgrade-insecure-requests",
  );
  headers.delete("server");
  headers.delete("x-powered-by");

  const requestUrl = new URL(request.url);
  const contentType = headers.get("content-type") ?? "";
  const isSensitiveResponse =
    request.method !== "GET" ||
    headers.has("set-cookie") ||
    contentType.includes("application/json") ||
    contentType.includes("text/html") ||
    requestUrl.pathname.includes("server");
  if (isSensitiveResponse) {
    headers.set("cache-control", "no-store, max-age=0");
    headers.set("pragma", "no-cache");
  }

  if (requestUrl.protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      applyRuntimeEnv(env);

      const requestUrl = new URL(request.url);
      if (
        request.method === "GET" &&
        (requestUrl.pathname === "/login" || requestUrl.pathname === "/api/auth/discord")
      ) {
        const { beginDiscordAuth } = await import("./integrations/local/discord-auth.server");
        return hardenResponse(request, beginDiscordAuth(request));
      }
      if (
        request.method === "GET" &&
        (requestUrl.pathname === "/auth/discord/callback" ||
          requestUrl.pathname === "/api/auth/discord/callback")
      ) {
        const { finishDiscordAuth } = await import("./integrations/local/discord-auth.server");
        return hardenResponse(request, await finishDiscordAuth(request));
      }
      if (requestUrl.pathname === "/api/auth/session" && request.method === "GET") {
        const { sessionToken } = await import("./integrations/local/session-cookie.server");
        const { verifySessionToken } = await import("./integrations/local/auth.server");
        const token = sessionToken(request);
        const claims = token ? await verifySessionToken(token) : null;
        return hardenResponse(
          request,
          Response.json({
            session: claims ? { user: { id: claims.sub, email: claims.email } } : null,
          }),
        );
      }
      if (requestUrl.pathname === "/api/auth/logout" && request.method === "POST") {
        const { sessionCookie, sessionToken, validateSameOrigin } =
          await import("./integrations/local/session-cookie.server");
        if (!validateSameOrigin(request))
          return hardenResponse(request, new Response(null, { status: 403 }));
        const token = sessionToken(request);
        if (token) {
          const { revokeSession } = await import("./integrations/local/auth.server");
          await revokeSession(token);
        }
        return hardenResponse(
          request,
          new Response(null, {
            status: 204,
            headers: { "set-cookie": sessionCookie(request, "", 0) },
          }),
        );
      }
      if (request.method === "GET" && requestUrl.pathname.startsWith("/uploads/")) {
        const { serveUpload } = await import("./integrations/local/storage.server");
        const upload = serveUpload(requestUrl.pathname);
        if (upload) return hardenResponse(request, upload);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return hardenResponse(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return hardenResponse(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
