import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { finishDiscordAuth } = await import("@/integrations/local/discord-auth.server");
        return finishDiscordAuth(request);
      },
    },
  },
});
