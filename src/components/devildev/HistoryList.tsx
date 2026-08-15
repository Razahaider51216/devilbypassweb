import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import type { Copy, Lang } from "@/lib/i18n";
import { extra } from "@/lib/i18n-extra";
import { CopyButton } from "./CopyButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PREVIEW_COUNT = 3;

export type HistoryEntry = {
  id: string;
  url: string;
  result: string;
  status: "succeed" | "failed";
  time: string | null;
};

/** Shorten a URL to "host/first-segment…" so cards stay readable on mobile. */
function shortUrl(raw: string) {
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/$/, "");
    const short = path.length > 18 ? `${path.slice(0, 18)}…` : path;
    return `${u.hostname.replace(/^www\./, "")}${short}`;
  } catch {
    return raw.length > 42 ? `${raw.slice(0, 42)}…` : raw;
  }
}

/** Only allow opening safe schemes from history. */
function safeHref(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const actionBtn =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground";

function EntryCard({ entry, copy, lang }: { entry: HistoryEntry; copy: Copy; lang: Lang }) {
  const x = extra[lang];
  const [open, setOpen] = useState(false);
  const ok = entry.status === "succeed";
  const href = safeHref(entry.url);

  return (
    <li className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur transition-colors hover:border-foreground/30">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{shortUrl(entry.url)}</p>
          <p
            className={`mt-1 break-all font-mono text-sm ${ok ? "text-foreground" : "text-destructive"}`}
          >
            {entry.result}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
            ok
              ? "border-foreground/30 bg-foreground/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {ok ? x.statusSuccess : x.statusFailed}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className={actionBtn}>
          {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {open ? x.hideDetails : x.viewDetails}
        </button>
        {ok ? <CopyButton value={entry.result} labels={copy} className={actionBtn} /> : null}
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={actionBtn}>
            <ExternalLink className="h-3.5 w-3.5" />
            {x.openLink}
          </a>
        ) : null}
      </div>

      {open ? (
        <dl className="mt-3 space-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <div className="min-w-0">
            <dt className="uppercase tracking-widest">{copy.inputLabel}</dt>
            <dd className="mt-0.5 break-all text-foreground/80">{entry.url}</dd>
          </div>
          <div className="min-w-0">
            <dt className="uppercase tracking-widest">{copy.resultTitle}</dt>
            <dd className="mt-0.5 break-all font-mono text-foreground/80">{entry.result}</dd>
          </div>
          {entry.time ? (
            <div>
              <dt className="uppercase tracking-widest">{copy.time}</dt>
              <dd className="mt-0.5 text-foreground/80">
                {entry.time} {copy.seconds}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}

export function HistoryList({
  entries,
  copy,
  lang,
  onClear,
}: {
  entries: HistoryEntry[];
  copy: Copy;
  lang: Lang;
  onClear: () => void;
}) {
  const x = extra[lang];
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entries : entries.slice(0, PREVIEW_COUNT);
  const hasMore = entries.length > PREVIEW_COUNT;

  return (
    <section className="mt-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {copy.historyTitle}
        </h2>
        {entries.length > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-destructive/50 bg-destructive/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/20">
              <Trash2 className="h-3.5 w-3.5" />
              {copy.clear}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{x.clearAllTitle}</AlertDialogTitle>
                <AlertDialogDescription>{x.clearAllBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{x.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {x.clearAllConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.historyEmpty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((entry) => (
            <EntryCard key={entry.id} entry={entry} copy={copy} lang={lang} />
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-colors hover:bg-accent"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {x.recentShowLess}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {x.recentViewAll} ({entries.length})
            </>
          )}
        </button>
      ) : null}
    </section>
  );
}
