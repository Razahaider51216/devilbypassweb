import { serverEnv } from "./runtime-env.server";

export const SESSION_COOKIE = "__Host-devildev_session";
const DEVELOPMENT_SESSION_COOKIE = "devildev_session";

export function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function firstHeader(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() || null;
}

function usesSecureCookie(request: Request) {
  const forwarded = firstHeader(request.headers.get("forwarded"));
  const forwardedProto = forwarded?.match(/(?:^|;\s*)proto=(?:"([^"]+)"|([^;]+))/i);
  const protocol =
    firstHeader(request.headers.get("x-forwarded-proto")) ||
    firstHeader(request.headers.get("x-forwarded-protocol")) ||
    forwardedProto?.[1]?.toLowerCase() ||
    forwardedProto?.[2]?.trim().toLowerCase();
  return (
    new URL(request.url).protocol === "https:" ||
    protocol === "https" ||
    firstHeader(request.headers.get("x-forwarded-ssl")) === "on" ||
    serverEnv("NODE_ENV") === "production"
  );
}

function cookieName(request: Request) {
  return usesSecureCookie(request) ? SESSION_COOKIE : DEVELOPMENT_SESSION_COOKIE;
}

export function sessionToken(request: Request) {
  const expectedName = cookieName(request);
  return (
    readCookie(request, expectedName) ||
    readCookie(
      request,
      expectedName === SESSION_COOKIE ? DEVELOPMENT_SESSION_COOKIE : SESSION_COOKIE,
    )
  );
}

export function sessionCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 7) {
  const secure = usesSecureCookie(request);
  const name = cookieName(request);
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}
