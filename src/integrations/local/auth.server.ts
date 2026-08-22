import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSqlite } from "./database.server";

export type SessionClaims = { sub: string; email: string; exp: number; iat: number };

function sessionSecret() {
  const configured = process.env["SESSION_SECRET"];
  if (configured && configured.length >= 32) return configured;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return "devildev-local-development-secret-change-me";
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
    if (!claims.sub || !claims.email || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    const exists = process.env["DATABASE_URL"]?.trim()
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

export async function deleteUser(userId: string) {
  if (process.env["DATABASE_URL"]?.trim()) {
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
