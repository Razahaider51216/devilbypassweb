import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteBanner } from "@/lib/banner.functions";

/** Full-page background banner (admin managed) with a dark readability overlay. */
export function SiteBackground() {
  const fetchBanner = useServerFn(getSiteBanner);
  const { data } = useQuery({
    queryKey: ["site-banner"],
    queryFn: () => fetchBanner(),
    staleTime: 5 * 60_000,
  });

  const url = data?.url ?? null;
  if (!url) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/90" />
    </div>
  );
}
