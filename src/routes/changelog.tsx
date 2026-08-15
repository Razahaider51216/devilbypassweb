import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles, Wrench, Zap, History } from "lucide-react";
import { getChangelog } from "@/lib/content.functions";
import { dictionary, type Lang } from "@/lib/i18n";
import { extra } from "@/lib/i18n-extra";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Bypass update log — DevilDev" },
      {
        name: "description",
        content:
          "Every DevilDev bypass engine update: new features, fixes and performance improvements, listed newest first.",
      },
      { property: "og:title", content: "Bypass update log — DevilDev" },
      {
        property: "og:description",
        content: "New features, fixes and improvements to the DevilDev bypass engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  const [lang, setLang] = useState<Lang>("th");
  const copy = dictionary[lang];
  const x = extra[lang];

  useEffect(() => {
    const stored = localStorage.getItem("devildev.lang");
    if (stored === "en" || stored === "th") setLang(stored);
  }, []);

  const fetchChangelog = useServerFn(getChangelog);
  const entries = useQuery({ queryKey: ["changelog"], queryFn: () => fetchChangelog({}) });
  const rows = entries.data ?? [];

  const badge = (kind: string) => {
    if (kind === "fix")
      return { label: x.kindFix, icon: <Wrench className="h-3 w-3" />, cls: "border-destructive/40 text-destructive" };
    if (kind === "improve")
      return { label: x.kindImprove, icon: <Zap className="h-3 w-3" />, cls: "border-border text-muted-foreground" };
    return { label: x.kindNew, icon: <Sparkles className="h-3 w-3" />, cls: "border-foreground text-foreground" };
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> {copy.common.back}
        </Link>

        <header className="mt-6">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            <History className="h-3 w-3" /> {x.changelog}
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {x.changelogTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{x.changelogSub}</p>
        </header>

        <div className="mt-10">
          {entries.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{x.changelogEmpty}</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {rows.map((row, index) => {
                const tag = badge(row.kind);
                const title = lang === "th" ? row.title_th || row.title_en : row.title_en || row.title_th;
                const body = lang === "th" ? row.body_th || row.body_en : row.body_en || row.body_th;
                return (
                  <li key={row.id} className="animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
                    <span className="absolute -left-[5px] mt-2 h-2.5 w-2.5 rounded-full bg-foreground" />
                    <div className="rounded-2xl border border-border bg-card p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_50px_-25px_rgba(255,255,255,0.4)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tag.cls}`}
                        >
                          {tag.icon} {tag.label}
                        </span>
                        {row.version ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                            {row.version}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(row.released_at).toLocaleDateString()}
                        </span>
                      </div>
                      {title ? <h2 className="mt-2.5 text-sm font-bold">{title}</h2> : null}
                      {body ? (
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                          {body}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
