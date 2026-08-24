import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from "lucide-react";
import { getAnnouncements } from "@/lib/content.functions";
import type { Lang } from "@/lib/i18n";

type Slide = {
  key: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
};

export function AnnouncementCarousel({ lang }: { lang: Lang }) {
  const load = useServerFn(getAnnouncements);
  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => load({}),
  });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo<Slide[]>(
    () =>
      (data ?? []).flatMap((announcement) => {
        const title =
          lang === "th"
            ? announcement.title_th || announcement.title_en
            : announcement.title_en || announcement.title_th;
        const body =
          lang === "th"
            ? announcement.body_th || announcement.body_en
            : announcement.body_en || announcement.body_th;
        const images = announcement.image_urls.length > 0 ? announcement.image_urls : [""];
        return images.map((imageUrl, imageIndex) => ({
          key: `${announcement.id}:${imageIndex}`,
          title,
          body,
          imageUrl,
          linkUrl: announcement.link_url,
        }));
      }),
    [data, lang],
  );

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      6_000,
    );
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (isLoading) {
    return (
      <div className="mt-6 aspect-[16/7] animate-pulse rounded-3xl border border-border bg-card" />
    );
  }
  if (slides.length === 0) return null;

  const current = slides[active]!;
  const move = (direction: -1 | 1) => {
    setActive((index) => (index + direction + slides.length) % slides.length);
  };

  return (
    <section
      aria-label={lang === "th" ? "ประกาศ" : "Announcements"}
      aria-roledescription="carousel"
      className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_55px_-40px_rgba(0,0,0,0.55)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
    >
      <div className="relative">
        {current.imageUrl ? (
          <img
            key={current.key}
            src={current.imageUrl}
            alt={current.title || (lang === "th" ? "รูปประกาศ" : "Announcement image")}
            className="aspect-[16/7] w-full bg-muted object-cover"
            loading={active === 0 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="aspect-[16/7] bg-gradient-to-br from-muted via-card to-background" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
            <Megaphone className="h-3.5 w-3.5" />
            {lang === "th" ? "ประกาศ" : "Announcement"}
          </p>
          {current.title ? (
            <h2 className="mt-1.5 line-clamp-2 text-base font-bold tracking-tight sm:text-xl">
              {current.title}
            </h2>
          ) : null}
          {current.body ? (
            <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/80 sm:text-sm">
              {current.body}
            </p>
          ) : null}
          {current.linkUrl ? (
            <a
              href={current.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/45"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {lang === "th" ? "ดูรายละเอียด" : "View details"}
            </a>
          ) : null}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={lang === "th" ? "รูปก่อนหน้า" : "Previous slide"}
              className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={lang === "th" ? "รูปถัดไป" : "Next slide"}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="flex items-center justify-center gap-1.5 border-t border-border bg-card px-4 py-3">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${lang === "th" ? "ไปที่รูป" : "Go to slide"} ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all ${
                index === active
                  ? "w-6 bg-foreground"
                  : "w-1.5 bg-muted-foreground/35 hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
