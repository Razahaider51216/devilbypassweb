import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { auth } from "@/integrations/local/auth-client";
import { ensureProfile } from "@/lib/account.functions";
import { dictionary, type Lang } from "@/lib/i18n";
import { extra } from "@/lib/i18n-extra";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DevilDev Bypass" },
      {
        name: "description",
        content:
          "Sign in or create a free DevilDev account to unlock links with daily quota and account protection.",
      },
      { property: "og:title", content: "Sign in — DevilDev Bypass" },
      {
        property: "og:description",
        content: "Create a free DevilDev account to start bypassing links securely.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function strengthOf(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-foreground";

type Mode = "login" | "register" | "reset";

function AuthPage() {
  const [lang] = useState<Lang>(
    typeof window !== "undefined" && localStorage.getItem("devildev.lang") === "en" ? "en" : "th",
  );
  const copy = dictionary[lang];
  const x = extra[lang];

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<"request" | "code" | "password">("request");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const navigate = useNavigate();
  const { session } = useSession();
  const createProfile = useServerFn(ensureProfile);

  // A recovery link from the email drops the user here with a live session.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const discordSession = hashParams.get("discord_session");
    const discordError = hashParams.get("discord_error");
    if (discordSession || discordError) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    if (discordError) toast.error(discordError);
    if (discordSession) {
      try {
        auth.completeDiscordSignIn(discordSession);
        toast.success(lang === "th" ? "เข้าสู่ระบบด้วย Discord สำเร็จ" : "Signed in with Discord");
        navigate({ to: "/", replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.common.error);
      }
    }
    if (hash.includes("type=recovery")) {
      setMode("reset");
      setStep("password");
      setRecovering(true);
    }
    const { data: sub } = auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setStep("password");
        setRecovering(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [copy.common.error, lang, navigate]);

  useEffect(() => {
    if (session && !recovering && mode !== "reset") navigate({ to: "/", replace: true });
  }, [session, recovering, mode, navigate]);

  const score = strengthOf(password);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (mode === "register") {
      if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
        toast.error(copy.auth.usernameRule);
        return;
      }
      if (password !== confirm) {
        toast.error(copy.auth.mismatch);
        return;
      }
      if (score < 3) {
        toast.error(copy.auth.weak);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(copy.auth.welcome);
        navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.toLowerCase() },
          },
        });
        if (error) throw error;
        const session = data.session;
        if (session) {
          await createProfile({ data: { username: username.toLowerCase() } }).catch(() => null);
          toast.success(copy.auth.created);
          navigate({ to: "/", replace: true });
        } else {
          toast.success(copy.auth.created);
          setMode("login");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.common.error);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await auth.resetPasswordForEmail(email);
      if (error) throw error;
      if (data?.devCode) {
        setCode(data.devCode);
        toast.info(`Development reset code: ${data.devCode}`);
      }
      toast.success(x.codeSent);
      setStep("code");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.common.error);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await auth.verifyOtp({
        email,
        token: code.trim(),
        type: "recovery",
      });
      if (error) throw error;
      setRecovering(true);
      setStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.common.error);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      toast.error(copy.auth.mismatch);
      return;
    }
    if (strengthOf(password) < 3) {
      toast.error(copy.auth.weak);
      return;
    }
    setBusy(true);
    try {
      const { error } = await auth.updateUser({ password });
      if (error) throw error;
      toast.success(x.passwordUpdated);
      setRecovering(false);
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.common.error);
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === "reset"
      ? x.resetTitle
      : mode === "login"
        ? copy.auth.loginTitle
        : copy.auth.registerTitle;
  const sub =
    mode === "reset" ? x.resetSub : mode === "login" ? copy.auth.loginSub : copy.auth.registerSub;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> {copy.common.back}
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{sub}</p>

        {mode !== "reset" ? (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? x.tabLogin : x.tabRegister}
              </button>
            ))}
          </div>
        ) : null}

        {mode !== "reset" ? (
          <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5">
            <a
              href="/api/auth/discord"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              <DiscordMark />
              {lang === "th" ? "เข้าสู่ระบบด้วย Discord" : "Continue with Discord"}
            </a>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>{lang === "th" ? "หรือใช้อีเมล" : "or use email"}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submitAuth} className="space-y-4">
              {mode === "register" ? (
                <div>
                  <label htmlFor="username" className="text-xs font-medium text-muted-foreground">
                    {copy.auth.username}
                  </label>
                  <input
                    id="username"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{x.usernameHint}</p>
                </div>
              ) : null}

              <div>
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  {copy.auth.email}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  {copy.auth.password}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              {mode === "register" ? (
                <>
                  <div>
                    <label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">
                      {copy.auth.confirm}
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <PasswordMeter score={score} copy={copy} />
                </>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? copy.auth.working : mode === "login" ? copy.auth.signIn : copy.auth.signUp}
              </button>

              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setStep("request");
                    setPassword("");
                    setConfirm("");
                  }}
                  className="inline-flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <KeyRound className="h-3 w-3" /> {x.forgot}
                </button>
              ) : null}
            </form>
          </div>
        ) : (
          <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
            {step === "request" ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {copy.auth.email}
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {x.sendCode}
                </button>
              </form>
            ) : null}

            {step === "code" ? (
              <form onSubmit={verifyCode} className="space-y-4">
                <div>
                  <label htmlFor="code" className="text-xs font-medium text-muted-foreground">
                    {x.codeLabel}
                  </label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                    className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{x.codeHint}</p>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {x.verify}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  {x.resend}
                </button>
              </form>
            ) : null}

            {step === "password" ? (
              <form onSubmit={savePassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {x.newPassword}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-confirm"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {copy.auth.confirm}
                  </label>
                  <input
                    id="new-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <PasswordMeter score={score} copy={copy} />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {x.updatePassword}
                </button>
              </form>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setRecovering(false);
                setCode("");
                setPassword("");
                setConfirm("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {x.backToLogin}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function DiscordMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M19.5 5.34A16.3 16.3 0 0 0 15.44 4l-.5 1.03a15.1 15.1 0 0 0-5.86 0L8.56 4A16.5 16.5 0 0 0 4.5 5.35C1.93 9.18 1.24 12.92 1.59 16.6a16.6 16.6 0 0 0 4.98 2.51l1.2-1.64a10.6 10.6 0 0 1-1.88-.9l.46-.36c3.62 1.67 7.56 1.67 11.14 0l.47.36c-.6.35-1.23.65-1.89.9l1.2 1.64a16.5 16.5 0 0 0 4.98-2.51c.42-4.27-.72-7.98-2.75-11.26ZM8.62 14.33c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23 1.1 0 2 1 1.98 2.23 0 1.23-.88 2.22-1.98 2.22Zm6.76 0c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23 1.1 0 2 1 1.98 2.23 0 1.23-.87 2.22-1.98 2.22Z" />
    </svg>
  );
}

function PasswordMeter({ score, copy }: { score: number; copy: (typeof dictionary)["en"] }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{copy.auth.strength}</span>
        <span>{copy.auth.strengthLevels[score] ?? copy.auth.strengthLevels[0]}</span>
      </div>
      <div className="mt-2 flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? "bg-foreground" : "bg-muted"}`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
        <li>{copy.auth.hintLength}</li>
        <li>{copy.auth.hintCase}</li>
        <li>{copy.auth.hintNumber}</li>
        <li>{copy.auth.hintSymbol}</li>
      </ul>
    </div>
  );
}
