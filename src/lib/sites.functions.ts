import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";
import type { LocalDatabase } from "@/integrations/local/database.server";

export type SiteStatus = "available" | "maintenance" | "disabled";

export type SupportedSite = {
  id: string;
  name: string;
  domain_or_pattern: string;
  status: SiteStatus;
  category: string;
  display_order: number;
  is_visible: boolean;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Normalizes a domain / URL pattern so http vs https, www, casing, spaces and
 * trailing slashes cannot create duplicate rows.
 */
export function normalizeDomain(raw: string): string {
  let value = raw.trim().toLowerCase().replace(/\s+/g, "");
  value = value.replace(/^[a-z]+:\/\//, "");
  value = value.replace(/^www\./, "");
  value = value.replace(/\/+$/, "");
  return value;
}

/** Returns a favicon URL derived from the site's domain; no manual upload is required. */
export function siteLogoUrl(domainOrPattern: string): string | null {
  const host = normalizeDomain(domainOrPattern).split("/")[0]?.replace(/^\*\./, "");
  if (!host || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return null;
  return `https://favicon.im/${encodeURIComponent(host)}?larger=true`;
}

const UNSAFE = /[<>"'`\\]|javascript:|data:|vbscript:|on[a-z]+=/i;

const SiteInput = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((v) => !UNSAFE.test(v), "Invalid characters in name"),
  domain_or_pattern: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .refine((v) => !UNSAFE.test(v), "Invalid characters in domain")
    .refine(
      (v) => /^[a-z0-9._\-/*:?=&%+]+$/i.test(normalizeDomain(v)),
      "Invalid domain or pattern",
    ),
  status: z.enum(["available", "maintenance", "disabled"]).default("available"),
  category: z
    .string()
    .trim()
    .max(40)
    .default("")
    .refine((v) => !UNSAFE.test(v), "Invalid characters in category"),
  display_order: z.number().int().min(0).max(9999).default(0),
  is_visible: z.boolean().default(true),
});

/** Public list: returned by the server with an explicit safe-column allowlist. */
export const getSupportedSites = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupportedSite[]> => {
    const { database } = await import("@/integrations/local/database.server");
    const { data, error } = await database
      .from("supported_sites")
      .select("id, name, domain_or_pattern, status, category, display_order, is_visible")
      .eq("is_visible", true)
      .neq("status", "disabled")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(300);
    if (error) throw new Error("Unable to load supported sites");
    return (data ?? []).map((site: Omit<SupportedSite, "logo_url">) => ({
      ...site,
      logo_url: siteLogoUrl(site.domain_or_pattern),
    }));
  },
);

async function assertAdmin(context: { database: LocalDatabase; userId: string | null }) {
  if (!context.userId) throw new Error("Unauthorized");
  const { data, error } = await context.database.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
  return context.database;
}

export const adminListSites = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SupportedSite[]> => {
    const db = await assertAdmin(context);
    const { data } = await db
      .from("supported_sites")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    return (data ?? []).map((site: Omit<SupportedSite, "logo_url">) => ({
      ...site,
      logo_url: siteLogoUrl(site.domain_or_pattern),
    }));
  });

export const adminSaveSite = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => SiteInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const domain = normalizeDomain(data.domain_or_pattern);

    const { data: clash } = await db
      .from("supported_sites")
      .select("id")
      .eq("domain_or_pattern", domain)
      .maybeSingle();
    if (clash && clash.id !== data.id) throw new Error("This domain already exists");

    const row: Record<string, unknown> = {
      name: data.name,
      domain_or_pattern: domain,
      status: data.status,
      category: data.category,
      display_order: data.display_order,
      is_visible: data.is_visible,
      updated_by: context.userId,
    };
    if (data.id) row["id"] = data.id;
    else row["created_by"] = context.userId;

    const { error } = await db.from("supported_sites").upsert(row as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSite = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db.from("supported_sites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
