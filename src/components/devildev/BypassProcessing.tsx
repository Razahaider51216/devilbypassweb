import { Loader2 } from "lucide-react";
import { more } from "@/lib/i18n-more";
import type { Lang } from "@/lib/i18n";

/** Shown only while the bypass request is actually in flight (no countdown here). */
export function BypassProcessing({ lang }: { lang: Lang }) {
  const m = more[lang];

  return (
    <div className="mt-6 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background">
          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{m.processingTitle}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {m.processingHint}
          </p>
        </div>
      </div>
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-foreground [animation:dd-indeterminate_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
