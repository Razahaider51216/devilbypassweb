import { randomBytes, randomUUID } from "node:crypto";
import { getSqlite } from "./database.server";
import { hashPassword, sessionForUser } from "./auth.server";

const STATE_COOKIE = "devildev.discord_state";
const DISCORD_API = "https://discord.com/api/v10";
const PUBLIC_ORIGIN_ENV_KEYS = [
  "DISCORD_PUBLIC_ORIGIN",
  "PUBLIC_SITE_URL",
  "APP_URL",
  "SITE_URL",
  "RENDER_EXTERNAL_URL",
] as const;

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
};

type LocalUser = { id: string; email: string };

function firstHeader(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function forwardedHeaderParam(request: Request, name: string) {
  const forwarded = firstHeader(request.headers.get("forwarded"));
  const match = forwarded?.match(new RegExp(`(?:^|;\\s*)${name}=(?:"([^"]+)"|([^;]+))`, "i"));
  return match?.[1] || match?.[2] || null;
}

function configuredPublicOrigin() {
  for (const key of PUBLIC_ORIGIN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      return url.origin;
    } catch {
      console.warn(`${key} must be an absolute URL; ignoring invalid value.`);
    }
  }
  return null;
}

function requestOrigin(request: Request) {
  const configured = configuredPublicOrigin();
  if (configured) return configured;

  const url = new URL(request.url);
  const forwardedProto =
    firstHeader(request.headers.get("x-forwarded-proto")) ||
    firstHeader(request.headers.get("x-forwarded-protocol")) ||
    forwardedHeaderParam(request, "proto") ||
    (firstHeader(request.headers.get("x-forwarded-ssl")) === "on" ? "https" : null);
  const forwardedHost =
    firstHeader(request.headers.get("x-forwarded-host")) ||
    forwardedHeaderParam(request, "host") ||
    firstHeader(request.headers.get("host"));
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : url.protocol.slice(0, -1);
  const host = forwardedHost || url.host;
  return `${protocol}://${host}`;
}

function discordConfig(request: Request) {
  const clientId = process.env["DISCORD_CLIENT_ID"]?.trim();
  const clientSecret = process.env["DISCORD_CLIENT_SECRET"]?.trim();
  const origin = requestOrigin(request);
  const callback = new URL("/api/auth/discord/callback", origin).toString();
  const configuredRedirect = process.env["DISCORD_REDIRECT_URI"]?.trim();
  // Render may be configured with either the complete callback URL or only
  // /api/auth/discord/callback. Discord always requires an absolute URL.
  const redirectUri = configuredRedirect
    ? new URL(configuredRedirect, origin).toString()
    : callback;
  if (!clientId || !clientSecret) {
    throw new Error("Discord login is not configured");
  }
  return { clientId, clientSecret, redirectUri };
}

function cookieValue(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function stateCookie(request: Request, state: string, maxAge = 600) {
  const secure = new URL(requestOrigin(request)).protocol === "https:" ? "; Secure" : "";
  return `${STATE_COOKIE}=${encodeURIComponent(state)}; Path=/api/auth/discord; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function authRedirect(request: Request, key: "discord_session" | "discord_error", value: string) {
  const destination = new URL("/auth", requestOrigin(request));
  destination.hash = `${key}=${encodeURIComponent(value)}`;
  return new Response(null, {
    status: 302,
    headers: {
      location: destination.toString(),
      "set-cookie": stateCookie(request, "", 0),
      "cache-control": "no-store",
    },
  });
}

async function discordErrorMessage(response: Response) {
  let body = "";
  try {
    body = await response.text();
  } catch {
    // The status is still enough to guide the operator when the body is unreadable.
  }
  console.error(
    `Discord token exchange failed with ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`,
  );
  return "Discord rejected the login request. Please verify the Discord Redirect URI and client secret.";
}

function avatarUrl(user: DiscordUser) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=256`;
  }
  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function internalUsername(discordUsername: string, discordId: string) {
  const db = getSqlite();
  const normalized = discordUsername.toLowerCase().replace(/[^a-z0-9_]/g, "") || "discord";
  const base = normalized.slice(0, 24);
  let candidate = base;
  let suffix = 0;
  while (db.prepare("SELECT 1 FROM profiles WHERE username=? COLLATE NOCASE").get(candidate)) {
    suffix += 1;
    candidate = `${base.slice(0, 27 - String(suffix).length)}_${suffix}`;
  }
  return candidate || `discord_${discordId.slice(-8)}`;
}

function signInDiscordUserSqlite(discord: DiscordUser) {
  const db = getSqlite();
  const discordEmail = discord.email?.trim().toLowerCase() || null;
  const ownerDiscordId = (
    process.env["OWNER_DISCORD_ID"] ||
    process.env["ADMIN_DISCORD_ID"] ||
    ""
  ).trim();
  const isOwner = ownerDiscordId.length > 0 && discord.id === ownerDiscordId;
  let user = db.prepare("SELECT id,email FROM users WHERE discord_id=?").get(discord.id) as
    LocalUser | undefined;

  // A verified Discord email links a legacy local account to Discord.
  if (!user && discordEmail && discord.verified) {
    user = db
      .prepare("SELECT id,email FROM users WHERE email=? COLLATE NOCASE")
      .get(discordEmail) as LocalUser | undefined;
    if (user) db.prepare("UPDATE users SET discord_id=? WHERE id=?").run(discord.id, user.id);
  }

  const stamp = new Date().toISOString();
  if (!user) {
    const id = randomUUID();
    const email = discordEmail || `discord-${discord.id}@users.invalid`;
    const username = internalUsername(discord.username, discord.id);
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,discord_id,created_at) VALUES (?,?,?,?,?)",
      ).run(id, email, hashPassword(randomBytes(48).toString("base64url")), discord.id, stamp);
      db.prepare(
        `INSERT INTO profiles
        (id,username,email,display_name,avatar_url,discord_username,plan_code,usage_date,created_at,updated_at)
        VALUES (?,?,?,?,?,?,'free',?,?,?)`,
      ).run(
        id,
        username,
        discordEmail,
        discord.global_name || discord.username,
        avatarUrl(discord),
        discord.username,
        stamp.slice(0, 10),
        stamp,
        stamp,
      );
      db.prepare("INSERT INTO user_roles(id,user_id,role,created_at) VALUES (?,?,?,?)").run(
        randomUUID(),
        id,
        isOwner ? "admin" : "user",
        stamp,
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    user = { id, email };
  } else {
    db.prepare(
      `UPDATE profiles
       SET display_name=?, avatar_url=?, discord_username=?, updated_at=?
       WHERE id=?`,
    ).run(
      discord.global_name || discord.username,
      avatarUrl(discord),
      discord.username,
      stamp,
      user.id,
    );
  }

  // The configured Discord owner always regains back-office access on sign-in,
  // including when their account was created before OWNER_DISCORD_ID was set.
  if (isOwner) {
    db.prepare(
      "INSERT OR IGNORE INTO user_roles(id,user_id,role,created_at) VALUES (?,?,'admin',?)",
    ).run(randomUUID(), user.id, stamp);
  }

  return { token: sessionForUser(user), user };
}

async function signInDiscordUser(discord: DiscordUser) {
  if (!process.env["DATABASE_URL"]?.trim()) return signInDiscordUserSqlite(discord);

  const discordEmail = discord.email?.trim().toLowerCase() || null;
  const ownerDiscordId = (
    process.env["OWNER_DISCORD_ID"] ||
    process.env["ADMIN_DISCORD_ID"] ||
    ""
  ).trim();
  const { postgresSignInDiscordUser } = await import("./postgres-database.server");
  const user = await postgresSignInDiscordUser({
    discordId: discord.id,
    email: discordEmail,
    verified: Boolean(discord.verified),
    discordUsername: discord.username,
    displayName: discord.global_name || discord.username,
    avatarUrl: avatarUrl(discord),
    passwordHash: hashPassword(randomBytes(48).toString("base64url")),
    isOwner: ownerDiscordId.length > 0 && discord.id === ownerDiscordId,
  });
  return { token: sessionForUser(user), user };
}

export function beginDiscordAuth(request: Request) {
  try {
    const { clientId, redirectUri } = discordConfig(request);
    const state = randomBytes(32).toString("base64url");
    const authorize = new URL("https://discord.com/oauth2/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("scope", "identify email");
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("redirect_uri", redirectUri);
    return new Response(null, {
      status: 302,
      headers: {
        location: authorize.toString(),
        "set-cookie": stateCookie(request, state),
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return authRedirect(
      request,
      "discord_error",
      error instanceof Error ? error.message : "Unable to start Discord login",
    );
  }
}

export async function finishDiscordAuth(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = cookieValue(request, STATE_COOKIE);
    if (!code || !state || !expectedState || state !== expectedState) {
      throw new Error("Discord login request expired or is invalid");
    }

    const { clientId, clientSecret, redirectUri } = discordConfig(request);
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new Error(await discordErrorMessage(tokenResponse));
    const token = (await tokenResponse.json()) as { access_token?: string; token_type?: string };
    if (!token.access_token) throw new Error("Discord did not return an access token");

    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { authorization: `${token.token_type || "Bearer"} ${token.access_token}` },
    });
    if (!userResponse.ok) throw new Error("Unable to load the Discord profile");
    const discord = (await userResponse.json()) as DiscordUser;
    if (!discord.id || !discord.username) throw new Error("Discord returned an invalid profile");

    const session = await signInDiscordUser(discord);
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    return authRedirect(request, "discord_session", payload);
  } catch (error) {
    return authRedirect(
      request,
      "discord_error",
      error instanceof Error ? error.message : "Discord login failed",
    );
  }
}
