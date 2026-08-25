import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  LogOut,
  User as UserIcon,
  ExternalLink,
  Check,
  Loader2,
  Gift,
  Clock,
  Receipt,
  Home,
  Ban,
  History,
  FileText,
  LockKeyhole,
  LifeBuoy,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CopyButton } from "@/components/devildev/CopyButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  claimTrial,
  getMyAccount,
  getMyRequests,
  getStorefront,
  requestPurchase,
} from "@/lib/account.functions";
import { auth } from "@/integrations/local/auth-client";
import { useSession } from "@/hooks/useSession";
import { extra } from "@/lib/i18n-extra";
import type { Copy, Lang } from "@/lib/i18n";

export function AppMenu({ copy, lang }: { copy: Copy; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ code: string; label: string } | null>(null);
  const { session, ready: sessionReady } = useSession();
  const queryClient = useQueryClient();
  const x = extra[lang];

  const fetchStorefront = useServerFn(getStorefront);
  const fetchAccount = useServerFn(getMyAccount);
  const fetchRequests = useServerFn(getMyRequests);
  const buy = useServerFn(requestPurchase);
  const trial = useServerFn(claimTrial);

  const storefront = useQuery({ queryKey: ["storefront"], queryFn: () => fetchStorefront({}) });

  const account = useQuery({
    queryKey: ["account", session?.user.id ?? "anon"],
    queryFn: () => fetchAccount({}),
    enabled: sessionReady && Boolean(session),
  });

  const requests = useQuery({
    queryKey: ["requests", session?.user.id ?? "anon"],
    queryFn: () => fetchRequests({}),
    enabled: sessionReady && Boolean(session) && open,
  });

  const purchase = useMutation({
    mutationFn: async (planCode: string) => {
      const result = await buy({ data: { planCode, contact: "" } });
      if (!result.ok) throw new Error(result.reason);
      return result;
    },
    onSuccess: () => {
      toast.success(copy.plans.requested);
      queryClient.invalidateQueries({ queryKey: ["account"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => toast.error(copy.common.error),
  });

  const claim = useMutation({
    mutationFn: (planCode: string) => trial({ data: { planCode } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`${x.trialActive} — ${result.days} ${x.daysLeft}`);
        queryClient.invalidateQueries({ queryKey: ["account"] });
      } else if (result.reason === "already") {
        toast.error(x.trialClaimed);
      } else if (result.reason === "banned") {
        toast.error(copy.errors.banned);
      } else {
        toast.error(copy.common.error);
      }
    },
    onError: () => toast.error(copy.common.error),
  });

  const channels = storefront.data?.channels ?? [];
  const purchaseContacts = storefront.data?.purchaseContacts ?? [];
  const plans = storefront.data?.plans ?? [];
  const me = account.data;
  const hasSession = Boolean(session);
  const accountFallbackName = session?.user.email
    ? session.user.email.split("@")[0]
    : "Discord user";
  const sessionDisplayName = session?.user.displayName || accountFallbackName;
  const sessionAvatarUrl = session?.user.avatarUrl ?? null;
  const sessionUsername = session?.user.discordUsername ?? null;
  const sessionSubtitle = sessionUsername ? `@${sessionUsername}` : session?.user.email;
  const primaryPurchaseContact =
    purchaseContacts.find((item) => item.kind === "discord" && item.url) ?? null;
  const username = me?.username ?? "";

  const signOut = async () => {
    const { error } = await auth.signOut();
    if (error) {
      toast.error(copy.common.error);
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    setOpen(false);
    toast.success(copy.nav.logout);
  };

  const statusLabel = (status: string) =>
    status === "approved"
      ? copy.account.status.approved
      : status === "rejected"
        ? copy.account.status.rejected
        : copy.account.status.pending;

  return (
    <div className="flex items-center gap-2">
      {/* Contact channels — quick dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={copy.plans.contactTitle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
        >
          <MessageCircle className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{copy.plans.contactTitle}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-56">
            {channels.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">{copy.common.loading}</p>
            ) : (
              channels.map((channel) => (
                <DropdownMenuItem key={channel.id} asChild>
                  <a href={channel.url} target="_blank" rel="noreferrer" className="cursor-pointer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{channel.label}</span>
                    {channel.handle ? (
                      <span className="ml-2 truncate text-[10px] text-muted-foreground">
                        {channel.handle}
                      </span>
                    ) : null}
                  </a>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Three-dash menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
        >
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[330px] flex-col gap-0 p-0 sm:w-[390px]">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
            <SheetTitle>DevilBypass</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-7 px-5 py-5">
              {/* ── Account ─────────────────────────────── */}
              <Section icon={<UserIcon className="h-3.5 w-3.5" />} title={x.menuAccount}>
                <div className="rounded-2xl border border-border bg-card p-4">
                  {me ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          {me.avatarUrl ? (
                            <AvatarImage src={me.avatarUrl} alt={me.displayName} />
                          ) : null}
                          <AvatarFallback className="bg-foreground text-background">
                            <UserIcon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{me.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {me.discordUsername ? `@${me.discordUsername}` : me.email}
                          </p>
                        </div>
                      </div>

                      {me.isBanned ? (
                        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                          <Ban className="h-3.5 w-3.5" /> {copy.errors.banned}
                        </p>
                      ) : null}
                      {me.bypassDisabled ? (
                        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                          {x.bypassDisabled}
                        </p>
                      ) : null}

                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="text-muted-foreground">{copy.account.plan}</dt>
                          <dd className="mt-0.5 font-semibold">
                            {lang === "th" ? me.planName.th : me.planName.en}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{copy.account.usedToday}</dt>
                          <dd className="mt-0.5 font-semibold">
                            {me.usedToday}
                            {me.dailyLimit === null
                              ? ` / ${copy.plans.unlimited}`
                              : ` / ${me.dailyLimit}`}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{copy.account.totalUsed}</dt>
                          <dd className="mt-0.5 font-semibold">{me.totalUsed}</dd>
                        </div>
                        {me.daysLeft !== null ? (
                          <div>
                            <dt className="text-muted-foreground">{x.expires}</dt>
                            <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold">
                              <Clock className="h-3.5 w-3.5" />
                              {me.daysLeft} {x.daysLeft}
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      <button
                        onClick={signOut}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {copy.nav.logout}
                      </button>
                    </>
                  ) : !sessionReady ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-foreground text-background">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{copy.common.loading}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Checking sign-in status...
                        </p>
                      </div>
                    </div>
                  ) : hasSession ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          {sessionAvatarUrl ? (
                            <AvatarImage src={sessionAvatarUrl} alt={sessionDisplayName} />
                          ) : null}
                          <AvatarFallback className="bg-foreground text-background">
                            <UserIcon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{sessionDisplayName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {account.isError
                              ? lang === "th"
                                ? "กำลังใช้ข้อมูล Discord ชั่วคราว"
                                : "Using Discord profile for now"
                              : sessionSubtitle}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => queryClient.invalidateQueries({ queryKey: ["account"] })}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent"
                        >
                          {account.isFetching ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {lang === "th" ? "ลองใหม่" : "Retry"}
                        </button>
                        <button
                          onClick={signOut}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          {copy.nav.logout}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">{copy.auth.loginTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{copy.auth.loginSub}</p>
                      <a
                        href="/login"
                        target="_self"
                        className="mt-4 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background"
                      >
                        {copy.nav.login}
                      </a>
                    </>
                  )}
                </div>
              </Section>

              {/* ── Packages ────────────────────────────── */}
              <Section icon={<Sparkles className="h-3.5 w-3.5" />} title={x.menuPackages}>
                <p className="text-xs text-muted-foreground">{copy.plans.sub}</p>
                <div className="mt-3 space-y-3">
                  {plans.map((plan) => {
                    const isCurrent = me?.planCode === plan.code;
                    const features = lang === "th" ? plan.features_th : plan.features_en;
                    const trialUsed = Boolean(me?.trialClaimed);
                    return (
                      <div
                        key={plan.code}
                        className={`rounded-2xl border bg-card p-4 ${
                          plan.is_featured ? "border-foreground" : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                              {lang === "th" ? plan.name_th : plan.name_en}
                              {plan.is_trial ? <Gift className="h-3.5 w-3.5" /> : null}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {plan.daily_limit === null
                                ? copy.plans.unlimited
                                : `${plan.daily_limit} ${copy.plans.perDay}`}
                              {plan.duration_days ? ` · ${plan.duration_days} ${x.daysLeft}` : ""}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-sm font-bold">
                            {plan.price === 0 ? copy.plans.free : `${plan.price} ${plan.currency}`}
                          </p>
                        </div>

                        {features.length > 0 ? (
                          <ul className="mt-3 space-y-1">
                            {features.map((feature) => (
                              <li
                                key={feature}
                                className="flex items-start gap-2 text-[11px] text-muted-foreground"
                              >
                                <Check className="mt-0.5 h-3 w-3 shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {plan.is_trial ? (
                          <button
                            disabled={!session || trialUsed || claim.isPending}
                            onClick={() => claim.mutate(plan.code)}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {claim.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Gift className="h-3.5 w-3.5" />
                            )}
                            {trialUsed ? x.trialClaimed : x.trialClaim}
                          </button>
                        ) : plan.price > 0 ? (
                          <AlertDialog
                            open={confirmOpen && pendingPlan?.code === plan.code}
                            onOpenChange={(open) => {
                              setConfirmOpen(open);
                              if (!open) setPendingPlan(null);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={!session || isCurrent || purchase.isPending}
                                onClick={() => {
                                  purchase.reset();
                                  setPendingPlan({
                                    code: plan.code,
                                    label: lang === "th" ? plan.name_th : plan.name_en,
                                  });
                                  setConfirmOpen(true);
                                }}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                              >
                                {purchase.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : null}
                                {isCurrent ? copy.plans.current : copy.plans.buy}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border bg-zinc-950 text-zinc-50 shadow-2xl sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base text-zinc-50">
                                  {copy.plans.purchaseDialogTitle}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-4 text-left text-sm leading-relaxed text-zinc-300">
                                  <p>{copy.plans.purchaseDialogSub}</p>
                                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div>
                                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                                        {lang === "th" ? "แพ็กเกจที่เลือก" : "Selected plan"}
                                      </p>
                                      <p className="mt-1 font-semibold text-zinc-50">
                                        {pendingPlan?.label ??
                                          (lang === "th" ? plan.name_th : plan.name_en)}
                                      </p>
                                    </div>
                                    {username ? (
                                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                                        <div className="min-w-0">
                                          <p className="text-[11px] text-zinc-400">Username</p>
                                          <p className="truncate text-sm font-semibold text-zinc-50">
                                            {username}
                                          </p>
                                        </div>
                                        <CopyButton
                                          value={username}
                                          labels={{ copy: copy.copy, copied: copy.copied }}
                                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                                        />
                                      </div>
                                    ) : null}
                                    {primaryPurchaseContact ? (
                                      <a
                                        href={primaryPurchaseContact.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={() => setOpen(false)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        {copy.plans.contactDiscordToBuy} —{" "}
                                        {primaryPurchaseContact.label}
                                      </a>
                                    ) : (
                                      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-200">
                                        {copy.plans.discordNotConfigured}
                                      </p>
                                    )}
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white">
                                  {copy.plans.close}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={
                                    !pendingPlan || purchase.isPending || purchase.isSuccess
                                  }
                                  onClick={(event) => {
                                    event.preventDefault();
                                    if (pendingPlan) purchase.mutate(pendingPlan.code);
                                  }}
                                  className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                                >
                                  {purchase.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : null}
                                  {purchase.isSuccess
                                    ? copy.plans.requested
                                    : lang === "th"
                                      ? "ยืนยันคำขอซื้อ"
                                      : "Confirm purchase request"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  {copy.plans.contactSub}
                </p>
              </Section>

              {/* ── My requests ─────────────────────────── */}
              {session ? (
                <Section icon={<Receipt className="h-3.5 w-3.5" />} title={x.myRequests}>
                  <div className="space-y-2">
                    {(requests.data ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{x.noRequests}</p>
                    ) : (
                      (requests.data ?? []).map(
                        (request: {
                          id: string;
                          plan_code: string;
                          status: string;
                          created_at: string;
                          plan: {
                            name_th?: string | null;
                            name_en?: string | null;
                            price: number;
                            currency?: string | null;
                          } | null;
                        }) => {
                          const plan = request.plan ?? null;
                          const priceLabel = plan
                            ? plan.price === 0
                              ? copy.plans.free
                              : `${plan.price} ${plan.currency ?? ""}`
                            : "-";
                          const planLabel = plan
                            ? lang === "th"
                              ? (plan.name_th ?? plan.name_en)
                              : (plan.name_en ?? plan.name_th)
                            : request.plan_code;
                          const date = request.created_at
                            ? new Date(request.created_at).toLocaleString()
                            : "-";
                          const statusText =
                            request.status === "paid" || request.status === "approved"
                              ? "สำเร็จ (Auto Approved)"
                              : request.status === "pending"
                                ? "รอการตรวจสอบ"
                                : request.status === "rejected" || request.status === "failed"
                                  ? "ล้มเหลว"
                                  : request.status;

                          return (
                            <div
                              key={request.id}
                              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{planLabel}</p>
                                  <p className="text-xs text-muted-foreground">{date}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{priceLabel}</p>
                                  <p
                                    className={`mt-1 text-xs ${request.status === "paid" || request.status === "approved" ? "text-emerald-600" : "text-muted-foreground"}`}
                                  >
                                    {statusText}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>
                </Section>
              ) : null}

              {/* ── Contact ─────────────────────────────── */}
              <Section icon={<MessageCircle className="h-3.5 w-3.5" />} title={x.menuContact}>
                <div className="space-y-2">
                  {channels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{copy.common.loading}</p>
                  ) : (
                    channels.map((channel) => (
                      <a
                        key={channel.id}
                        href={channel.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs transition-colors hover:bg-accent"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="flex-1 truncate">{channel.label}</span>
                        {channel.handle ? (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {channel.handle}
                          </span>
                        ) : null}
                      </a>
                    ))
                  )}
                </div>
              </Section>

              {/* ── Management ──────────────────────────── */}
              {me?.isAdmin ? (
                <Section icon={<ShieldCheck className="h-3.5 w-3.5" />} title={x.menuManage}>
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> {x.adminPanel}
                  </Link>
                </Section>
              ) : null}

              {/* ── Links ───────────────────────────────── */}
              <Section icon={<Home className="h-3.5 w-3.5" />} title={x.menuLinks}>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
                >
                  <Home className="h-3.5 w-3.5" /> {copy.nav.home}
                </Link>
                <Link
                  to="/changelog"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
                >
                  <History className="h-3.5 w-3.5" /> {x.changelog}
                </Link>
                <Link
                  to="/terms"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
                >
                  <FileText className="h-3.5 w-3.5" />{" "}
                  {lang === "th" ? "ข้อกำหนดการใช้งาน" : "Terms of Service"}
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
                >
                  <LockKeyhole className="h-3.5 w-3.5" />{" "}
                  {lang === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
                </Link>
                <Link
                  to="/support"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent"
                >
                  <LifeBuoy className="h-3.5 w-3.5" /> {lang === "th" ? "ช่วยเหลือ" : "Support"}
                </Link>
              </Section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
