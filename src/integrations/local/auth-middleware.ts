import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authorization = request?.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("Unauthorized");
  const { verifySessionToken } = await import("./auth.server");
  const claims = await verifySessionToken(authorization.slice(7));
  if (!claims) throw new Error("Unauthorized");
  const { database } = await import("./database.server");
  return next({ context: { database, userId: claims.sub, claims } });
});
