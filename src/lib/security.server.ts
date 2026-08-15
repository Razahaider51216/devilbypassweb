/** Server-only request hardening helpers for the bypass API. */

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /\.local$/i,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
];

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

export function sanitizeTargetUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (value.length === 0 || value.length > 2048) {
    return { ok: false, reason: "URL length is out of range." };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: "Malformed URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links are allowed." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Credentials in URLs are not allowed." };
  }
  const host = parsed.hostname;
  if (!host.includes(".") && !host.startsWith("[")) {
    return { ok: false, reason: "Hostname is not routable." };
  }
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return { ok: false, reason: "Internal or private hosts are blocked." };
  }

  return { ok: true, url: parsed.toString() };
}

/** UTC date key used for the daily quota window. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
