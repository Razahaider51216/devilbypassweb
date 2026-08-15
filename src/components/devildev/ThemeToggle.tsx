import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { more } from "@/lib/i18n-more";
import type { Lang } from "@/lib/i18n";

export function ThemeToggle({ lang }: { lang: Lang }) {
  const { theme, toggle } = useTheme();
  const m = more[lang];
  const label = theme === "dark" ? m.themeLight : m.themeDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${m.themeToggle} — ${label}`}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
