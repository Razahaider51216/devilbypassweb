import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSqlite } from "./database.server";
import { serverEnv } from "./runtime-env.server";

export type SessionClaims = { sub: string; email: string; exp: number; iat: number; jti: string };

const developmentSessionSecret = randomBytes(32).toString("base64url");

function sessionSecret() {
  const configured = serverEnv("SESSION_SECRET");
  if (configured && configured.length >= 32) return configured;
  if (serverEnv("NODE_ENV") === "production") {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  // A process-local value prevents development sessions from being forgeable with
  // a credential published in source control. Sessions reset when dev restarts.
  return developmentSessionSecret;
}

/** Generates an unusable random credential for the legacy NOT NULL database column. */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function sessionForUser(user: { id: string; email: string }) {
  const issued = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = {
    sub: user.id,
    email: user.email,
    iat: issued,
    exp: issued + 60 * 60 * 24 * 7,
    jti: randomBytes(24).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.sub || !claims.email || !claims.jti || claims.exp <= Math.floor(Date.now() / 1000))
      return null;
    if (await isSessionRevoked(claims.jti)) return null;
    const exists = serverEnv("DATABASE_URL")
      ? await import("./postgres-database.server").then(({ postgresSessionUser }) =>
          postgresSessionUser(claims.sub, claims.email),
        )
      : Boolean(
          getSqlite()
            .prepare("SELECT 1 FROM users WHERE id=? AND email=?")
            .get(claims.sub, claims.email),
        );
    return exists ? claims : null;
  } catch {
    return null;
  }
}

async function isSessionRevoked(jti: string) {
  if (serverEnv("DATABASE_URL")) {
    const { postgresIsSessionRevoked } = await import("./postgres-database.server");
    return postgresIsSessionRevoked(jti);
  }
  return Boolean(getSqlite().prepare("SELECT 1 FROM revoked_sessions WHERE jti=?").get(jti));
}

export async function revokeSession(token: string) {
  const claims = await verifySessionToken(token);
  if (!claims) return;
  if (serverEnv("DATABASE_URL")) {
    const { postgresRevokeSession } = await import("./postgres-database.server");
    await postgresRevokeSession(claims.jti, claims.exp);
    return;
  }
  getSqlite()
    .prepare("INSERT OR IGNORE INTO revoked_sessions(jti, expires_at) VALUES (?,?)")
    .run(claims.jti, claims.exp);
}

export async function deleteUser(userId: string) {
  if (serverEnv("DATABASE_URL")) {
    const { postgresDeleteUser } = await import("./postgres-database.server");
    await postgresDeleteUser(userId);
    return;
  }
  getSqlite().prepare("DELETE FROM users WHERE id=?").run(userId);
}

const discordOnlyAuthResult = {
  ok: false,
  reason: "discord_only",
} as const;

export async function loginUser(_email: string, _password: string) {
  return discordOnlyAuthResult;
}

export async function registerUser(_email: string, _password: string, _username: string) {
  return discordOnlyAuthResult;
}

export async function createPasswordReset(_email: string) {
  return discordOnlyAuthResult;
}

export async function verifyPasswordReset(_email: string, _code: string) {
  return discordOnlyAuthResult;
}

export function changePassword(_userId: string, _password: string): never {
  throw new Error("Email and password authentication is disabled. Use Discord sign-in instead.");
}
