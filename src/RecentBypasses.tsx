import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Zap, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRecentBypasses, type PublicBypass } from "@/lib/content.functions";
import type { Lang } from "@/lib/i18n";
import { extra } from "@/lib/i18n-extra";

function since(iso: string, lang: Lang) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return lang === "th" ? `${days} วันที่แล้ว` : `${days}d ago`;
  if (hrs > 0) return lang === "th" ? `${hrs} ชม.ที่แล้ว` : `${hrs}h ago`;
  if (min > 0) return lang === "th" ? `${min} นาทีที่แล้ว` : `${min}m ago`;
  return lang === "th" ? "เมื่อสักครู่" : "just now";
}

function Row({ item, lang, proLabel }: { item: PublicBypass; lang: Lang; proLabel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 px-4 py-3 backdrop-blur transition-colors hover:border-foreground/40">
      <span className="relative h-8 w-8 shrink-0">
        <Avatar className="h-8 w-8 border border-foreground/20 bg-foreground/10">
          {item.avatarUrl ? (
            <AvatarImage src={item.avatarUrl} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-foreground/10">
            <Zap className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
        <span className="pulse absolute inset-0 rounded-full ring-1 ring-foreground/30" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
          <span className="truncate">{item.username}</span>
          {item.isPro ? (
            <span
              title={proLabel}
              aria-label={proLabel}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-foreground/30 bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            >
              <Crown className="h-2.5 w-2.5" />
              Pro
            </span>
          ) : null}
        </p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{item.key}</p>
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
        {since(item.createdAt, lang)}
      </span>
    </div>
  );
}

export function RecentBypasses({ lang }: { lang: Lang }) {
  const x = extra[lang];

  const fetchRecent = useServerFn(getRecentBypasses);
  const { data } = useQuery({
    queryKey: ["recent-bypasses"],
    queryFn: () => fetchRecent(),
    refetchInterval: 1_000,
  });

  const items = data ?? [];
  const loop = items.length > 3 ? [...items, ...items] : items;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {x.recentTitle}
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="pulse h-1.5 w-1.5 rounded-full bg-foreground" />
          {x.recentLive}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{x.recentEmpty}</p>
      ) : (
        <div className="dd-fade relative mt-4 h-[220px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card/60 to-transparent p-3">
          <div
            className="space-y-2"
            style={
              items.length > 3
                ? { animation: `dd-marquee ${items.length * 3}s linear infinite` }
                : undefined
            }
          >
            {loop.map((item, index) => (
              <Row key={`${item.id}-${index}`} item={item} lang={lang} proLabel={x.proBadge} />
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{x.recentNote}</p>
    </section>
  );
}
