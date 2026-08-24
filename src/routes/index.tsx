import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { bypassLink, type BypassResult } from "@/lib/bypass.functions";
import { dictionary, type Lang } from "@/lib/i18n";
import { BypassForm } from "@/components/devildev/BypassForm";
import { ResultCard } from "@/components/devildev/ResultCard";
import { HistoryList, type HistoryEntry } from "@/components/devildev/HistoryList";
import { LangToggle } from "@/components/devildev/LangToggle";
import { AppMenu } from "@/components/devildev/AppMenu";
import { useSession } from "@/hooks/useSession";
import { AnnouncementCarousel } from "@/components/devildev/AnnouncementCarousel";
import { extra } from "@/lib/i18n-extra";
import { RecentBypasses } from "@/components/devildev/RecentBypasses";
import { BypassProcessing } from "@/components/devildev/BypassProcessing";
import { SupportedSites } from "@/components/devildev/SupportedSites";
import { ThemeToggle } from "@/components/devildev/ThemeToggle";
import { UpdatesBell } from "@/components/devildev/UpdatesBell";

const HISTORY_KEY = "devildev.history";
const LANG_KEY = "devildev.lang";
const COOLDOWN_KEY = "devildev.cooldownUntil";
const COOLDOWN_MS = 30_000;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevilBypass — Link Bypass" },
      {
        name: "description",
        content:
          "DevilBypass unlocks shortened and locked links in seconds. Paste a URL and get the real key back. Thai and English interface.",
      },
      { property: "og:title", content: "DevilBypass — Link Bypass" },
      {
        property: "og:description",
        content:
          "DevilBypass unlocks shortened and locked links in seconds. Paste a URL and get the real key back. Thai and English interface.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DevilDevPage,
});

function DevilDevPage() {
  const [lang, setLang] = useState<Lang>("th");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [result, setResult] = useState<BypassResult | null>(null);
  const copy = dictionary[lang];
  const x = extra[lang];
  const { session, ready } = useSession();
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const stored = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
    setNow(Date.now());
    if (stored > Date.now()) setCooldownUntil(stored);
    else localStorage.removeItem(COOLDOWN_KEY);
  }, []);

  // Single interval; a new countdown always replaces the previous one.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const remaining = Math.max(0, Math.ceil((cooldownUntil - Math.max(now, 0)) / 1000));

  const startCooldown = () => {
    const until = Date.now() + COOLDOWN_MS;
    localStorage.setItem(COOLDOWN_KEY, String(until));
    setNow(Date.now());
    setCooldownUntil(until);
  };

  const clearCooldown = () => {
    localStorage.removeItem(COOLDOWN_KEY);
    setCooldownUntil(0);
  };

  useEffect(() => {
    const storedLang = localStorage.getItem(LANG_KEY);
    if (storedLang === "th" || storedLang === "en") setLang(storedLang);
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryEntry[]);
    } catch {
      setHistory([]);
    }
  }, []);

  const changeLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const saveHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  };

  const runBypass = useServerFn(bypassLink);
  const mutation = useMutation({
    mutationFn: (url: string) => runBypass({ data: { url } }),
    onMutate: () => {
      setResult(null);
    },
    onSuccess: (data, url) => {
      setResult(data);
      // Cooldown only starts on a confirmed successful bypass.
      if (data.status === "succeed") startCooldown();
      saveHistory(
        [
          {
            id: `${Date.now()}`,
            url,
            result: data.errorCode ? dictionary[lang].errors[data.errorCode] : data.result,
            status: data.status,
            time: data.time,
          },
          ...history,
        ].slice(0, 10),
      );
    },
    onError: () => {
      clearCooldown();
      setResult({
        status: "failed",
        result: "",
        time: null,
        expiresAt: null,
        errorCode: session ? "upstream" : "not_signed_in",
        remaining: null,
      });
    },
  });

  return (
    <main className="min-h-screen text-foreground">
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <header className="mx-auto grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="truncate text-xl font-bold tracking-tight sm:text-2xl">
              Devil<span className="text-muted-foreground">Dev</span>
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:text-[11px] sm:tracking-[0.3em]">
              {copy.tagline}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LangToggle lang={lang} onChange={changeLang} />
            <ThemeToggle lang={lang} />
            <UpdatesBell lang={lang} />
            <AppMenu copy={copy} lang={lang} />
          </div>
        </header>
      </div>

      <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-4">
        <section className="mt-6 sm:mt-10">
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-3 max-w-lg text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm">
            {copy.heroSub}
          </p>
        </section>

        <AnnouncementCarousel lang={lang} />

        <div className="mt-6 sm:mt-10">
          {!ready ? (
            <div className="h-[132px] animate-pulse rounded-2xl border border-border bg-card" />
          ) : session ? (
            <>
              <BypassForm
                copy={copy}
                lang={lang}
                pending={mutation.isPending}
                remaining={remaining}
                onSubmit={(url) => {
                  if (mutation.isPending || remaining > 0) return;
                  mutation.mutate(url);
                }}
              />
              {mutation.isPending ? (
                <BypassProcessing lang={lang} />
              ) : (
                <>{result ? <ResultCard result={result} copy={copy} lang={lang} /> : null}</>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[0_0_60px_-30px_rgba(255,255,255,0.35)]">
              <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">{copy.errors.not_signed_in}</p>
              <Link
                to="/auth"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                {copy.auth.signIn}
              </Link>
            </div>
          )}
        </div>

        <SupportedSites lang={lang} />

        {session ? (
          <HistoryList entries={history} copy={copy} lang={lang} onClear={() => saveHistory([])} />
        ) : null}

        <RecentBypasses lang={lang} />

        <section className="mt-16 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {x.usageTitle}
          </h2>
          <ol className="mt-4 space-y-3">
            {[x.usageStep1, x.usageStep2, x.usageStep3].map((step, index) => (
              <li key={step} className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
            {x.usageNote}
          </p>
          <Link
            to="/changelog"
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-[11px] font-semibold transition-colors hover:bg-accent"
          >
            {x.viewChangelog}
          </Link>
        </section>

        <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{copy.footer}</span>
            <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Footer navigation">
              <Link to="/terms" className="transition-colors hover:text-foreground">
                {lang === "th" ? "ข้อกำหนด" : "Terms"}
              </Link>
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                {lang === "th" ? "ความเป็นส่วนตัว" : "Privacy"}
              </Link>
              <Link to="/support" className="transition-colors hover:text-foreground">
                {lang === "th" ? "ช่วยเหลือ" : "Support"}
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}
