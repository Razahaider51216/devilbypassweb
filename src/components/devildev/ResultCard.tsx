import type { BypassResult } from "@/lib/bypass.functions";
import type { Copy, Lang } from "@/lib/i18n";
import { more } from "@/lib/i18n-more";
import { Clock3, Copy as CopyIcon } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { StatusIcon } from "./StatusIcon";

export function ResultCard({
  result,
  copy,
  lang,
}: {
  result: BypassResult;
  copy: Copy;
  lang: Lang;
}) {
  const succeeded = result.status === "succeed";
  const m = more[lang];
  const message = result.errorCode ? copy.errors[result.errorCode] : result.result;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-6 w-full max-w-full overflow-hidden rounded-[1.6rem] border bg-card p-4 text-foreground sm:p-5 ${
        succeeded ? "border-emerald-500/60" : "border-red-500/60"
      }`}
      style={{
        animation: "fade-in 0.25s ease-out both",
        boxShadow: succeeded
          ? "0 18px 48px -34px rgba(16,185,129,0.8)"
          : "0 18px 48px -34px rgba(239,68,68,0.8)",
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <StatusIcon kind={succeeded ? "success" : "error"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.22em] ${succeeded ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
              >
                {succeeded ? m.successTitle : copy.failedTitle}
              </p>
              <div
                className={`mt-2 h-px w-16 ${succeeded ? "bg-emerald-400/30" : "bg-red-400/30"}`}
              />
            </div>
            {succeeded ? (
              <CopyButton
                value={result.result}
                labels={copy}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-background px-3 py-1.5 text-xs font-semibold tracking-wide text-foreground transition-colors hover:border-emerald-500 hover:bg-emerald-500/10"
              />
            ) : null}
          </div>

          {succeeded ? (
            <p className="mt-2 text-[11px] text-muted-foreground">{m.successHint}</p>
          ) : null}

          <div
            className={`mt-3 rounded-2xl border bg-background px-4 py-3 shadow-inner ${
              succeeded ? "border-emerald-500/30" : "border-red-500/30"
            }`}
          >
            <p className="break-all font-mono text-sm leading-relaxed text-foreground select-text">
              {message}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground">
            {result.time ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${succeeded ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}
              >
                <Clock3 className="h-3.5 w-3.5" />
                <span>
                  {copy.time}: {result.time} {copy.seconds}
                </span>
              </span>
            ) : null}
            {result.expiresAt ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${succeeded ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}
              >
                <CopyIcon className="h-3.5 w-3.5" />
                <span>
                  {copy.expires}: {result.expiresAt}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
