const DISCORD_URL_PREFIXES = ["https://discord.gg/", "https://discord.com/"] as const;

/** Returns true for empty strings or valid Discord invite/profile URLs. */
export function isValidDiscordUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    return DISCORD_URL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  } catch {
    return false;
  }
}

export const DISCORD_URL_ERROR =
  "URL must start with https://discord.gg/ or https://discord.com/";
