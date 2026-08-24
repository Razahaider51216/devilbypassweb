import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request) throw new Error("Unauthorized");
  const { sessionToken, validateSameOrigin } = await import("./session-cookie.server");
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !validateSameOrigin(request))
    throw new Error("Invalid request origin");
  const token = sessionToken(request);
  if (!token) throw new Error("Unauthorized");
  const { verifySessionToken } = await import("./auth.server");
  const claims = await verifySessionToken(token);
  if (!claims) throw new Error("Unauthorized");
  const { database } = await import("./database.server");
  return next({ context: { database, userId: claims.sub, claims } });
});
