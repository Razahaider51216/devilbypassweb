import { createMiddleware } from "@tanstack/react-start";
export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  // Same-origin HttpOnly cookies are attached by the browser.
  return next();
});
