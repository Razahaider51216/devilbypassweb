import type { BypassResult } from "@/lib/bypass.functions";
import type { Copy, Lang } from "@/lib/i18n";
import { more } from "@/lib/i18n-more";
import { Clock3, Copy as CopyIcon } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { StatusIcon } from "./StatusIcon";

export function ResultCard({ result, copy, lang }: { result: BypassResult; copy: Copy; lang: Lang }) {
  const succeeded = result.status === "succeed";
  const m = more[lang];
  const message = result.errorCode ? copy.errors[result.errorCode] : result.result;

  return (
    <div
      className={`mt-6 w-full max-w-full overflow-hidden rounded-[1.6rem] border p-4 sm:p-5 ${
        succeeded
          ? "border-emerald-400/35 bg-[linear-gradient(180deg,rgba(16,185,129,0.14)_0%,rgba(10,10,12,0.96)_100%)]"
          : "border-red-400/35 bg-[linear-gradient(180deg,rgba(239,68,68,0.14)_0%,rgba(10,10,12,0.96)_100%)]"
      }`}
      style={{
        animation: succeeded
          ? "fade-in 0.35s ease-out both, dd-success-pulse 2.2s ease-in-out 350ms infinite"
          : "fade-in 0.35s ease-out both, dd-error-pulse 1.8s ease-in-out 350ms infinite",
        boxShadow: succeeded
          ? "0 0 0 1px rgba(34,197,94,0.24), 0 0 28px rgba(34,197,94,0.14)"
          : "0 0 0 1px rgba(239,68,68,0.24), 0 0 28px rgba(239,68,68,0.14)",
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <StatusIcon kind={succeeded ? "success" : "error"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${succeeded ? "text-emerald-200/90" : "text-red-200/90"}`}>
                {succeeded ? m.successTitle : copy.failedTitle}
              </p>
              <div className={`mt-2 h-px w-16 ${succeeded ? "bg-emerald-400/30" : "bg-red-400/30"}`} />
            </div>
            {succeeded ? <CopyButton value={result.result} labels={copy} /> : null}
          </div>

          {succeeded ? (
            <p className="mt-1 text-[11px] text-emerald-100/70">{m.successHint}</p>
          ) : null}

          <div
            className={`mt-3 rounded-2xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
              succeeded
                ? "border-emerald-400/20 bg-zinc-950/80"
                : "border-red-400/20 bg-zinc-950/85"
            }`}
          >
            <p
              className={`break-all font-mono text-sm leading-relaxed select-text ${
                succeeded ? "text-emerald-50" : "text-red-100"
              }`}
            >
              {message}
            </p>
          </div>

          <div className={`mt-4 flex flex-wrap gap-2 text-xs ${succeeded ? "text-emerald-100/75" : "text-red-100/75"}`}>
            {result.time ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur ${succeeded ? "border-emerald-400/20 bg-emerald-500/10" : "border-red-400/20 bg-red-500/10"}`}>
                <Clock3 className="h-3.5 w-3.5" />
                <span>
                  {copy.time}: {result.time} {copy.seconds}
                </span>
              </span>
            ) : null}
            {result.expiresAt ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur ${succeeded ? "border-emerald-400/20 bg-emerald-500/10" : "border-red-400/20 bg-red-500/10"}`}>
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
