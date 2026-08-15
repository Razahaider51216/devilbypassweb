import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/integrations/local/auth-client";
import { dictionary, type Lang } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in with Discord — DevilDev Bypass" },
      {
        name: "description",
        content: "Sign in to DevilDev securely with your Discord account.",
      },
      { property: "og:title", content: "Sign in with Discord — DevilDev Bypass" },
      {
        property: "og:description",
        content: "Use your Discord account to access DevilDev.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [lang] = useState<Lang>(
    typeof window !== "undefined" && localStorage.getItem("devildev.lang") === "en" ? "en" : "th",
  );
  const copy = dictionary[lang];
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const discordSession = hashParams.get("discord_session");
    const discordError = hashParams.get("discord_error");

    if (discordSession || discordError) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    if (discordError) toast.error(discordError);
    if (!discordSession) return;

    try {
      auth.completeDiscordSignIn(discordSession);
      toast.success(lang === "th" ? "เข้าสู่ระบบด้วย Discord สำเร็จ" : "Signed in with Discord");
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.common.error);
    }
  }, [copy.common.error, lang, navigate]);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> {copy.common.back}
        </Link>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2] text-white">
            <DiscordMark className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {lang === "th" ? "เข้าสู่ระบบด้วย Discord" : "Sign in with Discord"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {lang === "th"
              ? "ใช้บัญชี Discord ของคุณเพื่อเข้าสู่ DevilDev ระบบจะแสดงชื่อและรูปโปรไฟล์จาก Discord"
              : "Use your Discord account to access DevilDev. Your Discord name and avatar will be shown on your profile."}
          </p>

          <form action="/api/auth/discord" method="get" className="mt-6">
            <button
              type="submit"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              <DiscordMark className="h-5 w-5" />
              {lang === "th" ? "ดำเนินการต่อด้วย Discord" : "Continue with Discord"}
            </button>
          </form>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {lang === "th"
              ? "ไม่มีการสมัครสมาชิกด้วยอีเมลหรือรหัสผ่าน"
              : "Email and password registration is not available."}
          </p>
        </div>
      </div>
    </main>
  );
}

function DiscordMark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`fill-current ${className}`}>
      <path d="M19.5 5.34A16.3 16.3 0 0 0 15.44 4l-.5 1.03a15.1 15.1 0 0 0-5.86 0L8.56 4A16.5 16.5 0 0 0 4.5 5.35C1.93 9.18 1.24 12.92 1.59 16.6a16.6 16.6 0 0 0 4.98 2.51l1.2-1.64a10.6 10.6 0 0 1-1.88-.9l.46-.36c3.62 1.67 7.56 1.67 11.14 0l.47.36c-.6.35-1.23.65-1.89.9l1.2 1.64a16.5 16.5 0 0 0 4.98-2.51c.42-4.27-.72-7.98-2.75-11.26ZM8.62 14.33c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23 1.1 0 2 1 1.98 2.23 0 1.23-.88 2.22-1.98 2.22Zm6.76 0c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23 1.1 0 2 1 1.98 2.23 0 1.23-.87 2.22-1.98 2.22Z" />
    </svg>
  );
}
