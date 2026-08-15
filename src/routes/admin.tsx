/* eslint-disable @typescript-eslint/no-explicit-any -- admin tables use runtime-defined row shapes */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/useSession";
import { getMyAccount } from "@/lib/account.functions";
import { DISCORD_URL_ERROR, isValidDiscordUrl } from "@/lib/discord-url";
import {
  adminDeleteChannel,
  adminDeletePlan,
  adminDeleteUser,
  adminListChannels,
  adminListLogs,
  adminListPlans,
  adminListRequests,
  adminListPurchaseContacts,
  adminListSettings,
  adminListUsers,
  adminOverview,
  adminResolveRequest,
  adminSaveChannel,
  adminSavePlan,
  adminSavePurchaseContactLink,
  adminSaveSetting,
  adminSetPassword,
  adminUpdateUser,
  adminListAnnouncements,
  adminSaveAnnouncement,
  adminDeleteAnnouncement,
  adminListChangelog,
  adminSaveChangelog,
  adminDeleteChangelog,
  type AdminUser,
} from "@/lib/admin.functions";
import { SitesTab } from "@/components/devildev/SitesTab";
import { more } from "@/lib/i18n-more";
import { BannerTab } from "@/components/devildev/BannerTab";
import { dictionary, type Lang } from "@/lib/i18n";
import { extra } from "@/lib/i18n-extra";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — DevilDev" },
      {
        name: "description",
        content:
          "DevilDev administration: manage members, packages, purchase requests, contact channels and site settings.",
      },
      { property: "og:title", content: "Admin console — DevilDev" },
      {
        property: "og:description",
        content: "Manage DevilDev members, packages and site settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-foreground";
const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-accent disabled:opacity-50";
const btnSolid =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50";

function AdminPage() {
  const [lang] = useState<Lang>(
    typeof window !== "undefined" && localStorage.getItem("devildev.lang") === "en" ? "en" : "th",
  );
  const [section, setSection] = useState<
    | "overview"
    | "users"
    | "plans"
    | "requests"
    | "channels"
    | "settings"
    | "logs"
    | "announcements"
    | "changelog"
    | "sites"
    | "banner"
  >("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = dictionary[lang];
  const x = extra[lang];
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const fetchAccount = useServerFn(getMyAccount);

  const account = useQuery({
    queryKey: ["account", session?.user.id ?? "anon"],
    queryFn: () => fetchAccount({}),
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (ready && !session) navigate({ to: "/auth", replace: true });
  }, [ready, session, navigate]);

  if (!ready || (session && account.isLoading)) {
    return <Centered>{copy.common.loading}</Centered>;
  }
  if (!account.data?.isAdmin) {
    return (
      <Centered>
        <p className="text-sm font-semibold">{x.adminOnly}</p>
        <Link to="/" className={`${btnSolid} mt-4`}>
          {x.goHome}
        </Link>
      </Centered>
    );
  }

  const sections = [
    { value: "overview", label: x.overview },
    { value: "users", label: x.users },
    { value: "plans", label: x.packages },
    { value: "requests", label: x.requests },
    { value: "channels", label: x.channels },
    { value: "settings", label: x.settings },
    { value: "logs", label: x.logs },
    { value: "announcements", label: x.announcements },
    { value: "changelog", label: x.changelog },
    { value: "sites", label: more[lang].sitesTitle },
    { value: "banner", label: x.banner },
  ] as const;
  const activeLabel = sections.find((s) => s.value === section)?.label ?? x.overview;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> {copy.common.back}
        </Link>

        <div className="mt-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <ShieldCheck className="h-5 w-5" /> {copy.admin.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{copy.admin.sub}</p>
          </div>

          {/* Back-office only: every section lives inside this three-dash menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label={x.menuManage}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 sm:w-[340px]">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle>{copy.admin.title}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {sections.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setSection(item.value);
                      setMenuOpen(false);
                    }}
                    className={`rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                      section === item.value
                        ? "bg-foreground text-background"
                        : "border border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {activeLabel}
        </p>

        <div className="mt-4">
          {section === "overview" ? <OverviewTab copy={copy} /> : null}
          {section === "users" ? <UsersTab copy={copy} x={x} lang={lang} /> : null}
          {section === "plans" ? <PlansTab copy={copy} x={x} /> : null}
          {section === "requests" ? <RequestsTab copy={copy} x={x} /> : null}
          {section === "channels" ? <ChannelsTab copy={copy} x={x} /> : null}
          {section === "settings" ? <SettingsTab copy={copy} x={x} /> : null}
          {section === "logs" ? <LogsTab copy={copy} /> : null}
          {section === "announcements" ? <AnnouncementsTab copy={copy} x={x} /> : null}
          {section === "changelog" ? <ChangelogTab copy={copy} x={x} /> : null}
          {section === "sites" ? <SitesTab lang={lang} btn={btn} btnSolid={btnSolid} /> : null}
          {section === "banner" ? (
            <BannerTab copy={copy} x={x} btn={btn} btnSolid={btnSolid} />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      {children}
    </main>
  );
}

type Copy = (typeof dictionary)["en"];
type X = (typeof extra)["en"];

type UserPatch = {
  userId: string;
  planCode?: string;
  durationDays?: number | null;
  isBanned?: boolean;
  bypassDisabled?: boolean;
  adminNote?: string;
  makeAdmin?: boolean;
  resetUsage?: boolean;
};

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4">{children}</div>;
}

/* ---------------------------------- Overview --------------------------------- */

function OverviewTab({ copy }: { copy: Copy }) {
  const load = useServerFn(adminOverview);
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => load({}) });
  const stats = q.data;
  const items = [
    { label: copy.admin.stats.users, value: stats?.users ?? 0 },
    { label: copy.admin.stats.pro, value: stats?.pro ?? 0 },
    { label: copy.admin.stats.pending, value: stats?.pending ?? 0 },
    { label: copy.admin.stats.bypasses, value: stats?.bypasses ?? 0 },
    { label: copy.admin.banned, value: stats?.banned ?? 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-2xl font-bold">{q.isLoading ? "—" : item.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------- Users ----------------------------------- */

function UsersTab({ copy, x, lang }: { copy: Copy; x: X; lang: Lang }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useServerFn(adminListUsers);
  const plansFn = useServerFn(adminListPlans);
  const update = useServerFn(adminUpdateUser);
  const setPassword = useServerFn(adminSetPassword);
  const remove = useServerFn(adminDeleteUser);

  const users = useQuery({
    queryKey: ["admin", "users", term],
    queryFn: () => list({ data: { search: term } }),
  });
  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: () => plansFn({}) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["account"] });
  };

  const patch = useMutation({
    mutationFn: (input: UserPatch) => update({ data: input }),
    onSuccess: () => {
      toast.success(x.saved);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const password = useMutation({
    mutationFn: (input: { userId: string; password: string }) => setPassword({ data: input }),
    onSuccess: () => toast.success(x.saved),
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const del = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success(x.saved);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(search.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={x.search}
          className={field}
        />
        <button type="submit" className={btnSolid}>
          <Search className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => users.refetch()} className={btn}>
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </form>

      {users.isLoading ? (
        <p className="text-xs text-muted-foreground">{copy.common.loading}</p>
      ) : (
        <div className="space-y-3">
          {(users.data ?? []).map((user) => (
            <UserRow
              key={user.id}
              user={user}
              copy={copy}
              x={x}
              lang={lang}
              plans={(plans.data ?? []) as { code: string; name_en: string; name_th: string }[]}
              open={openId === user.id}
              onToggle={() => setOpenId(openId === user.id ? null : user.id)}
              onPatch={(input) => patch.mutate({ userId: user.id, ...input })}
              onPassword={(value) => password.mutate({ userId: user.id, password: value })}
              onDelete={() => {
                if (window.confirm(x.confirmDelete)) del.mutate(user.id);
              }}
              busy={patch.isPending || del.isPending}
            />
          ))}
          {(users.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">{x.none}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  copy,
  x,
  lang,
  plans,
  open,
  onToggle,
  onPatch,
  onPassword,
  onDelete,
  busy,
}: {
  user: AdminUser;
  copy: Copy;
  x: X;
  lang: Lang;
  plans: { code: string; name_en: string; name_th: string }[];
  open: boolean;
  onToggle: () => void;
  onPatch: (input: Omit<UserPatch, "userId">) => void;
  onPassword: (value: string) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [planCode, setPlanCode] = useState(user.planCode);
  const [days, setDays] = useState<string>(user.daysLeft ? String(user.daysLeft) : "");
  const [note, setNote] = useState(user.adminNote);
  const [newPassword, setNewPassword] = useState("");

  return (
    <Card>
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-semibold">
            {user.username}
            {user.isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
            {user.isBanned ? <Ban className="h-3.5 w-3.5 text-destructive" /> : null}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
        <div className="shrink-0 text-right text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground">{user.planCode}</p>
          <p>
            {user.daysLeft !== null ? `${user.daysLeft} ${x.daysLeft}` : "∞"} · {user.usedToday}/
            {user.totalUsed}
          </p>
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">{copy.admin.setPlan}</label>
              <select
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
                className={`${field} mt-1`}
              >
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {lang === "th" ? p.name_th : p.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">{x.durationDays}</label>
              <input
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className={`${field} mt-1`}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{x.durationHint}</p>

          <div>
            <label className="text-[11px] text-muted-foreground">{x.note}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${field} mt-1`}
            />
          </div>

          <button
            disabled={busy}
            onClick={() =>
              onPatch({
                planCode,
                durationDays: days === "" ? null : Number(days),
                adminNote: note,
              })
            }
            className={btnSolid}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {x.save}
          </button>

          <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <Toggle
              label={copy.admin.ban}
              checked={user.isBanned}
              onChange={(v) => onPatch({ isBanned: v })}
            />
            <Toggle
              label={x.disableBypass}
              checked={user.bypassDisabled}
              onChange={(v) => onPatch({ bypassDisabled: v })}
            />
            <Toggle
              label={copy.nav.admin}
              checked={user.isAdmin}
              onChange={(v) => onPatch({ makeAdmin: v })}
            />
            <button onClick={() => onPatch({ resetUsage: true })} className={btn}>
              <RefreshCw className="h-3.5 w-3.5" /> {x.resetUsage}
            </button>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-semibold">{x.setPassword}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{x.setPasswordHint}</p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={field}
              />
              <button
                disabled={newPassword.length < 8}
                onClick={() => {
                  onPassword(newPassword);
                  setNewPassword("");
                }}
                className={btnSolid}
              >
                {x.save}
              </button>
            </div>
          </div>

          <button onClick={onDelete} className={`${btn} text-destructive`}>
            <Trash2 className="h-3.5 w-3.5" /> {x.deleteUser}
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px]">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* ----------------------------------- Plans ----------------------------------- */

const emptyPlan = {
  code: "",
  name_en: "",
  name_th: "",
  description_en: "",
  description_th: "",
  price: 0,
  currency: "THB",
  daily_limit: null as number | null,
  duration_days: null as number | null,
  features_en: [] as string[],
  features_th: [] as string[],
  is_active: true,
  is_trial: false,
  is_featured: false,
  sort_order: 0,
};

function PlansTab({ copy, x }: { copy: Copy; x: X }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPlans);
  const saveFn = useServerFn(adminSavePlan);
  const deleteFn = useServerFn(adminDeletePlan);
  const [draft, setDraft] = useState<typeof emptyPlan | null>(null);

  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: () => listFn({}) });

  const save = useMutation({
    mutationFn: (input: typeof emptyPlan) => saveFn({ data: input }),
    onSuccess: () => {
      toast.success(x.saved);
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const remove = useMutation({
    mutationFn: (code: string) => deleteFn({ data: { code } }),
    onSuccess: () => {
      toast.success(x.saved);
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  return (
    <div className="space-y-4">
      <button onClick={() => setDraft({ ...emptyPlan })} className={btnSolid}>
        {x.add}
      </button>

      {draft ? (
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            <Text
              label={copy.admin.code}
              value={draft.code}
              onChange={(v) => setDraft({ ...draft, code: v })}
            />
            <Text
              label={copy.admin.sortOrder}
              value={String(draft.sort_order)}
              onChange={(v) =>
                setDraft({ ...draft, sort_order: Number(v.replace(/\D/g, "") || 0) })
              }
            />
            <Text
              label={copy.admin.nameEn}
              value={draft.name_en}
              onChange={(v) => setDraft({ ...draft, name_en: v })}
            />
            <Text
              label={copy.admin.nameTh}
              value={draft.name_th}
              onChange={(v) => setDraft({ ...draft, name_th: v })}
            />
            <Text
              label={copy.admin.descEn}
              value={draft.description_en}
              onChange={(v) => setDraft({ ...draft, description_en: v })}
            />
            <Text
              label={copy.admin.descTh}
              value={draft.description_th}
              onChange={(v) => setDraft({ ...draft, description_th: v })}
            />
            <Text
              label={copy.admin.price}
              value={String(draft.price)}
              onChange={(v) => setDraft({ ...draft, price: Number(v.replace(/[^\d.]/g, "") || 0) })}
            />
            <Text
              label={x.durationDays}
              value={draft.duration_days === null ? "" : String(draft.duration_days)}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  duration_days: v === "" ? null : Number(v.replace(/\D/g, "") || 0),
                })
              }
            />
            <Text
              label={copy.admin.dailyLimit}
              value={draft.daily_limit === null ? "" : String(draft.daily_limit)}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  daily_limit: v === "" ? null : Number(v.replace(/\D/g, "") || 0),
                })
              }
            />
            <Text
              label={copy.admin.featuresEn}
              value={draft.features_en.join(" | ")}
              onChange={(v) => setDraft({ ...draft, features_en: splitFeatures(v) })}
            />
            <Text
              label={copy.admin.featuresTh}
              value={draft.features_th.join(" | ")}
              onChange={(v) => setDraft({ ...draft, features_th: splitFeatures(v) })}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{copy.admin.dailyLimitHint}</p>
          <div className="mt-3 grid gap-1 sm:grid-cols-3">
            <Toggle
              label={copy.admin.active}
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
            <Toggle
              label={x.trialTitle}
              checked={draft.is_trial}
              onChange={(v) => setDraft({ ...draft, is_trial: v })}
            />
            <Toggle
              label={copy.plans.mostPopular}
              checked={draft.is_featured}
              onChange={(v) => setDraft({ ...draft, is_featured: v })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              disabled={save.isPending}
              onClick={() => save.mutate(draft)}
              className={btnSolid}
            >
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {x.save}
            </button>
            <button onClick={() => setDraft(null)} className={btn}>
              {x.cancel}
            </button>
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {(plans.data ?? []).map((plan: any) => (
          <Card key={plan.code}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {plan.name_en} · {plan.name_th}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {plan.code} · {plan.price} {plan.currency} ·{" "}
                  {plan.daily_limit === null
                    ? copy.plans.unlimited
                    : `${plan.daily_limit}/${copy.plans.perDay}`}{" "}
                  · {plan.duration_days ? `${plan.duration_days}d` : "∞"}
                  {plan.is_trial ? " · trial" : ""}
                  {plan.is_active ? "" : " · off"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setDraft({ ...emptyPlan, ...plan } as typeof emptyPlan)}
                  className={btn}
                >
                  {x.edit}
                </button>
                <button
                  onClick={() => remove.mutate(plan.code)}
                  className={`${btn} text-destructive`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function splitFeatures(value: string) {
  return value
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`${field} mt-1`} />
    </div>
  );
}

/* ---------------------------------- Requests --------------------------------- */

function RequestsTab({ copy, x }: { copy: Copy; x: X }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListRequests);
  const resolveFn = useServerFn(adminResolveRequest);
  const requests = useQuery({ queryKey: ["admin", "requests"], queryFn: () => listFn({}) });

  const resolve = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected"; note: string }) =>
      resolveFn({ data: { ...input, applyPlan: true } }),
    onSuccess: () => {
      toast.success(x.saved);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const rows = requests.data ?? [];
  if (requests.isLoading)
    return <p className="text-xs text-muted-foreground">{copy.common.loading}</p>;
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{x.none}</p>;

  return (
    <div className="space-y-3">
      {rows.map((row: any) => (
        <Card key={row.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{row.username}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {row.plan_code} · {row.status} · {new Date(row.created_at).toLocaleString()}
              </p>
              {row.contact ? <p className="mt-1 text-[11px]">{row.contact}</p> : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => resolve.mutate({ id: row.id, status: "approved", note: "" })}
                className={btnSolid}
              >
                {x.approve}
              </button>
              <button
                onClick={() => resolve.mutate({ id: row.id, status: "rejected", note: "" })}
                className={btn}
              >
                {x.reject}
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------------- Channels --------------------------------- */

function ChannelsTab({ copy, x }: { copy: Copy; x: X }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListChannels);
  const saveFn = useServerFn(adminSaveChannel);
  const deleteFn = useServerFn(adminDeleteChannel);
  const channels = useQuery({ queryKey: ["admin", "channels"], queryFn: () => listFn({}) });

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");

  const save = useMutation({
    mutationFn: (input: { label: string; url: string; handle: string }) =>
      saveFn({ data: { ...input, kind: "discord", is_active: true, sort_order: 0 } }),
    onSuccess: () => {
      toast.success(x.saved);
      setLabel("");
      setUrl("");
      setHandle("");
      qc.invalidateQueries({ queryKey: ["admin", "channels"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "channels"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-2 sm:grid-cols-3">
          <Text label={copy.admin.discordTag} value={label} onChange={setLabel} />
          <Text label={copy.admin.discordUrl} value={url} onChange={setUrl} />
          <Text label="handle" value={handle} onChange={setHandle} />
        </div>
        <button
          disabled={!label || !url || save.isPending}
          onClick={() => save.mutate({ label, url, handle })}
          className={`${btnSolid} mt-3`}
        >
          {x.add}
        </button>
      </Card>

      <div className="space-y-3">
        {(channels.data ?? []).map((channel: any) => (
          <Card key={channel.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{channel.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{channel.url}</p>
              </div>
              <button
                onClick={() => remove.mutate(channel.id)}
                className={`${btn} text-destructive`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Settings --------------------------------- */

function SettingsTab({ copy, x }: { copy: Copy; x: X }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListSettings);
  const saveFn = useServerFn(adminSaveSetting);
  const listPurchaseContactsFn = useServerFn(adminListPurchaseContacts);
  const savePurchaseContactFn = useServerFn(adminSavePurchaseContactLink);
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: () => listFn({}) });
  const purchaseContacts = useQuery({
    queryKey: ["admin", "purchase-contacts"],
    queryFn: () => listPurchaseContactsFn({}),
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [contactLabel, setContactLabel] = useState("Discord");
  const [contactUrl, setContactUrl] = useState("");

  const rows = useMemo(() => settings.data ?? [], [settings.data]);

  useEffect(() => {
    const discord = purchaseContacts.data?.find((contact: any) => contact.kind === "discord");
    if (discord) {
      setContactLabel(discord.label || "Discord");
      setContactUrl(discord.url || "");
    }
  }, [purchaseContacts.data]);

  const save = useMutation({
    mutationFn: (input: { key: string; value: string }) => saveFn({ data: input }),
    onSuccess: () => {
      toast.success(x.saved);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const saveContact = useMutation({
    mutationFn: (input: { label: string; url: string }) =>
      savePurchaseContactFn({
        data: {
          label: input.label,
          url: input.url,
          kind: "discord",
          is_active: Boolean(input.url),
          sort_order: 0,
        },
      }),
    onSuccess: () => {
      toast.success("บันทึกช่องทาง Discord สำเร็จ");
      qc.invalidateQueries({ queryKey: ["admin", "purchase-contacts"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-[11px] font-semibold">Purchase Discord contact</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          ลิงก์นี้จะแสดงในป๊อปอัพยืนยันการสั่งซื้อ — ต้องขึ้นต้นด้วย https://discord.gg/ หรือ
          https://discord.com/
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Text label="Label" value={contactLabel} onChange={setContactLabel} />
          <Text label={copy.admin.discordUrl} value={contactUrl} onChange={setContactUrl} />
        </div>
        {contactUrl.trim() && !isValidDiscordUrl(contactUrl) ? (
          <p className="mt-2 text-[11px] text-destructive">{DISCORD_URL_ERROR}</p>
        ) : null}
        <button
          disabled={
            !contactLabel.trim() ||
            saveContact.isPending ||
            Boolean(contactUrl.trim() && !isValidDiscordUrl(contactUrl))
          }
          onClick={() => {
            const url = contactUrl.trim();
            if (url && !isValidDiscordUrl(url)) {
              toast.error(DISCORD_URL_ERROR);
              return;
            }
            saveContact.mutate({ label: contactLabel.trim(), url });
          }}
          className={`${btnSolid} mt-3`}
        >
          {saveContact.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {x.save}
        </button>
      </Card>

      {rows.map((row: any) => (
        <Card key={row.key}>
          <p className="text-[11px] font-semibold">{row.key}</p>
          <div className="mt-2 flex gap-2">
            <input
              value={draft[row.key] ?? row.value}
              onChange={(e) => setDraft({ ...draft, [row.key]: e.target.value })}
              className={field}
            />
            <button
              onClick={() => save.mutate({ key: row.key, value: draft[row.key] ?? row.value })}
              className={btnSolid}
            >
              {x.save}
            </button>
          </div>
        </Card>
      ))}
      <Card>
        <div className="flex gap-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="new_key"
            className={field}
          />
          <button
            disabled={!newKey.trim()}
            onClick={() => {
              save.mutate({ key: newKey.trim(), value: "" });
              setNewKey("");
            }}
            className={btnSolid}
          >
            {x.add}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">{copy.admin.sub}</p>
      </Card>
    </div>
  );
}

/* ------------------------------------ Logs ----------------------------------- */

function LogsTab({ copy }: { copy: Copy }) {
  const listFn = useServerFn(adminListLogs);
  const logs = useQuery({ queryKey: ["admin", "logs"], queryFn: () => listFn({}) });
  if (logs.isLoading) return <p className="text-xs text-muted-foreground">{copy.common.loading}</p>;
  return (
    <ScrollArea className="h-[520px] rounded-2xl border border-border">
      <div className="divide-y divide-border">
        {(logs.data ?? []).map((log: any) => (
          <div key={log.id} className="p-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1 font-semibold">
                <Users className="h-3 w-3" /> {log.username}
              </span>
              <span className={log.status === "succeed" ? "text-foreground" : "text-destructive"}>
                {log.status}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{log.url}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/* -------------------------------- Announcements ------------------------------- */

type AnnouncementDraft = {
  id?: string;
  title_en: string;
  title_th: string;
  body_en: string;
  body_th: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
};

const emptyAnnouncement: AnnouncementDraft = {
  title_en: "",
  title_th: "",
  body_en: "",
  body_th: "",
  image_url: "",
  link_url: "",
  is_active: true,
  sort_order: 0,
};

function AnnouncementsTab({ copy, x }: { copy: Copy; x: X }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAnnouncements);
  const saveFn = useServerFn(adminSaveAnnouncement);
  const deleteFn = useServerFn(adminDeleteAnnouncement);
  const rows = useQuery({ queryKey: ["admin", "announcements"], queryFn: () => listFn({}) });
  const [draft, setDraft] = useState<AnnouncementDraft | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const save = useMutation({
    mutationFn: (input: AnnouncementDraft) => saveFn({ data: input }),
    onSuccess: () => {
      toast.success(x.saved);
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  return (
    <div className="space-y-4">
      <button onClick={() => setDraft({ ...emptyAnnouncement })} className={btnSolid}>
        {x.add}
      </button>

      {draft ? (
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            <Text
              label={`${x.titleField} EN`}
              value={draft.title_en}
              onChange={(v) => setDraft({ ...draft, title_en: v })}
            />
            <Text
              label={`${x.titleField} TH`}
              value={draft.title_th}
              onChange={(v) => setDraft({ ...draft, title_th: v })}
            />
            <Text
              label={`${x.bodyField} EN`}
              value={draft.body_en}
              onChange={(v) => setDraft({ ...draft, body_en: v })}
            />
            <Text
              label={`${x.bodyField} TH`}
              value={draft.body_th}
              onChange={(v) => setDraft({ ...draft, body_th: v })}
            />
            <Text
              label={x.imageUrl}
              value={draft.image_url}
              onChange={(v) => setDraft({ ...draft, image_url: v })}
            />
            <Text
              label={x.linkUrl}
              value={draft.link_url}
              onChange={(v) => setDraft({ ...draft, link_url: v })}
            />
            <Text
              label="sort"
              value={String(draft.sort_order)}
              onChange={(v) =>
                setDraft({ ...draft, sort_order: Number(v.replace(/\D/g, "") || 0) })
              }
            />
          </div>
          <div className="mt-3">
            <Toggle
              label={copy.admin.active}
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>
          {draft.image_url ? (
            <img
              src={draft.image_url}
              alt="preview"
              className="mt-3 max-h-40 rounded-xl border border-border object-cover"
            />
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              disabled={save.isPending}
              onClick={() => save.mutate(draft)}
              className={btnSolid}
            >
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {x.save}
            </button>
            <button onClick={() => setDraft(null)} className={btn}>
              {x.cancel}
            </button>
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {(rows.data ?? []).map((row: any) => (
          <Card key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {row.title_th || row.title_en || "—"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.is_active ? "on" : "off"} · {row.image_url ? "image" : "text"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setDraft({ ...emptyAnnouncement, ...row } as AnnouncementDraft)}
                  className={btn}
                >
                  {x.edit}
                </button>
                <button onClick={() => remove.mutate(row.id)} className={`${btn} text-destructive`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Changelog --------------------------------- */

type ChangelogDraft = {
  id?: string;
  version: string;
  title_en: string;
  title_th: string;
  body_en: string;
  body_th: string;
  kind: "new" | "fix" | "improve";
  is_published: boolean;
  sort_order: number;
};

const emptyChangelog: ChangelogDraft = {
  version: "",
  title_en: "",
  title_th: "",
  body_en: "",
  body_th: "",
  kind: "new",
  is_published: true,
  sort_order: 0,
};

function ChangelogTab({ copy, x }: { copy: Copy; x: X }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListChangelog);
  const saveFn = useServerFn(adminSaveChangelog);
  const deleteFn = useServerFn(adminDeleteChangelog);
  const rows = useQuery({ queryKey: ["admin", "changelog"], queryFn: () => listFn({}) });
  const [draft, setDraft] = useState<ChangelogDraft | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "changelog"] });
    qc.invalidateQueries({ queryKey: ["changelog"] });
  };

  const save = useMutation({
    mutationFn: (input: ChangelogDraft) => saveFn({ data: input }),
    onSuccess: () => {
      toast.success(x.saved);
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  return (
    <div className="space-y-4">
      <button onClick={() => setDraft({ ...emptyChangelog })} className={btnSolid}>
        {x.add}
      </button>

      {draft ? (
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            <Text
              label={x.version}
              value={draft.version}
              onChange={(v) => setDraft({ ...draft, version: v })}
            />
            <div>
              <label className="text-[11px] text-muted-foreground">{x.kindField}</label>
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({ ...draft, kind: e.target.value as ChangelogDraft["kind"] })
                }
                className={`${field} mt-1`}
              >
                <option value="new">{x.kindNew}</option>
                <option value="fix">{x.kindFix}</option>
                <option value="improve">{x.kindImprove}</option>
              </select>
            </div>
            <Text
              label={`${x.titleField} EN`}
              value={draft.title_en}
              onChange={(v) => setDraft({ ...draft, title_en: v })}
            />
            <Text
              label={`${x.titleField} TH`}
              value={draft.title_th}
              onChange={(v) => setDraft({ ...draft, title_th: v })}
            />
            <Text
              label={`${x.bodyField} EN`}
              value={draft.body_en}
              onChange={(v) => setDraft({ ...draft, body_en: v })}
            />
            <Text
              label={`${x.bodyField} TH`}
              value={draft.body_th}
              onChange={(v) => setDraft({ ...draft, body_th: v })}
            />
            <Text
              label="sort"
              value={String(draft.sort_order)}
              onChange={(v) =>
                setDraft({ ...draft, sort_order: Number(v.replace(/\D/g, "") || 0) })
              }
            />
          </div>
          <div className="mt-3">
            <Toggle
              label={x.published}
              checked={draft.is_published}
              onChange={(v) => setDraft({ ...draft, is_published: v })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              disabled={save.isPending}
              onClick={() => save.mutate(draft)}
              className={btnSolid}
            >
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {x.save}
            </button>
            <button onClick={() => setDraft(null)} className={btn}>
              {x.cancel}
            </button>
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {(rows.data ?? []).map((row: any) => (
          <Card key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {row.version ? `${row.version} · ` : ""}
                  {row.title_th || row.title_en || "—"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.kind} · {new Date(row.released_at).toLocaleDateString()} ·{" "}
                  {row.is_published ? "on" : "off"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() =>
                    setDraft({
                      ...emptyChangelog,
                      ...row,
                      kind: row.kind as ChangelogDraft["kind"],
                    } as ChangelogDraft)
                  }
                  className={btn}
                >
                  {x.edit}
                </button>
                <button onClick={() => remove.mutate(row.id)} className={`${btn} text-destructive`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
