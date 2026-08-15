import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

export const signIn = createServerFn({ method: "POST" })
  .validator((input: unknown) => credentials.parse(input))
  .handler(async ({ data }) => {
    const { loginUser } = await import("@/integrations/local/auth.server");
    return loginUser(data.email, data.password);
  });

export const signUp = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    credentials.extend({ username: z.string().trim().max(32).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { registerUser } = await import("@/integrations/local/auth.server");
    return registerUser(data.email, data.password, data.username);
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(254) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { createPasswordReset } = await import("@/integrations/local/auth.server");
    return createPasswordReset(data.email);
  });

export const confirmPasswordReset = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({ email: z.string().trim().email().max(254), code: z.string().regex(/^\d{6}$/) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { verifyPasswordReset } = await import("@/integrations/local/auth.server");
    return verifyPasswordReset(data.email, data.code);
  });

export const updateMyPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ password: z.string().min(8).max(72) }).parse(input))
  .handler(async ({ data, context }) => {
    const { changePassword } = await import("@/integrations/local/auth.server");
    changePassword(context.userId!, data.password);
    return { ok: true };
  });
