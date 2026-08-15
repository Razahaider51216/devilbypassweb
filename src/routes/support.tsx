import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Clock3,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { InfoPageShell } from "@/components/devildev/InfoPageShell";
import { usePreferredLanguage } from "@/hooks/usePreferredLanguage";
import { getStorefront } from "@/lib/account.functions";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — DevilDev" },
      {
        name: "description",
        content: "Get help with your DevilDev account, payments or link bypass requests.",
      },
      { property: "og:title", content: "Support — DevilDev" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SupportPage,
});

const content = {
  th: {
    eyebrow: "ศูนย์ช่วยเหลือ",
    title: "ติดปัญหา? เราช่วยคุณได้",
    intro:
      "ติดต่อผู้พัฒนาเกี่ยวกับบัญชี การชำระเงิน หรือปัญหาในการบายพาสลิงก์ผ่านช่องทางทางการด้านล่าง",
    official: "ช่องทางติดต่อทางการ",
    officialSub: "เลือกช่องทางที่สะดวกและส่งรายละเอียดปัญหาให้ครบถ้วน",
    opening: "เปิดช่องทางติดต่อ",
    loading: "กำลังโหลดช่องทางติดต่อ…",
    unavailable: "ยังไม่มีช่องทางติดต่อที่เปิดใช้งาน กรุณาลองใหม่ภายหลัง",
    before: "ก่อนส่งข้อความ",
    tips: [
      "แจ้งชื่อผู้ใช้ของคุณ แต่ไม่ต้องส่งรหัสผ่าน",
      "แนบลิงก์ที่พบปัญหาและข้อความผิดพลาด",
      "หากเป็นการชำระเงิน ให้แนบเลขรายการหรือสลิปที่อ่านได้ชัดเจน",
    ],
    responseTitle: "ระยะเวลาตอบกลับ",
    responseBody:
      "เราจะตอบกลับให้เร็วที่สุดตามลำดับข้อความ เวลาตอบกลับอาจนานขึ้นในช่วงที่มีผู้ใช้งานจำนวนมาก",
    safetyTitle: "ระวังการแอบอ้าง",
    safetyBody: "ทีมงานจะไม่ขอรหัสผ่านหรือรหัส OTP ใช้เฉพาะช่องทางที่แสดงบนหน้านี้เท่านั้น",
    quickTitle: "ลิงก์ที่อาจช่วยได้",
    terms: "ข้อกำหนดการให้บริการ",
    privacy: "นโยบายความเป็นส่วนตัว",
    home: "กลับไปทดลองใช้งาน",
  },
  en: {
    eyebrow: "Help center",
    title: "Having trouble? We can help.",
    intro:
      "Contact the developer about your account, payment or a link bypass issue through one of the official channels below.",
    official: "Official contact channels",
    officialSub: "Choose a channel and include enough detail for us to investigate.",
    opening: "Open contact channel",
    loading: "Loading contact channels…",
    unavailable: "No contact channel is currently available. Please try again later.",
    before: "Before you message us",
    tips: [
      "Include your username, but never send your password.",
      "Include the problem link and the exact error message.",
      "For payment issues, attach a readable receipt or transaction reference.",
    ],
    responseTitle: "Response time",
    responseBody:
      "We respond as quickly as possible in message order. Replies may take longer during periods of high demand.",
    safetyTitle: "Avoid impersonators",
    safetyBody:
      "Our team will never ask for your password or OTP. Only use the channels shown on this page.",
    quickTitle: "Helpful links",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    home: "Try the service",
  },
} as const;

function SupportPage() {
  const { lang, changeLang } = usePreferredLanguage();
  const copy = content[lang];
  const fetchStorefront = useServerFn(getStorefront);
  const storefront = useQuery({
    queryKey: ["storefront"],
    queryFn: () => fetchStorefront({}),
    staleTime: 5 * 60_000,
  });
  const channels = storefront.data?.channels.filter((channel) => channel.url) ?? [];

  return (
    <InfoPageShell lang={lang} onLangChange={changeLang}>
      <section className="mt-7 sm:mt-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <LifeBuoy className="h-3.5 w-3.5" /> {copy.eyebrow}
        </span>
        <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {copy.intro}
        </p>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold">{copy.official}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.officialSub}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {storefront.isLoading ? (
              <div className="h-16 animate-pulse rounded-2xl bg-muted" aria-label={copy.loading} />
            ) : channels.length > 0 ? (
              channels.map((channel) => (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{channel.label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {channel.handle || copy.opening}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </a>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm leading-6 text-muted-foreground">
                {copy.unavailable}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <HelpCircle className="h-4 w-4" /> {copy.before}
          </h2>
          <ol className="mt-5 space-y-4">
            {copy.tips.map((tip, index) => (
              <li key={tip} className="flex gap-3 text-xs leading-5 text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {index + 1}
                </span>
                {tip}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-5 grid gap-5 sm:grid-cols-2">
        <InfoCard
          icon={<Clock3 className="h-4 w-4" />}
          title={copy.responseTitle}
          body={copy.responseBody}
        />
        <InfoCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title={copy.safetyTitle}
          body={copy.safetyBody}
        />
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <h2 className="text-sm font-bold">{copy.quickTitle}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <QuickLink to="/terms">{copy.terms}</QuickLink>
          <QuickLink to="/privacy">{copy.privacy}</QuickLink>
          <Link
            to="/"
            className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-85"
          >
            {copy.home}
          </Link>
        </div>
      </section>
    </InfoPageShell>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </h2>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function QuickLink({ to, children }: { to: "/terms" | "/privacy"; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent"
    >
      {children}
    </Link>
  );
}
