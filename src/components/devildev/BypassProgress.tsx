import { more } from "@/lib/i18n-more";
import type { Lang } from "@/lib/i18n";

/**
 * Cooldown card shown ONLY after a successful bypass. It is a waiting period
 * before the next request — not the bypass process itself. Remaining seconds are
 * derived from a stored timestamp so a refresh cannot end the cooldown early.
 */
export function BypassProgress({
  lang,
  remaining,
  total = 30,
}: {
  lang: Lang;
  remaining: number;
  total?: number;
}) {
  const m = more[lang];
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="mt-4 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
            <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-foreground transition-[stroke-dashoffset] duration-500 ease-linear"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
            {remaining}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold [overflow-wrap:anywhere]">{m.cooldownTitle}</p>
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{m.waitSeconds(remaining)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {m.waitHint}
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-[width] duration-500 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
