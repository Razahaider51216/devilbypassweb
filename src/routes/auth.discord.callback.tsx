import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/discord/callback")({
  head: () => ({
    meta: [{ title: "Completing Discord sign in — DevilDev Bypass" }],
  }),
  component: DiscordCallbackFallback,
});

function DiscordCallbackFallback() {
  useEffect(() => {
    window.location.replace(`/api/auth/discord/callback${window.location.search}`);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-5 text-foreground">
      <p className="text-sm text-muted-foreground">Completing Discord sign in...</p>
    </div>
  );
}
