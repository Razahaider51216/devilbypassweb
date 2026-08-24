import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { sessionCookie, sessionToken, validateSameOrigin } =
          await import("@/integrations/local/session-cookie.server");
        if (!validateSameOrigin(request)) return new Response(null, { status: 403 });
        const token = sessionToken(request);
        if (token) {
          const { revokeSession } = await import("@/integrations/local/auth.server");
          await revokeSession(token);
        }
        return new Response(null, {
          status: 204,
          headers: {
            "cache-control": "no-store, max-age=0",
            "set-cookie": sessionCookie(request, "", 0),
          },
        });
      },
    },
  },
});
