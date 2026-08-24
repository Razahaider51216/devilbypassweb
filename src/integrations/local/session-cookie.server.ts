import { serverEnv } from "./runtime-env.server";

export const SESSION_COOKIE = "__Host-devildev_session";

export function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function cookieName(request: Request) {
  return new URL(request.url).protocol === "https:" ? SESSION_COOKIE : "devildev_session";
}

export function sessionToken(request: Request) {
  return readCookie(request, cookieName(request));
}

export function sessionCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 7) {
  const secure =
    new URL(request.url).protocol === "https:" || serverEnv("NODE_ENV") === "production";
  const name = secure ? SESSION_COOKIE : "devildev_session";
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}
