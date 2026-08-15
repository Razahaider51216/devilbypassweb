import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";
import { isValidDiscordUrl } from "@/lib/discord-url";

export type PublicPlan = {
  code: string;
  name_en: string;
  name_th: string;
  description_en: string;
  description_th: string;
  price: number;
  currency: string;
  daily_limit: number | null;
  features_en: string[];
  features_th: string[];
  sort_order: number;
  duration_days: number | null;
  is_trial: boolean;
  is_featured: boolean;
};

export type ContactChannel = {
  id: string;
  label: string;
  url: string;
  handle: string;
  kind: string;
};

export type PurchaseContact = {
  id: string;
  label: string;
  url: string;
  kind: string;
  is_active: boolean;
  sort_order: number;
};

const PLAN_COLUMNS =
  "code, name_en, name_th, description_en, description_th, price, currency, daily_limit, features_en, features_th, sort_order, duration_days, is_trial, is_featured";

export const getStorefront = createServerFn({ method: "GET" }).handler(async () => {
  const { database } = await import("@/integrations/local/database.server");
  const [plans, channels, purchaseContacts] = await Promise.all([
    database
      .from("plans")
      .select(PLAN_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    database
      .from("contact_channels")
      .select("id, label, url, handle, kind")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    database
      .from("purchase_contact_links")
      .select("id, label, url, kind, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const safePurchaseContacts = (purchaseContacts.data ?? []).filter(
    (contact: PurchaseContact) =>
      contact.kind === "discord" && isValidDiscordUrl(contact.url) && contact.url.trim(),
  );

  return {
    plans: (plans.data ?? []) as PublicPlan[],
    channels: (channels.data ?? []) as ContactChannel[],
    purchaseContacts: safePurchaseContacts as PurchaseContact[],
  };
});

export type MyAccount = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  discordUsername: string | null;
  email: string | null;
  planCode: string;
  planName: { en: string; th: string };
  dailyLimit: number | null;
  usedToday: number;
  totalUsed: number;
  isBanned: boolean;
  isAdmin: boolean;
  memberSince: string;
  planExpiresAt: string | null;
  daysLeft: number | null;
  bypassDisabled: boolean;
  trialClaimed: boolean;
};

const PROFILE_COLUMNS =
  "username, display_name, avatar_url, discord_username, email, plan_code, plan_expires_at, used_today, usage_date, total_used, is_banned, bypass_disabled, trial_claimed_at, created_at";

/** Creates the profile + default role for a freshly registered account. */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z.object({ username: z.string().trim().max(32).default("") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    if (!userId) return { ok: false };
    const { database } = await import("@/integrations/local/database.server");

    const { data: existing } = await database
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (existing) return { ok: true };

    const email = (claims as { email?: string } | null)?.email ?? null;
    const raw = (data.username || email?.split("@")[0] || "user").toLowerCase();
    const base = raw.replace(/[^a-z0-9_]/g, "") || "user";

    let username = base;
    for (let i = 0; i < 20; i += 1) {
      const { data: taken } = await database
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!taken) break;
      username = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
    }

    await database.from("profiles").insert({ id: userId, username, email, plan_code: "free" });
    await database.from("user_roles").insert({ user_id: userId, role: "user" });
    return { ok: true };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MyAccount | null> => {
    const { userId, claims } = context;
    if (!userId) return null;
    const { database } = await import("@/integrations/local/database.server");

    let { data: profile } = await database
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      const email = (claims as { email?: string } | null)?.email ?? null;
      const base =
        (email?.split("@")[0] ?? "user").toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";
      const username = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
      await database.from("profiles").insert({ id: userId, username, email, plan_code: "free" });
      await database.from("user_roles").insert({ user_id: userId, role: "user" });
      ({ data: profile } = await database
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle());
    }
    if (!profile) return null;

    // Expired paid/trial packages fall back to Free automatically.
    let planCode = profile.plan_code;
    let expiresAt = profile.plan_expires_at;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      planCode = "free";
      expiresAt = null;
      await database
        .from("profiles")
        .update({ plan_code: "free", plan_expires_at: null })
        .eq("id", userId);
    }

    const [{ data: plan }, { data: roles }] = await Promise.all([
      database
        .from("plans")
        .select("name_en, name_th, daily_limit")
        .eq("code", planCode)
        .maybeSingle(),
      database.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
      : null;

    return {
      username: profile.username,
      displayName: profile.display_name || profile.username,
      avatarUrl: profile.avatar_url || null,
      discordUsername: profile.discord_username || null,
      email: profile.email,
      planCode,
      planName: { en: plan?.name_en ?? planCode, th: plan?.name_th ?? planCode },
      dailyLimit: plan?.daily_limit ?? null,
      usedToday: profile.usage_date === today ? profile.used_today : 0,
      totalUsed: profile.total_used,
      isBanned: profile.is_banned,
      isAdmin: (roles ?? []).some((r: { role: string }) => r.role === "admin"),
      memberSince: profile.created_at,
      planExpiresAt: expiresAt,
      daysLeft,
      bypassDisabled: profile.bypass_disabled,
      trialClaimed: Boolean(profile.trial_claimed_at),
    };
  });

/** One-per-account 7-day free trial. Duration comes from the plan row. */
export const claimTrial = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z.object({ planCode: z.string().trim().min(1).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (!userId) return { ok: false, reason: "not_signed_in" as const };
    const { database } = await import("@/integrations/local/database.server");

    const { data: plan } = await database
      .from("plans")
      .select("code, duration_days, is_trial, is_active")
      .eq("code", data.planCode)
      .maybeSingle();
    if (!plan || !plan.is_active || !plan.is_trial)
      return { ok: false, reason: "invalid" as const };

    const { data: profile } = await database
      .from("profiles")
      .select("trial_claimed_at, is_banned")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return { ok: false, reason: "not_signed_in" as const };
    if (profile.is_banned) return { ok: false, reason: "banned" as const };
    if (profile.trial_claimed_at) return { ok: false, reason: "already" as const };

    const days = plan.duration_days ?? 7;
    const expires = new Date(Date.now() + days * 86_400_000).toISOString();
    const { data: claimed, error } = await database
      .from("profiles")
      .update({
        plan_code: "pro",
        plan_expires_at: expires,
        trial_claimed_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .is("trial_claimed_at", null)
      .select("id")
      .maybeSingle();
    if (error || !claimed) return { ok: false, reason: "already" as const };
    return { ok: true as const, expiresAt: expires, days };
  });

export const requestPurchase = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({ planCode: z.string().min(1).max(40), contact: z.string().max(120).default("") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { database } = await import("@/integrations/local/database.server");
    const { data: plan } = await database
      .from("plans")
      .select("code, price, is_active, is_trial")
      .eq("code", data.planCode)
      .maybeSingle();
    if (!plan?.is_active || plan.is_trial || Number(plan.price) <= 0) {
      return { ok: false, reason: "invalid_plan" as const };
    }

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await database
      .from("purchase_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) return { ok: false, reason: "rate_limited" as const };

    const { error } = await database.from("purchase_requests").insert({
      user_id: userId,
      plan_code: data.planCode,
      contact: data.contact.trim().slice(0, 120),
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMyRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { database, userId } = context;
    const { data: rows } = await database
      .from("purchase_requests")
      .select("id, plan_code, status, admin_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const requests = (rows ?? []) as Array<{
      id: string;
      plan_code: string;
      status: string;
      admin_note?: string | null;
      created_at: string;
    }>;

    // Fetch plan details for display (price, currency, name)
    const codes = [...new Set(requests.map((r) => r.plan_code))].filter(Boolean);
    const { data: plans } = codes.length
      ? await database
          .from("plans")
          .select("code, name_en, name_th, price, currency")
          .in("code", codes)
      : { data: [] };

    type RequestPlan = {
      code: string;
      name_en: string;
      name_th: string;
      price: number;
      currency: string;
    };
    const planMap = new Map<string, RequestPlan>(
      ((plans ?? []) as RequestPlan[]).map((p) => [p.code, p]),
    );

    return requests.map((r) => ({
      id: r.id,
      plan_code: r.plan_code,
      status: r.status,
      admin_note: r.admin_note ?? null,
      created_at: r.created_at,
      plan: planMap.get(r.plan_code) ?? null,
    }));
  });
