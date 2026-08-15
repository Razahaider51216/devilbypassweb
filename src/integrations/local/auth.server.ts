import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { getSqlite } from "./database.server";

export type SessionClaims = { sub: string; email: string; exp: number; iat: number };

function sessionSecret() {
  const configured = process.env["SESSION_SECRET"];
  if (configured && configured.length >= 32) return configured;
  if (process.env["NODE_ENV"] === "production")
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  return "devildev-local-development-secret-change-me";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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

export function verifySessionToken(token: string): SessionClaims | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.sub || !claims.email || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    const exists = getSqlite()
      .prepare("SELECT 1 FROM users WHERE id=? AND email=?")
      .get(claims.sub, claims.email);
    return exists ? claims : null;
  } catch {
    return null;
  }
}

function uniqueUsername(value: string, email: string) {
  const db = getSqlite();
  const raw =
    (value || email.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";
  let candidate = raw.slice(0, 28);
  while (db.prepare("SELECT 1 FROM profiles WHERE username=? COLLATE NOCASE").get(candidate)) {
    candidate = `${raw.slice(0, 24)}${randomInt(1000, 9999)}`;
  }
  return candidate;
}

export function registerUser(emailInput: string, password: string, usernameInput = "") {
  const db = getSqlite();
  const email = emailInput.trim().toLowerCase();
  if (db.prepare("SELECT 1 FROM users WHERE email=? COLLATE NOCASE").get(email))
    throw new Error("This email is already registered");
  const id = randomUUID();
  const stamp = new Date().toISOString();
  const username = uniqueUsername(usernameInput, email);
  const isAdmin = Boolean(
    process.env["ADMIN_EMAIL"] && process.env["ADMIN_EMAIL"]!.trim().toLowerCase() === email,
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,created_at) VALUES (?,?,?,?)").run(
      id,
      email,
      hashPassword(password),
      stamp,
    );
    db.prepare(
      `INSERT INTO profiles
      (id,username,email,plan_code,usage_date,created_at,updated_at)
      VALUES (?,?,?,'free',?,?,?)`,
    ).run(id, username, email, stamp.slice(0, 10), stamp, stamp);
    db.prepare("INSERT INTO user_roles(id,user_id,role,created_at) VALUES (?,?,?,?)").run(
      randomUUID(),
      id,
      isAdmin ? "admin" : "user",
      stamp,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { token: sessionForUser({ id, email }), user: { id, email } };
}

export function loginUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  let row = getSqlite()
    .prepare("SELECT id,email,password_hash FROM users WHERE email=? COLLATE NOCASE")
    .get(email) as { id: string; email: string; password_hash: string } | undefined;
  const configuredAdmin = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  if (!row && configuredAdmin === email && process.env["ADMIN_PASSWORD"] === password) {
    registerUser(email, password, process.env["ADMIN_USERNAME"] || "admin");
    row = getSqlite()
      .prepare("SELECT id,email,password_hash FROM users WHERE email=? COLLATE NOCASE")
      .get(email) as typeof row;
  }
  if (!row || !passwordMatches(password, row.password_hash))
    throw new Error("Invalid email or password");
  if (configuredAdmin === email) {
    getSqlite()
      .prepare(
        "INSERT OR IGNORE INTO user_roles(id,user_id,role,created_at) VALUES (?,?,'admin',?)",
      )
      .run(randomUUID(), row.id, new Date().toISOString());
  }
  return { token: sessionForUser(row), user: { id: row.id, email: row.email } };
}

function codeHash(email: string, code: string) {
  return createHash("sha256").update(`${email}:${code}:${sessionSecret()}`).digest("hex");
}

export async function createPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = getSqlite().prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE").get(email);
  if (!user) return { sent: true };
  const code = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 10 * 60_000).toISOString();
  getSqlite()
    .prepare("UPDATE users SET reset_code_hash=?, reset_expires_at=? WHERE email=? COLLATE NOCASE")
    .run(codeHash(email, code), expires, email);

  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESET_FROM_EMAIL"];
  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "DevilDev password reset code",
        text: `Your DevilDev password reset code is ${code}. It expires in 10 minutes.`,
      }),
    });
    if (!response.ok) throw new Error("Unable to send password reset email");
    return { sent: true };
  }

  if (process.env["NODE_ENV"] === "production")
    throw new Error("Password reset email is not configured");
  console.info(`[auth] Password reset code for ${email}: ${code}`);
  return { sent: true, devCode: code };
}

export function verifyPasswordReset(emailInput: string, code: string) {
  const email = emailInput.trim().toLowerCase();
  const row = getSqlite()
    .prepare(
      "SELECT id,email,reset_code_hash,reset_expires_at FROM users WHERE email=? COLLATE NOCASE",
    )
    .get(email) as Record<string, string> | undefined;
  if (
    !row ||
    !row["reset_code_hash"] ||
    !row["reset_expires_at"] ||
    row["reset_expires_at"] < new Date().toISOString()
  )
    throw new Error("Invalid or expired reset code");
  const expected = Buffer.from(row["reset_code_hash"], "hex");
  const received = Buffer.from(codeHash(email, code), "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received))
    throw new Error("Invalid or expired reset code");
  return {
    token: sessionForUser({ id: row["id"]!, email: row["email"]! }),
    user: { id: row["id"]!, email: row["email"]! },
  };
}

export function changePassword(userId: string, password: string) {
  getSqlite()
    .prepare(
      "UPDATE users SET password_hash=?, reset_code_hash=NULL, reset_expires_at=NULL WHERE id=?",
    )
    .run(hashPassword(password), userId);
}

export function deleteUser(userId: string) {
  getSqlite().prepare("DELETE FROM users WHERE id=?").run(userId);
}
