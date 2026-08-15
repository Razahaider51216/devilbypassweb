import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";

export const BANNER_SETTING_KEY = "banner_path";

/** Public: resolves the admin-selected banner stored in the database. */
export const getSiteBanner = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ url: string | null }> => {
    const { database } = await import("@/integrations/local/database.server");
    const { data } = await database
      .from("site_settings")
      .select("value")
      .eq("key", BANNER_SETTING_KEY)
      .maybeSingle();

    const path = (data?.value ?? "").trim();
    if (!path) return { url: null };

    const isStoredImage = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(path);
    const isLegacyUpload = path.startsWith("/uploads/banners/");
    return { url: isStoredImage || isLegacyUpload ? path : null };
  },
);

export const uploadSiteBanner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({ imageBase64: z.string().min(20).max(2_000_000), mimeType: z.literal("image/jpeg") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { database } = context;
    const role = await database.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Forbidden");
    const encoded = data.imageBase64.replace(/^data:image\/jpeg;base64,/, "");
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.length || bytes.length > 1_100_000) throw new Error("Banner is too large");
    if (bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
      throw new Error("Invalid banner image");
    }
    const path = `data:image/jpeg;base64,${encoded}`;
    const { error } = await database
      .from("site_settings")
      .upsert(
        { key: BANNER_SETTING_KEY, value: path, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, path };
  });
