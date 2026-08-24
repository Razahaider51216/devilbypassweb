import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";
import type { LocalDatabase } from "@/integrations/local/database.server";
import { DISCORD_URL_ERROR, isValidDiscordUrl } from "@/lib/discord-url";

const discordUrlField = z
  .string()
  .trim()
  .max(300)
  .refine(isValidDiscordUrl, { message: DISCORD_URL_ERROR });

/**
 * Every function here re-checks the caller's admin role against the database
 * using the caller's own token before touching the service-role client.
 */
async function assertAdmin(context: { database: LocalDatabase; userId: string | null }) {
  if (!context.userId) throw new Error("Unauthorized");
  const { data, error } = await context.database.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
  return context.database;
}

export type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  discordUsername: string | null;
  discordId: string | null;
  planCode: string;
  planExpiresAt: string | null;
  daysLeft: number | null;
  usedToday: number;
  totalUsed: number;
  isBanned: boolean;
  bypassDisabled: boolean;
  isAdmin: boolean;
  adminNote: string;
  createdAt: string;
};

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const [users, pro, pending, logs, banned] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }).neq("plan_code", "free"),
      db
        .from("purchase_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db.from("bypass_logs").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("is_banned", true),
    ]);
    return {
      users: users.count ?? 0,
      pro: pro.count ?? 0,
      pending: pending.count ?? 0,
      bypasses: logs.count ?? 0,
      banned: banned.count ?? 0,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z.object({ search: z.string().trim().max(80).default("") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminUser[]> => {
    const db = await assertAdmin(context);
    let query = db
      .from("profiles")
      .select(
        "id, username, email, display_name, avatar_url, discord_username, plan_code, plan_expires_at, used_today, usage_date, total_used, is_banned, bypass_disabled, admin_note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search)
      query = query.or(`username.ilike.%${data.search}%,email.ilike.%${data.search}%`);

    const { data: rows } = await query;
    const { data: roles } = await db.from("user_roles").select("user_id, role").eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r: { user_id: string }) => r.user_id));
    const profileIds = (rows ?? []).map((row: { id: string }) => row.id);
    const accountResult = profileIds.length
      ? await db.from("users").select("id, discord_id").in("id", profileIds)
      : { data: [] };
    const discordIds = new Map(
      (accountResult.data ?? []).map((account: { id: string; discord_id: string | null }) => [
        account.id,
        account.discord_id,
      ]),
    );
    const today = new Date().toISOString().slice(0, 10);

    return (rows ?? []).map(
      (r: {
        id: string;
        username: string;
        email: string | null;
        display_name: string | null;
        avatar_url: string | null;
        discord_username: string | null;
        plan_code: string;
        plan_expires_at: string | null;
        used_today: number;
        usage_date: string;
        total_used: number;
        is_banned: boolean;
        bypass_disabled: boolean;
        admin_note?: string | null;
        created_at: string;
      }) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        discordUsername: r.discord_username,
        discordId: discordIds.get(r.id) ?? null,
        planCode: r.plan_code,
        planExpiresAt: r.plan_expires_at,
        daysLeft: r.plan_expires_at
          ? Math.max(
              0,
              Math.ceil((new Date(r.plan_expires_at).getTime() - Date.now()) / 86_400_000),
            )
          : null,
        usedToday: r.usage_date === today ? r.used_today : 0,
        totalUsed: r.total_used,
        isBanned: r.is_banned,
        bypassDisabled: r.bypass_disabled,
        isAdmin: adminIds.has(r.id),
        adminNote: r.admin_note ?? "",
        createdAt: r.created_at,
      }),
    );
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        planCode: z.string().trim().max(40).optional(),
        durationDays: z.number().int().min(0).max(3650).nullable().optional(),
        isBanned: z.boolean().optional(),
        bypassDisabled: z.boolean().optional(),
        adminNote: z.string().max(500).optional(),
        makeAdmin: z.boolean().optional(),
        resetUsage: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const patch: Record<string, unknown> = {};

    if (data.planCode !== undefined) {
      patch["plan_code"] = data.planCode;
      if (data.durationDays === null || data.durationDays === 0) {
        patch["plan_expires_at"] = null;
      } else if (typeof data.durationDays === "number") {
        patch["plan_expires_at"] = new Date(
          Date.now() + data.durationDays * 86_400_000,
        ).toISOString();
      }
    }
    if (data.isBanned !== undefined) patch["is_banned"] = data.isBanned;
    if (data.bypassDisabled !== undefined) patch["bypass_disabled"] = data.bypassDisabled;
    if (data.adminNote !== undefined) patch["admin_note"] = data.adminNote;
    if (data.resetUsage) {
      patch["used_today"] = 0;
      patch["usage_date"] = new Date().toISOString().slice(0, 10);
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await db
        .from("profiles")
        .update(patch as never)
        .eq("id", data.userId);
      if (error) throw new Error(error.message);
    }

    if (data.makeAdmin !== undefined) {
      if (data.userId === context.userId && data.makeAdmin === false) {
        throw new Error("You cannot remove your own admin role.");
      }
      if (data.makeAdmin) {
        await db
          .from("user_roles")
          .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await db.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      }
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");
    const { deleteUser } = await import("@/integrations/local/auth.server");
    await deleteUser(data.userId);
    return { ok: true };
  });

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data: rows } = await db
      .from("purchase_requests")
      .select("id, user_id, plan_code, contact, status, admin_note, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = [...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))];
    const { data: people } = ids.length
      ? await db.from("profiles").select("id, username, email").in("id", ids)
      : { data: [] };
    const map = new Map<string, { username: string; email: string | null }>(
      (people ?? []).map((p: { id: string; username: string; email: string | null }) => [p.id, p]),
    );
    return (rows ?? []).map(
      (r: {
        id: string;
        user_id: string;
        plan_code: string;
        contact: string;
        status: string;
        admin_note: string;
        created_at: string;
      }) => ({
        ...r,
        username: map.get(r.user_id)?.username ?? "—",
        email: map.get(r.user_id)?.email ?? null,
      }),
    );
  });

export const adminResolveRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "approved", "rejected"]),
        note: z.string().max(300).default(""),
        applyPlan: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { data: request } = await db
      .from("purchase_requests")
      .select("id, user_id, plan_code")
      .eq("id", data.id)
      .maybeSingle();
    if (!request) throw new Error("Request not found");

    await db
      .from("purchase_requests")
      .update({ status: data.status, admin_note: data.note, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (data.status === "approved" && data.applyPlan) {
      const { data: plan } = await db
        .from("plans")
        .select("duration_days")
        .eq("code", request.plan_code)
        .maybeSingle();
      const expires = plan?.duration_days
        ? new Date(Date.now() + plan.duration_days * 86_400_000).toISOString()
        : null;
      await db
        .from("profiles")
        .update({ plan_code: request.plan_code, plan_expires_at: expires })
        .eq("id", request.user_id);
    }
    return { ok: true };
  });

const PlanInput = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, - and _ only"),
  name_en: z.string().trim().min(1).max(60),
  name_th: z.string().trim().min(1).max(60),
  description_en: z.string().max(300).default(""),
  description_th: z.string().max(300).default(""),
  price: z.number().min(0).max(1_000_000),
  currency: z.string().trim().min(1).max(8).default("THB"),
  daily_limit: z.number().int().min(0).max(100000).nullable(),
  duration_days: z.number().int().min(0).max(3650).nullable(),
  features_en: z.array(z.string().max(120)).max(12).default([]),
  features_th: z.array(z.string().max(120)).max(12).default([]),
  is_active: z.boolean().default(true),
  is_trial: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const adminSavePlan = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db
      .from("plans")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data } = await db.from("plans").select("*").order("sort_order", { ascending: true });
    return data ?? [];
  });

export const adminDeletePlan = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ code: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    if (data.code === "free") throw new Error("The Free plan cannot be deleted.");
    const { error } = await db.from("plans").delete().eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListChannels = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data } = await db
      .from("contact_channels")
      .select("*")
      .order("sort_order", { ascending: true });
    return data ?? [];
  });

export const adminSaveChannel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(1).max(60),
        url: z.string().trim().url().max(300),
        handle: z.string().trim().max(80).default(""),
        kind: z.string().trim().max(30).default("discord"),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().min(0).max(999).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { id, ...rest } = data;
    const row = { ...rest, updated_at: new Date().toISOString(), ...(id ? { id } : {}) };
    const { error } = await db.from("contact_channels").upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteChannel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db.from("contact_channels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPurchaseContacts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data, error } = await db
      .from("purchase_contact_links")
      .select("id, kind, label, url, is_active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSavePurchaseContactLink = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(1).max(80),
        url: discordUrlField.default(""),
        kind: z.string().trim().max(30).default("discord"),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().min(0).max(999).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const now = new Date().toISOString();
    const { error } = await db.from("purchase_contact_links").upsert(
      {
        kind: "discord",
        label: data.label.trim(),
        url: data.url.trim(),
        is_active: Boolean(data.url.trim()),
        sort_order: 0,
        updated_at: now,
      },
      { onConflict: "kind" },
    );
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data } = await db
      .from("site_settings")
      .select("key, value")
      .neq("key", "banner_path")
      .order("key");
    return data ?? [];
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({ key: z.string().trim().min(1).max(60), value: z.string().max(2000) })
      .superRefine((data, ctx) => {
        if (data.key === "purchase_discord_url" && !isValidDiscordUrl(data.value)) {
          ctx.addIssue({ code: "custom", message: DISCORD_URL_ERROR, path: ["value"] });
        }
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db
      .from("site_settings")
      .upsert(
        { key: data.key, value: data.value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z.object({ userId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    let query = db
      .from("bypass_logs")
      .select("id, user_id, url, status, result, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.userId) query = query.eq("user_id", data.userId);
    const { data: rows } = await query;
    const ids = [...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))];
    const { data: people } = ids.length
      ? await db.from("profiles").select("id, username").in("id", ids)
      : { data: [] };
    const map = new Map<string, string>(
      (people ?? []).map((p: { id: string; username: string }) => [p.id, p.username]),
    );
    return (rows ?? []).map(
      (r: {
        id: string;
        user_id: string;
        url: string;
        status: string;
        result: string;
        created_at: string;
      }) => ({ ...r, username: map.get(r.user_id) ?? "—" }),
    );
  });

/* ------------------------------ Announcements ------------------------------ */

export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data } = await db
      .from("announcements")
      .select("*")
      .order("sort_order", { ascending: true });
    return data ?? [];
  });

export const adminSaveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title_en: z.string().trim().max(120).default(""),
        title_th: z.string().trim().max(120).default(""),
        body_en: z.string().max(1000).default(""),
        body_th: z.string().max(1000).default(""),
        image_url: z.string().trim().max(1000).default(""),
        image_urls: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
        link_url: z.string().trim().max(500).default(""),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().min(0).max(999).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { id, ...rest } = data;
    const imageUrls = [...new Set(rest.image_urls.map((url) => url.trim()).filter(Boolean))];
    const row = {
      ...rest,
      image_url: imageUrls[0] ?? rest.image_url,
      image_urls: imageUrls.length > 0 ? imageUrls : rest.image_url ? [rest.image_url] : [],
      updated_at: new Date().toISOString(),
      ...(id ? { id } : {}),
    };
    const { error } = await db.from("announcements").upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- Changelog -------------------------------- */

export const adminListChangelog = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data } = await db
      .from("changelog_entries")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("released_at", { ascending: false });
    return data ?? [];
  });

export const adminSaveChangelog = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        version: z.string().trim().max(30).default(""),
        title_en: z.string().trim().max(120).default(""),
        title_th: z.string().trim().max(120).default(""),
        body_en: z.string().max(2000).default(""),
        body_th: z.string().max(2000).default(""),
        kind: z.enum(["new", "fix", "improve"]).default("new"),
        released_at: z.string().max(40).optional(),
        is_published: z.boolean().default(true),
        sort_order: z.number().int().min(0).max(999).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { id, released_at, ...rest } = data;
    const row = {
      ...rest,
      released_at: released_at ? new Date(released_at).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(id ? { id } : {}),
    };
    const { error } = await db.from("changelog_entries").upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteChangelog = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db.from("changelog_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
