import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

const LANG_KEY = "devildev.lang";

export function usePreferredLanguage() {
  const [lang, setLang] = useState<Lang>("th");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "th" || stored === "en") {
      setLang(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const changeLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
  };

  return { lang, changeLang };
}
