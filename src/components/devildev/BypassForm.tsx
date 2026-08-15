import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Link2 } from "lucide-react";
import type { Copy, Lang } from "@/lib/i18n";
import { more } from "@/lib/i18n-more";

const BLOCKED_HOSTS = [
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

/** Client-side mirror of the server URL guard (server remains authoritative). */
function isAllowed(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname;
  if (!host.includes(".") && !host.startsWith("[")) return false;
  if (BLOCKED_HOSTS.some((pattern) => pattern.test(host))) return false;
  return true;
}

export function BypassForm({
  copy,
  lang,
  pending,
  remaining,
  onSubmit,
}: {
  copy: Copy;
  lang: Lang;
  pending: boolean;
  remaining: number;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = more[lang];
  const cooldownActive = remaining > 0;
  const buttonText = pending
    ? copy.submitting
    : cooldownActive
      ? lang === "th"
        ? `กำลังบายพาส (${m.waitSeconds(remaining)})`
        : `Bypassing (${m.waitSeconds(remaining)})`
      : copy.submit;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = url.trim();
    if (pending || cooldownActive) return;
    if (value.length > 2048 || !isAllowed(value)) {
      setError(copy.invalidUrl);
      return;
    }
    setError(null);
    onSubmit(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94)_0%,rgba(10,10,12,0.96)_100%)] p-5 shadow-[0_0_60px_-30px_rgba(255,255,255,0.28)] backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_rgba(34,197,94,0.14)]">
          <Link2 className="h-3.5 w-3.5" />
        </span>
        <label
          htmlFor="target-url"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/80"
        >
          {copy.inputLabel}
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          id="target-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3.5 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
        />
        <button
          type="submit"
          disabled={pending || cooldownActive}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(215,215,215,0.84)_100%)] px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-10px_rgba(255,255,255,0.35)] transition-all hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          <span className="tabular-nums">{buttonText}</span>
        </button>
      </div>
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
