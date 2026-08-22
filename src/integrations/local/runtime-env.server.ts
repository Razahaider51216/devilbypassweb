declare global {
  var __DEVILBYPASS_RUNTIME_ENV: Record<string, string> | undefined;
}

/** Reads regular Node environment variables and Cloudflare runtime bindings. */
export function serverEnv(key: string) {
  return process.env[key]?.trim() || globalThis.__DEVILBYPASS_RUNTIME_ENV?.[key]?.trim() || "";
}
