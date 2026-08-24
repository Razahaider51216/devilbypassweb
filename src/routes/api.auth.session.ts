import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { sessionToken } = await import("@/integrations/local/session-cookie.server");
        const { verifySessionToken } = await import("@/integrations/local/auth.server");
        const token = sessionToken(request);
        const claims = token ? await verifySessionToken(token) : null;
        return Response.json(
          {
            session: claims ? { user: { id: claims.sub, email: claims.email } } : null,
          },
          { headers: { "cache-control": "no-store, max-age=0" } },
        );
      },
    },
  },
});
