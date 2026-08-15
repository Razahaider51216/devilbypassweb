import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Megaphone, ExternalLink } from "lucide-react";
import { getAnnouncements } from "@/lib/content.functions";
import { extra } from "@/lib/i18n-extra";
import type { Lang } from "@/lib/i18n";

const DISMISS_KEY = "devildev.announcement.dismissed";

export function AnnouncementModal({ lang }: { lang: Lang }) {
  const x = extra[lang];
  const fetchAnnouncements = useServerFn(getAnnouncements);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchAnnouncements({}),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
    setHydrated(true);
  }, []);

  const list = announcements.data ?? [];
  const current = hydrated
    ? list.find((item) => !dismissed.includes(`${item.id}:${item.updated_at}`))
    : undefined;

  if (!current) return null;

  const close = () => {
    const next = [...dismissed, `${current.id}:${current.updated_at}`].slice(-20);
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const title = lang === "th" ? current.title_th || current.title_en : current.title_en || current.title_th;
  const body = lang === "th" ? current.body_th || current.body_en : current.body_en || current.body_th;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <button
        aria-label={x.close}
        onClick={close}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-border bg-card shadow-[0_0_80px_-20px_rgba(255,255,255,0.25)]">
        <button
          aria-label={x.close}
          onClick={close}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>

        {current.image_url ? (
          <img
            src={current.image_url}
            alt={title || "Announcement"}
            loading="lazy"
            className="max-h-[52vh] w-full object-cover"
          />
        ) : null}

        <div className="p-5">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Megaphone className="h-3 w-3" /> {x.announcement}
          </p>
          {title ? <h2 className="mt-3 text-lg font-bold tracking-tight">{title}</h2> : null}
          {body ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{body}</p>
          ) : null}

          <div className="mt-5 flex gap-2">
            {current.link_url ? (
              <a
                href={current.link_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {x.viewChangelog}
              </a>
            ) : null}
            <button
              onClick={close}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-border px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
            >
              {x.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
