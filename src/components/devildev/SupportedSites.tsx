import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Wrench,
  Globe,
  Sparkles,
  Globe2,
} from "lucide-react";
import { getSupportedSites, type SiteStatus } from "@/lib/sites.functions";
import { more } from "@/lib/i18n-more";
import type { Lang } from "@/lib/i18n";

function badge(status: SiteStatus, lang: Lang) {
  const m = more[lang];
  if (status === "available") {
    return {
      label: m.statusAvailable,
      icon: <CheckCircle2 className="h-3 w-3" />,
      cls: "border-emerald-600/35 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:text-emerald-300",
    };
  }
  if (status === "maintenance") {
    return {
      label: m.statusMaintenance,
      icon: <Wrench className="h-3 w-3" />,
      cls: "border-amber-600/35 bg-amber-500/10 text-amber-700 dark:border-amber-400/35 dark:text-amber-300",
    };
  }
  return {
    label: m.statusDisabled,
    icon: <Globe className="h-3 w-3" />,
    cls: "border-border bg-muted text-muted-foreground",
  };
}

/** Public, admin-managed list of websites the bypass engine supports. */
export function SupportedSites({ lang }: { lang: Lang }) {
  const m = more[lang];
  const [term, setTerm] = useState("");
  const [expanded, setExpanded] = useState(false);
  const load = useServerFn(getSupportedSites);
  const sites = useQuery({ queryKey: ["supported-sites"], queryFn: () => load({}) });

  const rows = useMemo(() => {
    const list = sites.data ?? [];
    const q = term.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.domain_or_pattern.toLowerCase().includes(q),
    );
  }, [sites.data, term]);

  const previewCount = 6;
  const visibleRows = expanded ? rows : rows.slice(0, previewCount);
  const hasMore = rows.length > previewCount;

  return (
    <section className="mt-12 rounded-[1.65rem] border border-border bg-card/90 p-4 shadow-[0_18px_60px_-45px_rgba(0,0,0,0.6)] backdrop-blur sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-600/25 bg-sky-500/10 text-sky-700 shadow-[0_0_16px_rgba(56,189,248,0.12)] dark:border-sky-400/25 dark:text-sky-300">
              <Globe2 className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-[0.28em] text-foreground/85 sm:text-[0.8rem]">
              {m.sitesTitle}
            </h2>
          </div>
          <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
            {m.sitesSub}
          </p>
        </div>
        <label className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={m.sitesSearch}
            aria-label={m.sitesSearch}
            className="min-h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs outline-none transition-colors focus:border-foreground"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sites.isLoading ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-muted/60"
            />
          ))
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{m.sitesEmpty}</p>
        ) : (
          visibleRows.map((site) => {
            const tag = badge(site.status, lang);
            return (
              <div
                key={site.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background/75 p-3.5 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-accent/45 sm:items-center"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {site.logo_url ? (
                    <img
                      src={site.logo_url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded-md"
                    />
                  ) : (
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold tracking-tight text-foreground sm:text-sm">
                    {site.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80 sm:mt-1">
                    {site.domain_or_pattern}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${tag.cls}`}
                >
                  {tag.icon} {tag.label}
                </span>
              </div>
            );
          })
        )}
      </div>

      {hasMore ? (
        <div className="mt-3 flex justify-center sm:justify-end">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? "Show Less" : "Show More"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
