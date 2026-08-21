import { createServerFn } from "@tanstack/react-start";

export type Announcement = {
  id: string;
  title_en: string;
  title_th: string;
  body_en: string;
  body_th: string;
  image_url: string;
  link_url: string;
  updated_at: string;
};

export type ChangelogEntry = {
  id: string;
  version: string;
  title_en: string;
  title_th: string;
  body_en: string;
  body_th: string;
  kind: string;
  released_at: string;
  is_important: boolean;
};

export const getAnnouncements = createServerFn({ method: "GET" }).handler(
  async (): Promise<Announcement[]> => {
    const { database: db } = await import("@/integrations/local/database.server");
    const { data } = await db
      .from("announcements")
      .select("id, title_en, title_th, body_en, body_th, image_url, link_url, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(5);
    return (data ?? []) as Announcement[];
  },
);

export const getChangelog = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChangelogEntry[]> => {
    const { database: db } = await import("@/integrations/local/database.server");
    const { data } = await db
      .from("changelog_entries")
      .select("id, version, title_en, title_th, body_en, body_th, kind, released_at, is_important")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("released_at", { ascending: false })
      .limit(50);
    return (data ?? []) as ChangelogEntry[];
  },
);

export type PublicBypass = {
  id: string;
  username: string;
  avatarUrl: string | null;
  key: string;
  createdAt: string;
  isPro: boolean;
};

/** Public wall of fame: recent successful bypasses with masked keys. */
export const getRecentBypasses = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicBypass[]> => {
    const { database } = await import("@/integrations/local/database.server");
    const { data: logs, error } = await database
      .from("bypass_logs")
      .select("id, result, created_at, user_id")
      .eq("status", "succeed")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error || !logs) {
      console.error("[getRecentBypasses]", error);
      return [];
    }

    type LogRow = { id: string; result: string; created_at: string; user_id: string };
    const typedLogs = logs as LogRow[];
    const ids = [...new Set(typedLogs.map((row) => row.user_id).filter(Boolean))] as string[];
    const profilesById = new Map<string, { username: string; avatarUrl: string | null }>();
    const pro = new Set<string>();
    if (ids.length > 0) {
      const { data: profiles } = await database
        .from("profiles")
        .select("id, username, display_name, avatar_url, plan_code")
        .in("id", ids);
      for (const p of profiles ?? []) {
        profilesById.set(p.id, {
          username: p.display_name || p.username || "anonymous",
          avatarUrl: p.avatar_url || null,
        });
        if (p.plan_code && p.plan_code !== "free") pro.add(p.id);
      }
    }

    return typedLogs.map((row) => {
      const profile = row.user_id ? profilesById.get(row.user_id) : null;
      return {
        id: row.id,
        username: profile?.username ?? "anonymous",
        avatarUrl: profile?.avatarUrl ?? null,
        // Never expose any substring of a user's bypass result on a public feed.
        key: "••••••••",
        createdAt: row.created_at,
        isPro: row.user_id ? pro.has(row.user_id) : false,
      };
    });
  },
);
