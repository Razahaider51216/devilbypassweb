import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteBanner } from "@/lib/banner.functions";

/** Full-page background with an optional admin banner and animated geometric frames. */
export function SiteBackground() {
  const fetchBanner = useServerFn(getSiteBanner);
  const { data } = useQuery({
    queryKey: ["site-banner"],
    queryFn: () => fetchBanner(),
    staleTime: 5 * 60_000,
  });

  const url = data?.url ?? null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      {url ? (
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {url ? <div className="absolute inset-0 bg-background/88" /> : null}
      <div className="dd-geometry-background absolute inset-0">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className="dd-geometry-frame" />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/75" />
    </div>
  );
}
