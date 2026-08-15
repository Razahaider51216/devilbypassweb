import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, AlertTriangle } from "lucide-react";
import { getChangelog } from "@/lib/content.functions";
import { more } from "@/lib/i18n-more";
import { extra } from "@/lib/i18n-extra";
import type { Lang } from "@/lib/i18n";

const READ_KEY = "devildev.updates.read";

function loadRead(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Header bell that surfaces the newest published changelog entries as notifications. */
export function UpdatesBell({ lang }: { lang: Lang }) {
  const m = more[lang];
  const x = extra[lang];
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({ top: 64, right: 12 });

  /** Anchor the fixed panel to the bell while clamping it inside the viewport. */
  const measure = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: Math.round(rect.bottom + 8),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
    });
  };

  useEffect(() => {
    setRead(loadRead());
    setHydrated(true);
  }, []);

  const load = useServerFn(getChangelog);
  const q = useQuery({ queryKey: ["changelog"], queryFn: () => load({}) });

  const rows = useMemo(() => {
    const list = [...(q.data ?? [])];
    list.sort((a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime());
    return list.slice(0, 8);
  }, [q.data]);

  const unread = hydrated ? rows.filter((r) => !read.includes(r.id)) : [];

  const persist = (ids: string[]) => {
    setRead(ids);
    localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(0, 200)));
  };

  const markAll = () => persist([...new Set([...read, ...rows.map((r) => r.id)])]);
  const markOne = (id: string) => {
    if (!read.includes(id)) persist([...read, id]);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label={`${m.notifTitle}${unread.length ? ` — ${unread.length} ${m.notifNew}` : ""}`}
        aria-expanded={open}
        ref={btnRef}
        onClick={() => {
          measure();
          setOpen((v) => !v);
        }}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={m.notifTitle}
          style={
            {
              top: anchor.top,
              "--dd-bell-right": `max(${anchor.right}px, env(safe-area-inset-right, 0px) + 12px)`,
            } as CSSProperties
          }
          className="fixed left-3 right-3 z-50 sm:right-[var(--dd-bell-right)] flex max-h-[75vh] w-auto flex-col overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-2xl animate-fade-in sm:left-auto sm:max-h-[min(70vh,680px)] sm:w-[min(420px,calc(100vw-24px))] sm:rounded-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3.5 sm:px-5">
            <p className="min-w-0 text-xs font-bold uppercase tracking-[0.15em] [overflow-wrap:anywhere]">
              {m.notifTitle}
            </p>
            {unread.length > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold transition-colors hover:bg-accent"
              >
                {m.notifReadAll}
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {rows.length === 0 || (hydrated && unread.length === 0 && rows.length === 0) ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">{m.notifEmpty}</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((row) => {
                  const isUnread = hydrated && !read.includes(row.id);
                  const title = lang === "th" ? row.title_th || row.title_en : row.title_en || row.title_th;
                  const body = lang === "th" ? row.body_th || row.body_en : row.body_en || row.body_th;
                  return (
                    <li
                      key={row.id}
                      className={`min-w-0 px-4 py-3.5 sm:px-5 ${isUnread ? "bg-accent/40" : ""}`}
                      onMouseEnter={() => markOne(row.id)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isUnread ? (
                          <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                            {m.notifUnread}
                          </span>
                        ) : null}
                        {row.is_important ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                            <AlertTriangle className="h-2.5 w-2.5" /> {m.notifImportant}
                          </span>
                        ) : null}
                        {row.version ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold">
                            {row.version}
                          </span>
                        ) : null}
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(row.released_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold [overflow-wrap:anywhere]">
                        {title || x.changelog}
                      </p>
                      {body ? (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                          {body}
                        </p>
                      ) : null}
                      <Link
                        to="/changelog"
                        onClick={() => {
                          markOne(row.id);
                          setOpen(false);
                        }}
                        className="mt-2 inline-flex items-center rounded-lg border border-border px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-accent"
                      >
                        {m.notifDetails}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {rows.length > 0 && hydrated && unread.length === 0 ? (
              <p className="border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
                {m.notifEmpty}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
