import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LangToggle } from "@/components/devildev/LangToggle";
import { ThemeToggle } from "@/components/devildev/ThemeToggle";
import type { Lang } from "@/lib/i18n";

const labels = {
  th: {
    home: "หน้าหลัก",
    terms: "ข้อกำหนด",
    privacy: "ความเป็นส่วนตัว",
    support: "ช่วยเหลือ",
    back: "กลับหน้าหลัก",
    footer: "บริการปลดล็อกลิงก์ที่เรียบง่าย รวดเร็ว และโปร่งใส",
  },
  en: {
    home: "Home",
    terms: "Terms",
    privacy: "Privacy",
    support: "Support",
    back: "Back home",
    footer: "Simple, fast and transparent link unlocking",
  },
} as const;

export function InfoPageShell({
  lang,
  onLangChange,
  children,
}: {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  children: ReactNode;
}) {
  const copy = labels[lang];

  return (
    <main className="min-h-screen text-foreground">
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/" className="group min-w-0" aria-label={copy.home}>
            <p className="truncate text-xl font-bold tracking-tight">
              Devil
              <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                Dev
              </span>
            </p>
            <p className="hidden text-[9px] uppercase tracking-[0.28em] text-muted-foreground sm:block">
              Link Bypass
            </p>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            <NavLink to="/terms">{copy.terms}</NavLink>
            <NavLink to="/privacy">{copy.privacy}</NavLink>
            <NavLink to="/support">{copy.support}</NavLink>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LangToggle lang={lang} onChange={onLangChange} />
            <ThemeToggle lang={lang} />
          </div>
        </header>
        <nav
          className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-4 pb-2.5 md:hidden"
          aria-label="Main navigation"
        >
          <NavLink to="/terms">{copy.terms}</NavLink>
          <NavLink to="/privacy">{copy.privacy}</NavLink>
          <NavLink to="/support">{copy.support}</NavLink>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-4xl px-5 pb-16 pt-7 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {copy.back}
        </Link>
        {children}
      </div>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-foreground">DevilDev</p>
            <p className="mt-1">{copy.footer}</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              {copy.terms}
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              {copy.privacy}
            </Link>
            <Link to="/support" className="transition-colors hover:text-foreground">
              {copy.support}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function NavLink({
  to,
  children,
}: {
  to: "/terms" | "/privacy" | "/support";
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-foreground text-background" }}
      inactiveProps={{ className: "text-muted-foreground hover:bg-accent hover:text-foreground" }}
      className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors"
    >
      {children}
    </Link>
  );
}
