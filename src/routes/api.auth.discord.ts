import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/discord")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { beginDiscordAuth } = await import("@/integrations/local/discord-auth.server");
        return beginDiscordAuth(request);
      },
    },
  },
});
